import express from "express";
import UserProgress from "../models/UserProgress.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    let progress = await UserProgress.findOne({ userId: req.user.id });

    if (!progress) {
      progress = await UserProgress.create({
        userId: req.user.id,
        lastQuestionNumber: null,
        remainingRandomPool: [],
        randomCycleStats: { total: 0, correct: 0 },
        wrongQuestionNumbers: []
      });
    }

    res.json(progress);
  } catch (error) {
    console.error("Failed to fetch progress:", error);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const {
      lastQuestionNumber,
      remainingRandomPool,
      randomCycleStats,
      wrongQuestionNumbers
    } = req.body;

    const progress = await UserProgress.findOneAndUpdate(
      { userId: req.user.id },
      {
        userId: req.user.id,
        lastQuestionNumber,
        remainingRandomPool,
        randomCycleStats,
        wrongQuestionNumbers
      },
      {
        returnDocument: "after",
        upsert: true
      }
    );

    res.json(progress);
  } catch (error) {
    console.error("Failed to save progress:", error);
    res.status(500).json({ error: "Failed to save progress" });
  }
});

export default router;