/**
 * JikanGenreService
 * 
 * Fetches anime genre metadata from the Jikan API and provides:
 *  - A cached genre lookup map  (name -> mal_id)
 *  - A paginated fetchAnimeByGenre helper that stops once targetCount valid
 *    anime are collected, respecting Jikan rate limits.
 * 
 * Caches are held in module-level variables (process lifetime).
 * They are refreshed after GENRE_CACHE_TTL_MS.
 */

import axios from 'axios';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

// ── In-memory cache ────────────────────────────────────────────────────────────

/** @type {Record<string, number>}  name (lowercase) -> mal_id */
let genreMap = {};
let genreMapUpdatedAt = 0;
const GENRE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

/** @type {Map<string, { data: any[], updatedAt: number }>} */
const genreAnimeCache = new Map();
const GENRE_ANIME_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h

// ── Rate-limit helpers ─────────────────────────────────────────────────────────
let lastJikanCall = 0;
const MIN_INTERVAL_MS = 400; // Jikan allows ~3 req/s; keep ~2.5 req/s to be safe

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function jikanGet(url, params = {}) {
  // Throttle: ensure MIN_INTERVAL_MS between calls
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastJikanCall);
  if (wait > 0) await sleep(wait);
  lastJikanCall = Date.now();

  const res = await axios.get(url, { params, timeout: 10_000 });
  return res.data;
}

// ── Retry wrapper ──────────────────────────────────────────────────────────────
async function jikanGetWithRetry(url, params = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await jikanGet(url, params);
    } catch (err) {
      const status = err?.response?.status;
      // 429 = rate limited, 5xx = server error — both worth retrying
      if (attempt < retries && (status === 429 || status >= 500)) {
        const backoff = attempt * 1000 + Math.random() * 500;
        console.warn(`[JikanGenreService] Retry ${attempt}/${retries} for ${url} after ${Math.round(backoff)}ms (status ${status})`);
        await sleep(backoff);
      } else {
        throw err;
      }
    }
  }
}

// ── Genre lookup map ───────────────────────────────────────────────────────────

/**
 * Returns a map of lowercase genre name -> Jikan mal_id.
 * Refreshes from Jikan API at most once per GENRE_CACHE_TTL_MS.
 * 
 * @returns {Promise<Record<string, number>>}
 */
export async function getGenreMap() {
  const age = Date.now() - genreMapUpdatedAt;
  if (age < GENRE_CACHE_TTL_MS && Object.keys(genreMap).length > 0) {
    return genreMap;
  }

  try {
    console.log('[JikanGenreService] Fetching genre list from Jikan…');
    const data = await jikanGetWithRetry(`${JIKAN_BASE}/genres/anime`);
    const genres = data?.data || [];

    const map = {};
    genres.forEach(g => {
      if (g.mal_id && g.name) {
        map[g.name.toLowerCase()] = g.mal_id;
        // Also store the canonical cased name
        map[g.name] = g.mal_id;
      }
    });

    genreMap = map;
    genreMapUpdatedAt = Date.now();
    console.log(`[JikanGenreService] Genre map built: ${genres.length} genres cached.`);
  } catch (err) {
    console.error('[JikanGenreService] Failed to fetch genre list:', err?.message || err);
    // Return stale cache if available, otherwise empty
  }

  return genreMap;
}

/**
 * Resolve a genre name to its Jikan mal_id.
 * Tries exact match first, then case-insensitive.
 * 
 * @param {string} genreName
 * @returns {Promise<number|null>}
 */
export async function resolveGenreId(genreName) {
  const map = await getGenreMap();
  return map[genreName] ?? map[genreName.toLowerCase()] ?? null;
}

// ── Paginated anime fetcher ────────────────────────────────────────────────────

/**
 * Fetches anime from Jikan for a given genre, paginating until
 * `targetCount` valid anime have been collected or no more pages exist.
 *
 * Filters out:
 *  - items without a poster image
 *  - items with score < 6.5
 *  - explicitly adult-only content (rating 'Rx')
 *  - duplicates (by mal_id)
 *
 * @param {number}  genreId     - Jikan genre mal_id
 * @param {number}  targetCount - Desired result count (default 24)
 * @param {object}  extraParams - Additional Jikan query params (e.g. sort, order_by)
 * @returns {Promise<Array>}    - Normalized anime objects
 */
