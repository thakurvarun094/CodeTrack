import { Router } from "express";
import { getUpcomingContests } from "../services/contestService.js";

const router = Router();

router.get("/upcoming", async (req, res) => {
  try {
    const contests = await getUpcomingContests();
    res.json({ contests });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch upcoming contests" });
  }
});

export default router;
