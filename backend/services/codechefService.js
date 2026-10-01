// CodeChef Profile & Contest Ranking Service
import { fetchWithTimeout } from "../utils/http.js";

function calculateStars(rating) {
  if (!rating || rating <= 0) return 0;
  if (rating >= 2500) return 7;
  if (rating >= 2200) return 6;
  if (rating >= 2000) return 5;
  if (rating >= 1800) return 4;
  if (rating >= 1600) return 3;
  if (rating >= 1400) return 2;
  return 1;
}

function calculateDivision(rating) {
  if (!rating || rating <= 0) return "Div 4";
  if (rating >= 2000) return "Div 1";
  if (rating >= 1600) return "Div 2";
  if (rating >= 1400) return "Div 3";
  return "Div 4";
}

export async function getCodechef(handle) {
  const clean = handle?.trim();
  if (!clean) throw new Error("Invalid CodeChef username");

  const url = `https://www.codechef.com/users/${encodeURIComponent(clean)}`;
  const response = await fetchWithTimeout(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    if (response.status === 404) throw new Error("CodeChef user not found");
    throw new Error(`CodeChef HTTP ${response.status}`);
  }

  const html = await response.text();

  if (
    html.includes("Could not find page") ||
    html.includes("Page not found") ||
    html.includes("User does not exist")
  ) {
    throw new Error("CodeChef user not found");
  }

  // Extract display name
  const nameMatch =
    html.match(/<header class="user-details-header">[\s\S]*?<h1>([^<]+)<\/h1>/i) ||
    html.match(/<h1 class="h2-style"[^>]*>([^<]+)<\/h1>/i);
  const name = nameMatch ? nameMatch[1].trim() : clean;

  // Extract avatar
  const avatarMatch = html.match(
    /<div class="user-details-container">[\s\S]*?<img[^>]+src="([^">]+)"/i
  );
  const avatar = avatarMatch ? avatarMatch[1] : null;

  // Extract current rating from rating-header > rating-number
  const ratingSectionMatch = html.match(
    /<div class="rating-header[^"]*">[\s\S]*?<div class="rating-number">([\s\S]*?)<\/div>/i
  );
  let rating = 0;
  if (ratingSectionMatch) {
    const rawVal = ratingSectionMatch[1].trim();
    if (rawVal && !isNaN(parseInt(rawVal, 10))) {
      rating = parseInt(rawVal, 10);
    }
  }

  // Extract highest rating
  const highestMatch =
    html.match(/\(Highest Rating\s*(\d+)\)/i) ||
    html.match(/Highest Rating\s*\((\d+)\)/i);
  const highestRating = highestMatch ? parseInt(highestMatch[1], 10) : rating;

  // Extract stars
  let stars = 0;
  const starSpanMatch = html.match(/<div class="rating-star">([\s\S]*?)<\/div>/i);
  if (starSpanMatch) {
    stars = (starSpanMatch[1].match(/&#9733;/g) || []).length;
  }
  if (!stars && rating > 0) {
    stars = calculateStars(rating);
  }

  // Division
  const divMatch = html.match(/<div>\(Div\s*([1-4])\)<\/div>/i);
  let division = divMatch ? `Div ${divMatch[1]}` : calculateDivision(rating);

  // Global & Country Ranks
  const globalRankMatch = html.match(
    /<a href="\/ratings\/all">[\s\S]*?<strong>([^<]+)<\/strong>/i
  );
  const countryRankMatch = html.match(
    /<a href="\/ratings\/all\?filterBy=Country[^"]*"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/i
  );

  const rawGlobal = globalRankMatch ? globalRankMatch[1].trim() : null;
  const rawCountry = countryRankMatch ? countryRankMatch[1].trim() : null;

  const isGlobalActive =
    rawGlobal &&
    rawGlobal.toLowerCase() !== "inactive" &&
    rawGlobal.toLowerCase() !== "na";
  const isCountryActive =
    rawCountry &&
    rawCountry.toLowerCase() !== "inactive" &&
    rawCountry.toLowerCase() !== "na";

  const globalRank = isGlobalActive ? rawGlobal : (rating > 0 ? "Inactive" : "—");
  const countryRank = isCountryActive ? rawCountry : (rating > 0 ? "Inactive" : "—");

  // Contest history & contest ranking algorithm
  let contests = [];
  let bestRank = null;
  let latestRank = null;
  const allRatingMatch = html.match(/var\s+all_rating\s*=\s*(\[[^;]+\]);/);

  if (allRatingMatch) {
    try {
      const rawContests = JSON.parse(allRatingMatch[1]);
      contests = rawContests.map((c, idx, arr) => {
        const rankNum = parseInt(c.rank, 10);
        const currentRating = parseInt(c.rating, 10);
        const prevRating = idx > 0 ? parseInt(arr[idx - 1].rating, 10) : 1500;
        const ratingChange = !isNaN(currentRating) ? currentRating - prevRating : 0;

        let contestDate = c.end_date;
        if (!contestDate && c.getyear && c.getmonth && c.getday) {
          contestDate = `${c.getyear}-${String(c.getmonth).padStart(2, "0")}-${String(c.getday).padStart(2, "0")}`;
        }

        return {
          contestCode: c.code || "",
          contestName: c.name || c.code || "CodeChef Contest",
          rank: isNaN(rankNum) ? c.rank : rankNum,
          rating: isNaN(currentRating) ? 0 : currentRating,
          ratingChange,
          date: contestDate || new Date().toISOString()
        };
      });

      // Valid positive ranks
      const validRanks = contests
        .map((c) => (typeof c.rank === "number" ? c.rank : parseInt(c.rank, 10)))
        .filter((r) => !isNaN(r) && r > 0);

      if (validRanks.length > 0) {
        bestRank = Math.min(...validRanks);
        latestRank = contests[contests.length - 1].rank;
      }
    } catch (e) {
      console.warn("Could not parse all_rating array:", e.message);
    }
  }

  // Total Solved
  const solvedMatch =
    html.match(/Total Problems Solved:\s*(\d+)/i) ||
    html.match(/Problems Solved[\s\S]*?<h5>(\d+)<\/h5>/i) ||
    html.match(/Fully Solved\s*\(([0-9]+)\)/i);
  const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;

  // Activity map from contests
  const activity = {};
  for (const c of contests) {
    if (c.date) {
      const day = c.date.slice(0, 10);
      activity[day] = (activity[day] || 0) + 1;
    }
  }

  return {
    platform: "CodeChef",
    username: clean,
    name,
    avatar,
    rating,
    highestRating,
    stars,
    division,
    globalRank,
    countryRank,
    bestRank,
    latestRank,
    contestsParticipated: contests.length,
    totalSolved,
    activity,
    contests: contests.slice(-25).reverse(), // Newest contests first
    profileUrl: url,
    lastUpdated: new Date().toISOString()
  };
}