export async function fetchAnimeByGenre(genreId, targetCount = 24, extraParams = {}) {
  const results = [];
  const seenIds = new Set();
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && results.length < targetCount) {
    try {
      const data = await jikanGetWithRetry(`${JIKAN_BASE}/anime`, {
        genres: genreId,
        page,
        limit: 25,
        order_by: 'score',
        sort: 'desc',
        sfw: true,        // safe-for-work filter
        min_score: 6.5,
        ...extraParams,
      });

      const items = data?.data || [];
      const pagination = data?.pagination;

      for (const item of items) {
        if (results.length >= targetCount) break;
        if (!item.mal_id || seenIds.has(item.mal_id)) continue;
        if (!item.images?.jpg?.large_image_url && !item.images?.jpg?.image_url) continue;
        if (item.rating === 'Rx') continue; // explicit content

        seenIds.add(item.mal_id);
        results.push(normalizeJikanAnime(item));
      }

      hasNextPage = pagination?.has_next_page ?? false;
      page++;
    } catch (err) {
      console.error(`[JikanGenreService] Error fetching page ${page} for genre ${genreId}:`, err?.message || err);
      break; // Stop pagination on persistent error
    }
  }

  return results;
}

/**
 * Normalizes a raw Jikan anime object into the app's standard shape.
 *
 * @param {object} item - Raw Jikan anime object
 * @returns {object}    - Normalized anime object
 */
function normalizeJikanAnime(item) {
  return {
    animeId:    String(item.mal_id),
    mal_id:     item.mal_id,
    title:      item.title_english || item.title,
    poster:     item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
    score:      item.score || 0,
    popularity: item.popularity || 9999,
    genres:     (item.genres || []).map(g => ({ mal_id: g.mal_id, name: g.name })),
    themes:     (item.themes || []).map(t => ({ mal_id: t.mal_id, name: t.name })),
    year:       item.aired?.prop?.from?.year || null,
    episodes:   item.episodes || null,
    status:     item.status || '',
    matchPercentage: Math.round((item.score || 7) * 10),
    reasons:    [],
    source:     'jikan',
  };
}

// ── Cached genre-anime helper ──────────────────────────────────────────────────

/**
 * Fetches (and caches) anime for a named genre.
 * Uses in-memory cache with GENRE_ANIME_CACHE_TTL_MS TTL.
 *
 * @param {string} genreName   - Human-readable genre name (e.g. 'Comedy')
 * @param {number} targetCount - How many results to collect
 * @returns {Promise<Array>}   - Normalized anime list (may be empty on error)
 */
export async function getCachedGenreAnime(genreName, targetCount = 24) {
  const cacheKey = `${genreName.toLowerCase()}:${targetCount}`;
  const cached = genreAnimeCache.get(cacheKey);

  if (cached && Date.now() - cached.updatedAt < GENRE_ANIME_CACHE_TTL_MS) {
    return cached.data;
  }

  let data = [];
  try {
    const genreId = await resolveGenreId(genreName);
    if (genreId == null) {
      console.warn(`[JikanGenreService] Could not resolve genre ID for "${genreName}"`);
      return [];
    }
    data = await fetchAnimeByGenre(genreId, targetCount);
  } catch (err) {
    console.error(`[JikanGenreService] getCachedGenreAnime failed for "${genreName}":`, err?.message || err);
    // Fall back to stale cache if available
    if (cached?.data?.length) return cached.data;
  }

  genreAnimeCache.set(cacheKey, { data, updatedAt: Date.now() });
  return data;
}

/**
 * Prefetch multiple genres in sequence (respects rate limiting).
 * Call this during server startup to warm the cache.
 *
 * @param {string[]} genreNames
 * @param {number}   targetCount
 */
export async function prefetchGenres(genreNames, targetCount = 24) {
  // First warm the genre map
  await getGenreMap();

  for (const name of genreNames) {
    try {
      console.log(`[JikanGenreService] Prefetching genre: ${name}`);
      await getCachedGenreAnime(name, targetCount);
    } catch (err) {
      console.error(`[JikanGenreService] Prefetch failed for "${name}":`, err?.message || err);
    }
  }
  console.log('[JikanGenreService] Genre prefetch complete.');
}
