// Run outside Next.js's bundler (as a plain Node child process) because pdf-parse's
// internal pdfjs-dist dependency does not bundle cleanly under Turbopack/webpack.
import { PDFParse } from 'pdf-parse';
import fs from 'fs';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    process.stdout.write(JSON.stringify({ error: 'No file path provided' }));
    process.exit(1);
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    const cleanedText = (result.text || '').replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
    process.stdout.write(JSON.stringify({ text: cleanedText }));
  } catch (error) {
    process.stdout.write(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    process.exit(1);
  }
}

main();
