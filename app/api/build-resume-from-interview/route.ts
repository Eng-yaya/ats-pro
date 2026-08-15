import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

function getOpenAIClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.startsWith('your_')) return null;
  return new OpenAI({ apiKey: key, baseURL: 'https://api.groq.com/openai/v1' });
}

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const history = (body.history || []) as ChatMessage[];

    if (!history.length) {
      return NextResponse.json({ error: 'No interview data provided.' }, { status: 400 });
    }

    const transcript = history.map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`).join('\n');

    const prompt = `You are an expert resume writer. Below is a full interview transcript between an interviewer and a job candidate.

Use ONLY facts the candidate actually stated. NEVER invent companies, dates, schools, numbers, or achievements not present or clearly implied in the transcript. If a section (e.g. work experience) has no real data, return an empty array for it rather than inventing content — use projects/activities instead if that's what was discussed.

Turn any raw descriptions into 2-4 polished, ATS-friendly bullet points using the Action + Task + Result structure, with strong, varied action verbs (don't repeat the same verb twice) — make every line as powerful and concrete as the facts allow. Order entries and bullets so the strongest, most relevant points come first. Write a concise, compelling 2-3 sentence professional summary that leads with the candidate's strongest value, grounded in what was actually said.

Return STRICTLY a JSON object with this exact schema and nothing else:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "location": string,
  "summary": string,
  "skills": [string],
  "experience": [
    { "company": string, "role": string, "duration": string, "bullets": [string] }
  ],
  "education": [
    { "institution": string, "degree": string, "year": string }
  ]
}

Interview transcript:
${transcript}`;

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        { error: 'Groq API key is missing or invalid. Add a valid key to .env.local as GROQ_API_KEY.' },
        { status: 500 }
      );
    }

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices?.[0]?.message?.content ?? '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Build resume from interview error:', message);
    return NextResponse.json({ error: 'Failed to generate resume from interview.' }, { status: 500 });
  }
}
