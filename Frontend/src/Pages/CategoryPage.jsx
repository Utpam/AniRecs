import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import AnimeCard from '../Components/AnimeCard.jsx';
import { SearchSkeleton } from '../Components/Loader';
import { login, showToast, toggleListOptimistic } from '../../store/AuthSlice.js';

const BASE = import.meta.env.VITE_BASE_URL;

const GENRE_META = {
  action:        { icon: '⚔️', accent: '#f97316', gradient: 'from-orange-900/60 via-red-900/30' },
  adventure:     { icon: '🗺️', accent: '#10b981', gradient: 'from-emerald-900/60 via-teal-900/30' },
  comedy:        { icon: '😂', accent: '#eab308', gradient: 'from-yellow-900/60 via-amber-900/30' },
  drama:         { icon: '🎭', accent: '#a855f7', gradient: 'from-purple-900/60 via-violet-900/30' },
  fantasy:       { icon: '🧙', accent: '#6366f1', gradient: 'from-indigo-900/60 via-blue-900/30' },
  horror:        { icon: '👻', accent: '#dc2626', gradient: 'from-red-950/70 via-red-900/30' },
  mecha:         { icon: '🤖', accent: '#06b6d4', gradient: 'from-cyan-900/60 via-sky-900/30' },
  mystery:       { icon: '🔍', accent: '#94a3b8', gradient: 'from-slate-800/60 via-zinc-900/30' },
  psychological: { icon: '🧠', accent: '#d946ef', gradient: 'from-fuchsia-900/60 via-purple-950/30' },
  romance:       { icon: '💕', accent: '#ec4899', gradient: 'from-pink-900/60 via-rose-900/30' },
  'sci-fi':      { icon: '🚀', accent: '#3b82f6', gradient: 'from-blue-900/60 via-sky-900/30' },
  'slice of life':{ icon: '🌸', accent: '#22c55e', gradient: 'from-green-900/60 via-lime-900/30' },
  sports:        { icon: '⚽', accent: '#84cc16', gradient: 'from-lime-900/60 via-green-900/30' },
  supernatural:  { icon: '👁️', accent: '#7c3aed', gradient: 'from-violet-900/60 via-purple-950/30' },
  thriller:      { icon: '🔪', accent: '#78716c', gradient: 'from-stone-800/60 via-zinc-900/30' },
  isekai:        { icon: '🌀', accent: '#f59e0b', gradient: 'from-amber-900/60 via-orange-900/30' },
  shounen:       { icon: '💪', accent: '#ef4444', gradient: 'from-red-900/60 via-orange-900/30' },
  shoujo:        { icon: '🌹', accent: '#f43f5e', gradient: 'from-rose-900/60 via-pink-900/30' },
};

