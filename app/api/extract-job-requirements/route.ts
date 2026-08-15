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
    const jobDescription = (body.jobDescription || '') as string;

    if (!jobDescription.trim()) {
      return NextResponse.json({ error: 'No job description provided.' }, { status: 400 });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      console.error('Job requirements extraction error: Groq API key missing or invalid');
      return NextResponse.json(
        { error: 'Groq API key is missing or invalid. Add a valid key to .env.local as GROQ_API_KEY.' },
        { status: 500 }
      );
    }

    const prompt = `You are a job-description parsing engine. Extract structured requirements from the job posting below. Only extract what is actually stated — do not infer skills that aren't mentioned or implied.

Return STRICTLY a JSON object with this exact schema, nothing else:
{
  "requiredSkills": string[],
  "niceToHaveSkills": string[],
  "keywords": string[],
  "experienceLevel": string
}

Guidance:
- "requiredSkills": skills/tools/technologies explicitly listed as required or must-have.
- "niceToHaveSkills": skills listed as preferred, a plus, or nice-to-have.
- "keywords": other important terms a candidate's resume should ideally contain (domain terms, certifications, methodologies) that aren't already in requiredSkills/niceToHaveSkills.
- "experienceLevel": a short phrase like "Entry-level", "2-4 years", "Senior", based on what the posting states. Use "Not specified" if unclear.

Job description:
"""
${jobDescription}
"""`;

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices?.[0]?.message?.content ?? '{}';
    let requirements;
    try {
      requirements = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ requirements });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Job requirements extraction error:', message);
    return NextResponse.json({ error: 'Failed to extract job requirements.' }, { status: 500 });
  }
}
