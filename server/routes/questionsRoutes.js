import express from "express";
import Question from "../models/Question.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const questions = await Question.find().sort({ questionNumber: 1 });
    res.json(questions);
  } catch (error) {
    console.error("Failed to fetch questions:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

router.get("/random", async (req, res) => {
  try {
    const count = await Question.countDocuments();

    if (count === 0) {
      return res.status(404).json({ error: "No questions found" });
    }

    const randomIndex = Math.floor(Math.random() * count);
    const question = await Question.findOne().skip(randomIndex);

    res.json(question);
  } catch (error) {
    console.error("Failed to fetch random question:", error);
    res.status(500).json({ error: "Failed to fetch random question" });
  }
});

router.get("/count", async (req, res) => {
  try {
    const count = await Question.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to count questions" });
  }
});

export default router;