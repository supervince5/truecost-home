import "server-only";
import { setTimeout as delay } from "node:timers/promises";
import { attributedExtractionSchema } from "../../lib/schemas/extraction";
import { componentSchema } from "../../lib/schemas/finding";
import { AnalysisError } from "../errors";
import type { PreparedEvidence } from "../evidence/prepare";
import type { ModelProvider } from "../model/provider";
import { PROMPT_VERSION } from "../model/prompt";
import { buildConditionReview } from "../condition/review";

export const PIPELINE_VERSION = "photo-evidence-review-v5";

export async function extract(evidence: PreparedEvidence, provider: ModelProvider, options: { signal?: AbortSignal; timeoutMs?: number } = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? (evidence.images.length ? 75000 : 40000));
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  let inputTokens: number | null = 0;
  let outputTokens: number | null = 0;
  let thinkingTokens: number | null = 0;
  let totalTokens: number | null = 0;
  let correctiveAttempt = false;
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (signal.aborted) throw new AnalysisError(controller.signal.aborted ? "TIMEOUT" : "CANCELLED");
      let response: Awaited<ReturnType<ModelProvider["generate"]>>;
      try { response = await new Promise<Awaited<ReturnType<ModelProvider["generate"]>>>((resolve, reject) => {
        const abort = () => reject(new AnalysisError(controller.signal.aborted ? "TIMEOUT" : "CANCELLED"));
        signal.addEventListener("abort", abort, { once: true });
        Promise.resolve().then(() => provider.generate(evidence, { signal, correctiveAttempt })).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
      });
      } catch (error) {
        if (!(error instanceof AnalysisError) || error.code !== "PROVIDER_UNAVAILABLE" || attempt === 2) throw error;
        inputTokens = null;
        outputTokens = null;
        thinkingTokens = null;
        totalTokens = null;
        await delay(800, undefined, { signal });
        continue;
      }
      if (response.modelVersion && !response.modelVersion.startsWith(provider.modelId)) throw new AnalysisError("MODEL_MISMATCH");
      inputTokens = inputTokens === null || response.inputTokens === null ? null : inputTokens + response.inputTokens;
      outputTokens = outputTokens === null || response.outputTokens === null ? null : outputTokens + response.outputTokens;
      thinkingTokens = thinkingTokens === null || response.thinkingTokens == null ? null : thinkingTokens + response.thinkingTokens;
      totalTokens = totalTokens === null || response.totalTokens == null ? null : totalTokens + response.totalTokens;
      correctiveAttempt = true;
      let raw: unknown;
      try {
        if (response.text.length > 80000) throw new Error("oversized output");
        const text = response.text.trim();
        const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(text);
        raw = JSON.parse(fenced ? fenced[1] : text);
      } catch { continue; }
      // Preserve strict response keys before attaching our own trusted source records.
      if (typeof raw !== "object" || raw === null || Array.isArray(raw) || "sources" in raw) continue;
      const parsed = attributedExtractionSchema.safeParse({ ...raw, sources: evidence.sources });
      if (!parsed.success) continue;
      const findings = parsed.data.findings.map((finding) => ({ ...finding,
        indicatorIds: finding.conditionState === "current" ? finding.indicatorIds : [],
        // Questions must not presume a cause that a photograph has not established.
        // Specific verification steps are supplied by the sourced review cards.
        followUpQuestion: finding.evidenceClass === "visual_observation"
          ? "What could explain this visible condition, and what should a qualified professional check?"
          : finding.followUpQuestion,
        needsProfessionalAssessment: true as const }));
      if (findings.some((finding) => !finding.followUpQuestion)) continue;
      const unassessedComponents = Array.from(new Set([...parsed.data.unassessedComponents, ...componentSchema.options.filter((component) => component !== "other" && !findings.some((finding) => finding.component === component && finding.conditionState === "current"))]));
      return {
        findings, unassessedComponents, sources: evidence.sources, reviewRequired: true as const,
        conditionReview: buildConditionReview(findings),
        metadata: { provider: "google-gemini-api", modelId: provider.modelId, modelVersion: response.modelVersion, promptVersion: PROMPT_VERSION, pipelineVersion: PIPELINE_VERSION, attempts: attempt, inputTokens, outputTokens, thinkingTokens, totalTokens, latencyMs: Date.now() - started },
      };
    }
    throw new AnalysisError("INVALID_MODEL_OUTPUT");
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    if (signal.aborted) throw new AnalysisError(controller.signal.aborted ? "TIMEOUT" : "CANCELLED");
    throw new AnalysisError("PROVIDER_ERROR");
  } finally { clearTimeout(timer); }
}
