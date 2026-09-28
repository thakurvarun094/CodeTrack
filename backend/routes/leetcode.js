import { Router } from "express";
import { getLeetcode } from "../services/leetcodeService.js";

const router = Router();

router.get("/:username", async (req, res) => {
  try {
    const username = String(req.params.username).trim();

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const data = await getLeetcode(username);
    res.json(data);
  } catch (error) {
    res.status(404).json({
      error: error.message || "Unable to fetch LeetCode data"
    });
  }
});

export default router;
