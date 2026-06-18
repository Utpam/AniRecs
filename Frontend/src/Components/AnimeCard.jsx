import React, { memo } from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Unified AnimeCard component used across HomePage, SearchPage, and ProfilePage.
 *
 * Props:
 *  - item            : { animeId, mal_id, title, poster, image, score, communityRating, matchPercentage, recommendationScore }
 *  - inWatchlist     : boolean
 *  - inFavorites     : boolean
 *  - onWatchlistToggle : (animeId) => void
 *  - onFavoriteToggle  : (animeId) => void
 *  - onPlayTrailer     : (animeId, title) => void  [optional]
 *  - customActions     : [{ label, onClick }]       [optional]
 */
const AnimeCard = memo(function AnimeCard({
  item,
  inWatchlist = false,
  inFavorites = false,
  onWatchlistToggle,
  onFavoriteToggle,
  onPlayTrailer,
  customActions = [],
}) {
  const animeId = String(item.animeId || item.mal_id || '');
  const title   = item.title || 'Unknown Title';
  const poster  = item.poster || item.image || '';
  const score   = item.score || item.mal_rating || 0;
  const matchPct = item.matchPercentage || item.recommendationScore || null;

  const handleWatchlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWatchlistToggle) onWatchlistToggle(animeId);
  };

  const handleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavoriteToggle) onFavoriteToggle(animeId);
  };

  const handleTrailer = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPlayTrailer) onPlayTrailer(animeId, title);
  };

  return (
    <NavLink
      to={`/anime/${encodeURIComponent(title)}/${animeId}`}
      className="group relative flex-shrink-0 w-36 md:w-40 block focus:outline-none"
    >
      {/* ── Card shell ─────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-white/8 bg-[#1a0f14] shadow-lg transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-primary/10 group-hover:shadow-xl group-hover:-translate-y-1">

        {/* Poster */}
        <div className="relative aspect-[3/4] overflow-hidden">
          {poster ? (
            <img
              src={poster}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586A2 2 0 0111 11l2 2a2 2 0 002.828 0L20 8M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
              </svg>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5 gap-1.5">

            {/* Quick action buttons */}
            <div className="flex gap-1.5 justify-center flex-wrap">
              {/* Watchlist btn */}
              {onWatchlistToggle && (
                <button
                  onClick={handleWatchlist}
                  title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  className={`flex-1 min-w-0 py-1.5 rounded-lg text-[10px] font-hanken-bold transition duration-200 cursor-pointer border ${
                    inWatchlist
                      ? 'bg-primary/80 border-primary text-white'
                      : 'bg-white/10 border-white/15 text-white hover:bg-primary/60 hover:border-primary'
                  }`}
                >
                  {inWatchlist ? '✓ Saved' : '+ Watch'}
                </button>
              )}

              {/* Favorite btn */}
              {onFavoriteToggle && (
                <button
                  onClick={handleFavorite}
                  title={inFavorites ? 'Remove from Favorites' : 'Add to Favorites'}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition duration-200 cursor-pointer border shrink-0 ${
                    inFavorites
                      ? 'bg-rose-500/80 border-rose-400 text-white'
                      : 'bg-white/10 border-white/15 text-white hover:bg-rose-500/60 hover:border-rose-400'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={inFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              )}

              {/* Trailer btn */}
              {onPlayTrailer && (
                <button
                  onClick={handleTrailer}
                  title="Play Trailer"
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 border border-white/15 text-white hover:bg-white/25 transition duration-200 cursor-pointer shrink-0"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Custom actions (e.g. Move to Watchlist) */}
            {customActions.length > 0 && customActions.map((action, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  action.onClick(animeId);
                }}
                className="w-full py-1.5 rounded-lg text-[10px] font-hanken-bold bg-indigo-500/70 border border-indigo-400/50 text-white hover:bg-indigo-500/90 transition duration-200 cursor-pointer"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Score badge */}
          {score > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/75 backdrop-blur-sm rounded-lg px-1.5 py-0.5 border border-white/10">
              <svg className="w-2.5 h-2.5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-[10px] font-hanken-bold text-yellow-400">{Number(score).toFixed(1)}</span>
            </div>
          )}

          {/* Match % badge */}
          {matchPct && (
            <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm rounded-lg px-1.5 py-0.5 border border-primary/30">
              <span className="text-[10px] font-hanken-bold text-white">{Math.round(matchPct)}%</span>
            </div>
          )}

          {/* Active state chips */}
          {(inWatchlist || inFavorites) && (
            <div className="absolute bottom-0 left-0 right-0 flex gap-1 px-1.5 pb-1.5 pointer-events-none opacity-0 group-hover:opacity-0">
              {/* Hidden — active state is shown on hover buttons */}
            </div>
          )}
        </div>

        {/* ── Info row ─────────────────────────────── */}
        <div className="px-2.5 py-2">
          <h3 className="text-[11px] font-hanken-bold text-white line-clamp-2 leading-tight min-h-[2rem]">
            {title}
          </h3>
        </div>
      </div>
    </NavLink>
  );
});

export default AnimeCard;
