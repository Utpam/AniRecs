  import jwt from 'jsonwebtoken';
import { User } from '../Model/User.model.js';
import { AnimeDoc } from '../Model/Anime.model.js';
import { AnimeRating } from '../Model/Rating.model.js';
import { AnimeComment } from '../Model/Comment.model.js';
import { AnimeReview } from '../Model/Review.model.js';
import mongoose from 'mongoose';

// Middleware to authenticate user from token in cookies
export const authenticate = async (req, res, next) => {
  try {
    const { accessToken } = req.cookies || {};
    if (!accessToken) {
      return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded?._id) {
      return res.status(401).json({ message: 'Unauthorized. Invalid token.' });
    }
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized. User not found.' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: 'Unauthorized. Authentication failed.' });
  }
};

// Helper to get optional user ID (for guest requests)
const getOptionalUserId = (req) => {
  const { accessToken } = req.cookies || {};
  if (!accessToken) return null;
  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    return decoded?._id || null;
  } catch (error) {
    return null;
  }
};

// Helper to update average score on AnimeDoc, AnimeRating, and User ratings
const updateRatingHelper = async (userId, animeDoc, rating) => {
  // 1. Create or update AnimeRating document
  await AnimeRating.findOneAndUpdate(
    { animeId: animeDoc._id, userId },
    { rating },
    { upsert: true, new: true }
  );

  // 2. Aggregate statistics for AnimeDoc
  const stats = await AnimeRating.aggregate([
    { $match: { animeId: animeDoc._id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        count: { $sum: 1 }
      }
    }
  ]);

  const averageUserRating = stats.length > 0 ? stats[0].averageRating : 0;
  const ratingCount = stats.length > 0 ? stats[0].count : 0;

  // Update AnimeDoc
  animeDoc.averageUserRating = Number(averageUserRating.toFixed(2));
  animeDoc.ratingCount = ratingCount;
  await animeDoc.save();

  // 3. Update User ratings list
  const user = await User.findById(userId);
  if (user) {
    const malIdStr = String(animeDoc.mal_id);
    const existingIndex = user.ratings.findIndex(r => String(r.animeId) === malIdStr);
    if (existingIndex > -1) {
      user.ratings[existingIndex].rating = rating;
      user.ratings[existingIndex].updatedAt = new Date();
    } else {
      user.ratings.push({ animeId: malIdStr, rating, updatedAt: new Date() });
    }
    
    // Invalidate recommendations cache to trigger immediate update
    user.cachedRecommendations = { data: null, updatedAt: null };
    await user.save();
  }
};

/**
 * RATING CONTROLLERS
 */
export const postRating = async (req, res) => {
  try {
    const { mal_id, rating } = req.body;
    const numRating = Number(rating);
    if (!mal_id || isNaN(numRating) || numRating < 0.5 || numRating > 10) {
      return res.status(400).json({ message: 'Invalid anime ID or rating. Rating must be between 0.5 and 10.' });
    }

    const animeDoc = await AnimeDoc.findOne({ mal_id: Number(mal_id) });
    if (!animeDoc) {
      return res.status(404).json({ message: 'Anime not found in database.' });
    }

    await updateRatingHelper(req.user._id, animeDoc, numRating);

    return res.status(200).json({
      message: 'Rating submitted successfully.',
      averageUserRating: animeDoc.averageUserRating,
      ratingCount: animeDoc.ratingCount,
      userRating: numRating
    });
  } catch (error) {
    console.error("Post rating error:", error);
    return res.status(500).json({ message: 'Failed to submit rating.' });
  }
};

