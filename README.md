<div align="center">

<img src="Frontend/public/logo.svg" alt="AniRecs Logo" width="80" height="80" />

# AniRecs

**Personalized Anime Discovery & Recommendation Platform**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=for-the-badge&logo=redux&logoColor=white)](https://redux-toolkit.js.org)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

*Discover. Track. Rate. Recommend.*

[Live Demo](#) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Recommendation Engine](#-recommendation-engine)
- [Database Design](#-database-design)
- [Tech Stack](#-tech-stack)
- [Screenshots](#-screenshots)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development Setup](#local-development-setup)
  - [Environment Variables](#environment-variables)
- [Folder Structure](#-folder-structure)
- [API Reference](#-api-reference)
- [Database Seeding Guide](#-database-seeding-guide)
- [Production Deployment](#-production-deployment)
- [Developer Commands](#-developer-commands)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**AniRecs** is a full-stack anime recommendation platform built for anime enthusiasts who want more than a plain catalog. It combines a personalized recommendation engine with community features, anime tracking, and intelligent content discovery — all wrapped in a premium, dark-themed UI.

Unlike services that surface the same popular titles to every user, AniRecs builds a **real-time preference vector** per user, scores the entire anime catalog against it using cosine similarity, then injects exploration, trending boosts, and hidden-gem discovery to keep recommendations fresh and surprising.

### What makes AniRecs different?

| Feature | AniRecs | Typical Catalog Site |
|---|---|---|
| Personalized recommendations | ✅ Per-user content vectors | ❌ Generic "popular" lists |
| Recommendation explanations | ✅ Why this was recommended | ❌ None |
| Diversity control | ✅ Prevents genre monotony | ❌ Echo chamber |
| Community scoring | ✅ Separate from MAL score | ❌ External score only |
| Offline-capable metadata | ✅ Self-hosted in MongoDB | ❌ Real-time API calls |
| Interaction-aware engine | ✅ Learns from clicks, drops, hides | ❌ Static lists |

---

## ✨ Key Features

### 🔐 Authentication
- Secure **JWT-based** signup and login with access + refresh token rotation
- Password hashing with **bcrypt** (10 salt rounds)
- OTP-based password reset via SendGrid
- Protected routes on both client and server

### 🔍 Anime Discovery
- **Personalized homepage** powered by the recommendation engine
- **Genre-based rows** — each row is a curated slice of the MongoDB catalog filtered by genre tag
- **Trending anime** — ranked by MAL popularity scores
- **Seasonal anime** — filtered by season and year
- **Award-winning anime** — filtered by award genre tag
- **Full-text search** with genre filters, sort options, and Load More pagination
- **Category pages** with infinite-scroll-style pagination

### 🤖 Recommendation Engine
- Hybrid content-based filtering with exploration and trending layers
- Cosine similarity scoring across feature vectors
- Real-time user preference vector updates on every interaction
- Recommendation explanations shown to users
- Diversity balancing to prevent genre echo chambers
- Novelty scoring for hidden gems

### 💬 Community Features
- **Star ratings** (0–10) that power community average scores
- **Reviews** — long-form with like/unlike
- **Comments** — threaded per-anime with edit, delete, like
- All community data is independent of external APIs

### 📋 Anime Tracking
- Watchlist with statuses: `watching`, `planned`, `completed`, `dropped`
- Favorites list
- Watch history and completed lists
- All list actions use **optimistic UI updates** for instant feedback

### 👤 User Dashboard
- Profile page with avatar, username, and bio
- Full watch history, favorites, and completed lists
- Recommendation reset button
- Community rating and review history

### ⚡ Performance
- **Skeleton loaders** on every async component
- **Optimistic updates** for all list and rating actions
- **Cached anime metadata** in MongoDB — zero Jikan calls for browsing
- **Search pagination** with deduplication and appended results

---

## 🏗 System Architecture

### Request Flow

```
┌─────────────────────────────────────┐
│           React Frontend            │
│  (Vite · Redux Toolkit · Axios)     │
└───────────────┬─────────────────────┘
                │ HTTP / REST
                ▼
┌─────────────────────────────────────┐
│         Express.js Backend          │
│  (Node.js · JWT Middleware)         │
│                                     │
│  Routes:                            │
│  /api/auth          → Auth          │
│  /api/anime         → Anime         │
│  /api/search        → Search        │
│  /api/recommendations → Engine      │
│  /api/community     → Ratings etc.  │
│  /api/user          → Profiles      │
└───────────────┬─────────────────────┘
                │ Mongoose ODM
                ▼
┌─────────────────────────────────────┐
│             MongoDB Atlas           │
│                                     │
│  Collections:                       │
│  users · animes · animemetadatas    │
│  reviews · comments                 │
└─────────────────────────────────────┘
```

### Data Ingestion Pipeline

```
┌─────────────────┐
│   Jikan API     │  (MyAnimeList public API)
│  (jikan.moe)    │
└────────┬────────┘
         │ Rate-limited batch fetch
         ▼
┌─────────────────────────────────────┐
│       Data Ingestion Layer          │
│  /api/anime/set endpoint            │
│  • Fetches anime details            │
│  • Fetches characters, relations    │
│  • Fetches streaming/external links │
│  • Fetches OP/ED themes             │
└────────┬────────────────────────────┘
         │ Upsert
         ▼
┌──────────────────────────┐
│      MongoDB Atlas       │
│  AnimeMetadata Collection │
│  + Anime Collection      │
└────────┬─────────────────┘
         │ Served directly
         ▼
┌─────────────────┐
│    Frontend     │  No Jikan calls at runtime
│   (Zero API     │
│  rate limits)   │
└─────────────────┘
```

### Recommendation Pipeline

```
User Interaction (click / watchlist / rate / drop / hide)
         │
         ▼
┌─────────────────────────────────┐
│     Interaction Logger          │
│  Weighted action score stored   │
│  in user.interactions[]         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Preference Vector Builder     │
│  Aggregates weighted genre +    │
│  theme scores into user vector  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Cosine Similarity Engine      │
│  Scores all anime in MongoDB    │
│  against the user preference    │
│  vector in real time            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│     Hybrid Scoring Layer        │
│  70% Content Similarity         │
│  20% Exploration / Novelty      │
│  10% Trending Boost             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Diversity & Dedup Filter     │
│  Prevents repeated genres       │
│  Removes already-seen/hidden    │
└────────┬────────────────────────┘
         │
         ▼
   Ranked Recommendation List
   (with explanation labels)
```

---

## 🧠 Recommendation Engine

The AniRecs recommendation engine is a **content-based hybrid model** with controlled exploration built from scratch — no ML library dependencies.

### Feature Vectors

Every anime in the database is represented as a feature vector encoding:

```
anime_vector = {
  genres:       { "Action": 1, "Fantasy": 1, "Adventure": 1, ... },
  themes:       { "Isekai": 1, "Magic": 1, ... },
  demographics: { "Shounen": 1, ... },
  score:        9.1,
  popularity:   120,
  year:         2023
}
```

Vectors are precomputed and stored in MongoDB, eliminating runtime computation overhead. They are updated whenever new anime metadata is ingested.

### User Preference Vector

A preference vector is built dynamically for each user from their weighted interaction history:

| Interaction | Weight |
|---|---|
| Rate 9–10 | +3.0 |
| Favorite | +2.5 |
| Complete | +2.0 |
| Watchlist | +1.5 |
| Click / Watch | +0.5 |
| Drop | −1.5 |
| Hide | −2.0 |
| Ignore | −0.3 |

Each interaction increments or decrements genre/theme scores in the user's preference vector. The result is a live map: `{ "Fantasy": 14.5, "Action": 9.2, "Romance": -3.0, ... }`.

### Cosine Similarity

Similarity between a user vector **U** and an anime vector **A** is computed as:

```
similarity(U, A) = (U · A) / (||U|| × ||A||)
```

This produces a normalized score from 0 to 1, where 1 is a perfect genre/theme match. All anime in the database are scored and ranked.

### Hybrid Scoring Formula

```
final_score = (0.70 × content_similarity)
            + (0.20 × novelty_score)
            + (0.10 × trending_boost)
```

- **Content Similarity (70%)** — Cosine similarity of user preferences vs. anime features
- **Novelty Score (20%)** — Rewards anime the user hasn't interacted with; penalizes already-seen titles. Creates "hidden gem" discovery opportunities
- **Trending Boost (10%)** — Applies a small boost to currently popular and high-ranked anime to surface culturally relevant titles

### Diversity Control

After ranking, a post-processing step enforces genre diversity:

- The top-N candidates are windowed
- If consecutive slots share the same dominant genre, the next different-genre candidate is promoted
- Prevents the feed from becoming a single-genre echo chamber (e.g., all Isekai)

### Recommendation Explanations

Each recommendation is tagged with a human-readable reason displayed in the UI:

| Tag | Meaning |
|---|---|
| `Because you like Fantasy` | High genre match |
| `Highly rated in your genres` | Content + score boost |
| `Hidden gem you might love` | High novelty score |
| `Trending right now` | Trending boost triggered |
| `Explore something new` | Exploration layer pick |

### Cold Start (New Users)

New users complete a **preference onboarding modal** (ColdStart) where they:
1. Select favorite anime from a curated list
2. Choose preferred genres
3. Choose preferred themes

These selections are stored in `user.coldStartPreferences` and seed the initial preference vector.

---

## 🗄 Database Design

### `users` Collection

```js
{
  username:             String,       // unique, 3–20 chars
  email:                String,       // unique, validated
  password:             String,       // bcrypt hash
  avatar:               String,       // URL
  accessToken:          String,
  refreshToken:         String,

  // Tracking lists
  watchlist: [{
    animeId:  String,
    status:   "watching" | "planned" | "completed" | "dropped",
    updatedAt: Date
  }],
  completedAnime:       [String],     // mal_id array
  watchedAnime:         [String],
  favorites:            [String],
  dropped:              [String],

  // Ratings
  ratings: [{
    animeId:  String,
    rating:   Number,
    updatedAt: Date
  }],

  // Recommendation engine data
  interactions: [{
    animeId:  String,
    type:     "click" | "watchlist" | "favorite" | "rate" | "complete" | "drop" | "hide",
    weight:   Number,
    updatedAt: Date
  }],
  coldStartPreferences: {
    favoriteAnime:  [String],
    favoriteGenres: [String],
    favoriteThemes: [String]
  },
  cachedRecommendations: {
    data:      Mixed,
    updatedAt: Date
  },
  onboardingCompleted:  Boolean,
  timestamps:           true
}
```

### `animes` Collection

Core catalog used by the recommendation engine. ~1,500+ titles.

```js
{
  mal_id:          Number,    // MyAnimeList ID (unique index)
  title:           String,    // Romaji title
  title_english:   String,
  image:           String,    // Poster URL
  synopsis:        String,
  genre:           [{ mal_id: Number, name: String }],
  tags:            [String],
  score:           Number,    // MAL score
  mal_rating:      Number,
  popularity:      Number,
  year:            Number,
  season:          String,
  averageUserRating: Number,  // Community score
  featureVector:   Object,    // Precomputed for cosine similarity
}
```

### `animemetadatas` Collection

Rich metadata cache populated by the Jikan ingestion pipeline. Used for anime detail pages.

```js
{
  mal_id:         Number,
  title:          String,
  title_english:  String,
  title_japanese: String,
  synopsis:       String,
  background:     String,
  images:         Object,     // jpg, webp variants
  genres:         Array,
  themes:         Array,
  demographics:   Array,
  studios:        Array,
  trailer:        Object,     // YouTube embed data
  relations:      Array,
  characters:     Array,
  streaming:      Array,      // Netflix, Crunchyroll etc.
  external:       Array,      // MAL, AniList links
  theme:          Object,     // OP/ED songs
  recommendations: Array,     // MAL-sourced related titles
  score:          Number,
  rank:           Number,
  popularity:     Number,
  episodes:       Number,
  duration:       String,
  source:         String,     // Manga, LN, Original etc.
  season:         String,
  year:           Number,
  cachedAt:       Date
}
```

### `reviews` / `comments` Collections

Community interaction data is stored in dedicated collections linked by `mal_id`, keeping the core anime documents lean.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 |
| **State Management** | Redux Toolkit |
| **Routing** | React Router v6 |
| **Styling** | Tailwind CSS |
| **HTTP Client** | Axios |
| **Build Tool** | Vite |
| **Backend Runtime** | Node.js |
| **Web Framework** | Express.js |
| **Database** | MongoDB Atlas |
| **ODM** | Mongoose |
| **Authentication** | JWT (Access + Refresh tokens) |
| **Password Hashing** | bcryptjs |
| **Email** | SendGrid |
| **External Data** | Jikan API v4 (MyAnimeList) |

---

## 📸 Screenshots

> Screenshots are taken from the live development build.

| Page | Preview |
|---|---|
| **Homepage** | ![Homepage](docs/screenshots/homepage.png) |
| **Anime Details** | ![Anime Details](docs/screenshots/anime-details.png) |
| **Search** | ![Search](docs/screenshots/search.png) |
| **Profile Dashboard** | ![Profile](docs/screenshots/profile.png) |
| **Recommendation Feed** | ![Recommendations](docs/screenshots/recommendations.png) |
| **Login / Signup** | ![Auth](docs/screenshots/auth.png) |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed before proceeding:

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18.0.0 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 9.0.0 | Bundled with Node.js |
| MongoDB | Atlas or local | [mongodb.com](https://mongodb.com/atlas) |
| Git | Any | [git-scm.com](https://git-scm.com) |

---

### Local Development Setup

#### 1. Clone the repository

```bash
git clone https://github.com/your-username/anirecs.git
cd anirecs
```

#### 2. Set up the Backend

```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend/` directory (see [Environment Variables](#environment-variables) below), then start the dev server:

```bash
npm run dev
```

The backend will start at **http://localhost:8000**.

#### 3. Set up the Frontend

Open a new terminal tab/window:

```bash
cd Frontend
npm install
```

Create a `.env` file in the `Frontend/` directory:

```env
VITE_BASE_URL=http://localhost:8000
```

Start the frontend dev server:

```bash
npm run dev
```

The frontend will start at **http://localhost:5173**.

#### 4. Verify the connection

Open http://localhost:5173 in your browser. You should see the AniRecs homepage. If the anime rows appear empty, you need to seed the database — see the [Database Seeding Guide](#-database-seeding-guide) below.

---

### Environment Variables

#### Backend — `Backend/.env`

```env
# ── Server ──────────────────────────────────────────────
PORT=8000

# ── Database ─────────────────────────────────────────────
# MongoDB Atlas connection string (or local: mongodb://localhost:27017/anirecs)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/anirecs?retryWrites=true&w=majority

# ── CORS ─────────────────────────────────────────────────
CORS_ORIGIN=http://localhost:8000
CORS_FRONTEND_ORIGIN=http://localhost:5173

# ── JWT ──────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
ACCESS_TOKEN_SECRET=your_access_token_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d

# ── Email (SendGrid) ─────────────────────────────────────
# Required for OTP-based password reset
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# ── Environment ──────────────────────────────────────────
STATUS=development
```

#### Frontend — `Frontend/.env`

```env
VITE_BASE_URL=http://localhost:8000
```

> **Security Note:** Never commit `.env` files. Both directories include `.env` in `.gitignore`. Rotate any secrets that have been exposed.

---

## 📁 Folder Structure

```
anirecs/
├── Backend/
│   ├── src/
│   │   ├── Controller/
│   │   │   ├── anime.controller.js         # Catalog fetch & category routing
│   │   │   ├── auth.controller.js          # Signup, login, logout, OTP
│   │   │   ├── community.controller.js     # Ratings, comments, reviews
│   │   │   ├── recommendation.controller.js # Engine, vectors, home feed
│   │   │   ├── search.controller.js        # Full-text + genre search
│   │   │   └── user.controller.js          # Profile, dashboard, reset
│   │   ├── DB/
│   │   │   └── db.js                       # MongoDB connection
│   │   ├── Middleware/
│   │   │   └── auth.middleware.js          # JWT verify middleware
│   │   ├── Model/
│   │   │   ├── User.model.js               # User schema + bcrypt + JWT methods
│   │   │   ├── AnimeMetadata.model.js      # Rich metadata (Jikan cache)
│   │   │   └── ...                         # Anime, Review, Comment models
│   │   ├── Routes/
│   │   │   ├── auth.route.js
│   │   │   ├── anime.route.js
│   │   │   ├── community.route.js
│   │   │   ├── recommendation.route.js
│   │   │   ├── search.route.js
│   │   │   └── user.route.js
│   │   └── Utils/
│   │       └── ...                         # Shared utilities
│   ├── .env                                # (not committed)
│   ├── package.json
│   └── index.js                            # Entry point
│
├── Frontend/
│   ├── public/
│   │   ├── bg2.svg                         # Hero background
│   │   └── logo.svg
│   ├── src/
│   │   ├── assets/                         # Icons, static SVGs
│   │   ├── Components/
│   │   │   ├── AnimeCard.jsx               # Reusable anime grid card
│   │   │   ├── Carousel.jsx                # Horizontal scroll genre row
│   │   │   ├── ColdStartModal.jsx          # Onboarding preference picker
│   │   │   ├── FallingParticles.jsx        # Decorative animation
│   │   │   ├── HeroSection.jsx             # Homepage hero banner
│   │   │   ├── HomePageLayout.jsx          # Layout shell for homepage
│   │   │   ├── InfoComponent.jsx           # Full anime detail component
│   │   │   ├── Loader.jsx                  # Skeleton loaders
│   │   │   ├── LoginCard.jsx               # Login form
│   │   │   ├── Navbar.jsx                  # Navigation bar
│   │   │   ├── ProtectedRoute.jsx          # Route guard wrapper
│   │   │   └── SignupCard.jsx              # Signup form
│   │   ├── Pages/
│   │   │   ├── CategoryPage.jsx            # Trending / Seasonal / Award pages
│   │   │   ├── GenrePage.jsx               # Genre-filtered browse page
│   │   │   ├── HomePage.jsx                # Main landing + recommendations
│   │   │   ├── Infopage.jsx                # Anime detail page
│   │   │   ├── LoginPage.jsx               # Login route
│   │   │   ├── ProfilePage.jsx             # User dashboard
│   │   │   ├── RecommendationPage.jsx      # Full recommendation feed
│   │   │   ├── SearchPage.jsx              # Search with filters
│   │   │   └── SignUpPage.jsx              # Signup route
│   │   ├── App.jsx                         # Routes + Redux Provider
│   │   ├── index.css                       # Global design tokens
│   │   └── main.jsx                        # React entry point
│   ├── store/
│   │   └── AuthSlice.js                    # Redux auth + toast + optimistic
│   ├── .env                                # (not committed)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── LICENSE
└── README.md
```

---

## 📡 API Reference

All endpoints are prefixed with the base URL (default: `http://localhost:8000`).

Endpoints marked 🔒 require a valid JWT in an `httpOnly` cookie.

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Create a new user account |
| `POST` | `/api/auth/login` | Public | Login, returns access + refresh tokens |
| `POST` | `/api/auth/logout` | 🔒 | Invalidates the session |
| `POST` | `/api/auth/generate-otp` | Public | Sends OTP to email for password reset |
| `POST` | `/api/auth/update-password` | Public | Updates password using a valid OTP |

**Signup Request Body:**
```json
{
  "username": "animefan123",
  "email": "user@example.com",
  "password": "SecurePass@1"
}
```

**Login Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@1"
}
```

---

### Anime — `/api/anime`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/anime/set` | Public | Trigger Jikan ingestion (seed/refresh) |
| `POST` | `/api/anime/get` | Public | Get anime by array of MAL IDs |
| `POST` | `/api/anime/get-by-category` | Public | Get trending / seasonal / award anime |
| `GET` | `/api/anime/:malId` | Public | Get full anime detail (from metadata cache) |

**Get By Category Request Body:**
```json
{
  "category": "trending"
}
```
> Valid categories: `trending`, `seasonal`, `award`

---

### Search — `/api/search`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search` | Public | Full-text search with filters and pagination |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | `string` | `""` | Search query (title / synopsis) |
| `genre` | `string` | `""` | Filter by genre name |
| `sort` | `string` | `score` | Sort by: `score`, `popularity`, `year`, `rating` |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `24` | Results per page |

**Response:**
```json
{
  "results": [ { "animeId": 52991, "title": "Frieren", "poster": "...", "score": 9.1 } ],
  "pagination": {
    "page": 1,
    "limit": 24,
    "total": 1482,
    "totalPages": 62,
    "hasMore": true
  }
}
```

---

### Recommendations — `/api/recommendations`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/recommendations` | 🔒 | Get personalized recommendations |
| `GET` | `/api/recommendations/home-feed` | Optional | Genre rows for the homepage |
| `GET` | `/api/recommendations/genres` | Public | List all available genres |
| `POST` | `/api/recommendations/interaction` | 🔒 | Log a user interaction |
| `POST` | `/api/recommendations/coldstart` | 🔒 | Submit onboarding preferences |
| `POST` | `/api/recommendations/action` | 🔒 | Toggle watchlist / favorite |
| `POST` | `/api/recommendations/precompute-vectors` | 🔒 | Admin: recompute anime vectors |

---

### Community — `/api/community`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/community/rating` | 🔒 | Submit or update a rating |
| `GET` | `/api/community/rating/:mal_id` | Public | Get rating info for an anime |
| `POST` | `/api/community/comments` | 🔒 | Post a new comment |
| `GET` | `/api/community/comments/:mal_id` | Public | Get comments for an anime |
| `PUT` | `/api/community/comments/:commentId` | 🔒 | Edit own comment |
| `DELETE` | `/api/community/comments/:commentId` | 🔒 | Delete own comment |
| `POST` | `/api/community/comments/:commentId/like` | 🔒 | Like / unlike a comment |
| `POST` | `/api/community/reviews` | 🔒 | Post a new review |
| `GET` | `/api/community/reviews/:mal_id` | Public | Get reviews for an anime |
| `DELETE` | `/api/community/reviews/:reviewId` | 🔒 | Delete own review |
| `POST` | `/api/community/reviews/:reviewId/like` | 🔒 | Like / unlike a review |

---

### User — `/api/user`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/user/getuser` | 🔒 | Get current authenticated user data |
| `GET` | `/api/user/profile-dashboard` | 🔒 | Get full profile dashboard data |
| `PUT` | `/api/user/update-profile` | 🔒 | Update username, avatar, bio |
| `POST` | `/api/user/reset-recommendations` | 🔒 | Clear interactions and cached recommendations |

---

## 🌱 Database Seeding Guide

AniRecs ships with an ingestion endpoint that populates the database from the Jikan API. This only needs to be run once (or whenever you want to refresh/expand the catalog).

### Step 1 — Ensure the backend is running

```bash
cd Backend && npm run dev
```

### Step 2 — Trigger the ingestion endpoint

```bash
# Fetch and cache anime into MongoDB
curl http://localhost:8000/api/anime/set
```

> The endpoint fetches anime in batches from Jikan, respecting their rate limits (3 req/sec). A full catalog fetch (~1,500 titles) takes approximately 8–15 minutes.

### Step 3 — Precompute feature vectors

Feature vectors are needed for the recommendation engine:

```bash
curl -X POST http://localhost:8000/api/recommendations/precompute-vectors \
  -H "Content-Type: application/json" \
  --cookie "accessToken=YOUR_ADMIN_TOKEN"
```

Or trigger this from a logged-in session in the browser's developer console:

```js
await fetch('/api/recommendations/precompute-vectors', {
  method: 'POST',
  credentials: 'include'
});
```

### Step 4 — Verify

After seeding, visit http://localhost:5173 — the homepage genre rows and category pages should now be populated.

---

## 🚢 Production Deployment

### Backend (Railway / Render / Fly.io)

1. **Push to GitHub** and connect to your hosting provider
2. Set the root directory to `Backend/`
3. Set **build command**: `npm install`
4. Set **start command**: `npm start`
5. Add all environment variables from [Backend .env](#backend--backendenv)
6. Update `CORS_FRONTEND_ORIGIN` to your frontend's production URL

### Frontend (Vercel / Netlify)

1. Connect the repository, set the root directory to `Frontend/`
2. **Build command**: `npm run build`
3. **Output directory**: `dist`
4. Add environment variable: `VITE_BASE_URL=https://your-backend-url.com`
5. For SPA routing, add a rewrite rule: `/* → /index.html`

### MongoDB Atlas

1. Create a free M0 cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Whitelist your backend server's IP address (or `0.0.0.0/0` for dynamic IPs)
3. Create a database user with read/write access
4. Copy the connection string into `MONGODB_URI`

---

## 🧰 Developer Commands

### Backend

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Lint the codebase
npm run lint
```

### Frontend

```bash
# Start Vite dev server (HMR enabled)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview

# Lint the codebase
npm run lint
```

### Useful MongoDB Shell Queries

```js
// Count total anime in catalog
db.animes.countDocuments()

// Find anime missing feature vectors
db.animes.find({ featureVector: { $exists: false } }).count()

// List all unique genres in the catalog
db.animes.distinct("genre.name")

// Find all users who completed onboarding
db.users.find({ onboardingCompleted: true }).count()

// Clear cached recommendations for all users (force re-score)
db.users.updateMany({}, { $set: { "cachedRecommendations.data": null } })
```

---

## 🔧 Troubleshooting

### Homepage shows empty genre rows

**Cause:** The MongoDB catalog is empty or the backend is unreachable.

**Fix:**
1. Confirm the backend is running: `curl http://localhost:8000/api/recommendations/genres`
2. If the response is `[]`, seed the database: `curl http://localhost:8000/api/anime/set`
3. Check `VITE_BASE_URL` in `Frontend/.env` matches the backend port

---

### Recommendations page is blank after login

**Cause:** No interactions have been logged yet and onboarding hasn't been completed.

**Fix:**
1. Complete the onboarding modal on first login
2. Interact with some anime (click, watchlist, rate) to seed the engine
3. If still broken, call the reset endpoint: `POST /api/user/reset-recommendations`

---

### CORS errors in the browser console

**Cause:** `CORS_FRONTEND_ORIGIN` doesn't match the URL you're using.

**Fix:** In `Backend/.env`, set:
```env
CORS_FRONTEND_ORIGIN=http://localhost:5173
```
Restart the backend after changing `.env`.

---

### JWT errors — "invalid signature" or "token expired"

**Cause:** Mismatched token secrets between sessions, or an expired refresh token.

**Fix:**
1. Clear browser cookies for `localhost`
2. Ensure `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` haven't changed since last login
3. If rotating secrets, all existing sessions will be invalidated (this is expected)

---

### Jikan ingestion is slow or times out

**Cause:** Jikan's public API applies rate limits (~3 req/sec). Fetching a full catalog takes time.

**Fix:** This is by design. Leave the ingestion endpoint running — it processes anime in rate-limited batches. Do not cancel the request. The endpoint is idempotent (it upserts, so re-running is safe).

---

### Search returns no results

**Cause:** The search index hasn't been built or the `q` param is too specific.

**Fix:**
1. Try a broader query: `curl "http://localhost:8000/api/search?q=naruto"`
2. Ensure the anime catalog is seeded (Step 2 above)
3. Check the text index exists: `db.animes.getIndexes()`

---

## ❓ FAQ

**Q: Does AniRecs require a paid Jikan subscription?**
> No. Jikan is a free, open-source unofficial MyAnimeList API. It is only used for the data ingestion pipeline and is not called at runtime during normal browsing.

**Q: How many anime are in the catalog?**
> The default ingestion pipeline seeds approximately 1,500 anime from Jikan's top-ranked and seasonal lists. You can run the ingestion endpoint multiple times to expand the catalog.

**Q: Can I use a local MongoDB instance instead of Atlas?**
> Yes. Set `MONGODB_URI=mongodb://localhost:27017/anirecs` in the backend `.env`. Make sure `mongod` is running locally.

**Q: How are passwords stored?**
> Passwords are hashed with bcrypt (10 salt rounds) before being saved to MongoDB. Plain-text passwords are never stored or logged.

**Q: What happens if I click "Reset Recommendations"?**
> The endpoint clears your `interactions` array and nullifies your `cachedRecommendations`. On your next visit, the engine falls back to cold-start preferences until new interactions accumulate.

**Q: Is this project suitable for production?**
> AniRecs is a portfolio / full-stack showcase project. It uses production-grade patterns (JWT rotation, optimistic UI, rate-limited API usage), but has not been independently security-audited. Use in production at your own discretion.

**Q: How do I add more anime to the catalog?**
> Re-run `GET /api/anime/set`. The endpoint upserts records, so existing anime will be refreshed and new titles will be added. After ingestion, recompute feature vectors via `/api/recommendations/precompute-vectors`.


## 🤝 Contributing

Contributions are welcome! Here's how to get involved:

### Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally: `git clone https://github.com/your-username/anirecs.git`
3. **Create a branch** for your feature: `git checkout -b feature/your-feature-name`
4. **Make your changes**, following the code style of the project
5. **Test** your changes locally (both frontend and backend)
6. **Commit** with a clear message: `git commit -m "feat: add collaborative filtering layer"`
7. **Push** your branch: `git push origin feature/your-feature-name`
8. Open a **Pull Request** against the `main` branch

### Commit Message Convention

Use conventional commits for clarity:

```
feat:     A new feature
fix:      A bug fix
docs:     Documentation changes
style:    Formatting changes (no logic change)
refactor: Code restructure without feature change
perf:     Performance improvement
test:     Adding or updating tests
chore:    Build, deps, or config changes
```

### Code Style Guidelines

- **Frontend**: Functional React components only, hooks-based state management, Tailwind utility classes
- **Backend**: ES Modules (`import/export`), async/await throughout, descriptive variable names
- **Both**: No unused imports, no commented-out code in PRs, consistent 2-space indentation

### What to Contribute

- 🐛 Bug fixes (check the Issues tab)
- ✨ Features from the [Roadmap](#-roadmap)
- 📖 Documentation improvements
- 🎨 UI/UX improvements
- ⚡ Performance optimizations
- 🧪 Tests (unit or integration)

### Opening Issues

When opening a bug report, please include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS version
- Any relevant console errors

---

## 📄 License

```
MIT License

Copyright (c) 2024 AniRecs Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

Built with ❤️ by anime fans, for anime fans.

**[⬆ Back to Top](#anirecs)**

</div>
