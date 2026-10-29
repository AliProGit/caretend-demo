// Builds index.html = CareTend-Interactive-Demo-Journey.html + full-demo auto-play director.
// Usage: node tools/add-autoplay.mjs <source.html> <out.html> [<out2.html>]
import fs from "node:fs";

const [src, out, out2] = process.argv.slice(2);
let h = fs.readFileSync(src, "utf8");
const must = (needle) => { if (!h.includes(needle)) throw new Error("anchor not found: " + needle.slice(0, 60)); };

// 1. Journey "Auto-play" button: apply the fix itself instead of stalling on an amber stop.
const oldAuto = `else{J.auto=setInterval(()=>{const g=jstages();if(J.i<4&&g[J.i]!=='flag'){J.i++;jrender();}else{jstop();jrender();}},2600);jrender();}`;
must(oldAuto);
h = h.replace(oldAuto,
  `else{J.auto=setInterval(()=>{const g=jstages();
      if(g[J.i]==='flag'){const f=document.querySelector('[data-jfix]');if(f){apClick(f.getAttribute('data-jfix')==='ndc'?'[data-jfix="ndc"]':'[data-jfix="'+f.getAttribute('data-jfix')+'"]');}else{jstop();jrender();}}
      else if(J.i<4){J.i++;jrender();}
      else{jstop();jrender();}
    },2600/(AP.on?AP.speed:1));jrender();}`);

// 2. CSS
const css = `
/* ===== Full demo auto-play ===== */
#ap-play{background:var(--teal);color:var(--on-teal);border:0;border-radius:10px;padding:8px 14px;font-weight:700;display:flex;align-items:center;gap:8px}
#ap-play svg{width:14px;height:14px}
#player{position:fixed;left:0;right:0;bottom:0;z-index:50;background:var(--ink);color:var(--bg);display:none;align-items:center;gap:14px;padding:10px 18px 12px;box-shadow:0 -4px 18px rgba(0,0,0,.25)}
#player.on{display:flex;flex-wrap:wrap}
#player .pbtn{background:transparent;color:var(--bg);border:1px solid rgba(255,255,255,.35);border-radius:8px;padding:6px 12px;font-weight:600}
#player .pbtn.primary{background:var(--teal);border-color:var(--teal);color:var(--on-teal)}
#player .pbtn[aria-pressed="true"]{background:rgba(255,255,255,.18)}
#player .cap{flex:1 1 320px;min-width:200px;font-size:15px;line-height:1.35}
#player .cap small{display:block;color:rgba(255,255,255,.65);font-size:12px;margin-top:2px}
#player .bar{position:absolute;left:0;top:0;height:3px;background:rgba(255,255,255,.18);width:100%}
#player .bar i{display:block;height:100%;background:var(--teal);width:0;transition:width .4s}
#player.on ~ #toast{bottom:84px}
body.ap-on{padding-bottom:76px}
.spot{outline:3px solid var(--amber)!important;outline-offset:3px;border-radius:8px;animation:ap-pulse .8s ease-in-out 2}
@keyframes ap-pulse{0%,100%{box-shadow:0 0 0 0 rgba(240,179,90,.0)}50%{box-shadow:0 0 0 10px rgba(240,179,90,.45)}}
@media (prefers-reduced-motion:reduce){.spot{animation:none}}
#aplog{display:none}
</style>`;
must("</style>");
h = h.replace("</style>", css);

// 3. Header button + player bar markup
const modesAnchor = `<div class="modes" role="group" aria-label="Demo mode">`;
must(modesAnchor);
h = h.replace(modesAnchor,
  `<button id="ap-play" type="button" aria-label="Play the full demo"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>Play full demo</button>\n  ` + modesAnchor);
