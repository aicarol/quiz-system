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
    examType: {
      type: String,
      required: true,
      enum: ["PENG", "CITIZEN"]
    },

    questionNumber: {
      type: Number,
      required: true
    },

    title: String,
    question: String,
    options: [optionSchema],
    answer: String,
    answerText: {
      type: String,
      default: ""
    },
    explanation: String,
    sourceType: String,
    topic: String,
    sourceFile: String
  },
  { timestamps: true }
);

questionSchema.index(
  { examType: 1, questionNumber: 1 },
  { unique: true }
);

const Question = mongoose.model("Question", questionSchema);

export default Question;