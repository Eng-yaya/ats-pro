'use client';

import { useState, useEffect, useRef } from 'react';
import ResumeTemplate from '../components/ResumeTemplate';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface GeneratedResume {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: Array<{ company: string; role: string; duration: string; bullets: string[] }>;
  education: Array<{ institution: string; degree: string; year: string }>;
}

export default function BuilderPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [interviewDone, setInterviewDone] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [loadingResume, setLoadingResume] = useState(false);
  const [resume, setResume] = useState<GeneratedResume | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetchNextQuestion([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingQuestion]);

  const fetchNextQuestion = async (history: ChatMessage[]) => {
    setLoadingQuestion(true);
    setError('');
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not load the next question.');
        return;
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.question }]);
      if (data.done) setInterviewDone(true);
    } catch {
      setError('Failed to connect to the interview service.');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || loadingQuestion || interviewDone) return;
    const updated = [...messages, { role: 'user' as const, content: input.trim() }];
    setMessages(updated);
    setInput('');
    fetchNextQuestion(updated);
  };

  const handleGenerateResume = async () => {
    setLoadingResume(true);
    setError('');
    try {
      const res = await fetch('/api/build-resume-from-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: messages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not generate your resume.');
        return;
      }
      setResume(data);
    } catch {
      setError('Failed to connect to the resume generation service.');
    } finally {
      setLoadingResume(false);
    }
  };

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">CV Builder</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Let&apos;s build your CV</h1>
          <p className="mt-2 text-slate-600">Answer a few questions — nothing gets invented, only what you tell it.</p>
        </div>

        <section className="mt-8 flex h-[520px] flex-col rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === 'assistant' ? 'bg-slate-100 text-slate-800' : 'bg-blue-600 text-white'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loadingQuestion && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">Thinking...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!interviewDone && (
            <div className="mt-4 flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={loadingQuestion}
                placeholder="Type your answer..."
                className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loadingQuestion || !input.trim()}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Send
              </button>
            </div>
          )}
        </section>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        {interviewDone && !resume && (
          <button
            type="button"
            onClick={handleGenerateResume}
            disabled={loadingResume}
            className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loadingResume ? 'Building your resume...' : 'Generate My Resume'}
          </button>
        )}

        {resume && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Your generated resume</h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Print / Save as PDF
              </button>
            </div>

            <div id="printable-resume">
              <ResumeTemplate data={resume} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
