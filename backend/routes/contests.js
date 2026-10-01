import { Router } from "express";
import { getUpcomingContests } from "../services/contestService.js";
import { setCache, noCache } from "../utils/cache.js";

const router = Router();

router.get("/upcoming", async (req, res) => {
  try {
    const contests = await getUpcomingContests();
    setCache(res, 900);
    res.json({ contests });
  } catch (error) {
    noCache(res);
    if (error.code === "UPSTREAM_TIMEOUT") {
      return res.status(504).json({
        error: error.message || "Upstream request timed out"
      });
    }
    res.status(500).json({ error: error.message || "Failed to fetch upcoming contests" });
  }
});

export default router;
