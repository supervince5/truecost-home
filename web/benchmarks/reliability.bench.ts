import { expect, test } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import photos from "./photo-cases.json";
import cases from "./cases.json";
import { scoreCase } from "./score";
import { prepareEvidence } from "../src/server/evidence/prepare";
import { createGemmaProvider } from "../src/server/model/gemma";
import { extract, PIPELINE_VERSION } from "../src/server/analysis/extract";
import { CONDITION_PROMPT, PROMPT_VERSION } from "../src/server/model/prompt";
import { AnalysisError } from "../src/server/errors";

const regressions = [
  { id: "resolved-cabinet", text: "A prior plumbing leak was repaired. The sink cabinet is currently dry and undamaged. No active leak was observed. Concealed conditions were not inspected.", expected: [] },
  { id: "resolved-paraphrase", text: "Last year's sink supply drip was fixed by a plumber. At today's inspection the cabinet was intact with no water damage and no leaking was found.", expected: [] },
  { id: "historical-only", text: "Seller discloses a bathroom pipe leak in 2019. No current inspection of that area was available.", expected: [] },
  { id: "hypothetical-only", text: "General maintenance advice: if the kitchen sink ever leaks, inspect the cabinet. This is advice, not an observed condition.", expected: [] },
  { id: "repaired-with-damage", text: "The sink leak was repaired, but the cabinet base remains swollen and delaminated. No active dripping was observed.", expected: ["cabinet_water_damage"] },
  { id: "new-active-leak", text: "The bathroom leak was repaired. A separate kitchen supply pipe is currently dripping and the kitchen cabinet base is wet and swollen.", expected: ["plumbing_leak", "cabinet_water_damage"] },
  { id: "residual-stain", text: "The roof leak was repaired. A brown stain remains visible on the bedroom ceiling. Its moisture content was not tested.", expected: ["ceiling_stain"] },
];

test("repeat photo and repaired-condition demo regressions through live Gemma", { timeout: 1200000 }, async () => {
  if (!process.env.GEMMA_API_KEY) throw new Error("Set the ignored GEMMA_API_KEY first.");
  type Trace = { responseMs: number; status: number | null; apiStatus: string | null; finishReason: string | null; thinkingTokens: number | null; totalTokens: number | null };
  const traces: Trace[] = [];
  const provider = createGemmaProvider({ apiKey: process.env.GEMMA_API_KEY, modelId: process.env.GEMMA_MODEL_ID ?? "gemma-4-26b-a4b-it" }, async (input, init) => {
    const started = Date.now();
    try {
      const response = await fetch(input, init);
      const body = await response.clone().json().catch(() => null);
      traces.push({ responseMs: Date.now()-started, status: response.status, apiStatus: body?.error?.status ?? null, finishReason: body?.candidates?.[0]?.finishReason ?? null, thinkingTokens: body?.usageMetadata?.thoughtsTokenCount ?? null, totalTokens: body?.usageMetadata?.totalTokenCount ?? null });
      return response;
    } catch(error) { traces.push({ responseMs:Date.now()-started,status:null,apiStatus:"TRANSPORT_FAILURE",finishReason:null,thinkingTokens:null,totalTokens:null });throw error; }
  });
  const jobs: Array<{ id: string; kind: string; input: unknown; expected?: string[]; fixture?: (typeof cases)[number] }> = [];
  for (let round=1; round<=2; round++) for (const photo of photos) {
    const bytes=await readFile(new URL(photo.imagePath,import.meta.url));
    if (createHash("sha256").update(bytes).digest("hex")!==photo.sha256) throw new Error("Photo checksum mismatch");
    jobs.push({id:`${photo.id}-round-${round}`,kind:"photo",input:{images:[{mimeType:photo.mimeType,data:bytes.toString("base64")}]}});
  }
  for (const entry of regressions) jobs.push({ id:entry.id,kind:"text-regression",input:{reportPages:[entry.text]},expected:entry.expected });
  for (const id of ["roof-penetration","electrical-warning","landscape-tree"]) {
    const fixture=cases.find((entry)=>entry.id===id)!;
    jobs.push({id,kind:"text-existing",input:fixture.input,fixture});
  }
  const startedAt=new Date().toISOString();
  const rows: Array<Record<string, unknown>>=[];
  await mkdir("benchmarks/results",{recursive:true});
  for (const job of jobs) {
    const traceStart=traces.length, start=Date.now();
    let result: Awaited<ReturnType<typeof extract>>|null=null,errorCode:string|null=null;
    try { result=await extract(await prepareEvidence(job.input),provider); }
    catch(error) {errorCode=error instanceof AnalysisError?error.code:"BENCHMARK_ERROR";}
    const tags=[...new Set(result?.findings.flatMap((f)=>f.indicatorIds)??[])].sort();
    const score=job.fixture?scoreCase(job.fixture,result):null;
    const passed=result!==null && (score ? score.passed : job.expected ? JSON.stringify(tags)===JSON.stringify([...job.expected].sort()) : job.id.startsWith("epa-89") ? result.findings.length === 0 : result.findings.some((f) => f.conditionState === "current"));
    rows.push({id:job.id,kind:job.kind,passed,errorCode,elapsedMs:Date.now()-start,expectedTags:job.expected??null,actualTags:tags,score,result,httpDiagnostics:traces.slice(traceStart),visualReview:job.kind==="photo"?"pending":null});
    console.log(`${job.id}: ${passed?"PASS":"FAIL"} ${errorCode??""} ${Date.now()-start}ms`);
    await writeFile("benchmarks/results/reliability-latest.json",JSON.stringify({startedAt,status:"running",rows},null,2)+"\n");
    if(job!==jobs.at(-1)) await new Promise((resolve)=>setTimeout(resolve,21000));
  }
  const report={startedAt,finishedAt:new Date().toISOString(),status:"finished",modelId:provider.modelId,promptVersion:PROMPT_VERSION,pipelineVersion:PIPELINE_VERSION,pacingMs:21000,promptSha256:createHash("sha256").update(CONDITION_PROMPT).digest("hex"),summary:{cases:rows.length,passed:rows.filter((r)=>r.passed).length,photoSemanticReview:"pending"},limitations:["Selected development cases, not independent field accuracy.","Photo PASS requires an accepted response and an observation for positive cases or no findings for the control; inspect semantics separately.","No cached response substituted for any call."],rows};
  await writeFile(`benchmarks/results/reliability-${startedAt.replace(/[:.]/g,"-")}.json`,JSON.stringify(report,null,2)+"\n");
  await writeFile("benchmarks/results/reliability-latest.json",JSON.stringify(report,null,2)+"\n");
  expect(rows.filter((r)=>!r.passed).map((r)=>r.id)).toEqual([]);
});