const toastAnchor = `<div id="toast" role="status" aria-live="polite"></div>`;
must(toastAnchor);
h = h.replace(toastAnchor,
  `<div id="player" role="region" aria-label="Demo player"><div class="bar"><i id="ap-bar"></i></div>
  <button class="pbtn primary" id="ap-toggle" type="button">Pause</button>
  <button class="pbtn" id="ap-speed" type="button" aria-pressed="false" title="Toggle speed">1x</button>
  <button class="pbtn" id="ap-stop" type="button">Stop</button>
  <div class="cap"><span id="ap-cap">Starting the demo…</span><small id="ap-sub"></small></div>
</div>
<pre id="aplog"></pre>
` + toastAnchor);

// 4. Director
const director = `
/* ===== Full demo auto-play (director) ===== */
const AP={on:false,paused:false,speed:1,i:0,timer:null,synthetic:false,steps:[],hit:new Set()};
const APQ=new URLSearchParams(location.search);
function apLog(m){const el=$('#aplog');if(el){el.textContent+=m+'\\n';}}
function apSpot(el){if(!el)return;document.querySelectorAll('.spot').forEach(x=>x.classList.remove('spot'));el.classList.add('spot');try{el.scrollIntoView({block:'center',behavior:AP.speed>4?'auto':'smooth'});}catch(e){}}
function apClick(sel){const el=typeof sel==='string'?document.querySelector(sel):sel;if(!el){apLog('MISSING '+sel);return false;}AP.hit.add(typeof sel==='string'?sel:'#'+el.id);apSpot(el);AP.synthetic=true;try{el.click();}finally{AP.synthetic=false;}return true;}
function apStep(cap,run,ms,sub){return {cap,run,ms:ms||2600,sub:sub||''};}
function apJourney(k,opt){
  opt=opt||{};const s=[];const lbl=SCN[k].label;
  s.push(apStep("Patient journey: "+lbl,()=>apClick('[data-scn="'+k+'"]'),2600,SCN[k].blurb));
  if(opt.auto){
    s.push(apStep("Journey Auto-play button",()=>apClick('[data-jnav="auto"]'),2600*6+800,"The journey plays itself: one stop every 2.6 seconds. On an amber stop Priya applies the fix and it continues."));
    s.push(apStep(()=>jtext(J.i,jstages()).h,()=>{if(J.auto){jstop();jrender();}return J.i===4?undefined:"skip";},2200,()=>jtext(J.i,jstages()).tech));
  }else{
    for(let n=0;n<7;n++){
      s.push(apStep(()=>jtext(J.i,jstages()).h,()=>{
        const stg=jstages();
        if(stg[J.i]==="flag"){
          const f=J.i===2?'[data-jfix="ndc"]':'[data-jfix="twin:A2"]';
          apClick(f);return J.i===2?"Priya adds NDC 55555-5555-55 to Fennec Hears and presses Reprocess.":"Priya picks Twin CareTendTest from Dayton. Manual matches are never overridden.";
        }
        if(J.i<4){apClick('[data-jnav="next"]');return;}
        return "skip";
      },2800,()=>jtext(J.i,jstages()).tech));
    }
  }
  if(opt.back){
    s.push(apStep("Back one stop",()=>apClick('[data-jnav="back"]'),2400,"Back and Next step let a presenter linger on any stop."));
    s.push(apStep(()=>jtext(J.i,jstages()).h,()=>apClick('[data-jnav="next"]'),2400,()=>jtext(J.i,jstages()).tech));
  }
  s.push(apStep("End of "+lbl,()=>{},1800,SCN[k].on?"Sophie, the case manager, sees the prescription on the patient page.":"Production today: Sophie sees nothing."));
  if(opt.replay){
    s.push(apStep("Replay this journey",()=>apClick('[data-jnav="replay"]'),2400,"Replay starts the same scenario again from the pharmacy."));
  }
  if(opt.switchOn){
    s.push(apStep("Switch on and replay",()=>apClick('.sect [data-scn="good"]'),2600,"The before-and-after comparison: same prescription, new build, Sophie sees it."));
    for(let n=0;n<4;n++) s.push(apStep(()=>jtext(J.i,jstages()).h,()=>{if(J.i<4){apClick('[data-jnav="next"]');return;}return "skip";},1600,()=>jtext(J.i,jstages()).tech));
  }
  return s;
}
function apSandbox(){
  const s=[];const NL=String.fromCharCode(10);
  const rowId=rx=>{const r=S.rows.find(x=>x.rx===rx);return r?r.id:null;};
  const openRx=rx=>{const id=rowId(rx);return id?apClick('tr[data-open="'+id+'"]'):false;};
  s.push(apStep("Hands-on sandbox",()=>apClick("#m-box"),2400,"The same engine, driven by hand. Left: the six-step script. Right: the tabs an Ops user would work in."));
  // Step 1
  s.push(apStep("Step 1. Today's problem",()=>apClick('[data-step="0"]'),3200,"All prescriptions: 33 legacy rows, no program, no patient, Requires Review ticked and no reason."));
  s.push(apStep("Open a legacy row",()=>apClick('#view tr[data-open]'),3000,"EHR Medication Prescription with nothing sent: NDC missing, Unknown Program, no patient. Match Patient is disabled for legacy rows."));
  s.push(apStep("Review tab is empty",()=>apClick('[data-tab="review"]'),2400,"Review lists only rows the new build flagged. Legacy rows never appear here."));
  // Step 2
  s.push(apStep("Step 2. A good day",()=>apClick('[data-step="1"]'),1800,"CareTend feed: each button plays what MuleSoft does every 30 minutes."));
  s.push(apStep("MuleSoft lands RX-E2E-1",()=>apClick('[data-send="daniel1"]'),3000,"Filed under Fennec Hears, patient found by demographics, CareTend id learned."));
  s.push(apStep("Open the row",()=>apClick("[data-open-last]"),3000,"Program, patient, match method and the CareTend patient id on one record."));
  s.push(apStep("Daniel's patient page",()=>{apClick('[data-tab="patients"]');apClick('[data-patient="A1"]');},3400,"The Account now carries CareTend id CT-77120 and lists the prescription."));
  s.push(apStep("Same prescription sent again",()=>{apClick('[data-tab="feed"]');apClick('[data-send="daniel1"]');},3000,"Re-sent RX-E2E-1: same prescription id, so it updates the same row. No duplicates."));
  // Step 3
  s.push(apStep("Step 3. Something it could not do",()=>apClick('[data-step="2"]'),1800,"Send RX-E2E-2 with an NDC no program lists."));
  s.push(apStep("MuleSoft lands RX-E2E-2",()=>apClick('[data-send="daniel2"]'),3000,"Not filed: NDC not mapped to a program. Patient found by CareTend id."));
  s.push(apStep("CareTend Review shows the reason",()=>apClick("[data-open-last]"),3000,"Rows Salesforce could not place, each with a reason. Review count is shown on the tab."));
  s.push(apStep("Programs tab",()=>apClick('[data-tab="programs"]'),2600,"Ops maintain the NDC list on each Program: Fennec Hears, DefenCath, Invivyd."));
  s.push(apStep("Add the NDC to Fennec Hears",()=>{const ta=document.getElementById("n-P1");if(ta){ta.value=ta.value.trim()+NL+"55555-5555-55";apSpot(ta);}},2600,"Any printed NDC format works, one per line."));
  s.push(apStep("Save program",()=>apClick('[data-save="P1"]'),2200,"Program saved. Now Reprocess the flagged row."));
  s.push(apStep("Reprocess RX-E2E-2",()=>{apClick('[data-tab="review"]');openRx("RX-E2E-2");apClick('[data-act="reprocess"]');},3400,"Filed under Fennec Hears. Requires review cleared, row leaves the Review list."));
  // Step 4
  s.push(apStep("Step 4. Two look-alike patients",()=>apClick('[data-step="3"]'),1800,"Send the Twin row."));
  s.push(apStep("MuleSoft lands RX-TWIN-1",()=>apClick('[data-send="twin"]'),3000,"Filed under Fennec Hears, but two patients share name and birth date."));
  s.push(apStep("Match Patient",()=>{apClick("[data-open-last]");apClick('[data-act="pick"]');},3000,"A coordinator chooses. Salesforce never guesses between two people."));
  s.push(apStep("Pick Twin CareTendTest, Dayton",()=>apClick('[data-pick="A2"]'),3000,"Match method Manual. The CareTend id is learned on that Account."));
  s.push(apStep("Twin from Dayton",()=>{apClick('[data-tab="patients"]');apClick('[data-patient="A2"]');},3000,"CareTend id CT-88231 learned, prescription listed."));
  s.push(apStep("Twin from Toledo",()=>apClick('[data-patient="A3"]'),2600,"Untouched: no CareTend id, no prescriptions. Nothing leaked to the wrong twin."));
  // Extra scenarios
  s.push(apStep("A patient who does not exist",()=>{apClick('[data-tab="feed"]');apClick('[data-send="nobody"]');},3000,"RX-NOPT-1: filed under Fennec Hears, but no patient with that name and birth date."));
  s.push(apStep("Match Patient chooser",()=>{apClick("[data-open-last]");apClick('[data-act="pick"]');},2800,"Every patient is offered. Nora is not one of them, so the coordinator closes the chooser and the row stays in Review."));
  s.push(apStep("Close the chooser",()=>apClick('[data-act="pick"]'),1800,"The row waits in Review until the patient is created or the prescription is corrected."));
  // Step 5
  s.push(apStep("Step 5. Guard rails",()=>apClick('[data-step="4"]'),1800,"Turn the switch OFF and send a row."));
  s.push(apStep("Switch OFF",()=>apClick("#sw"),2200,"PRO_Automation_Control.CareTend_Prescription = OFF"));
  s.push(apStep("MuleSoft lands RX-BARE-1",()=>apClick('[data-send="bare"]'),3000,"With the switch OFF the row lands exactly as sent: Unknown Program, no patient, Requires Review, no reason."));
  s.push(apStep("Reprocess while OFF",()=>{apClick("[data-open-last]");apClick('[data-act="reprocess"]');},2600,"Reprocess changes nothing while the switch is OFF."));
  s.push(apStep("Switch ON again",()=>apClick("#sw"),2000,"Back to normal operation."));
  s.push(apStep("Reprocess RX-BARE-1",()=>apClick('[data-act="reprocess"]'),3000,"Now processed: NDC 7299010310 has ten bare digits, so it is not recognised. Patient still found by CareTend id. Stays in Review with the reason."));
  s.push(apStep("Review list",()=>apClick('[data-tab="review"]'),2800,"Two rows waiting: RX-NOPT-1 (no patient) and RX-BARE-1 (NDC not recognised)."));
  s.push(apStep("All prescriptions",()=>apClick('[data-tab="all"]'),2800,"Counters drop as rows are filed and matched. Legacy rows stay as they are."));
  // Step 6
  s.push(apStep("Step 6. What is left before switch-on",()=>apClick('[data-step="5"]'),5000,"Roles, review owner, Beren NDCs, UAT feed, MuleSoft changes."));
  s.push(apStep("Reset demo data",()=>{apSummary();apClick("#reset");},2600,"Reset returns the sandbox to the 33 legacy rows."));
  s.push(apStep("Back to the patient journey",()=>apClick("#m-story"),2000,"Both modes are always one click away."));
  s.push(apStep("Demo complete",()=>{},4000,"Press Replay to run it again, or use any button to explore by hand."));
  return s;
}
function apSummary(){
  const filed=S.rows.filter(r=>!r.legacy&&!r.review).length, rev=S.rows.filter(r=>!r.legacy&&r.review).length;
  const ids=S.accounts.map(a=>a.first+" "+a.city+": "+(a.ctid||"none")).join(", ");
  apLog("SUMMARY filed="+filed+" review="+rev+" switch="+S.on+" ids="+ids);
}
function apBuild(){AP.hit=new Set();AP.steps=[].concat(apJourney('good',{back:true,replay:true}),apJourney('ndc',{auto:true}),apJourney('twin',{}),apJourney('before',{switchOn:true}),apSandbox());}
function apText(v){return typeof v==='function'?v():v;}
function apShow(step){const c=apText(step.cap),sub=apText(step.sub);$('#ap-cap').textContent=c;$('#ap-sub').textContent=sub||'';$('#ap-bar').style.width=Math.round(100*AP.i/AP.steps.length)+'%';}
function apSchedule(ms){clearTimeout(AP.timer);AP.timer=setTimeout(apTick,Math.max(60,ms/AP.speed));}
function apTick(){
  if(!AP.on||AP.paused)return;
  if(AP.i>=AP.steps.length){apFinish();return;}
  const step=AP.steps[AP.i];
  let extra;
  try{extra=step.run();}catch(e){apLog('ERROR step '+AP.i+' '+(e&&e.message));}
  if(extra==='skip'){AP.i++;apTick();return;}
  apShow(step);
  if(typeof extra==='string'){$('#ap-sub').textContent=extra;}
  apLog('STEP '+AP.i+' '+apText(step.cap));
  AP.i++;
  apSchedule(step.ms);
}
function apStart(){
  if(AP.on){apStop();}
  jstop();S=fresh();render();
  if($('#story').classList.contains('hide')){apClick('#m-story');}
  apBuild();AP.on=true;AP.paused=false;AP.i=0;
  document.body.classList.add('ap-on');$('#player').classList.add('on');$('#ap-toggle').textContent='Pause';$('#ap-play').textContent='Restart demo';
  apLog('START speed='+AP.speed);
  apTick();
}
function apPause(why){if(!AP.on||AP.paused)return;AP.paused=true;clearTimeout(AP.timer);$('#ap-toggle').textContent='Resume';if(why){$('#ap-sub').textContent=why;}}
function apResume(){if(!AP.on||!AP.paused)return;AP.paused=false;$('#ap-toggle').textContent='Pause';apTick();}
function apStop(){AP.on=false;AP.paused=false;clearTimeout(AP.timer);document.body.classList.remove('ap-on');$('#player').classList.remove('on');document.querySelectorAll('.spot').forEach(x=>x.classList.remove('spot'));$('#ap-play').innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>Play full demo';}
function apFinish(){AP.on=false;clearTimeout(AP.timer);$('#ap-bar').style.width='100%';$('#ap-toggle').textContent='Replay';$('#ap-cap').textContent='Demo complete';apLog('HIT '+Array.from(AP.hit).sort().join(' | '));apLog('COMPLETE');}
document.addEventListener('click',e=>{
  const t=e.target.closest('#ap-play,#ap-toggle,#ap-speed,#ap-stop');
  if(t){
    if(t.id==='ap-play'){apStart();}
    else if(t.id==='ap-toggle'){if(!AP.on){apStart();}else if(AP.paused){apResume();}else{apPause();}}
    else if(t.id==='ap-speed'){AP.speed=AP.speed===1?2:1;t.textContent=AP.speed+'x';t.setAttribute('aria-pressed',AP.speed===2);}
    else if(t.id==='ap-stop'){apStop();}
    return;
  }
  if(AP.on&&!AP.paused&&!AP.synthetic&&e.isTrusted){apPause('Paused because you clicked. Press Resume to continue.');}
},true);
document.addEventListener('keydown',e=>{if(e.key===' '&&AP.on&&!e.target.matches('input,textarea,button')){e.preventDefault();AP.paused?apResume():apPause();}});
if(APQ.get('autoplay')==='1'){AP.speed=+(APQ.get('speed')||1)||1;$('#ap-speed').textContent=AP.speed+'x';setTimeout(apStart,200);}
`;
must(`jstart('good');`);
h = h.replace(`jstart('good');`, `jstart('good');\n` + director);

fs.writeFileSync(out, h);
if (out2) fs.writeFileSync(out2, h);
console.log("written", out, h.length, "bytes", out2 ? "and " + out2 : "");
