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

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        { error: 'Groq API key is missing or invalid. Add a valid key to .env.local as GROQ_API_KEY.' },
        { status: 500 }
      );
    }

    const transcript = history.map((m) => `${m.role === 'assistant' ? 'Assistant' : 'Candidate'}: ${m.content}`).join('\n');

    const systemPrompt = `You are a professional recruiter helping a candidate build their CV through a natural conversation. Ask ONE short question at a time.

Cover, adapting to what they've already said: full name, email, phone, location, LinkedIn/portfolio (optional), target role/industry, career level, education, work experience OR (if a student/fresh graduate with little work experience) academic projects, internships, volunteer work, or leadership activities instead, skills, and certifications.

CRITICAL — never invent or assume answers. When the candidate gives a vague answer about experience (e.g. "I managed social media" or "I worked on a project"), you MUST ask a specific follow-up before moving on, such as "Which platforms?" then "What did you actually do?" then "Did engagement, followers, leads, or sales change, even roughly?" Only move to the next topic once you have concrete specifics or the candidate says they don't know/don't have that detail.

If the candidate has little or no formal work experience, do not treat that as a problem — guide them toward academic projects, coursework, competitions, or volunteer work instead, without making them feel inadequate.

Keep questions brief and conversational. Stop once you have enough for a solid CV (usually 10-18 exchanges, more if experience needs several follow-ups).

Respond with STRICT JSON only:
{ "question": string, "done": boolean }
If done is true, "question" is a short friendly closing line.`;

    const userTurn = history.length === 0
      ? 'Start the interview with your first question (ask for their full name first).'
      : `Conversation so far:\n${transcript}\n\nRespond with the next question (or done:true if you have enough).`;

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userTurn },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices?.[0]?.message?.content ?? '{}';
    let parsed: { question?: string; done?: boolean };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { question: 'Could you tell me more about that?', done: false };
    }

    return NextResponse.json({ question: parsed.question || 'Could you tell me more?', done: Boolean(parsed.done) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Interview error:', message);
    return NextResponse.json({ error: 'Failed to get the next interview question.' }, { status: 500 });
  }
}
