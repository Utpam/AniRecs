import { User } from '../Model/User.model.js';
import { AnimeDoc } from '../Model/Anime.model.js';
import { ApiError } from '../Utils/ApiError.js';
import {
  calculateCosineSimilarity,
  computeFeatureVector,
  buildUserPreferenceVector,
  buildUserGenreThemeCounts,
  calculateNoveltyScore,
  runMMR,
  generateExplanation
} from '../Utils/recommendationHelper.js';
import jwt from 'jsonwebtoken';
import {
  getCachedGenreAnime,
  getGenreMap,
  prefetchGenres,
} from '../Utils/jikanGenreService.js';

// ── Genres to show on the homepage (resolved dynamically from Jikan) ───────────
const HOMEPAGE_GENRES = [
  { key: 'comedyYoullLove',          name: 'Comedy',        rowTitle: "Comedy You'll Love",       desc: 'Hilarious and highly-rated comedy anime.' },
  { key: 'romanceRecommendations',   name: 'Romance',       rowTitle: 'Romance Recommendations',   desc: 'Heartwarming love stories and romantic drama.' },
  { key: 'sliceOfLifeEssentials',    name: 'Slice of Life', rowTitle: 'Slice Of Life Essentials',  desc: 'Calming, relatable everyday life stories.' },
  { key: 'actionEssentials',         name: 'Action',        rowTitle: 'Action Essentials',         desc: 'High-octane action and battle sequences.' },
  { key: 'fantasyPicks',             name: 'Fantasy',       rowTitle: 'Fantasy Picks',             desc: 'Magical worlds and epic fantasy adventures.' },
  { key: 'mysteryAndSuspense',       name: 'Mystery',       rowTitle: 'Mystery & Suspense',        desc: 'Gripping mystery and thriller anime.' },
  { key: 'adventureAnime',           name: 'Adventure',     rowTitle: 'Adventure Anime',           desc: 'Epic journeys and world exploration.' },
  { key: 'sciFiRecommendations',     name: 'Sci-Fi',        rowTitle: 'Sci-Fi Recommendations',    desc: 'Futuristic science fiction and space opera.' },
];

// Warm genre cache on startup (non-blocking)
prefetchGenres(HOMEPAGE_GENRES.map(g => g.name), 24).catch(err =>
  console.error('[HomeFeed] Genre prefetch error:', err?.message)
);

// Helper to authenticate user from token in cookies
const getUserIdFromReq = (req) => {
  const { accessToken } = req.cookies || {};
  if (!accessToken) return null;
  try {
    const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    return decodedToken?._id || null;
  } catch (error) {
    return null;
  }
};

/**
 * Main recommendation engine pipeline
 */
