import {Router} from 'express';
import { login, signUp, logout, generateOtp, updatePassword } from '../Controller/auth.controller.js';

const router = Router();

router.route("/signup").post(signUp)
router.route("/login").post(login)
router.route("/logout").post(logout)
router.route("/generate-otp").post(generateOtp)
router.route("/update-password").post(updatePassword)

export default router;

