import { NextResponse } from "next/server";
import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let parser: PDFParse | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    if (data.length === 0) {
      return NextResponse.json(
        { error: "The uploaded PDF is empty." },
        { status: 400 }
      );
    }

    parser = new PDFParse({
      data,
      CanvasFactory,
    });

    const result = await parser.getText();

    const text = (result.text || "")
      .replace(/--\s*\d+\s*of\s*\d+\s*--/g, "")
      .trim();

    if (!text) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from this PDF. The PDF may be scanned or image-based.",
        },
        { status: 422 }
      );
    }

    console.log(
      `PDF extracted successfully: ${file.name} (${text.length} characters)`
    );

    return NextResponse.json({
      text,
      characterCount: text.length,
    });
  } catch (error: unknown) {
    console.error("PDF extraction error:", error);

    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "Failed to extract text from the PDF.",
        details: message,
      },
      { status: 500 }
    );
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (cleanupError) {
        console.error("PDF parser cleanup error:", cleanupError);
      }
    }
  }
}