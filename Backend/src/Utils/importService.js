import { AnimeMetadata } from '../Model/AnimeMetadata.model.js';
import { AnimeDoc } from '../Model/Anime.model.js';
import { computeFeatureVector } from './recommendationHelper.js';
import { jikanGetWithRetry } from './jikanGenreService.js';

/**
 * Perform a full detailed import of an anime.
 * Resolves details/full, characters, and Jikan recommendations,
 * updates AnimeMetadata and lightweight AnimeDoc (recommendations).
 * Runs the data enrichment pipeline (featureVector, tags).
 */
export const importAnime = async (malId) => {
  try {
    const malIdNum = Number(malId);
    console.log(`[Import] Commencing full detailed import for mal_id ${malIdNum}...`);

    // 1. Fetch full details
    const fullRes = await jikanGetWithRetry(`https://api.jikan.moe/v4/anime/${malIdNum}/full`);
    const animeData = fullRes?.data;
    if (!animeData) {
      throw new Error(`Anime details not found in Jikan API response for ID ${malIdNum}`);
    }

    // Delay to respect rate limits between Jikan requests
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Fetch characters
    let characters = [];
    try {
      const charsRes = await jikanGetWithRetry(`https://api.jikan.moe/v4/anime/${malIdNum}/characters`);
      characters = charsRes?.data || [];
    } catch (err) {
      console.warn(`[Import] Failed to fetch characters for ID ${malIdNum}:`, err.message);
    }

    // Delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Fetch Jikan recommendations
    let recommendations = [];
    try {
      const recsRes = await jikanGetWithRetry(`https://api.jikan.moe/v4/anime/${malIdNum}/recommendations`);
      recommendations = recsRes?.data || [];
    } catch (err) {
      console.warn(`[Import] Failed to fetch recommendations for ID ${malIdNum}:`, err.message);
    }

    // Map fields
    const genres = (animeData.genres || []).map(g => ({ mal_id: g.mal_id, name: g.name }));
    const themes = (animeData.themes || []).map(t => ({ mal_id: t.mal_id, name: t.name }));
    const demographics = (animeData.demographics || []).map(d => ({ mal_id: d.mal_id, name: d.name }));
    const studios = (animeData.studios || []).map(s => ({ mal_id: s.mal_id, name: s.name }));

    const metadataFields = {
      mal_id: animeData.mal_id,
      title: animeData.title_english || animeData.title,
      title_english: animeData.title_english || '',
      title_japanese: animeData.title_japanese || '',
      synopsis: animeData.synopsis || '',
      background: animeData.background || '',
      images: animeData.images || {},
      genres,
      themes,
      demographics,
      studios,
      trailer: animeData.trailer || {},
      relations: animeData.relations || [],
      characters: characters,
      streaming: animeData.streaming || [],
      external: animeData.external || [],
      theme: animeData.theme || {},
      recommendations: recommendations,
      score: animeData.score || 0,
      rank: animeData.rank || null,
      popularity: animeData.popularity || null,
      episodes: animeData.episodes || null,
      duration: animeData.duration || '',
      source: animeData.source || '',
      season: animeData.season || '',
      year: animeData.year || animeData.aired?.prop?.from?.year || null,
      cachedAt: new Date(),
      updatedAt: new Date()
    };

    // Upsert to AnimeMetadata
    const metadataDoc = await AnimeMetadata.findOneAndUpdate(
      { mal_id: malIdNum },
      { $set: metadataFields },
      { upsert: true, new: true }
    );

    // Save to lightweight AnimeDoc collection for recommendations
    let tags = [];
    const gTags = genres.map(g => (g.name || g || '').toLowerCase());
    const tTags = themes.map(t => (t.name || t || '').toLowerCase());
    const dTags = demographics.map(d => (d.name || d || '').toLowerCase());
    tags = [...new Set([...gTags, ...tTags, ...dTags])].filter(Boolean);

    const lightweightDoc = {
      mal_id: animeData.mal_id,
      title: animeData.title_english || animeData.title,
      title_english: animeData.title_english || '',
      image: animeData.images?.jpg?.large_image_url || animeData.images?.jpg?.image_url || '',
      synopsis: animeData.synopsis || '',
      genre: genres,
      year: animeData.year || animeData.aired?.prop?.from?.year || null,
      mal_rating: animeData.score || 0,
      genres: genres,
      themes: themes,
      demographics: demographics,
      studios: studios,
      source: animeData.source || '',
      score: animeData.score || 0,
      popularity: animeData.popularity || 0,
      tags: tags
    };

    // Calculate feature vector using recommendation helper logic
    const featureVector = computeFeatureVector(lightweightDoc);
    lightweightDoc.featureVector = featureVector;

    await AnimeDoc.findOneAndUpdate(
      { mal_id: malIdNum },
      { $set: lightweightDoc },
      { upsert: true }
    );

    console.log(`[Import] Successfully fully imported: "${lightweightDoc.title}" (ID ${malIdNum})`);
    return metadataDoc;
  } catch (error) {
    console.error(`[Import] Error in full import for mal_id ${malId}:`, error.message);
    throw error;
  }
};

