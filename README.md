# CodeTrack — Unified Coding Command Center & Analytics

A modern, high-performance developer analytics dashboard with an ultra-clean **white-blue design system**, powered by **Node.js, Express, and Supabase Authentication**.

Track and benchmark your software engineering and competitive programming progress across **LeetCode**, **Codeforces**, **CodeChef**, and **GitHub** in one place.

---

## 🌟 Key Features

### 🔐 1. Authentication & Cloud Handle Persistence
- **Supabase Google OAuth**: One-click "Continue with Google" sign-in via Supabase client SDK (`@supabase/supabase-js`).
- **Instant Demo / Guest Mode**: Immediate 1-click exploration without required configuration.
- **Configurable Supabase Project**: Easily input custom Supabase Project URL & Anon Key for personal cloud databases.
- **Auto-Saved Handles**: User handles for LeetCode, Codeforces, CodeChef, and GitHub are automatically persisted to cloud & local storage.

### 📊 2. Essential Dashboard Features
- **Unified Coding Dashboard**: Aggregate problem counts across all platforms with Easy, Medium, and Hard difficulty breakdowns.
- **Coding Activity Heatmap**: 52-week (365-day) GitHub-style contribution calendar styled with white-blue grading (`#e2e8f0` → `#bfdbfe` → `#60a5fa` → `#2563eb` → `#1d4ed8`).
- **Progress Tracking & Weekly Velocity**: 7-day daily submission bar chart (Mon through Sun), active monthly comparisons, and peak productive day tracking.
- **Multiple Platform Integration**:
  - **LeetCode**: Total solved, Easy/Medium/Hard breakdown, contest rating, and global ranking.
  - **Codeforces**: Real-time rating, peak rating, rank title, submission counts, and contest history.
  - **CodeChef**: Corrected contest ranking algorithm, official star classifications (1★ to 7★), division engine (Div 1 to Div 4), and delta calculations.
  - **GitHub**: Public repositories, total stargazers, forks, follower count, and primary language breakdowns.

### 🚀 3. Advanced & Unique Features
- **Daily Coding Goal Tracker**: Customizable daily target (1, 2, 3, or 5 problems/day) with interactive progress ring and celebration states.
- **Smart Upcoming Contest Calendar**: Live countdowns and direct registration links for upcoming contests across LeetCode, Codeforces, and CodeChef.
- **Coding Consistency Score (0–100)**: Dynamic regularity score calculated from active day ratios, streaks, and contest frequency.
- **AI Coding Coach**: Analyzes your problem solve distribution and contest ratings to generate diagnostics, priority focus areas, and recommended practice problem sets.
- **Topic-Wise DSA Analytics**: Tracks proficiency levels across Arrays, Binary Search, Trees, Dynamic Programming, Graphs, and Greedy algorithms.
- **Achievements & Badges Engine**: Gamified badges (Century Solver, Half-K Master, 7-Day Streak, Contest Veteran, Grandmaster Polyglot) that dynamically unlock based on live metrics.
- **Community Leaderboard**: Compare problem counts, peak ratings, and streaks against peer competitive programmers.
- **Shareable Profile Card**: Exportable card preview with one-click copyable summary for sharing on LinkedIn or Twitter/X.

---

## 🏃 Quick Start

### Prerequisites
- Node.js 18+

### Installation & Run
```bash
# Install dependencies
npm install

# Start production server
npm start
```

Open your browser at:
**[http://localhost:3000](http://localhost:3000)**

---

## 🔌 API Endpoints
- `GET /api/health` — Service health & supported platform matrix
- `GET /api/leetcode/:username` — LeetCode user profile & contest statistics
- `GET /api/codeforces/:handle` — Codeforces profile, submissions, and contest rankings
- `GET /api/codechef/:handle` — CodeChef profile, star rating, division, and contest history
- `GET /api/github/:username` — GitHub profile, public repos, stargazers, and languages
- `GET /api/contests/upcoming` — Aggregated upcoming contests from LC, CF, and CC with start times
