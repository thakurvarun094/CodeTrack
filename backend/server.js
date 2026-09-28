import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import codeforcesRouter from "./routes/codeforces.js";
import leetcodeRouter from "./routes/leetcode.js";
import codechefRouter from "./routes/codechef.js";
import githubRouter from "./routes/github.js";
import contestsRouter from "./routes/contests.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "..", "frontend");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    service: "CodeTrack API",
    supportedPlatforms: ["LeetCode", "Codeforces", "CodeChef", "GitHub"]
  });
});

app.use("/api/codeforces", codeforcesRouter);
app.use("/api/leetcode", leetcodeRouter);
app.use("/api/codechef", codechefRouter);
app.use("/api/github", githubRouter);
app.use("/api/contests", contestsRouter);

app.use(express.static(frontendPath));

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`CodeTrack running at http://localhost:${PORT}`);
  });
}

