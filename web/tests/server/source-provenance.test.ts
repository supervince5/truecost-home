import {expect,it} from 'vitest';
import {extract} from '../../src/server/analysis/extract';
import {prepareEvidence} from '../../src/server/evidence/prepare';
import type {ModelProvider} from '../../src/server/model/provider';
it('derives evidence class from validated source type, not the narrative claim of an inspection',async()=>{
 const evidence=await prepareEvidence({listingText:'An inspection states: a pipe is disconnected.'});
 const output={findings:[{id:'one',component:'plumbing',conditionState:'current',indicatorIds:[],description:'The seller reports a disconnected pipe.',evidenceClass:'reported_inspection_finding',evidence:[{kind:'text',sourceId:'listing-1',quote:'a pipe is disconnected.'}],needsProfessionalAssessment:true,followUpQuestion:'Can a plumber verify the connection?'}],unassessedComponents:[]};
 const provider:ModelProvider={modelId:'gemma-4-26b-a4b-it',generate:async()=>({text:JSON.stringify(output),modelVersion:'gemma-4-26b-a4b-it',inputTokens:1,outputTokens:1})};
 const r=await extract(evidence,provider);expect(r.findings[0].evidenceClass).toBe('disclosed_fact');expect(r.metadata.attempts).toBe(1);
});
it('accepts a resolved historical disclosure without requiring the model to invent a question',async()=>{
 const evidence=await prepareEvidence({listingText:'The earlier leak was repaired; the cabinet is dry.'});
 const output={findings:[{id:'one',component:'kitchen',conditionState:'resolved',indicatorIds:[],description:'The seller reports the earlier leak was repaired.',evidenceClass:'disclosed_fact',evidence:[{kind:'text',sourceId:'listing-1',quote:'The earlier leak was repaired; the cabinet is dry.'}],needsProfessionalAssessment:false,followUpQuestion:null}],unassessedComponents:[]};
 const provider:ModelProvider={modelId:'gemma-4-26b-a4b-it',generate:async()=>({text:JSON.stringify(output),modelVersion:'gemma-4-26b-a4b-it',inputTokens:1,outputTokens:1})};
 const r=await extract(evidence,provider);expect(r.findings[0].conditionState).toBe('resolved');expect(r.findings[0].indicatorIds).toEqual([]);expect(r.metadata.attempts).toBe(1);
});
it.each([
 {kind:'text',sourceId:'forged-source',quote:'A pipe is disconnected.'},
 {kind:'image',sourceId:'listing-1'},
 {kind:'report',sourceId:'report-1',page:2,quote:'A pipe is disconnected.'},
])('rejects forged provenance after evidence-class normalization: $kind $sourceId',async(ref)=>{
 const evidence=await prepareEvidence({listingText:'A pipe is disconnected.',reportPages:['A pipe is disconnected.']});
 const output={findings:[{id:'one',component:'plumbing',conditionState:'current',indicatorIds:[],description:'A disconnected pipe is reported.',evidenceClass:'visual_observation',evidence:[ref],needsProfessionalAssessment:true,followUpQuestion:'Can a plumber verify it?'}],unassessedComponents:[]};
 const provider:ModelProvider={modelId:'gemma-4-26b-a4b-it',generate:async()=>({text:JSON.stringify(output),modelVersion:'gemma-4-26b-a4b-it',inputTokens:1,outputTokens:1})};
 await expect(extract(evidence,provider)).rejects.toMatchObject({code:'INVALID_MODEL_OUTPUT'});
});
