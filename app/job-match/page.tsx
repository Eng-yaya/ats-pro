'use client';

import { useRef, useState, type DragEvent } from 'react';
import { computeJobMatch, type JobMatchResult, type JobRequirements } from '@/lib/jobMatch';
import type { Evidence } from '@/lib/scoring';

export default function JobMatchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [result, setResult] = useState<JobMatchResult | null>(null);
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
    setFile(candidate);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleCompare = async () => {
    if (!file || !jobDescription.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      setLoadingStage('Extracting resume text...');
      const formData = new FormData();
      formData.append('file', file);
      const extractRes = await fetch('/api/extract-pdf', { method: 'POST', body: formData });
      const extractData = await extractRes.json();
      if (!extractRes.ok) {
        setError(extractData.error || 'Could not extract text from this PDF.');
        return;
      }

      setLoadingStage('Reading your resume for evidence...');
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

      setLoadingStage('Reading the job description...');
      const reqRes = await fetch('/api/extract-job-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      });
      const reqData = await reqRes.json();
      if (!reqRes.ok) {
        setError(reqData.error || 'Could not parse the job description.');
        return;
      }

      const match = computeJobMatch(
        evidenceData.evidence as Evidence,
        extractData.text as string,
        reqData.requirements as JobRequirements
      );
      setResult(match);
    } catch {
      setError('Failed to connect to the job match service.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Job Match</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Compare your resume to a job</h1>
          <p className="mt-2 text-slate-600">
            This gives you a separate Job Match Score — it never changes your ATS Compatibility score.
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
          className={`mt-8 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
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
            </div>
          ) : (
            <div>
              <p className="font-medium text-slate-700">Click to upload your resume (PDF)</p>
              <p className="mt-1 text-sm text-slate-500">Up to 10MB</p>
            </div>
          )}
        </div>

        <label className="mt-6 block text-sm font-semibold text-slate-700">
          Paste the job description
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={8}
            placeholder="Paste the full job posting here..."
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        <button
          type="button"
          onClick={handleCompare}
          disabled={!file || !jobDescription.trim() || loading}
          className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? loadingStage || 'Comparing...' : 'Compare with this job'}
        </button>

        {result && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Job Match Score</p>
              <p className="mt-2 text-5xl font-bold text-blue-600">{result.jobMatchScore}</p>
              <p className="text-xs text-slate-400">/ 100 — separate from your ATS Compatibility score</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-green-700">Matched skills ({result.matchedSkills.length})</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.matchedSkills.map((s, idx) => (
                    <span key={idx} className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      {s}
                    </span>
                  ))}
                  {result.matchedSkills.length === 0 && <p className="text-sm text-slate-400">None found</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-rose-700">Missing skills ({result.missingSkills.length})</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.missingSkills.map((s, idx) => (
                    <span key={idx} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                      {s}
                    </span>
                  ))}
                  {result.missingSkills.length === 0 && <p className="text-sm text-slate-400">None — great match!</p>}
                </div>
              </div>
            </div>

            {result.notes.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {result.notes.map((note, idx) => (
                    <li key={idx}>• {note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
