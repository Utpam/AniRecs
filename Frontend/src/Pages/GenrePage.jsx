import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const GENRES = [
  {
    name: 'Action',
    slug: 'action',
    description: 'High-octane battles, power systems & epic showdowns',
    gradient: 'from-orange-600/40 via-red-700/30 to-transparent',
    border: 'border-orange-500/30 hover:border-orange-400/60',
    glow: 'hover:shadow-orange-500/20',
    icon: '⚔️',
    accent: '#f97316',
  },
  {
    name: 'Adventure',
    slug: 'adventure',
    description: 'Vast worlds, epic journeys & legendary quests',
    gradient: 'from-emerald-600/40 via-teal-700/30 to-transparent',
    border: 'border-emerald-500/30 hover:border-emerald-400/60',
    glow: 'hover:shadow-emerald-500/20',
    icon: '🗺️',
    accent: '#10b981',
  },
  {
    name: 'Comedy',
    slug: 'comedy',
    description: 'Hilarious gags, lovable characters & endless laughs',
    gradient: 'from-yellow-500/40 via-amber-600/30 to-transparent',
    border: 'border-yellow-500/30 hover:border-yellow-400/60',
    glow: 'hover:shadow-yellow-500/20',
    icon: '😂',
    accent: '#eab308',
  },
  {
    name: 'Drama',
    slug: 'drama',
    description: 'Emotional depth, complex characters & compelling arcs',
    gradient: 'from-purple-600/40 via-violet-700/30 to-transparent',
    border: 'border-purple-500/30 hover:border-purple-400/60',
    glow: 'hover:shadow-purple-500/20',
    icon: '🎭',
    accent: '#a855f7',
  },
  {
    name: 'Fantasy',
    slug: 'fantasy',
    description: 'Magic, mythical creatures & otherworldly realms',
    gradient: 'from-indigo-600/40 via-blue-700/30 to-transparent',
    border: 'border-indigo-500/30 hover:border-indigo-400/60',
    glow: 'hover:shadow-indigo-500/20',
    icon: '🧙',
    accent: '#6366f1',
  },
  {
    name: 'Horror',
    slug: 'horror',
    description: 'Chilling atmosphere, dread & supernatural terror',
    gradient: 'from-red-900/50 via-red-800/30 to-transparent',
    border: 'border-red-700/40 hover:border-red-500/60',
    glow: 'hover:shadow-red-700/20',
    icon: '👻',
    accent: '#dc2626',
  },
  {
    name: 'Mecha',
    slug: 'mecha',
    description: 'Giant robots, futuristic warfare & pilot legends',
    gradient: 'from-cyan-600/40 via-sky-700/30 to-transparent',
    border: 'border-cyan-500/30 hover:border-cyan-400/60',
    glow: 'hover:shadow-cyan-500/20',
    icon: '🤖',
    accent: '#06b6d4',
  },
  {
    name: 'Mystery',
    slug: 'mystery',
    description: 'Hidden clues, intrigue & mind-bending revelations',
    gradient: 'from-slate-600/40 via-zinc-700/30 to-transparent',
    border: 'border-slate-500/30 hover:border-slate-400/60',
    glow: 'hover:shadow-slate-500/20',
    icon: '🔍',
    accent: '#94a3b8',
  },
  {
    name: 'Psychological',
    slug: 'psychological',
    description: 'Fractured minds, moral ambiguity & dark truths',
    gradient: 'from-fuchsia-700/40 via-purple-800/30 to-transparent',
    border: 'border-fuchsia-600/30 hover:border-fuchsia-400/60',
    glow: 'hover:shadow-fuchsia-600/20',
    icon: '🧠',
    accent: '#d946ef',
  },
  {
    name: 'Romance',
    slug: 'romance',
    description: 'Love stories, heartache & unforgettable connections',
    gradient: 'from-pink-600/40 via-rose-700/30 to-transparent',
    border: 'border-pink-500/30 hover:border-pink-400/60',
    glow: 'hover:shadow-pink-500/20',
    icon: '💕',
    accent: '#ec4899',
  },
  {
    name: 'Sci-Fi',
    slug: 'sci-fi',
    description: 'Space exploration, technology & future civilizations',
    gradient: 'from-blue-600/40 via-sky-700/30 to-transparent',
    border: 'border-blue-500/30 hover:border-blue-400/60',
    glow: 'hover:shadow-blue-500/20',
    icon: '🚀',
    accent: '#3b82f6',
  },
  {
    name: 'Slice of Life',
    slug: 'slice of life',
    description: 'Everyday moments, quiet beauty & relatable stories',
    gradient: 'from-green-600/40 via-lime-700/30 to-transparent',
    border: 'border-green-500/30 hover:border-green-400/60',
    glow: 'hover:shadow-green-500/20',
    icon: '🌸',
    accent: '#22c55e',
  },
  {
    name: 'Sports',
    slug: 'sports',
    description: 'Teamwork, rivalries & the thrill of competition',
    gradient: 'from-lime-600/40 via-green-700/30 to-transparent',
    border: 'border-lime-500/30 hover:border-lime-400/60',
    glow: 'hover:shadow-lime-500/20',
    icon: '⚽',
    accent: '#84cc16',
  },
  {
    name: 'Supernatural',
    slug: 'supernatural',
    description: 'Spirits, demons & powers beyond human understanding',
    gradient: 'from-violet-700/40 via-purple-800/30 to-transparent',
    border: 'border-violet-600/30 hover:border-violet-400/60',
    glow: 'hover:shadow-violet-600/20',
    icon: '👁️',
    accent: '#7c3aed',
  },
  {
    name: 'Thriller',
    slug: 'thriller',
    description: 'Suspense, high-stakes danger & edge-of-seat tension',
    gradient: 'from-stone-600/40 via-zinc-700/30 to-transparent',
    border: 'border-stone-500/30 hover:border-stone-400/60',
    glow: 'hover:shadow-stone-500/20',
    icon: '🔪',
    accent: '#78716c',
  },
  {
    name: 'Isekai',
    slug: 'isekai',
    description: 'Transported to another world — reborn with new power',
    gradient: 'from-amber-600/40 via-orange-700/30 to-transparent',
    border: 'border-amber-500/30 hover:border-amber-400/60',
    glow: 'hover:shadow-amber-500/20',
    icon: '🌀',
    accent: '#f59e0b',
  },
  {
    name: 'Shounen',
    slug: 'shounen',
    description: 'Friendship, growth & never-give-up spirit',
    gradient: 'from-red-600/40 via-orange-700/30 to-transparent',
    border: 'border-red-500/30 hover:border-red-400/60',
    glow: 'hover:shadow-red-500/20',
    icon: '💪',
    accent: '#ef4444',
  },
  {
    name: 'Shoujo',
    slug: 'shoujo',
    description: 'Heartfelt emotions, self-discovery & blooming romance',
    gradient: 'from-rose-600/40 via-pink-700/30 to-transparent',
    border: 'border-rose-500/30 hover:border-rose-400/60',
    glow: 'hover:shadow-rose-500/20',
    icon: '🌹',
    accent: '#f43f5e',
  },
];

