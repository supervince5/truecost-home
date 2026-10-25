"use client";
import {useState} from "react";
const areas = [
 {name:'Roof',title:'Start at the top.',detail:'A wide view of the roof and a closer view of any visible wear. Take photos safely from the ground.',clue:'Covering, flashing, and visible sagging',zone:'roof'},
 {name:'Exterior',title:'Look at the shell.',detail:'Include siding, doors, and windows. A wide view gives context that a close-up alone can miss.',clue:'Surface damage, gaps, and staining',zone:'exterior'},
 {name:'Drainage',title:'Follow the water.',detail:'Show gutters, downspout connections, and where water exits near the home.',clue:'Disconnected sections and visible pooling',zone:'drainage'},
 {name:'Kitchen',title:'Look beyond the finishes.',detail:'Photograph the room, sink cabinet, and nearby walls. Styling alone is not a repair problem.',clue:'Visible wear, staining, and disclosed issues',zone:'kitchen'},
 {name:'Bathroom',title:'Give the wet areas a closer look.',detail:'Show the tub or shower edges, floor, ceiling, and sink. Photos cannot confirm hidden moisture.',clue:'Surface cracks and damaged seals',zone:'bathroom'},
 {name:'Systems',title:'Know what keeps it running.',detail:'Include accessible heating equipment and water heater labels. Do not open equipment or electrical covers.',clue:'Reported age and visible condition',zone:'systems'},
 {name:'Foundation',title:'Finish at ground level.',detail:'Show accessible basement walls or the exterior foundation. A photo cannot establish structural soundness.',clue:'Visible cracks, marks, and moisture clues',zone:'foundation'},
];
export function HomeTour(){
 const [active,setActive]=useState(0);const area=areas[active];
 return <section className="home-tour" aria-labelledby="tour-title">
  <div className="tour-heading"><p className="section-label">A MORE COMPLETE PICTURE</p><h2 id="tour-title">One home.<br/><em>Seven places to look.</em></h2><p>Explore the views that help tell its story. Missing a photo? That area stays unknown.</p></div>
  <div className="tour-interactive"><div className="tour-tabs" role="tablist" aria-label="Areas of the home">{areas.map((a,i)=><button key={a.name} id={`area-${i}`} role="tab" aria-selected={active===i} aria-controls="area-panel" tabIndex={active===i?0:-1} onClick={()=>setActive(i)} onKeyDown={e=>{let next=active;if(e.key==='ArrowRight')next=(active+1)%7;else if(e.key==='ArrowLeft')next=(active+6)%7;else if(e.key==='Home')next=0;else if(e.key==='End')next=6;else return;e.preventDefault();setActive(next);document.getElementById(`area-${next}`)?.focus();}}>{a.name}</button>)}</div>
   <div className="tour-panel" id="area-panel" role="tabpanel" aria-labelledby={`area-${active}`}>
    <div className="tour-house" aria-hidden="true"><svg viewBox="0 0 340 265" fill="none"><path d="M30 232H310" stroke="#bac2a4"/><path className={area.zone==='roof'?'zone selected':'zone'} d="m55 105 115-76 115 76H55Z"/><path className={area.zone==='exterior'?'zone selected':'zone'} d="M69 109h202v116H69z"/><path className={area.zone==='foundation'?'zone selected':'zone'} d="M69 225h202v16H69z"/><path className={area.zone==='kitchen'?'zone selected':'zone'} d="M82 166h81v50H82z"/><path className={area.zone==='bathroom'?'zone selected':'zone'} d="M178 122h79v34h-79z"/><path className={area.zone==='systems'?'zone selected':'zone'} d="M196 170h42v46h-42z"/><path className={area.zone==='drainage'?'zone-line selected':'zone-line'} d="M54 112H40v113h-17"/><path d="M86 126h59v27H86zM99 126v27m28-27v27m75 29h30m-30 9h30M90 180h65m-65 15h65" stroke="#869374" strokeWidth="1.5"/><circle className="tour-marker" cx={[170,267,40,120,217,216,170][active]} cy={[60,130,194,188,140,190,233][active]} r="6"/></svg></div>
    <div className="tour-copy" key={area.name}><span className="tour-count">0{active+1} / 07</span><h3>{area.title}</h3><p>{area.detail}</p><span className="tour-clue">Look for: {area.clue}</span></div>
   </div><p className="tour-limit">A photo guide, not an inspection or a market appraisal.</p>
  </div>
 </section>;
}
