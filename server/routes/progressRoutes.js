import express from "express";
import UserProgress from "../models/UserProgress.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { examType } = req.query;

    if (!examType) {
      return res.status(400).json({ error: "examType is required" });
    }

    let progress = await UserProgress.findOne({
      userId: req.user.id,
      examType
    });

    if (!progress) {
      progress = await UserProgress.create({
        userId: req.user.id,
        examType,
        lastQuestionNumber: null,
        remainingRandomPool: [],
        randomCycleStats: { total: 0, correct: 0 },
        wrongQuestionNumbers: [],
        favoriteQuestionNumbers: []
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
      examType,
      lastQuestionNumber,
      remainingRandomPool,
      randomCycleStats,
      wrongQuestionNumbers,
      favoriteQuestionNumbers
    } = req.body;

    if (!examType) {
      return res.status(400).json({ error: "examType is required" });
    }

    await UserProgress.updateOne(
      {
        userId: req.user.id,
        examType
      },
      {
        $set: {
          userId: req.user.id,
          examType,
          lastQuestionNumber,
          remainingRandomPool,
          randomCycleStats,
          wrongQuestionNumbers,
          favoriteQuestionNumbers
        }
      },
      {
        upsert: true
      }
    );

    const progress = await UserProgress.findOne({
      userId: req.user.id,
      examType
    });

    res.json(progress);
  } catch (error) {
    console.error("Failed to save progress:", error);
    res.status(500).json({ error: "Failed to save progress" });
  }
});

export default router;