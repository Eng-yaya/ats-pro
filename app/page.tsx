import Link from "next/link";

const features = [
  {
    title: "Analyze your CV",
    description:
      "Upload your resume and get an ATS-style compatibility score with category breakdowns, strengths, weaknesses, and prioritized fixes. No job description required.",
    href: "/analyze",
    cta: "Analyze my CV",
  },
  {
    title: "Build a CV from scratch",
    description:
      "Answer a short, adaptive interview about your background and let the AI turn your real experience into a polished, ATS-friendly resume.",
    href: "/builder",
    cta: "Start building",
  },
  {
    title: "Match against a job",
    description:
      "Optionally compare your resume to a specific job description for a separate job-match score, missing keywords, and alignment gaps.",
    href: "/job-match",
    cta: "Compare with a job",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Understand exactly what&apos;s holding your resume back
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Upload your CV, get a realistic ATS-style analysis, and see precisely what to fix. Build a new resume
          through a guided interview, or compare against a specific job — all grounded in what you actually tell it.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/analyze"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Analyze my CV
          </Link>
          <Link
            href="/builder"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Build a new CV
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.href}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">{feature.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{feature.description}</p>
              <Link
                href={feature.href}
                className="mt-5 inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                {feature.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
