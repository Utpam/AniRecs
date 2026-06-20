import jwt from 'jsonwebtoken';
import { User } from '../Model/User.model.js';
import { AnimeDoc } from '../Model/Anime.model.js';
import { AnimeReview } from '../Model/Review.model.js';
import { ApiError } from '../Utils/ApiError.js';

export const getUser = async (req, res) => {
    try {
        const { accessToken } = req.cookies || {};
        
        if (!accessToken) {
            return res.status(400).json({ message: 'No valid access token!' });
        }

        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        if (!decodedToken?._id) {
            return res.status(400).json({ message: 'Error to get user!' });
        }

        const user = await User.findById(decodedToken._id).select('-password -refreshToken');

        if (!user) {
            return res.status(404).json({ message: 'User not found!' });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error('Error to get user:', error);
        return res.status(500).json({ message: 'Error to get user' });
    }
};

export const getProfileDashboard = async (req, res) => {
    try {
        const { accessToken } = req.cookies || {};
        if (!accessToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        if (!decodedToken?._id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(decodedToken._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const watchlistMalIds = user.watchlist.map(w => Number(w.animeId));
        const favoritesMalIds = user.favorites.map(Number);
        const uniqueMalIds = [...new Set([...watchlistMalIds, ...favoritesMalIds])];

        const animeDocs = await AnimeDoc.find({ mal_id: { $in: uniqueMalIds } });
        const animeMap = new Map();
        animeDocs.forEach(doc => {
            animeMap.set(String(doc.mal_id), doc);
        });

        const populatedWatchlist = user.watchlist.map(item => {
            const anime = animeMap.get(String(item.animeId));
            return {
                animeId: item.animeId,
                status: item.status,
                updatedAt: item.updatedAt,
                title: anime?.title || 'Unknown Title',
                poster: anime?.image || '',
                score: anime?.score || 0,
                communityRating: anime?.averageUserRating || 0,
                genres: ((anime?.genre && anime.genre.length) ? anime.genre : (anime?.genres || [])).map(g => typeof g === 'string' ? g : g.name) || [],
            };
        });

        const populatedFavorites = user.favorites.map(favId => {
            const anime = animeMap.get(String(favId));
            return {
                animeId: String(favId),
                title: anime?.title || 'Unknown Title',
                poster: anime?.image || '',
                score: anime?.score || 0,
                communityRating: anime?.averageUserRating || 0,
                genres: ((anime?.genre && anime.genre.length) ? anime.genre : (anime?.genres || [])).map(g => typeof g === 'string' ? g : g.name) || [],
            };
        });

        const reviewsCount = await AnimeReview.countDocuments({ userId: user._id });

        return res.status(200).json({
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar || '',
                createdAt: user.createdAt,
                completedCount: user.completedAnime?.length || 0,
                watchedCount: user.watchedAnime?.length || 0,
                watchlistCount: user.watchlist?.length || 0,
                favoritesCount: user.favorites?.length || 0,
                reviewsCount
            },
            watchlist: populatedWatchlist,
            favorites: populatedFavorites
        });

    } catch (error) {
        console.error("Profile dashboard fetch error:", error);
        return res.status(500).json({ message: 'Failed to fetch profile dashboard details.' });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { accessToken } = req.cookies || {};
        if (!accessToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        if (!decodedToken?._id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { username, avatar } = req.body;

        const user = await User.findById(decodedToken._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (username !== undefined) {
            const trimmedUsername = username.trim();
            if (trimmedUsername !== user.username) {
                // Validate username format
                const usernameRegex = /^[A-Za-z0-9][A-Za-z0-9@#$\-_]{2,19}$/;
                if (!usernameRegex.test(trimmedUsername)) {
                    return res.status(400).json({ message: "Usernames can only contain alphanumeric characters, underscores, hyphens, and standard symbols (@, #, $, _) and must be 3-20 characters long." });
                }

                // Check if username is taken
                const existingUser = await User.findOne({ username: trimmedUsername });
                if (existingUser) {
                    return res.status(400).json({ message: "Username is already taken." });
                }
                user.username = trimmedUsername;
            }
        }

        if (avatar !== undefined) {
            user.avatar = avatar;
        }

        await user.save();

        const updatedUser = await User.findById(user._id).select('-password -refreshToken');
        return res.status(200).json(updatedUser);

    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({ message: 'Failed to update user profile.' });
    }
};

export const resetRecommendations = async (req, res) => {
    try {
        const { accessToken } = req.cookies || {};
        if (!accessToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        if (!decodedToken?._id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { type } = req.body;
        if (!type) {
            return res.status(400).json({ message: 'Reset type is required.' });
        }

        const user = await User.findById(decodedToken._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (type === 'profile') {
            user.onboardingCompleted = false;
            user.coldStartPreferences = { favoriteAnime: [], favoriteGenres: [], favoriteThemes: [] };
            user.interactions = [];
            user.cachedRecommendations = { data: null, updatedAt: null };
        } else if (type === 'genres') {
            user.coldStartPreferences.favoriteGenres = [];
            user.cachedRecommendations = { data: null, updatedAt: null };
        } else if (type === 'themes') {
            user.coldStartPreferences.favoriteThemes = [];
            user.cachedRecommendations = { data: null, updatedAt: null };
        } else if (type === 'cache') {
            user.cachedRecommendations = { data: null, updatedAt: null };
        } else if (type === 'onboarding') {
            user.onboardingCompleted = false;
            user.cachedRecommendations = { data: null, updatedAt: null };
        } else {
            return res.status(400).json({ message: `Invalid reset type: ${type}` });
        }

        await user.save();

        const updatedUser = await User.findById(user._id).select('-password -refreshToken');
        return res.status(200).json(updatedUser);

    } catch (error) {
        console.error("Reset recommendations error:", error);
        return res.status(500).json({ message: 'Failed to reset recommendation data.' });
    }
};