export const getRecommendations = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Cache check (expires in 24 hours)
    const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;
    if (
      user.cachedRecommendations &&
      user.cachedRecommendations.data &&
      user.cachedRecommendations.updatedAt &&
      Date.now() - new Date(user.cachedRecommendations.updatedAt).getTime() < CACHE_EXPIRY_MS
    ) {
      return res.status(200).json(user.cachedRecommendations.data);
    }

    // Load all anime docs
    const allAnime = await AnimeDoc.find({});
    
    // Create an ID -> Doc map
    const animeDocsMap = new Map();
    allAnime.forEach(anime => {
      animeDocsMap.set(String(anime.mal_id), anime);
    });

    const totalInteractionsCount = 
      (user.watchlist?.length || 0) + 
      (user.completedAnime?.length || 0) + 
      (user.favorites?.length || 0) + 
      (user.ratings?.length || 0) +
      (user.coldStartPreferences?.favoriteGenres?.length || 0);

    const isColdStart = totalInteractionsCount === 0 || !user.onboardingCompleted;

    let recommendationsOutput = {};

    if (isColdStart) {
      const excludeIds = new Set([
        ...(user.watchedAnime || []),
        ...(user.completedAnime || []),
        ...(user.dropped || [])
      ].map(String));

      const getFallbackRecommendations = (sortField, sortOrder, filterFn, limit = 6) => {
        return allAnime
          .filter(a => !excludeIds.has(String(a.mal_id)) && (!filterFn || filterFn(a)))
          .sort((a, b) => sortOrder * (a[sortField] - b[sortField]))
          .slice(0, limit)
          .map(a => ({
            animeId: String(a.mal_id),
            title: a.title,
            poster: a.image,
            score: a.score || a.mal_rating || 0,
            communityRating: a.averageUserRating || 0,
            recommendationScore: 80,
            reasons: ["Popular pick for new users", "Highly rated in community"],
            debug: {
              rawSimilarity: 25,
              exploration: 80,
              trending: 80,
              finalScore: 80
            }
          }));
      };

      recommendationsOutput = {
        safeRecommendations: getFallbackRecommendations('score', -1, null),
        riskyRecommendations: getFallbackRecommendations('popularity', 1, a => (a.score || a.mal_rating || 0) > 7.0).map(r => ({
          ...r,
          reasons: ["Discovery recommendation", "Popular community pick"]
        })),
        hiddenGems: getFallbackRecommendations('score', -1, a => (a.popularity || 0) >= 600),
        trendingForYou: getFallbackRecommendations('popularity', 1, null),
        exploreSomethingNew: getFallbackRecommendations('score', -1, null).reverse(),
        underratedMasterpieces: getFallbackRecommendations('score', -1, a => (a.popularity || 0) >= 400)
      };

    } else {
      const userPreferenceVector = buildUserPreferenceVector(user, animeDocsMap);
      const userCounts = buildUserGenreThemeCounts(user, animeDocsMap);

      const excludeIds = new Set([
        ...(user.watchedAnime || []),
        ...(user.completedAnime || []),
        ...(user.dropped || [])
      ].map(String));

      // 1. Calculate raw similarities to find maximum cosine similarity in the pool
      let maxCosineSimilarity = 0;
      const initialPool = [];
      const currentYear = new Date().getFullYear();

      allAnime.forEach(anime => {
        const animeIdStr = String(anime.mal_id);
        if (excludeIds.has(animeIdStr)) return;

        let featureVector = anime.featureVector;
        if (!featureVector || Object.keys(featureVector).length === 0) {
          featureVector = computeFeatureVector(anime);
        }

        const rawCosine = calculateCosineSimilarity(userPreferenceVector, featureVector);
        if (rawCosine > maxCosineSimilarity) maxCosineSimilarity = rawCosine;

        initialPool.push({ anime, featureVector, rawCosine });
      });

      // 2. Score candidates with normalized similarity scores (distributing match percentages naturally)
      const candidates = [];
      initialPool.forEach(({ anime, featureVector, rawCosine }) => {
        // Normalize cosine score so top match hits 100% similarity before weighting
        const similarityScore = maxCosineSimilarity > 0 ? (rawCosine / maxCosineSimilarity) * 100 : 0;

        const globalRating = (anime.score || anime.mal_rating || 0) * 10;
        const noveltyScore = calculateNoveltyScore(anime, userCounts);
        const weakSimilarity = 100 - Math.min(100, Math.abs(similarityScore - 45) * 2.5);
        const explorationScore = (0.60 * globalRating) + (0.20 * noveltyScore) + (0.20 * weakSimilarity);

        const rank = anime.popularity || 10000;
        let trendingScore = Math.max(0, 100 - (rank / 100));
        const yearDiff = currentYear - (anime.year || currentYear - 5);
        const yearBoost = Math.max(0, 20 - yearDiff * 4);
        trendingScore = Math.min(100, trendingScore + yearBoost);

        let customFeedbackBoost = 0;
        const genres = anime.genres || anime.genre || [];
        genres.forEach(g => {
          const name = typeof g === 'string' ? g : g.name;
          if (name && userCounts[`genre:${name}`] > 0) {
            customFeedbackBoost += Math.min(5, userCounts[`genre:${name}`] * 0.5);
          }
        });

        // 70% normalized similarity, 20% exploration, 10% trending
        const finalScore = (0.70 * similarityScore) + (0.20 * explorationScore) + (0.10 * trendingScore) + customFeedbackBoost;
        const boundedScore = Math.max(0, Math.min(100, finalScore));

        candidates.push({
          animeDoc: anime,
          mal_id: anime.mal_id,
          title: anime.title,
          image: anime.image,
          score: anime.score || anime.mal_rating || 0,
          communityRating: anime.averageUserRating || 0,
          popularity: anime.popularity,
          genres: anime.genres || anime.genre || [],
          studios: anime.studios || [],
          year: anime.year,
          featureVector,
          similarityScore,
          explorationScore,
          trendingScore,
          recommendationScore: boundedScore,
          debug: {
            rawSimilarity: Math.round(rawCosine * 100),
            exploration: Math.round(explorationScore),
            trending: Math.round(trendingScore),
            finalScore: Math.round(boundedScore)
          }
        });
      });

      const selectRecommendations = (candidatePool, sortKey, diversityTheta, filterFn, isRiskyCategory = false) => {
        let filtered = candidatePool;
        if (filterFn) filtered = candidatePool.filter(filterFn);
        
        filtered.sort((a, b) => b[sortKey] - a[sortKey]);
        const topCandidates = filtered.slice(0, 30);
        const diversified = runMMR(topCandidates, 6, diversityTheta);
        
        return diversified.map(c => ({
          animeId: String(c.mal_id),
          title: c.title,
          poster: c.image,
          score: c.score,
          communityRating: c.communityRating,
          recommendationScore: Math.round(c.recommendationScore),
          reasons: generateExplanation(c.animeDoc, userPreferenceVector, isRiskyCategory),
          debug: c.debug
        }));
      };

      recommendationsOutput = {
        safeRecommendations: selectRecommendations(candidates, 'recommendationScore', 0.85, null, false),
        riskyRecommendations: selectRecommendations(candidates, 'explorationScore', 0.65, c => c.similarityScore < 60 && c.similarityScore > 15, true),
        hiddenGems: selectRecommendations(candidates, 'score', 0.75, c => c.score >= 7.0 && c.popularity >= 800, false),
        trendingForYou: selectRecommendations(
          candidates.map(c => ({ ...c, tScore: (0.40 * c.similarityScore) + (0.10 * c.explorationScore) + (0.50 * c.trendingScore) })),
          'tScore',
          0.80,
          null,
          false
        ),
        exploreSomethingNew: selectRecommendations(candidates, 'explorationScore', 0.50, c => c.similarityScore < 50, true),
        underratedMasterpieces: selectRecommendations(candidates, 'score', 0.70, c => c.score >= 7.8 && c.popularity >= 600, false)
      };
    }

    user.cachedRecommendations = {
      data: recommendationsOutput,
      updatedAt: new Date()
    };
    await user.save();

    return res.status(200).json(recommendationsOutput);

  } catch (error) {
    console.error("Recommendations error:", error);
    return res.status(500).json({ message: 'Failed to generate recommendations.' });
  }
};

/**
 * Handle telemetry unified action system (watchlist, favorite, watched, completed, trailer)
 */
