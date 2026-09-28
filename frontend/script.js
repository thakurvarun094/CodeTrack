// ==========================================================================
// CodeTrack — Unified Client Application & Supabase Auth Engine
// ==========================================================================

const $ = (id) => document.getElementById(id);

// Application State
let isDarkMode = localStorage.getItem('codetrack_dark_mode') === 'true';
let currentUser = null;
let supabaseClient = null;
let leetcodeData = null;
let codeforcesData = null;
let codechefData = null;
let githubData = null;

let combinedContests = [];
let upcomingContests = [];
let currentContestFilter = "all";

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  const icon = isDarkMode ? '☀️' : '🌙';
  const toggleBtn = document.getElementById('darkModeToggle');
  if (toggleBtn) toggleBtn.textContent = icon;
  const navLanding = document.getElementById('navThemeToggleLanding');
  if (navLanding) navLanding.textContent = icon;
  const navDash = document.getElementById('navThemeToggleDash');
  if (navDash) navDash.textContent = icon;
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  localStorage.setItem('codetrack_dark_mode', isDarkMode);
  applyTheme();
}

const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  initSupabase();
  setupEventListeners();
  loadSavedHandles();
  updatePlatformLinkBadges();
  renderHeatmap({});
  fetchUpcomingContests();

  // Route Handling: Check if opening directly to dashboard or landing
  handleInitialRoute();
  window.addEventListener("hashchange", handleInitialRoute);
});

// ==========================================================================
// View Routing: Landing Page vs. Fresh Dashboard Page
// ==========================================================================

function handleInitialRoute() {
  const hash = window.location.hash;
  const savedGuest = localStorage.getItem("codetrack_guest_user");

  if (hash === "#/dashboard" || (savedGuest && hash !== "#/")) {
    switchView("dashboard");
  } else {
    switchView("landing");
  }
}

function switchView(viewName) {
  const landing = $("landingView");
  const dashboard = $("dashboardView");

  if (viewName === "dashboard") {
    if (landing) landing.style.display = "none";
    if (dashboard) dashboard.style.display = "block";
    window.location.hash = "#/dashboard";
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Update user info in dashboard top bar
    updateDashboardUserUI();

    // If handles exist, trigger live load
    const hasHandles = $("leetcodeUser").value || $("codeforcesUser").value || $("codechefUser").value || $("githubUser").value;
    if (hasHandles && !leetcodeData && !codeforcesData && !codechefData) {
      loadProfiles();
    }
  } else {
    if (landing) landing.style.display = "block";
    if (dashboard) dashboard.style.display = "none";
    if (window.location.hash === "#/dashboard") {
      window.location.hash = "#/";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ==========================================================================
// Supabase Authentication & Session Management
// ==========================================================================

function initSupabase() {
  const customUrl = localStorage.getItem("codetrack_sb_url");
  const customKey = localStorage.getItem("codetrack_sb_key");

  if (customUrl && $("sbUrlInput")) $("sbUrlInput").value = customUrl;
  if (customKey && $("sbKeyInput")) $("sbKeyInput").value = customKey;

  // Use custom credentials if provided by user
  if (customUrl && customKey && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(customUrl, customKey);
      checkSupabaseSession();
    } catch (e) {
      console.warn("Custom Supabase init failed:", e.message);
    }
  } else {
    checkGuestSession();
  }
}

async function checkSupabaseSession() {
  if (!supabaseClient) return;

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      handleUserLoggedIn({
        name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
        email: session.user.email,
        avatar: session.user.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=coder",
        provider: "google"
      });
    } else {
      checkGuestSession();
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        handleUserLoggedIn({
          name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=coder",
          provider: "google"
        });
      }
    });
  } catch (err) {
    console.warn("Supabase session check error:", err.message);
    checkGuestSession();
  }
}

function checkGuestSession() {
  const savedGuest = localStorage.getItem("codetrack_guest_user");
  if (savedGuest) {
    try {
      currentUser = JSON.parse(savedGuest);
    } catch {
      currentUser = null;
    }
  }
}

async function handleGoogleLogin() {
  if (!supabaseClient) {
    alert(
      "To connect directly to Google OAuth, please configure your Supabase Project URL and Anon Key in '⚙️ Supabase Project Settings' below.\n\nAlternatively, click 'Enter with Instant Demo / Guest Mode' to immediately enter your fresh dashboard!"
    );
    const details = document.querySelector(".supabase-config-box details");
    if (details) details.open = true;
    return;
  }

  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  } catch (err) {
    alert("Google Sign-In Error: " + err.message);
  }
}

function handleGuestLogin() {
  const guest = {
    name: "Alex Coder",
    email: "alex.coder@example.com",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=alexcoder",
    provider: "guest"
  };
  currentUser = guest;
  localStorage.setItem("codetrack_guest_user", JSON.stringify(guest));

  // If no handles filled yet, preload demo handles
  if (!$("leetcodeUser").value && !$("codeforcesUser").value) {
    applyPreset("tourist");
  }

  // Switch cleanly to the fresh dashboard webpage view
  switchView("dashboard");
}

