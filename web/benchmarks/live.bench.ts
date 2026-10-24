import { test } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import rawCases from "./cases.json";
import { scoreCase } from "./score";
import { extractionRequestSchema } from "../src/lib/schemas/extraction";
import { indicatorById, patterns, sourceById, KNOWLEDGE_VERSION } from "../src/lib/condition/knowledge";
import { prepareEvidence } from "../src/server/evidence/prepare";
import { createGemmaProvider } from "../src/server/model/gemma";
import { extract, PIPELINE_VERSION } from "../src/server/analysis/extract";
import { AnalysisError } from "../src/server/errors";
import { CONDITION_PROMPT, PROMPT_VERSION } from "../src/server/model/prompt";

const caseSchema = z.strictObject({
  id: z.string(), kind: z.literal("constructed_report"), input: extractionRequestSchema,
  expectedIndicatorIds: z.array(z.string()), allowedIndicatorIds: z.array(z.string()),
  expectedPatternIds: z.array(z.string()), requiredUnknownComponents: z.array(z.string()),
  sourceIds: z.array(z.string()).min(1), groundTruth: z.string(), humanReview: z.array(z.string()),
});

test("run the explicitly requested live Gemma benchmark", { timeout: 1800000 }, async () => {
  if (!process.env.GEMMA_API_KEY) throw new Error("Set GEMMA_API_KEY in the ignored .env.local before running benchmark:live.");
  const cases = z.array(caseSchema).parse(rawCases);
  for (const entry of cases) {
    if (entry.sourceIds.some((id) => !sourceById.has(id)) || entry.allowedIndicatorIds.some((id) => !indicatorById.has(id)) || entry.expectedPatternIds.some((id) => !patterns.some((p) => p.id === id))) throw new Error("Invalid benchmark reference");
  }
  const selected = process.env.BENCHMARK_CASE ? cases.filter((entry) => process.env.BENCHMARK_CASE!.split(",").includes(entry.id)) : cases;
  if (!selected.length) throw new Error("Unknown benchmark case");
  const selection = { selectedCaseIds: selected.map((entry) => entry.id), totalAvailableCases: cases.length, fullSuiteRun: selected.length === cases.length, pacingMs: 31000, pipelineVersion: PIPELINE_VERSION };
  const latestPath = selection.fullSuiteRun ? "benchmarks/results/latest.json" : "benchmarks/results/latest-subset.json";
  const docPath = selection.fullSuiteRun ? "../docs/DETECTION_BENCHMARK_RESULTS.md" : "../docs/DETECTION_BENCHMARK_SUBSET_RESULTS.md";
  const httpDiagnostics: Array<{ httpStatus: number; apiStatus: string | null; finishReason: string | null }> = [];
  const provider = createGemmaProvider({ apiKey: process.env.GEMMA_API_KEY!, modelId: process.env.GEMMA_MODEL_ID ?? "gemma-4-26b-a4b-it" }, async (input, init) => {
    const response = await fetch(input, init);
    const body = await response.clone().json().catch(() => null) as { error?: { status?: string }; candidates?: { finishReason?: string }[] } | null;
    httpDiagnostics.push({ httpStatus: response.status, apiStatus: body?.error?.status ?? null, finishReason: body?.candidates?.[0]?.finishReason ?? null });
    return response;
  });
  type Extraction = Awaited<ReturnType<typeof extract>>;
  const rows: Array<{ id: string; kind: string; score: ReturnType<typeof scoreCase>; errorCode: string | null; latencyMs: number; metadata: Extraction["metadata"] | null; findings: Extraction["findings"] | null; patterns: Extraction["conditionReview"]["patternCandidates"] | null; humanReviewStatus: string; sourceIds: string[]; httpDiagnostics: typeof httpDiagnostics }> = [];
  const startedAt = new Date().toISOString();
  await mkdir("benchmarks/results", { recursive: true });
  for (const entry of selected) {
    const started = Date.now();
    const traceStart = httpDiagnostics.length;
    let result: Awaited<ReturnType<typeof extract>> | null = null;
    let errorCode: string | null = null;
    try { result = await extract(await prepareEvidence(entry.input), provider); }
    catch (error) { errorCode = error instanceof AnalysisError ? error.code : "BENCHMARK_ERROR"; }
    rows.push({ id: entry.id, kind: entry.kind, score: scoreCase(entry, result), errorCode, latencyMs: Date.now() - started,
      metadata: result?.metadata ?? null, findings: result?.findings ?? null, patterns: result?.conditionReview.patternCandidates ?? null,
      humanReviewStatus: "pending", sourceIds: entry.sourceIds, httpDiagnostics: httpDiagnostics.slice(traceStart) });
    console.log(`${entry.id}: ${rows.at(-1)!.score.passed ? "PASS" : "FAIL"}${errorCode ? ` (${errorCode})` : ""}`);
    // Persist partial results after each case. Never write input images or credentials.
    await writeFile(latestPath, JSON.stringify({ startedAt, ...selection, status: "running", rows }, null, 2) + "\n");
    if (entry !== selected.at(-1)) await new Promise((resolve) => setTimeout(resolve, selection.pacingMs));
  }
  const sum = (key: "truePositives" | "falsePositives" | "falseNegatives") => rows.reduce((n, row) => n + row.score[key], 0);
  const tp = sum("truePositives"), fp = sum("falsePositives"), fn = sum("falseNegatives");
  const summary = { cases: rows.length, passed: rows.filter((row) => row.score.passed).length,
    contractFailures: rows.filter((row) => !row.score.contractPassed).length,
    truePositives: tp, falsePositives: fp, falseNegatives: fn,
    tagPrecision: tp + fp ? tp / (tp + fp) : null, tagRecall: tp + fn ? tp / (tp + fn) : null,
    inputTokensOnSuccessfulExtractions: rows.reduce((n, row) => n + (row.metadata?.inputTokens ?? 0), 0),
    outputTokensOnSuccessfulExtractions: rows.reduce((n, row) => n + (row.metadata?.outputTokens ?? 0), 0),
    providerTotalTokensOnSuccessfulExtractions: rows.reduce((n, row) => n + (row.metadata?.totalTokens ?? 0), 0),
    tokenAccountingComplete: rows.every((row) => row.metadata?.totalTokens != null),
    billedDollars: null, humanSemanticReviewComplete: false, photoDetectionAccuracy: null };
  const report = { ...selection, startedAt, finishedAt: new Date().toISOString(), status: "finished", modelId: provider.modelId,
    promptVersion: PROMPT_VERSION, knowledgeVersion: KNOWLEDGE_VERSION,
    promptSha256: createHash("sha256").update(CONDITION_PROMPT).digest("hex"),
    casesSha256: createHash("sha256").update(JSON.stringify(rawCases)).digest("hex"),
    limitations: ["Constructed text scenarios, not independently labeled property inspections.", "Tag scores do not establish semantic correctness or photo detection accuracy.", "Failed-call token usage may be unavailable; usage is not billed cost.", "No training or model-weight updates."], summary, rows };
  const filename = `benchmarks/results/${startedAt.replace(/[:.]/g, "-")}.json`;
  await writeFile(filename, JSON.stringify(report, null, 2) + "\n");
  await writeFile(latestPath, JSON.stringify(report, null, 2) + "\n");
  await writeFile(docPath, `# Detection benchmark results\n\nRun: ${startedAt}\n\nScope: ${selection.fullSuiteRun ? "full suite" : `selected subset of ${cases.length} cases; see the [full-suite report](DETECTION_BENCHMARK_RESULTS.md)`}. Pipeline: ${PIPELINE_VERSION}. Pacing: ${selection.pacingMs} ms.\n\nModel: ${provider.modelId}; prompt: ${PROMPT_VERSION}.\n\n${summary.passed}/${summary.cases} constructed text cases passed automated checks. ${summary.contractFailures} provider/contract failures.\n\nTag counts: ${tp} expected labels found, ${fn} missed, ${fp} unexpected. These are label checks, not a professional inspection accuracy score. No photo-detection accuracy measured.\n\nSuccessful-extraction token totals: ${summary.inputTokensOnSuccessfulExtractions} input, ${summary.outputTokensOnSuccessfulExtractions} output. Complete accounting: ${summary.tokenAccountingComplete}. Dollar cost not calculated.\n\n| Case | Automated result | Error |\n|---|---|---|\n${rows.map((row) => `| ${row.id} | ${row.score.passed ? "Pass" : "Fail"} | ${row.errorCode ?? "—"} |`).join("\n")}\n\nHuman semantic review remains pending. Inspect the saved findings before claiming correctness. Machine-readable results: [dated run](../web/${filename}).\n`);
});
