import { expect, it } from 'vitest';
import sharp from 'sharp';
import { prepareEvidence } from '../../src/server/evidence/prepare';
import { createGemmaProvider } from '../../src/server/model/gemma';
const response=()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"findings":[],"unassessedComponents":[]}'}]},finishReason:'STOP'}]}),{headers:{'Content-Type':'application/json'}});
it('uses deliberate reasoning only when requested for actual photos, keeping a fixed image budgets',async()=>{
 const data=(await sharp({create:{width:8,height:8,channels:3,background:'white'}}).png().toBuffer()).toString('base64');
 const calls: {generationConfig:{thinkingConfig:{thinkingLevel:string}};contents:{parts:unknown[]}[]}[]=[];
 const provider=createGemmaProvider({apiKey:'test',modelId:'gemma-4-26b-a4b-it'},async(_,init)=>{calls.push(JSON.parse(String(init?.body)));return response();});
 for(const input of [{images:[{mimeType:'image/png',data}],photoReviewMode:'deliberate'},{listingText:'No condition was disclosed.',photoReviewMode:'deliberate'},{images:Array.from({length:6},()=>({mimeType:'image/png',data})),photoReviewMode:'standard'}]) await provider.generate(await prepareEvidence(input),{signal:new AbortController().signal,correctiveAttempt:false});
 expect(calls.map(c=>c.generationConfig.thinkingConfig.thinkingLevel)).toEqual(['HIGH','MINIMAL','MINIMAL']);
 expect(calls[0].contents[0].parts).toHaveLength(2);
 expect(calls[2].contents[0].parts).toHaveLength(7);
 await expect(prepareEvidence({images:Array.from({length:2},()=>({mimeType:'image/png',data})),photoReviewMode:'deliberate'})).rejects.toMatchObject({code:'INVALID_INPUT'});
});
