import { test } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import cases from "./vision-cases.json";
import { prepareEvidence } from "../src/server/evidence/prepare";
import { createGemmaProvider } from "../src/server/model/gemma";
import { extract, PIPELINE_VERSION } from "../src/server/analysis/extract";
import { CONDITION_PROMPT, PROMPT_VERSION } from "../src/server/model/prompt";
import { AnalysisError } from "../src/server/errors";

// This records a comparison; runner completion is not an accuracy pass.
test("paired visual reasoning comparison with frozen inputs", { timeout: 2100000 }, async () => {
  if (!process.env.GEMMA_API_KEY) throw new Error("Configure the ignored server key first.");
  const modelId = process.env.GEMMA_MODEL_ID ?? "gemma-4-26b-a4b-it";
  const startedAt = new Date().toISOString();
  const rows: unknown[] = [];
  const metadata = {
    startedAt, modelId, promptVersion: PROMPT_VERSION, pipelineVersion: PIPELINE_VERSION,
    promptSha256: createHash("sha256").update(CONDITION_PROMPT).digest("hex"),
    manifestSha256: createHash("sha256").update(JSON.stringify(cases)).digest("hex"),
    pacingMs: 21000, baseline: "MINIMAL", candidate: "HIGH", totalPlannedExtractions: cases.length * 2,
    maximumModelCallsPerExtraction: 2,
    limitations: ["Selected educational images, not professional ground truth.", "Semantic review required; accepted JSON is not a correct detection.", "No captions, expected answers or retries outside the application budget."],
  };
  for (const [index, entry] of cases.entries()) {
    const bytes = await readFile(new URL(entry.imagePath, import.meta.url));
    if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error("Photo checksum mismatch");
    const evidence = await prepareEvidence({ images: [{ mimeType: entry.mimeType, data: bytes.toString("base64") }] });
    const normalizedSha256 = createHash("sha256").update(Buffer.from(evidence.images[0].data, "base64")).digest("hex");
    const order = index % 2 ? ["HIGH", "MINIMAL"] : ["MINIMAL", "HIGH"];
    for (const thinkingLevel of order) {
      const diagnostics: unknown[] = [];
      const provider = createGemmaProvider({ apiKey: process.env.GEMMA_API_KEY, modelId }, async (input, init) => {
        const body = JSON.parse(String(init?.body));
        body.generationConfig.thinkingConfig = { thinkingLevel };
        const start = Date.now();
        try {
          const response = await fetch(input, { ...init, body: JSON.stringify(body) });
          const output = await response.clone().json().catch(() => null);
          diagnostics.push({ status: response.status, apiStatus: output?.error?.status ?? null, elapsedMs: Date.now() - start, finishReason: output?.candidates?.[0]?.finishReason ?? null, usage: output?.usageMetadata ?? null });
          return response;
        } catch { diagnostics.push({ status: null, elapsedMs: Date.now() - start }); throw new Error("Transport failed"); }
      });
      const start = Date.now();
      let result: Awaited<ReturnType<typeof extract>> | null = null, error: string | null = null;
      try { result = await extract(evidence, provider); }
      catch (e) { error = e instanceof AnalysisError ? e.code : "BENCHMARK_ERROR"; }
      rows.push({ id: entry.id, split: entry.split, thinkingLevel, normalizedSha256, elapsedMs: Date.now() - start, error, result, diagnostics, semanticReview: "pending" });
      await writeFile("benchmarks/results/vision-comparison-latest.json", JSON.stringify({ ...metadata, status: "running", rows }, null, 2) + "\n");
      if (!(index === cases.length - 1 && thinkingLevel === order.at(-1))) await new Promise((resolve) => setTimeout(resolve, metadata.pacingMs));
    }
  }
  const report = { ...metadata, status: "finished", finishedAt: new Date().toISOString(), rows };
  await writeFile(`benchmarks/results/vision-comparison-${startedAt.replace(/[:.]/g, "-")}.json`, JSON.stringify(report, null, 2) + "\n");
  await writeFile("benchmarks/results/vision-comparison-latest.json", JSON.stringify(report, null, 2) + "\n");
});