export const postAction = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { animeId, action } = req.body;
    if (!animeId || !action) {
      return res.status(400).json({ message: 'Missing animeId or action' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const animeIdStr = String(animeId);

    // Dynamic interaction weight definition:
    // Favorite +5, Completed +4, Watched +2, Watchlist +1, Trailer Viewed +0.5
    let weight = 0.2;
    if (action === 'favorite') {
      weight = 5.0;
      const idx = user.favorites.indexOf(animeIdStr);
      if (idx > -1) user.favorites.splice(idx, 1);
      else user.favorites.push(animeIdStr);
    } else if (action === 'complete') {
      weight = 4.0;
      const idx = user.completedAnime.indexOf(animeIdStr);
      if (idx > -1) {
        user.completedAnime.splice(idx, 1);
        user.watchlist = user.watchlist.filter(item => String(item.animeId) !== animeIdStr);
      } else {
        user.completedAnime.push(animeIdStr);
        if (!user.watchedAnime.includes(animeIdStr)) user.watchedAnime.push(animeIdStr);
        const wIdx = user.watchlist.findIndex(item => String(item.animeId) === animeIdStr);
        if (wIdx > -1) {
          user.watchlist[wIdx].status = 'completed';
          user.watchlist[wIdx].updatedAt = new Date();
        } else {
          user.watchlist.push({ animeId: animeIdStr, status: 'completed', updatedAt: new Date() });
        }
      }
    } else if (action === 'watched') {
      weight = 2.0;
      const idx = user.watchedAnime.indexOf(animeIdStr);
      if (idx > -1) {
        user.watchedAnime.splice(idx, 1);
        user.watchlist = user.watchlist.filter(item => String(item.animeId) !== animeIdStr);
      } else {
        user.watchedAnime.push(animeIdStr);
        const wIdx = user.watchlist.findIndex(item => String(item.animeId) === animeIdStr);
        if (wIdx > -1) {
          user.watchlist[wIdx].status = 'watching';
          user.watchlist[wIdx].updatedAt = new Date();
        } else {
          user.watchlist.push({ animeId: animeIdStr, status: 'watching', updatedAt: new Date() });
        }
      }
    } else if (action === 'watchlist') {
      weight = 1.0;
      const idx = user.watchlist.findIndex(item => String(item.animeId) === animeIdStr);
      if (idx > -1) {
        user.watchlist.splice(idx, 1);
      } else {
        user.watchlist.push({ animeId: animeIdStr, status: 'planned', updatedAt: new Date() });
      }
    } else if (action === 'move_to_watchlist') {
      weight = 1.0;
      const wlIdx = user.watchlist.findIndex(item => String(item.animeId) === animeIdStr);
      if (wlIdx === -1) {
        user.watchlist.push({ animeId: animeIdStr, status: 'planned', updatedAt: new Date() });
      }
      const favIdx = user.favorites.indexOf(animeIdStr);
      if (favIdx > -1) {
        user.favorites.splice(favIdx, 1);
      }
    } else if (action === 'trailer') {
      weight = 0.5;
    }

    // Push telemetry interaction log
    user.interactions.push({
      animeId: animeIdStr,
      type: action,
      weight,
      updatedAt: new Date()
    });

    // Clear recommendations cache
    user.cachedRecommendations = {
      data: null,
      updatedAt: null
    };

    await user.save();
    
    const updatedUser = await User.findById(user._id).select('-password -refreshToken');
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Unified action save error:", error);
    return res.status(500).json({ message: 'Failed to save unified action.' });
  }
};

/**
 * Handle user cold start preference submission
 */
export const postColdStart = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { favoriteAnime, favoriteGenres, favoriteThemes } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.coldStartPreferences = {
      favoriteAnime: (favoriteAnime || []).map(String),
      favoriteGenres: favoriteGenres || [],
      favoriteThemes: favoriteThemes || []
    };

    if (favoriteAnime) {
      favoriteAnime.forEach(id => {
        const idStr = String(id);
        if (!user.favorites.includes(idStr)) user.favorites.push(idStr);
        const wIdx = user.watchlist.findIndex(item => String(item.animeId) === idStr);
        if (wIdx === -1) {
          user.watchlist.push({ animeId: idStr, status: 'planned', updatedAt: new Date() });
        }
      });
    }

    user.cachedRecommendations = {
      data: null,
      updatedAt: null
    };

    user.onboardingCompleted = true;

    await user.save();
    return res.status(200).json({ message: 'Cold start preferences saved successfully.' });

  } catch (error) {
    console.error("Cold start preferences error:", error);
    return res.status(500).json({ message: 'Failed to save cold start preferences.' });
  }
};

/**
 * Endpoint to serve the personalized homepage feed with dynamic carousels
 */
// ── Helper: build genre rows from Jikan (with local DB fallback) ──────────────
async function buildJikanGenreRows(localGenreFallbackFn) {
  const rows = {};

  await Promise.allSettled(
    HOMEPAGE_GENRES.map(async ({ key, name, rowTitle, desc }) => {
      try {
        const jikanItems = await getCachedGenreAnime(name, 24);
        if (jikanItems && jikanItems.length >= 3) {
          // Deduplicate against already fetched items
          rows[key] = jikanItems;
          return;
        }
      } catch (err) {
        console.warn(`[HomeFeed] Jikan genre row failed for "${name}", falling back to local DB:`, err?.message);
      }
      // Fallback to local DB
      rows[key] = localGenreFallbackFn ? localGenreFallbackFn(name, rowTitle, 16) : [];
    })
  );

  return rows;
}