/**
 * Perform a fast lightweight import.
 * Avoids extra Jikan fetches (relations, characters, recommendations).
 * Used during searches and genre rows padding to grow the database instantly.
 */
export const lightweightImport = async (item) => {
  try {
    const malId = Number(item.mal_id);
    if (!malId) return;

    // Check if both docs already exist to avoid redundant DB writes
    const existsMetadata = await AnimeMetadata.findOne({ mal_id: malId });
    const existsDoc = await AnimeDoc.findOne({ mal_id: malId });

    if (existsMetadata && existsDoc) {
      return;
    }

    const genres = (item.genres || []).map(g => ({ mal_id: g.mal_id, name: g.name }));
    const themes = (item.themes || []).map(t => ({ mal_id: t.mal_id, name: t.name }));
    const demographics = (item.demographics || []).map(d => ({ mal_id: d.mal_id, name: d.name }));
    const studios = (item.studios || []).map(s => ({ mal_id: s.mal_id, name: s.name }));

    if (!existsMetadata) {
      const metadataFields = {
        mal_id: malId,
        title: item.title_english || item.title,
        title_english: item.title_english || '',
        title_japanese: item.title_japanese || '',
        synopsis: item.synopsis || '',
        background: item.background || '',
        images: item.images || {},
        genres,
        themes,
        demographics,
        studios,
        trailer: item.trailer || {},
        relations: [],
        characters: [],
        streaming: item.streaming || [],
        external: item.external || [],
        theme: item.theme || {},
        recommendations: [],
        score: item.score || 0,
        rank: item.rank || null,
        popularity: item.popularity || null,
        episodes: item.episodes || null,
        duration: item.duration || '',
        source: item.source || '',
        season: item.season || '',
        year: item.year || item.aired?.prop?.from?.year || null,
        cachedAt: new Date(),
        updatedAt: new Date()
      };

      await AnimeMetadata.create(metadataFields);
    }

    if (!existsDoc) {
      let tags = [];
      const gTags = genres.map(g => (g.name || g || '').toLowerCase());
      const tTags = themes.map(t => (t.name || t || '').toLowerCase());
      const dTags = demographics.map(d => (d.name || d || '').toLowerCase());
      tags = [...new Set([...gTags, ...tTags, ...dTags])].filter(Boolean);

      const lightweightDoc = {
        mal_id: malId,
        title: item.title_english || item.title,
        title_english: item.title_english || '',
        image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
        synopsis: item.synopsis || '',
        genre: genres,
        year: item.year || item.aired?.prop?.from?.year || null,
        mal_rating: item.score || 0,
        genres: genres,
        themes: themes,
        demographics: demographics,
        studios: studios,
        source: item.source || '',
        score: item.score || 0,
        popularity: item.popularity || 0,
        tags: tags
      };

      const featureVector = computeFeatureVector(lightweightDoc);
      lightweightDoc.featureVector = featureVector;

      await AnimeDoc.create(lightweightDoc);
      console.log(`[Import] Successfully lightweight imported: "${lightweightDoc.title}" (ID ${malId})`);
    }
  } catch (err) {
    console.error(`[Import] Error in lightweightImport for ID ${item?.mal_id}:`, err.message);
  }
};

/**
 * Reusable paginated fetcher that retrieves data from Jikan.
 * Stops once targetCount valid anime are retrieved or has_next_page becomes false.
 */
export async function fetchJikanPages(endpoint, extraParams = {}, targetCount = 50) {
  const results = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && results.length < targetCount) {
    try {
      const data = await jikanGetWithRetry(endpoint, {
        page,
        limit: 25,
        ...extraParams
      });

      const items = data?.data || [];
      const pagination = data?.pagination;

      for (const item of items) {
        if (results.length >= targetCount) break;
        results.push(item);
      }

      hasNextPage = pagination?.has_next_page ?? false;
      page++;
      
      // Delay to respect Jikan rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[Sync] Page ${page} fetch failed:`, err.message);
      break;
    }
  }

  return results;
}
