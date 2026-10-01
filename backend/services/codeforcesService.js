import { fetchWithTimeout } from "../utils/http.js";

const API = "https://codeforces.com/api";

async function cf(method, params) {
  const url = new URL(`${API}/${method}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value)
  );

  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`Codeforces HTTP ${response.status}`);

  const data = await response.json();
  if (data.status !== "OK") throw new Error(data.comment || "Codeforces API error");

  return data.result;
}

function dateKey(unix) {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

export async function getCodeforces(handle) {
  const [userArr, submissions, ratings] = await Promise.all([
    cf("user.info", { handles: handle }),
    cf("user.status", { handle, from: 1, count: 1000 }),
    cf("user.rating", { handle })
  ]);

  if (!userArr.length) throw new Error("Codeforces user not found");

  const user = userArr[0];

  // Count unique problems with accepted submissions.
  const solved = new Set();
  const activity = {};

  for (const s of submissions) {
    const day = dateKey(s.creationTimeSeconds);
    activity[day] = (activity[day] || 0) + 1;

    if (s.verdict === "OK" && s.problem?.contestId && s.problem?.index) {
      solved.add(`${s.problem.contestId}-${s.problem.index}`);
    }
  }

  const contests = ratings.map(r => ({
    contestId: r.contestId,
    contestName: r.contestName,
    rank: r.rank,
    oldRating: r.oldRating,
    newRating: r.newRating,
    ratingChange: r.newRating - r.oldRating,
    date: new Date(r.ratingUpdateTimeSeconds * 1000).toISOString()
  }));

  const highestRating = ratings.length
    ? Math.max(...ratings.map(x => x.newRating))
    : user.rating ?? 0;

  const validRanks = ratings
    .map(x => Number(x.rank))
    .filter(r => !isNaN(r) && r > 0);

  const bestRank = validRanks.length
    ? Math.min(...validRanks)
    : null;

  return {
    platform: "Codeforces",
    username: user.handle,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.handle,
    avatar: user.titlePhoto || user.avatar,
    rating: user.rating ?? 0,
    maxRating: user.maxRating ?? 0,
    rank: user.rank ?? "unrated",
    maxRank: user.maxRank ?? null,
    highestRating,
    bestRank,
    contestsParticipated: ratings.length,
    problemsSolvedFromFetchedSubmissions: solved.size,
    submissionsFetched: submissions.length,
    activity,
    contests: contests.slice(-20).reverse(),
    lastUpdated: new Date().toISOString()
  };
}
