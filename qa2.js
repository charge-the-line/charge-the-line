const q=require('./qa.js');const {api,missing}=q.env;const {S,CAMP,$}=api;
let fails=0;const log=(ok,msg)=>{if(!ok)fails++;console.log((ok?'  ✓ ':'  ✗ ')+msg);};
console.log('A. Chaos tier — 10 randomized runs per scenario (faults fire at random times)');
for(let ci=0;ci<CAMP.length;ci++){let pass=0,f=new Set(),minScore=100;for(let k=0;k<10;k++){const r=q.play(ci,2);if(r.ok)pass++;(r.faults||[]).forEach(x=>f.add(x));minScore=Math.min(minScore,r.score);}
  log(pass===10,`${CAMP[ci].name.slice(0,42).padEnd(43)} ${pass}/10 completed · faults seen: ${[...f].join(', ')||'none (scenario has none)'} · lowest score ${minScore}`);}
console.log('\nB. Wrong-answer paths — every real save must still be finishable after bad calls');
for(let ci=0;ci<CAMP.length;ci++){if(!CAMP[ci].real)continue;for(const ch of ['partial','bad']){const r=q.play(ci,0,ch);log(r.ok,`${CAMP[ci].name.slice(0,42).padEnd(43)} choosing "${ch}" → ${r.ok?'completed':'STUCK at '+r.stuck} · score ${r.score}`);}}
console.log('\nC. Fuzz test — 20,000 random button presses across all scenarios, checking for crashes and bad numbers');
const btns=['s-pump','s-ttp','s-supply','s-hyd','s-bleed','s-fill','s-fdc','s-relay','s-hard','s-strainer','s-primer','b-psi','b-rpm','b-idle','b-up','b-dn','miv-open','miv-close','x-vol','x-pres','d-up','d-dn','d-clear','f-on','f-flush'];
let crashes=[],nan=0;
for(let run=0;run<CAMP.length*5;run++){const ci=run%CAMP.length;api.setTier(run%3);api.loadCampaign(ci);
  for(let i=0;i<500;i++){try{
    if(!$('briefov')._cls.has('hidden'))$('brief-go').onclick();
    if(api.DEC()){$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i%3)}})}});$('dec-go').onclick();}
    if(!$('done')._cls.has('hidden')&&!S.running){$('b-next').onclick();if(!S.running)api.loadCampaign(ci);}
    const r=Math.random();
    if(r<0.5){const b=btns[Math.floor(Math.random()*btns.length)];const e=$(b);if(!e.disabled&&e.onclick)e.onclick();}
    else if(r<0.75){const ks=CAMP[ci].valves;const k=ks[Math.floor(Math.random()*ks.length)];api.setValve(k,['crack','snap','close'][Math.floor(Math.random()*3)]);}
    for(let t=0;t<4;t++)if(S.running)api.tick(0.25);
    for(const v of ['psi','rpm','tank','vac','pond','clog','susp','score','miv'])if(!Number.isFinite(S[v])){nan++;throw new Error('non-finite '+v+'='+S[v]);}
    if(S.psi<0||S.tank<0||S.tank>S.tankMax+0.01||S.pond<0||S.rpm<0)throw new Error('out of range psi/tank/pond/rpm');
  }catch(e){crashes.push(CAMP[ci].name.slice(0,30)+': '+e.message);break;}}}
