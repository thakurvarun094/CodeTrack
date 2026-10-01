export async function fetchWithTimeout(url, options = {}, ms = 8000) {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      const e = new Error("Upstream request timed out");
      e.code = "UPSTREAM_TIMEOUT";
      throw e;
    }
    throw err;
  }
}
