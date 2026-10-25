import {test} from 'vitest';
import {writeFile} from 'node:fs/promises';
import {prepareEvidence} from '../src/server/evidence/prepare';
import {createGemmaProvider} from '../src/server/model/gemma';
import {extract} from '../src/server/analysis/extract';
test('demo synthetic disclosure diagnostic',{timeout:90000},async()=>{
 const calls:unknown[]=[];
 const provider=createGemmaProvider({apiKey:process.env.GEMMA_API_KEY!,modelId:process.env.GEMMA_MODEL_ID!},async(input,init)=>{const response=await fetch(input,init);const raw=await response.clone().json();calls.push({status:response.status,response:raw});return response;});
 let result=null,error=null;
 try{result=await extract(await prepareEvidence({listingText:'The seller discloses that the heating system is 20 years old. An inspection states: the downspout is disconnected at the exterior corner. A prior kitchen sink leak was repaired and the cabinet is now dry.',property:{yearBuilt:1985}}),provider);}catch(e){error=e instanceof Error?e.message:'error';}
 await writeFile('benchmarks/results/demo-text-latest.json',JSON.stringify({result,error,calls},null,2));
});
