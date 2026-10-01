// GitHub Profile & Repository Analytics Service with Resilient Rate-Limit Fallback
import { fetchWithTimeout } from "../utils/http.js";

function parseCount(str) {
  if (!str) return 0;
  const clean = str.trim().toLowerCase().replace(/,/g, "");
  if (clean.endsWith("k")) return Math.round(parseFloat(clean) * 1000);
  if (clean.endsWith("m")) return Math.round(parseFloat(clean) * 1000000);
  return parseInt(clean, 10) || 0;
}

async function scrapeGithubFallback(username) {
  const clean = username.trim();
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
  };

  const [profileRes, reposRes, contribRes] = await Promise.all([
    fetchWithTimeout(`https://github.com/${encodeURIComponent(clean)}`, { headers }),
    fetchWithTimeout(`https://github.com/${encodeURIComponent(clean)}?tab=repositories`, { headers }),
    fetchWithTimeout(`https://github.com/users/${encodeURIComponent(clean)}/contributions`, { headers })
  ]);

  if (!profileRes.ok) {
    if (profileRes.status === 404) throw new Error("GitHub user not found");
    throw new Error(`GitHub HTML HTTP ${profileRes.status}`);
  }

  const profileHtml = await profileRes.text();
  const reposHtml = reposRes.ok ? await reposRes.text() : "";
  const contribHtml = contribRes.ok ? await contribRes.text() : "";

  // Parse Profile Information
  const nameMatch = profileHtml.match(/itemprop="name">\s*([^<]+)\s*<\/span>/) ||
                    profileHtml.match(/<title>([^<(]+)/);
  const bioMatch = profileHtml.match(/<div class="p-note[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  const avatarMatch = profileHtml.match(/class="[^"]*avatar-user[^"]*"[^>]*src="([^"]+)"/) ||
                      profileHtml.match(/src="(https:\/\/avatars\.githubusercontent\.com\/u\/[^"]+)"/);
  const followersMatch = profileHtml.match(/href="[^"]*tab=followers"[^>]*>[\s\S]*?<span[^>]*class="[^"]*text-bold[^"]*"[^>]*>([^<]+)<\/span>/);
  const followingMatch = profileHtml.match(/href="[^"]*tab=following"[^>]*>[\s\S]*?<span[^>]*class="[^"]*text-bold[^"]*"[^>]*>([^<]+)<\/span>/);
  const reposCountMatch = profileHtml.match(/href="[^"]*tab=repositories"[^>]*>[\s\S]*?<span[^>]*class="[^"]*Counter[^"]*"[^>]*>([^<]+)<\/span>/);

  // Parse Repositories & Stars
  let totalStars = 0;
  let totalForks = 0;
  const languagesMap = {};
  const recentRepos = [];

  if (reposHtml) {
    const starMatches = [...reposHtml.matchAll(/href="[^"]*\/stargazers"[^>]*>[\s\S]*?([0-9,k\.]+)\s*<\/a>/gi)];
    starMatches.forEach((m) => {
      totalStars += parseCount(m[1]);
    });

    const forkMatches = [...reposHtml.matchAll(/href="[^"]*\/forks"[^>]*>[\s\S]*?([0-9,k\.]+)\s*<\/a>/gi)];
    forkMatches.forEach((m) => {
      totalForks += parseCount(m[1]);
    });

    const langMatches = [...reposHtml.matchAll(/itemprop="programmingLanguage">([^<]+)<\/span>/g)];
    langMatches.forEach((m) => {
      const l = m[1].trim();
      languagesMap[l] = (languagesMap[l] || 0) + 1;
    });

    const repoItemMatches = [...reposHtml.matchAll(/<li[^>]*itemprop="owns"[^>]*>([\s\S]*?)<\/li>/g)];
    const targetItems = repoItemMatches.length ? repoItemMatches : [...reposHtml.matchAll(/<li class="col-12[^"]*"[^>]*>([\s\S]*?)<\/li>/g)];

    targetItems.slice(0, 5).forEach((m) => {
      const block = m[1] || m[0];
      const repoNameMatch = block.match(/href="\/[^"/]+\/([^"/]+)"\s+itemprop="name codeRepository"/i) ||
                            block.match(/itemprop="name codeRepository"[^>]*href="\/[^"/]+\/([^"/]+)"/i) ||
                            block.match(/itemprop="name codeRepository">\s*([^<]+)\s*<\/a>/i);
      const descMatch = block.match(/itemprop="description">([\s\S]*?)<\/p>/);
      const langMatch = block.match(/itemprop="programmingLanguage">([^<]+)<\/span>/);
      const stMatch = block.match(/href="[^"]*\/stargazers"[^>]*>[\s\S]*?([0-9,k\.]+)\s*<\/a>/i);

      if (repoNameMatch) {
        const repoName = (repoNameMatch[1] || repoNameMatch[2]).trim();
        recentRepos.push({
          name: repoName,
          fullName: `${clean}/${repoName}`,
          stars: stMatch ? parseCount(stMatch[1]) : 0,
          forks: 0,
          language: langMatch ? langMatch[1].trim() : null,
          description: descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : null,
          url: `https://github.com/${clean}/${repoName}`
        });
      }
    });
  }

  const topLanguages = Object.entries(languagesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Parse Heatmap Activity (365 days)
  const activity = {};
  if (contribHtml) {
    const dayMatches = [...contribHtml.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d+)"/g)];
    dayMatches.forEach((d) => {
      const count = parseInt(d[2], 10) || 0;
      if (count > 0) {
        activity[d[1]] = count;
      }
    });
  }

  const followers = parseCount(followersMatch ? followersMatch[1] : "0");
  const following = parseCount(followingMatch ? followingMatch[1] : "0");
  const publicRepos = parseCount(reposCountMatch ? reposCountMatch[1] : String(recentRepos.length));

  return {
    platform: "GitHub",
    username: clean,
    name: nameMatch ? nameMatch[1].trim() : clean,
    avatar: avatarMatch ? avatarMatch[1].replace(/&amp;/g, "&") : `https://github.com/${clean}.png`,
    bio: bioMatch ? bioMatch[1].replace(/<[^>]+>/g, "").trim() : "",
    publicRepos,
    publicGists: 0,
    followers,
    following,
    totalStars,
    totalForks,
    topLanguages,
    recentRepos,
    createdAt: new Date().toISOString(),
    profileUrl: `https://github.com/${clean}`,
    activity,
    lastUpdated: new Date().toISOString()
  };
}

export async function getGithub(username) {
  const clean = username?.trim();
  if (!clean) throw new Error("Invalid GitHub username");

  const headers = {
    "User-Agent": "CodeTrack-App",
    Accept: "application/vnd.github.v3+json"
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let useApi = true;
  let userRes = null;
  let reposRes = null;

  try {
    [userRes, reposRes] = await Promise.all([
      fetchWithTimeout(`https://api.github.com/users/${encodeURIComponent(clean)}`, { headers }),
      fetchWithTimeout(`https://api.github.com/users/${encodeURIComponent(clean)}/repos?per_page=60&sort=pushed`, { headers })
    ]);

    if (!userRes.ok) {
      if (userRes.status === 404) throw new Error("GitHub user not found");
      if (userRes.status === 403 || userRes.status === 429) {
        useApi = false;
      } else {
        throw new Error(`GitHub HTTP ${userRes.status}`);
      }
    }
  } catch (err) {
    if (err.message.includes("not found")) throw err;
    if (err.code === "UPSTREAM_TIMEOUT") throw err;
    useApi = false;
  }

  if (useApi && userRes && userRes.ok) {
    const u = await userRes.json();
    let totalStars = 0;
    let totalForks = 0;
    const languagesMap = {};
    const recentRepos = [];

    if (reposRes && reposRes.ok) {
      const repos = await reposRes.json();
      if (Array.isArray(repos)) {
        repos.forEach((r) => {
          totalStars += r.stargazers_count || 0;
          totalForks += r.forks_count || 0;

          if (r.language) {
            languagesMap[r.language] = (languagesMap[r.language] || 0) + 1;
          }

          if (recentRepos.length < 5) {
            recentRepos.push({
              name: r.name,
              fullName: r.full_name,
              stars: r.stargazers_count || 0,
              forks: r.forks_count || 0,
              language: r.language,
              description: r.description,
              url: r.html_url
            });
          }
        });
      }
    }

    const topLanguages = Object.entries(languagesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Fetch live contribution activity
    let activity = {};
    try {
      const contribRes = await fetchWithTimeout(`https://github.com/users/${encodeURIComponent(clean)}/contributions`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      if (contribRes.ok) {
        const contribHtml = await contribRes.text();
        const dayMatches = [...contribHtml.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d+)"/g)];
        dayMatches.forEach((d) => {
          const count = parseInt(d[2], 10) || 0;
          if (count > 0) activity[d[1]] = count;
        });
      }
    } catch {}

    return {
      platform: "GitHub",
      username: u.login,
      name: u.name || u.login,
      avatar: u.avatar_url,
      bio: u.bio || "",
      publicRepos: u.public_repos || 0,
      publicGists: u.public_gists || 0,
      followers: u.followers || 0,
      following: u.following || 0,
      totalStars,
      totalForks,
      topLanguages,
      recentRepos,
      createdAt: u.created_at,
      profileUrl: u.html_url,
      activity,
      lastUpdated: new Date().toISOString()
    };
  }

  // Gracefully fallback to scraper when GitHub API rate-limited
  return await scrapeGithubFallback(clean);
}

export async function detectCodingHandles(username) {
  const clean = username?.trim();
  if (!clean) throw new Error("Invalid GitHub username");

  let fullText = "";
  let name = clean;
  let avatar = `https://github.com/${clean}.png`;

  // Try API first if available, otherwise fetch profile page HTML
  try {
    const headers = {
      "User-Agent": "CodeTrack-App",
      Accept: "application/vnd.github.v3+json"
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const userRes = await fetchWithTimeout(`https://api.github.com/users/${encodeURIComponent(clean)}`, { headers });
    if (userRes.ok) {
      const u = await userRes.json();
      name = u.name || u.login;
      avatar = u.avatar_url;
      fullText = `${u.bio || ""} ${u.blog || ""} ${u.company || ""}`;
    }
  } catch {}

  // If fullText is empty or API was rate-limited, scrape profile HTML
  if (!fullText) {
    try {
      const pageRes = await fetchWithTimeout(`https://github.com/${encodeURIComponent(clean)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const nameMatch = html.match(/itemprop="name">\s*([^<]+)\s*<\/span>/);
        if (nameMatch) name = nameMatch[1].trim();
        fullText += " " + html;
      }
    } catch {}
  }

  // Fetch profile README (from main, master)
  for (const branch of ["main", "master"]) {
    try {
      const readmeRes = await fetchWithTimeout(
        `https://raw.githubusercontent.com/${encodeURIComponent(clean)}/${encodeURIComponent(clean)}/${branch}/README.md`,
        { headers: { "User-Agent": "CodeTrack-App" } }
      );
      if (readmeRes.ok) {
        fullText += " " + (await readmeRes.text());
        break;
      }
    } catch {}
  }

  // Regex patterns
  const lcMatch = fullText.match(/(?:leetcode\.com\/(?:u\/|profile\/)?|leetcode:\s*@?)([a-zA-Z0-9_\-]+)/i);
  const cfMatch = fullText.match(/(?:codeforces\.com\/profile\/|codeforces:\s*@?)([a-zA-Z0-9_\.\-]+)/i);
  const ccMatch = fullText.match(/(?:codechef\.com\/users\/|codechef:\s*@?)([a-zA-Z0-9_\.\-]+)/i);

  return {
    github: clean,
    name,
    avatar,
    leetcode: lcMatch ? lcMatch[1] : clean,
    codeforces: cfMatch ? cfMatch[1] : clean,
    codechef: ccMatch ? ccMatch[1] : clean,
    detectedFromProfile: {
      leetcode: Boolean(lcMatch),
      codeforces: Boolean(cfMatch),
      codechef: Boolean(ccMatch)
    }
  };
}
