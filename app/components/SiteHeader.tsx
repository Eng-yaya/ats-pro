import Link from "next/link";

const navLinks = [
  { href: "/analyze", label: "Analyze CV" },
  { href: "/builder", label: "Build CV" },
  { href: "/job-match", label: "Job Match" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            AP
          </span>
          <span className="text-lg font-semibold text-slate-900">ATS Pro</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/analyze"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
