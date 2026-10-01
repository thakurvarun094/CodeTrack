import { Router } from "express";
import { getCodechef } from "../services/codechefService.js";
import { setCache, noCache } from "../utils/cache.js";

const router = Router();

router.get("/:handle", async (req, res) => {
  try {
    const data = await getCodechef(req.params.handle);
    setCache(res, 600);
    res.json(data);
  } catch (error) {
    noCache(res);
    if (error.code === "UPSTREAM_TIMEOUT") {
      return res.status(504).json({
        error: error.message || "Upstream request timed out"
      });
    }
    const isNotFound = error.message.includes("not found");
    res.status(isNotFound ? 404 : 500).json({
      error: error.message || "Failed to fetch CodeChef data"
    });
  }
});

export default router;
