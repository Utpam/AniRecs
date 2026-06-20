import express, { Router } from 'express';
import dotenv from "dotenv";
import { connectDB } from "./src/DB/db.js";
import { initCronJobs } from './src/Utils/cronJobs.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { sendMail } from './src/Utils/EmailSender.js';

dotenv.config({path: '/.env'});

const PORT = process.env.PORT;
const app = express();

// sendMail('reebubkl@gmail.com',{otp: 2035,username: 'Utpam',expiry_minutes: 5})

// CONNECT DB
connectDB();
initCronJobs();


// Middleware
app.use(cors({  
    origin: [process.env.CORS_ORIGIN, process.env.CORS_FRONTEND_ORIGIN],
    credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import authRouter from './src/Routes/auth.route.js';
import animeRouter from './src/Routes/anime.route.js';
import userRouter from  './src/Routes/user.route.js';
import recommendationRouter from './src/Routes/recommendation.route.js';
import communityRouter from './src/Routes/community.route.js';
import searchRouter from './src/Routes/search.route.js';
import { getHomeFeed } from './src/Controller/recommendation.controller.js';

// Routes   
app.use('/api/user/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/anime', animeRouter);
app.use('/api/recommendations', recommendationRouter);
app.use('/api/community', communityRouter);
app.use('/api/search', searchRouter);
app.get('/home-feed', getHomeFeed);

app.listen(PORT, () => {
    console.log("Server Is Running on : ", PORT);
})