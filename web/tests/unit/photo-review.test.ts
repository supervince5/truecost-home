import {expect,it,vi} from 'vitest';
import type {ExtractionRequest} from '../../src/lib/schemas/extraction';
import {reviewHomePhotos,combinePhotoResults,type AnalysisResult} from '../../src/lib/photo-review';
const result=(component='roof'):AnalysisResult=>({findings:[{id:'same',component,conditionState:'current',indicatorIds:[],description:'Visible mark',evidenceClass:'visual_observation',evidence:[{kind:'image',sourceId:'photo-1'}],needsProfessionalAssessment:true,followUpQuestion:'Verify it?'}],sources:[{id:'photo-1',kind:'image',label:'Photo 1'}],unassessedComponents:[],reviewRequired:true,conditionReview:{knowledgeVersion:'v1',cards:[],patternCandidates:[],coverage:[{component:'roof',status:'observations_only'}],limits:[]},metadata:{modelId:'gemma-4-26b-a4b-it',pipelineVersion:'v7',photoReviewMode:'deliberate',provider:'google-gemini-api',promptVersion:'v1',modelVersion:'gemma-4-26b-a4b-it',attempts:1,inputTokens:1,outputTokens:2,thinkingTokens:3,totalTokens:6,latencyMs:10}} as AnalysisResult);
it('reviews seven views sequentially, sends text once and preserves unique photo references',async()=>{
 const run=vi.fn(async(_request:ExtractionRequest)=>{void _request;return result();});const progress=vi.fn();
 const r=await reviewHomePhotos({images:Array.from({length:7},()=>({mimeType:'image/jpeg' as const,data:'test'})),listingText:'Reported history.',reportPages:['Inspection.'],photoReviewMode:'deliberate'},run,progress);
 expect(run).toHaveBeenCalledTimes(7);expect(run.mock.calls.map(c=>(c as unknown as [{images:unknown[]}])[0].images.length)).toEqual(Array(7).fill(1));
 expect(run.mock.calls[1][0]).toMatchObject({listingText:undefined,reportPages:[]});
 expect(r.findings.map(f=>f.evidence[0].sourceId)).toEqual(Array.from({length:7},(_,i)=>`photo-${i+1}`));expect(new Set(r.findings.map(f=>f.id)).size).toBe(7);expect(r.metadata.totalTokens).toBe(42);expect(progress).toHaveBeenLastCalledWith(7,7);
});
it('stops at a failed view and never returns a complete result for partial evidence',async()=>{
 const run=vi.fn().mockResolvedValueOnce(result()).mockRejectedValueOnce(new Error('Timed out'));
 await expect(reviewHomePhotos({images:Array(3).fill({mimeType:'image/jpeg',data:'test'}),reportPages:[]},run,()=>{})).rejects.toThrow('View 2 of 3');expect(run).toHaveBeenCalledTimes(2);
});
it('cancels before the next view and rejects an eighth photo',async()=>{
 const controller=new AbortController();controller.abort();const run=vi.fn(async(_request:ExtractionRequest)=>{void _request;return result();});
 await expect(reviewHomePhotos({images:[],reportPages:[]},run,()=>{},controller.signal)).rejects.toThrow();expect(run).not.toHaveBeenCalled();
 await expect(reviewHomePhotos({images:Array(8).fill({mimeType:'image/jpeg',data:'test'}),reportPages:[]},run,()=>{})).rejects.toThrow('seven');
});
it('keeps unavailable usage unknown and rejects inconsistent model outputs',()=>{
 const a=result(),b=result();b.metadata.totalTokens=null;expect(combinePhotoResults([a,b],100).metadata.totalTokens).toBeNull();b.metadata.modelId='different';expect(()=>combinePhotoResults([a,b],100)).toThrow('configuration changed');
});
it('stops between views when cancellation arrives after the first response',async()=>{
 const controller=new AbortController();const run=vi.fn(async()=>{controller.abort();return result();});
 await expect(reviewHomePhotos({images:Array(2).fill({mimeType:'image/jpeg',data:'test'}),reportPages:[]},run,()=>{},controller.signal)).rejects.toThrow();expect(run).toHaveBeenCalledTimes(1);
});
it('preserves an in-flight AbortError instead of reporting it as a failed image',async()=>{
 const controller=new AbortController();const error=new DOMException('Cancelled','AbortError');
 const run=vi.fn(async()=>{controller.abort();throw error;});
 await expect(reviewHomePhotos({images:[],reportPages:[]},run,()=>{},controller.signal)).rejects.toBe(error);
});
it('rejects mixed prompt and condition-library versions',()=>{
 const a=result(),b=result();b.metadata.promptVersion='other';expect(()=>combinePhotoResults([a,b],1)).toThrow('configuration');b.metadata.promptVersion=a.metadata.promptVersion;b.conditionReview.knowledgeVersion='other';expect(()=>combinePhotoResults([a,b],1)).toThrow('configuration');
});
it('remaps research cards and within-view pattern references alongside findings',()=>{
 const a=result();a.conditionReview.cards=[{findingId:'same'} as AnalysisResult['conditionReview']['cards'][number]];
 a.conditionReview.patternCandidates=[{id:'pattern',supportingFindingIds:['same']} as AnalysisResult['conditionReview']['patternCandidates'][number]];
 const merged=combinePhotoResults([a,a],20);
 expect(merged.conditionReview.cards.map(c=>c.findingId)).toEqual(['view1_same','view2_same']);
 expect(merged.conditionReview.patternCandidates.map(p=>p.supportingFindingIds)).toEqual([['view1_same'],['view2_same']]);
});
