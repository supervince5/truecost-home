import type { z } from "zod";
import type { EvidenceSource } from "./evidence";
import type { Finding } from "./finding";

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

export function validateEvidence(data: { sources: EvidenceSource[]; findings: Finding[] }, ctx: z.RefinementCtx) {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
  for (const key of ["sources", "findings"] as const) {
    const ids = new Set<string>();
    data[key].forEach((item, index) => {
      if (ids.has(item.id)) issue([key, index, "id"], "IDs must be unique within this analysis.");
      ids.add(item.id);
    });
  }
  const sources = new Map(data.sources.map((source) => [source.id, source]));
  data.findings.forEach((finding, fi) => finding.evidence.forEach((ref, ei) => {
    const path = ["findings", fi, "evidence", ei];
    const source = sources.get(ref.sourceId);
    if (!source) { issue(path, "Evidence must refer to an included source."); return; }
    const expectedKind = { disclosed_fact: "listing_text", reported_inspection_finding: "inspection_report", visual_observation: "image", user_assumption: "buyer_note" }[finding.evidenceClass];
    if (source.kind !== expectedKind) issue(path, "Source kind does not support this evidence class.");
    if (ref.kind === "image") {
      if (source.kind !== "image") issue(path, "Image evidence must reference an image source.");
      return;
    }
    let text: string | undefined;
    if (ref.kind === "report" && source.kind === "inspection_report") text = source.pages[ref.page - 1];
    if (ref.kind === "text" && (source.kind === "listing_text" || source.kind === "buyer_note")) text = source.text;
    if (text === undefined || !normalize(text).includes(normalize(ref.quote))) {
      issue(path, "Quotation must occur in the referenced text or report page.");
    }
  }));
}
