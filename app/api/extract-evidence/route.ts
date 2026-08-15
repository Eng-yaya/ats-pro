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

const EVIDENCE_SCHEMA_DESCRIPTION = `{
  "contactInfo": {
    "fullNameFound": string | null,
    "email": string | null,
    "phone": string | null,
    "location": string | null,
    "linkedin": string | null,
    "portfolioOrGithub": string | null
  },
  "sectionsFound": string[],
  "summary": {
    "present": boolean,
    "text": string,
    "wordCount": number,
    "genericPhrases": string[]
  },
  "experience": [
    {
      "company": string,
      "role": string,
      "hasStartDate": boolean,
      "hasEndDate": boolean,
      "bullets": [
        { "text": string, "startsWithActionVerb": boolean, "hasQuantifiableResult": boolean, "isWeakPhrase": boolean }
      ]
    }
  ],
  "education": [ { "institution": string, "degree": string, "hasDates": boolean } ],
  "skills": string[],
  "projects": [ { "title": string, "hasDescription": boolean, "hasTechnologies": boolean, "hasLink": boolean } ],
  "certifications": string[],
  "industryKeywordsFound": string[],
  "weakPhrasesFound": string[],
  "strongActionVerbsUsed": string[],
  "dateFormatsUsed": string[],
  "totalBullets": number,
  "bulletsWithMetrics": number,
  "wordCount": number
}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = (body.text || '') as string;

    if (!text.trim()) {
      return NextResponse.json({ error: 'No resume text provided.' }, { status: 400 });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      console.error('Evidence extraction error: Groq API key missing or invalid');
      return NextResponse.json(
        { error: 'Groq API key is missing or invalid. Add a valid key to .env.local as GROQ_API_KEY.' },
        { status: 500 }
      );
    }

    const prompt = `You are a resume-parsing engine. Your ONLY job is to extract factual evidence from the resume text below — you do NOT score, judge, or give opinions. Every field must be based strictly on what is literally present in the text. Do not infer or invent anything that isn't there.

Definitions to apply consistently:
- "weak phrase" bullets: bullets that start with vague phrases like "Responsible for", "Worked on", "Helped with", "Duties included", "Tasked with" — with no clear action or result.
- "startsWithActionVerb": the bullet begins with a strong verb (e.g. "Led", "Built", "Designed", "Increased", "Reduced", "Managed", "Developed").
- "hasQuantifiableResult": the bullet contains a number, percentage, dollar amount, or measurable outcome (e.g. "40%", "$2M", "15 team members", "reduced load time by half").
- "genericPhrases" in the summary: cliché filler like "hardworking team player", "detail-oriented", "results-driven", "passionate about", "go-getter" with no substance.
- "sectionsFound": the actual section headings you can identify in the text (e.g. "Experience", "Education", "Skills", "Projects", "Certifications", "Languages") — only ones that literally appear.
- "dateFormatsUsed": distinct date formatting styles found (e.g. "MM/YYYY", "Month YYYY", "YYYY - YYYY") so inconsistency can be detected later.

Return STRICTLY a JSON object matching this exact schema, nothing else:
${EVIDENCE_SCHEMA_DESCRIPTION}

If a field has no matches, use an empty array, empty string, null, or false as appropriate — never omit a field.

Resume text:
"""
${text}
"""`;

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices?.[0]?.message?.content ?? '{}';
    let evidence;
    try {
      evidence = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ evidence });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Evidence extraction error:', message);
    return NextResponse.json({ error: 'Failed to extract evidence from resume text.' }, { status: 500 });
  }
}