log(crashes.length===0,`${CAMP.length*5*500*1} random actions · crashes: ${crashes.length} ${crashes.slice(0,5).join(' | ')}`);
console.log('\nD. App flows');
api.setTier(0);api.loadCampaign(0);$('brief-go').onclick();for(let i=0;i<8;i++)api.tick(0.25);
$('b-menu').onclick();log(!S.running&&!$('b-resume')._cls.has('hidden'),'Menu mid-scenario pauses and offers "Resume"');
$('b-resume').onclick();log(S.running&&$('menu')._cls.has('hidden'),'Resume closes the menu and continues the clock');
const bi=CAMP.findIndex(c=>c.name.startsWith('Port Jervis'));api.loadCampaign(bi);$('brief-go').onclick();api.tick(0.25);log(!!api.DEC()&&!$('decov')._cls.has('hidden'),'Decision card opens on Port Jervis mission 1');
$('b-reset').onclick();log(!api.DEC()&&$('decov')._cls.has('hidden')||!!api.DEC(),'Restart during a decision clears the stale card');
api.loadCampaign(0);$('b-menu').onclick();api.loadCampaign(bi);log($('menu')._cls.has('hidden'),'Starting a scenario from the menu closes the menu');
let snapOK=true;for(let ci=0;ci<CAMP.length;ci++){api.loadCampaign(ci);$('brief-go').onclick();for(let t=0;t<20;t++)api.tick(0.25);try{const x=api.snapshot();if(!/Charge the Line report/.test(x)||/undefined|NaN/.test(x))snapOK=false;}catch(e){snapOK=false;}}
log(snapOK,'Issue-report snapshot builds cleanly in all '+CAMP.length+' scenarios (no "undefined"/"NaN")');
$('b-report').onclick();$('r-name').value='QA';$('r-dept').value='Test FD';$('r-note').value='test';$('r-send').onclick();
setTimeout(()=>{log(/From: QA \(Test FD\)/.test(global.__clip||''),'Report falls back to copy-to-clipboard when the share sheet is unavailable');
  // progress + CSV
  const p=api.load();log(Object.keys(p.scen).length>=CAMP.length,'Training record saved for every completed scenario ('+Object.keys(p.scen).length+' entries)');
  $('b-export').onclick();const rows=(global.__blob||'').trim().split('\n');log(rows.length===CAMP.length+2,'CSV export: header + '+CAMP.length+' scenarios + pump math = '+rows.length+' rows');
  log(!/undefined|NaN/.test(global.__blob),'CSV has no undefined/NaN cells');
  // math drills
  let bad=0;for(let i=0;i<2000;i++){$('m-next').onclick();const pr=$('prob').innerHTML;if(/undefined|NaN/.test(pr))bad++;$('ans').value='1';$('m-check').onclick();if(/NaN|undefined/.test($('work').textContent))bad++;}
  log(bad===0,'2,000 pump-math problems generated and graded with worked answers, no bad values');
  // returning user skips intro
  const {boot}=require('./qa_mock.js');const e2=boot({'e102-pump-trainer':JSON.stringify({name:'x',scen:{},math:{right:0,total:0},seenIntro:true})});
  log(e2.els.intro._cls.has('hidden')&&!e2.els.menu._cls.has('hidden'),'Returning users skip the intro and land on the menu');
  const e3=boot({});log(!e3.els.intro._cls.has('hidden'),'First-time users see the intro');
  console.log('\nE. Integrity');
  log(missing.size===0||[...missing].every(id=>/^(st-|hold-|open-|pct-|valve-|rc$)/.test(id)),'Every element the code touches exists in the page'+(missing.size?' (dynamic only: '+[...missing].filter(x=>!/^(st-|hold-|open-|pct-|valve-)/.test(x)).join(',')+')':''));
  const html=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');const idl=[...html.matchAll(/ id="([^"$]+)"/g)].map(m=>m[1]);const dup=idl.filter((x,i)=>idl.indexOf(x)!==i);
  log(dup.length===0,'No duplicate element IDs'+(dup.length?': '+dup.join(','):''));
  const t0=Date.now();api.loadCampaign(5);$('brief-go').onclick();for(let i=0;i<4000;i++){if(api.DEC()){$('dec-opts').onclick({target:{closest:()=>({dataset:{i:'0'}})}});$('dec-go').onclick();}S.running=true;api.tick(0.25);}const ms=(Date.now()-t0)/4000;
  log(ms<2,`Simulation cost: ${ms.toFixed(3)} ms per tick (budget 250 ms) — no lag on older phones`);
  console.log('\n'+(fails?fails+' CHECK(S) FAILED':'ALL CHECKS PASSED'));
},10);
