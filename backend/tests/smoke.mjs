process.env.VERCEL = "1";
import assert from "node:assert/strict";
import http from "node:http";

const { default: app } = await import("../server.js");

const originalFetch = globalThis.fetch;

async function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function runTests() {
  console.log("Starting smoke tests...");
  const { server, baseUrl } = await startServer();

  try {
    // -------------------------------------------------------------
    // Test 1: Invalid handle -> 400, zero fetch calls, no-store
    // -------------------------------------------------------------
    console.log("Testing invalid handle validation...");
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      return new Response(JSON.stringify({}), { status: 200 });
    };

    const invalidRes = await originalFetch(`${baseUrl}/api/leetcode/a%20b%3Bdrop`);
    assert.equal(invalidRes.status, 400, "Invalid handle should return 400");
    const invalidBody = await invalidRes.json();
    assert.deepEqual(invalidBody, { error: "Invalid handle" });
    assert.equal(fetchCount, 0, "Zero fetch calls should be made for invalid handles");
    const invalidCacheHeader = invalidRes.headers.get("cache-control") || "";
    assert.ok(invalidCacheHeader.includes("no-store"), "Error response must include no-store");
    console.log("✓ Invalid handle returned 400 with 0 fetch calls and no-store");

    // -------------------------------------------------------------
    // Test 2: Mocked 404 -> 404 and no-store
    // -------------------------------------------------------------
    console.log("Testing 404 handling...");
    globalThis.fetch = async (url) => {
      // LeetCode GraphQL returns empty matchedUser for not found
      return new Response(JSON.stringify({ data: { matchedUser: null } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const notFoundRes = await originalFetch(`${baseUrl}/api/leetcode/nonexistentuser`);
    assert.equal(notFoundRes.status, 404, "Not found user should return 404");
    const notFoundCache = notFoundRes.headers.get("cache-control") || "";
    assert.ok(notFoundCache.includes("no-store"), "404 response must include no-store");
    console.log("✓ 404 returned 404 with no-store");

    // -------------------------------------------------------------
    // Test 3: Mocked Timeout -> 504 and no-store
    // -------------------------------------------------------------
    console.log("Testing timeout handling (504)...");
    globalThis.fetch = async () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    };

    const timeoutRes = await originalFetch(`${baseUrl}/api/codeforces/timeoutuser`);
    assert.equal(timeoutRes.status, 504, "Upstream timeout should return 504");
    const timeoutCache = timeoutRes.headers.get("cache-control") || "";
    assert.ok(timeoutCache.includes("no-store"), "504 response must include no-store");
    console.log("✓ Timeout returned 504 with no-store");

    // -------------------------------------------------------------
    // Test 4: Mocked 500 -> 500 or 502 and no-store
    // -------------------------------------------------------------
    console.log("Testing upstream 500 handling...");
    globalThis.fetch = async () => {
      return new Response("Internal Server Error", { status: 500 });
    };

    const error500Res = await originalFetch(`${baseUrl}/api/codeforces/servererroruser`);
    assert.ok(
      error500Res.status === 500 || error500Res.status === 502,
      `Upstream error should return 500 or 502, got ${error500Res.status}`
    );
    const error500Cache = error500Res.headers.get("cache-control") || "";
    assert.ok(error500Cache.includes("no-store"), "500 response must include no-store");
    console.log("✓ Mocked upstream 500 returned 500/502 with no-store");

    // -------------------------------------------------------------
    // Test 5: In-memory cache for contests (called twice -> fetched once)
    // -------------------------------------------------------------
    console.log("Testing contests in-memory caching...");
    let contestFetchCount = 0;
    globalThis.fetch = async (url) => {
      contestFetchCount++;
      const urlStr = String(url);
      if (urlStr.includes("codeforces.com")) {
        return new Response(
          JSON.stringify({
            status: "OK",
            result: [
              {
                id: 9999,
                name: "Test Contest",
                phase: "BEFORE",
                startTimeSeconds: Math.floor(Date.now() / 1000) + 3600,
                durationSeconds: 7200
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("leetcode.com")) {
        return new Response(
          JSON.stringify({
            data: { topTwoContests: [] }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("codechef.com")) {
        return new Response(
          JSON.stringify({ future_contests: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    };

    const contestRes1 = await originalFetch(`${baseUrl}/api/contests/upcoming`);
    assert.equal(contestRes1.status, 200);
    const c1Data = await contestRes1.json();
    assert.ok(Array.isArray(c1Data.contests) && c1Data.contests.length > 0);
    const c1Cache = contestRes1.headers.get("cache-control") || "";
    assert.ok(c1Cache.includes("s-maxage=900"), "Contest response must include s-maxage=900");
    const countAfterFirst = contestFetchCount;
    assert.ok(countAfterFirst > 0, "Initial contest fetch should call upstreams");

    const contestRes2 = await originalFetch(`${baseUrl}/api/contests/upcoming`);
    assert.equal(contestRes2.status, 200);
    const countAfterSecond = contestFetchCount;
    assert.equal(
      countAfterSecond,
      countAfterFirst,
      "Second contest call within TTL should return from in-memory cache with zero extra fetch calls"
    );
    console.log("✓ Contests called twice triggered upstream fetches only once");

    // -------------------------------------------------------------
    // Test 6: Health check unchanged and not cached
    // -------------------------------------------------------------
    console.log("Testing /api/health endpoint...");
    const healthRes = await originalFetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthBody = await healthRes.json();
    assert.deepEqual(healthBody, {
      ok: true,
      service: "CodeTrack API",
      supportedPlatforms: ["LeetCode", "Codeforces", "CodeChef", "GitHub"]
    });
    const healthCache = healthRes.headers.get("cache-control") || "";
    assert.ok(!healthCache.includes("s-maxage"), "Health check must not have s-maxage cache header");
    console.log("✓ /api/health is unchanged and not CDN cached");

    // -------------------------------------------------------------
    // Test 7: Rate limiter (60 allowed, 61st returns 429)
    // -------------------------------------------------------------
    console.log("Testing per-IP rate limiter (limit: 60 per min)...");
    // We already made some requests. Let's make rapid requests until we hit the 429 limit.
    let hitRateLimit = false;
    let rateLimitResponse = null;

    // Send up to 70 requests rapidly
    for (let i = 1; i <= 70; i++) {
      const res = await originalFetch(`${baseUrl}/api/codeforces/invalid*handle`);
      if (res.status === 429) {
        hitRateLimit = true;
        rateLimitResponse = res;
        break;
      }
    }

    assert.ok(hitRateLimit, "Requests exceeding 60 in windowMs must hit 429 rate limit");
    const rlBody = await rateLimitResponse.json();
    assert.deepEqual(rlBody, { error: "Too many requests, please slow down." });
    console.log("✓ Rate limiting active: 429 returned with expected message");

    // Check health check remains accessible even when rate limit is active
    const healthAfterRL = await originalFetch(`${baseUrl}/api/health`);
    assert.equal(healthAfterRL.status, 200, "Health check must remain accessible and exempt from rate limiting");
    console.log("✓ /api/health is exempt from rate limiting");

    console.log("\nALL SMOKE TESTS PASSED SUCCESSFULLY! ✅");
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
  }
}

runTests().catch((err) => {
  console.error("Smoke test failure:", err);
  process.exit(1);
});
