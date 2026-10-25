import Link from "next/link";
import { demoMode } from "@/fixtures/demo-analysis";

const STEPS = [
  { n: 1, label: "Home & budget", href: "/" },
  { n: 2, label: "Review & results", href: "/analysis" },
  { n: 3, label: "Next steps", href: "/next-steps" },
] as const;

export function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M4 13 L14 5 L24 13 V24 H4 Z" fill="none" stroke="#0F5F5C" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M10 19 H18" stroke="#B54708" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function AppHeader({ current }: { current: 1 | 2 | 3 }) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link href="/" className="brand">
          <Logo />
          TrueCost Home
        </Link>
        <nav aria-label="Progress">
          <ol className="steps">
            {STEPS.map((s) =>
              s.n === current ? (
                <li key={s.n}>
                  <span aria-current="step">
                    {s.n} {s.label}
                  </span>
                </li>
              ) : (
                <li key={s.n}>
                  <Link href={s.href}>
                    {s.n} {s.label}
                  </Link>
                </li>
              ),
            )}
          </ol>
        </nav>
        {!demoMode.isLive && <span className="badge">{demoMode.label}</span>}
      </div>
    </header>
  );
}
