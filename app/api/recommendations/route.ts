import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

function getOpenAIClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.startsWith('your_')) {
    return null;
  }
  return new OpenAI({ apiKey: key, baseURL: 'https://api.groq.com/openai/v1' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = (body.text || '') as string;

    if (!text.trim()) {
      return NextResponse.json({ error: 'No resume text provided.' }, { status: 400 });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      console.error('Recommendations error: Groq API key missing or invalid');
      return NextResponse.json(
        { error: 'Groq API key is missing or invalid. Add a valid key to .env.local as GROQ_API_KEY.' },
        { status: 500 }
      );
    }

    const prompt = `You are a professional resume reviewer and writer. Below is the full text of a candidate's resume.

Use ONLY facts, companies, dates, numbers, and details that literally appear in the text below. NEVER invent achievements, metrics, companies, technologies, or responsibilities that are not present or clearly implied. If something is missing (e.g. no measurable result was given), do not fabricate one — improve the wording and phrasing instead, without adding new facts.

Your job has two parts:

PART 1 — Specific recommendations
Identify 4-8 concrete, high-value improvements. For each, quote the exact current text (verbatim from the resume) and show a rewritten, stronger version, with a one-sentence reason.

PART 2 — Improved resume
Produce a cleaned-up, polished version of the ENTIRE resume, written to be as strong and compelling as possible while staying strictly truthful:
- Summary: 2-3 punchy sentences that lead with the candidate's strongest, most differentiating value — not generic filler.
- Bullets: rewrite every bullet using the Action + Task + Result structure. Start with a powerful, varied action verb (avoid repeating the same verb twice). Where the original text implies a scale, tool, or outcome, make it explicit and concrete instead of vague.
- Order experience/project entries and bullets so the strongest, most relevant achievements come first.
- Tighten wording throughout — cut filler words, remove redundancy, keep every line information-dense.
- Keep formatting simple and single-column so it stays ATS-safe.
Preserve all real names, companies, dates, degrees, and contact info exactly as given.

Return STRICTLY a JSON object with this exact schema and nothing else:
{
  "recommendations": [
    { "section": string, "current": string, "improved": string, "reason": string }
  ],
  "improvedResume": {
    "fullName": string,
    "email": string,
    "phone": string,
    "summary": string,
    "skills": [string],
    "experience": [
      { "company": string, "role": string, "duration": string, "bullets": [string] }
    ],
    "education": [
      { "institution": string, "degree": string, "year": string }
    ]
  }
}

Resume text:
"""
${text}
"""`;

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices?.[0]?.message?.content ?? '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Recommendations error:', message);
    return NextResponse.json({ error: 'Failed to generate recommendations.' }, { status: 500 });
  }
}
