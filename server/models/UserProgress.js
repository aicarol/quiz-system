import mongoose from "mongoose";

const userProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    lastQuestionNumber: {
      type: Number,
      default: null
    },
    remainingRandomPool: {
      type: [Number],
      default: []
    },
    randomCycleStats: {
      total: {
        type: Number,
        default: 0
      },
      correct: {
        type: Number,
        default: 0
      }
    },
    wrongQuestionNumbers: {
      type: [Number],
      default: []
    },
    favoriteQuestionNumbers: {
      type: [Number],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("UserProgress", userProgressSchema);