import "server-only";
import { attributedExtractionSchema } from "../../lib/schemas/extraction";
import { componentSchema } from "../../lib/schemas/finding";
import { AnalysisError } from "../errors";
import type { PreparedEvidence } from "../evidence/prepare";
import type { ModelProvider } from "../model/provider";
import { PROMPT_VERSION } from "../model/prompt";

export async function extract(evidence: PreparedEvidence, provider: ModelProvider, options: { signal?: AbortSignal; timeoutMs?: number } = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 40000);
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  let inputTokens: number | null = 0;
  let outputTokens: number | null = 0;
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (signal.aborted) throw new AnalysisError(controller.signal.aborted ? "TIMEOUT" : "CANCELLED");
      const response = await new Promise<Awaited<ReturnType<ModelProvider["generate"]>>>((resolve, reject) => {
        const abort = () => reject(new AnalysisError(controller.signal.aborted ? "TIMEOUT" : "CANCELLED"));
        signal.addEventListener("abort", abort, { once: true });
        Promise.resolve().then(() => provider.generate(evidence, { signal, correctiveAttempt: attempt === 2 })).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
      });
      if (response.modelVersion && !response.modelVersion.startsWith(provider.modelId)) throw new AnalysisError("MODEL_MISMATCH");
      inputTokens = inputTokens === null || response.inputTokens === null ? null : inputTokens + response.inputTokens;
      outputTokens = outputTokens === null || response.outputTokens === null ? null : outputTokens + response.outputTokens;
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
      const findings = parsed.data.findings.map((finding) => ({ ...finding, needsProfessionalAssessment: true as const }));
      if (findings.some((finding) => !finding.followUpQuestion)) continue;
      const unassessedComponents = Array.from(new Set([...parsed.data.unassessedComponents, ...componentSchema.options.filter((component) => component !== "other" && !findings.some((finding) => finding.component === component))]));
      return {
        findings, unassessedComponents, sources: evidence.sources, reviewRequired: true as const,
        metadata: { provider: "google-gemini-api", modelId: provider.modelId, modelVersion: response.modelVersion, promptVersion: PROMPT_VERSION, attempts: attempt, inputTokens, outputTokens, latencyMs: Date.now() - started },
      };
    }
    throw new AnalysisError("INVALID_MODEL_OUTPUT");
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    if (signal.aborted) throw new AnalysisError(controller.signal.aborted ? "TIMEOUT" : "CANCELLED");
    throw new AnalysisError("PROVIDER_ERROR");
  } finally { clearTimeout(timer); }
}
