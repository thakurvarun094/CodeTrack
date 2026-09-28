import { Router } from "express";
import { getGithub } from "../services/githubService.js";

const router = Router();


router.get("/:username", async (req, res) => {
  try {
    const data = await getGithub(req.params.username);
    res.json(data);
  } catch (error) {
    const isNotFound = error.message.includes("not found");
    res.status(isNotFound ? 404 : 500).json({
      error: error.message || "Failed to fetch GitHub data"
    });
  }
});

export default router;
