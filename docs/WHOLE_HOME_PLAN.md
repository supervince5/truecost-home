# Whole-home evidence and sourced costs

## Scope

Keep Gemma 4. No training, personal house ratings, accounts, or persistence. Expand analysis across the property, including roof, structure, mechanical systems, wet rooms, interiors, exterior, drainage, and landscaping. Specialized systems remain explicitly unassessed without appropriate evidence.

Gemma extracts observations and research-library indicator IDs from supplied evidence. The application attaches published guidance and identifies combinations worth investigating. Co-occurring symptoms are hypotheses, never proof of a shared cause. Photos cannot establish concealed damage, contaminant identity, code compliance, remaining life, or property value.

Costs come only from a versioned source catalog. Scope, geography, units, exclusions, dates, and price basis travel with each estimate. Unpriced work stays unknown. A repair estimate is not a resale-value adjustment. Full remodels are elective scenarios, not automatic remedies for dated finishes.

## Implementation

1. Research and encode source registry, whole-house indicators, evidence requirements, alternative explanations, and cross-system patterns. Add tests rejecting unsupported labels and retaining coverage gaps.
2. Add deterministic cost engine and bounded estimate API. Test exact cents, missing quantities, geography mismatch, stale review dates, incomplete scope, and overlapping alternatives.
3. Expand Gemma's schema and prompt; attach cited review cards and evidence-linked pattern candidates to analysis responses. Keep the existing image, quotation, request, and retry protections.
4. Build a runnable benchmark with source-grounded scenarios, positive/negative cases, and explicit scoring rules. Separate text reasoning from image detection; do not claim field accuracy from constructed cases. Run live Gemma evaluation, document failures and token usage, perform independent review, and run the complete checks.

## Judging evidence

Slides supplied October 24: Gemma must be core; grounding/privacy/inclusive design and inference cost are explicitly scored. Multiple genuinely fitting tracks are permitted on the slides. This branch demonstrates core Gemma extraction, auditable costs, bounded calls, and reproducible evaluation. Cloud deployment and accessible results UI remain separate work; do not claim those tracks are complete.

## Review focus

Prevent model prices from entering calculations; do not turn absent evidence into a clean bill of health; do not label mere co-occurrence a diagnosis; reject stale, wrong-region, wrong-unit and overlapping estimates; distinguish a constructed benchmark from independent inspection ground truth; retain the original request security boundaries.
