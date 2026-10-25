import { test, expect } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { prepareEvidence } from "../src/server/evidence/prepare";
import { getGemmaProvider } from "../src/server/model/gemma";
import { extract, PIPELINE_VERSION } from "../src/server/analysis/extract";
import { CONDITION_PROMPT, PROMPT_VERSION } from "../src/server/model/prompt";
import { AnalysisError } from "../src/server/errors";

// Actual configured production adapter, without a request-body/model override.
// These development assertions are smoke checks, not a semantic accuracy metric.
test("production photo and repaired-condition smoke", { timeout: 300000 }, async () => {
  const provider = getGemmaProvider();
  const startedAt = new Date().toISOString();
  const rows = [];
  for (const id of ["epa-32", "epa-29", "resolved-cabinet"]) {
    const input = id === "resolved-cabinet"
      ? { reportPages: ["A prior plumbing leak was repaired. The sink cabinet is currently dry and undamaged. No active leak was observed. Concealed conditions were not inspected."] }
      : { images: [{ mimeType: "image/jpeg", data: (await readFile(new URL(`./images/${id}.jpg`, import.meta.url))).toString("base64") }] };
    const evidence = await prepareEvidence(input);
    let result: Awaited<ReturnType<typeof extract>> | null = null, error: string | null = null;
    const start = Date.now();
    try { result = await extract(evidence, provider); }
    catch (e) { error = e instanceof AnalysisError ? e.code : "BENCHMARK_ERROR"; }
    const findings = result?.findings ?? [];
    const checks = {
      responseAvailable: result !== null,
      relevantObservation: id === "resolved-cabinet"
        ? findings.every((f) => f.indicatorIds.length === 0 && f.conditionState !== "current")
        : id === "epa-32"
          ? findings.some((f) => /stain|tide|discolor/i.test(f.description)) && findings.every((f) => !/cardboard boxes/i.test(f.description) && !f.indicatorIds.includes("cabinet_water_damage"))
          : findings.some((f) => f.indicatorIds.includes("downspout_disconnected") || /downspout/i.test(f.description) && /gap|disconnect|separat/i.test(f.description)),
      neutralPhotoQuestion: findings.filter((f) => f.evidenceClass === "visual_observation").every((f) => f.followUpQuestion === "What could explain this visible condition, and what should a qualified professional check?"),
    };
    rows.push({ id, elapsedMs: Date.now() - start, normalizedSha256: evidence.images[0] ? createHash("sha256").update(Buffer.from(evidence.images[0].data, "base64")).digest("hex") : null, error, checks, result });
    if (id !== "resolved-cabinet") await new Promise((resolve) => setTimeout(resolve, 21000));
  }
  const report = { startedAt, finishedAt: new Date().toISOString(), modelId: provider.modelId, pipelineVersion: PIPELINE_VERSION, promptVersion: PROMPT_VERSION,
    promptSha256: createHash("sha256").update(CONDITION_PROMPT).digest("hex"),
    limitation: "Selected development smoke cases; descriptions still require manual review. No cached results or fixture-specific application rules.", rows };
  await writeFile(`benchmarks/results/vision-smoke-${startedAt.replace(/[:.]/g, "-")}.json`, JSON.stringify(report, null, 2) + "\n");
  await writeFile("benchmarks/results/vision-smoke-latest.json", JSON.stringify(report, null, 2) + "\n");
  expect(rows.every((r) => Object.values(r.checks).every(Boolean))).toBe(true);
});
