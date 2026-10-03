#!/usr/bin/env node
/* Charge the Line — full test suite.
   Usage:  node tests/run_all.js          (everything, about a minute)
           node tests/run_all.js quick    (syntax, balance, guide, short fuzz)
           node tests/run_all.js play human    (pick sections)
   Sections: syntax balance play paths human checks guide stress fuzz
   Exit code 0 = all passed. */
global.window=global.window||{};
const path=require('path'),fs=require('fs'),vm=require('vm'),{execFileSync}=require('child_process');
const ALL=['syntax','balance','learn','play','paths','human','checks','guide','stress','fuzz'];
let want=process.argv.slice(2);if(!want.length)want=ALL;if(want.includes('quick'))want=['syntax','balance','learn','guide','fuzz'];
const results=[];let failed=0;const T0=Date.now();
function report(section,name,ok,detail=''){results.push({ok});if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'}  ${section.padEnd(8)} ${name}${detail?'  — '+detail:''}`);}
const quiet=fn=>{const l=console.log;console.log=()=>{};try{return fn();}finally{console.log=l;}};
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const short=n=>n.length>38?n.slice(0,37)+'…':n;

if(want.includes('syntax')){try{new vm.Script(html.split('<script>')[1].split('</script>')[0]);report('syntax','index.html script compiles',true);}catch(e){report('syntax','index.html script compiles',false,e.message);}
  const ver=(html.match(/APP_VERSION='([^']+)'/)||[])[1],sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),cache=(sw.match(/CACHE = '([^']+)'/)||[])[1];
  report('syntax','service-worker cache matches app version',cache===`charge-the-line-v${ver}`,`app ${ver}, cache ${cache}`);
  {// Milestone 3: the shared core is loaded before the app, listed in the offline cache, and its header hash matches its body (edit without re-hashing = fail)
   const cp=path.join(__dirname,'..','preconnect-core.js');const ct=fs.existsSync(cp)?fs.readFileSync(cp,'utf8'):'';const first=ct.split('\n')[0]||'';const body=ct.slice(first.length+1);
   const want=(first.match(/sha256:([0-9a-f]{64})/)||[])[1];const got=require('crypto').createHash('sha256').update(body,'utf8').digest('hex');const sw4=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
   const tagOK=html.indexOf('<script src="preconnect-core.js"></script>')>-1&&html.indexOf('<script src="preconnect-core.js"></script>')<html.indexOf('\n<script>\n');
   report('syntax','shared core loaded first, cached offline, header hash matches body',!!ct&&want===got&&sw4.includes("'preconnect-core.js'")&&tagOK,want===got?'hash ok':`hash expected ${got.slice(0,12)}`);}
  {// Milestone 3: due-again spacing and the debrief body are pure functions; prove them here
   const {boot}=require('./qa_mock.js');const {api}=boot();const d=n=>new Date(Date.now()-n*864e5).toISOString();
   const never=api.pcSpacing([]).status==='never',one=api.pcSpacing([{d:d(0),score:90}]),two=api.pcSpacing([{d:d(5),score:90},{d:d(4),score:90}]),miss=api.pcSpacing([{d:d(5),score:90},{d:d(1),score:40}]),due=api.pcSpacing([{d:d(10),score:95}]);
   report('syntax','spacing: 1, 3, 7, 14, 30 days after each clear at 70+; a miss resets; overdue reads as due',never&&one.level===1&&one.dueIn===1&&one.status==='ok'&&two.level===2&&two.status==='due'&&miss.status==='missed'&&due.status==='due'&&due.level===1,`one ${one.status}/${one.dueIn}d, two ${two.status}, miss ${miss.status}, due ${due.status}`);
   const bp=api.pcBestPrev([{d:d(3),score:80},{d:d(1),score:60}]);const h=api.pcDebriefBody({score:90,compare:bp,metrics:[['Rate','110 / min']],feedback:['Late breath'],lessons:[{k:'x',name:'Breaths'}],steps:[{name:'Check pulse',ok:true,at:'0:05'},{name:'Shock',ok:false,missed:true}]});
   report('syntax','debrief body: compare line, metrics table, what cost points, lessons, steps table',bp.best===80&&bp.prev===60&&/Best 80 · last time 60 · new best/.test(h)&&/pc-metrics/.test(h)&&/What cost points/.test(h)&&/data-k="x"/.test(h)&&/pc-steps/.test(h)&&/✗/.test(h));}

  {// Every overlay has a way back (Max, October 3, 2026). The briefing used to offer only "Start mission".
   const {boot}=require('./qa_mock.js');const {api,els}=boot();api.loadCampaign(0);api.showBrief();const open=!els.briefov.classList.contains('hidden');els['brief-back'].onclick();
   {const b3=boot();b3.api.loadCampaign(0);b3.api.showBrief();b3.api.$('brief-go').onclick();b3.api.finish();report('syntax','mission debrief uses Debrief 2.0 (steps table, clean-run line, score count-up)',/pc-steps/.test(b3.els['done-body'].innerHTML)&&/Clean run/.test(b3.els['done-body'].innerHTML)&&b3.els['done-score'].textContent==='100');}
   {const intro=(html.match(/<div class="overlay" id="intro">([\s\S]*?)<\/div><\/div>/)||[])[1]||'';const words=intro.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length;const b5=boot();b5.api.setSetting('contrast','high');
    report('syntax','first-run card is short (the full guide lives under How to play) and the settings sheet is wired',words<120&&/id="howov"/.test(html)&&/id="how-close"/.test(html)&&/id="setov"/.test(html)&&/id="h-set"/.test(html)&&b5.api.settings().contrast==='high'&&!/Barlow/.test(html),`${words} words on the first-run card`);}
   report('syntax','mission briefing has a way back to the menu',open&&els.briefov.classList.contains('hidden')&&!els.menu.classList.contains('hidden')&&api.S.briefing===false&&api.S.running===false);}
  {const lits=[...html.matchAll(/(?:Version |>v)(\d+\.\d+\.\d+)/g)].map(m=>m[1]);report('syntax','intro and menu show the current version',lits.length>=2&&lits.every(v=>v===ver),`found ${lits.join(', ')}; app ${ver}`);}
  {// Milestone 1: fonts are served from this site; nothing loads from Google (offline fidelity + privacy). Every font file exists and is in the offline cache list.
   const sw3=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');const urls=[...html.matchAll(/url\((fonts\/[^)]+)\)/g)].map(m=>m[1]);
   const ok=!/fonts\.googleapis|gstatic\.com/.test(html)&&urls.length>=5&&urls.every(u=>fs.existsSync(path.join(__dirname,'..',u))&&sw3.includes(`'${u}'`));
   report('syntax','fonts served from this site, cached offline, no request to Google',ok,`${urls.length} font files`);}
  {// Milestone 1: the screen stays awake while an activity runs and is released after (stubbed wake lock; the real one is async)
   const {boot}=require('./qa_mock.js');const {api}=boot();let req=0,rel=0;const lock={addEventListener(){},release(){rel++;return Promise.resolve();}};navigator.wakeLock={request(){req++;return {then(f){f(lock);return {catch(){}};}};}};
   try{api.loadCampaign(0);api.showBrief();api.$('brief-go').onclick();}catch(e){report('syntax','screen stays awake during an activity, released after',false,e.message);}
   const a=req>=1;api.showMenu();report('syntax','screen stays awake during an activity, released after',a&&rel>=1&&rel===req,`requests ${req}, releases ${rel}`);delete navigator.wakeLock;}

  report('syntax','offline helper only clears its own old caches (other apps on the domain keep theirs)',/k\.startsWith\('charge-the-line-v'\)/.test(sw));
  {const sw2=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');report('syntax','offline helper never caches anonymous statistics',/goatcounter\\\.com\$\|\(\^\|\\\.\)zgo\\\.at/.test(sw2)||sw2.includes('goatcounter')&&sw2.includes('zgo'));}}


if(want.includes('learn')){const {boot}=require('./qa_mock.js');
  {// the lesson: 12 slides, first-try scoring, no skipping, recorded apart from scenarios
   const {api,els,store}=boot();api.lessonStart();const L=api.LESSON;let skipped=false;
   for(let i=0;i<L.length;i++){const S=api.LS();const before=S.i;api.lessonAct({l:'next'});if(api.LS()&&api.LS().i!==before)skipped=true;const k=L[i].o.findIndex(o=>o[1]==='good');api.lessonAct({l:'ans',k});api.lessonAct({l:'next'});}
   const ex=JSON.parse(store['e102-pump-trainer']).extra||[];report('learn','lesson: all 12 checks right first try scores 100, cannot skip a slide, recorded under extra',!skipped&&ex.length===1&&ex[0].kind==='lesson'&&ex[0].score===100&&api.LS()===null,`score ${ex[0]&&ex[0].score}`);
   const b=boot();b.api.lessonStart();for(let i=0;i<L.length;i++){const bad=L[i].o.findIndex(o=>o[1]!=='good'),good=L[i].o.findIndex(o=>o[1]==='good');b.api.lessonAct({l:'ans',k:bad});b.api.lessonAct({l:'ans',k:good});b.api.lessonAct({l:'next'});}
   const ex2=JSON.parse(b.store['e102-pump-trainer']).extra||[];report('learn','lesson: a wrong first answer on every slide scores 0 (retry still lets you continue)',ex2.length===1&&ex2[0].score===0,`score ${ex2[0]&&ex2[0].score}`);
   const longest=L.filter(s=>{const len=s.o.map(o=>o[0].length);return len[s.o.findIndex(o=>o[1]==='good')]===Math.max(...len);}).length,shortest=L.filter(s=>{const len=s.o.map(o=>o[0].length);return len[s.o.findIndex(o=>o[1]==='good')]===Math.min(...len);}).length;
   report('learn','lesson checks: right answer is not usually the longest or the shortest',longest/L.length<=.45&&shortest/L.length<=.45,`longest ${longest}/${L.length}, shortest ${shortest}/${L.length}`);
   report('learn','every lesson check has exactly one right answer and three distinct options',L.every(s=>s.o.length===3&&s.o.filter(o=>o[1]==='good').length===1&&new Set(s.o.map(o=>o[0])).size===3));}
  {// drills: answer keys recalculated independently from the question text (rule 7), 100 when right, 0 when wrong
   const FL={'1¾"':15.5,'2½"':2,'3"':0.8,'5"':0.08};const r5=x=>Math.round(x/5)*5;let checked=0,bad=[];
   for(let rep_=0;rep_<25;rep_++){const {api}=boot();for(const k of Object.keys(api.DRILLS)){for(const q of api.DRILLS[k].items()){checked++;let want=null;
     if(k==='friction'){const m=q.q.match(/^(\d+) ft of (\S+) hose flowing (\d+) gpm/);want=r5(FL[m[2]]*Math.pow(m[3]/100,2)*(m[1]/100))+' psi';}
     if(k==='pdp'){const m=q.q.match(/^(\d+) ft of (\S+) at (\d+) gpm, (75-psi fog|100-psi fog|smooth bore) nozzle, (ground floor|one floor up|(\d+) floors up)/);const np={'75-psi fog':75,'100-psi fog':100,'smooth bore':50}[m[4]];const fl=m[5]==='ground floor'?0:m[5]==='one floor up'?1:+m[6];want=r5(np+FL[m[2]]*Math.pow(m[3]/100,2)*(m[1]/100)+fl*5)+' psi';}
     if(k==='hydrant'){const m=q.q.match(/Static (\d+) psi. After the first line, residual (\d+) psi/);const d=(m[1]-m[2])/m[1]*100;want=d<=10?'Three more':d<=15?'Two more':d<=25?'One more':'None';}
     if(k==='control'){const key=Object.keys(api.GUIDE_ALL).find(x=>api.GUIDE_ALL[x].what===q.q);want=key?api.GUIDE_ALL[key].name:null;}
     const opts=[q.a,...q.d];if(want!==q.a||new Set(opts).size!==3||q.d.includes(q.a))bad.push(`${k}: ${q.q.slice(0,50)} → ${q.a} (want ${want})`);}}}
   report('learn',`drills: ${checked} generated questions, answer keys match an independent recalculation, three distinct options`,bad.length===0,bad.slice(0,2).join(' | '));
   for(const k of ['friction','pdp','control','hydrant']){const {api,store}=boot();api.drillStart(k);for(let i=0;i<api.QZ().qs.length;i++){const q=api.QZ().qs[i];api.quizAct({q:'ans',i:String(q.ord.indexOf(q.a))});api.quizAct({q:'next'});}const r=api.QZ().score;
     const b=boot();b.api.drillStart(k);for(let i=0;i<b.api.QZ().qs.length;i++){const q=b.api.QZ().qs[i];b.api.quizAct({q:'ans',i:String(q.ord.findIndex(o=>o!==q.a))});b.api.quizAct({q:'next'});}const w=b.api.QZ().score;const ex=JSON.parse(store['e102-pump-trainer']).extra||[];
     report('learn',`${api.DRILLS[k].name}: all right = 100, all wrong = 0, recorded`,r===100&&w===0&&ex.some(x=>x.kind==='drill'&&x.id===k&&x.score===100),`${r} / ${w}`);}
   {const {api}=boot();let n=0;for(let r_=0;r_<20;r_++)for(const k of ['friction','pdp'])for(const q of api.DRILLS[k].items()){const len=[q.a,...q.d].map(x=>x.length);if(len[0]===Math.max(...len)&&len.filter(x=>x===len[0]).length===1)n++;}
     report('learn','numeric drills: the right answer is not usually the longest option',n/(20*2*8)<=.45,`${n} of ${20*2*8}`);}}}

const env=(want.some(x=>['balance','play','paths','human','stress','fuzz'].includes(x)))?require('./qa.js'):null;
if(want.includes('balance')){const {CAMP}=env.env.api;let lo=0,sh=0,t=0,first=0;for(const c of CAMP)for(const m of c.missions)for(const s of m.steps)if(s.dec&&s.dec.opts){const L=s.dec.opts.map(x=>x.t.length),g=s.dec.opts.findIndex(x=>x.r==='good');t++;if(L[g]===Math.max(...L))lo++;else if(L[g]===Math.min(...L))sh++;}
  report('balance','right answer is not usually the longest',lo/t<=.45,`${lo} of ${t} (${Math.round(lo/t*100)}%)`);report('balance','right answer is not usually the shortest',sh/t<=.45,`${sh} of ${t} (${Math.round(sh/t*100)}%)`);
  report('balance','answer order is shuffled on screen',/d\.opts\.map\(\(o,i\)=>\[o,i\]\)\.sort\(\(\)=>Math\.random\(\)-\.5\)/.test(html));}

if(want.includes('play')){const {CAMP}=env.env.api;for(let ci=0;ci<CAMP.length;ci++){let ok=0,perfect=0;for(const tier of [0,1,2]){const r=quiet(()=>env.play(ci,tier));if(r.ok)ok++;if(r.score===100)perfect++;}
  report('play',`${short(CAMP[ci].name)}: all tiers complete`,ok===3,`${ok}/3, ${perfect}/3 perfect`);}}

if(want.includes('paths')){const {CAMP}=env.env.api;for(let ci=0;ci<CAMP.length;ci++){if(!CAMP[ci].real)continue;let ok=0;const sc=[];for(const ch of ['partial','bad']){const r=quiet(()=>env.play(ci,0,ch));if(r.ok)ok++;sc.push(r.score);}
  report('paths',`${short(CAMP[ci].name)}: completable after wrong answers`,ok===2,`scores ${sc.join(' / ')}`);}}

if(want.includes('human')){const {CAMP}=env.env.api;for(let ci=0;ci<CAMP.length;ci++){let ok=0;const sc=[];for(const tier of [0,1,2]){const r=quiet(()=>env.play(ci,tier,'good',{human:true}));if(r.ok)ok++;sc.push(r.score);}
  report('human',`${short(CAMP[ci].name)}: completes at human pace`,ok===3,`scores ${sc.join(' / ')}`);}}

for(const [sec,file,marker] of [['checks','qa2.js','ALL CHECKS PASSED'],['guide','qa_guide.js','ALL GUIDE CHECKS PASSED']])if(want.includes(sec)){
  let out='';try{out=execFileSync(process.execPath,[path.join(__dirname,file)],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:240000});}catch(e){out=(e.stdout||'')+(e.stderr||'');}
  const fails=out.split('\n').filter(l=>/✗/.test(l));report(sec,`${file}: ${sec==='checks'?'chaos faults, wrong-answer paths, pacing, cost':'guide cards, links, penalties'}`,out.includes(marker),fails.slice(0,3).map(x=>x.trim()).join(' | '));}

if(want.includes('stress')){const {CAMP}=env.env.api;let total=0,bad=0;for(let ci=0;ci<CAMP.length;ci++)for(let k=0;k<20;k++)for(const tier of [0,1,2]){total++;if(!quiet(()=>env.play(ci,tier)).ok)bad++;}
  report('stress',`${total} randomized playthroughs`,bad===0,bad?bad+' failed':'');}

if(want.includes('fuzz')){const {boot}=require('./qa_mock.js');const ids=[...html.matchAll(/<button[^>]*id="([^"$]+)"/g)].map(m=>m[1]);let crashes=0;const errs=[];const runs=want.length<=4?20:60;
  for(let run=0;run<runs;run++){const {api}=boot();const {$,CAMP,S}=api;api.setTier(run%3);api.loadCampaign(run%CAMP.length);
    try{for(let i=0;i<1500;i++){if(api.DEC()){$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i%3)}})}});$('dec-go').onclick();}
      if(Math.random()<.4){const b=$(ids[Math.floor(Math.random()*ids.length)]);b.onclick&&b.onclick();}S.running=S.running||Math.random()<.5;api.tick(.25);
      for(const k of ['psi','rpm','tank','score'])if(!Number.isFinite(S[k]))throw new Error('non-finite '+k);}}catch(e){crashes++;errs.push(e.message);}}
  report('fuzz',`${runs} runs × 1500 random taps, no crashes or NaN`,crashes===0,crashes?[...new Set(errs)].slice(0,3).join(' | '):'');}

console.log(`\n${results.length-failed}/${results.length} checks passed · ${Math.round((Date.now()-T0)/1000)} s`);process.exit(failed?1:0);
