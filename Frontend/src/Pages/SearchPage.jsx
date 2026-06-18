import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { SearchSkeleton } from '../Components/Loader';
import { login, showToast, toggleListOptimistic } from '../../store/AuthSlice.js';
import AnimeCard from '../Components/AnimeCard.jsx';

const BASE = import.meta.env.VITE_BASE_URL;

const GENRES = [
  'All', 'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mecha', 'Mystery', 'Psychological', 'Romance',
  'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];
const SORT_OPTIONS = [
  { label: 'Score',       value: 'score' },
  { label: 'Popularity',  value: 'popularity' },
  { label: 'Newest',      value: 'year' },
  { label: 'Community',   value: 'rating' },
];

// ─── SearchPage ───────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userData  = useSelector(state => state.auth.userData);
  const dispatch  = useDispatch();
  const pendingRef = useRef({});

  // Derive filters from URL params
  const queryParam = searchParams.get('q') || '';
  const genreParam = searchParams.get('genre') || 'All';
  const sortParam  = searchParams.get('sort')  || 'score';
  const pageParam  = parseInt(searchParams.get('page') || '1', 10);

  const [inputValue, setInputValue] = useState(queryParam);
  const [results,   setResults]     = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,   setLoading]     = useState(false);
  const [watchlist, setWatchlist]   = useState([]);
  const [favorites, setFavorites]   = useState([]);

  // Sync lists from Redux
  useEffect(() => {
    if (userData?.watchlist) setWatchlist(userData.watchlist.map(i => String(i.animeId)));
    if (userData?.favorites) setFavorites(userData.favorites.map(String));
  }, [userData]);

  // Keep input in sync when URL changes (e.g. browser back)
  useEffect(() => { setInputValue(queryParam); }, [queryParam]);

  // ── Fetch results ──────────────────────────────────────────────────────
  const fetchResults = useCallback(async (q, genre, sort, page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, sort, page, limit: 24 });
      if (genre && genre !== 'All') params.set('genre', genre);
      const res = await axios.get(`${BASE}/api/search?${params}`);
      setResults(res.data.results || []);
      setPagination(res.data.pagination || null);
    } catch (err) {
      console.error('Search fetch error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(queryParam, genreParam, sortParam, pageParam);
  }, [queryParam, genreParam, sortParam, pageParam, fetchResults]);

  // ── URL helpers ────────────────────────────────────────────────────────
  const pushParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    pushParam('q', inputValue.trim());
  };

  // ── List toggles with optimistic updates ───────────────────────────────
  const handleWatchlistToggle = useCallback(async (animeId) => {
    const key = `wl-${animeId}`;
    if (pendingRef.current[key]) return;
    pendingRef.current[key] = true;

    const id    = String(animeId);
    const wasIn = watchlist.includes(id);
    setWatchlist(prev => wasIn ? prev.filter(x => x !== id) : [...prev, id]);
    dispatch(toggleListOptimistic({ actionType: 'watchlist', animeId }));
    dispatch(showToast({ message: wasIn ? 'Removed from watchlist' : 'Added to watchlist', type: wasIn ? 'info' : 'success' }));

    try {
      const res = await axios.post(`${BASE}/api/recommendations/action`, { animeId, action: 'watchlist' }, { withCredentials: true });
      dispatch(login({ userData: res.data }));
    } catch {
      setWatchlist(prev => wasIn ? [...prev, id] : prev.filter(x => x !== id));
      dispatch(toggleListOptimistic({ actionType: 'watchlist', animeId }));
      dispatch(showToast({ message: 'Failed to update watchlist', type: 'error' }));
    } finally {
      delete pendingRef.current[key];
    }
  }, [watchlist, dispatch]);

  const handleFavoriteToggle = useCallback(async (animeId) => {
    const key = `fav-${animeId}`;
    if (pendingRef.current[key]) return;
    pendingRef.current[key] = true;

    const id    = String(animeId);
    const wasFav = favorites.includes(id);
    setFavorites(prev => wasFav ? prev.filter(x => x !== id) : [...prev, id]);
    dispatch(toggleListOptimistic({ actionType: 'favorite', animeId }));
    dispatch(showToast({ message: wasFav ? 'Removed from favorites' : 'Added to favorites', type: wasFav ? 'info' : 'success' }));

    try {
      const res = await axios.post(`${BASE}/api/recommendations/action`, { animeId, action: 'favorite' }, { withCredentials: true });
      dispatch(login({ userData: res.data }));
    } catch {
      setFavorites(prev => wasFav ? [...prev, id] : prev.filter(x => x !== id));
      dispatch(toggleListOptimistic({ actionType: 'favorite', animeId }));
      dispatch(showToast({ message: 'Failed to update favorites', type: 'error' }));
    } finally {
      delete pendingRef.current[key];
    }
  }, [favorites, dispatch]);

  // ── Render ─────────────────────────────────────────────────────────────
  const hasQuery = queryParam.length > 0 || genreParam !== 'All';

  return (
    <div className="w-full min-h-screen text-tertiary bg-neutral">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-hanken-bold text-white mb-2 tracking-tight">
            Search <span className="text-primary">Anime</span>
          </h1>
          <p className="text-sm text-gray-400 font-hanken-light">
            Find anything in our library of thousands of titles.
          </p>
        </div>

        {/* ── Search bar ── */}
        <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-8">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Search by title or synopsis…"
              className="w-full bg-white/5 border border-white/10 focus:border-primary/60 rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-white/30 outline-none transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            className="px-7 py-3.5 rounded-2xl bg-primary text-white font-hanken-bold text-sm hover:bg-primary/80 transition cursor-pointer shrink-0"
          >
            Search
          </button>
          {(queryParam || genreParam !== 'All') && (
            <button
              type="button"
              onClick={() => { setInputValue(''); setSearchParams({}); }}
              className="px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white text-sm transition cursor-pointer shrink-0"
              title="Clear filters"
            >
              ✕ Clear
            </button>
          )}
        </form>

        {/* ── Filters row ── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Genre pills */}
          <div className="flex-1 flex flex-wrap gap-2">
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => pushParam('genre', g === 'All' ? '' : g)}
                className={`px-3 py-1.5 rounded-full text-xs font-hanken-med transition-all duration-200 cursor-pointer border ${
                  genreParam === g || (g === 'All' && genreParam === 'All')
                    ? 'bg-primary border-primary text-white shadow-md'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-primary/50 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500 font-hanken-light whitespace-nowrap">Sort by</span>
            <select
              value={sortParam}
              onChange={e => pushParam('sort', e.target.value)}
              className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-primary/60 transition cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Results count ── */}
        {!loading && pagination && (
          <p className="text-xs text-gray-500 mb-5 font-hanken-light">
            {pagination.total.toLocaleString()} result{pagination.total !== 1 ? 's' : ''}
            {queryParam ? ` for "${queryParam}"` : ''}
            {genreParam !== 'All' ? ` · ${genreParam}` : ''}
            {` · Page ${pagination.page} of ${pagination.totalPages}`}
          </p>
        )}

        {/* ── Content ── */}
        {loading ? (
          <SearchSkeleton />
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <h3 className="text-lg font-hanken-bold text-white">No results found</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              {hasQuery
                ? `We couldn't find anything matching your search. Try different keywords or a broader genre.`
                : 'Type a title above to start searching.'}
            </p>
            {hasQuery && (
              <button
                onClick={() => { setInputValue(''); setSearchParams({}); }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-primary/20 border border-primary/40 text-primary text-sm font-hanken-med hover:bg-primary/30 transition cursor-pointer"
              >
                Clear & Browse All
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map((item, idx) => (
                <AnimeCard
                  key={`${item.animeId || item.mal_id}-${idx}`}
                  item={item}
                  inWatchlist={watchlist.includes(String(item.animeId || item.mal_id))}
                  inFavorites={favorites.includes(String(item.animeId || item.mal_id))}
                  onWatchlistToggle={handleWatchlistToggle}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>

            {/* ── Pagination ── */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => pushParam('page', String(pagination.page - 1))}
                  className="px-4 py-2 rounded-xl text-sm font-hanken-med bg-white/5 border border-white/10 text-gray-300 hover:border-primary/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  ← Prev
                </button>

                {/* Page numbers (window of 5) */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const half  = Math.floor(5 / 2);
                  let start   = Math.max(1, pagination.page - half);
                  const end   = Math.min(pagination.totalPages, start + 4);
                  start       = Math.max(1, end - 4);
                  return start + i;
                }).filter(n => n >= 1 && n <= pagination.totalPages).map(n => (
                  <button
                    key={n}
                    onClick={() => pushParam('page', String(n))}
                    className={`w-10 h-10 rounded-xl text-sm font-hanken-med border transition cursor-pointer ${
                      n === pagination.page
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-primary/50 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}

                <button
                  disabled={!pagination.hasMore}
                  onClick={() => pushParam('page', String(pagination.page + 1))}
                  className="px-4 py-2 rounded-xl text-sm font-hanken-med bg-white/5 border border-white/10 text-gray-300 hover:border-primary/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
