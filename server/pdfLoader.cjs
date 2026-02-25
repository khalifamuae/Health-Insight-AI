const { PDFParse } = require("pdf-parse");

async function extractText(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  await parser.load();
  const result = await parser.getText();
  return result.text || "";
}

module.exports = { extractText };