function GenrePage() {
  const [search, setSearch] = useState('');
  const [hovered, setHovered] = useState(null);

  const filtered = GENRES.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral text-tertiary font-hanken-reg">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 rounded-full bg-rose-500/8 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-500 font-hanken-light mb-6">
            <NavLink to="/" className="hover:text-primary transition-colors">Home</NavLink>
            <span>/</span>
            <span className="text-gray-300">Genres</span>
          </div>

          {/* Title block */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-10 rounded-full bg-primary" />
                <span className="text-xs font-hanken-bold text-primary tracking-[0.2em] uppercase">Browse by Genre</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-hanken-black text-white leading-tight">
                Explore Every
                <span
                  className="block"
                  style={{
                    background: 'linear-gradient(90deg, #E95D81, #a855f7, #6366f1)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Genre & Theme
                </span>
              </h1>
              <p className="text-sm text-gray-400 font-hanken-light mt-3 max-w-lg">
                Dive into {GENRES.length} carefully curated genre categories, each packed with top-rated anime tailored to your mood.
              </p>
            </div>

            {/* Search */}
            <div className="relative md:w-72 shrink-0">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter genres…"
                className="w-full bg-white/5 border border-white/10 focus:border-primary/60 rounded-2xl pl-11 pr-5 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-6 pb-6 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-gray-400 font-hanken-light">
                <span className="text-white font-hanken-bold">{filtered.length}</span> genres
              </span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-xs text-gray-500 font-hanken-light">Click any genre to browse its top titles</span>
          </div>
        </div>
      </div>

      {/* ── Genre Grid ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl mb-2">
              🔍
            </div>
            <h3 className="text-lg font-hanken-bold text-white">No genres found</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              No genre matches "<span className="text-primary">{search}</span>". Try a different keyword.
            </p>
            <button
              onClick={() => setSearch('')}
              className="mt-2 px-5 py-2.5 rounded-xl bg-primary/20 border border-primary/40 text-primary text-sm font-hanken-med hover:bg-primary/30 transition cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((genre, idx) => (
              <NavLink
                key={genre.slug}
                to={`/category/${encodeURIComponent(genre.slug)}`}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                className={`
                  group relative overflow-hidden rounded-2xl border bg-[#1a0f14]
                  transition-all duration-300 ease-out cursor-pointer
                  hover:-translate-y-1 hover:shadow-xl
                  ${genre.border} ${genre.glow}
                  ${hovered === idx ? 'shadow-xl' : 'shadow-md'}
                `}
                style={{
                  animationDelay: `${idx * 30}ms`,
                }}
              >
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${genre.gradient} opacity-60 group-hover:opacity-90 transition-opacity duration-300`}
                />

                {/* Decorative circle */}
                <div
                  className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500"
                  style={{ backgroundColor: genre.accent }}
                />

                {/* Content */}
                <div className="relative z-10 p-5 flex flex-col gap-3">
                  {/* Icon + Arrow row */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: `${genre.accent}20`, border: `1px solid ${genre.accent}30` }}
                    >
                      {genre.icon}
                    </div>
                    <svg
                      className="w-4 h-4 mt-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 -translate-x-1 transition-all duration-300 text-white/60"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Text */}
                  <div>
                    <h2 className="text-base font-hanken-bold text-white group-hover:text-white transition-colors">
                      {genre.name}
                    </h2>
                    <p className="text-xs text-gray-400 font-hanken-light mt-1 leading-relaxed line-clamp-2 group-hover:text-gray-300 transition-colors">
                      {genre.description}
                    </p>
                  </div>

                  {/* Browse pill */}
                  <div className="mt-1">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-hanken-bold transition-all duration-300"
                      style={{
                        backgroundColor: `${genre.accent}18`,
                        border: `1px solid ${genre.accent}35`,
                        color: genre.accent,
                      }}
                    >
                      Browse titles
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </NavLink>
            ))}
          </div>
        )}

        {/* ── Bottom CTA ── */}
        <div className="mt-16 rounded-2xl border border-white/8 bg-white/[0.03] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-hanken-bold text-white mb-1">Can't decide? Try our search.</h3>
            <p className="text-sm text-gray-400 font-hanken-light">
              Filter by multiple genres, sort by score or popularity, and find your next obsession.
            </p>
          </div>
          <NavLink
            to="/search"
            className="px-6 py-3 rounded-xl bg-primary text-white font-hanken-bold text-sm hover:bg-primary/80 transition shrink-0 cursor-pointer"
          >
            Open Search →
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export default GenrePage;
