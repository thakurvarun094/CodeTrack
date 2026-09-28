// GitHub Profile & Repository Analytics Service

export async function getGithub(username) {
  const clean = username?.trim();
  if (!clean) throw new Error("Invalid GitHub username");

  const headers = {
    "User-Agent": "CodeTrack-App",
    Accept: "application/vnd.github.v3+json"
  };

  const [userRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(clean)}`, { headers }),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(clean)}/repos?per_page=60&sort=pushed`,
      { headers }
    )
  ]);

  if (!userRes.ok) {
    if (userRes.status === 404) throw new Error("GitHub user not found");
    throw new Error(`GitHub HTTP ${userRes.status}`);
  }

  const u = await userRes.json();
  let totalStars = 0;
  let totalForks = 0;
  const languagesMap = {};
  const recentRepos = [];

  if (reposRes.ok) {
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
            stars: r.stargazers_count,
            forks: r.forks_count,
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

  // Create an activity representation based on repo update timestamps
  const activity = {};
  if (Array.isArray(recentRepos)) {
    recentRepos.forEach((r) => {
      // mark active repo updates
      const d = new Date().toISOString().slice(0, 10);
      activity[d] = (activity[d] || 0) + 1;
    });
  }

  return {
    platform: "GitHub",
    username: u.login,
    name: u.name || u.login,
    avatar: u.avatar_url,
    bio: u.bio,
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

export async function detectCodingHandles(username) {
  const clean = username?.trim();
  if (!clean) throw new Error("Invalid GitHub username");

  const headers = {
    "User-Agent": "CodeTrack-App",
    Accept: "application/vnd.github.v3+json"
  };

  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(clean)}`, { headers });
  if (!userRes.ok) {
    if (userRes.status === 404) throw new Error("GitHub user not found");
    throw new Error(`GitHub HTTP ${userRes.status}`);
  }

  const u = await userRes.json();
  let fullText = `${u.bio || ""} ${u.blog || ""} ${u.company || ""}`;

  // Try fetching user profile README from main and master branches
  try {
    const readmeRes = await fetch(
      `https://raw.githubusercontent.com/${encodeURIComponent(clean)}/${encodeURIComponent(clean)}/main/README.md`,
      { headers: { "User-Agent": "CodeTrack-App" } }
    );
    if (readmeRes.ok) {
      const readme = await readmeRes.text();
      fullText += " " + readme;
    } else {
      const readmeMaster = await fetch(
        `https://raw.githubusercontent.com/${encodeURIComponent(clean)}/${encodeURIComponent(clean)}/master/README.md`,
        { headers: { "User-Agent": "CodeTrack-App" } }
      );
      if (readmeMaster.ok) {
        fullText += " " + (await readmeMaster.text());
      }
    }
  } catch (e) {
    // ignore readme fetch error
  }

  // Regex patterns
  const lcMatch = fullText.match(/(?:leetcode\.com\/(?:u\/|profile\/)?|leetcode:\s*@?)([a-zA-Z0-9_\-]+)/i);
  const cfMatch = fullText.match(/(?:codeforces\.com\/profile\/|codeforces:\s*@?)([a-zA-Z0-9_\.\-]+)/i);
  const ccMatch = fullText.match(/(?:codechef\.com\/users\/|codechef:\s*@?)([a-zA-Z0-9_\.\-]+)/i);

  return {
    github: u.login,
    name: u.name || u.login,
    avatar: u.avatar_url,
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

