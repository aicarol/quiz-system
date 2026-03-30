import express from "express";
import Question from "../models/Question.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { examType } = req.query;

    if (!examType) {
      return res.status(400).json({ error: "examType is required" });
    }

    const questions = await Question.find({ examType }).sort({
      questionNumber: 1
    });

    res.json(questions);
  } catch (error) {
    console.error("Failed to fetch questions:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

router.get("/random", async (req, res) => {
  try {
    const { examType } = req.query;

    if (!examType) {
      return res.status(400).json({ error: "examType is required" });
    }

    const count = await Question.countDocuments({ examType });

    if (count === 0) {
      return res.status(404).json({ error: "No questions found" });
    }

    const randomIndex = Math.floor(Math.random() * count);
    const question = await Question.findOne({ examType }).skip(randomIndex);

    res.json(question);
  } catch (error) {
    console.error("Failed to fetch random question:", error);
    res.status(500).json({ error: "Failed to fetch random question" });
  }
});

router.get("/count", async (req, res) => {
  try {
    const { examType } = req.query;

    if (!examType) {
      return res.status(400).json({ error: "examType is required" });
    }

    const count = await Question.countDocuments({ examType });
    res.json({ count });
  } catch (error) {
    console.error("Failed to count questions:", error);
    res.status(500).json({ error: "Failed to count questions" });
  }
});

export default router;