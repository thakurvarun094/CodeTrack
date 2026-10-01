import { Router } from "express";
import { getCodeforces } from "../services/codeforcesService.js";
import { setCache, noCache } from "../utils/cache.js";
import { isValidHandle } from "../utils/validate.js";

const router = Router();

router.get("/:handle", async (req, res) => {
  try {
    const handle = req.params.handle;

    if (!isValidHandle(handle)) {
      noCache(res);
      return res.status(400).json({ error: "Invalid handle" });
    }

    const data = await getCodeforces(handle);
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
      error: error.message || "Unable to fetch Codeforces data"
    });
  }
});

export default router;
