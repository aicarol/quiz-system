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
    .replace(/^\s*[○●•◦▪▫o]\s*/u, "")
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
  question.answerText = correctOption ? correctOption.text : "";

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

function parseQuestionsColorFormat(paragraphs) {
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
        (
          hasGreen ||
          hasRed ||
          hasBoldNonRed ||
          current.options.length > 0 ||
          (
            current.question &&
            current.options.length < 4 &&
            text.length < 220
          )
        );

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

function parseQuestionsAnswerFormat(paragraphs) {
  const questions = [];

  const fullText = paragraphs
    .map((p) => p.cleanedText)
    .filter(Boolean)
    .join("\n");

  const blocks = fullText
    .split(/(?=Question\s+\d+[\.\:]?\s*)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const numberMatch = block.match(/^Question\s+(\d+)/i);
    if (!numberMatch) continue;

    const questionNumber = parseInt(numberMatch[1], 10);
    const title = `Question ${questionNumber}`;

    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let i = 0;

    // Question text
    let questionParts = [];
    while (i < lines.length && !/^[A-D](?:[\.\),]|\s+)/i.test(lines[i])) {
      if (/^Question\s+\d+[\.\:]?\s*/i.test(lines[i])) {
        questionParts.push(lines[i].replace(/^Question\s+\d+[\.\:]?\s*/i, ""));
      } else {
        questionParts.push(lines[i]);
      }
      i++;
    }

    const questionText = cleanText(questionParts.join(" "));

    // Options
    const options = [];
    let currentOption = null;

    while (i < lines.length) {
      const line = lines[i];

      if (/^Answer\s*:?\s*$/i.test(line) || /^Answer\s*:/i.test(line)) {
        break;
      }

      // Accept:
      // A. xxx
      // A) xxx
      // A, xxx
      // A xxx
      const optionMatch = line.match(/^([A-D])(?:[\.\),]\s*|\s+)(.*)$/i);

      if (optionMatch) {
        if (currentOption) {
          options.push(currentOption);
        }

        currentOption = {
          key: optionMatch[1].toUpperCase(),
          text: cleanText(optionMatch[2]),
          isCorrect: false,
          isTrap: false
        };
      } else if (currentOption) {
        currentOption.text = cleanText(`${currentOption.text} ${line}`);
      }

      i++;
    }

    if (currentOption) {
      options.push(currentOption);
    }

    // Answer
    let answerLines = [];

    if (i < lines.length) {
      if (/^Answer\s*:?\s*$/i.test(lines[i])) {
        i++;
        while (i < lines.length && !/^Question\s+\d+/i.test(lines[i])) {
          answerLines.push(lines[i]);
          i++;
        }
      } else if (/^Answer\s*:/i.test(lines[i])) {
        answerLines.push(lines[i].replace(/^Answer\s*:\s*/i, ""));
        i++;
        while (i < lines.length && !/^Question\s+\d+/i.test(lines[i])) {
          answerLines.push(lines[i]);
          i++;
        }
      }
    }

    const rawAnswer = cleanText(answerLines.join(" "));

    let answerKey = "";
    let answerText = "";

    if (rawAnswer) {
      const answerMatch = rawAnswer.match(/^([A-D])(?:[\.\),]\s*|\s+)(.*)$/i);
      if (answerMatch) {
        answerKey = answerMatch[1].toUpperCase();
        answerText = cleanText(answerMatch[2]);
      } else {
        answerText = rawAnswer;
      }
    }

    const finalOptions = options.map((opt) => {
      let isCorrect = false;

      if (answerKey && opt.key === answerKey) {
        isCorrect = true;
      } else if (
        answerText &&
        cleanText(opt.text).toLowerCase() === answerText.toLowerCase()
      ) {
        isCorrect = true;
        answerKey = opt.key;
      }

      return {
        ...opt,
        isCorrect
      };
    });

    const correctOption = finalOptions.find((opt) => opt.isCorrect);

    if (questionText && finalOptions.length === 4) {
      questions.push({
        questionNumber,
        title,
        question: questionText,
        options: finalOptions,
        answer: answerKey,
        answerText: correctOption ? correctOption.text : "",
        explanation: "",
        sourceType: "answer-line",
        topic: ""
      });
    } else {
      console.log(`Skipped Question ${questionNumber}`);
      console.log("Options found:", finalOptions.length);
      console.log("Raw block:\n", block);
      console.log("==================================================");
    }
  }

  return questions;
}

