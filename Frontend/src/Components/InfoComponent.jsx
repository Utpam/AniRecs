import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { login, showToast, toggleListOptimistic } from '../../store/AuthSlice.js';
import Carousel from './Carousel';
import { PageLoader, AnimeDetailsSkeleton } from './Loader';

function InfoComponent() {
    const { mal_id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [recommendations, setRecommendations] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingChars, setLoadingChars] = useState(true);
    const [loadingRecs, setLoadingRecs] = useState(true);

    const [isTrailerOpen, setIsTrailerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('synopsis');

    // Redux Auth status
    const authStatus = useSelector(state => state.auth.status);
    const userData = useSelector(state => state.auth.userData);
    const dispatch = useDispatch();

    // Dedup guard: prevents double-firing any action button
    const pendingRef = useRef({});

    // Optimistic action helper (favorite | watched | complete | trailer)
    const handleActionClick = async (action) => {
        if (!authStatus) {
            dispatch(showToast({ message: "Create an account to save anime, rate shows, and personalize recommendations.", type: "info" }));
            navigate('/login');
            return;
        }

        const key = `${action}-${mal_id}`;
        if (pendingRef.current[key]) return;
        pendingRef.current[key] = true;

        // Optimistic Redux update for toggle-able list actions
        const listAction = action === 'favorite' ? 'favorite'
            : action === 'watched'  ? 'watched'
            : action === 'complete' ? 'complete'
            : null;

        let wasActive = false;
        if (listAction) {
            wasActive = listAction === 'favorite'
                ? userData?.favorites?.includes(String(mal_id))
                : listAction === 'watched'
                ? userData?.watchedAnime?.includes(String(mal_id))
                : userData?.completedAnime?.includes(String(mal_id));

            dispatch(toggleListOptimistic({ actionType: listAction, animeId: mal_id }));
            dispatch(showToast({
                message: wasActive
                    ? `Removed from ${listAction}`
                    : `Added to ${listAction}`,
                type: wasActive ? 'info' : 'success'
            }));
        }

        try {
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/recommendations/action`, {
                animeId: String(mal_id),
                action
            }, { withCredentials: true });
            dispatch(login({ userData: res.data }));
        } catch (error) {
            console.error(`Telemetry action '${action}' failed:`, error);
            // Rollback optimistic change
            if (listAction) {
                dispatch(toggleListOptimistic({ actionType: listAction, animeId: mal_id }));
                dispatch(showToast({ message: `Failed to update — please try again`, type: 'error' }));
            }
        } finally {
            delete pendingRef.current[key];
        }
    };

    // Optimistic watchlist toggle (separate because it has its own data shape)
    const handleWatchlistToggle = async () => {
        if (!authStatus) {
            dispatch(showToast({ message: "Create an account to save anime, rate shows, and personalize recommendations.", type: "info" }));
            navigate('/login');
            return;
        }

        const key = `watchlist-${mal_id}`;
        if (pendingRef.current[key]) return;
        pendingRef.current[key] = true;

        const wasIn = userData?.watchlist?.some(item => String(item.animeId) === String(mal_id));
        dispatch(toggleListOptimistic({ actionType: 'watchlist', animeId: mal_id }));
        dispatch(showToast({
            message: wasIn ? 'Removed from watchlist' : 'Added to watchlist',
            type: wasIn ? 'info' : 'success'
        }));

        try {
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/recommendations/action`, {
                animeId: String(mal_id),
                action: 'watchlist'
            }, { withCredentials: true });
            dispatch(login({ userData: res.data }));
        } catch (error) {
            console.error('Watchlist toggle failed:', error);
            dispatch(toggleListOptimistic({ actionType: 'watchlist', animeId: mal_id }));
            dispatch(showToast({ message: 'Failed to update watchlist', type: 'error' }));
        } finally {
            delete pendingRef.current[key];
        }
    };

    // Community & Ratings state
    const [ratingStats, setRatingStats] = useState({
        averageUserRating: 0,
        ratingCount: 0,
        malRating: 0,
        userRating: null,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 }
    });
    const [comments, setComments] = useState([]);
    const [commentsSort, setCommentsSort] = useState('top');
    const [reviews, setReviews] = useState([]);
    const [reviewsSort, setReviewsSort] = useState('top');
    const [loadingCommunity, setLoadingCommunity] = useState(false);

    // States for interactive inputs
    const [newCommentText, setNewCommentText] = useState('');
    const [isCommentSpoiler, setIsCommentSpoiler] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [editingCommentSpoiler, setEditingCommentSpoiler] = useState(false);

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(5.0);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const [ratingInput, setRatingInput] = useState(5.0);
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    const [revealedSpoilers, setRevealedSpoilers] = useState([]);

    const toggleRevealSpoiler = (commentId) => {
        if (revealedSpoilers.includes(commentId)) {
            setRevealedSpoilers(prev => prev.filter(id => id !== commentId));
        } else {
            setRevealedSpoilers(prev => [...prev, commentId]);
        }
    };

    const fetchRatingStats = () => {
        axios.get(`${import.meta.env.VITE_BASE_URL}/api/community/rating/${mal_id}`, { withCredentials: true })
            .then(res => {
                setRatingStats(res.data);
                if (res.data.userRating) {
                    setRatingInput(res.data.userRating);
                }
            })
            .catch(err => console.error("Error fetching rating stats:", err));
    };

    const fetchComments = () => {
        axios.get(`${import.meta.env.VITE_BASE_URL}/api/community/comments/${mal_id}?sortBy=${commentsSort}`, { withCredentials: true })
            .then(res => setComments(res.data))
            .catch(err => console.error("Error fetching comments:", err));
    };

    const fetchReviews = () => {
        axios.get(`${import.meta.env.VITE_BASE_URL}/api/community/reviews/${mal_id}?sortBy=${reviewsSort}`, { withCredentials: true })
            .then(res => setReviews(res.data))
            .catch(err => console.error("Error fetching reviews:", err));
    };

    // Main loaders for Community Tab
    useEffect(() => {
        if (activeTab === 'community' && mal_id) {
            setLoadingCommunity(true);
            Promise.all([
                axios.get(`${import.meta.env.VITE_BASE_URL}/api/community/rating/${mal_id}`, { withCredentials: true }),
                axios.get(`${import.meta.env.VITE_BASE_URL}/api/community/comments/${mal_id}?sortBy=${commentsSort}`, { withCredentials: true }),
                axios.get(`${import.meta.env.VITE_BASE_URL}/api/community/reviews/${mal_id}?sortBy=${reviewsSort}`, { withCredentials: true })
            ]).then(([ratingRes, commentsRes, reviewsRes]) => {
                setRatingStats(ratingRes.data);
                if (ratingRes.data.userRating) {
                    setRatingInput(ratingRes.data.userRating);
                }
                setComments(commentsRes.data);
                setReviews(reviewsRes.data);
            }).catch(err => {
                console.error("Error loading community tab:", err);
            }).finally(() => {
                setLoadingCommunity(false);
            });
        }
    }, [activeTab, mal_id]);

    useEffect(() => {
        if (activeTab === 'community' && mal_id) {
            fetchComments();
        }
    }, [commentsSort]);

    useEffect(() => {
        if (activeTab === 'community' && mal_id) {
            fetchReviews();
        }
    }, [reviewsSort]);

    const handleRatingSubmit = async (val) => {
        if (!authStatus) {
            dispatch(showToast({ message: "Create an account to save anime, rate shows, and personalize recommendations.", type: "info" }));
            navigate('/login');
            return;
        }
        setIsSubmittingRating(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/community/rating`, {
                mal_id: Number(mal_id),
                rating: val
            }, { withCredentials: true });

            setRatingStats(prev => ({
                ...prev,
                averageUserRating: res.data.averageUserRating,
                ratingCount: res.data.ratingCount,
                userRating: res.data.userRating
            }));
            setRatingInput(res.data.userRating);
            fetchRatingStats();
        } catch (err) {
            console.error("Failed to submit rating:", err);
            dispatch(showToast({ message: "Failed to submit rating.", type: "error" }));
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!authStatus) {
            dispatch(showToast({ message: "Create an account to save anime, rate shows, and personalize recommendations.", type: "info" }));
            navigate('/login');
            return;
        }
        if (!newCommentText.trim()) return;

        try {
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/community/comments`, {
                mal_id: Number(mal_id),
                content: newCommentText.trim(),
                spoilers: isCommentSpoiler
            }, { withCredentials: true });

            setComments(prev => [res.data, ...prev]);
            setNewCommentText('');
            setIsCommentSpoiler(false);
            fetchRatingStats();
        } catch (err) {
            console.error("Failed to add comment:", err);
            dispatch(showToast({ message: "Failed to post comment.", type: "error" }));
        }
    };

    const handleEditComment = async (commentId) => {
        try {
            const res = await axios.put(`${import.meta.env.VITE_BASE_URL}/api/community/comments/${commentId}`, {
                content: editingCommentText.trim(),
                spoilers: editingCommentSpoiler
            }, { withCredentials: true });

            setComments(prev => prev.map(c => c._id === commentId ? res.data : c));
            setEditingCommentId(null);
            setEditingCommentText('');
        } catch (err) {
            console.error("Failed to edit comment:", err);
            dispatch(showToast({ message: "Failed to edit comment.", type: "error" }));
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_BASE_URL}/api/community/comments/${commentId}`, { withCredentials: true });
            setComments(prev => prev.filter(c => c._id !== commentId));
        } catch (err) {
            console.error("Failed to delete comment:", err);
            dispatch(showToast({ message: "Failed to delete comment.", type: "error" }));
        }
    };

    const handleLikeComment = async (commentId) => {
        if (!authStatus) {
            dispatch(showToast({ message: "Create an account to save anime, rate shows, and personalize recommendations.", type: "info" }));
            navigate('/login');
            return;
        }
        try {
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/community/comments/${commentId}/like`, {}, { withCredentials: true });
            setComments(prev => prev.map(c => c._id === commentId ? res.data : c));
        } catch (err) {
            console.error("Failed to like comment:", err);
        }
    };

    const handleAddReview = async (e) => {
        e.preventDefault();
        if (!authStatus) {
            dispatch(showToast({ message: "Create an account to save anime, rate shows, and personalize recommendations.", type: "info" }));
            navigate('/login');
            return;
        }
        if (!reviewTitle.trim() || !reviewText.trim()) return;

        setIsSubmittingReview(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/community/reviews`, {
                mal_id: Number(mal_id),
                rating: reviewRating,
                title: reviewTitle.trim(),
                review: reviewText.trim()
            }, { withCredentials: true });

            setReviews(prev => [res.data, ...prev]);
            setIsReviewModalOpen(false);
            setReviewTitle('');
            setReviewText('');
            fetchRatingStats();
        } catch (err) {
            console.error("Failed to submit review:", err);
            dispatch(showToast({ message: "Failed to post review. You may have already reviewed this anime.", type: "error" }));
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_BASE_URL}/api/community/reviews/${reviewId}`, { withCredentials: true });
            setReviews(prev => prev.filter(r => r._id !== reviewId));
            fetchRatingStats();
        } catch (err) {
            console.error("Failed to delete review:", err);
            dispatch(showToast({ message: "Failed to delete review.", type: "error" }));
        }
    };

    const handleLikeReview = async (reviewId) => {
        if (!authStatus) {
            dispatch(showToast({ message: "Create an account to save anime, rate shows, and personalize recommendations.", type: "info" }));
            navigate('/login');
            return;
        }
        try {
            const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/community/reviews/${reviewId}/like`, {}, { withCredentials: true });
            setReviews(prev => prev.map(r => r._id === reviewId ? res.data : r));
        } catch (err) {
            console.error("Failed to like review:", err);
        }
    };

    // Derive live list status directly from Redux (always reflects optimistic state)
    const isWatchlisted = authStatus && userData?.watchlist?.some(item => String(item.animeId) === String(mal_id));
    const isFavorited   = authStatus && userData?.favorites?.includes(String(mal_id));
    const isWatched     = authStatus && userData?.watchedAnime?.includes(String(mal_id));
    const isCompleted   = authStatus && userData?.completedAnime?.includes(String(mal_id));

    useEffect(() => {
        if (!mal_id) return;

        setLoading(true);
        setLoadingChars(true);
        setLoadingRecs(true);
        setData(null);
        setCharacters([]);
        setRecommendations([]);

        // Fetch details from our backend instead of Jikan directly
        axios.get(`${import.meta.env.VITE_BASE_URL}/api/anime/${mal_id}`, { withCredentials: true })
            .then(res => {
                const metadata = res.data.data;
                setData(metadata);
                setCharacters(metadata.characters || []);

                setRecommendations(metadata.recommendations || []);
            })
            .catch(err => {
                console.error("Error fetching anime details:", err);
                setData(null);
                setCharacters([]);
                setRecommendations([]);
            })
            .finally(() => {
                setLoading(false);
                setLoadingChars(false);
                setLoadingRecs(false);
            });
    }, [mal_id]);

    // handleWatchlistToggle is defined above near handleActionClick

    if (loading) {
        return <AnimeDetailsSkeleton />;
    }

    const trailerEmbedUrl = data?.trailer?.embed_url;
    const fallbackImage = data?.trailer?.images?.maximum_image_url || data?.images?.jpg?.large_image_url || data?.images?.webp?.large_image_url;

    // Format recommendations for existing Carousel component
    const formattedRecs = recommendations.map(rec => ({
        mal_id: rec.entry.mal_id,
        title: rec.entry.title,
        image: rec.entry.images?.jpg?.image_url || rec.entry.images?.webp?.image_url,
        mal_rating: rec.votes ? `${rec.votes} votes` : 'Similar'
    }));

    return (
        <div className='w-full min-h-screen text-tertiary font-hanken-reg bg-neutral overflow-x-hidden relative'>

            {/* Immersive Hero Header / Banner */}
            <section className='relative w-full h-[45vh] md:h-[60vh] bg-slate-950 overflow-hidden'>
                {fallbackImage ? (
                    <img
                        src={fallbackImage}
                        alt={data?.title ? `${data.title} banner` : 'Anime banner'}
                        className='object-cover h-full w-full opacity-35 filter blur-[2px] scale-105'
                    />
                ) : (
                    <div className='h-full w-full bg-secondary/25' />
                )}

                {/* Soft dark radial/linear overlays */}
                <div className='absolute inset-0 bg-gradient-to-t from-neutral via-neutral/60 to-transparent z-10' />
                <div className='absolute inset-0 bg-gradient-to-r from-neutral via-neutral/30 to-transparent z-10 hidden lg:block' />

                {/* Banner Details Overlay */}
                <div className='absolute bottom-0 left-0 right-0 p-6 pb-12 md:p-12 lg:pb-16 lg:pl-[352px] z-40 max-w-7xl mx-auto w-full flex flex-col items-start'>
                    <div className='flex flex-wrap gap-2 mb-3'>
                        {data?.genres?.slice(0, 3).map((g, idx) => (
                            <span
                                key={idx}
                                className='text-[10px] md:text-xs px-3 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-tertiary font-hanken-med shadow-sm'
                            >
                                {g.name}
                            </span>
                        ))}
                        {data?.status === 'Currently Airing' && (
                            <span className='text-[10px] md:text-xs px-3 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-hanken-med animate-pulse'>
                                Airing
                            </span>
                        )}
                    </div>

                    <h1 className='text-3xl md:text-5xl lg:text-6xl font-hanken-black tracking-tight text-white line-clamp-2 drop-shadow-md mb-2'>
                        {data?.title}
                    </h1>

                    {data?.title_japanese && (
                        <p className='text-sm md:text-lg text-tertiary/60 font-hanken-light tracking-wide mb-4'>
                            {data.title_japanese} {data.title_english ? `• ${data.title_english}` : ''}
                        </p>
                    )}

                    {/* Quick info row */}
                    <div className='flex flex-wrap gap-x-4 gap-y-2 text-xs md:text-sm text-gray-300 font-hanken-light mb-6'>
                        <span>{data?.type || 'TV'}</span>
                        <span>•</span>
                        <span>{data?.episodes ? `${data.episodes} Episodes` : 'Ongoing'}</span>
                        <span>•</span>
                        <span>{data?.duration || 'N/A'}</span>
                        <span>•</span>
                        <span>{data?.season ? `${data.season.charAt(0).toUpperCase() + data.season.slice(1)} ${data.year}` : data?.year || 'N/A'}</span>
                        <span>•</span>
                        <span className='px-1.5 py-0.2 bg-white/10 rounded text-[11px]'>{data?.rating?.split(' - ')[0] || 'G'}</span>
                    </div>

                    {/* Call to actions */}
                    <div className='flex flex-wrap gap-3 z-40'>
                        {trailerEmbedUrl && (
                            <button
                                onClick={() => {
                                    setIsTrailerOpen(true);
                                    if (authStatus) handleActionClick('trailer');
                                }}
                                className='flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-light text-white font-hanken-bold rounded-full transition duration-300 shadow-lg hover:shadow-primary/20 hover:scale-105 cursor-pointer text-sm md:text-base'
                            >
                                <svg
                                    xmlns='http://www.w3.org/2000/svg'
                                    viewBox='0 0 24 24'
                                    fill='currentColor'
                                    className='w-4 h-4 md:w-5 md:h-5'
                                >
                                    <polygon points='6 3 20 12 6 21 6 3' />
                                </svg>
                                Play Trailer
                            </button>
                        )}

                        <button
                            onClick={handleWatchlistToggle}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition duration-300 text-sm md:text-base cursor-pointer ${
                                isWatchlisted
                                    ? 'bg-primary-dark/80 text-white border border-primary shadow-md shadow-primary/20'
                                    : 'bg-white/5 hover:bg-white/10 border border-white/20 hover:border-primary text-tertiary'
                            }`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4 md:w-5 md:h-5"
                                fill={isWatchlisted ? "currentColor" : "none"}
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            {isWatchlisted ? 'Saved to Watchlist' : 'Add to Watchlist'}
                        </button>

                        {authStatus && (
                            <>
                                {/* Favorite */}
                                <button
                                    onClick={() => handleActionClick('favorite')}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition duration-300 text-sm md:text-base cursor-pointer ${isFavorited
                                        ? 'bg-rose-600/90 text-white border border-rose-500'
                                        : 'bg-white/5 hover:bg-white/10 border border-white/20 hover:border-rose-400 text-tertiary'
                                        }`}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-4 h-4 md:w-5 md:h-5"
                                        fill={isFavorited ? "currentColor" : "none"}
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    {isFavorited ? 'Favorited' : 'Favorite'}
                                </button>

                                {/* Watched */}
                                <button
                                    onClick={() => handleActionClick('watched')}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition duration-300 text-sm md:text-base cursor-pointer ${isWatched
                                        ? 'bg-cyan-600/90 text-white border border-cyan-500'
                                        : 'bg-white/5 hover:bg-white/10 border border-white/20 hover:border-cyan-400 text-tertiary'
                                        }`}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-4 h-4 md:w-5 md:h-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    {isWatched ? 'Watched' : 'Mark Watched'}
                                </button>

                                {/* Completed */}
                                <button
                                    onClick={() => handleActionClick('complete')}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition duration-300 text-sm md:text-base cursor-pointer ${isCompleted
                                        ? 'bg-green-600/90 text-white border border-green-500'
                                        : 'bg-white/5 hover:bg-white/10 border border-white/20 hover:border-green-400 text-tertiary'
                                        }`}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-4 h-4 md:w-5 md:h-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.472 3.472 0 012.87 2.87 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.472 3.472 0 01-2.87 2.87 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.472 3.472 0 01-2.87-2.87 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.472 3.472 0 012.87-2.87z" />
                                    </svg>
                                    {isCompleted ? 'Completed' : 'Mark Completed'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Main Content Body */}
            <main className='relative max-w-7xl mx-auto px-4 pb-16 z-30 mt-0 lg:-mt-24'>
                <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>

                    {/* Left Column: Poster & Metadata Sidebar */}
                    <aside className='lg:col-span-3 flex flex-col w-full'>
                        {/* HD Poster */}
                        <div className='w-48 sm:w-56 md:w-64 lg:w-full mx-auto rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 hover:border-primary/40 hover:scale-[1.02] transition duration-500 aspect-[3/4] bg-secondary/40'>
                            <img
                                src={data?.images?.jpg?.large_image_url || data?.images?.jpg?.image_url || fallbackImage}
                                alt={data?.title || 'Anime poster'}
                                className='w-full h-full object-cover'
                            />
                        </div>

                        {/* Structured Information Panel */}
                        <div className='bg-[#28161D]/65 border border-white/5 backdrop-blur-md rounded-2xl p-5 mt-6 space-y-4 shadow-xl'>
                            <h3 className='font-hanken-bold text-lg text-white border-b border-white/10 pb-2 mb-3'>
                                Information Details
                            </h3>

                            <div className='space-y-3 text-sm'>
                                <div>
                                    <span className='block text-xs text-gray-500 font-hanken-med'>Format</span>
                                    <span className='font-hanken-med text-tertiary'>{data?.type || 'TV'}</span>
                                </div>

                                <div>
                                    <span className='block text-xs text-gray-500 font-hanken-med'>Episodes</span>
                                    <span className='font-hanken-med text-tertiary'>{data?.episodes ?? 'Airing'}</span>
                                </div>

                                <div>
                                    <span className='block text-xs text-gray-500 font-hanken-med'>Status</span>
                                    <span className='font-hanken-med text-tertiary'>{data?.status || 'Unknown'}</span>
                                </div>

                                <div>
                                    <span className='block text-xs text-gray-500 font-hanken-med'>Aired</span>
                                    <span className='font-hanken-med text-tertiary text-xs'>{data?.aired?.string || 'N/A'}</span>
                                </div>

                                {data?.season && (
                                    <div>
                                        <span className='block text-xs text-gray-500 font-hanken-med'>Premiered</span>
                                        <span className='font-hanken-med text-tertiary capitalize'>{data.season} {data.year}</span>
                                    </div>
                                )}

                                {data?.broadcast?.string && data.broadcast.string !== 'Unknown' && (
                                    <div>
                                        <span className='block text-xs text-gray-500 font-hanken-med'>Broadcast</span>
                                        <span className='font-hanken-med text-tertiary text-xs'>{data.broadcast.string}</span>
                                    </div>
                                )}

                                <div>
                                    <span className='block text-xs text-gray-500 font-hanken-med'>Studios</span>
                                    <span className='font-hanken-med text-tertiary'>
                                        {data?.studios && data.studios.length > 0
                                            ? data.studios.map(s => s.name).join(', ')
                                            : 'Unknown'}
                                    </span>
                                </div>

                                {data?.producers && data.producers.length > 0 && (
                                    <div>
                                        <span className='block text-xs text-gray-500 font-hanken-med'>Producers</span>
                                        <span className='font-hanken-med text-gray-300 text-xs line-clamp-2'>
                                            {data.producers.map(p => p.name).join(', ')}
                                        </span>
                                    </div>
                                )}

                                <div>
                                    <span className='block text-xs text-gray-500 font-hanken-med'>Source</span>
                                    <span className='font-hanken-med text-tertiary'>{data?.source || 'N/A'}</span>
                                </div>

                                <div>
                                    <span className='block text-xs text-gray-500 font-hanken-med'>Duration</span>
                                    <span className='font-hanken-med text-tertiary'>{data?.duration || 'N/A'}</span>
                                </div>

                                {data?.rating && (
                                    <div>
                                        <span className='block text-xs text-gray-500 font-hanken-med'>Rating</span>
                                        <span className='font-hanken-med text-gray-300 text-xs'>{data.rating}</span>
                                    </div>
                                )}

                                {data?.licensors && data.licensors.length > 0 && (
                                    <div>
                                        <span className='block text-xs text-gray-500 font-hanken-med'>Licensors</span>
                                        <span className='font-hanken-med text-gray-400 text-xs'>
                                            {data.licensors.map(l => l.name).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Right Column: Stats, Synopsis & Tabbed Sections */}
                    <article className='lg:col-span-9 w-full lg:pt-28'>

                        {/* Dashboard Statistics Bar */}
                        <div className='grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6'>

                            {/* Score */}
                            <div className='bg-[#28161D]/40 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg hover:border-primary/10 transition duration-300'>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-400 mb-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                                <span className='text-lg font-hanken-black text-white leading-tight'>{data?.score ?? 'N/A'}</span>
                                <span className='text-[10px] text-gray-500 uppercase tracking-wider font-hanken-bold mt-0.5'>
                                    {data?.scored_by ? `${(data.scored_by / 1000).toFixed(0)}k users` : 'Score'}
                                </span>
                            </div>

                            {/* Rank */}
                            <div className='bg-[#28161D]/40 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg hover:border-primary/10 transition duration-300'>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500 mb-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                    <path d="M4 22h16" />
                                    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                                    <path d="M12 2a5 5 0 0 0-5 5v3c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V7a5 5 0 0 0-5-5z" />
                                </svg>
                                <span className='text-lg font-hanken-black text-white leading-tight'>
                                    {data?.rank ? `#${data.rank}` : 'N/A'}
                                </span>
                                <span className='text-[10px] text-gray-500 uppercase tracking-wider font-hanken-bold mt-0.5'>MAL Rank</span>
                            </div>

                            {/* Popularity */}
                            <div className='bg-[#28161D]/40 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg hover:border-primary/10 transition duration-300'>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-500 mb-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                                </svg>
                                <span className='text-lg font-hanken-black text-white leading-tight'>
                                    {data?.popularity ? `#${data.popularity}` : 'N/A'}
                                </span>
                                <span className='text-[10px] text-gray-500 uppercase tracking-wider font-hanken-bold mt-0.5'>Popularity</span>
                            </div>

                            {/* Members */}
                            <div className='bg-[#28161D]/40 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg hover:border-primary/10 transition duration-300'>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-cyan-400 mb-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                <span className='text-lg font-hanken-black text-white leading-tight'>
                                    {data?.members ? (data.members >= 1000000 ? `${(data.members / 1000000).toFixed(1)}M` : (data.members / 1000).toFixed(0) + 'k') : 'N/A'}
                                </span>
                                <span className='text-[10px] text-gray-500 uppercase tracking-wider font-hanken-bold mt-0.5'>Members</span>
                            </div>

                            {/* Favorites */}
                            <div className='bg-[#28161D]/40 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg hover:border-primary/10 transition duration-300'>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-rose-500 mb-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                                <span className='text-lg font-hanken-black text-white leading-tight'>
                                    {data?.favorites ? (data.favorites >= 1000 ? (data.favorites / 1000).toFixed(0) + 'k' : data.favorites) : 'N/A'}
                                </span>
                                <span className='text-[10px] text-gray-500 uppercase tracking-wider font-hanken-bold mt-0.5'>Favorites</span>
                            </div>
                        </div>

                        {/* Main Tabs Navigation */}
                        <nav className='flex border-b border-white/10 gap-6 mb-6 overflow-x-auto pb-2 scrollbar-none'>
                            {[
                                { id: 'synopsis', label: 'Overview' },
                                { id: 'characters', label: 'Characters' },
                                { id: 'relations', label: 'Relations' },
                                { id: 'themes', label: 'Themes & Streaming' },
                                { id: 'community', label: 'Community' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`font-hanken-bold text-sm md:text-base tracking-wide transition duration-300 relative pb-3 cursor-pointer whitespace-nowrap ${activeTab === tab.id ? 'text-primary' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-[slideRight_0.2s_ease-in-out]' />
                                    )}
                                </button>
                            ))}
                        </nav>

                        {/* Tab Contents */}
                        <section className='min-h-[250px]'>

                            {/* Overview Tab */}
                            {activeTab === 'synopsis' && (
                                <div className='space-y-6 animate-[fadeIn_0.4s_ease-out]'>
                                    <div className='bg-secondary/20 border border-white/5 rounded-2xl p-6 shadow-inner'>
                                        <h3 className='font-hanken-bold text-lg text-white mb-3'>Synopsis</h3>
                                        <p className='text-gray-300 leading-relaxed font-hanken-light tracking-wide text-[15px] whitespace-pre-line'>
                                            {data?.synopsis || 'No synopsis available.'}
                                        </p>
                                    </div>

                                    {data?.background && (
                                        <div className='bg-secondary/10 border border-white/5 rounded-2xl p-6'>
                                            <h3 className='font-hanken-bold text-lg text-tertiary mb-3'>Background</h3>
                                            <p className='text-gray-400 leading-relaxed font-hanken-light text-sm whitespace-pre-line'>
                                                {data.background}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Characters Tab */}
                            {activeTab === 'characters' && (
                                <div className='animate-[fadeIn_0.4s_ease-out]'>
                                    {loadingChars ? (
                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                            {Array.from({ length: 6 }).map((_, idx) => (
                                                <div key={idx} className="h-20 bg-secondary/15 border border-white/5 rounded-lg animate-pulse" />
                                            ))}
                                        </div>
                                    ) : characters.length > 0 ? (
                                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                            {characters.slice(0, 10).map((char, index) => {
                                                const character = char.character;
                                                const jpVA = char.voice_actors?.find(va => va.language === 'Japanese');
                                                return (
                                                    <div
                                                        key={index}
                                                        className="flex justify-between bg-secondary/20 hover:bg-secondary/40 border border-white/5 hover:border-primary/20 rounded-lg p-3 transition duration-300 shadow-sm"
                                                    >
                                                        {/* Character */}
                                                        <div className="flex gap-3">
                                                            <img
                                                                src={character.images?.jpg?.image_url}
                                                                alt={character.name}
                                                                className="w-12 h-16 object-cover rounded shadow bg-slate-900"
                                                            />
                                                            <div className="flex flex-col justify-between py-1">
                                                                <h4 className="text-sm font-hanken-bold line-clamp-1 text-tertiary">{character.name}</h4>
                                                                <p className="text-xs text-primary/80 font-hanken-light">{char.role}</p>
                                                            </div>
                                                        </div>

                                                        {/* Japanese Voice Actor */}
                                                        {jpVA && (
                                                            <div className="flex gap-3 text-right">
                                                                <div className="flex flex-col justify-between py-1">
                                                                    <h4 className="text-sm font-hanken-med line-clamp-1 text-gray-300">{jpVA.person.name}</h4>
                                                                    <p className="text-xs text-gray-500 font-hanken-light">Japanese</p>
                                                                </div>
                                                                <img
                                                                    src={jpVA.person.images?.jpg?.image_url}
                                                                    alt={jpVA.person.name}
                                                                    className="w-12 h-16 object-cover rounded shadow bg-slate-900"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500 font-hanken-light">
                                            No character profiles available.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Relations Tab */}
                            {activeTab === 'relations' && (
                                <div className='animate-[fadeIn_0.4s_ease-out]'>
                                    {data?.relations && data.relations.length > 0 ? (
                                        <div className="space-y-4">
                                            {data.relations.map((rel, index) => (
                                                <div key={index} className="bg-secondary/15 border border-white/5 rounded-xl p-4">
                                                    <h4 className="text-xs uppercase tracking-wider text-primary font-hanken-bold mb-2">
                                                        {rel.relation}
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {rel.entry.map((entry) => (
                                                            <NavLink
                                                                key={entry.mal_id}
                                                                to={`/anime/${encodeURIComponent(entry.name)}/${entry.mal_id}`}
                                                                className="flex items-center justify-between p-3 rounded-lg bg-neutral/60 hover:bg-primary-dark/20 border border-white/5 hover:border-primary/20 transition duration-300 shadow-sm"
                                                            >
                                                                <div className="pr-2">
                                                                    <div className="text-sm font-hanken-bold text-tertiary line-clamp-1">
                                                                        {entry.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 font-hanken-light">
                                                                        {entry.type}
                                                                    </div>
                                                                </div>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </NavLink>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500 font-hanken-light">
                                            No related anime entries recorded.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Themes & Streaming Tab */}
                            {activeTab === 'themes' && (
                                <div className='space-y-6 animate-[fadeIn_0.4s_ease-out]'>

                                    {/* Theme Songs List */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-hanken-bold text-primary mb-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                Opening Themes
                                            </h4>
                                            {data?.theme?.openings && data.theme.openings.length > 0 ? (
                                                <ul className="space-y-2 text-xs md:text-sm text-gray-300 font-hanken-light">
                                                    {data.theme.openings.map((op, i) => (
                                                        <li key={i} className="p-2.5 rounded bg-secondary/15 border-l-2 border-primary/50 shadow-sm">
                                                            {op}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-gray-500 font-hanken-light">No opening themes details recorded.</p>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-hanken-bold text-cyan-400 mb-3 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                                Ending Themes
                                            </h4>
                                            {data?.theme?.endings && data.theme.endings.length > 0 ? (
                                                <ul className="space-y-2 text-xs md:text-sm text-gray-300 font-hanken-light">
                                                    {data.theme.endings.map((ed, i) => (
                                                        <li key={i} className="p-2.5 rounded bg-secondary/15 border-l-2 border-cyan-400/50 shadow-sm">
                                                            {ed}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-gray-500 font-hanken-light">No ending themes details recorded.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Streaming & External Resources */}
                                    {((data?.streaming && data.streaming.length > 0) || (data?.external && data.external.length > 0)) && (
                                        <div className="border-t border-white/5 pt-6">
                                            <h4 className="text-sm font-hanken-bold text-white mb-4">Official Streams & References</h4>
                                            <div className="flex flex-wrap gap-3">
                                                {data.streaming?.map((stream, idx) => (
                                                    <a
                                                        key={`stream-${idx}`}
                                                        href={stream.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs px-4 py-2 bg-primary/20 hover:bg-primary/35 border border-primary/45 text-tertiary rounded-full transition duration-300 flex items-center gap-1.5 font-hanken-med shadow-sm"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {stream.name}
                                                    </a>
                                                ))}
                                                {data.external?.map((ext, idx) => (
                                                    <a
                                                        key={`ext-${idx}`}
                                                        href={ext.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs px-4 py-2 bg-secondary/40 hover:bg-secondary/60 border border-white/10 text-gray-300 rounded-full transition duration-300 flex items-center gap-1.5 font-hanken-med shadow-sm"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                        {ext.name}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Community Tab */}
                            {activeTab === 'community' && (
                                <div className='space-y-8 animate-[fadeIn_0.4s_ease-out]'>
                                    {loadingCommunity ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm text-gray-400">Loading community feedback...</span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                                            {/* Rating Dashboard Section (Sidebar) */}
                                            <div className="lg:col-span-4 space-y-6">

                                                {/* Triple Rating Grid */}
                                                <div className="bg-[#28161D]/45 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4">
                                                    <h4 className="font-hanken-bold text-white text-base border-b border-white/5 pb-2">
                                                        Ratings Overview
                                                    </h4>

                                                    <div className="grid grid-cols-3 gap-2">
                                                        {/* MAL Rating */}
                                                        <div className="bg-[#1f0e13]/55 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                                            <span className="text-[10px] text-gray-500 uppercase font-hanken-bold">MAL Score</span>
                                                            <span className="text-xl font-hanken-black text-white mt-1">
                                                                {ratingStats.malRating ? ratingStats.malRating.toFixed(1) : 'N/A'}
                                                            </span>
                                                        </div>

                                                        {/* Community Rating */}
                                                        <div className="bg-[#1f0e13]/55 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                                            <span className="text-[10px] text-gray-500 uppercase font-hanken-bold">Community</span>
                                                            <span className="text-xl font-hanken-black text-primary mt-1">
                                                                {ratingStats.averageUserRating ? ratingStats.averageUserRating.toFixed(1) : '0.0'}
                                                            </span>
                                                            <span className="text-[9px] text-gray-500 font-hanken-light mt-0.5">
                                                                ({ratingStats.ratingCount} {ratingStats.ratingCount === 1 ? 'vote' : 'votes'})
                                                            </span>
                                                        </div>

                                                        {/* Your Rating */}
                                                        <div className="bg-[#1f0e13]/55 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                                            <span className="text-[10px] text-gray-500 uppercase font-hanken-bold">Your Rating</span>
                                                            <span className="text-xl font-hanken-black text-cyan-400 mt-1">
                                                                {ratingStats.userRating ? ratingStats.userRating.toFixed(1) : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Interactive Rating Input */}
                                                <div className="bg-[#28161D]/45 border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col items-center text-center">
                                                    <h4 className="font-hanken-bold text-sm text-gray-400 uppercase tracking-wider mb-2">
                                                        Rate this Anime
                                                    </h4>
                                                    <div className="flex flex-col items-center gap-3 w-full">
                                                        <span className="text-4xl font-hanken-black text-primary drop-shadow-[0_0_10px_rgba(235,53,101,0.2)]">
                                                            {ratingInput.toFixed(1)} <span className="text-sm text-gray-500 font-hanken-light">/ 10</span>
                                                        </span>
                                                        <input
                                                            type="range"
                                                            min="0.5"
                                                            max="10"
                                                            step="0.5"
                                                            value={ratingInput}
                                                            onChange={(e) => setRatingInput(Number(e.target.value))}
                                                            className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                        <button
                                                            onClick={() => handleRatingSubmit(ratingInput)}
                                                            disabled={isSubmittingRating}
                                                            className="w-full py-2 bg-primary hover:bg-primary-light text-white font-hanken-bold text-xs rounded-full uppercase tracking-wider transition duration-300 cursor-pointer disabled:opacity-50 shadow-md hover:shadow-primary/30"
                                                        >
                                                            {isSubmittingRating ? 'Saving...' : 'Submit Rating'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Score Distribution Chart */}
                                                <div className="bg-[#28161D]/40 border border-white/5 rounded-2xl p-5 shadow-lg">
                                                    <h4 className="font-hanken-bold text-white text-base mb-4 border-b border-white/5 pb-2">
                                                        Score Distribution
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {Object.keys(ratingStats.distribution).sort((a, b) => Number(b) - Number(a)).map(score => {
                                                            const count = ratingStats.distribution[score] || 0;
                                                            const total = ratingStats.ratingCount || 1;
                                                            const pct = ratingStats.ratingCount > 0 ? (count / total) * 100 : 0;
                                                            return (
                                                                <div key={score} className="flex items-center gap-3 text-xs">
                                                                    <span className="w-4 font-hanken-bold text-right text-gray-400">{score}</span>
                                                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                                        <div
                                                                            style={{ width: `${pct}%` }}
                                                                            className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                                                                        />
                                                                    </div>
                                                                    <span className="w-8 text-right font-hanken-light text-gray-500">
                                                                        {count}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                            </div>

                                            {/* Reviews & Comments Section (Main Content) */}
                                            <div className="lg:col-span-8 space-y-8">

                                                {/* Reviews List */}
                                                <div className="bg-[#28161D]/25 border border-white/5 rounded-2xl p-6 shadow-lg space-y-6">
                                                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="font-hanken-bold text-lg text-white">Reviews</h3>
                                                            <span className="text-xs text-gray-500 font-hanken-light flex shrink-0">({reviews.length})</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={reviewsSort}
                                                                onChange={(e) => setReviewsSort(e.target.value)}
                                                                className="bg-neutral/80 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 font-hanken-med cursor-pointer hover:border-white/20 transition"
                                                            >
                                                                <option value="top">Top Likes</option>
                                                                <option value="new">Newest</option>
                                                            </select>
                                                            <button
                                                                onClick={() => {
                                                                    if (!authStatus) {
                                                                        dispatch(showToast({ message: "Create an account to save anime, rate shows, and personalize recommendations.", type: "info" }));
                                                                        navigate('/login');
                                                                        return;
                                                                    }
                                                                    setIsReviewModalOpen(true);
                                                                }}
                                                                className="px-3 py-1 bg-primary hover:bg-primary-light text-white text-xs font-hanken-bold rounded-full uppercase tracking-wider transition cursor-pointer shadow-md flex whitespace-nowrap"
                                                            >
                                                                Write Review
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {reviews.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {reviews.map((rev) => {
                                                                const isOwnReview = authStatus && userData && String(rev.userId?._id) === String(userData._id);
                                                                const hasLikedReview = authStatus && userData && rev.likes?.includes(userData._id);
                                                                return (
                                                                    <div key={rev._id} className="bg-[#1f0e13]/25 border border-white/5 rounded-xl p-5 hover:border-primary/10 transition duration-300 shadow-sm relative group">
                                                                        <div className="flex justify-between items-start mb-3">
                                                                            <div>
                                                                                <h4 className="font-hanken-bold text-white text-base line-clamp-1">{rev.title}</h4>
                                                                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                                                    <span className="font-hanken-med text-gray-300">{rev.userId?.username || "Anonymous"}</span>
                                                                                    <span>•</span>
                                                                                    <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 text-xs font-hanken-bold">
                                                                                    Rating: {rev.rating.toFixed(1)}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <p className="text-gray-300 text-sm font-hanken-light leading-relaxed whitespace-pre-wrap line-clamp-6 hover:line-clamp-none transition-all duration-300 cursor-pointer">
                                                                            {rev.review}
                                                                        </p>

                                                                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                                                                            <button
                                                                                onClick={() => handleLikeReview(rev._id)}
                                                                                className={`flex items-center gap-1.5 text-xs font-hanken-med transition cursor-pointer ${hasLikedReview ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
                                                                                    }`}
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill={hasLikedReview ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.757c1.27 0 1.912 1.537 1.01 2.44L12.8 20.4a1 1 0 01-1.4 0L4.232 12.44C3.33 11.537 3.972 10 5.243 10H10V4a2 2 0 012-2h0a2 2 0 012 2v6z" />
                                                                                </svg>
                                                                                Helpful ({rev.likes?.length || 0})
                                                                            </button>

                                                                            {isOwnReview && (
                                                                                <button
                                                                                    onClick={() => handleDeleteReview(rev._id)}
                                                                                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer font-hanken-med transition"
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 text-gray-500 font-hanken-light text-sm">
                                                            No reviews yet. Be the first to share your opinion!
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Comments List */}
                                                <div className="bg-[#28161D]/25 border border-white/5 rounded-2xl p-6 shadow-lg space-y-6">
                                                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="font-hanken-bold text-lg text-white">Discussions</h3>
                                                            <span className="text-xs text-gray-500 font-hanken-light">({comments.length})</span>
                                                        </div>
                                                        <select
                                                            value={commentsSort}
                                                            onChange={(e) => setCommentsSort(e.target.value)}
                                                            className="bg-neutral/80 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gray-300 font-hanken-med cursor-pointer hover:border-white/20 transition"
                                                        >
                                                            <option value="top">Top Voted</option>
                                                            <option value="new">Newest</option>
                                                        </select>
                                                    </div>

                                                    {/* Comment Post Input Box */}
                                                    <form onSubmit={handleAddComment} className="space-y-3">
                                                        <textarea
                                                            placeholder="Add to the discussion..."
                                                            readOnly={!authStatus}
                                                            value={authStatus ? newCommentText : ''}
                                                            onChange={(e) => setNewCommentText(e.target.value)}
                                                            onClick={() => {
                                                                if (!authStatus) {
                                                                    dispatch(showToast({ message: "Create an account to save anime, rate shows, and personalize recommendations.", type: "info" }));
                                                                    navigate('/login');
                                                                }
                                                            }}
                                                            rows={3}
                                                            maxLength={1000}
                                                            className="w-full bg-neutral/65 border border-white/10 rounded-xl p-3.5 text-sm text-tertiary placeholder-gray-500 focus:outline-none focus:border-primary/50 transition duration-300 font-hanken-light resize-none cursor-pointer"
                                                        />
                                                        {!authStatus ? (
                                                            <div className="flex justify-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        dispatch(showToast({ message: "Create an account to save anime, rate shows, and personalize recommendations.", type: "info" }));
                                                                        navigate('/login');
                                                                    }}
                                                                    className="px-5 py-1.5 bg-primary hover:bg-primary-light text-white font-hanken-bold text-xs rounded-full uppercase tracking-wider transition cursor-pointer shadow-md"
                                                                >
                                                                    Post Comment
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between items-center">
                                                                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isCommentSpoiler}
                                                                        onChange={(e) => setIsCommentSpoiler(e.target.checked)}
                                                                        className="accent-primary"
                                                                    />
                                                                    Mark comment as containing spoilers
                                                                </label>
                                                                <button
                                                                    type="submit"
                                                                    className="px-5 py-1.5 bg-primary hover:bg-primary-light text-white font-hanken-bold text-xs rounded-full uppercase tracking-wider transition cursor-pointer shadow-md"
                                                                >
                                                                    Post Comment
                                                                </button>
                                                            </div>
                                                        )}
                                                    </form>

                                                    {/* Comment Items Container */}
                                                    {comments.length > 0 ? (
                                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                                            {comments.map((comment) => {
                                                                const isOwnComment = authStatus && userData && String(comment.userId?._id) === String(userData._id);
                                                                const hasLikedComment = authStatus && userData && comment.likes?.includes(userData._id);
                                                                const isEditing = editingCommentId === comment._id;

                                                                return (
                                                                    <div key={comment._id} className="flex gap-3 bg-secondary/5 border border-white/5 rounded-xl p-4 transition duration-300 relative group">

                                                                        {/* Left: User Initials/Avatar */}
                                                                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/45 flex items-center justify-center shrink-0 font-hanken-bold text-xs text-primary shadow-inner">
                                                                            {comment.userId?.username ? comment.userId.username.substring(0, 2).toUpperCase() : '?'}
                                                                        </div>

                                                                        {/* Right: Content */}
                                                                        <div className="flex-1 space-y-2">
                                                                            <div className="flex justify-between items-start">
                                                                                <div className="flex items-center gap-2 text-xs">
                                                                                    <span className="font-hanken-bold text-tertiary">{comment.userId?.username || "Anonymous"}</span>
                                                                                    <span className="text-gray-500 font-hanken-light">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                                                    {comment.spoilers && (
                                                                                        <span className="px-2 py-0.2 rounded bg-red-500/15 text-[9px] text-red-300 font-hanken-bold uppercase tracking-wider">
                                                                                            Spoiler
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Comment Content Display/Edit */}
                                                                            {isEditing ? (
                                                                                <div className="space-y-3">
                                                                                    <textarea
                                                                                        value={editingCommentText}
                                                                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                                                                        rows={2}
                                                                                        maxLength={1000}
                                                                                        className="w-full bg-neutral/80 border border-white/10 rounded-lg p-2 text-sm text-tertiary focus:outline-none focus:border-primary/50 transition font-hanken-light"
                                                                                    />
                                                                                    <div className="flex justify-between items-center">
                                                                                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={editingCommentSpoiler}
                                                                                                onChange={(e) => setEditingCommentSpoiler(e.target.checked)}
                                                                                                className="accent-primary"
                                                                                            />
                                                                                            Spoilers
                                                                                        </label>
                                                                                        <div className="flex gap-2">
                                                                                            <button
                                                                                                onClick={() => setEditingCommentId(null)}
                                                                                                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-hanken-bold rounded-full transition"
                                                                                            >
                                                                                                Cancel
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleEditComment(comment._id)}
                                                                                                className="px-3 py-1 bg-primary hover:bg-primary-light text-white text-xs font-hanken-bold rounded-full transition"
                                                                                            >
                                                                                                Save
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                /* Render spoilers wrap */
                                                                                comment.spoilers && !revealedSpoilers.includes(comment._id) ? (
                                                                                    <div
                                                                                        onClick={() => toggleRevealSpoiler(comment._id)}
                                                                                        className="bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-300 text-xs px-4 py-3 rounded-lg cursor-pointer flex flex-col items-center gap-0.5 transition duration-300 select-none font-hanken-med"
                                                                                    >
                                                                                        <span className="font-hanken-bold text-[10px] tracking-wider uppercase">[Spoiler Warning]</span>
                                                                                        <span className="text-[10px] text-gray-400">Click to Reveal</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="relative">
                                                                                        <p className="text-gray-300 text-sm leading-relaxed font-hanken-light whitespace-pre-wrap">
                                                                                            {comment.content}
                                                                                        </p>
                                                                                        {comment.spoilers && (
                                                                                            <span
                                                                                                onClick={() => toggleRevealSpoiler(comment._id)}
                                                                                                className="inline-block mt-2 text-[9px] text-red-400 hover:text-red-300 cursor-pointer font-hanken-med underline select-none"
                                                                                            >
                                                                                                Hide Spoiler
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                )
                                                                            )}

                                                                            {/* Comment Action Footer (like, edit, delete) */}
                                                                            {!isEditing && (
                                                                                <div className="flex justify-between items-center pt-2 text-xs">
                                                                                    <button
                                                                                        onClick={() => handleLikeComment(comment._id)}
                                                                                        className={`flex items-center gap-1 font-hanken-med transition cursor-pointer ${hasLikedComment ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
                                                                                            }`}
                                                                                    >
                                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill={hasLikedComment ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.757c1.27 0 1.912 1.537 1.01 2.44L12.8 20.4a1 1 0 01-1.4 0L4.232 12.44C3.33 11.537 3.972 10 5.243 10H10V4a2 2 0 012-2h0a2 2 0 012 2v6z" />
                                                                                        </svg>
                                                                                        Like ({comment.likes?.length || 0})
                                                                                    </button>

                                                                                    {isOwnComment && (
                                                                                        <div className="flex gap-2">
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setEditingCommentId(comment._id);
                                                                                                    setEditingCommentText(comment.content);
                                                                                                    setEditingCommentSpoiler(comment.spoilers);
                                                                                                }}
                                                                                                className="text-gray-500 hover:text-gray-300 cursor-pointer transition font-hanken-med"
                                                                                            >
                                                                                                Edit
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleDeleteComment(comment._id)}
                                                                                                className="text-red-400 hover:text-red-300 cursor-pointer transition font-hanken-med"
                                                                                            >
                                                                                                Delete
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 text-gray-500 font-hanken-light text-sm">
                                                            No discussion comments yet. Start the conversation!
                                                        </div>
                                                    )}

                                                </div>

                                            </div>

                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </article>
                </div>

                {/* Bottom Recommendations Row */}
                <section className='mt-16 border-t border-white/5 pt-8'>
                    <h3 className='text-xl md:text-2xl font-hanken-bold mb-6 text-white tracking-wide'>
                        Recommended Similar Anime
                    </h3>
                    {loadingRecs ? (
                        <Carousel isLoading={true} />
                    ) : formattedRecs.length > 0 ? (
                        <Carousel elements={formattedRecs} />
                    ) : (
                        <div className="text-gray-500 font-hanken-light py-8 text-center bg-secondary/5 rounded-2xl border border-white/5">
                            No recommendations available for this title.
                        </div>
                    )}
                </section>
            </main>

            {/* Immersive YouTube Trailer Modal */}
            {isTrailerOpen && trailerEmbedUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
                    <div className="relative w-full max-w-4xl mx-4 aspect-video bg-neutral border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <button
                            onClick={() => setIsTrailerOpen(false)}
                            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/70 flex items-center justify-center hover:bg-primary transition text-white border border-white/10 cursor-pointer shadow-lg"
                            aria-label="Close trailer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <iframe
                            src={`${trailerEmbedUrl}${trailerEmbedUrl.includes('?') ? '&' : '?'}autoplay=1&enablejsapi=1`}
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            className="w-full h-full border-0"
                            title={data?.title || 'Anime trailer'}
                        />
                    </div>
                </div>
            )}

            {/* Write Review Modal */}
            {isReviewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
                    <div className="relative w-full max-w-2xl mx-4 bg-[#1a0c10] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="text-xl font-hanken-bold text-white">Write a Review</h3>
                            <button
                                onClick={() => setIsReviewModalOpen(false)}
                                className="text-gray-400 hover:text-white cursor-pointer transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleAddReview} className="space-y-4">
                            {/* Rating Slider inside review form */}
                            <div className="space-y-2">
                                <label className="block text-sm font-hanken-bold text-gray-300">Your Rating: {reviewRating.toFixed(1)} / 10</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="10"
                                    step="0.5"
                                    value={reviewRating}
                                    onChange={(e) => setReviewRating(Number(e.target.value))}
                                    className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <label className="block text-sm font-hanken-bold text-gray-300">Review Summary Title</label>
                                <input
                                    type="text"
                                    placeholder="Sum up your thoughts in a short title..."
                                    maxLength={150}
                                    required
                                    value={reviewTitle}
                                    onChange={(e) => setReviewTitle(e.target.value)}
                                    className="w-full bg-neutral/80 border border-white/10 rounded-xl p-3 text-sm text-tertiary focus:outline-none focus:border-primary/50 transition font-hanken-light"
                                />
                            </div>

                            {/* Review body */}
                            <div className="space-y-2">
                                <label className="block text-sm font-hanken-bold text-gray-300">Review (Long-form)</label>
                                <textarea
                                    placeholder="Write your detailed review here. Be constructive and outline what you liked or disliked about this anime..."
                                    maxLength={5000}
                                    required
                                    rows={8}
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    className="w-full bg-[#17090c] border border-white/10 rounded-xl p-3 text-sm text-tertiary focus:outline-none focus:border-primary/50 transition font-hanken-light resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsReviewModalOpen(false)}
                                    className="px-5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-hanken-bold rounded-full transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingReview}
                                    className="px-5 py-2 bg-primary hover:bg-primary-light text-white text-sm font-hanken-bold rounded-full transition cursor-pointer disabled:opacity-50 shadow-lg hover:shadow-primary/30"
                                >
                                    {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InfoComponent;