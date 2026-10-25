"use client";
/* eslint-disable @next/next/no-img-element -- local bounded data URLs must not pass through the image optimizer */

import { useEffect, useRef, useState } from "react";
import { calculateOwnership, formatMoney, type RepairPlan } from "../lib/engine/cashflow";
import { makeEvidenceRequest, parseAmount, selectedPlans } from "../lib/workflow";
import { budgetSchema, type Budget } from "../lib/schemas/budget";
import type { ExtractionRequest } from "../lib/schemas/extraction";
import type { extract } from "../server/analysis/extract";
import type { costCatalog, estimateCosts } from "../server/costs/engine";
import fixture from "../../fixtures/monthly-fit-cash-gap.json";
import { Assistance } from "./Assistance";

type Analysis = Awaited<ReturnType<typeof extract>>;
type Catalog = (typeof costCatalog)[number] & {source:{title:string;url:string;checkedAt:string}};
type Estimate = ReturnType<typeof estimateCosts>;
type ImageInput = ExtractionRequest['images'][number];
type Review = "pending" | "kept" | "removed";
type Scope = {catalogId:string;quantity:string;confirmed:boolean;earliestMonth:string;latestMonth:string};
const fields: {key:keyof Budget;label:string;unit?:string}[] = [
 {key:'monthlyHousingBudgetCents',label:'Monthly housing budget'}, {key:'totalPurchaseCashCents',label:'Total purchase cash (including down payment)'},
 {key:'downPaymentCents',label:'Down payment'}, {key:'closingCostsCents',label:'Closing costs paid in cash'}, {key:'protectedSavingsCents',label:'Savings to keep untouched'},
 {key:'annualInterestRatePercent',label:'Annual interest rate',unit:'%'},{key:'loanTermMonths',label:'Loan term',unit:'months'},
 {key:'monthlyPropertyTaxCents',label:'Monthly property tax'},{key:'monthlyInsuranceCents',label:'Monthly home insurance'},
 {key:'monthlyMortgageInsuranceCents',label:'Monthly mortgage insurance (from lender)'},{key:'monthlyHoaCents',label:'Monthly HOA'},
 {key:'monthlyUtilitiesCents',label:'Monthly utilities'},{key:'monthlyMaintenanceCents',label:'Monthly routine upkeep (excluding planned repairs)'},
];
const emptyMoney = () => Object.fromEntries(fields.map(f=>[f.key,''])) as Record<keyof Budget,string>;
const label = (value:string)=>value.replaceAll('_',' ');
function Amount({name,value,onChange,unit='$'}:{name:string;value:string;onChange:(v:string)=>void;unit?:string}) {
 return <label className="field"><span className="field__label">{name} ({unit})</span><input className="input" value={value} onChange={e=>onChange(e.target.value)} inputMode="decimal" placeholder="Unknown" /></label>;
}
async function readPhoto(file:File):Promise<ImageInput> {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose JPG, PNG or WebP photos. For reports, paste the text below.');
 if(file.size > 12*1024*1024) throw new Error('Each original photo must be under 12 MB.');
 const bitmap=await createImageBitmap(file);
 try {
  if(bitmap.width*bitmap.height>24_000_000) throw new Error('Choose a photo under 24 megapixels.');
  const scale=Math.min(1,1568/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas'); canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const context=canvas.getContext('2d');if(!context) throw new Error('This browser cannot prepare the photo.');
  context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/jpeg',.85).split(',')[1];
  if(data.length>1398104) throw new Error('Photo is still too large after preparation. Please use a smaller image.');
  return {mimeType:'image/jpeg',data};
 } finally {bitmap.close();}
}
export function HomeFlow() {
 const [photoReviewMode,setPhotoReviewMode]=useState<'standard'|'deliberate'>('deliberate');
 const [step,setStep]=useState(1),[listing,setListing]=useState(''),[report,setReport]=useState(''),[year,setYear]=useState(''),[price,setPrice]=useState('');
 const [money,setMoney]=useState(emptyMoney),[images,setImages]=useState<ImageInput[]>([]),[analysis,setAnalysis]=useState<Analysis|null>(null);
 const [analyzedEvidence,setAnalyzedEvidence]=useState<{listing:string;report:string;year:string;images:ImageInput[];photoReviewMode:string}|null>(null);
 const evidenceDirty=!!analyzedEvidence && (listing!==analyzedEvidence.listing || report!==analyzedEvidence.report || year!==analyzedEvidence.year || images!==analyzedEvidence.images || photoReviewMode!==analyzedEvidence.photoReviewMode);
 const [busy,setBusy]=useState(false),[preparing,setPreparing]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [reviews,setReviews]=useState<Record<string,Review>>({}),[scopes,setScopes]=useState<Record<string,Scope>>({}),[catalog,setCatalog]=useState<Catalog[]>([]);
 const [region,setRegion]=useState('northern_virginia'),[national,setNational]=useState(false),[estimateState,setEstimateState]=useState<{key:string;value:Estimate}|null>(null),[estimateError,setEstimateError]=useState('');
 const controller=useRef<AbortController|null>(null),requestSequence=useRef(0),photoSequence=useRef(0),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const abort=new AbortController();fetch('/api/estimate',{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>setCatalog(data.scopes)).catch(()=>{if(!abort.signal.aborted)setEstimateError('Cost catalog unavailable. Retry by refreshing before analyzing.');});return()=>abort.abort();},[]);
 useEffect(()=>{heading.current?.focus();},[step]);
 useEffect(()=>()=>{controller.current?.abort();},[]);
 const activeScopes=Object.entries(scopes).filter(([id,s])=>reviews[id]==='kept' && s.confirmed && s.catalogId);
 const estimateKey=JSON.stringify({region,allowNationalFallback:national,items:activeScopes.map(([,s])=>({catalogId:s.catalogId,quantity:s.quantity.trim()?Number(s.quantity):null,scopeConfirmed:s.confirmed}))});
 useEffect(()=>{
  const input=JSON.parse(estimateKey); if(!input.items.length)return;
  const abort=new AbortController(); const timer=setTimeout(()=>{
   setEstimateError('');fetch('/api/estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:estimateKey,signal:abort.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error?.message??'Estimate unavailable');return data;}).then(value=>setEstimateState({key:estimateKey,value})).catch(e=>{if(!abort.signal.aborted)setEstimateError(e.message);});
  },150);return()=>{clearTimeout(timer);abort.abort();};
 },[estimateKey]);
 const estimate=estimateState?.key===estimateKey?estimateState.value:null;
 const unresolved:string[]=[];
 if(!analysis)unresolved.push('Analyze the home evidence');
 if(analysis?.unassessedComponents.length)unresolved.push(`${analysis.unassessedComponents.length} components have no current finding; their repair costs remain unknown`);
 for(const f of analysis?.findings??[]) {
  if(reviews[f.id]==='pending')unresolved.push(`Review: ${f.description}`);
  if(reviews[f.id]==='kept' && f.conditionState==='current' && !scopes[f.id]?.confirmed)unresolved.push(`Confirm a repair scope or obtain a quote: ${label(f.component)}`);
 }
 const plans=selectedPlans(activeScopes.map(([id,s]):RepairPlan & {confirmed:boolean}=>{
  const line=estimate?.lines.find(l=>l.catalogId===s.catalogId);
  return {id,confirmed:s.confirmed,lowCents:line?.lowCents??null,highCents:line?.highCents??null,earliestMonth:s.earliestMonth.trim()?Number(s.earliestMonth):NaN,latestMonth:s.latestMonth.trim()?Number(s.latestMonth):NaN};
 }));
 let result:ReturnType<typeof calculateOwnership>|null=null,mathError='';
 try {
  const budget=budgetSchema.parse(Object.fromEntries(fields.map(f=>[f.key,f.unit?(money[f.key].trim()?Number(money[f.key]):null):parseAmount(money[f.key])])));
  result=calculateOwnership({priceCents:parseAmount(price),budget,repairs:plans,unresolved:unresolved.slice(0,50)});
 } catch {mathError='Check amounts and repair months. Use nonnegative numbers; down payment cannot exceed price, and repair months must run from 0 to 60 in order.';}
 function loadExample() {
  setNotice('Illustrative household and property facts loaded. Analysis will still make a live Gemma call. These are not a current listing or a loan quote.');
  setListing('The seller discloses that the heating system is 20 years old. An inspection states: the downspout is disconnected at the exterior corner. A prior kitchen sink leak was repaired and the cabinet is now dry.');
  setReport('');setImages([]);setPrice('180000');setYear('1985');setMoney(Object.fromEntries(fields.map(f=>[f.key,String(f.unit?fixture.input.budget[f.key]:fixture.input.budget[f.key]/100)])) as Record<keyof Budget,string>);
 }
 async function analyze() {
  setError('');const sequence=++requestSequence.current;controller.current?.abort();controller.current=new AbortController();
  try {
   if(photoReviewMode==='deliberate' && images.length>1) throw new Error('Deliberate review supports one photo at a time. Choose standard mode for up to six, or select a single photo.');
   const payload={...makeEvidenceRequest({listing,report,yearBuilt:year,images}),photoReviewMode};
   setBusy(true);
   const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.current.signal});
   const value=await r.json();if(!r.ok)throw new Error(value.error?.message??'Analysis failed. Please retry.');
   if(sequence!==requestSequence.current)return;
   setAnalyzedEvidence({listing,report,year,images,photoReviewMode});setAnalysis(value);setReviews(Object.fromEntries(value.findings.map((f:{id:string})=>[f.id,'pending'])));setScopes({});setEstimateState(null);setStep(2);
  }catch(e){if(sequence===requestSequence.current)setError(e instanceof Error && e.name==='AbortError'?'Analysis cancelled.':e instanceof Error?e.message:'Analysis failed.');}
  finally{if(sequence===requestSequence.current)setBusy(false);}
 }
 async function upload(files:FileList|null) {
  if(!files)return;const sequence=++photoSequence.current;setError('');setPreparing(true);
  try{if(files.length>6)throw new Error('Choose up to six photos.');const prepared=await Promise.all(Array.from(files).map(readPhoto));if(sequence===photoSequence.current)setImages(prepared);}
  catch(e){if(sequence===photoSequence.current)setError(e instanceof Error?e.message:'Could not read photos.');}
  finally{if(sequence===photoSequence.current)setPreparing(false);}
 }
 function reset() {requestSequence.current++;photoSequence.current++;controller.current?.abort();setBusy(false);setPreparing(false);setAnalysis(null);setAnalyzedEvidence(null);setImages([]);setListing('');setReport('');setYear('');setPrice('');setMoney(emptyMoney());setReviews({});setScopes({});setEstimateState(null);setError('');setNotice('Local analysis cleared. This does not erase records retained by the model provider.');setStep(1);}
 function updateScope(id:string,patch:Partial<Scope>) {setScopes(prev=>({...prev,[id]:{...(prev[id]??{catalogId:'',quantity:'1',confirmed:false,earliestMonth:'0',latestMonth:'12'}),...patch}}));}
 return <>
  <a className="skip-link" href="#main-content">Skip to main content</a>
  <header className="app-header"><div className="app-header__inner"><span className="brand"><svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 14 16 5l11 9v13H5V14Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 27V17h8v10M11 12h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>TrueCost<span className="brand-light">Home</span></span><nav aria-label="Analysis steps" className="flow-actions flow-tabs">{['Home & budget','Review & results','Next steps'].map((s,i)=><button className="btn" key={s} aria-current={step===i+1?'step':undefined} disabled={busy || (i>0&&!analysis)} onClick={()=>setStep(i+1)}><span className="step-number">{i+1}</span>{s}</button>)}</nav><span className="header-note"><span className="status-light" aria-hidden="true"/>A little more clarity.</span></div></header>
  <main id="main-content" key={step} className="page flow-stack screen-enter">
   <div className="intro-layout"><div><h1 ref={heading} tabIndex={-1} className="h1">{step===1?<>A clearer picture.<br/><span>Before you buy.</span></>:step===2?<>The details matter.<br/><span>Let’s look closer.</span></>:<>Your next move.<br/><span>A little more informed.</span></>}</h1><p className="lead">{step===1?'Look beyond the listing price. Understand visible concerns, plan for repairs, and see what owning a home could mean for your budget.':step===2?'Your evidence, your assumptions, your decision. Review what Gemma found before adding a repair scenario.':'Turn your findings into useful questions for an inspector, lender, or housing counselor.'}</p></div><div className="intro-aside"><p>{step===1?'A home is a big decision.':step===2?'Clarity starts with evidence.':'Good questions open doors.'}</p><span>{step===1?'Start with what you know. We’ll keep the unknowns visible.':step===2?'An observation is a starting point, not a diagnosis.': 'No promised funding. Just sourced routes to explore.'}</span><div className="palette-line" aria-hidden="true"><i/><i/><i/><i/><i/></div></div></div>
   {notice&&<p className="flow-note" role="status">{notice}</p>}{error&&<p className="flow-error" role="alert">{error}</p>}
   {step===3&&evidenceDirty&&<p className="flow-error">Home evidence has changed. These questions refer to the previous analysis; analyze again to update them.</p>}
   {step===1&&<>
    <div className="example-bar"><span>Just exploring? Try an illustrative household.</span><button className="btn btn--small" disabled={busy||preparing} onClick={loadExample}>Load an example <span aria-hidden="true">↗</span></button></div>
    <div className="intake"><section className="card intake__home flow-stack"><div className="section-heading"><div><h2>Start with the home.</h2><p className="fineprint">A few details help put the picture together.</p></div><svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 10 9-7 9 7v11H3V10Z" stroke="currentColor" strokeWidth="1.5"/><path d="M9 21v-8h6v8" stroke="currentColor" strokeWidth="1.5"/></svg></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
     <Amount name="Purchase price" value={price} onChange={setPrice}/><label className="field"><span className="field__label">Year built (optional)</span><input className="input" value={year} onChange={e=>setYear(e.target.value)} inputMode="numeric" placeholder="Unknown"/></label></div>
     <label className="field"><span className="field__label">Listing or disclosure text</span><textarea className="textarea" rows={3} maxLength={16000} value={listing} onChange={e=>setListing(e.target.value)} placeholder="Paste the actual description. Listing links are not fetched."/></label>
     <label className="dropzone"><span className="upload-symbol"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span><strong>{preparing?'Preparing photos…':'Bring the details into focus'}</strong><span className="fineprint">{photoReviewMode==='deliberate'?'One photo for deliberate review.':'Up to six photos for standard review.'} JPG, PNG or WebP; metadata removed.</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy||preparing} aria-label="Choose property photos" onChange={e=>void upload(e.target.files)}/></label>
     <div className="flow-actions">{images.map((im,i)=><figure key={i} style={{margin:0}}><img className="flow-preview" src={`data:${im.mimeType};base64,${im.data}`} alt={`Selected property photo ${i+1}`}/><figcaption className="fineprint">Photo {i+1}</figcaption></figure>)}{images.length>0&&<button className="btn" onClick={()=>setImages([])} disabled={busy}>Remove photos</button>}</div>
     <label className="field"><span className="field__label">Photo analysis mode</span><select className="input" value={photoReviewMode} onChange={e=>setPhotoReviewMode(e.target.value as 'standard'|'deliberate')}><option value="deliberate">Deliberate Gemma review (slower)</option><option value="standard">Standard Gemma review (faster)</option></select><span className="field__hint">Deliberate reasoning found more visible concerns in development tests, but also produced false positives. Review every observation. Neither mode establishes concealed defects.</span></label>
     <details><summary>Have an inspection report?</summary><p className="fineprint">Paste report text. PDF upload and scanned-report OCR are not supported in this demo.</p><label className="field"><span className="field__label">Inspection report text</span><textarea className="textarea" rows={6} value={report} maxLength={16000} onChange={e=>setReport(e.target.value)}/></label></details>
     <p className="fineprint">Evidence is sent to Google for Gemma processing. This app does not persist your analysis to a database; it remains in this tab until cleared or reloaded. Provider retention policies still apply. Only upload material you have permission to use.</p>
    </section><section className="card intake__money"><div className="section-heading"><div><h2>Make room for real life.</h2><p className="fineprint">Your budget, beyond the mortgage.</p></div></div><p className="privacy-note"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6"/></svg>These numbers stay in your browser.</p><p className="field__hint budget-hint">Leave unknowns blank. Enter 0 only when a cost does not apply.</p>{fields.slice(0,2).map(f=><Amount key={f.key} name={f.label} unit={f.unit} value={money[f.key]} onChange={v=>setMoney(m=>({...m,[f.key]:v}))}/>)}<details className="budget-section" open><summary>Cash at closing</summary><div className="disclosure-content">{fields.slice(2,5).map(f=><Amount key={f.key} name={f.label} unit={f.unit} value={money[f.key]} onChange={v=>setMoney(m=>({...m,[f.key]:v}))}/>)}</div></details><details className="budget-section"><summary>Loan & monthly expenses</summary><div className="disclosure-content">{fields.slice(5).map(f=><Amount key={f.key} name={f.label} unit={f.unit} value={money[f.key]} onChange={v=>setMoney(m=>({...m,[f.key]:v}))}/>)}</div></details><p className="fineprint">Never sent to Gemma. Blank costs will remain unknown in your results.</p></section></div>
    <div className="footer-row"><p className="fineprint">Photos reveal visible clues, not hidden defects or a complete inspection.</p><div className="flow-actions"><button className="btn btn--primary" disabled={busy||preparing} onClick={()=>void analyze()}>{busy?'Gemma is examining the evidence…':'Analyze this home →'}</button>{busy&&<button className="btn" onClick={()=>controller.current?.abort()}>Cancel</button>}</div></div>
    {busy&&<p role="status">Reading evidence and checking source references. A photo request has a bounded deadline; a failure will be shown rather than replaced with a sample.</p>}
   </>}
   {step===2 && analysis && <>
    {evidenceDirty&&<p className="flow-error" role="status">The home evidence has changed. These results still refer to the previous submitted evidence shown below. Return to Home & budget and analyze again to update them.</p>}
    <p className="flow-note">Live result · {analysis.metadata.modelId} · {analysis.metadata.photoReviewMode} mode · {(analysis.metadata.latencyMs/1000).toFixed(1)} seconds · {analysis.metadata.totalTokens??'Unknown'} total tokens. Budget edits below do not call Gemma again.</p>
    <div className="flow-findings"><div className="flow-stack">
     {!analysis.findings.length&&<section className="card"><h2>No supported findings returned</h2><p>This does not establish that the home is defect-free. Add better views or inspection text to investigate the unassessed components.</p><button className="btn" onClick={()=>setStep(1)}>Add evidence</button></section>}
     {analysis.findings.map(f=>{
      const cards=analysis.conditionReview.cards.filter(c=>c.findingId===f.id);const scope=scopes[f.id];const sourceIds=new Set(f.evidence.filter(e=>e.kind==='image').map(e=>e.sourceId));
      const options=catalog.filter(c=>c.components.includes(f.component)||cards.some(card=>card.costCatalogIds.includes(c.id)));
      const cost=estimate?.lines.find(l=>l.catalogId===scope?.catalogId);
      return <article className="card flow-stack" key={f.id} style={reviews[f.id]==='removed'?{opacity:.7}:undefined}>
       <div><p className="finding-context">{label(f.component)} <span>· {f.conditionState}</span></p><h2 style={{fontSize:19}}>{f.description}</h2><span className="badge">{label(f.evidenceClass)}</span></div>
       {(analyzedEvidence?.images??[]).map((im,i)=>sourceIds.has(`photo-${i+1}`)?<figure key={i} style={{margin:0}}><img className="flow-photo" src={`data:${im.mimeType};base64,${im.data}`} alt={`Photo ${i+1}, cited for this observation`}/><figcaption>Photo {i+1}</figcaption></figure>:null)}
       {f.evidence.map((e,i)=><p key={i} className="fineprint">{e.kind!=='image'?<>{e.sourceId}{e.kind==='report'?` · page ${e.page}`:''}: “{e.quote}”</>:e.sourceId}</p>)}
       <p className="fineprint">Ask an inspector: {f.followUpQuestion}</p>
       {cards.map(c=><details key={c.indicatorId}><summary>What to verify · {label(c.priority)}</summary><p>{c.verification}</p><p>Other explanations: {c.alternativeExplanations}</p>{c.sources.map(s=><p key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.publisher}: {s.title}</a></p>)}</details>)}
       <div className="flow-actions"><button className="btn" aria-pressed={reviews[f.id]==='kept'} onClick={()=>setReviews(r=>({...r,[f.id]:'kept'}))}>Keep observation</button><button className="btn" aria-pressed={reviews[f.id]==='removed'} onClick={()=>setReviews(r=>({...r,[f.id]:'removed'}))}>Remove / already fixed</button><span className="fineprint">{reviews[f.id]==='pending'?'Needs your review':reviews[f.id]==='kept'?'Kept for planning; not a confirmed diagnosis':'Excluded from repair planning'}</span></div>
       {reviews[f.id]==='kept'&&f.conditionState==='current'&&<div className="flow-stack"><label className="field"><span className="field__label">A possible scope to investigate</span><select className="input" value={scope?.catalogId??''} onChange={e=>updateScope(f.id,{catalogId:e.target.value,confirmed:false})}><option value="">Needs a diagnosis / professional quote</option>{options.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        {scope?.catalogId&&<><p className="fineprint">{catalog.find(c=>c.id===scope.catalogId)?.assumptions}</p><label className="field"><span className="field__label">Quantity ({catalog.find(c=>c.id===scope.catalogId)?.unit.replaceAll('_',' ')})</span><input className="input" type="number" min="1" max="10000" value={scope.quantity} onChange={e=>updateScope(f.id,{quantity:e.target.value,confirmed:false})}/></label><div className="flow-grid"><label>Earliest month (0 = closing)<input className="input" type="number" min="0" max="60" value={scope.earliestMonth} onChange={e=>updateScope(f.id,{earliestMonth:e.target.value})}/></label><label>Latest month<input className="input" type="number" min="0" max="60" value={scope.latestMonth} onChange={e=>updateScope(f.id,{latestMonth:e.target.value})}/></label></div><label><input type="checkbox" checked={scope.confirmed} onChange={e=>updateScope(f.id,{confirmed:e.target.checked})}/> I understand this scope and quantity, and want to model this conditional scenario.</label>
         {scope.confirmed&&<div className="flow-note">{cost?cost.status==='planning_range'?<><strong>{formatMoney(cost.lowCents)}–{formatMoney(cost.highCents)}</strong><p>{label(cost.geography??'unknown')} published planning range</p><p className="fineprint">Excludes: {cost.exclusions}</p>{cost.source&&<a href={cost.source.url} target="_blank" rel="noreferrer">{cost.source.title} · checked {cost.source.checkedAt}</a>}</>:<p>Price unknown: {label(cost.status)}.</p>:<p>Waiting for sourced estimate…</p>}</div>}
        </>}
       </div>}
      </article>;
     })}
     <section className="card"><h2>Not assessed by this evidence</h2><p>{analysis.unassessedComponents.map(label).join(', ')}.</p><p className="fineprint">A finding is not a complete component inspection. Hidden damage, operation, and material composition may require on-site assessment or tests.</p></section>
    </div><aside className="flow-stack"><section className="card flow-stack"><h2>Your planning result</h2><label>Cost geography<select className="input" value={region} onChange={e=>setRegion(e.target.value)}><option value="northern_virginia">Northern Virginia</option><option value="maryland">Maryland</option><option value="dc">Washington, DC</option><option value="other_us">Other U.S.</option></select></label><label><input type="checkbox" checked={national} onChange={e=>setNational(e.target.checked)}/> Allow clearly labeled U.S. national prices where local data is unavailable.</label>
     {estimateError&&<p className="flow-error" role="alert">{estimateError} Select one scope per component; compare alternatives separately.</p>}
     {mathError&&<p role="alert" className="flow-error">{mathError}</p>}
     {result&&<><p className="flow-note">{result.status==='needs_information'?'More information is needed for an affordability conclusion.':result.status==='within_stated_budget'?'Selected scenarios fit the stated budget under these assumptions.':'The selected plan shows a budget or cash shortfall.'}</p><div><p className="section-label">Monthly recurring ownership</p><p className="result-card__value">{formatMoney(result.monthlyOwnershipCents)}</p><p className="fineprint">Before repair savings. Mortgage, taxes, insurance, HOA, utilities and routine upkeep.</p></div><div><p className="section-label">Available for repairs each month</p><p className="result-card__value">{formatMoney(result.availableMonthlyRepairContributionCents)}</p><p className="fineprint">Stated housing budget minus recurring ownership costs.</p></div><p>Cash after closing and protected savings: <strong>{formatMoney(result.cashAfterClosingCents)}</strong></p>
      {result.flags.filter(f=>f!=='missing_information').map(f=><p className="flow-error" key={f}>{label(f)}</p>)}
      <details open><summary>Change the budget — no new AI call</summary><Amount name="Purchase cash" value={money.totalPurchaseCashCents} onChange={v=>setMoney(m=>({...m,totalPurchaseCashCents:v}))}/><Amount name="Monthly housing budget" value={money.monthlyHousingBudgetCents} onChange={v=>setMoney(m=>({...m,monthlyHousingBudgetCents:v}))}/><button className="btn" onClick={()=>setStep(1)}>Edit all assumptions</button></details>
      <details><summary>{result.missingInputs.length} unresolved inputs</summary><ul>{result.missingInputs.map((s,i)=><li key={i}>{label(s)}</li>)}</ul></details>
     </>}
    </section><button className="btn btn--primary" onClick={()=>setStep(3)}>Questions & assistance →</button></aside></div>
    {result&&<section className="card flow-stack"><h2>Five-year cash timing</h2><p className="fineprint">Three adjustable planning assumptions, not probabilities or predicted failure dates. Month 0 is closing. Values cover selected, priced scopes only; unknown work is excluded. Future savings cannot pay a bill due at closing.</p><div className="flow-table-wrap"><table className="flow-table"><thead><tr><th>Scenario</th><th>Immediate gap</th><th>First shortfall</th><th>Monthly repair savings needed*</th><th>Balance at month 60</th></tr></thead><tbody>{result.scenarios.map(s=><tr key={s.name}><th>{label(s.name)}{s.knownCostsOnly?' · partial':''}</th><td>{formatMoney(s.immediateCashGapCents)}</td><td>{s.firstShortfallMonth===null?(result.availableMonthlyRepairContributionCents===null?'Unknown':'None in priced scopes'):`Month ${s.firstShortfallMonth}`}</td><td>{formatMoney(s.requiredMonthlyRepairContributionCents)}</td><td>{formatMoney(s.endingBalanceCents)}</td></tr>)}</tbody></table></div><p className="fineprint">*This amount addresses timing in the priced scenario. Any immediate gap must be funded separately. No assistance or resale gains are assumed.</p><details><summary>Central scenario monthly ledger</summary><div className="flow-table-wrap"><table className="flow-table"><thead><tr><th>Month</th><th>Planned repair bill</th><th>Remaining repair cash</th></tr></thead><tbody>{result.scenarios[1].timeline.map(t=><tr key={t.month}><td>{t.month}</td><td>{formatMoney(t.repairCents)}</td><td>{formatMoney(t.balanceCents)}</td></tr>)}</tbody></table></div></details></section>}
   </>}
   {step===3 && analysis && <><section className="card"><h2>Questions worth asking before an offer</h2><ul>{analysis.findings.filter(f=>reviews[f.id]!=='removed').map(f=><li key={f.id}>{label(f.component)}: {f.followUpQuestion}</li>)}<li>Which systems and concealed areas were not assessed?</li><li>What work is urgent, what is the scope, and can I get an itemized local quote?</li><li>Which costs are due at closing, and which can be planned later?</li></ul></section><Assistance region={region}/><div className="flow-actions"><button className="btn" onClick={()=>setStep(2)}>Back to evidence & budget</button><button className="btn" onClick={()=>window.print()}>Print next steps</button></div></>}
   <footer className="footer-row"><p className="fineprint">Planning support, not an inspection, appraisal, or loan decision. No accounts or database storage in this demo.</p><button className="btn" disabled={busy} onClick={reset}>Clear this analysis</button></footer>
  </main>
 </>;
}