function getExamType(inputFile) {
  const lower = inputFile.toLowerCase();

  if (lower.includes("peng") || lower.includes("ppe")) {
    return "PENG";
  }

  if (lower.includes("citizen") || lower.includes("citizenship")) {
    return "CITIZEN";
  }

  throw new Error(`Cannot determine examType from file name: ${inputFile}`);
}

function getFormatType(inputFile) {
  const lower = inputFile.toLowerCase();

  if (lower.includes("citizen") || lower.includes("citizenship")) {
    return "answer-line";
  }

  return "color";
}

function applyManualFixes(questions) {
  return questions.map((q) => {
    if (q.examType === "PENG" && q.questionNumber === 412) {
      return {
        ...q,
        question:
          "Wyatt, P.Eng., is employed by Green and Green Inc., a company that specializes in corporate construction projects in Surrey, B.C. Last month, Wyatt received an email from head office that explained the company would be implementing the use of a new design software system for all future projects, effective immediately. The email also included the software manual that Wyatt was required to read and review by the end of the week. Upon further research, Wyatt learns that this software program had been developed in Los Angeles, and therefore, the final product had never been authenticated by a professional member belonging to British Columbia’s provincial engineering association. According to most association’s guidelines, is Wyatt able to authenticate any designs that contain results obtained by this software program, and why or why not?",
        options: [
          {
            key: "A",
            text: "No, Wyatt cannot authenticate designs based on results from this software, unless he is able to generate identical results on a software program that had been designed and/or authenticated by a professional member in his provincial association.",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "B",
            text: "No, Wyatt cannot authenticate any designs obtained from this software program, because the software program itself was not designed and/or authenticated by a professional member in his provincial association.",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "C",
            text: "Yes, Wyatt can authenticate designs based on results from this software, as long as he carefully reviews the results and is willing to take full responsibility for them, in the same way, a professional would review any work prepared by another individual before authenticating it.",
            isCorrect: true,
            isTrap: false
          },
          {
            key: "D",
            text: "Yes, Wyatt can authenticate any designs obtained by this software program, because his employer instructed him to utilize the software program. Therefore, the employer would be responsible for both initially reviewing the program and for all results obtained from the program, thereafter.",
            isCorrect: false,
            isTrap: false
          }
        ],
        answer: "C"
      };
    }

    if (q.examType === "PENG" && q.questionNumber === 274) {
      return {
        ...q,
        question:
          "Ethan, P.Eng., explains Continuing Professional Development (CPD) to his niece Ashley, an M.I.T. (Member in Training). He is very passionate about the subject and decides to delve into recommendations set forth by Engineers Canada regarding CPD. Ethan states the following three facts, 1) “Each association should require CPD reporting bi-annually.” 2) “Preferably, over-the-phone CPD reporting should be made available to members.” 3) “There should be consequences for non-compliance.” Which statement(s), is/are correct?",
        options: [
          { key: "A", text: "1 & 2", isCorrect: false, isTrap: true },
          { key: "B", text: "1", isCorrect: false, isTrap: false },
          { key: "C", text: "3", isCorrect: true, isTrap: false },
          { key: "D", text: "2 & 3", isCorrect: false, isTrap: false }
        ],
        answer: "C"
      };
    }

    if (q.examType === "PENG" && q.questionNumber === 45) {
      return {
        ...q,
        question:
          "If you are at work and you believe that the working conditions are dangerous to your health and safety, the Occupational Health and Safety Act states that you have the right to:",
        options: [
          { key: "A", text: "Report your boss", isCorrect: false, isTrap: true },
          { key: "B", text: "Correct the situation yourself", isCorrect: false, isTrap: false },
          { key: "C", text: "Demand higher compensation", isCorrect: false, isTrap: false },
          { key: "D", text: "Refuse work", isCorrect: true, isTrap: false }
        ],
        answer: "D"
      };
    }

    if (q.examType === "PENG" && q.questionNumber === 84) {
      return {
        ...q,
        question:
          "When your duty to your employer conflicts with your duty the public welfare, the Code of Ethics provides 3 courses of action. Which of the following is NOT one of them?",
        options: [
          { key: "A", text: "Correct the problem", isCorrect: false, isTrap: false },
          { key: "B", text: "Blow the whistle", isCorrect: false, isTrap: false },
          { key: "C", text: "Resign in protest", isCorrect: false, isTrap: false },
          { key: "D", text: "Contact a lawyer", isCorrect: true, isTrap: false }
        ],
        answer: "D",
        explanation:
          "Correcting the problem should be the first option exercised but whistle-blowing and resigning are also acceptable. 'Contact a lawyer' is the correct answer."
      };
    }

    if (q.examType === "PENG" && q.questionNumber === 246) {
      return {
        ...q,
        question:
          "Most Provincial or Territorial Occupational Health and Safety Acts stipulate that every worksite must have a prime contractor if there are __ or more employers involved in work at the same time.",
        options: [
          { key: "A", text: "five", isCorrect: false, isTrap: false },
          { key: "B", text: "one", isCorrect: false, isTrap: false },
          { key: "C", text: "three", isCorrect: false, isTrap: false },
          { key: "D", text: "two", isCorrect: true, isTrap: false }
        ],
        answer: "D",
        explanation:
          "Two is the correct answer. If there are 2 or more employers, a prime contractor must be identified so that it can take overall responsibility for the worksite."
      };
    }

    if (q.examType === "PENG" && q.questionNumber === 334) {
      return {
        ...q,
        question:
          "Gigi, M.I.T, is studying for her upcoming PPE exam. She has read a lot about the ISO (International Organization for Standardization), and how international and national standards are created. In order to ensure she remembers, she writes down in her notes the full process that the ISO goes through when creating new standards. She writes:\n\n“A new standard is proposed, and the ISO brings together a technical team. The new standard must pass three drafts, and at each, the technical team is able to add opinions and make necessary changes. At the final draft stage, the member countries of the ISO vote on the standard. If the standard receives ⅔ (66.67%) passing votes from the member countries, it becomes an ISO standard. The member countries must then adopt and publish the new standard as a national standard.”\n\nWhich part of Gigi’s note is INCORRECT?",
        options: [
          {
            key: "A",
            text: "After the final draft it is the technical team that votes on the proposed standard, not the member countries.",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "B",
            text: "The member countries have the option to choose whether they adopt the new ISO standard as a national standard, it is not mandatory.",
            isCorrect: true,
            isTrap: false
          },
          {
            key: "C",
            text: "The standard must receive a ¾ (or 75%) passing vote from the member countries, not a ⅔ (66.67%) passing vote.",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "D",
            text: "The proposed standard only needs to pass two drafts, not three.",
            isCorrect: false,
            isTrap: false
          }
        ],
        answer: "B",
        explanation:
          "The incorrect part is that member countries 'must' adopt the ISO standard. In reality, adoption is optional. Once a standard becomes official, ISO publishes it, but each member country decides whether to adopt it as a national standard."
      };
    }

    if (q.examType === "PENG" && q.questionNumber === 406) {
      return {
        ...q,
        question:
          "Austin, P.Geo., was assigned by his employer to a project that involved investigating underground mineral deposits for a mining company in Alberta. Upon arrival at the site, the project manager directed Austin to enter the mine through small underground tunnels. He inspected the entranceway and deemed the tunnels to be unstable. Austin immediately reported the issue to his employer and exercised his right to refuse unsafe or dangerous work under the Occupational Health and Safety Act (OHS), until the tunnels were structurally reinforced. His employer respected his decision and did the following to remedy the situation:\n\n1) Reassigned Austin to work as the firm’s secretary while the situation was being remedied.\n2) Adjusted Austin’s salary to match that of the other administrative employees while the situation was being remedied.\n3) Allowed Austin to keep the same health benefits for himself and his family that he had before the refusal.\n\nAccording to the OHS, were the employer’s actions correct? Why or why not?",
        options: [
          {
            key: "A",
            text: "No, the employer acted incorrectly. If a worker refuses unsafe or dangerous work, they can be reassigned, but according to the OHS Act, they are entitled to the same salary and benefits that they received before the refusal.",
            isCorrect: true,
            isTrap: false
          },
          {
            key: "B",
            text: "No, the employer acted incorrectly. The employer cannot reassign a worker who refuses unsafe or dangerous work to another position. This is considered discrimination under the OHS Act, and the worker must be given a paid leave of absence until the issue is remedied.",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "C",
            text: "No, the employer acted incorrectly. The OHS Act states that an employer can reassign an employee who refuses unsafe or dangerous work, but if so, then must adjust both salary and benefits to match those given to other employees in similar roles.",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "D",
            text: "Yes, the employer acted correctly. Work reassignment is not discrimination under the OHS Act, but pay differentiation among employees is. Therefore, the employer had to adjust Austin’s pay while the issue was being remedied.",
            isCorrect: false,
            isTrap: false
          }
        ],
        answer: "A",
        explanation:
          "The employer acted incorrectly. While a worker can be reassigned after refusing unsafe work, the Occupational Health and Safety Act requires that they continue to receive the same salary and benefits as before the refusal. The employer violated this by reducing Austin’s pay."
      };
    }

    if (q.examType === "PENG" && q.questionNumber === 381) {
      return {
        ...q,
        question:
          "Tim, a professional mechanical engineer, was assigned the role of inspecting heavy machinery at an old, somewhat run-down, chemical plant. Upon arrival, Tim realized that in order to complete this job he would have to risk his own safety, as much of the old machinery lacked the safety measures and automatic shut-offs that newer plants now require. Knowing his right to refuse unsafe work, Tim immediately notified his employer, Andrew, of his refusal. Andrew felt that Tim was over exaggerating the dangers associated with the job and quickly re-assigned the role to another employee. In order to reassign this role, however, Andrew knows that according to most association’s Occupational Health and Safety regulations, he must notify the next employee, in writing, of Tim’s refusal. Further, he must include the following:\n\na) Tim’s reason for refusal,\nb) The future worker’s right to refuse the work,\n\n...as well as which of the following options?",
        options: [
          {
            key: "A",
            text: "Recommendations or instructions to assist the future employee in avoiding the danger to his/her safety",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "B",
            text: "The Occupational Health and Safety claim number, if Tim submitted a formal complaint",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "C",
            text: "A list of the required personal protection equipment that the future employee must wear in order to avoid the dangers associated with the job",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "D",
            text: "Why, in Andrew’s opinion, he believes the danger to safety no longer, or never did, exist",
            isCorrect: true,
            isTrap: false
          }
        ],
        answer: "D",
        explanation:
          "Under Occupational Health and Safety regulations, when reassigning work after a refusal, the employer must provide written notice including: the previous worker’s refusal, the reason for refusal, the new worker’s right to refuse, and the employer’s explanation of why the work is now considered safe. Providing instructions or PPE does not replace the requirement to justify that the hazard no longer exists."
      };
    }

    if (q.examType === "PENG" && q.questionNumber === 502) {
      return {
        ...q,
        question:
          "There are two separate agreements involved when bonds are issued. The first is found within the contract between the obligee and the principal. The obligations owed by the principal to the obligee can be found here.\n\nThe other agreement is located within the bond and contains obligations of the bond. These agreements are known as:",
        options: [
          {
            key: "A",
            text: "Principle agreements and bond agreements.",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "B",
            text: "Obligee agreements and bond agreements.",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "C",
            text: "Contractual obligations and additional obligations.",
            isCorrect: false,
            isTrap: false
          },
          {
            key: "D",
            text: "Primary obligations and secondary obligations.",
            isCorrect: true,
            isTrap: false
          }
        ],
        answer: "D",
        explanation:
          "Primary obligations are found in the initial contract between the obligee and the principal and describe what the principal must do. Secondary obligations are found in the bond itself and describe the surety’s obligations if the principal fails to perform."
      };
    }

    return q;
  });
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected for import");

    const inputFile = process.argv[2] || "questions.docx";
    const examType = getExamType(inputFile);
    const formatType = getFormatType(inputFile);
    const filePath = path.join(process.cwd(), "scripts", inputFile);
    const ext = path.extname(inputFile).toLowerCase();

    let questions = [];

    if (ext === ".txt") {
      const rawText = fs.readFileSync(filePath, "utf-8");

      const paragraphs = rawText.split("\n").map((line) => ({
        cleanedText: line.trim()
      }));

      if (formatType === "answer-line") {
        questions = parseQuestionsAnswerFormat(paragraphs);
      } else {
        throw new Error("TXT files currently only support answer-line format");
      }
    } else if (ext === ".docx") {
      const paragraphs = await readDocx(filePath);

      if (formatType === "answer-line") {
        questions = parseQuestionsAnswerFormat(paragraphs);
      } else {
        questions = parseQuestionsColorFormat(paragraphs);
      }
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    questions = questions.map((q) => ({
      ...q,
      examType,
      sourceFile: inputFile
    }));

    questions = applyManualFixes(questions);

    console.log(`Parsed ${questions.length} questions from ${inputFile}`);
    console.log(`Exam type: ${examType}`);
    console.log(`Format type: ${formatType}`);

    if (questions.length > 0) {
      console.log("Sample parsed question:");
      console.log(JSON.stringify(questions[0], null, 2));
    }

    for (const q of questions) {
      await Question.updateOne(
        { examType: q.examType, questionNumber: q.questionNumber },
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