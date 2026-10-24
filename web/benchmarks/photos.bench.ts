import { test } from "vitest";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import cases from "./photo-cases.json";
import { prepareEvidence } from "../src/server/evidence/prepare";
import { extract, PIPELINE_VERSION } from "../src/server/analysis/extract";
import { getGemmaProvider } from "../src/server/model/gemma";
import { AnalysisError } from "../src/server/errors";
import { CONDITION_PROMPT, PROMPT_VERSION } from "../src/server/model/prompt";

test("evaluate real educational photographs without caption leakage", { timeout: 600000 }, async () => {
  if (!process.env.GEMMA_API_KEY) throw new Error("Set GEMMA_API_KEY in ignored .env.local first.");
  const provider = getGemmaProvider();
  const rows = [];
  const startedAt = new Date().toISOString();
  for (const entry of cases) {
    const bytes = await readFile(new URL(entry.imagePath, import.meta.url));
    if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error("Benchmark image checksum mismatch");
    let result: Awaited<ReturnType<typeof extract>> | null = null;
    let errorCode: string | null = null;
    try { result = await extract(await prepareEvidence({ images: [{ mimeType: entry.mimeType, data: bytes.toString("base64") }] }), provider); }
    catch (error) { errorCode = error instanceof AnalysisError ? error.code : "BENCHMARK_ERROR"; }
    rows.push({ id: entry.id, errorCode, result, humanReviewStatus: "pending", expectedObservationRecovered: null, unsupportedClaimFound: null });
    if (entry !== cases.at(-1)) await new Promise((resolve) => setTimeout(resolve, 31000));
  }
  await mkdir("benchmarks/results", { recursive: true });
  const report = { pipelineVersion: PIPELINE_VERSION, pacingMs: 31000, startedAt, finishedAt: new Date().toISOString(), modelId: provider.modelId, promptVersion: PROMPT_VERSION,
    promptSha256: createHash("sha256").update(CONDITION_PROMPT).digest("hex"),
    casesSha256: createHash("sha256").update(JSON.stringify(cases)).digest("hex"),
    limitation: "Four source-attributed educational photos. Manual visible-observation review required; no representative field-accuracy claim.", rows };
  await writeFile(`benchmarks/results/photos-${startedAt.replace(/[:.]/g, "-")}.json`, JSON.stringify(report, null, 2) + "\n");
  await writeFile("benchmarks/results/photos-latest.json", JSON.stringify(report, null, 2) + "\n");
});
