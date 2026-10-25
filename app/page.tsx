import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { demoBuyer, demoLoan, demoPhotos, demoProperty } from "@/fixtures/demo-analysis";
import { formatUsd } from "@/lib/engine/ownership";

/**
 * Intake screen. In this demo slice the form navigates to the fixture-backed
 * analysis; wiring it to POST /api/analyses is the next backend slice.
 */
export default function IntakePage() {
  const downPercent = Math.round((demoLoan.downPayment / demoLoan.price) * 100);
  const fields = [
    { id: "budget", label: "Monthly housing budget", value: formatUsd(demoBuyer.monthlyBudgetCents), hint: "The most you want to spend each month" },
    { id: "cash", label: "Cash available", value: formatUsd(demoBuyer.savingsCents), hint: "Savings you can use for this purchase" },
    { id: "down", label: "Down payment", value: `${downPercent}%`, hint: `${formatUsd(demoLoan.downPayment)} at the list price` },
    { id: "rate", label: "Interest rate", value: `${demoLoan.annualRatePercent.toFixed(2)}%`, hint: "From a quote, or today’s estimate" },
    { id: "zip", label: "ZIP code", value: "", hint: "For local tax, insurance, and repair costs" },
  ];

  return (
    <>
      <AppHeader current={1} />
      <main className="page">
        <p className="eyebrow">New analysis</p>
        <h1 className="h1">Can you afford to own this home, not just buy it?</h1>
        <p className="lead">
          Add the listing and what you can see of the house. We&rsquo;ll check the monthly cost and the cash you&rsquo;ll need in the first
          years of ownership.
        </p>

        {/* Not a GET form on purpose: budget and savings must never end up in a URL. */}
        <div>
          <div className="intake">
            <section className="card intake__home" aria-labelledby="home-h">
              <h2 id="home-h">The home</h2>
              <label className="field">
                <span className="field__label">Listing link or text</span>
                <textarea className="textarea" name="listing" rows={3} defaultValue={demoProperty.listingText} />
              </label>

              <p className="field__label">Photos or inspection report</p>
              <label className="dropzone">
                <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" fill="none" stroke="#0F5F5C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontWeight: 600 }}>Drop files or browse</span>
                <span className="fineprint">Up to 6 photos (JPG, PNG) or a text-based inspection PDF · files expire after 7 days</span>
                <input type="file" name="evidence" multiple accept="image/jpeg,image/png,application/pdf" aria-label="Upload photos or an inspection PDF" />
              </label>

              <ul className="thumbs" aria-label="Uploaded photos">
                {demoPhotos.map((p) => (
                  <li key={p.source_id} className="thumb">
                    {p.room}
                  </li>
                ))}
              </ul>
            </section>

            <section className="card intake__money" aria-labelledby="money-h">
              <h2 id="money-h" style={{ marginBottom: 6 }}>
                Your finances
              </h2>
              <p className="privacy-note">
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}>
                  <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="#0F5F5C" strokeWidth="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#0F5F5C" strokeWidth="2" />
                </svg>
                <span>Used only in our calculations. Never sent to the AI model.</span>
              </p>
              {fields.map((f) => (
                <label key={f.id} className="field">
                  <span className="field__label">{f.label}</span>
                  <input className="input" name={f.id} defaultValue={f.value} placeholder={f.id === "zip" ? "e.g. 24060" : undefined} inputMode={f.id === "zip" ? "numeric" : undefined} />
                  <span className="field__hint">{f.hint}</span>
                </label>
              ))}
            </section>
          </div>

          <div className="footer-row">
            <p className="fineprint">Results are planning scenarios, not an inspection, appraisal, or loan offer.</p>
            <Link href="/analysis" className="btn btn--primary">
              Analyze this home <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
