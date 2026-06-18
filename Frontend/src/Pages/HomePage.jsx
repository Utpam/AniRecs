import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import HeroSection from '../Components/HeroSection.jsx';
import { AnimeCardSkeleton, PageLoader, HomePageSkeleton, CarouselSkeleton } from '../Components/Loader';
import { login, showToast, toggleListOptimistic } from '../../store/AuthSlice.js';
import AnimeCard from '../Components/AnimeCard.jsx';

// ─── Lazy Row (renders when scrolled into view) ───────────────────────────────
const LazyRecommendationRow = memo(function LazyRecommendationRow({
  title, description, items, watchlist, favorites, onWatchlistToggle, onFavoriteToggle, onPlayTrailer
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section ref={ref} className="mt-10 animate-[fadeIn_0.5s_ease-out]">
      <div className="mb-4">
        <h2 className="text-xl md:text-2xl font-hanken-bold text-white tracking-wide">{title}</h2>
        {description && <p className="text-xs text-gray-400 font-hanken-light mt-0.5">{description}</p>}
      </div>

      {visible ? (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {items.map((item, idx) => (
            <AnimeCard
              key={`${item.animeId || item.mal_id}-${idx}`}
              item={item}
              inWatchlist={watchlist.includes(String(item.animeId || item.mal_id))}
              inFavorites={favorites.includes(String(item.animeId || item.mal_id))}
              onWatchlistToggle={onWatchlistToggle}
              onFavoriteToggle={onFavoriteToggle}
              onPlayTrailer={onPlayTrailer}
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-hidden pb-4">
          {Array.from({ length: Math.min(items.length, 6) }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      )}

      <hr className="border-white/5 mt-8 w-[98%]" />
    </section>
  );
});

// ─── HomePage ────────────────────────────────────────────────────────────────
function HomePage() {
  const authStatus = useSelector(state => state.auth.status);
  const userData   = useSelector(state => state.auth.userData);
  const dispatch   = useDispatch();

  // Per-anime pending map to prevent duplicate requests
  const pendingRef = useRef({});

  const [feedData, setFeedData]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [watchlist, setWatchlist] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const [activeTrailerUrl, setActiveTrailerUrl]   = useState('');
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [loadingTrailer, setLoadingTrailer]         = useState(false);

  // Sync local list state from Redux (single source of truth after server confirm)
  useEffect(() => {
    if (userData?.watchlist) {
      setWatchlist(userData.watchlist.map(item => String(item.animeId)));
    }
    if (userData?.favorites) {
      setFavorites(userData.favorites.map(String));
    }
  }, [userData]);

  const fetchHomeFeed = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/home-feed`,
        { withCredentials: true }
      );
      setFeedData(response.data);
    } catch (error) {
      console.error('Failed to fetch home feed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHomeFeed(); }, [authStatus]);

  // ─── Optimistic watchlist toggle ────────────────────────────────────────
  const handleWatchlistToggle = useCallback(async (animeId) => {
    const key = `watchlist-${animeId}`;
    if (pendingRef.current[key]) return;            // deduplicate
    pendingRef.current[key] = true;

    const id = String(animeId);
    const wasIn = watchlist.includes(id);

    // Optimistic local + Redux update
    setWatchlist(prev => wasIn ? prev.filter(x => x !== id) : [...prev, id]);
    dispatch(toggleListOptimistic({ actionType: 'watchlist', animeId }));
    dispatch(showToast({ message: wasIn ? 'Removed from watchlist' : 'Added to watchlist', type: wasIn ? 'info' : 'success' }));

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/recommendations/action`,
        { animeId, action: 'watchlist' },
        { withCredentials: true }
      );
      dispatch(login({ userData: res.data }));
    } catch (error) {
      console.error('Watchlist save failed:', error);
      // Rollback
      setWatchlist(prev => wasIn ? [...prev, id] : prev.filter(x => x !== id));
      dispatch(toggleListOptimistic({ actionType: 'watchlist', animeId }));
      dispatch(showToast({ message: 'Failed to update watchlist', type: 'error' }));
    } finally {
      delete pendingRef.current[key];
    }
  }, [watchlist, dispatch]);

  // ─── Optimistic favorites toggle ─────────────────────────────────────────
  const handleFavoriteToggle = useCallback(async (animeId) => {
    const key = `favorite-${animeId}`;
    if (pendingRef.current[key]) return;
    pendingRef.current[key] = true;

    const id = String(animeId);
    const wasFav = favorites.includes(id);

    setFavorites(prev => wasFav ? prev.filter(x => x !== id) : [...prev, id]);
    dispatch(toggleListOptimistic({ actionType: 'favorite', animeId }));
    dispatch(showToast({ message: wasFav ? 'Removed from favorites' : 'Added to favorites', type: wasFav ? 'info' : 'success' }));

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/recommendations/action`,
        { animeId, action: 'favorite' },
        { withCredentials: true }
      );
      dispatch(login({ userData: res.data }));
    } catch (error) {
      console.error('Favorite save failed:', error);
      // Rollback
      setFavorites(prev => wasFav ? [...prev, id] : prev.filter(x => x !== id));
      dispatch(toggleListOptimistic({ actionType: 'favorite', animeId }));
      dispatch(showToast({ message: 'Failed to update favorites', type: 'error' }));
    } finally {
      delete pendingRef.current[key];
    }
  }, [favorites, dispatch]);

  // ─── Trailer ─────────────────────────────────────────────────────────────
  const handlePlayTrailer = useCallback(async (animeId, title) => {
    setLoadingTrailer(true);
    setIsTrailerModalOpen(true);
    try {
      const res = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}`);
      const embedUrl = res.data?.data?.trailer?.embed_url;
      if (embedUrl) {
        setActiveTrailerUrl(embedUrl);
        if (authStatus) {
          await axios.post(
            `${import.meta.env.VITE_BASE_URL}/api/recommendations/action`,
            { animeId, action: 'trailer' },
            { withCredentials: true }
          );
        }
      } else {
        alert(`Sorry, no trailer available for ${title}`);
        setIsTrailerModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to fetch trailer:', err);
      alert('Failed to load trailer.');
      setIsTrailerModalOpen(false);
    } finally {
      setLoadingTrailer(false);
    }
  }, [authStatus]);

  if (loading) return <HomePageSkeleton />;

  // Shared props for every row
  const rowProps = { watchlist, favorites, onWatchlistToggle: handleWatchlistToggle, onFavoriteToggle: handleFavoriteToggle, onPlayTrailer: handlePlayTrailer };

  return (
    <div className="w-full min-h-screen text-tertiary bg-neutral overflow-x-hidden">
      {!authStatus && <HeroSection />}

      <div className="px-6 md:px-12 py-8 max-w-7xl mx-auto">
        {feedData && (
          <>
            {authStatus && (
              <LazyRecommendationRow
                title="Continue Watching"
                description="Jump back into titles saved on your watchlist."
                items={feedData.continueWatching}
                {...rowProps}
              />
            )}

            <LazyRecommendationRow
              title="Recommended For You"
              description="Tuned directly to your anime preference vector."
              items={feedData.forYou}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Comedy You'll Love"
              description="Sleek, hilarious, and highly rated comedy selections."
              items={feedData.comedyYoullLove}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Romance Recommendations"
              description="Heartwarming stories of love, friendship, and drama."
              items={feedData.romanceRecommendations}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Slice Of Life Essentials"
              description="Charming, realistic, and relaxing slice of life stories."
              items={feedData.sliceOfLifeEssentials}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Action Essentials"
              description="Adrenaline-pumping action and high-stakes adventure."
              items={feedData.actionEssentials}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Fantasy Picks"
              description="Magical worlds, mythical creatures, and epic fantasy adventures."
              items={feedData.fantasyPicks}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Mystery & Suspense"
              description="Gripping mysteries, psychological thrillers, and edge-of-seat suspense."
              items={feedData.mysteryAndSuspense}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Adventure Anime"
              description="Grand journeys, exploration, and world-spanning quests."
              items={feedData.adventureAnime}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Sci-Fi Recommendations"
              description="Futuristic science fiction, space opera, and technological wonders."
              items={feedData.sciFiRecommendations}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Award Winning Anime"
              description="Critically acclaimed titles and fan favorites scoring 8.5 or higher."
              items={feedData.awardWinningAnime}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Because You Like Action"
              description="Action-packed shows personalized to your profile weights."
              items={feedData.becauseLikeAction}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Because You Like Fantasy"
              description="Enchanting fantasy and adventure titles curated for you."
              items={feedData.becauseLikeFantasy}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Because You Like Psychological"
              description="Mind-bending psychological thrillers and mystery series."
              items={feedData.becauseLikePsychological}
              {...rowProps}
            />

            {feedData.themeBasedRows?.map((row, idx) => (
              <LazyRecommendationRow
                key={`theme-${idx}`}
                title={row.title}
                description="Tailored selections fitting your favored story themes."
                items={row.items}
                {...rowProps}
              />
            ))}

            <LazyRecommendationRow
              title="Trending In Your Genres"
              description="Most popular and active shows inside your preferred genres."
              items={feedData.trendingForYou}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="More Like Your Favorites"
              description="Curated selections similar to your high rated or favorite anime."
              items={feedData.moreLikeFavorites}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Explore Something New"
              description="Curated exploration picks outside your typical matching zone."
              items={feedData.exploreSomethingNew}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Hidden Gems"
              description="Under-the-radar selections carrying excellent ratings."
              items={feedData.hiddenGems}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Underrated Masterpieces"
              description="High-score classics with lower popularity metrics."
              items={feedData.underratedMasterpieces}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Seasonal Highlights"
              description="Current or recent seasons matched to your preferences."
              items={feedData.seasonalHighlights}
              {...rowProps}
            />

            <LazyRecommendationRow
              title="Top Community Rated Anime"
              description="Highly rated and reviewed by the AniRecs community."
              items={feedData.topCommunityRated}
              {...rowProps}
            />
          </>
        )}
      </div>

      {/* Trailer Modal */}
      {isTrailerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
          <div className="relative w-full max-w-4xl mx-4 aspect-video bg-neutral border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => { setIsTrailerModalOpen(false); setActiveTrailerUrl(''); }}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/70 flex items-center justify-center hover:bg-primary transition text-white border border-white/10 cursor-pointer shadow-lg"
              aria-label="Close trailer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {loadingTrailer ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-tertiary">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Fetching trailer...</span>
              </div>
            ) : (
              activeTrailerUrl && (
                <iframe
                  src={`${activeTrailerUrl}${activeTrailerUrl.includes('?') ? '&' : '?'}autoplay=1&enablejsapi=1`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="w-full h-full border-0"
                  title="Trailer video player"
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;