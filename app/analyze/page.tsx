'use client';

import { useRef, useState, type DragEvent } from 'react';
import { computeScores, type Evidence, type ScoreResult } from '@/lib/scoring';
import ResumeTemplate from '../components/ResumeTemplate';

interface Recommendation {
  section: string;
  current: string;
  improved: string;
  reason: string;
}

interface RecruiterPerspective {
  firstImpression: string;
  firstTenSeconds: string;
  biggestStrengths: string[];
  biggestWeaknesses: string[];
  rejectionRisks: string[];
  interviewBoosts: string[];
}

interface ImprovedResume {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experience: Array<{ company: string; role: string; duration: string; bullets: string[] }>;
  education: Array<{ institution: string; degree: string; year: string }>;
}

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [improvedResume, setImprovedResume] = useState<ImprovedResume | null>(null);
  const [recruiterView, setRecruiterView] = useState<RecruiterPerspective | null>(null);
  const [loadingRecruiterView, setLoadingRecruiterView] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (candidate: File | undefined) => {
    if (!candidate) return;
    if (candidate.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    if (candidate.size > 10 * 1024 * 1024) {
      setError('File is too large. Please upload a PDF under 10MB.');
      return;
    }
    setError('');
    setResult(null);
    setRecommendations(null);
    setImprovedResume(null);
    setRecruiterView(null);
    setFile(candidate);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoadingText(true);
    setError('');
    setResult(null);
    setRecommendations(null);
    setImprovedResume(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const extractRes = await fetch('/api/extract-pdf', { method: 'POST', body: formData });
      const extractData = await extractRes.json();

      if (!extractRes.ok) {
        setError(extractData.error || 'Could not extract text from this PDF.');
        return;
      }

      setResumeText(extractData.text);
      setLoadingText(false);
      setLoadingEvidence(true);

      const evidenceRes = await fetch('/api/extract-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractData.text }),
      });
      const evidenceData = await evidenceRes.json();

      if (!evidenceRes.ok) {
        setError(evidenceData.error || 'Could not extract evidence from this resume.');
        return;
      }

      const scores = computeScores(evidenceData.evidence as Evidence);
      setResult(scores);
    } catch {
      setError('Failed to connect to the analysis service.');
    } finally {
      setLoadingText(false);
      setLoadingEvidence(false);
    }
  };

  const handleGetRecommendations = async () => {
    if (!resumeText) return;
    setLoadingRecommendations(true);
    setError('');

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: resumeText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not generate recommendations.');
        return;
      }

      setRecommendations(data.recommendations);
      setImprovedResume(data.improvedResume);
    } catch {
      setError('Failed to connect to the recommendations service.');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleGetRecruiterView = async () => {
    if (!resumeText) return;
    setLoadingRecruiterView(true);
    setError('');
    try {
      const res = await fetch('/api/recruiter-perspective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: resumeText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not generate recruiter perspective.');
        return;
      }
      setRecruiterView(data);
    } catch {
      setError('Failed to connect to the recruiter perspective service.');
    } finally {
      setLoadingRecruiterView(false);
    }
  };

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">ATS Analyzer</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Upload your resume</h1>
          <p className="mt-2 text-slate-600">
            No job description needed. We&apos;ll evaluate your CV on its own merits first.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-8 cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-slate-400'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
          {file ? (
            <div>
              <p className="font-semibold text-slate-900">{file.name}</p>
              <p className="mt-1 text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setResult(null);
                  setRecommendations(null);
                  setImprovedResume(null);
                }}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Choose a different file
              </button>
            </div>
          ) : (
            <div>
              <p className="font-medium text-slate-700">Click to upload or drag and drop</p>
              <p className="mt-1 text-sm text-slate-500">PDF only, up to 10MB</p>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!file || loadingText || loadingEvidence}
          className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loadingText ? 'Extracting text...' : loadingEvidence ? 'Analyzing...' : 'Analyze my CV'}
        </button>

        {result && (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ATS Compatibility</p>
                <p className="mt-2 text-4xl font-bold text-blue-600">{result.atsCompatibilityScore}</p>
                <p className="text-xs text-slate-400">/ 100</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resume Quality</p>
                <p className="mt-2 text-4xl font-bold text-slate-900">{result.resumeQualityScore}</p>
                <p className="text-xs text-slate-400">/ 100</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900">Category scores</h2>
              <div className="mt-4 space-y-3">
                {result.categories.map((cat) => (
                  <div key={cat.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{cat.label}</span>
                      <span className="font-semibold text-slate-900">{cat.score}/100</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${cat.score >= 75 ? 'bg-green-500' : cat.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900">What to fix first</h2>
              <div className="mt-4 space-y-2">
                {result.priorityFixes.map((fix, idx) => (
                  <div key={idx} className="flex gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                    <span>{fix.priority === 'high' ? '🔴' : fix.priority === 'medium' ? '🟠' : '🟢'}</span>
                    <div>
                      <span className="font-medium text-slate-900">{fix.category}: </span>
                      <span className="text-slate-600">{fix.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!recommendations && (
              <button
                type="button"
                onClick={handleGetRecommendations}
                disabled={loadingRecommendations}
                className="w-full rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loadingRecommendations ? 'Writing recommendations...' : 'Get exact text improvements'}
              </button>
            )}

            {!recruiterView && (
              <button
                type="button"
                onClick={handleGetRecruiterView}
                disabled={loadingRecruiterView}
                className="w-full rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingRecruiterView ? 'Getting recruiter perspective...' : 'Get recruiter perspective'}
              </button>
            )}
          </div>
        )}

        {recruiterView && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Recruiter perspective</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">{recruiterView.firstImpression}</p>

            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                What a recruiter notices in the first 10 seconds
              </p>
              <p className="mt-1 text-sm text-slate-700">{recruiterView.firstTenSeconds}</p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-green-700">Biggest strengths</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {recruiterView.biggestStrengths.map((s, idx) => (
                    <li key={idx}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-700">Biggest weaknesses</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {recruiterView.biggestWeaknesses.map((s, idx) => (
                    <li key={idx}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700">Rejection risks</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {recruiterView.rejectionRisks.map((s, idx) => (
                  <li key={idx}>• {s}</li>
                ))}
              </ul>
            </div>

            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                What would increase your interview chances
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {recruiterView.interviewBoosts.map((s, idx) => (
                  <li key={idx}>• {s}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {recommendations && recommendations.length > 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Recommended text improvements</h2>
            <div className="mt-4 space-y-5">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{rec.section}</p>
                  <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 line-through decoration-rose-300">
                    {rec.current}
                  </p>
                  <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{rec.improved}</p>
                  <p className="mt-2 text-xs text-slate-500">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {improvedResume && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Your improved resume</h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Print / Save as PDF
              </button>
            </div>

            <div id="printable-resume">
              <ResumeTemplate data={improvedResume} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
