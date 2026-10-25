import { test } from 'vitest';
import { readFile,writeFile } from 'node:fs/promises';
import { prepareEvidence } from '../src/server/evidence/prepare';
import { getGemmaProvider } from '../src/server/model/gemma';
import { extract,PIPELINE_VERSION } from '../src/server/analysis/extract';
import { AnalysisError } from '../src/server/errors';
import cases from './vision-cases.json';
test('deliberate review repeat and maximum photo request',{timeout:1200000},async()=>{
 const startedAt=new Date().toISOString(),rows:unknown[]=[];
 const originalCases=['epa-32','epa-29','epa-89','epa-88','epa-93'];
 const runs=[{id:'six-photo-input',ids:[...originalCases,'epa-17']},...originalCases.map(id=>({id,ids:[id]}))];
 for(const run of runs){
  const images=await Promise.all(run.ids.map(async id=>({mimeType:'image/jpeg' as const,data:(await readFile(new URL(cases.find(c=>c.id===id)!.imagePath,import.meta.url))).toString('base64')})));
  const started=Date.now();let result=null,error=null;
  try{result=await extract(await prepareEvidence({images,photoReviewMode:'deliberate'}),getGemmaProvider());}catch(e){error=e instanceof AnalysisError?e.code:'BENCHMARK_ERROR';}
  rows.push({id:run.id,inputPhotoIds:run.ids,elapsedMs:Date.now()-started,error,result,semanticReview:'pending'});
  const report={startedAt,pipelineVersion:PIPELINE_VERSION,mode:'deliberate',status:rows.length===runs.length?'finished':'running',limitation:'Selected development regression images. Not independent ground truth; schema-valid output is not semantic correctness. All attempts retained.',rows};
  await writeFile('benchmarks/results/demo-readiness-latest.json',JSON.stringify(report,null,2)+'\n');
  if(rows.length===runs.length)await writeFile(`benchmarks/results/demo-readiness-${startedAt.replace(/[:.]/g,'-')}.json`,JSON.stringify(report,null,2)+'\n');
  else await new Promise(r=>setTimeout(r,15000));
 }
});
