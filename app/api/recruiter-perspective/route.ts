import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

function getOpenAIClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.startsWith('your_')) return null;
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
      return NextResponse.json(
        { error: 'Groq API key is missing or invalid. Add a valid key to .env.local as GROQ_API_KEY.' },
        { status: 500 }
      );
    }

    const prompt = `You are an experienced recruiter who has screened thousands of resumes and typically spends about 10 seconds on a first pass. Give an honest, direct assessment of the resume below, based only on what's actually in it.

Return STRICTLY a JSON object with this exact schema, nothing else:
{
  "firstImpression": string,
  "firstTenSeconds": string,
  "biggestStrengths": [string],
  "biggestWeaknesses": [string],
  "rejectionRisks": [string],
  "interviewBoosts": [string]
}

Guidance:
- "firstImpression": 1-2 sentences, your honest gut reaction.
- "firstTenSeconds": what specifically would catch your eye in the first few seconds of skimming.
- "biggestStrengths" / "biggestWeaknesses": 2-4 concise, specific points each.
- "rejectionRisks": things that could get this resume screened out or deprioritized.
- "interviewBoosts": concrete changes that would most increase interview chances.

Be direct and honest, not falsely encouraging, but stay constructive and specific to what's actually on the page — do not invent details not present in the resume.

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
    console.error('Recruiter perspective error:', message);
    return NextResponse.json({ error: 'Failed to generate recruiter perspective.' }, { status: 500 });
  }
}
