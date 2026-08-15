interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location?: string;
  summary: string;
  skills: string[];
  experience: Array<{ company: string; role: string; duration: string; bullets: string[] }>;
  education: Array<{ institution: string; degree: string; year: string }>;
}

export default function ResumeTemplate({ data }: { data: ResumeData }) {
  const contactLine = [data.email, data.phone, data.location].filter(Boolean).join('   •   ');

  return (
    <div className="mx-auto max-w-[800px] bg-white p-10 shadow-sm print:shadow-none">
      <header className="border-b-2 border-slate-900 pb-4">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-slate-900">{data.fullName}</h1>
        {contactLine && <p className="mt-2 text-sm text-slate-600">{contactLine}</p>}
      </header>

      {data.summary && (
        <section className="mt-5">
          <p className="text-[15px] leading-6 text-slate-800">{data.summary}</p>
        </section>
      )}

      {data.skills?.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-blue-600 pb-1 text-xs font-bold uppercase tracking-widest text-blue-700">
            Skills
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-800">{data.skills.join('   •   ')}</p>
        </section>
      )}

      {data.experience?.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-blue-600 pb-1 text-xs font-bold uppercase tracking-widest text-blue-700">
            Experience
          </h2>
          <div className="mt-3 space-y-5">
            {data.experience.map((exp, idx) => (
              <div key={idx} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="text-[15px] font-semibold text-slate-900">
                    {exp.role}
                    {exp.company ? <span className="font-normal text-slate-600"> — {exp.company}</span> : null}
                  </h3>
                  <span className="text-xs font-medium text-slate-500">{exp.duration}</span>
                </div>
                <ul className="mt-1.5 space-y-1 pl-4 text-sm leading-6 text-slate-800">
                  {exp.bullets.map((b, bIdx) => (
                    <li key={bIdx} className="list-disc marker:text-blue-600">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.education?.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-blue-600 pb-1 text-xs font-bold uppercase tracking-widest text-blue-700">
            Education
          </h2>
          <div className="mt-3 space-y-2">
            {data.education.map((edu, idx) => (
              <div key={idx} className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="text-sm font-semibold text-slate-900">
                  {edu.degree}
                  {edu.institution ? <span className="font-normal text-slate-600"> — {edu.institution}</span> : null}
                </p>
                <span className="text-xs font-medium text-slate-500">{edu.year}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
