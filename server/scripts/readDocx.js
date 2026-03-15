import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { DOMParser } from "xmldom";

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
        color
      };
    });

    const fullText = runs.map((r) => r.text).join("").trim();

    return {
      index,
      text: fullText,
      runs
    };
  });

  return results.filter((p) => p.text);
}

async function main() {
  const filePath = path.join(process.cwd(), "scripts", "questions.docx");
  const paragraphs = await readDocx(filePath);

  console.log(JSON.stringify(paragraphs.slice(0, 40), null, 2));
}

main().catch(console.error);