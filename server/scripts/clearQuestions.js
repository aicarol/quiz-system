import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "../models/Question.js";

dotenv.config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await Question.deleteMany({});
    console.log(`Deleted ${result.deletedCount} questions`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();