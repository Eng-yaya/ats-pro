import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempFile = path.join(
      os.tmpdir(),
      `ats-pro-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`
    );
    fs.writeFileSync(tempFile, buffer);

    const scriptPath = path.resolve(process.cwd(), 'scripts', 'extract-pdf.mjs');

    let text = '';
    try {
      const stdout = execFileSync(process.execPath, [scriptPath, tempFile], {
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
      });
      const result = JSON.parse(stdout);
      if (result.error) {
        throw new Error(result.error);
      }
      text = typeof result.text === 'string' ? result.text : '';
    } finally {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // ignore cleanup errors
      }
    }

    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            'Could not extract any text from this PDF. It may be a scanned image-based PDF (OCR support is planned for a later step).',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, characterCount: text.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PDF extraction error:', message);
    return NextResponse.json({ error: 'Failed to extract text from the PDF.' }, { status: 500 });
  }
}
