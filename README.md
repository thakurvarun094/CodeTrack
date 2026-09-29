# CodeTrack — Unified Coding Command Center & Analytics

A developer analytics dashboard powered by **Node.js, Express, and Supabase Authentication**.

Track and benchmark your competitive programming and software engineering progress across **LeetCode**, **Codeforces**, **CodeChef**, and **GitHub** in one unified place.

---

## Key Features

### Authentication & Profile Persistence
- **Google OAuth via Supabase**: Sign in with Google to securely store and sync your coding handles across devices.
- **Persistent Handles**: User handles for LeetCode, Codeforces, CodeChef, and GitHub are automatically saved and restored across sessions.

### Multi-Platform Analytics
- **Unified Problem Benchmark**: Aggregate solved problem counts across platforms with Easy, Medium, and Hard difficulty breakdowns.
- **52-Week Activity Heatmap**: GitHub-style contribution calendar displaying cumulative coding submissions over the past year.
- **Weekly Velocity Chart**: 7-day daily submission breakdown, active day ratios, and productivity tracking.
- **Platform Integrations**:
  - **LeetCode**: Solved counts (Easy / Medium / Hard), contest rating, and global ranking.
  - **Codeforces**: Current rating, peak rating, rank title, submission history, and contest rankings.
  - **CodeChef**: Current rating, peak rating, star tiers (1★ to 7★), division ranking (Div 1 to Div 4), and contest history.
  - **GitHub**: Public repositories, stargazers, forks, follower count, and primary language breakdown.

### Competitive Programming Tools
- **Upcoming Contest Calendar**: Aggregates upcoming contests from LeetCode, Codeforces, and CodeChef with live countdowns, platform filters, and direct registration links.
- **Daily Problem Goal Tracker**: Set a daily problem target (1, 2, 3, or 5 problems/day) with interactive progress ring and streak tracking.
- **AI Coding Coach & Topic Mastery**: Evaluates your solve distribution to diagnose weak algorithm areas (Dynamic Programming, Graphs, Trees, Binary Search) and recommend targeted practice problems.
- **Achievements & Badges**: Unlock milestones (Century Solver, Half-K Master, 7-Day Streak, Contest Veteran, Grandmaster Polyglot) based on verified live stats.
- **Shareable Profile Card**: Export a progress card with a one-click summary formatted for LinkedIn and Twitter/X.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation & Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/CodeTrack.git
   cd CodeTrack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open your browser:
   **[http://localhost:3000](http://localhost:3000)**

---

## Deployment on Vercel

The project includes a pre-configured `vercel.json` for serverless deployment of the Express backend and static hosting of the frontend.

### Deploy Steps
1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Leave the **Framework Preset** as **Other** and build settings at default.
4. Click **Deploy**.

### Environment Variables (Optional)
- `GITHUB_TOKEN`: A GitHub Personal Access Token to increase the GitHub API rate limit from 60 requests/hour to 5,000 requests/hour for profile fetching.

### Supabase Redirect Configuration
After deploying to Vercel, update your Supabase project settings:
1. Navigate to **Supabase Dashboard** → **Authentication** → **URL Configuration**.
2. Set **Site URL** to your Vercel URL (e.g., `https://your-project.vercel.app`).
3. Add `https://your-project.vercel.app/**` to **Redirect URLs**.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and supported platforms |
| `GET` | `/api/leetcode/:username` | LeetCode user profile, solved breakdown, and contest statistics |
| `GET` | `/api/codeforces/:handle` | Codeforces profile, rating, submission metrics, and contest history |
| `GET` | `/api/codechef/:handle` | CodeChef profile, star rating, division, and contest history |
| `GET` | `/api/github/:username` | GitHub profile, public repositories, stars, and languages |
| `GET` | `/api/contests/upcoming` | Aggregated upcoming contests from LeetCode, Codeforces, and CodeChef |

---

## License

MIT License. Open source and available for modification and distribution.
