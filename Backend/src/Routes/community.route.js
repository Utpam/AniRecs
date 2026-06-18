import { Router } from 'express';
import {
  authenticate,
  postRating,
  getRatingInfo,
  addComment,
  getComments,
  editComment,
  deleteComment,
  likeComment,
  addReview,
  getReviews,
  deleteReview,
  likeReview
} from '../Controller/community.controller.js';

const router = Router();

// Ratings routes
router.route('/rating').post(authenticate, postRating);
router.route('/rating/:mal_id').get(getRatingInfo);

// Comments routes
router.route('/comments').post(authenticate, addComment);
router.route('/comments/:mal_id').get(getComments);
router.route('/comments/:commentId')
  .put(authenticate, editComment)
  .delete(authenticate, deleteComment);
router.route('/comments/:commentId/like').post(authenticate, likeComment);

// Reviews routes
router.route('/reviews').post(authenticate, addReview);
router.route('/reviews/:mal_id').get(getReviews);
router.route('/reviews/:reviewId').delete(authenticate, deleteReview);
router.route('/reviews/:reviewId/like').post(authenticate, likeReview);

export default router;
