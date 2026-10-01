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

## Deployment & Scaling

### Environment Variables
Configure the following in **Vercel → Project Settings → Environment Variables** (or in your local `.env` file):
- `GITHUB_TOKEN`: GitHub Personal Access Token (classic token, no scopes needed). Increases GitHub API rate limits from 60 requests/hr (IP-based) to 5,000 requests/hr.

### Edge & In-Memory Caching Architecture
- **Platform Endpoints (10-minute cache)**:
  - Responses for `/api/leetcode/:handle`, `/api/codeforces/:handle`, `/api/codechef/:handle`, and `/api/github/:handle` are cached at Vercel's edge CDN for 10 minutes (`s-maxage=600, stale-while-revalidate=1200`). Subsequent views of identical handles are served instantly from the CDN without hitting upstream platforms.
  - Error responses (4xx/5xx) are never cached (`Cache-Control: no-store`).
- **Upcoming Contests (15-minute cache)**:
  - `/api/contests/upcoming` is cached at the edge CDN for 15 minutes (`s-maxage=900, stale-while-revalidate=1800`) and backed by an in-memory stale-on-error cache in `contestService.js` with a 15-minute TTL. Even if an upstream contest provider temporarily fails, stale contest schedules continue to serve seamlessly.

---

## License

MIT License. Open source and available for modification and distribution.
