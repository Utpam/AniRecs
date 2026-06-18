import { Router } from 'express';
import {
  getRecommendations,
  postInteraction,
  postColdStart,
  toggleUserList,
  precomputeAnimeVectors,
  getHomeFeed,
  postAction,
  getGenreList,
} from '../Controller/recommendation.controller.js';

const router = Router();

// Recommendation pipeline and engine pathways
router.route('/').get(getRecommendations);
router.route('/home-feed').get(getHomeFeed);
router.route('/interaction').post(postInteraction);
router.route('/coldstart').post(postColdStart);
router.route('/list-toggle').post(toggleUserList);
router.route('/precompute-vectors').post(precomputeAnimeVectors);
router.route('/action').post(postAction);
router.route('/genres').get(getGenreList);

export default router;
