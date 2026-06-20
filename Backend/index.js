import express from 'express';
import dotenv from "dotenv";
import { connectDB } from "./src/DB/db.js";
import { initCronJobs } from './src/Utils/cronJobs.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Dynamically allow localhost in development and the deployed Vercel domain in
// production. Both must be explicit when credentials (cookies) are in use —
// a wildcard origin is not permitted with credentials by the browser.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / curl requests (no Origin header)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Connect ───────────────────────────────────────────────────────────────────
connectDB();
initCronJobs();

// ── Routes ────────────────────────────────────────────────────────────────────
import authRouter from './src/Routes/auth.route.js';
import animeRouter from './src/Routes/anime.route.js';
import userRouter from  './src/Routes/user.route.js';
import recommendationRouter from './src/Routes/recommendation.route.js';
import communityRouter from './src/Routes/community.route.js';
import searchRouter from './src/Routes/search.route.js';
import { getHomeFeed } from './src/Controller/recommendation.controller.js';

app.use('/api/user/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/anime', animeRouter);
app.use('/api/recommendations', recommendationRouter);
app.use('/api/community', communityRouter);
app.use('/api/search', searchRouter);
app.get('/api/home-feed', getHomeFeed);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: Date.now(),
  });
});

// ── Listen ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`[cors]   Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});