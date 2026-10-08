const {boot}=require('./qa_mock.js');
const env=boot();const {api,els}=env;const {S,CAMP,$}=api;
const click=id=>{const e=$(id);if(e.disabled)return false;e.onclick&&e.onclick();return true;};
const errors=[];
function valveKeyFromText(t,c){
  const m=t.match(/#(\d) (front|rear)/i);if(m){const k=(m[2].toLowerCase()==='front'?(m[1]==='1'?'front':'front3'):('rear'+m[1]));if(S.valves[k])return k;}
  const d=t.match(/Discharge (\d)/);if(d&&c.valveNames){for(const k in c.valveNames)if(c.valveNames[k][0]==='Discharge '+d[1])return k;}
  if(/deck gun/i.test(t))return 'deck';
  if(/FDC line|to the FDC/i.test(t))return 'rear3';if(/LDH at|#4 rear/i.test(t))return 'rear4';
  return null;}
function band(t){const m=t.match(/(\d+)–(\d+)/);return m?[+m[1],+m[2]]:null;}
function setPsi(target){if(S.mode!=='psi')click('b-psi');S.set=Math.round(target);}
function openFull(k){if(S.valves[k].open<100)api.setValve(k,'crack');}
let reopen=null,strainerFix=0;
function stepAct(c,m,j,s){
  const t=s.t;const tl=t.toLowerCase();
  if(s.dec)return;
  if(/disengage the pump/.test(tl)){if(S.pump&&S.rpm<=950)click('s-pump');return;}
  if(/engage the pump/.test(tl)){if(!S.pump)click('s-pump');return;}
  if(/confirm tank-to-pump open|open tank-to-pump|tank-to-pump open/.test(tl)){if(!S.ttp)click('s-ttp');if(/steamer intake closed/.test(tl)&&S.miv>0&&S.mivDir!==-1)click('miv-close');return;}
  if(/close tank-to-pump/.test(tl)){if(S.ttp)click('s-ttp');return;}
  if(/steamer intake \(hydrant side\) closed|miv closed/.test(tl)){if(S.miv>0&&S.mivDir!==-1)click('miv-close');return;}
  if(/connect the 5" supply|connect the supply line$|connect the hydrant line/.test(tl)){click('s-supply');return;}
  if(/open the hydrant/.test(tl)){click('s-hyd');return;}
  if(s.two){const bs=s.two.slice().sort((p,q)=>q.lo-p.lo);const top=bs[0];const psi=(top.lo+top.hi)/2;if(S.valves[top.k].open<100)api.setValve(top.k,'crack');setPsi(psi);bs.slice(1).forEach(o=>{const pick=[100,75,50,25].find(x=>{const lp=psi*(0.45+0.55*x/100);return lp>=o.lo&&lp<=o.hi;});if(S.valves[o.k].open===0)api.setValve(o.k,'crack');else S.valves[o.k].open=pick||100;});return;}
  if(/open the deck gun/.test(tl)){if(S.valves.deck.open===0)api.setValve('deck','crack');return;}
  if(/connect the second 5"/.test(tl)){click('s-relay');return;}
  if(/second line charged/.test(tl))return;
  if(/throttle back until the intake/.test(tl)){if(S.mode!=='psi')click('b-psi');if(S.cavOn||api.resDemand()<10)setPsi(Math.max(40,S.set-10));return;}
  if(/^shut down #3 rear while/.test(tl)){if(S.valves.rear3.open>0)api.setValve('rear3','close');return;}
  if(/clear the ice from the dry hydrant/.test(tl)){if(S.iceT<=0)click('dh-ice');return;}
  if(/back-flush the dry hydrant/.test(tl)){if(S.primerOn)click('s-primer');else if(!S.ttp)click('s-ttp');else if(S.flushT<=0)click('dh-flush');return;}
  if(/^primer off/.test(tl)){if(S.primerOn)click('s-primer');return;}
  if(/tanker on the pad/.test(tl))return;
  if(/connect the fill line to the tanker/.test(tl)){click('s-relay');return;}
  if(/tanker nearly full: gate #4 rear down/.test(tl)){const v=S.valves.rear4;if(S.tk&&(S.tk.full||S.tk.near)){if(v.open>25)api.setValve('rear4','gate');else if(v.open>0&&S.tk.full)api.setValve('rear4','close');}else{if(v.open<100)api.setValve('rear4','crack');setPsi(60);}return;}
  if(/connect the 3" to the fdc/.test(tl)){click('s-fdc');return;}
  if(/5" up the west stair connected/.test(tl)){click('s-relay');return;}
  if(/tanker pumping/.test(tl)){click('s-hyd');return;}
  if(/thermal camera check/.test(tl)){if(S.t>=(S.camNext||0))click('ev-cam');return;}
  if(/^shut down #3 front, keep/.test(tl)){if(S.valves.front3.open>0)api.setValve('front3','close');return;}
  if(/^shut down #\d (front|rear) discharge once/.test(tl)){const k=valveKeyFromText(t,c);if(k&&S.valves[k].open>0)api.setValve(k,'close');return;}
  if(/put the eductor in line/.test(tl)){click('e-in');return;}
  if(/pickup tube/.test(tl)){click('e-pick');return;}
  if(/metering valve at 3%/.test(tl)){S.eductPct=3;return;}
  if(/bump the line/.test(tl)){S.valves.front.open=100;setPsi(200);if(!S.eductOK&&S.rerigT<=0)click('e-rerig');return;}
  if(/line held — crack the tank fill|hold the foam line ready/.test(tl)){if(!S.fill)click('s-fill');setPsi(200);return;}
  if(/gate discharge 2 to 115|hold both lines 20 seconds — saddle/.test(tl)){S.valves.front.open=100;if(S.valves.rear2.open===0||S.valves.rear2.open>25)S.valves.rear2.open=25;setPsi(200);return;}
  if(/open the miv|open the intake gate|open the steamer intake valve|open the intake valve/.test(tl)){if(S.miv===0&&S.mivDir!==1)click('miv-open');return;}
  if(/bleed the air/.test(tl)){click('s-bleed');return;}
  if(/east inlet|connect 2½" to the fdc/.test(tl)){click('s-fdc');return;}
  if(/west inlet|confirm 5" connected|supply line to tl-159|5" ldh to the attack|connect the 5" ldh/.test(tl)){click('s-relay');return;}
  if(/foam system on/.test(tl)){if(!S.foamOn)click('f-on');return;}
  if(/proportioner at 3%/.test(tl)){S.foamPct=3;return;}
  if(/foam system off/.test(tl)){if(S.foamOn)click('f-on');return;}
  if(/^flush/.test(tl)){if(!S.flushing&&!S.flushed)click('f-flush');return;}
  if(/throttle to idle/.test(tl)){if(S.mode!=='idle')click('b-idle');return;}
  if(/close all discharges|every discharge closed|shut down the 2½"|shut down discharge 3|fdc dropped|drop the relay/.test(tl)){for(const k in S.valves)if(S.valves[k].open>0)api.setValve(k,'close');return;}
  if(/disengage the pump/.test(tl)){if(S.pump&&S.rpm<=950)click('s-pump');return;}
  if(/hard suction/.test(tl)){click('s-hard');return;}
  if(/strainer set|set the strainer|lash on|low-level strainer/.test(tl)){click('s-strainer');return;}
  if(/rpm mode, 1,000/.test(tl)){if(S.mode!=='rpm')click('b-rpm');if(S.rpm<1100)click('b-up');else if(S.rpm>1250)click('b-dn');return;}
  if(/run the primer/.test(tl)){if(!S.primerOn&&!S.primed)click('s-primer');return;}
  if(/open tank fill|crack the tank fill/.test(tl)){if(!S.fill)click('s-fill');return;}
  if(/close tank fill/.test(tl)){if(S.fill)click('s-fill');return;}
  if(/suction mid-water|suction back in the green/.test(tl)){if(S.susp>55)click('d-dn');else if(S.susp<45)click('d-up');return;}
  if(/transfer valve to volume|transfer valve set for pressure/.test(tl)){const want=/volume/.test(tl)?'volume':'pressure';if(S.xfer!==want){if(S.rpm>1100){if(S.mode!=='idle')click('b-idle');}else{click(want==='volume'?'x-vol':'x-pres');click('b-psi');}}return;}
  if(/clear the strainer/.test(tl)){if(S.clearing<=0)click('d-clear');return;}
  if(/throttle back/.test(tl)){setPsi(25);return;}
  if(/keep water moving — don't run the pond dry/.test(tl)){setPsi(25);return;}
  if(/open #|open discharge/.test(tl)){const k=valveKeyFromText(t,c);if(!k){errors.push(c.name+' / '+m.title+': cannot map valve for "'+t+'"');return;}if(S.valves[k].open===0)api.setValve(k,'crack');return;}
  if(/both lines in band/.test(tl)){
    if(/Discharge 4 140–160/.test(t)){S.valves.rear4.open=100;S.valves.rear2.open=25;setPsi(150);return;}
    // two lines, two bands: pump for the line that needs more, gate the other down a quarter turn at a time until its gauge reads in band (what Gate − is for)
    const bs=[...t.matchAll(/(\d+)–(\d+) at #(\d)/g)].map(x=>({lo:+x[1],hi:+x[2],k:x[3]==='1'?'front':'front3'}));
    if(bs.length<2){S.valves.front.open=100;if(S.valves.front3)S.valves.front3.open=100;setPsi(150);return;}
    bs.sort((p,q)=>q.lo-p.lo);const top=bs[0],other=bs[1];const psi=(top.lo+top.hi)/2;S.valves[top.k].open=100;setPsi(psi);
    const pick=[100,75,50,25].find(o=>{const lp=psi*(0.45+0.55*o/100);return lp>=other.lo&&lp<=other.hi;});S.valves[other.k].open=pick||100;return;}
  const b=band(t);
  if(b&&/(bring|at|raise|line|get above|water back)/i.test(t)){const k=valveKeyFromText(t,c)||(m.chat&&m.chat.k);if(!k){errors.push(c.name+': no valve for "'+t+'"');return;}openFull(k);setPsi((b[0]+b[1])/2);return;}
  if(s.hold&&s.k&&s.lo){openFull(s.k);setPsi((s.lo+s.hi)/2);return;}
  if(s.hold||/first tanker|past 15|primed —|tank above 700|stay primed|keep water moving/.test(tl))return; // waiting steps
  errors.push(c.name+' / '+m.title+': UNHANDLED step "'+t+'"');
}
function upkeep(c){
  // chaos handling like a competent engineer
  if(S.fault==='gov'&&S.mode!=='psi')click('b-psi');
  for(const k in S.valves){const v=S.valves[k];if(v.burst&&!/First Interstate/.test(c.name)&&v.open>0){api.setValve(k,'close');reopen=k;}}
  if(reopen&&S.burstT>=0&&!S.valves[reopen].burst){S.valves[reopen].open=100;reopen=null;}
  if(c.draft&&!c.pond&&!c.depth&&S.hardSuction&&!S.strainer){click('s-strainer');strainerFix=1;}
  if(strainerFix){for(const k in S.valves)if(S.valves[k].open>0)S.valves[k].open=0;if(S.mode!=='rpm')click('b-rpm');if(!S.primerOn&&!S.primed)click('s-primer');if(S.primed){strainerFix=0;}}
  if(c.depth&&S.hardSuction){if(S.susp>60)click('d-dn');if(S.clog>40&&S.clearing<=0&&!api.DEC())click('d-clear');}
  if(c.cold&&S.primedEver&&api.totalFlow()<20&&!S.fill)click('s-fill');
  if(c.fillSite&&S.primed&&api.totalFlow()<20&&!S.fill)click('s-fill');
  if(c.heat&&S.heatT>4&&!S.fill)click('s-fill');
}
function play(ci,tier,choice='good',opts={}){
  api.setTier(tier);global.window.FORCE_V=opts.variant?{[ci]:opts.variant}:undefined;api.loadCampaign(ci);global.window.FORCE_V=undefined;const c=CAMP[ci];reopen=null;strainerFix=0;
  const res={name:c.name,tier:['Guided','Recall','Chaos'][tier],missions:[],ok:true,decLatency:[]};
  for(let mi=0;mi<c.missions.length;mi++){
    const m=c.missions[mi];let t=0,done=false,decAt=null;const T=300;res.faults=res.faults||[];
    while(t<T){
      if(opts.human){opts._rt=(opts._rt||0)+.25;}
      if(!$('briefov')._cls.has('hidden')){if(!opts.human||(opts._b=(opts._b||0)+.25)>=2){opts._b=0;$('brief-go').onclick();}else{t+=.25;continue;}}
      if(api.DEC()&&opts.human&&((opts._d=(opts._d||0)+.25)<3)){t+=.25;continue;}opts._d=0;
      if(api.DEC()){if(decAt===null)decAt=S.t-S.mStart;const d=api.DEC().s.dec;let i=d.opts.findIndex(o=>o.r===((opts.choiceAt&&opts.choiceAt[d.tag])||choice));if(i<0)i=0;$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});$('dec-go').onclick();}
      if(!S.running&&!$('done')._cls.has('hidden')){done=true;break;}
      if(opts.inject&&mi===opts.inject.mission&&t>=opts.inject.at&&!opts._inj){if(api.inject(opts.inject.f)){opts._inj=true;res.injected=true;}else if(res.injected===undefined)res.injected=false;}
      const sd=api.stepsDone();const j=sd.findIndex(x=>!x);if(j>=0&&(!opts.human||(opts._a=(opts._a||0)+.25)>=1.25)){opts._a=0;stepAct(c,m,j,m.steps[j]);}
      if(S.fault&&!res.faults.includes(S.fault))res.faults.push(S.fault);
      upkeep(c);
      if(S.running)api.tick(0.25);t+=0.25;
    }
    const firstDecIdx=m.steps.findIndex(s=>s.dec);
    res.missions.push({title:m.title,done,secs:Math.round(S.t-S.mStart),dec:decAt===null?null:+decAt.toFixed(1),firstStepIsDec:firstDecIdx===0});
    if(!done){res.ok=false;res.stuck=m.steps[api.stepsDone().findIndex(x=>!x)]?.t;break;}
    if(mi<c.missions.length-1)$('b-next').onclick();
  }
  res.score=S.score;res.incidents=[...S.incidents];res.title=$('done-title').textContent;res.variant=S.variant;res.vtext=S.vtext;
  return res;
}
module.exports={play,env,errors,click};
if(require.main===module){
  const out=[];
  for(let ci=0;ci<CAMP.length;ci++)for(const tier of [0,1,2]){
    let r;try{r=play(ci,tier);}catch(e){r={name:CAMP[ci].name,tier,ok:false,crash:e.stack.split('\n').slice(0,3).join(' | ')};}
    out.push(r);
    console.log((r.ok?'PASS':'FAIL').padEnd(5),String(r.tier).padEnd(7),r.name.slice(0,44).padEnd(45),'score',String(r.score).padStart(3),r.ok?'':('STUCK at: '+(r.stuck||r.crash)), (r.incidents&&r.incidents.length)?' incidents: '+r.incidents.join('; '):'');
  }
  console.log('\nDecision latency (seconds from mission start → card), Guided tier:');
  out.filter(r=>r.tier==='Guided'&&r.missions).forEach(r=>r.missions.filter(m=>m.dec!==null).forEach(m=>console.log('  ',r.name.slice(0,28).padEnd(29),m.title.padEnd(42),String(m.dec).padStart(5),'s',m.firstStepIsDec?'(scripted)':'(after player actions)')));
  console.log('\nUnhandled/mapping issues:',errors.length?[...new Set(errors)].join('\n  '):'none');
}
