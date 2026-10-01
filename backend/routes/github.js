import { Router } from "express";
import { getGithub } from "../services/githubService.js";
import { setCache, noCache } from "../utils/cache.js";
import { isValidHandle } from "../utils/validate.js";

const router = Router();

router.get("/:username", async (req, res) => {
  try {
    const username = req.params.username;

    if (!isValidHandle(username)) {
      noCache(res);
      return res.status(400).json({ error: "Invalid handle" });
    }

    const data = await getGithub(username);
    setCache(res, 600);
    res.json(data);
  } catch (error) {
    noCache(res);
    if (error.code === "UPSTREAM_TIMEOUT") {
      return res.status(504).json({
        error: error.message || "Upstream request timed out"
      });
    }
    const isNotFound = error.message && error.message.includes("not found");
    res.status(isNotFound ? 404 : 500).json({
      error: error.message || "Failed to fetch GitHub data"
    });
  }
});

export default router;
