import { Router } from "express";
import { getCodeforces } from "../services/codeforcesService.js";

const router = Router();

router.get("/:handle", async (req, res) => {
  try {
    const handle = String(req.params.handle).trim();

    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    const data = await getCodeforces(handle);
    res.json(data);
  } catch (error) {
    res.status(404).json({
      error: error.message || "Unable to fetch Codeforces data"
    });
  }
});

export default router;
