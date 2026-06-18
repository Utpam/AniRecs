/**
 * Sparse Vector Cosine Similarity
 * @param {Object} vectorA - Sparse vector representation (key-value)
 * @param {Object} vectorB - Sparse vector representation (key-value)
 * @returns {number} - Cosine similarity (0 to 1)
 */
export function calculateCosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (const key in vectorA) {
    const val = Number(vectorA[key]) || 0;
    normA += val * val;
    if (vectorB[key] !== undefined) {
      dotProduct += val * (Number(vectorB[key]) || 0);
    }
  }
  
  for (const key in vectorB) {
    const val = Number(vectorB[key]) || 0;
    normB += val * val;
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compute Anime Feature Vector based on Step 2 weights
 * @param {Object} anime - Anime document
 * @returns {Object} - Sparse vector
 */
export function computeFeatureVector(anime) {
  const vector = {};
  
  const genres = anime.genres || anime.genre || [];
  const themes = anime.themes || [];
  const demographics = anime.demographics || [];
  const studios = anime.studios || [];
  const source = anime.source || '';
  const score = anime.score || anime.mal_rating || 0;
  const popularity = anime.popularity || 10000;
  
  // Dynamic tag generation if empty:
  let tags = anime.tags || [];
  if (tags.length === 0) {
    const gTags = genres.map(g => (g.name || g || '').toLowerCase());
    const tTags = themes.map(t => (t.name || t || '').toLowerCase());
    const dTags = demographics.map(d => (d.name || d || '').toLowerCase());
    tags = [...new Set([...gTags, ...tTags, ...dTags])].filter(Boolean);
  }

  // 1. Genres: 35%
  if (genres.length > 0) {
    const w = 0.35 / genres.length;
    genres.forEach(g => {
      const gName = typeof g === 'string' ? g : g.name;
      if (gName) vector[`genre:${gName}`] = w;
    });
  }

  // 2. Themes: 25%
  if (themes.length > 0) {
    const w = 0.25 / themes.length;
    themes.forEach(t => {
      const tName = typeof t === 'string' ? t : t.name;
      if (tName) vector[`theme:${tName}`] = w;
    });
  }

  // 3. Tags: 20%
  if (tags.length > 0) {
    const w = 0.20 / tags.length;
    tags.forEach(tag => {
      if (tag) vector[`tag:${tag.toLowerCase()}`] = w;
    });
  }

  // 4. Demographics: 5%
  if (demographics.length > 0) {
    const w = 0.05 / demographics.length;
    demographics.forEach(d => {
      const dName = typeof d === 'string' ? d : d.name;
      if (dName) vector[`demographic:${dName}`] = w;
    });
  }

  // 5. Studios: 5%
  if (studios.length > 0) {
    const w = 0.05 / studios.length;
    studios.forEach(s => {
      const sName = typeof s === 'string' ? s : s.name;
      if (sName) vector[`studio:${sName}`] = w;
    });
  }

  // 6. Source: 5%
  if (source) {
    vector[`source:${source}`] = 0.05;
  }

  // 7. Popularity: 2.5%
  const popVal = Math.max(1, popularity);
  const normalizedPop = Math.max(0, 1 - Math.log(popVal) / Math.log(25000));
  vector['popularity_normalized'] = normalizedPop * 0.025;

  // 8. Community Score: 2.5%
  const normalizedScore = Math.max(0, Math.min(10, score)) / 10;
  vector['score_normalized'] = normalizedScore * 0.025;

  return vector;
}

/**
 * Builds user preference profile vector with recency time decay
 * @param {Object} user - User document
 * @param {Map} animeDocsMap - Map of animeId -> anime details
 * @returns {Object} - Sparse vector representing user preferences
 */
export function buildUserPreferenceVector(user, animeDocsMap) {
  const userVector = {};
  
  const addAnimeToProfile = (animeId, interactionWeight, updatedAtDate) => {
    const anime = animeDocsMap.get(String(animeId));
    if (!anime) return;
    
    const daysDiff = (Date.now() - new Date(updatedAtDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24);
    const recencyMultiplier = Math.max(0.2, Math.exp(-0.05 * daysDiff));
    const weight = interactionWeight * recencyMultiplier;
    
    const featureVector = anime.featureVector || computeFeatureVector(anime);
    
    for (const feature in featureVector) {
      userVector[feature] = (userVector[feature] || 0) + (featureVector[feature] * weight);
    }
  };

  if (user.watchlist) {
    user.watchlist.forEach(item => addAnimeToProfile(item.animeId, 1));
  }
  
  if (user.completedAnime) {
    user.completedAnime.forEach(id => addAnimeToProfile(id, 4));
  }
  
  if (user.watchedAnime) {
    user.watchedAnime.forEach(id => addAnimeToProfile(id, 2));
  }
  
  if (user.favorites) {
    user.favorites.forEach(id => addAnimeToProfile(id, 5));
  }
  
  if (user.ratings) {
    user.ratings.forEach(r => {
      const ratingWeight = (Number(r.rating) || 0) * 0.8;
      if (ratingWeight > 0) {
        addAnimeToProfile(r.animeId, ratingWeight, r.updatedAt);
      }
    });
  }

  if (user.interactions) {
    user.interactions.forEach(item => {
      let w = 0.2;
      if (item.type === 'favorite') w = 5.0;
      else if (item.type === 'complete') w = 4.0;
      else if (item.type === 'watched') w = 2.0;
      else if (item.type === 'watchlist') w = 1.0;
      else if (item.type === 'trailer') w = 0.5;
      else if (item.type === 'click') w = 0.2;
      
      addAnimeToProfile(item.animeId, w, item.updatedAt);
    });
  }

  if (user.coldStartPreferences) {
    const { favoriteAnime, favoriteGenres, favoriteThemes } = user.coldStartPreferences;
    
    if (favoriteAnime) {
      favoriteAnime.forEach(id => addAnimeToProfile(id, 5));
    }
    
    if (favoriteGenres) {
      favoriteGenres.forEach(genreName => {
        userVector[`genre:${genreName}`] = (userVector[`genre:${genreName}`] || 0) + 5.0;
        userVector[`tag:${genreName.toLowerCase()}`] = (userVector[`tag:${genreName.toLowerCase()}`] || 0) + 3.0;
      });
    }
    
    if (favoriteThemes) {
      favoriteThemes.forEach(themeName => {
        userVector[`theme:${themeName}`] = (userVector[`theme:${themeName}`] || 0) + 5.0;
        userVector[`tag:${themeName.toLowerCase()}`] = (userVector[`tag:${themeName.toLowerCase()}`] || 0) + 3.0;
      });
    }
  }

  return userVector;
}

/**
 * Analyze user history to count genre and theme frequencies
 * @param {Object} user - User document
 * @param {Map} animeDocsMap - Map of animeId -> anime details
 * @returns {Object} - Maps genre/theme keys to counts
 */
export function buildUserGenreThemeCounts(user, animeDocsMap) {
  const counts = {};
  
  const processAnime = (animeId) => {
    const anime = animeDocsMap.get(String(animeId));
    if (!anime) return;
    
    const genres = anime.genres || anime.genre || [];
    genres.forEach(g => {
      const name = typeof g === 'string' ? g : g.name;
      if (name) counts[`genre:${name}`] = (counts[`genre:${name}`] || 0) + 1;
    });

    const themes = anime.themes || [];
    themes.forEach(t => {
      const name = typeof t === 'string' ? t : t.name;
      if (name) counts[`theme:${name}`] = (counts[`theme:${name}`] || 0) + 1;
    });
  };

  if (user.watchlist) user.watchlist.forEach(item => processAnime(item.animeId));
  if (user.completedAnime) user.completedAnime.forEach(processAnime);
  if (user.favorites) user.favorites.forEach(processAnime);
  if (user.ratings) user.ratings.forEach(r => processAnime(r.animeId));

  if (user.coldStartPreferences) {
    const { favoriteAnime, favoriteGenres, favoriteThemes } = user.coldStartPreferences;
    if (favoriteAnime) favoriteAnime.forEach(processAnime);
    if (favoriteGenres) favoriteGenres.forEach(g => counts[`genre:${g}`] = (counts[`genre:${g}`] || 0) + 2);
    if (favoriteThemes) favoriteThemes.forEach(t => counts[`theme:${t}`] = (counts[`theme:${t}`] || 0) + 2);
  }

  return counts;
}

/**
 * Calculates novelty score of an anime based on under-represented genres/themes
 * @param {Object} anime - Anime doc
 * @param {Object} userCounts - Genre/theme counts object
 * @returns {number} - NoveltyScore (0 to 100)
 */
export function calculateNoveltyScore(anime, userCounts) {
  const genres = anime.genres || anime.genre || [];
  const themes = anime.themes || [];
  
  const totalCounts = Object.values(userCounts);
  const maxCount = totalCounts.length > 0 ? Math.max(...totalCounts) : 1;
  
  let noveltyAccum = 0;
  let itemsCount = 0;
  
  genres.forEach(g => {
    const name = typeof g === 'string' ? g : g.name;
    if (name) {
      const userFreq = userCounts[`genre:${name}`] || 0;
      noveltyAccum += (1 - (userFreq / maxCount));
      itemsCount++;
    }
  });

  themes.forEach(t => {
    const name = typeof t === 'string' ? t : t.name;
    if (name) {
      const userFreq = userCounts[`theme:${name}`] || 0;
      noveltyAccum += (1 - (userFreq / maxCount));
      itemsCount++;
    }
  });

  if (itemsCount === 0) return 80;
  return (noveltyAccum / itemsCount) * 100;
}

/**
 * Diversity filter using MMR and Hard Constraints
 * @param {Array} candidates - Recommended anime candidates
 * @param {number} limit - Maximum recommendations to return
 * @param {number} theta - Diversity scaling factor
 * @returns {Array} - Diversified recommendation list
 */
export function runMMR(candidates, limit, theta = 0.8) {
  const selected = [];
  const candidatePool = [...candidates];
  
  const genreCounts = {};
  const studioCounts = {};
  const franchiseKeys = {};
  
  while (selected.length < limit && candidatePool.length > 0) {
    let bestCandidateIdx = -1;
    let bestMMRScore = -Infinity;
    
    for (let i = 0; i < candidatePool.length; i++) {
      const cand = candidatePool[i];
      
      let genreLimitExceeded = false;
      const genres = cand.genres || cand.genre || [];
      genres.forEach(g => {
        const name = typeof g === 'string' ? g : g.name;
        if (name && genreCounts[name] >= 3) genreLimitExceeded = true;
      });
      if (genreLimitExceeded) continue;
      
      let studioLimitExceeded = false;
      const studios = cand.studios || [];
      studios.forEach(s => {
        const name = typeof s === 'string' ? s : s.name;
        if (name && studioCounts[name] >= 2) studioLimitExceeded = true;
      });
      if (studioLimitExceeded) continue;
      
      const franchiseKey = cand.title.substring(0, 10).toLowerCase();
      if (franchiseKeys[franchiseKey] >= 2) continue;

      let relevance = cand.recommendationScore;
      let maxSimilarity = 0;
      
      if (selected.length > 0) {
        selected.forEach(sel => {
          const sim = calculateCosineSimilarity(cand.featureVector, sel.featureVector);
          if (sim > maxSimilarity) maxSimilarity = sim;
        });
      }
      
      const diversity = 1 - maxSimilarity;
      const mmrScore = theta * relevance + (1 - theta) * (diversity * 100);
      
      if (mmrScore > bestMMRScore) {
        bestMMRScore = mmrScore;
        bestCandidateIdx = i;
      }
    }
    
    if (bestCandidateIdx === -1) {
      let fallbackIdx = 0;
      let maxScore = -Infinity;
      for (let i = 0; i < candidatePool.length; i++) {
        if (candidatePool[i].recommendationScore > maxScore) {
          maxScore = candidatePool[i].recommendationScore;
          fallbackIdx = i;
        }
      }
      
      const item = candidatePool.splice(fallbackIdx, 1)[0];
      selected.push(item);
      continue;
    }
    
    const bestCand = candidatePool.splice(bestCandidateIdx, 1)[0];
    selected.push(bestCand);
    
    const bestGenres = bestCand.genres || bestCand.genre || [];
    bestGenres.forEach(g => {
      const name = typeof g === 'string' ? g : g.name;
      if (name) genreCounts[name] = (genreCounts[name] || 0) + 1;
    });
    
    const bestStudios = bestCand.studios || [];
    bestStudios.forEach(s => {
      const name = typeof s === 'string' ? s : s.name;
      if (name) studioCounts[name] = (studioCounts[name] || 0) + 1;
    });
    
    const franchiseKey = bestCand.title.substring(0, 10).toLowerCase();
    franchiseKeys[franchiseKey] = (franchiseKeys[franchiseKey] || 0) + 1;
  }
  
  return selected;
}

/**
 * Generate match explanations dynamically based on intersecting features
 * @param {Object} anime - Anime doc
 * @param {Object} userVector - User preference profile vector
 * @param {boolean} isRisky - Whether it is a risky recommendation
 * @returns {Array} - Reasons strings list
 */
export function generateExplanation(anime, userVector, isRisky = false) {
  const reasons = [];
  const genres = anime.genres || anime.genre || [];
  
  if (isRisky) {
    reasons.push("Discovery recommendation");
    
    if (genres.length > 0) {
      const gName = typeof genres[0] === 'string' ? genres[0] : genres[0].name;
      reasons.push(`Introduces ${gName} themes you rarely explore`);
    }
    
    const ratingScore = anime.score || anime.mal_rating || 0;
    if (ratingScore >= 8.0) {
      reasons.push(`Highly rated masterpiece (MAL Score: ${ratingScore})`);
    } else {
      reasons.push("Under-the-radar find matching your discovery preferences");
    }
    
    return reasons;
  }
  
  const featureVector = anime.featureVector || computeFeatureVector(anime);
  const overlaps = [];
  
  for (const feature in featureVector) {
    if (userVector[feature] !== undefined) {
      overlaps.push({
        feature,
        strength: userVector[feature] * featureVector[feature]
      });
    }
  }
  
  overlaps.sort((a, b) => b.strength - a.strength);
  
  overlaps.slice(0, 3).forEach(overlap => {
    const [type, value] = overlap.feature.split(':');
    
    if (type === 'genre') {
      reasons.push(`Matches your ${value} preference`);
    } else if (type === 'theme') {
      reasons.push(`Matches your interest in ${value}`);
    } else if (type === 'studio') {
      reasons.push(`Produced by ${value}, a studio you frequently watch`);
    } else if (type === 'source') {
      reasons.push(`Adapted from a ${value} (a format you prefer)`);
    } else if (type === 'tag') {
      reasons.push(`Shares traits related to ${value}`);
    }
  });
  
  if (reasons.length === 0) {
    if (genres.length > 0) {
      const name = typeof genres[0] === 'string' ? genres[0] : genres[0].name;
      reasons.push(`Aligned with your interest in ${name}`);
    }
    if (anime.score > 8.0) {
      reasons.push(`Highly rated in the anime community`);
    }
  }
  
  return reasons.slice(0, 3);
}
