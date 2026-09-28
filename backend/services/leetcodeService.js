const GRAPHQL = "https://leetcode.com/graphql";

async function gql(query, variables) {
  const response = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "CodeTrack/1.0"
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`LeetCode HTTP ${response.status}`);
  }

  const body = await response.json();

  if (body.errors?.length) {
    throw new Error(body.errors[0].message || "LeetCode GraphQL error");
  }

  return body.data;
}

export async function getLeetcode(username) {
  const query = `
    query userData($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
          reputation
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        submissionCalendar
      }
      recentAcSubmissionList(username: $username, limit: 20) {
        id
        title
        titleSlug
        timestamp
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        topPercentage
        totalParticipants
      }
    }
  `;

  const data = await gql(query, { username });
  const user = data.matchedUser;

  if (!user) throw new Error("LeetCode user not found");

  const counts = {};
  for (const item of user.submitStatsGlobal?.acSubmissionNum || []) {
    counts[item.difficulty] = item.count;
  }

  let activity = {};
  try {
    const calendar = JSON.parse(user.submissionCalendar || "{}");
    for (const [timestamp, count] of Object.entries(calendar)) {
      const date = new Date(Number(timestamp) * 1000)
        .toISOString()
        .slice(0, 10);
      activity[date] = Number(count);
    }
  } catch {
    activity = {};
  }

  const contest = data.userContestRanking;

  return {
    platform: "LeetCode",
    username: user.username,
    name: user.profile?.realName || user.username,
    avatar: user.profile?.userAvatar || null,
    ranking: user.profile?.ranking ?? null,
    reputation: user.profile?.reputation ?? 0,
    totalSolved: counts.All ?? 0,
    easy: counts.Easy ?? 0,
    medium: counts.Medium ?? 0,
    hard: counts.Hard ?? 0,
    contestsParticipated: contest?.attendedContestsCount ?? 0,
    contestRating: contest?.rating ?? 0,
    globalRanking: contest?.globalRanking ?? null,
    topPercentage: contest?.topPercentage ?? null,
    totalParticipants: contest?.totalParticipants ?? null,
    activity,
    recentSubmissions: data.recentAcSubmissionList || [],
    lastUpdated: new Date().toISOString()
  };
}
