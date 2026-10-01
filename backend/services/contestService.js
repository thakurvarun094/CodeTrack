// Upcoming Contests Aggregator Service
import { fetchWithTimeout } from "../utils/http.js";

export async function getUpcomingContests() {
  const allContests = [];

  // 1. Codeforces Upcoming Contests
  try {
    const cfRes = await fetchWithTimeout("https://codeforces.com/api/contest.list?gym=false", {
      headers: { "User-Agent": "CodeTrack-App" }
    });
    if (cfRes.ok) {
      const cfData = await cfRes.json();
      if (cfData.status === "OK" && Array.isArray(cfData.result)) {
        const upcomingCF = cfData.result
          .filter((c) => c.phase === "BEFORE")
          .map((c) => {
            const startTimeSeconds = c.startTimeSeconds;
            const startTimeMs = startTimeSeconds * 1000;
            return {
              id: `cf-${c.id}`,
              platform: "Codeforces",
              platformCode: "CF",
              name: c.name,
              startTime: new Date(startTimeMs).toISOString(),
              startTimeSeconds,
              durationSeconds: c.durationSeconds,
              url: `https://codeforces.com/contests/${c.id}`
            };
          });
        allContests.push(...upcomingCF);
      }
    }
  } catch (err) {
    console.warn("Failed to fetch Codeforces upcoming contests:", err.message);
  }

  // 2. LeetCode Upcoming Contests
  try {
    const query = "{ topTwoContests { title titleSlug startTime duration } }";
    const lcRes = await fetchWithTimeout("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "CodeTrack-App"
      },
      body: JSON.stringify({ query })
    });
    if (lcRes.ok) {
      const lcData = await lcRes.json();
      const topTwo = lcData.data?.topTwoContests;
      if (Array.isArray(topTwo)) {
        topTwo.forEach((c) => {
          const startTimeSeconds = c.startTime;
          if (startTimeSeconds * 1000 > Date.now()) {
            allContests.push({
              id: `lc-${c.titleSlug}`,
              platform: "LeetCode",
              platformCode: "LC",
              name: c.title,
              startTime: new Date(startTimeSeconds * 1000).toISOString(),
              startTimeSeconds,
              durationSeconds: c.duration,
              url: `https://leetcode.com/contest/${c.titleSlug}`
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch LeetCode upcoming contests:", err.message);
  }

  // 3. CodeChef Upcoming Contests
  try {
    const ccRes = await fetchWithTimeout(
      "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all",
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }
    );
    if (ccRes.ok) {
      const ccData = await ccRes.json();
      const future = ccData.future_contests;
      if (Array.isArray(future)) {
        future.forEach((c) => {
          const startDate = c.contest_start_date_iso || c.contest_start_date;
          const startTimeMs = new Date(startDate).getTime();
          allContests.push({
            id: `cc-${c.contest_code}`,
            platform: "CodeChef",
            platformCode: "CC",
            name: c.contest_name,
            startTime: new Date(startTimeMs).toISOString(),
            startTimeSeconds: Math.floor(startTimeMs / 1000),
            durationSeconds: parseInt(c.contest_duration || "120", 10) * 60,
            url: `https://www.codechef.com/${c.contest_code}`
          });
        });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch CodeChef upcoming contests:", err.message);
  }

  // Sort by start time ascending (closest contest first)
  allContests.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return allContests;
}