export const getRatingInfo = async (req, res) => {
  try {
    const { mal_id } = req.params;
    const animeDoc = await AnimeDoc.findOne({ mal_id: Number(mal_id) });
    if (!animeDoc) {
      return res.status(404).json({ message: 'Anime not found.' });
    }

    // Check current user's rating if logged in
    let userRating = null;
    const userId = getOptionalUserId(req);
    if (userId) {
      const ratingDoc = await AnimeRating.findOne({ animeId: animeDoc._id, userId });
      if (ratingDoc) {
        userRating = ratingDoc.rating;
      }
    }

    // Calculate score distribution
    const distributionStats = await AnimeRating.aggregate([
      { $match: { animeId: animeDoc._id } },
      {
        $group: {
          _id: { $round: "$rating" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Initialize distribution dictionary (bins 1 to 10)
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    distributionStats.forEach(stat => {
      const score = stat._id;
      if (score >= 1 && score <= 10) {
        distribution[score] = stat.count;
      }
    });

    return res.status(200).json({
      mal_id: animeDoc.mal_id,
      averageUserRating: animeDoc.averageUserRating || 0,
      ratingCount: animeDoc.ratingCount || 0,
      malRating: animeDoc.mal_rating || 0,
      userRating,
      distribution
    });
  } catch (error) {
    console.error("Get rating info error:", error);
    return res.status(500).json({ message: 'Failed to fetch rating info.' });
  }
};

/**
 * COMMENT CONTROLLERS
 */
export const addComment = async (req, res) => {
  try {
    const { mal_id, content, spoilers } = req.body;
    if (!mal_id || !content || content.trim() === '') {
      return res.status(400).json({ message: 'Missing anime ID or comment content.' });
    }

    const animeDoc = await AnimeDoc.findOne({ mal_id: Number(mal_id) });
    if (!animeDoc) {
      return res.status(404).json({ message: 'Anime not found.' });
    }

    const comment = await AnimeComment.create({
      animeId: animeDoc._id,
      userId: req.user._id,
      content: content.trim(),
      spoilers: !!spoilers
    });

    const user = await User.findById(req.user._id);
    if (user) {
      user.cachedRecommendations = { data: null, updatedAt: null };
      await user.save();
    }

    const populatedComment = await AnimeComment.findById(comment._id).populate('userId', 'username');

    return res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({ message: 'Failed to add comment.' });
  }
};

export const getComments = async (req, res) => {
  try {
    const { mal_id } = req.params;
    const { sortBy } = req.query; // 'new' or 'top'

    const animeDoc = await AnimeDoc.findOne({ mal_id: Number(mal_id) });
    if (!animeDoc) {
      return res.status(404).json({ message: 'Anime not found.' });
    }

    const comments = await AnimeComment.find({ animeId: animeDoc._id })
      .populate('userId', 'username')
      .lean();

    if (sortBy === 'top') {
      comments.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else {
      comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.status(200).json(comments);
  } catch (error) {
    console.error("Get comments error:", error);
    return res.status(500).json({ message: 'Failed to fetch comments.' });
  }
};

export const editComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, spoilers } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Content cannot be empty.' });
    }

    const comment = await AnimeComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized. You can only edit your own comment.' });
    }

    comment.content = content.trim();
    if (spoilers !== undefined) {
      comment.spoilers = !!spoilers;
    }

    await comment.save();
    const populatedComment = await AnimeComment.findById(comment._id).populate('userId', 'username');

    return res.status(200).json(populatedComment);
  } catch (error) {
    console.error("Edit comment error:", error);
    return res.status(500).json({ message: 'Failed to edit comment.' });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await AnimeComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized. You can only delete your own comment.' });
    }

    await AnimeComment.deleteOne({ _id: commentId });

    const user = await User.findById(req.user._id);
    if (user) {
      user.cachedRecommendations = { data: null, updatedAt: null };
      await user.save();
    }

    return res.status(200).json({ message: 'Comment deleted successfully.', commentId });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({ message: 'Failed to delete comment.' });
  }
};

export const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await AnimeComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const index = comment.likes.indexOf(userId);
    if (index > -1) {
      comment.likes.splice(index, 1);
    } else {
      comment.likes.push(userId);
    }

    await comment.save();
    const populatedComment = await AnimeComment.findById(comment._id).populate('userId', 'username');

    return res.status(200).json(populatedComment);
  } catch (error) {
    console.error("Like comment error:", error);
    return res.status(500).json({ message: 'Failed to toggle like on comment.' });
  }
};

/**
 * REVIEW CONTROLLERS
 */
export const addReview = async (req, res) => {
  try {
    const { mal_id, rating, title, review } = req.body;
    const numRating = Number(rating);

    if (!mal_id || isNaN(numRating) || numRating < 0.5 || numRating > 10 || !title || !review) {
      return res.status(400).json({ message: 'Invalid inputs. rating, title, and review are required.' });
    }

    const animeDoc = await AnimeDoc.findOne({ mal_id: Number(mal_id) });
    if (!animeDoc) {
      return res.status(404).json({ message: 'Anime not found.' });
    }

    // Upsert the review
    const reviewDoc = await AnimeReview.findOneAndUpdate(
      { animeId: animeDoc._id, userId: req.user._id },
      { rating: numRating, title: title.trim(), review: review.trim() },
      { upsert: true, new: true }
    );

    // Submit rating automatically when review is submitted
    await updateRatingHelper(req.user._id, animeDoc, numRating);

    const populatedReview = await AnimeReview.findById(reviewDoc._id).populate('userId', 'username');

    return res.status(201).json(populatedReview);
  } catch (error) {
    console.error("Add review error:", error);
    return res.status(500).json({ message: 'Failed to submit review.' });
  }
};

export const getReviews = async (req, res) => {
  try {
    const { mal_id } = req.params;
    const { sortBy } = req.query; // 'new' or 'top'

    const animeDoc = await AnimeDoc.findOne({ mal_id: Number(mal_id) });
    if (!animeDoc) {
      return res.status(404).json({ message: 'Anime not found.' });
    }

    const reviews = await AnimeReview.find({ animeId: animeDoc._id })
      .populate('userId', 'username')
      .lean();

    if (sortBy === 'top') {
      reviews.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else {
      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.status(200).json(reviews);
  } catch (error) {
    console.error("Get reviews error:", error);
    return res.status(500).json({ message: 'Failed to fetch reviews.' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await AnimeReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized. You can only delete your own review.' });
    }

    await AnimeReview.deleteOne({ _id: reviewId });

    const user = await User.findById(req.user._id);
    if (user) {
      user.cachedRecommendations = { data: null, updatedAt: null };
      await user.save();
    }

    return res.status(200).json({ message: 'Review deleted successfully.', reviewId });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({ message: 'Failed to delete review.' });
  }
};

export const likeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await AnimeReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    const index = review.likes.indexOf(userId);
    if (index > -1) {
      review.likes.splice(index, 1);
    } else {
      review.likes.push(userId);
    }

    await review.save();
    const populatedReview = await AnimeReview.findById(review._id).populate('userId', 'username');

    return res.status(200).json(populatedReview);
  } catch (error) {
    console.error("Like review error:", error);
    return res.status(500).json({ message: 'Failed to toggle like on review.' });
  }
};
