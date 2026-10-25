import { test } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import cases from "./vision-cases.json";
import { prepareEvidence } from "../src/server/evidence/prepare";

// Catalog-free perception diagnostic; no captions, identifiers or answers sent to Gemma.
test("Gemma visual inventory", { timeout: 600000 }, async () => {
 const startedAt = new Date().toISOString();
 const model = process.env.GEMMA_MODEL_ID!;
 const ai = new GoogleGenAI({apiKey:process.env.GEMMA_API_KEY!,httpOptions:{retryOptions:{attempts:1}}});
 const rows: unknown[] = [];
 const prompt = `Describe only what is visible in these views of one property photograph. First identify the scene and physical objects using their connections and surrounding context. Then examine visible surface changes, geometry, gaps, connections and alignment. Do not diagnose hidden causes, estimate costs, or force an object identity. Distinguish what you can see from uncertainty. The first image is the whole photo; the next four are overlapping top-left, top-right, bottom-left, bottom-right crops of it. They are the same scene, not five separate defects. Return JSON {"scene":string,"observations":[{"object":string,"visibleDetail":string,"location":string,"uncertainty":string}],"limitations":[string]}. Include useful spatial relationships and visible irregularities. Do not guess material composition or condition behind surfaces. No markdown.`;
 for (const entry of cases.filter(x=>["epa-32","epa-29","epa-93"].includes(x.id))) {
  const bytes = await readFile(new URL(entry.imagePath,import.meta.url));
  const evidence=await prepareEvidence({images:[{mimeType:entry.mimeType,data:bytes.toString('base64')}]});
  const original=Buffer.from(evidence.images[0].data,'base64');
  const {width=0,height=0}=await sharp(original).metadata();
  const views=[original];
  for(const [x,y] of [[0,0],[1,0],[0,1],[1,1]]) {
   const w=Math.round(width*.7),h=Math.round(height*.7);
   views.push(await sharp(original).extract({left:x*(width-w),top:y*(height-h),width:w,height:h}).jpeg({quality:95}).toBuffer());
  }
  const start=Date.now();
  try {
   const r=await ai.models.generateContent({model,contents:[{role:'user',parts:[...views.map(v=>({inlineData:{mimeType:'image/jpeg',data:v.toString('base64')}})),{text:prompt}]}],config:{temperature:0,maxOutputTokens:4096,thinkingConfig:{thinkingLevel:ThinkingLevel.HIGH},httpOptions:{timeout:65000,retryOptions:{attempts:1}},abortSignal:AbortSignal.timeout(65000)}});
   rows.push({id:entry.id,elapsedMs:Date.now()-start,text:r.text,usage:r.usageMetadata,finishReason:r.candidates?.[0]?.finishReason,modelVersion:r.modelVersion});
  } catch(e) { rows.push({id:entry.id,elapsedMs:Date.now()-start,error:e instanceof Error?e.name:'Error'}); }
  await writeFile('benchmarks/results/vision-inventory-latest.json',JSON.stringify({startedAt,model,prompt,status:'running',rows},null,2)+'\n');
  await new Promise(r=>setTimeout(r,15000));
 }
 const report=JSON.stringify({startedAt,model,prompt,status:'finished',rows},null,2)+'\n';
 await writeFile(`benchmarks/results/vision-inventory-${startedAt.replace(/[:.]/g,'-')}.json`,report);
 await writeFile('benchmarks/results/vision-inventory-latest.json',report);
});