function handleUserLoggedIn(user) {
  currentUser = user;
  switchView("dashboard");
}

function handleUserLoggedOut() {
  currentUser = null;
  localStorage.removeItem("codetrack_guest_user");
  switchView("landing");
}

function updateDashboardUserUI() {
  if (currentUser) {
    if ($("dashUserAvatar")) $("dashUserAvatar").src = currentUser.avatar;
    if ($("dashUserName")) $("dashUserName").textContent = currentUser.name;
  } else {
    if ($("dashUserAvatar")) $("dashUserAvatar").src = "https://api.dicebear.com/7.x/bottts/svg?seed=alexcoder";
    if ($("dashUserName")) $("dashUserName").textContent = "Alex Coder";
  }
}

function signOut() {
  if (supabaseClient) {
    supabaseClient.auth.signOut().catch(() => {});
  }
  handleUserLoggedOut();
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================

function cleanHandle(input) {
  if (!input) return "";
  let str = input.trim();
  str = str.replace(/\/+$/, "");
  if (str.includes("leetcode.com")) {
    const m = str.match(/leetcode\.com\/(?:u\/|profile\/)?([^\/\?#]+)/i);
    if (m) return m[1];
  }
  if (str.includes("codeforces.com")) {
    const m = str.match(/codeforces\.com\/profile\/([^\/\?#]+)/i);
    if (m) return m[1];
  }
  if (str.includes("codechef.com")) {
    const m = str.match(/codechef\.com\/users\/([^\/\?#]+)/i);
    if (m) return m[1];
  }
  if (str.includes("github.com")) {
    const m = str.match(/github\.com\/([^\/\?#]+)/i);
    if (m) return m[1];
  }
  return str.replace(/^@/, "");
}

function updatePlatformLinkBadges() {
  const setStatus = (id, val) => {
    const el = $(id);
    if (!el) return;
    if (val && val.trim()) {
      el.textContent = "Linked ✓";
      el.className = "platform-link-status linked";
    } else {
      el.textContent = "Not Linked";
      el.className = "platform-link-status";
    }
  };
  setStatus("lcLinkStatus", $("leetcodeUser")?.value);
  setStatus("cfLinkStatus", $("codeforcesUser")?.value);
  setStatus("ccLinkStatus", $("codechefUser")?.value);
  setStatus("ghLinkStatus", $("githubUser")?.value);
}

async function autoDetectFromGithub() {
  let gh = $("githubUser")?.value.trim();
  if (!gh) {
    gh = prompt("Enter your GitHub username to auto-detect your coding handles:");
    if (!gh) return;
  }
  gh = cleanHandle(gh);
  $("githubUser").value = gh;

  showStatus("Scanning GitHub profile, bio and README for coding handles...", "info");
  try {
    const res = await fetch(`/api/github/detect/${encodeURIComponent(gh)}`);
    if (!res.ok) throw new Error("Could not fetch GitHub user");
    const detected = await res.json();

    let found = 0;
    if (detected.leetcode) {
      $("leetcodeUser").value = detected.leetcode;
      found++;
    }
    if (detected.codeforces) {
      $("codeforcesUser").value = detected.codeforces;
      found++;
    }
    if (detected.codechef) {
      $("codechefUser").value = detected.codechef;
      found++;
    }

    saveHandles();
    updatePlatformLinkBadges();

    if (found > 0) {
      showStatus(`✓ Auto-detected ${found} platform handles from GitHub! Click "Sync & Load Real Data".`, "success");
    } else {
      showStatus(`✓ GitHub profile linked. Set other handles or pick a 1-click preset.`, "success");
    }
  } catch (err) {
    showStatus(`GitHub scan: ${err.message}. You can still paste or pick a preset.`, "error");
  }
}

function setupEventListeners() {
  $("darkModeToggle")?.addEventListener("click", toggleDarkMode);
  $("navThemeToggleLanding")?.addEventListener("click", toggleDarkMode);
  $("navThemeToggleDash")?.addEventListener("click", toggleDarkMode);
  
  // Smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href.startsWith('#/')) return; // route links, not anchors
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Landing Page Buttons
  $("navLoginTriggerBtn")?.addEventListener("click", () => {
    const authBox = $("landingAuthBox");
    if (authBox) {
      authBox.scrollIntoView({ behavior: "smooth", block: "center" });
      authBox.style.outline = "2px solid var(--primary)";
      setTimeout(() => { authBox.style.outline = "none"; }, 1500);
    }
  });

  $("landingGoogleSignInBtn")?.addEventListener("click", handleGoogleLogin);
  $("landingGuestSignInBtn")?.addEventListener("click", handleGuestLogin);

  $("saveSbConfigBtn")?.addEventListener("click", () => {
    const url = $("sbUrlInput").value.trim();
    const key = $("sbKeyInput").value.trim();
    if (!url || !key) {
      alert("Please provide both Supabase Project URL and Anon Key.");
      return;
    }
    localStorage.setItem("codetrack_sb_url", url);
    localStorage.setItem("codetrack_sb_key", key);
    alert("Supabase configuration saved! Initializing client...");
    initSupabase();
  });

  // Dashboard Nav Buttons
  $("dashSignOutBtn")?.addEventListener("click", signOut);

  // Share Modal
  $("openShareModalBtn")?.addEventListener("click", openShareModal);
  $("closeShareModalBtn")?.addEventListener("click", closeShareModal);
  $("closeShareModalBtn2")?.addEventListener("click", closeShareModal);
  $("copyShareTextBtn")?.addEventListener("click", copyShareSummary);

  // Fast Auto-Detect
  $("autoDetectGhBtn")?.addEventListener("click", autoDetectFromGithub);

  // Profile Loading & Presets
  $("loadBtn")?.addEventListener("click", () => loadProfiles());
  $("refreshPlatformsBtn")?.addEventListener("click", () => loadProfiles());

  $("presetTourist")?.addEventListener("click", () => applyPreset("tourist"));
  $("presetNealWu")?.addEventListener("click", () => applyPreset("nealwu"));
  $("presetStriver")?.addEventListener("click", () => applyPreset("striver"));
  $("presetColin")?.addEventListener("click", () => applyPreset("colin"));
  $("presetBenq")?.addEventListener("click", () => applyPreset("benq"));
  $("presetClear")?.addEventListener("click", () => clearAll());

  // Contest Filtering Tabs
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
      e.target.classList.add("active");
      currentContestFilter = e.target.getAttribute("data-filter") || "all";
      renderContests();
    });
  });

  // Auto-save handles on typing / pasting URL
  ["leetcodeUser", "codeforcesUser", "codechefUser", "githubUser"].forEach((id) => {
    const input = $(id);
    if (!input) return;

    input.addEventListener("input", (e) => {
      const cleaned = cleanHandle(e.target.value);
      if (cleaned !== e.target.value) {
        e.target.value = cleaned;
      }
      saveHandles();
      updatePlatformLinkBadges();
    });

    input.addEventListener("change", (e) => {
      const cleaned = cleanHandle(e.target.value);
      if (cleaned !== e.target.value) {
        e.target.value = cleaned;
      }
      saveHandles();
      updatePlatformLinkBadges();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadProfiles();
    });
  });
}

function openShareModal() {
  updateShareCard();
  const modal = $("shareModal");
  if (modal) modal.style.display = "flex";
}

function closeShareModal() {
  const modal = $("shareModal");
  if (modal) modal.style.display = "none";
}

function saveHandles() {
  const handles = {
    leetcode: cleanHandle($("leetcodeUser")?.value || ""),
    codeforces: cleanHandle($("codeforcesUser")?.value || ""),
    codechef: cleanHandle($("codechefUser")?.value || ""),
    github: cleanHandle($("githubUser")?.value || "")
  };
  localStorage.setItem("codetrack_saved_handles", JSON.stringify(handles));
}

function loadSavedHandles() {
  const saved = localStorage.getItem("codetrack_saved_handles");
  if (saved) {
    try {
      const handles = JSON.parse(saved);
      if (handles.leetcode && $("leetcodeUser")) $("leetcodeUser").value = handles.leetcode;
      if (handles.codeforces && $("codeforcesUser")) $("codeforcesUser").value = handles.codeforces;
      if (handles.codechef && $("codechefUser")) $("codechefUser").value = handles.codechef;
      if (handles.github && $("githubUser")) $("githubUser").value = handles.github;
    } catch {}
  }
}

function applyPreset(name) {
  if (name === "tourist") {
    $("leetcodeUser").value = "neal_wu";
    $("codeforcesUser").value = "tourist";
    $("codechefUser").value = "gennady.korotkevich";
    $("githubUser").value = "torvalds";
  } else if (name === "nealwu") {
    $("leetcodeUser").value = "neal_wu";
    $("codeforcesUser").value = "neal";
    $("codechefUser").value = "tourist";
    $("githubUser").value = "nealwu";
  } else if (name === "striver") {
    $("leetcodeUser").value = "takeUforward";
    $("codeforcesUser").value = "striver_79";
    $("codechefUser").value = "takeUforward";
    $("githubUser").value = "striver79";
  } else if (name === "colin") {
    $("leetcodeUser").value = "ColinGalen";
    $("codeforcesUser").value = "ColinGalen";
    $("codechefUser").value = "colingalen";
    $("githubUser").value = "colingalen";
  } else if (name === "benq") {
    $("leetcodeUser").value = "benq";
    $("codeforcesUser").value = "benq";
    $("codechefUser").value = "benq";
    $("githubUser").value = "bqi343";
  }
  saveHandles();
  updatePlatformLinkBadges();
  loadProfiles();
}

function clearAll() {
  if ($("leetcodeUser")) $("leetcodeUser").value = "";
  if ($("codeforcesUser")) $("codeforcesUser").value = "";
  if ($("codechefUser")) $("codechefUser").value = "";
  if ($("githubUser")) $("githubUser").value = "";
  saveHandles();
  updatePlatformLinkBadges();

  leetcodeData = null;
  codeforcesData = null;
  codechefData = null;
  githubData = null;
  combinedContests = [];

  // Reset Overview Metrics
  $("totalSolved").textContent = "—";
  $("contests").textContent = "—";
  $("streak").textContent = "—";
  $("consistencyScore").textContent = "—";
  $("activeDaysSub").textContent = "Consistent practice days";

  // Reset LC
  $("lcUser").textContent = "Not connected";
  $("lcSolved").textContent = "—";
  $("lcEasy").textContent = "—";
  $("lcMedium").textContent = "—";
  $("lcHard").textContent = "—";
  $("lcRating").textContent = "—";
  $("lcGlobalRank").textContent = "—";
  $("lcContests").textContent = "—";
  $("lcLink").href = "https://leetcode.com";

  // Reset CF
  $("cfUser").textContent = "Not connected";
  $("cfRating").textContent = "—";
  $("cfRankTitle").textContent = "current rating";
  $("cfMax").textContent = "—";
  $("cfBest").textContent = "—";
  $("cfRank").textContent = "—";
  $("cfContests").textContent = "—";
  $("cfSolved").textContent = "—";
  $("cfLink").href = "https://codeforces.com";

  // Reset CC
  $("ccUser").textContent = "Not connected";
  $("ccRating").textContent = "—";
  $("ccStars").innerHTML = `<span class="star-empty">No rating loaded</span>`;
  $("ccDivision").textContent = "Division —";
  $("ccGlobalRank").textContent = "Global: —";
  $("ccCountryRank").textContent = "Country: —";
  $("ccMax").textContent = "—";
  $("ccBest").textContent = "—";
  $("ccContests").textContent = "—";
  $("ccSolved").textContent = "—";
  $("ccLink").href = "https://codechef.com";

  // Reset GH
  $("ghUser").textContent = "Not connected";
  $("ghStars").textContent = "—";
  $("ghRepos").textContent = "—";
  $("ghFollowers").textContent = "—";
  $("ghForks").textContent = "—";
  $("ghLanguages").innerHTML = `<span class="lang-tag">No repos loaded</span>`;
  $("ghLink").href = "https://github.com";

  hideStatus();
  renderHeatmap({});
  renderContests();
}

// ==========================================================================
// Parallel Live Synchronization
// ==========================================================================

async function loadProfiles() {
  const lc = $("leetcodeUser").value.trim();
  const cf = $("codeforcesUser").value.trim();
  const cc = $("codechefUser").value.trim();
  const gh = $("githubUser").value.trim();

  if (!lc && !cf && !cc && !gh) {
    showStatus("Please enter at least one platform username (LeetCode, Codeforces, CodeChef, or GitHub).", "error");
    return;
  }

  setLoadingState(true);
  showStatus("Fetching live data from connected platform APIs...", "info");

  try {
    const promises = [];

    if (lc) {
      promises.push(
        fetch(`/api/leetcode/${encodeURIComponent(lc)}`)
          .then(async (r) => {
            if (!r.ok) {
              const err = await r.json().catch(() => ({}));
              throw new Error(`LeetCode: ${err.error || "User not found"}`);
            }
            return r.json();
          })
          .then((d) => { leetcodeData = d; })
      );
    } else { leetcodeData = null; }

    if (cf) {
      promises.push(
        fetch(`/api/codeforces/${encodeURIComponent(cf)}`)
          .then(async (r) => {
            if (!r.ok) {
              const err = await r.json().catch(() => ({}));
              throw new Error(`Codeforces: ${err.error || "User not found"}`);
            }
            return r.json();
          })
          .then((d) => { codeforcesData = d; })
      );
    } else { codeforcesData = null; }

    if (cc) {
      promises.push(
        fetch(`/api/codechef/${encodeURIComponent(cc)}`)
          .then(async (r) => {
            if (!r.ok) {
              const err = await r.json().catch(() => ({}));
              throw new Error(`CodeChef: ${err.error || "User not found"}`);
            }
            return r.json();
          })
          .then((d) => { codechefData = d; })
      );
    } else { codechefData = null; }

    if (gh) {
      promises.push(
        fetch(`/api/github/${encodeURIComponent(gh)}`)
          .then(async (r) => {
            if (!r.ok) {
              const err = await r.json().catch(() => ({}));
              throw new Error(`GitHub: ${err.error || "User not found"}`);
            }
            return r.json();
          })
          .then((d) => { githubData = d; })
      );
    } else { githubData = null; }

    const results = await Promise.allSettled(promises);
    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason.message);

    if (leetcodeData) renderLeetcode(leetcodeData);
    if (codeforcesData) renderCodeforces(codeforcesData);
    if (codechefData) renderCodechef(codechefData);
    if (githubData) renderGithub(githubData);

    renderCombinedDashboard();
    buildCombinedContests();
    renderContests();
    updatePlatformLinkBadges();

    if (errors.length && errors.length === promises.length) {
      showStatus(errors.join(" | "), "error");
    } else if (errors.length) {
      showStatus(`Partially loaded: ${errors.join(" | ")}`, "info");
    } else {
      showStatus("✓ Live data successfully synchronized across all connected platforms!", "success");
    }
  } catch (err) {
    showStatus(err.message || "Failed to load platform data", "error");
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  const btn = $("loadBtn");
  const icon = $("btnIcon");
  const text = $("btnText");

  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    if (icon) icon.textContent = "⏳";
    if (text) text.textContent = "Fetching Live Data...";
  } else {
    btn.disabled = false;
    if (icon) icon.textContent = "⚡";
    if (text) text.textContent = "Load & Sync Real Data";
  }
}

function showStatus(message, type = "info") {
  const banner = $("statusBanner");
  const text = $("statusText");
  if (!banner || !text) return;
  banner.style.display = "flex";
  banner.className = `status-banner ${type}`;
  text.textContent = message;
}

function hideStatus() {
  const banner = $("statusBanner");
  if (banner) banner.style.display = "none";
}

// ==========================================================================
// Platform Renderers
// ==========================================================================

function renderLeetcode(data) {
  $("lcUser").textContent = `@${data.username}`;
  $("lcSolved").textContent = data.totalSolved.toLocaleString();
  $("lcEasy").textContent = data.easy.toLocaleString();
  $("lcMedium").textContent = data.medium.toLocaleString();
  $("lcHard").textContent = data.hard.toLocaleString();

  $("lcRating").textContent = data.contestRating ? Math.round(data.contestRating).toLocaleString() : "Unrated";
  $("lcGlobalRank").textContent = data.globalRanking
    ? `#${data.globalRanking.toLocaleString()}`
    : data.ranking
    ? `#${data.ranking.toLocaleString()}`
    : "—";
  $("lcContests").textContent = data.contestsParticipated || 0;
  $("lcLink").href = `https://leetcode.com/${encodeURIComponent(data.username)}`;
}

function renderCodeforces(data) {
  $("cfUser").textContent = `@${data.username}`;
  $("cfRating").textContent = (data.rating || 0).toLocaleString();
  $("cfRankTitle").textContent = data.rank ? data.rank.toUpperCase() : "UNRATED";
  $("cfMax").textContent = (data.maxRating || 0).toLocaleString();
  $("cfBest").textContent = data.bestRank ? `#${data.bestRank.toLocaleString()}` : "—";
  $("cfRank").textContent = data.rank ? capitalize(data.rank) : "Unrated";
  $("cfContests").textContent = data.contestsParticipated || 0;
  $("cfSolved").textContent = data.problemsSolvedFromFetchedSubmissions || 0;
  $("cfLink").href = `https://codeforces.com/profile/${encodeURIComponent(data.username)}`;
}

function renderCodechef(data) {
  $("ccUser").textContent = `@${data.username}`;
  $("ccRating").textContent = (data.rating || 0).toLocaleString();

  // Render Stars
  const starsContainer = $("ccStars");
  if (data.stars && data.stars > 0) {
    const starString = "★".repeat(data.stars);
    starsContainer.innerHTML = `<span>${starString}</span> <span class="star-empty" style="color: var(--text-secondary); font-weight: 700; margin-left: 4px;">(${data.stars}★ Coder)</span>`;
  } else {
    starsContainer.innerHTML = `<span class="star-empty">Unrated</span>`;
  }

  // Render Division & Ranks
  $("ccDivision").textContent = data.division || "Div 4";

  const gRank = data.globalRank;
  $("ccGlobalRank").textContent = gRank && gRank !== "Inactive" && gRank !== "—"
    ? `Global #${gRank}`
    : gRank === "Inactive"
    ? "Global: Inactive"
    : "Global: —";

  const cRank = data.countryRank;
  $("ccCountryRank").textContent = cRank && cRank !== "Inactive" && cRank !== "—"
    ? `Country #${cRank}`
    : cRank === "Inactive"
    ? "Country: Inactive"
    : "Country: —";

  $("ccMax").textContent = (data.highestRating || data.rating || 0).toLocaleString();
  $("ccBest").textContent = data.bestRank && data.bestRank > 0 ? `#${data.bestRank.toLocaleString()}` : "—";
  $("ccContests").textContent = data.contestsParticipated || 0;
  $("ccSolved").textContent = (data.totalSolved || 0).toLocaleString();
  $("ccLink").href = data.profileUrl || `https://www.codechef.com/users/${encodeURIComponent(data.username)}`;
}

function renderGithub(data) {
  if (!data) return;
  $("ghUser").textContent = `@${data.username}`;
  $("ghStars").textContent = (data.totalStars || 0).toLocaleString();
  $("ghRepos").textContent = (data.publicRepos || 0).toLocaleString();
  $("ghFollowers").textContent = (data.followers || 0).toLocaleString();
  $("ghForks").textContent = (data.totalForks || 0).toLocaleString();
  $("ghLink").href = data.profileUrl || `https://github.com/${encodeURIComponent(data.username)}`;

  const langsContainer = $("ghLanguages");
  if (langsContainer) {
    if (data.topLanguages && Array.isArray(data.topLanguages) && data.topLanguages.length) {
      langsContainer.innerHTML = data.topLanguages
        .map((item) => {
          const lang = typeof item === "object" ? (item.name || item.lang || item[0] || "Code") : String(item);
          const count = typeof item === "object" ? (item.count ?? item[1] ?? "") : "";
          return `<span class="lang-tag">${escapeHtml(lang)}${count ? ` (${count})` : ""}</span>`;
        })
        .join("");
    } else {
      langsContainer.innerHTML = `<span class="lang-tag">Open Source Contributor</span>`;
    }
  }
}

// ==========================================================================
// Essential Feature #1: Unified Coding Dashboard Overview
// ==========================================================================

function renderCombinedDashboard() {
  const lcSolved = leetcodeData?.totalSolved || 0;
  const cfSolved = codeforcesData?.problemsSolvedFromFetchedSubmissions || 0;
  const ccSolved = codechefData?.totalSolved || 0;

  const hasAnyData = leetcodeData || codeforcesData || codechefData || githubData;

  const totalProblemsSolved = lcSolved + cfSolved + ccSolved;
  $("totalSolved").textContent = hasAnyData ? totalProblemsSolved.toLocaleString() : "—";

  const totalContests =
    (leetcodeData?.contestsParticipated || 0) +
    (codeforcesData?.contestsParticipated || 0) +
    (codechefData?.contestsParticipated || 0);

  $("contests").textContent = hasAnyData ? totalContests.toLocaleString() : "—";

  // Merge Heatmap Activity from all platforms
  const merged = mergeActivity(
    leetcodeData?.activity || {},
    codeforcesData?.activity || {},
    codechefData?.activity || {},
    githubData?.activity || {}
  );

  const { activeDays, streak, maxStreak } = activityStats(merged);

  $("activeDaysSub").textContent = `${activeDays} active days logged`;
  $("streak").textContent = streak > 0 ? `${streak} ${streak === 1 ? "day" : "days"}` : "0 days";

  const totalSubs = Object.values(merged).reduce((a, b) => a + b, 0);
  $("activityTotal").textContent = totalSubs.toLocaleString();

  // Calculate Consistency Score (0 - 100)
  if (hasAnyData) {
    const rawScore = Math.min(
      100,
      Math.round(activeDays * 0.25 + streak * 3.5 + Math.min(totalProblemsSolved * 0.05, 30) + totalContests * 0.5)
    );
    $("consistencyScore").textContent = `${rawScore} / 100`;
    $("consistencyGrade").textContent =
      rawScore >= 85 ? "⚡ Elite Polyglot" : rawScore >= 60 ? "🔥 Consistent Solver" : "🚀 Active Developer";
  } else {
    $("consistencyScore").textContent = "—";
    $("consistencyGrade").textContent = "Algorithm consistency";
  }

  renderHeatmap(merged);
}

function mergeActivity(...activityMaps) {
  const result = {};
  for (const map of activityMaps) {
    for (const [date, count] of Object.entries(map || {})) {
      result[date] = (result[date] || 0) + count;
    }
  }
  return result;
}

function activityStats(activity) {
  const days = Object.keys(activity)
    .filter((d) => activity[d] > 0)
    .sort();

  if (!days.length) return { activeDays: 0, streak: 0, maxStreak: 0 };

  // Calculate Max Streak
  let maxStreak = 1;
  let cur = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const current = new Date(days[i]);
    const diff = Math.round((current - prev) / 86400000);
    if (diff === 1) {
      cur++;
      maxStreak = Math.max(maxStreak, cur);
    } else {
      cur = 1;
    }
  }

  // Calculate Current Streak
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeDaysSet = new Set(days);
  let checkDate = new Date(today);
  const todayKey = formatDate(checkDate);

  if (!activeDaysSet.has(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (activeDaysSet.has(formatDate(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    activeDays: days.length,
    streak,
    maxStreak
  };
}

// ==========================================================================
// Essential Feature #2: Coding Activity Heatmap
// ==========================================================================

function renderHeatmap(activity) {
  const container = document.getElementById('heatmap');
  if (!container) return;
  
  // Find or create the scroll area wrapper
  const scrollArea = container.closest('.heatmap-scroll-area') || container.parentElement;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());
  
  const cellsCount = 371;
  const values = Object.values(activity);
  const max = Math.max(...values, 1);
  
  // Build month labels
  let monthsHtml = '<div class="heatmap-months-row">';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let lastMonth = -1;
  let weekCounts = {};
  for (let i = 0; i < cellsCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getDay() === 0) {
      const weekIdx = Math.floor(i / 7);
      const m = d.getMonth();
      if (m !== lastMonth) {
        weekCounts[weekIdx] = months[m];
        lastMonth = m;
      }
    }
  }
  const totalWeeks = Math.ceil(cellsCount / 7);
  for (let w = 0; w < totalWeeks; w++) {
    if (weekCounts[w]) {
      monthsHtml += `<span class="heatmap-month-label">${weekCounts[w]}</span>`;
    } else {
      monthsHtml += `<span class="heatmap-month-label"></span>`;
    }
  }
  monthsHtml += '</div>';
  
  // Day labels
  const dayLabels = '<div class="heatmap-day-labels"><span class="heatmap-day-label"></span><span class="heatmap-day-label">Mon</span><span class="heatmap-day-label"></span><span class="heatmap-day-label">Wed</span><span class="heatmap-day-label"></span><span class="heatmap-day-label">Fri</span><span class="heatmap-day-label"></span></div>';
  
  // Build cells
  container.innerHTML = '';
  for (let i = 0; i < cellsCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const count = activity[key] || 0;
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (count > 0) {
      const ratio = count / max;
      if (ratio <= 0.25) cell.classList.add('l1');
      else if (ratio <= 0.5) cell.classList.add('l2');
      else if (ratio <= 0.75) cell.classList.add('l3');
      else cell.classList.add('l4');
    } else {
      cell.classList.add('l0');
    }
    cell.title = `${key}: ${count} submission${count === 1 ? '' : 's'}`;
    container.appendChild(cell);
  }
  
  // Insert month labels and day labels
  const existingMonths = scrollArea.querySelector('.heatmap-months-row');
  if (existingMonths) existingMonths.remove();
  const existingDayLabels = scrollArea.querySelector('.heatmap-day-labels');
  if (existingDayLabels) existingDayLabels.remove();
  const existingWrapper = scrollArea.querySelector('.heatmap-wrapper');
  if (existingWrapper) existingWrapper.remove();
  
  scrollArea.innerHTML = '';
  const monthDiv = document.createElement('div');
  monthDiv.innerHTML = monthsHtml;
  scrollArea.appendChild(monthDiv.firstElementChild);
  
  const wrapper = document.createElement('div');
  wrapper.className = 'heatmap-wrapper';
  const dayDiv = document.createElement('div');
  dayDiv.innerHTML = dayLabels;
  wrapper.appendChild(dayDiv.firstElementChild);
  wrapper.appendChild(container);
  scrollArea.appendChild(wrapper);
}



// ==========================================================================
// Unique Feature: Smart Upcoming Contest Calendar
// ==========================================================================

async function fetchUpcomingContests() {
  const container = $("upcomingContestsGrid");
  if (!container) return;

  try {
    const res = await fetch("/api/contests/upcoming");
    if (!res.ok) throw new Error("Contests unavailable");
    const data = await res.json();
    upcomingContests = data.contests || [];
    renderUpcomingContests();
  } catch (err) {
    container.innerHTML = `
      <div class="contest-schedule-card loading-card">
        <span>Could not load upcoming contests at this time.</span>
      </div>
    `;
  }
}

function renderUpcomingContests() {
  const container = $("upcomingContestsGrid");
  if (!container) return;

  if (!upcomingContests.length) {
    container.innerHTML = `
      <div class="contest-schedule-card loading-card">
        <span>No upcoming contests scheduled right now. Check back soon!</span>
      </div>
    `;
    return;
  }

  container.innerHTML = upcomingContests.slice(0, 6).map((c) => {
    const startTime = new Date(c.startTime);
    const timeFormatted = startTime.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const diffMs = startTime.getTime() - Date.now();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const countdownStr = days > 0 ? `Starts in ${days}d ${hours}h` : `Starts in ${hours}h`;

    const tagBg = c.platformCode === "CF" ? "tag-cf" : c.platformCode === "CC" ? "tag-cc" : "lc-bg";

    return `
      <div class="contest-schedule-card">
        <div>
          <div class="cs-head">
            <span class="cs-platform-pill ${tagBg}">${c.platformCode}</span>
            <span class="cs-countdown">${countdownStr}</span>
          </div>
          <h4 class="cs-name">${escapeHtml(c.name)}</h4>
        </div>
        <div class="cs-time-row">
          <span>📅 ${timeFormatted}</span>
          <a href="${c.url}" target="_blank" rel="noreferrer" class="cs-register-btn">Register &rarr;</a>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// Historical Contest Timeline
// ==========================================================================

function buildCombinedContests() {
  combinedContests = [];

  if (codeforcesData?.contests?.length) {
    codeforcesData.contests.forEach((c) => {
      combinedContests.push({
        platform: "Codeforces",
        platformCode: "CF",
        contestName: c.contestName,
        rank: c.rank,
        rating: c.newRating,
        ratingChange: c.ratingChange,
        date: c.date
      });
    });
  }

  if (codechefData?.contests?.length) {
    codechefData.contests.forEach((c) => {
      combinedContests.push({
        platform: "CodeChef",
        platformCode: "CC",
        contestName: c.contestName,
        rank: c.rank,
        rating: c.rating,
        ratingChange: c.ratingChange,
        date: c.date
      });
    });
  }
  
  if (leetcodeData?.contestHistory?.length) {
    leetcodeData.contestHistory.forEach((c) => {
      combinedContests.push({
        platform: "LeetCode",
        platformCode: "LC",
        contestName: c.contest?.title || c.contestName || "LeetCode Contest",
        rank: c.ranking || c.rank,
        rating: Math.round(c.rating || 0),
        ratingChange: Math.round(c.ratingChange || 0),
        date: c.contest?.startTime ? new Date(c.contest.startTime * 1000).toISOString() : c.date
      });
    });
  }

  // Sort newest first
  combinedContests.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderContests() {
  const container = $("contestList");
  if (!container) return;

  let filtered = combinedContests;
  if (currentContestFilter === "codeforces") {
    filtered = combinedContests.filter((c) => c.platformCode === "CF");
  } else if (currentContestFilter === "codechef") {
    filtered = combinedContests.filter((c) => c.platformCode === "CC");
  } else if (currentContestFilter === "leetcode") {
    filtered = combinedContests.filter((c) => c.platformCode === "LC");
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <p>No contest history found for the selected filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((c) => {
    const isPos = c.ratingChange > 0;
    const isNeg = c.ratingChange < 0;
    const deltaClass = isPos ? "delta-pos" : isNeg ? "delta-neg" : "delta-zero";
    const deltaText = isPos ? `+${c.ratingChange}` : `${c.ratingChange || 0}`;

    const dateStr = c.date
      ? new Date(c.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "—";
    const tagClass = c.platformCode === "CF" ? "tag-cf" : c.platformCode === "CC" ? "tag-cc" : "tag-lc";

    return `
      <div class="contest-item">
        <div class="contest-left">
          <span class="contest-platform-tag ${tagClass}">${c.platformCode}</span>
          <div class="contest-details">
            <h4>${escapeHtml(c.contestName)}</h4>
            <p class="contest-date">${dateStr} &bull; ${escapeHtml(c.platform)}</p>
          </div>
        </div>
        <div class="contest-right">
          <div class="contest-rank-display">
            <span class="contest-rank-badge">#${c.rank}</span>
            <span class="contest-rank-label">Rank</span>
          </div>
          <div class="contest-rating-display">
            <span class="contest-rating-num">${c.rating || "—"}</span>
            <span class="${deltaClass}">${deltaText}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}



// ==========================================================================
// Shareable Profile Modal
// ==========================================================================

function updateShareCard() {
  const totalSolved = (leetcodeData?.totalSolved || 0) + (codeforcesData?.problemsSolvedFromFetchedSubmissions || 0) + (codechefData?.totalSolved || 0);
  const totalContests = (leetcodeData?.contestsParticipated || 0) + (codeforcesData?.contestsParticipated || 0) + (codechefData?.contestsParticipated || 0);

  const merged = mergeActivity(leetcodeData?.activity || {}, codeforcesData?.activity || {}, codechefData?.activity || {});
  const { streak } = activityStats(merged);

  $("shareName").textContent = currentUser?.name || $("codeforcesUser").value || "Competitive Coder";
  $("shareHandles").textContent = [
    $("leetcodeUser").value ? `LC: @${$("leetcodeUser").value}` : null,
    $("codeforcesUser").value ? `CF: @${$("codeforcesUser").value}` : null,
    $("codechefUser").value ? `CC: @${$("codechefUser").value}` : null,
    $("githubUser").value ? `GH: @${$("githubUser").value}` : null
  ].filter(Boolean).join(" • ") || "CodeTrack Developer";

  $("shareSolved").textContent = totalSolved.toLocaleString();
  $("shareContests").textContent = totalContests.toLocaleString();
  $("shareRank").textContent = "—";
  $("shareStreak").textContent = `${streak} days`;
}

function copyShareSummary() {
  const totalSolved = (leetcodeData?.totalSolved || 0) + (codeforcesData?.problemsSolvedFromFetchedSubmissions || 0) + (codechefData?.totalSolved || 0);
  const text = `🚀 Check out my unified developer stats on CodeTrack!\n` +
    `🎯 Total Problems Solved: ${totalSolved.toLocaleString()}\n` +
    `🏆 Contests Participated: ${$("shareContests").textContent}\n` +
    `🔥 Current Coding Streak: ${$("shareStreak").textContent}\n` +
    `Benchmark your journey at: http://localhost:3000`;

  navigator.clipboard.writeText(text).then(() => {
    alert("Profile summary copied to clipboard! Ready to share on LinkedIn or Twitter.");
  }).catch(() => {
    alert("Copied text:\n\n" + text);
  });
}

// Helpers
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
