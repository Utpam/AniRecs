import { AnimeDoc } from '../Model/Anime.model.js';
import { AnimeMetadata } from '../Model/AnimeMetadata.model.js';
import { lightweightImport } from '../Utils/importService.js';
import { jikanGetWithRetry } from '../Utils/jikanGenreService.js';

/**
 * GET /api/search?q=&genre=&sort=score&page=1&limit=24
 *
 * Searches the anime collection using a case-insensitive regex on title
 * (and synopsis when q > 3 chars). Supports:
 *   • genre  – filter by genre name
 *   • sort   – 'score' | 'popularity' | 'year' | 'rating' (community)
 *   • page   – 1-indexed pagination
 *   • limit  – results per page (max 48)
 */
export const searchAnime = async (req, res) => {
  try {
    const {
      q = '',
      genre = '',
      sort = 'score',
      page = 1,
      limit = 24,
    } = req.query;

    const trimQ   = q.trim();
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum= Math.min(48, Math.max(1, parseInt(limit, 10)));
    const skip    = (pageNum - 1) * limitNum;

    // ── Build match filter ──────────────────────────────────────────────
    const filter = {};

    if (trimQ.length > 0) {
      const regex = new RegExp(trimQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (trimQ.length <= 3) {
        // Short query: title prefix only (fast)
        filter.title = { $regex: regex };
      } else {
        // Longer query: title OR synopsis
        filter.$or = [
          { title:    { $regex: regex } },
          { synopsis: { $regex: regex } },
        ];
      }
    }

    if (genre && genre !== 'All') {
      filter.$or = [
        ...(filter.$or || []),
        { 'genre.name':  { $regex: new RegExp(genre, 'i') } },
        { tags:          { $regex: new RegExp(genre, 'i') } },
      ];
      // Override $or with genre AND title search when both present
      if (trimQ.length > 0) {
        const titleRegex = new RegExp(trimQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$and = [
          { $or: [{ title: { $regex: titleRegex } }, { synopsis: { $regex: titleRegex } }] },
          {
            $or: [
              { 'genre.name':  { $regex: new RegExp(genre, 'i') } },
              { tags:          { $regex: new RegExp(genre, 'i') } },
            ],
          },
        ];
        delete filter.$or;
      } else {
        filter.$or = [
          { 'genre.name':  { $regex: new RegExp(genre, 'i') } },
          { tags:          { $regex: new RegExp(genre, 'i') } },
        ];
      }
    }

    // ── Sort map ─────────────────────────────────────────────────────────
    const sortMap = {
      score:      { score: -1 },
      popularity: { popularity: 1 },   // lower popularity rank = more popular
      year:       { year: -1 },
      rating:     { averageUserRating: -1 },
    };
    const sortOrder = sortMap[sort] || sortMap.score;

    // ── Query ─────────────────────────────────────────────────────────────
    let docs = await AnimeDoc.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limitNum)
      .select('mal_id title image synopsis genre genres score popularity year averageUserRating ratingCount tags')
      .lean();
    let total = await AnimeDoc.countDocuments(filter);

    // ── Hybrid Search Fallback ──────────────────────────────────────────
    // If local results are insufficient (e.g. less than 6 results) and we have a query, query Jikan.
    const INSUFFICIENT_THRESHOLD = 6;
    if (docs.length < INSUFFICIENT_THRESHOLD && trimQ.length > 0 && pageNum === 1) {
      console.log(`[Search] Insufficient local results (${docs.length}). Querying Jikan fallback...`);
      try {
        const jikanRes = await jikanGetWithRetry(`https://api.jikan.moe/v4/anime`, {
          q: trimQ,
          limit: 24,
          sfw: true
        });
        const jikanItems = jikanRes?.data || [];
        if (jikanItems.length > 0) {
          for (const item of jikanItems) {
            await lightweightImport(item);
          }
          // Re-query local database to incorporate the newly imported anime
          docs = await AnimeDoc.find(filter)
            .sort(sortOrder)
            .skip(skip)
            .limit(limitNum)
            .select('mal_id title image synopsis genre genres score popularity year averageUserRating ratingCount tags')
            .lean();
          total = await AnimeDoc.countDocuments(filter);
        }
      } catch (err) {
        console.error('[Search] Jikan search fallback failed:', err.message);
      }
    }

    // ── Shape results ─────────────────────────────────────────────────────
    const results = docs.map(doc => ({
      animeId:       doc.mal_id,
      title:         doc.title,
      poster:        doc.image,
      synopsis:      doc.synopsis?.slice(0, 200) || '',
      score:         doc.score || doc.mal_rating || null,
      year:          doc.year || null,
      communityRating: doc.averageUserRating || 0,
      genres:        (doc.genre?.length ? doc.genre : doc.genres || []).map(g => g.name || g).filter(Boolean),
      tags:          doc.tags || [],
    }));

    return res.status(200).json({
      results,
      pagination: {
        page:       pageNum,
        limit:      limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore:    pageNum * limitNum < total,
      },
      query: trimQ,
      genre,
      sort,
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ message: 'Search failed', error: error.message });
  }
};

/**
 * GET /api/search/suggestions?q=
 * Returns up to 8 lightweight title suggestions for the search dropdown.
 */
export const searchSuggestions = async (req, res) => {
  try {
    const { q = '' } = req.query;
    const trimQ = q.trim();

    if (trimQ.length < 2) return res.status(200).json({ suggestions: [] });

    const regex = new RegExp(trimQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const docs = await AnimeDoc.find({ title: { $regex: regex } })
      .sort({ score: -1 })
      .limit(8)
      .select('mal_id title image score')
      .lean();

    const suggestions = docs.map(doc => ({
      animeId: doc.mal_id,
      title:   doc.title,
      poster:  doc.image,
      score:   doc.score,
    }));

    return res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    return res.status(500).json({ suggestions: [] });
  }
};
