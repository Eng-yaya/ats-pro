export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-500">
        <p>ATS Pro — ATS-style resume analysis based on common applicant tracking system and recruiter best practices.</p>
        <p className="mt-2 text-xs text-slate-400">
          Built by{' '}
          <span className="font-medium text-slate-600">Yehia Ahmed Moussa</span>
          {' · '}
          <a
            href="https://github.com/Eng-yaya"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-slate-300 hover:text-slate-600"
          >
            GitHub
          </a>
          {' · '}
          <a
            href="https://www.linkedin.com/in/yehia-moussa-801b34320"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-slate-300 hover:text-slate-600"
          >
            LinkedIn
          </a>
        </p>
      </div>
    </footer>
  );
}
