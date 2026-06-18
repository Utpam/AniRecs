import { Router } from 'express';
import { getUser, getProfileDashboard, updateUserProfile, resetRecommendations } from '../Controller/user.controller.js';

const router = Router();

router.route('/getuser').get(getUser);
router.route('/profile-dashboard').get(getProfileDashboard);
router.route('/update-profile').put(updateUserProfile);
router.route('/reset-recommendations').post(resetRecommendations);

export default router;

