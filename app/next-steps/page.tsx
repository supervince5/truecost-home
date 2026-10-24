import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { demoFindings, demoPathways } from "@/fixtures/demo-analysis";

export const metadata = { title: "Next steps · TrueCost Home" };

export default function NextStepsPage() {
  const questions = demoFindings.map((f) => f.follow_up_question).filter((q): q is string => Boolean(q));

  return (
    <>
      <AppHeader current={3} />
      <main className="page">
        <p className="eyebrow">Step 3 of 3</p>
        <h1 className="h1">Ways to close the gap</h1>
        <p className="lead">None of these change your numbers until they&rsquo;re confirmed in writing.</p>

        <div className="pathways">
          {demoPathways.map((p) => (
            <article key={p.id} className="card pathway">
              <span className="pill">{p.approved ? "Included in your numbers" : "Not in your numbers"}</span>
              <h2>{p.title}</h2>
              <p style={{ flex: 1 }}>{p.body}</p>
              <p className="mono" style={{ fontSize: 13, color: "var(--teal)" }}>
                {p.effect}
              </p>
            </article>
          ))}
        </div>

        <div className="intake">
          <section className="card intake__home" aria-labelledby="ask-h">
            <h2 id="ask-h">Questions to bring to your inspector</h2>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10, fontSize: 15 }}>
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
              <li>Can you open the electrical panel and check its condition?</li>
              <li>Should we scope the sewer line before the inspection deadline?</li>
            </ol>
          </section>

          <section className="take-away intake__money" aria-labelledby="save-h">
            <h2 id="save-h" style={{ margin: "0 0 8px", fontSize: 18 }}>
              Take this with you
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 14 }}>
              A one-page report with every finding, source, and assumption, for your agent, lender, or housing counselor.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button type="button" className="btn btn--light" disabled aria-describedby="soon">
                Download PDF report
              </button>
            </div>
            <p id="soon" style={{ margin: "16px 0 0", fontSize: 12, color: "#c3cbc7" }}>
              Coming soon. Your income and savings are left out of shared reports.
            </p>
          </section>
        </div>

        <div className="footer-row">
          <Link href="/analysis" style={{ fontWeight: 600 }}>
            &larr; Back to results
          </Link>
          <p className="fineprint">TrueCost Home gives planning scenarios. It doesn&rsquo;t replace an inspector, lender, or housing counselor.</p>
        </div>
      </main>
    </>
  );
}
