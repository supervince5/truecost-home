import type {extract} from '../server/analysis/extract';
import type {ExtractionRequest} from './schemas/extraction';
import {componentSchema} from './schemas/finding';
export type AnalysisResult=Awaited<ReturnType<typeof extract>>;
export const MAX_HOME_PHOTOS=7;
// Each request keeps the server's one-photo deadline. No failed view becomes a clean result.
export async function reviewHomePhotos(input:ExtractionRequest,run:(request:ExtractionRequest)=>Promise<AnalysisResult>,onProgress:(current:number,total:number)=>void,signal?:AbortSignal):Promise<AnalysisResult>{
 const count=Math.max(1,input.images.length);
 if(count>MAX_HOME_PHOTOS)throw new Error('Choose up to seven photos per home.');
 const results:AnalysisResult[]=[];const started=Date.now();
 for(let i=0;i<count;i++){
  signal?.throwIfAborted();onProgress(i+1,count);
  const request:ExtractionRequest={...input,listingText:i===0?input.listingText:undefined,reportPages:i===0?input.reportPages:[],images:input.images.length?[input.images[i]]:[]};
  try{results.push(await run(request));}catch(error){
   if(signal?.aborted)throw error;
   throw new Error(`View ${i+1} of ${count} could not be analyzed. No complete home result was produced. ${error instanceof Error?error.message:'Please retry.'}`);
  }
 }
 signal?.throwIfAborted();return combinePhotoResults(results,Date.now()-started);
}
export function combinePhotoResults(results:AnalysisResult[],latencyMs:number):AnalysisResult{
 if(!results.length)throw new Error('No analysis results.');
 const first=results[0];
 if(results.some(r=>r.metadata.modelId!==first.metadata.modelId || r.metadata.pipelineVersion!==first.metadata.pipelineVersion || r.metadata.promptVersion!==first.metadata.promptVersion || r.metadata.modelVersion!==first.metadata.modelVersion || r.metadata.photoReviewMode!==first.metadata.photoReviewMode || r.conditionReview.knowledgeVersion!==first.conditionReview.knowledgeVersion))throw new Error('Analysis configuration changed. Please retry the home review.');
 const remapped=results.map((r,i)=>{
  const id=(s:string)=>`view${i+1}_${s}`;
  const source=(s:string)=>s==='photo-1'?`photo-${i+1}`:s;
  return {...r,findings:r.findings.map(f=>({...f,id:id(f.id),evidence:f.evidence.map(e=>({...e,sourceId:source(e.sourceId)}))})),sources:r.sources.map(s=>s.kind==='image'?{...s,id:source(s.id),label:`Photo ${i+1}`} :s),conditionReview:{...r.conditionReview,cards:r.conditionReview.cards.map(c=>({...c,findingId:id(c.findingId)})),patternCandidates:r.conditionReview.patternCandidates.map(p=>({...p,id:id(p.id),supportingFindingIds:p.supportingFindingIds.map(id)}))}};
 });
 const findings=remapped.flatMap(r=>r.findings),current=new Set(findings.filter(f=>f.conditionState==='current').map(f=>f.component));
 const sum=(key:'inputTokens'|'outputTokens'|'thinkingTokens'|'totalTokens')=>results.some(r=>r.metadata[key]===null)?null:results.reduce((n,r)=>n+(r.metadata[key]??0),0);
 return {...first,findings,sources:remapped.flatMap(r=>r.sources),unassessedComponents:componentSchema.options.filter(c=>c!=='other'&&!current.has(c)),conditionReview:{...first.conditionReview,cards:remapped.flatMap(r=>r.conditionReview.cards),patternCandidates:remapped.flatMap(r=>r.conditionReview.patternCandidates),coverage:first.conditionReview.coverage.map(c=>({...c,status:current.has(c.component)?'observations_only':'no_evidence'}))},metadata:{...first.metadata,attempts:results.reduce((n,r)=>n+r.metadata.attempts,0),inputTokens:sum('inputTokens'),outputTokens:sum('outputTokens'),thinkingTokens:sum('thinkingTokens'),totalTokens:sum('totalTokens'),latencyMs}};
}
