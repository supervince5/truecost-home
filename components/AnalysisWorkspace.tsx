"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  cashAfterClosing,
  formatUsd,
  monthlyOwnershipCost,
  nearTermCashGap,
  type Cents,
  type OwnershipInputs,
} from "@/lib/engine/ownership";
import type { Finding, FindingReview, Photo, RepairScenario, ReviewStatus, UnassessedComponent } from "@/lib/schemas";

export interface WorkspaceProps {
  property: { title: string; priceCents: Cents; summary: string };
  buyer: { monthlyBudgetCents: Cents; savingsCents: Cents; closingCostsCents: Cents };
  loan: OwnershipInputs;
  photos: Photo[];
  findings: Finding[];
  scenarios: RepairScenario[];
  unassessed: UnassessedComponent[];
}

const REMOVE_REASONS = ["It’s a shadow", "Already fixed", "Wrong item"] as const;

function kUsd(cents: Cents): string {
  return `$${+(cents / 100_000).toFixed(1)}k`;
}

function windowText(s: RepairScenario): string {
  const lo = Math.round(s.window_months.min / 12);
  const hi = Math.round(s.window_months.max / 12);
  return s.window_months.max <= 12 ? "likely within 1 yr" : `likely within ${lo}–${hi} yrs`;
}

export function AnalysisWorkspace(props: WorkspaceProps) {
  const { property, buyer, loan, photos, findings, scenarios, unassessed } = props;

  const [reviews, setReviews] = useState<Record<string, FindingReview>>(() =>
    Object.fromEntries(findings.map((f) => [f.id, { finding_id: f.id, status: "pending" as ReviewStatus }])),
  );
  const [selectedId, setSelectedId] = useState(findings[0]?.id ?? "");
  const [askingReason, setAskingReason] = useState(false);

  const scenarioFor = (id: string) => scenarios.find((s) => s.finding_id === id);
  const photoFor = (sourceId: string) => photos.find((p) => p.source_id === sourceId);

  const setStatus = (id: string, status: ReviewStatus, reason?: string) => {
    setReviews((prev) => ({ ...prev, [id]: { finding_id: id, status, reason } }));
    setAskingReason(false);
  };

  // Deterministic results. Budget math never calls the model.
  const monthly = useMemo(() => monthlyOwnershipCost(loan), [loan]);
  const cash = cashAfterClosing(buyer.savingsCents, loan.downPayment, buyer.closingCostsCents);
  const gap = useMemo(() => {
    const kept = scenarios.filter((s) => reviews[s.finding_id]?.status !== "removed");
    return nearTermCashGap(cash, kept.map((s) => ({ low: s.low_cents, high: s.high_cents })));
  }, [scenarios, reviews, cash]);

  const fits = monthly.total <= buyer.monthlyBudgetCents;
  const spare = buyer.monthlyBudgetCents - monthly.total;
  const usedPct = Math.min(100, Math.round((monthly.total / buyer.monthlyBudgetCents) * 100));
  const scale = Math.max(gap.repairHigh, cash) * 1.08 || 1;
  const pct = (c: Cents) => `${((Math.max(0, c) / scale) * 100).toFixed(1)}%`;

  const reviewedCount = findings.filter((f) => reviews[f.id]?.status !== "pending").length;
  const selected = findings.find((f) => f.id === selectedId) ?? findings[0];
  const selReview = reviews[selected.id];
  const selScenario = scenarioFor(selected.id);
  const imageEvidence = selected.evidence.find((e) => e.kind === "image");
  const selPhoto = imageEvidence ? photoFor(imageEvidence.source_id) : undefined;
  const nextPending = findings.find((f) => f.id !== selected.id && reviews[f.id]?.status === "pending");

  const gapText = !gap.hasGap
    ? "Covered"
    : gap.shortfallLow > 0
      ? `${formatUsd(-gap.shortfallLow)} to ${formatUsd(-gap.shortfallHigh)}`
      : `Up to ${formatUsd(-gap.shortfallHigh)}`;

  return (
    <>
      <div className="app-header" style={{ borderTop: 0 }}>
        <div className="app-header__inner" style={{ paddingTop: 10, paddingBottom: 10 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
              {property.title} · {formatUsd(property.priceCents)}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              {property.summary} · {photos.length} photos
            </p>
          </div>
          <Link href="/" className="btn">
            Edit inputs
          </Link>
        </div>
      </div>

      <div className="workspace">
        {/* ---------- Findings list ---------- */}
        <nav className="ws-list" aria-labelledby="list-h">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 8px", marginBottom: 10 }}>
              <h2 id="list-h" className="section-label">
                Findings
              </h2>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {reviewedCount} of {findings.length} reviewed
              </span>
            </div>
            <ul className="finding-list">
              {findings.map((f) => {
                const r = reviews[f.id];
                const s = scenarioFor(f.id);
                const statusText =
                  r.status === "confirmed" ? "Confirmed by you" : r.status === "removed" ? `Removed: ${r.reason ?? "not accurate"}` : "Needs your review";
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      className={`finding-row${r.status === "removed" ? " finding-row--removed" : ""}`}
                      aria-pressed={f.id === selected.id}
                      onClick={() => {
                        setSelectedId(f.id);
                        setAskingReason(false);
                      }}
                    >
                      <span className={`status-dot status-dot--${r.status}`} aria-hidden="true" />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="finding-row__title">{f.title}</span>
                        <span className="finding-row__status">{statusText}</span>
                      </span>
                      {s && (
                        <span className="finding-row__cost">
                          {kUsd(s.low_cents)}&ndash;{kUsd(s.high_cents)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div style={{ borderTop: "1px solid #eef0ec", paddingTop: 16 }}>
            <h2 className="section-label" style={{ margin: "0 8px 4px" }}>
              Can&rsquo;t tell from photos
            </h2>
            <p className="fineprint" style={{ margin: "0 8px 10px", fontSize: 12 }}>
              Kept as unknown, never $0
            </p>
            <ul className="unknown-list">
              {unassessed.map((u) => (
                <li key={u.component} title={u.reason}>
                  <span className="unknown-icon" aria-hidden="true">
                    ?
                  </span>
                  <span>
                    {u.label}
                    <span className="visually-hidden">: {u.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* ---------- Evidence viewer ---------- */}
        <main className="ws-main" aria-labelledby="viewer-h">
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h1 id="viewer-h" style={{ margin: "0 0 4px", fontSize: 24, letterSpacing: "-0.01em", textDecoration: selReview.status === "removed" ? "line-through" : "none" }}>
                {selected.title}
              </h1>
              <p className="fineprint">
                {selPhoto ? `${selPhoto.label} · ${selPhoto.room ?? ""}` : "Listing text"} · Observation, not a diagnosis
              </p>
            </div>
            {selScenario && (
              <span className="cost-pill">
                {formatUsd(selScenario.low_cents)}&ndash;{formatUsd(selScenario.high_cents)} · {windowText(selScenario)}
              </span>
            )}
          </div>

          <figure className="viewer">
            {selPhoto?.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="viewer__img" src={selPhoto.src} alt={`${selPhoto.label}, ${selPhoto.room ?? ""}`} />
            ) : (
              <>
                <div className="viewer__grid" aria-hidden="true" />
                <span className="viewer__tag">[{selPhoto ? `${selPhoto.label} · ${selPhoto.room}` : "No photo"}]</span>
              </>
            )}
            {imageEvidence?.region && (
              <div
                className="viewer__box"
                style={{
                  left: `${imageEvidence.region.x}%`,
                  top: `${imageEvidence.region.y}%`,
                  width: `${imageEvidence.region.w}%`,
                  height: `${imageEvidence.region.h}%`,
                }}
              >
                <span className="viewer__box-label">{imageEvidence.label.split(": ")[1] ?? imageEvidence.label}</span>
              </div>
            )}
            <figcaption className="viewer__caption">{selected.description}</figcaption>
          </figure>

          <div className="ws-panels">
            <section className="card" aria-labelledby="ev-h">
              <h2 id="ev-h" className="section-label" style={{ marginBottom: 10 }}>
                Evidence
              </h2>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                {selected.evidence.map((e) => (
                  <li key={`${e.source_id}-${e.label}`}>
                    {e.label}
                    {e.quote && <> &ldquo;{e.quote}&rdquo;</>}
                    {e.page && <> (page {e.page})</>}
                  </li>
                ))}
              </ul>
              {selected.follow_up_question && (
                <p className="fineprint" style={{ marginTop: 12 }}>
                  Ask your inspector: {selected.follow_up_question}
                </p>
              )}
            </section>

            <section className="card" aria-labelledby="rv-h">
              <h2 id="rv-h" className="section-label" style={{ marginBottom: 10 }}>
                Is this right?
              </h2>

              {selReview.status === "pending" && !askingReason && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="button" className="btn btn--primary" style={{ minHeight: 44 }} onClick={() => setStatus(selected.id, "confirmed")}>
                    Looks right
                  </button>
                  <button type="button" className="btn" onClick={() => setAskingReason(true)}>
                    Not right
                  </button>
                </div>
              )}

              {selReview.status === "pending" && askingReason && (
                <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                  <legend style={{ fontSize: 14, marginBottom: 8 }}>What&rsquo;s wrong with it?</legend>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {REMOVE_REASONS.map((reason) => (
                      <button key={reason} type="button" className="btn btn--chip" onClick={() => setStatus(selected.id, "removed", reason.toLowerCase())}>
                        {reason}
                      </button>
                    ))}
                    <button type="button" className="btn btn--link" onClick={() => setAskingReason(false)}>
                      Cancel
                    </button>
                  </div>
                </fieldset>
              )}

              {selReview.status !== "pending" && (
                <>
                  <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: selReview.status === "confirmed" ? "var(--teal)" : "#3d464c" }}>
                    {selReview.status === "confirmed"
                      ? "✓ You confirmed this finding."
                      : `Removed: ${selReview.reason ?? "not accurate"}. Not counted in your results.`}
                  </p>
                  <button type="button" className="btn" onClick={() => setStatus(selected.id, "pending")}>
                    Undo
                  </button>
                </>
              )}

              {nextPending && (
                <div>
                  <button
                    type="button"
                    className="btn btn--link"
                    style={{ marginTop: 12 }}
                    onClick={() => {
                      setSelectedId(nextPending.id);
                      setAskingReason(false);
                    }}
                  >
                    Next finding &rarr;
                  </button>
                </div>
              )}
            </section>
          </div>
        </main>

        {/* ---------- Live results ---------- */}
        <aside className="ws-results" aria-labelledby="res-h">
          <div aria-live="polite">
            <h2 id="res-h" className="section-label" style={{ marginBottom: 4 }}>
              Live result
            </h2>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 600, lineHeight: 1.35 }}>
              {fits ? "The monthly payment fits." : "The monthly payment is over budget."}{" "}
              {gap.hasGap ? "Year-one repairs could leave you short on cash." : "Your cash covers the repair scenarios."}
            </p>
          </div>

          <section className="result-card" aria-label="Monthly cost" style={fits ? undefined : { borderLeftColor: "var(--orange)" }}>
            <div className="result-card__head">
              <span style={{ fontWeight: 600, color: "#3d464c" }}>Monthly cost</span>
              <span className={fits ? "tag-ok" : "tag-gap"}>{fits ? "✓ Fits" : "! Over budget"}</span>
            </div>
            <p className="result-card__value">{formatUsd(monthly.total)}</p>
            <p className="fineprint" style={{ margin: "2px 0 10px" }}>
              of {formatUsd(buyer.monthlyBudgetCents)} budget · {fits ? `${formatUsd(spare)} spare` : `${formatUsd(-spare)} over`}
            </p>
            <div className="meter" role="img" aria-label={`${usedPct} percent of monthly budget`}>
              <div style={{ width: `${usedPct}%` }} />
            </div>
            <details style={{ marginTop: 10, fontSize: 13 }}>
              <summary style={{ cursor: "pointer", color: "var(--teal)", fontWeight: 600 }}>Breakdown</summary>
              <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 4, margin: "8px 0 0" }}>
                <dt>Principal and interest</dt>
                <dd className="mono" style={{ margin: 0 }}>{formatUsd(monthly.principalAndInterest)}</dd>
                <dt>Property tax</dt>
                <dd className="mono" style={{ margin: 0 }}>{formatUsd(monthly.propertyTax)}</dd>
                <dt>Home insurance</dt>
                <dd className="mono" style={{ margin: 0 }}>{formatUsd(monthly.insurance)}</dd>
                <dt>Mortgage insurance (PMI)</dt>
                <dd className="mono" style={{ margin: 0 }}>{formatUsd(monthly.pmi)}</dd>
              </dl>
            </details>
          </section>

          <section className={`result-card${gap.hasGap ? " result-card--gap" : ""}`} aria-label="Cash in year one">
            <div className="result-card__head">
              <span style={{ fontWeight: 600, color: "#3d464c" }}>Cash in year one</span>
              <span className={gap.hasGap ? "tag-gap" : "tag-ok"}>{gap.hasGap ? "! Possible gap" : "✓ Covered"}</span>
            </div>
            <p className="result-card__value" aria-live="polite">
              {gapText}
            </p>
            <p className="fineprint" style={{ margin: "2px 0 14px" }}>
              Repairs {formatUsd(gap.repairLow)}&ndash;{formatUsd(gap.repairHigh)} vs. {formatUsd(cash)} left after closing
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="bar-row">
                <div className="bar-row__head">
                  <span>Cash after closing</span>
                  <span className="mono">{formatUsd(cash)}</span>
                </div>
                <div className="cash-bar">
                  <div style={{ width: pct(cash) }} />
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-row__head">
                  <span>Repair scenarios</span>
                  <span className="mono">
                    {formatUsd(gap.repairLow)}&ndash;{formatUsd(gap.repairHigh)}
                  </span>
                </div>
                <div className="range-bar" role="img" aria-label={`Repair range ${formatUsd(gap.repairLow)} to ${formatUsd(gap.repairHigh)}; your cash is ${formatUsd(cash)}`}>
                  <div className="range-bar__high" style={{ width: pct(gap.repairHigh) }} />
                  <div className="range-bar__low" style={{ width: pct(gap.repairLow) }} />
                  <div className="range-bar__cash" style={{ left: pct(cash) }} />
                </div>
                <p className="fineprint" style={{ margin: "4px 0 0", fontSize: 12 }}>
                  Dark: likely low · light: high end · line: your cash
                </p>
              </div>
            </div>
          </section>

          <Link href="/next-steps" className="btn btn--primary">
            Ways to close the gap <span aria-hidden="true">&rarr;</span>
          </Link>
          <p className="fineprint" style={{ fontSize: 12 }}>
            Planning scenarios from {scenarios[0]?.source.label ?? "cost data"} ({scenarios[0]?.source.dataset_version ?? "unversioned"}). Not an
            inspection, appraisal, or loan offer. Your income and savings never reach the AI model.
          </p>
        </aside>
      </div>
    </>
  );
}
