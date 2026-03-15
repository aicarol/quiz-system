import dotenv from "dotenv";
import mongoose from "mongoose";
import Question from "../models/Question.js";

dotenv.config();

const sampleQuestions = [
  {
    questionNumber: 1,
    title: "Question 1",
    question:
      "Countries like the United States do not self-regulate the engineering profession. What is the meaning of a self-regulating profession?",
    options: [
      {
        key: "A",
        text: "A group of people who review each other's work for correctness.",
        isCorrect: false,
        isTrap: true
      },
      {
        key: "B",
        text: "Each province/territory has passed an Act to form an Association which regulates the profession.",
        isCorrect: true,
        isTrap: false
      },
      {
        key: "C",
        text: "An association ensures its members follow bylaws and pay dues.",
        isCorrect: false,
        isTrap: false
      },
      {
        key: "D",
        text: "Interprovincial teams that police the decisions of their members.",
        isCorrect: false,
        isTrap: false
      }
    ],
    answer: "B",
    explanation:
      "Each province/territory has passed an Act to form an Association which regulates the profession.",
    sourceType: "red-incorrect",
    topic: "Professionalism"
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected for seeding");

    await Question.deleteMany({});
    await Question.insertMany(sampleQuestions);

    console.log("Sample questions inserted successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seedDatabase();