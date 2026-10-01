import { Router } from "express";
import { getLeetcode } from "../services/leetcodeService.js";
import { setCache, noCache } from "../utils/cache.js";

const router = Router();

router.get("/:username", async (req, res) => {
  try {
    const username = String(req.params.username).trim();

    if (!username) {
      noCache(res);
      return res.status(400).json({ error: "Username is required" });
    }

    const data = await getLeetcode(username);
    setCache(res, 600);
    res.json(data);
  } catch (error) {
    noCache(res);
    res.status(404).json({
      error: error.message || "Unable to fetch LeetCode data"
    });
  }
});

export default router;
