import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { DOMParser } from "xmldom";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "../models/Question.js";

dotenv.config();

const GREEN_VALUES = new Set([
  "00B050",
  "92D050",
  "70AD47",
  "6AA84F"
]);

const RED_VALUES = new Set([
  "FF0000",
  "C00000",
  "E53935"
]);

function normalizeColor(color) {
  if (!color) return null;
  return color.toUpperCase();
}

function cleanText(text) {
  return text
    .replace(/\[Control\]/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^\s*[○●o]\s*/u, "")
    .trim();
}

function isQuestionHeader(text) {
  return /\bQuestion\s+\d+/i.test(text);
}

function isExplanationHeader(text) {
  return /^(Correct|Incorrect)\b/i.test(text);
}

function isLikelyOptionParagraph(text) {
  if (!text) return false;
  if (isQuestionHeader(text)) return false;
  if (isExplanationHeader(text)) return false;

  const cleaned = cleanText(text);
  if (!cleaned) return false;

  if (cleaned.length < 3) return false;

  return true;
}

function analyzeRuns(runs) {
  const colors = runs.map((r) => normalizeColor(r.color)).filter(Boolean);

  const hasGreen = colors.some((c) => GREEN_VALUES.has(c));
  const hasRed = colors.some((c) => RED_VALUES.has(c));

  const hasBoldNonRed = runs.some((r) => {
    const color = normalizeColor(r.color);
    return r.bold && !RED_VALUES.has(color);
  });

  return {
    hasGreen,
    hasRed,
    hasBoldNonRed
  };
}

async function readDocx(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(fileBuffer);

  const documentXml = await zip.file("word/document.xml").async("string");
  const doc = new DOMParser().parseFromString(documentXml, "text/xml");

  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));

  const results = paragraphs.map((p, index) => {
    const runs = Array.from(p.getElementsByTagName("w:r")).map((r) => {
      const texts = Array.from(r.getElementsByTagName("w:t"))
        .map((t) => t.textContent)
        .join("");

      const isBold = r.getElementsByTagName("w:b").length > 0;

      let color = null;
      const colorNode = r.getElementsByTagName("w:color")[0];
      if (colorNode) {
        color = colorNode.getAttribute("w:val");
      }

      return {
        text: texts,
        bold: isBold,
        color: normalizeColor(color)
      };
    });

    const fullText = runs.map((r) => r.text).join("").trim();

    return {
      index,
      text: fullText,
      cleanedText: cleanText(fullText),
      runs
    };
  });

  return results.filter((p) => p.cleanedText);
}

function finalizeQuestion(question) {
  if (!question) return null;

  const hasGreenCorrect = question.options.some((opt) => opt.isCorrect);

  if (!hasGreenCorrect) {
    const boldBlackOption = question.options.find(
      (opt) => opt._hasBoldNonRed && !opt.isTrap
    );

    if (boldBlackOption) {
      boldBlackOption.isCorrect = true;
    }
  }

  const correctOption = question.options.find((opt) => opt.isCorrect);
  question.answer = correctOption ? correctOption.key : "";

  question.options = question.options.map((opt) => ({
    key: opt.key,
    text: opt.text,
    isCorrect: opt.isCorrect,
    isTrap: opt.isTrap
  }));

  question.question = question.question.trim();
  question.explanation = question.explanation.trim();

  return question;
}

function parseQuestions(paragraphs) {
  const questions = [];
  let current = null;
  let state = "idle";

  for (const p of paragraphs) {
    const text = p.cleanedText;

    if (isQuestionHeader(text)) {
      if (current) {
        questions.push(finalizeQuestion(current));
      }

      const match = text.match(/Question\s+(\d+)/i);
      const number = match ? parseInt(match[1], 10) : null;

      current = {
        questionNumber: number,
        title: number ? `Question ${number}` : text,
        question: "",
        options: [],
        answer: "",
        explanation: "",
        sourceType: "",
        topic: ""
      };

      state = "question";
      continue;
    }

    if (!current) continue;

    if (isExplanationHeader(text)) {
      state = "explanation";
      current.sourceType = /^Correct\b/i.test(text)
        ? "green-correct"
        : "red-incorrect";

      current.explanation += (current.explanation ? " " : "") + text;
      continue;
    }

    if (state === "question") {
      const optionCandidate = isLikelyOptionParagraph(text);
      const { hasGreen, hasRed, hasBoldNonRed } = analyzeRuns(p.runs);

      const looksLikeOption =
        optionCandidate &&
        (hasGreen || hasRed || hasBoldNonRed || current.options.length > 0);

      if (looksLikeOption && current.options.length < 4) {
        const optionKey = String.fromCharCode(65 + current.options.length);

        current.options.push({
          key: optionKey,
          text,
          isCorrect: hasGreen,
          isTrap: hasRed,
          _hasBoldNonRed: hasBoldNonRed
        });

        if (hasGreen) {
          current.sourceType = "green-correct";
        } else if (hasRed && !current.sourceType) {
          current.sourceType = "red-incorrect";
        }

        continue;
      }

      current.question += (current.question ? " " : "") + text;
      continue;
    }

    if (state === "explanation") {
      current.explanation += (current.explanation ? " " : "") + text;
    }
  }

  if (current) {
    questions.push(finalizeQuestion(current));
  }

  return questions;
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected for import");

    const inputFile = process.argv[2] || "questions.docx";
    const filePath = path.join(process.cwd(), "scripts", inputFile);

    const paragraphs = await readDocx(filePath);

    const questions = parseQuestions(paragraphs).map((q) => ({
      ...q,
      sourceFile: inputFile
    }));

    console.log(`Parsed ${questions.length} questions from ${inputFile}`);

    if (questions.length > 0) {
      console.log("Sample parsed question:");
      console.log(JSON.stringify(questions[0], null, 2));
    }

    for (const q of questions) {
      await Question.updateOne(
        { questionNumber: q.questionNumber },
        { $set: q },
        { upsert: true }
      );
    }

    console.log(`Upserted ${questions.length} questions successfully`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Import error:", error);
    process.exit(1);
  }
}

main();