export const getHomeFeed = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    
    // Load all anime docs
    const allAnime = await AnimeDoc.find({});
    
    const animeDocsMap = new Map();
    allAnime.forEach(anime => {
      animeDocsMap.set(String(anime.mal_id), anime);
    });

    const currentYear = new Date().getFullYear();

    // Setup Fallbacks mapping
    const getTopRatedFallback = (limit = 10) => {
      return allAnime
        .sort((a, b) => (b.score || b.mal_rating || 0) - (a.score || a.mal_rating || 0))
        .slice(0, limit)
        .map(a => ({
          animeId: String(a.mal_id),
          title: a.title,
          poster: a.image,
          score: a.score || a.mal_rating || 0,
          communityRating: a.averageUserRating || 0,
          matchPercentage: 90,
          reasons: ["Top Rated", "Community Favorite"],
          debug: { rawSimilarity: 25, exploration: 80, trending: 80, finalScore: 90 }
        }));
    };

    const getTrendingFallback = (limit = 10) => {
      return allAnime
        .sort((a, b) => (a.popularity || 10000) - (b.popularity || 10000))
        .slice(0, limit)
        .map(a => ({
          animeId: String(a.mal_id),
          title: a.title,
          poster: a.image,
          score: a.score || a.mal_rating || 0,
          communityRating: a.averageUserRating || 0,
          matchPercentage: 85,
          reasons: ["Popular Choice", "Trending Now"],
          debug: { rawSimilarity: 20, exploration: 75, trending: 90, finalScore: 85 }
        }));
    };

    const getSeasonalFallback = (limit = 10) => {
      return allAnime
        .filter(a => a.year === currentYear || a.year === currentYear - 1)
        .sort((a, b) => (b.score || b.mal_rating || 0) - (a.score || a.mal_rating || 0))
        .slice(0, limit)
        .map(a => ({
          animeId: String(a.mal_id),
          title: a.title,
          poster: a.image,
          score: a.score || a.mal_rating || 0,
          communityRating: a.averageUserRating || 0,
          matchPercentage: 88,
          reasons: ["Recent Season", "Fan Favorite"],
          debug: { rawSimilarity: 22, exploration: 78, trending: 85, finalScore: 88 }
        }));
    };

    const getGenreFallback = (genreName, reason, limit = 10) => {
      return allAnime
        .filter(a => {
          const gl = a.genres || a.genre || [];
          return gl.some(g => {
            const name = typeof g === 'string' ? g : g.name;
            return name && name.toLowerCase() === genreName.toLowerCase();
          });
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, limit)
        .map(a => ({
          animeId: String(a.mal_id),
          title: a.title,
          poster: a.image,
          score: a.score || a.mal_rating || 0,
          communityRating: a.averageUserRating || 0,
          matchPercentage: 80,
          reasons: [reason, "Popular Choice"],
          debug: { rawSimilarity: 20, exploration: 75, trending: 80, finalScore: 80 }
        }));
    };

    const getAwardWinningFallback = (limit = 10) => {
      return allAnime
        .filter(a => (a.score || a.mal_rating || 0) >= 8.0)
        .sort((a, b) => {
          const aPri = (a.score || a.mal_rating || 0) >= 8.5 ? 1 : 0;
          const bPri = (b.score || b.mal_rating || 0) >= 8.5 ? 1 : 0;
          if (aPri !== bPri) return bPri - aPri;
          return (b.score || b.mal_rating || 0) - (a.score || a.mal_rating || 0);
        })
        .slice(0, limit)
        .map(a => ({
          animeId: String(a.mal_id),
          title: a.title,
          poster: a.image,
          score: a.score || a.mal_rating || 0,
          communityRating: a.averageUserRating || 0,
          matchPercentage: 92,
          reasons: ["Critically Acclaimed", "Award Winning"],
          debug: { rawSimilarity: 25, exploration: 85, trending: 80, finalScore: 92 }
        }));
    };

    const getTopCommunityRatedFallback = (limit = 10) => {
      return allAnime
        .filter(a => (a.averageUserRating || 0) > 0)
        .sort((a, b) => (b.averageUserRating || 0) - (a.averageUserRating || 0))
        .slice(0, limit)
        .map(a => ({
          animeId: String(a.mal_id),
          title: a.title,
          poster: a.image,
          score: a.score || a.mal_rating || 0,
          communityRating: a.averageUserRating || 0,
          matchPercentage: 90,
          reasons: ["Top Community Rated", "Fan Favorite"],
          debug: { rawSimilarity: 24, exploration: 80, trending: 82, finalScore: 90 }
        }));
    };

    if (!userId) {
      // Build Jikan genre rows in parallel with static rows
      const [jikanRows] = await Promise.allSettled([
        buildJikanGenreRows(getGenreFallback)
      ]);
      const genreRows = jikanRows?.value || {};

      return res.status(200).json({
        continueWatching: [],
        forYou: getTopRatedFallback(),
        becauseYouWatched: [],
        exploreSomethingNew: [],
        hiddenGems: [],
        trendingForYou: getTrendingFallback(),
        seasonalHighlights: getSeasonalFallback(),
        genreBasedRows: [],
        themeBasedRows: [],
        studioBasedRows: [],
        moreLikeFavorites: [],
        seasonalPicksForYou: [],
        underratedMasterpieces: [],
        // Dynamic Jikan-powered genre rows
        comedyYoullLove:          genreRows.comedyYoullLove        || getGenreFallback('Comedy', 'A laugh-out-loud Comedy essential'),
        romanceRecommendations:   genreRows.romanceRecommendations || getGenreFallback('Romance', 'Heart-warming Romance pick'),
        sliceOfLifeEssentials:    genreRows.sliceOfLifeEssentials  || getGenreFallback('Slice of Life', 'A Slice of Life essential'),
        actionEssentials:         genreRows.actionEssentials        || getGenreFallback('Action', 'High-adrenaline Action essential'),
        fantasyPicks:             genreRows.fantasyPicks            || getGenreFallback('Fantasy', 'Fantasy picks for you'),
        mysteryAndSuspense:       genreRows.mysteryAndSuspense      || getGenreFallback('Mystery', 'Mystery & suspense picks'),
        adventureAnime:           genreRows.adventureAnime          || getGenreFallback('Adventure', 'Adventure anime'),
        sciFiRecommendations:     genreRows.sciFiRecommendations    || getGenreFallback('Sci-Fi', 'Sci-Fi recommendations'),
        // Static rows
        awardWinningAnime: getAwardWinningFallback(),
        topCommunityRated: getTopCommunityRatedFallback(),
        becauseLikeAction: getGenreFallback('Action', 'Because you enjoy Action'),
        becauseLikeFantasy: getGenreFallback('Fantasy', 'Because you enjoy Fantasy'),
        becauseLikePsychological: getGenreFallback('Psychological', 'Because you enjoy Psychological'),
        isLoggedOutFallback: true
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const totalInteractionsCount = 
      (user.watchlist?.length || 0) + 
      (user.completedAnime?.length || 0) + 
      (user.favorites?.length || 0) + 
      (user.ratings?.length || 0) +
      (user.coldStartPreferences?.favoriteGenres?.length || 0);

    const isColdStart = totalInteractionsCount === 0 || !user.onboardingCompleted;

    if (isColdStart) {
      const [jikanRowsCold] = await Promise.allSettled([
        buildJikanGenreRows(getGenreFallback)
      ]);
      const genreRowsCold = jikanRowsCold?.value || {};

      return res.status(200).json({
        continueWatching: [],
        forYou: getTopRatedFallback(),
        becauseYouWatched: [],
        exploreSomethingNew: [],
        hiddenGems: [],
        trendingForYou: getTrendingFallback(),
        seasonalHighlights: getSeasonalFallback(),
        genreBasedRows: [],
        themeBasedRows: [],
        studioBasedRows: [],
        moreLikeFavorites: [],
        seasonalPicksForYou: [],
        needsOnboarding: true,
        comedyYoullLove:          genreRowsCold.comedyYoullLove        || getGenreFallback('Comedy', 'A laugh-out-loud Comedy essential'),
        romanceRecommendations:   genreRowsCold.romanceRecommendations || getGenreFallback('Romance', 'Heart-warming Romance pick'),
        sliceOfLifeEssentials:    genreRowsCold.sliceOfLifeEssentials  || getGenreFallback('Slice of Life', 'A Slice of Life essential'),
        actionEssentials:         genreRowsCold.actionEssentials        || getGenreFallback('Action', 'High-adrenaline Action essential'),
        fantasyPicks:             genreRowsCold.fantasyPicks            || getGenreFallback('Fantasy', 'Fantasy picks for you'),
        mysteryAndSuspense:       genreRowsCold.mysteryAndSuspense      || getGenreFallback('Mystery', 'Mystery & suspense picks'),
        adventureAnime:           genreRowsCold.adventureAnime          || getGenreFallback('Adventure', 'Adventure anime'),
        sciFiRecommendations:     genreRowsCold.sciFiRecommendations    || getGenreFallback('Sci-Fi', 'Sci-Fi recommendations'),
        awardWinningAnime: getAwardWinningFallback(),
        topCommunityRated: getTopCommunityRatedFallback(),
        becauseLikeAction: getGenreFallback('Action', 'Because you enjoy Action'),
        becauseLikeFantasy: getGenreFallback('Fantasy', 'Because you enjoy Fantasy'),
        becauseLikePsychological: getGenreFallback('Psychological', 'Because you enjoy Psychological')
      });
    }

    const userPreferenceVector = buildUserPreferenceVector(user, animeDocsMap);
    const userCounts = buildUserGenreThemeCounts(user, animeDocsMap);

    const excludeIds = new Set([
      ...(user.watchedAnime || []),
      ...(user.completedAnime || []),
      ...(user.dropped || [])
    ].map(String));

    // Calculate maximum similarity in list to distribute scores naturally
    let maxCosineSimilarity = 0;
    const initialPool = [];

    allAnime.forEach(anime => {
      const animeIdStr = String(anime.mal_id);
      if (excludeIds.has(animeIdStr)) return;

      let featureVector = anime.featureVector;
      if (!featureVector || Object.keys(featureVector).length === 0) {
        featureVector = computeFeatureVector(anime);
      }

      const rawCosine = calculateCosineSimilarity(userPreferenceVector, featureVector);
      if (rawCosine > maxCosineSimilarity) maxCosineSimilarity = rawCosine;

      initialPool.push({ anime, featureVector, rawCosine });
    });

    const candidates = [];
    initialPool.forEach(({ anime, featureVector, rawCosine }) => {
      const similarityScore = maxCosineSimilarity > 0 ? (rawCosine / maxCosineSimilarity) * 100 : 0;

      const globalRating = (anime.score || anime.mal_rating || 0) * 10;
      const noveltyScore = calculateNoveltyScore(anime, userCounts);
      const weakSimilarity = 100 - Math.min(100, Math.abs(similarityScore - 45) * 2.5);
      const explorationScore = (0.60 * globalRating) + (0.20 * noveltyScore) + (0.20 * weakSimilarity);

      const rank = anime.popularity || 10000;
      let trendingScore = Math.max(0, 100 - (rank / 100));
      const yearDiff = currentYear - (anime.year || currentYear - 5);
      const yearBoost = Math.max(0, 20 - yearDiff * 4);
      trendingScore = Math.min(100, trendingScore + yearBoost);

      let customFeedbackBoost = 0;
      const genres = anime.genres || anime.genre || [];
      genres.forEach(g => {
        const name = typeof g === 'string' ? g : g.name;
        if (name && userCounts[`genre:${name}`] > 0) {
          customFeedbackBoost += Math.min(5, userCounts[`genre:${name}`] * 0.5);
        }
      });

      const finalScore = (0.70 * similarityScore) + (0.20 * explorationScore) + (0.10 * trendingScore) + customFeedbackBoost;
      const boundedScore = Math.max(0, Math.min(100, finalScore));

      candidates.push({
        animeDoc: anime,
        mal_id: anime.mal_id,
        title: anime.title,
        image: anime.image,
        score: anime.score || anime.mal_rating || 0,
        communityRating: anime.averageUserRating || 0,
        popularity: anime.popularity,
        genres: anime.genres || anime.genre || [],
        studios: anime.studios || [],
        year: anime.year,
        featureVector,
        similarityScore,
        explorationScore,
        trendingScore,
        recommendationScore: boundedScore,
        debug: {
          rawSimilarity: Math.round(rawCosine * 100),
          exploration: Math.round(explorationScore),
          trending: Math.round(trendingScore),
          finalScore: Math.round(boundedScore)
        }
      });
    });

    const getPersonalizedRows = (candidatePool, sortKey, diversityTheta, filterFn, isRiskyCategory = false, limit = 8) => {
      let filtered = candidatePool;
      if (filterFn) filtered = candidatePool.filter(filterFn);
      
      filtered.sort((a, b) => b[sortKey] - a[sortKey]);
      const topCandidates = filtered.slice(0, 30);
      const diversified = runMMR(topCandidates, limit, diversityTheta);
      
      return diversified.map(c => ({
        animeId: String(c.mal_id),
        title: c.title,
        poster: c.image,
        score: c.score,
        communityRating: c.communityRating,
        matchPercentage: Math.round(c.recommendationScore),
        reasons: generateExplanation(c.animeDoc, userPreferenceVector, isRiskyCategory),
        debug: c.debug
      }));
    };

    // 1. Continue Watching
    const watchlistIds = new Set((user.watchlist || []).map(String));
    const continueWatching = allAnime
      .filter(a => watchlistIds.has(String(a.mal_id)))
      .slice(0, 8)
      .map(a => ({
        animeId: String(a.mal_id),
        title: a.title,
        poster: a.image,
        score: a.score || a.mal_rating || 0,
        communityRating: a.averageUserRating || 0,
        matchPercentage: 95,
        reasons: ["On your watchlist"],
        debug: { rawSimilarity: 50, exploration: 85, trending: 80, finalScore: 95 }
      }));

    // 2. Recommended For You
    const forYou = getPersonalizedRows(candidates, 'recommendationScore', 0.85, null, false);

    // 3. Because You Watched
    let recentWatchedId = null;
    if (user.completedAnime && user.completedAnime.length > 0) {
      recentWatchedId = user.completedAnime[user.completedAnime.length - 1];
    } else if (user.ratings && user.ratings.length > 0) {
      recentWatchedId = user.ratings[user.ratings.length - 1].animeId;
    } else if (user.watchlist && user.watchlist.length > 0) {
      recentWatchedId = user.watchlist[user.watchlist.length - 1];
    }

    let becauseYouWatched = [];
    if (recentWatchedId) {
      const baseAnime = animeDocsMap.get(String(recentWatchedId));
      if (baseAnime) {
        const baseVector = baseAnime.featureVector || computeFeatureVector(baseAnime);
        const simCandidates = candidates.map(c => ({
          ...c,
          simToBase: calculateCosineSimilarity(baseVector, c.featureVector) * 100
        }));
        
        becauseYouWatched = getPersonalizedRows(
          simCandidates,
          'simToBase',
          0.80,
          null,
          false
        ).map(r => ({
          ...r,
          reasons: [`Similar to ${baseAnime.title}`, ...r.reasons.slice(0, 1)]
        }));
      }
    }

    // 4. Explore Something New
    const exploreSomethingNew = getPersonalizedRows(candidates, 'explorationScore', 0.60, c => c.similarityScore < 55, true);

    // 5. Hidden Gems
    const hiddenGems = getPersonalizedRows(candidates, 'score', 0.75, c => c.score >= 7.0 && c.popularity >= 800, false);

    // 6. Top Genres (Dynamic carousels)
    const sortedGenres = Object.keys(userCounts)
      .filter(k => k.startsWith('genre:'))
      .sort((a, b) => userCounts[b] - userCounts[a])
      .map(k => k.replace('genre:', ''));

    const targetGenres = ['Action', 'Fantasy', 'Psychological', 'Adventure'];
    const genreBasedRows = [];
    targetGenres.forEach(genre => {
      const count = userCounts[`genre:${genre}`] || 0;
      if (count > 0) {
        const items = getPersonalizedRows(candidates, 'recommendationScore', 0.80, c => c.genres.some(g => (g.name || g) === genre), false);
        if (items.length > 0) {
          genreBasedRows.push({
            title: `Because You Like ${genre}`,
            genre,
            items,
            anime: items
          });
        }
      }
    });

    // Fallback if none matched
    if (genreBasedRows.length === 0) {
      ['Action', 'Fantasy'].forEach(genre => {
        const items = getPersonalizedRows(candidates, 'recommendationScore', 0.80, c => c.genres.some(g => (g.name || g) === genre), false);
        genreBasedRows.push({
          title: `Because You Like ${genre}`,
          genre,
          items,
          anime: items
        });
      });
    }

    // 7. Top Themes (Dynamic carousels)
    const themeMappings = [
      { title: "Dark Fantasy Picks", theme: "Dark Fantasy" },
      { title: "Found Family Stories", theme: "Found Family" },
      { title: "Time Travel Anime", theme: "Time Travel" },
      { title: "Mystery & Suspense", theme: "Mystery" }
    ];
    const themeBasedRows = [];
    themeMappings.forEach(mapping => {
      const count = userCounts[`theme:${mapping.theme}`] || userCounts[`genre:${mapping.theme}`] || 0;
      if (count > 0 || mapping.theme === 'Dark Fantasy' || mapping.theme === 'Mystery') {
        const items = getPersonalizedRows(
          candidates,
          'recommendationScore',
          0.80,
          c => {
            if (mapping.theme === 'Mystery') {
              return c.genres.some(g => (g.name || g) === 'Mystery' || (g.name || g) === 'Suspense') ||
                     c.animeDoc.themes?.some(t => (t.name || t) === 'Mystery' || (t.name || t) === 'Suspense');
            }
            return c.animeDoc.themes?.some(t => (t.name || t) === mapping.theme);
          },
          false
        );
        if (items.length > 0) {
          themeBasedRows.push({
            title: mapping.title,
            theme: mapping.theme,
            items,
            anime: items
          });
        }
      }
    });

    // 8. Top Studios (Dynamic carousels)
    const sortedStudios = Object.keys(userCounts)
      .filter(k => k.startsWith('studio:'))
      .sort((a, b) => userCounts[b] - userCounts[a])
      .map(k => k.replace('studio:', ''));
    
    const topStudio = sortedStudios[0] || "Madhouse";
    const studioItems = getPersonalizedRows(candidates, 'recommendationScore', 0.80, c => c.studios.some(s => (s.name || s) === topStudio), false);
    const studioBasedRows = [{
      title: `From ${topStudio}, a Studio You Enjoy`,
      items: studioItems,
      anime: studioItems
    }];

    // 9. Trending In Your Genres
    const userTopGenres = sortedGenres.slice(0, 2);
    const trendingForYou = getPersonalizedRows(
      candidates,
      'trendingScore',
      0.80,
      c => c.genres.some(g => userTopGenres.includes(g.name || g)),
      false
    );

    // 10. Seasonal Highlights
    const seasonalHighlights = getPersonalizedRows(candidates, 'score', 0.80, c => c.year === currentYear || c.year === currentYear - 1, false);

    // 11. More Like Your Favorites
    const favIds = [
      ...(user.favorites || []),
      ...(user.ratings?.filter(r => r.rating >= 7.0).map(r => r.animeId) || [])
    ];
    let moreLikeFavorites = [];
    if (favIds.length > 0) {
      // average their vectors
      const avgVector = {};
      let validCount = 0;
      favIds.forEach(id => {
        const doc = animeDocsMap.get(String(id));
        if (doc) {
          const vec = doc.featureVector || computeFeatureVector(doc);
          for (const feature in vec) {
            avgVector[feature] = (avgVector[feature] || 0) + vec[feature];
          }
          validCount++;
        }
      });
      
      if (validCount > 0) {
        for (const feature in avgVector) {
          avgVector[feature] = avgVector[feature] / validCount;
        }
        
        const favSimCandidates = candidates.map(c => ({
          ...c,
          favSim: calculateCosineSimilarity(avgVector, c.featureVector) * 100
        }));

        moreLikeFavorites = getPersonalizedRows(favSimCandidates, 'favSim', 0.80, null, false);
      }
    }
    // Fallback if empty
    if (moreLikeFavorites.length === 0) {
      moreLikeFavorites = getPersonalizedRows(candidates, 'recommendationScore', 0.80, null, false);
    }

    // 12. Seasonal Picks For You (matching top genres/themes)
    const seasonalPicksForYou = getPersonalizedRows(
      candidates,
      'recommendationScore',
      0.80,
      c => (c.year === currentYear || c.year === currentYear - 1) && c.genres.some(g => userTopGenres.includes(g.name || g)),
      false
    );

    // 13. Underrated Masterpieces
    const underratedMasterpieces = getPersonalizedRows(candidates, 'score', 0.70, c => c.score >= 7.8 && c.popularity >= 600, false);

    const filterGenreRows = (pool, genreName, matchPct, reason) => {
      const filtered = pool.filter(c => {
        const gl = c.genres || c.genre || [];
        return gl.some(g => {
          const name = typeof g === 'string' ? g : g.name;
          return name && name.toLowerCase() === genreName.toLowerCase();
        });
      });
      return filtered
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 10)
        .map(c => ({
          animeId: String(c.mal_id),
          title: c.title,
          poster: c.image,
          score: c.score,
          communityRating: c.communityRating,
          matchPercentage: Math.round(c.recommendationScore),
          reasons: [reason, ...generateExplanation(c.animeDoc, userPreferenceVector, false).slice(0, 1)],
          debug: c.debug
        }));
    };

    const awardWinningAnime = candidates
      .filter(c => c.score >= 8.0)
      .sort((a, b) => {
        const aPri = a.score >= 8.5 ? 1 : 0;
        const bPri = b.score >= 8.5 ? 1 : 0;
        if (aPri !== bPri) return bPri - aPri;
        return b.recommendationScore - a.recommendationScore;
      })
      .slice(0, 10)
      .map(c => ({
        animeId: String(c.mal_id),
        title: c.title,
        poster: c.image,
        score: c.score,
        communityRating: c.communityRating,
        matchPercentage: Math.round(c.recommendationScore),
        reasons: ["Award Winning Title", `MAL Score: ${c.score}`],
        debug: c.debug
      }));

    const topCommunityRated = candidates
      .filter(c => c.communityRating > 0)
      .sort((a, b) => b.communityRating - a.communityRating)
      .slice(0, 10)
      .map(c => ({
        animeId: String(c.mal_id),
        title: c.title,
        poster: c.image,
        score: c.score,
        communityRating: c.communityRating,
        matchPercentage: Math.round(c.recommendationScore),
        reasons: ["Top Community Rated", `Community: ${c.communityRating.toFixed(1)}/10`],
        debug: c.debug
      }));

    // Build Jikan genre rows — for logged-in users we personalise them by
    // preferring items that match the user's top genres; Jikan provides the
    // broader catalogue beyond our local DB.
    const userTopGenreNames = Object.keys(userCounts)
      .filter(k => k.startsWith('genre:'))
      .sort((a, b) => userCounts[b] - userCounts[a])
      .map(k => k.replace('genre:', ''));

    // For each homepage genre row: use local candidates first (personalised),
    // then pad with Jikan results to reach 16 items.
    const buildPersonalisedGenreRow = async (genreName, localReason) => {
      const localItems = filterGenreRows(candidates, genreName, 85, localReason);
      if (localItems.length >= 12) return localItems;

      // Pad with Jikan (deduplicated)
      try {
        const existingIds = new Set(localItems.map(i => String(i.animeId)));
        const jikanItems = await getCachedGenreAnime(genreName, 16);
        const padded = jikanItems.filter(j => !existingIds.has(j.animeId));
        return [...localItems, ...padded].slice(0, 16);
      } catch (e) {
        return localItems;
      }
    };

    const [
      comedyRowResult, romanceRowResult, solRowResult, actionRowResult,
      fantasyRowResult, mysteryRowResult, adventureRowResult, scifiRowResult,
    ] = await Promise.allSettled([
      buildPersonalisedGenreRow('Comedy',        'Comedy you will love'),
      buildPersonalisedGenreRow('Romance',       'Romance recommendations'),
      buildPersonalisedGenreRow('Slice of Life', 'Slice of Life essentials'),
      buildPersonalisedGenreRow('Action',        'Action essentials for you'),
      buildPersonalisedGenreRow('Fantasy',       'Fantasy picks for you'),
      buildPersonalisedGenreRow('Mystery',       'Mystery & suspense picks'),
      buildPersonalisedGenreRow('Adventure',     'Adventure anime'),
      buildPersonalisedGenreRow('Sci-Fi',        'Sci-Fi recommendations'),
    ]);

    const safeRow = (result, fallbackFn, genre, reason) =>
      result?.status === 'fulfilled' ? result.value : (fallbackFn ? fallbackFn(genre, reason) : []);

    return res.status(200).json({
      continueWatching,
      forYou,
      becauseYouWatched,
      exploreSomethingNew,
      hiddenGems,
      trendingForYou,
      seasonalHighlights,
      genreBasedRows,
      themeBasedRows,
      studioBasedRows,
      moreLikeFavorites,
      seasonalPicksForYou,
      underratedMasterpieces,
      // Dynamic Jikan-backed genre rows
      comedyYoullLove:          safeRow(comedyRowResult,    filterGenreRows.bind(null, candidates), 'Comedy',        'Comedy you will love'),
      romanceRecommendations:   safeRow(romanceRowResult,   filterGenreRows.bind(null, candidates), 'Romance',       'Romance recommendations'),
      sliceOfLifeEssentials:    safeRow(solRowResult,       filterGenreRows.bind(null, candidates), 'Slice of Life', 'Slice of Life essentials'),
      actionEssentials:         safeRow(actionRowResult,    filterGenreRows.bind(null, candidates), 'Action',        'Action essentials for you'),
      fantasyPicks:             safeRow(fantasyRowResult,   filterGenreRows.bind(null, candidates), 'Fantasy',       'Fantasy picks for you'),
      mysteryAndSuspense:       safeRow(mysteryRowResult,   filterGenreRows.bind(null, candidates), 'Mystery',       'Mystery & suspense'),
      adventureAnime:           safeRow(adventureRowResult, filterGenreRows.bind(null, candidates), 'Adventure',     'Adventure anime'),
      sciFiRecommendations:     safeRow(scifiRowResult,     filterGenreRows.bind(null, candidates), 'Sci-Fi',        'Sci-Fi recommendations'),
      // Classic static rows
      awardWinningAnime,
      topCommunityRated,
      becauseLikeAction: filterGenreRows(candidates, 'Action', 88, 'Because you enjoy Action'),
      becauseLikeFantasy: filterGenreRows(candidates, 'Fantasy', 86, 'Because you enjoy Fantasy'),
      becauseLikePsychological: filterGenreRows(candidates, 'Psychological', 90, 'Because you enjoy Psychological')
    });

  } catch (error) {
    console.error("Home feed recommendations error:", error);
    return res.status(500).json({ message: 'Failed to generate home feed.' });
  }
};

export const postInteraction = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { animeId, type } = req.body;
    if (!animeId || !type) {
      return res.status(400).json({ message: 'Missing animeId or type' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let weight = 0.2;
    if (type === 'favorite') weight = 5.0;
    else if (type === 'complete') weight = 4.0;
    else if (type === 'watched') weight = 2.0;
    else if (type === 'watchlist') weight = 1.0;
    else if (type === 'trailer') weight = 0.5;

    user.interactions.push({
      animeId: String(animeId),
      type,
      weight,
      updatedAt: new Date()
    });

    user.cachedRecommendations = { data: null, updatedAt: null };
    await user.save();

    return res.status(200).json({ message: 'Interaction saved successfully.' });
  } catch (error) {
    console.error("Interaction save error:", error);
    return res.status(500).json({ message: 'Failed to save interaction.' });
  }
};

export const toggleUserList = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { animeId, listType } = req.body;
    if (!animeId || !listType) {
      return res.status(400).json({ message: 'Missing animeId or listType' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const animeIdStr = String(animeId);
    if (listType === 'watchlist' || listType === 'favorites' || listType === 'completedAnime' || listType === 'watchedAnime') {
      const index = user[listType].indexOf(animeIdStr);
      if (index > -1) {
        user[listType].splice(index, 1);
      } else {
        user[listType].push(animeIdStr);
      }
    } else {
      return res.status(400).json({ message: `Invalid list type: ${listType}` });
    }

    user.cachedRecommendations = { data: null, updatedAt: null };
    await user.save();

    return res.status(200).json(user);
  } catch (error) {
    console.error("List toggle error:", error);
    return res.status(500).json({ message: 'Failed to toggle list item.' });
  }
};

export const precomputeAnimeVectors = async (req, res) => {
  try {
    const allAnime = await AnimeDoc.find({});
    let precomputedCount = 0;

    for (const anime of allAnime) {
      const vector = computeFeatureVector(anime);
      
      let tags = anime.tags || [];
      if (tags.length === 0) {
        const genres = anime.genres || anime.genre || [];
        const themes = anime.themes || [];
        const demographics = anime.demographics || [];
        const gTags = genres.map(g => (g.name || g || '').toLowerCase());
        const tTags = themes.map(t => (t.name || t || '').toLowerCase());
        const dTags = demographics.map(d => (d.name || d || '').toLowerCase());
        tags = [...new Set([...gTags, ...tTags, ...dTags])].filter(Boolean);
      }

      await AnimeDoc.updateOne(
        { _id: anime._id },
        { 
          $set: { 
            featureVector: vector,
            tags: tags
          } 
        }
      );
      precomputedCount++;
    }

    return res.status(200).json({ message: `Feature vectors calculated for ${precomputedCount} anime titles.` });

  } catch (error) {
    console.error("Vector precomputation migration error:", error);
    return res.status(500).json({ message: 'Failed to precompute anime vectors.' });
  }
};

/**
 * GET /api/recommendations/genres
 * Returns the Jikan genre lookup map { name -> mal_id }.
 * Cached — safe to call frequently.
 */
export const getGenreList = async (req, res) => {
  try {
    const map = await getGenreMap();
    // Return an array of { mal_id, name } for convenient use
    const genres = Object.entries(map)
      .filter(([name]) => name === name.charAt(0).toUpperCase() + name.slice(1)) // Only canonical cased entries
      .map(([name, mal_id]) => ({ mal_id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({ genres });
  } catch (error) {
    console.error('getGenreList error:', error);
    return res.status(500).json({ message: 'Failed to fetch genre list.' });
  }
};