function CategoryPage() {
  const { genre }  = useParams();
  const dispatch   = useDispatch();
  const userData   = useSelector(state => state.auth.userData);
  const pendingRef = useRef({});

  const [content,   setContent]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [watchlist, setWatchlist] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [sort,      setSort]      = useState('score');

  const capitalize = (str = '') => str.charAt(0).toUpperCase() + str.slice(1);
  const capGenre   = capitalize(genre);
  const meta       = GENRE_META[genre?.toLowerCase()] || { icon: '🎬', accent: '#E95D81', gradient: 'from-primary/30 via-primary-dark/20' };

  // Sync lists from Redux
  useEffect(() => {
    if (userData?.watchlist) setWatchlist(userData.watchlist.map(i => String(i.animeId)));
    if (userData?.favorites) setFavorites(userData.favorites.map(String));
  }, [userData]);

  // Fetch
  useEffect(() => {
    if (!genre) return;
    setLoading(true);
    axios
      .post(`${BASE}/api/anime/get-by-category`, { category: capGenre })
      .then(res => setContent(res.data || []))
      .catch(() => setContent([]))
      .finally(() => setLoading(false));
  }, [genre]);

  // Sorted content
  const sorted = [...content].sort((a, b) => {
    if (sort === 'score')      return (b.mal_rating || b.score || 0) - (a.mal_rating || a.score || 0);
    if (sort === 'popularity') return (a.popularity || 999999) - (b.popularity || 999999);
    if (sort === 'title')      return (a.title || '').localeCompare(b.title || '');
    return 0;
  });

  // ── Watchlist toggle ──
  const handleWatchlistToggle = useCallback(async (animeId) => {
    const key = `wl-${animeId}`;
    if (pendingRef.current[key]) return;
    pendingRef.current[key] = true;

    const id = String(animeId);
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

  // ── Favorite toggle ──
  const handleFavoriteToggle = useCallback(async (animeId) => {
    const key = `fav-${animeId}`;
    if (pendingRef.current[key]) return;
    pendingRef.current[key] = true;

    const id = String(animeId);
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

  return (
    <div className="min-h-screen bg-neutral text-tertiary font-hanken-reg">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} to-neutral pointer-events-none`}
        />
        {/* Decorative glow orbs */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ backgroundColor: meta.accent }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: meta.accent }}
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-12 pb-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-500 font-hanken-light mb-6">
            <NavLink to="/" className="hover:text-primary transition-colors">Home</NavLink>
            <span>/</span>
            <NavLink to="/genres" className="hover:text-primary transition-colors">Genres</NavLink>
            <span>/</span>
            <span className="text-gray-300">{capGenre}</span>
          </div>

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Icon badge */}
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-3xl md:text-4xl shrink-0 shadow-2xl"
                style={{
                  backgroundColor: `${meta.accent}18`,
                  border: `1.5px solid ${meta.accent}35`,
                  boxShadow: `0 0 32px ${meta.accent}20`,
                }}
              >
                {meta.icon}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-1 h-7 rounded-full"
                    style={{ backgroundColor: meta.accent }}
                  />
                  <span
                    className="text-[11px] font-hanken-bold tracking-[0.2em] uppercase"
                    style={{ color: meta.accent }}
                  >
                    Genre Collection
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-hanken-black text-white capitalize leading-tight">
                  {genre}
                </h1>
                {!loading && (
                  <p className="text-sm text-gray-400 font-hanken-light mt-1">
                    {content.length} title{content.length !== 1 ? 's' : ''} in this collection
                  </p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 shrink-0">
              <label className="text-xs text-gray-500 font-hanken-light whitespace-nowrap">Sort by</label>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-primary/60 transition cursor-pointer"
              >
                <option value="score">Score</option>
                <option value="popularity">Popularity</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom fade separator */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-neutral pointer-events-none" />
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        {loading ? (
          <SearchSkeleton />
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl mb-2">
              {meta.icon}
            </div>
            <h3 className="text-lg font-hanken-bold text-white">No titles found</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              We couldn't find any anime in the <span className="text-primary">{capGenre}</span> genre. Check back soon.
            </p>
            <NavLink
              to="/genres"
              className="mt-2 px-5 py-2.5 rounded-xl bg-primary/20 border border-primary/40 text-primary text-sm font-hanken-med hover:bg-primary/30 transition cursor-pointer"
            >
              ← Back to Genres
            </NavLink>
          </div>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sorted.map((item, idx) => (
                <AnimeCard
                  key={`${item.animeId || item.mal_id}-${idx}`}
                  item={{
                    animeId:    item.animeId || item.mal_id,
                    title:      item.title,
                    poster:     item.image || item.poster,
                    score:      item.mal_rating || item.score,
                    popularity: item.popularity,
                  }}
                  inWatchlist={watchlist.includes(String(item.animeId || item.mal_id))}
                  inFavorites={favorites.includes(String(item.animeId || item.mal_id))}
                  onWatchlistToggle={handleWatchlistToggle}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>

            {/* Back link */}
            <div className="mt-12 flex items-center justify-center">
              <NavLink
                to="/genres"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 hover:text-white hover:border-white/20 transition text-sm font-hanken-med"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to All Genres
              </NavLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CategoryPage;