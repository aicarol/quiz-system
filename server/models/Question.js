import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    key: String,
    text: String,
    isCorrect: { type: Boolean, default: false },
    isTrap: { type: Boolean, default: false }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionNumber: { type: Number, unique: true },
    title: String,
    question: String,
    options: [optionSchema],
    answer: String,
    explanation: String,
    sourceType: String,
    topic: String,
    sourceFile: String
  },
  { timestamps: true }
);

const Question = mongoose.model("Question", questionSchema);

export default Question;