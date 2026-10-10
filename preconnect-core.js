/* preconnect-core 1.6.0 sha256:cb0d8c2813291894a550ab8e968d5661f0e64132944348c294526f448508a2b5 */
/* Preconnect shared core. ONE file, copied byte-for-byte into every repo (the hub and all five modules).
   Rules: no build step, no module system, plain script. Top-level functions become globals the app's own script calls.
   Edit it in one repo, copy it to the others, and regenerate the header hash (tests/core_hash.js in the hub, or any suite tells you the hash it expected).
   Never define $ or esc here: every app has its own. */
const PCORE_VERSION='1.5.0';
function pcEsc(t){return String(t===undefined||t===null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ---------- Settings: one sheet, one key ('preconnect-settings'), honored by every module. Statistics use the Privacy page's key. ---------- */
const SETKEY='preconnect-settings',SETDEF={sound:'off',haptics:'on',text:'normal',contrast:'normal',motion:'auto'};
function settings(){let s={};try{s=JSON.parse(localStorage.getItem(SETKEY))||{};}catch(e){}const out=Object.assign({},SETDEF,s);let st='on';try{st=localStorage.getItem('preconnect-stats')==='off'?'off':'on';}catch(e){}out.stats=st;return out;}
function pcSetSetting(k,v){if(k==='stats'){try{if(v==='off')localStorage.setItem('preconnect-stats','off');else localStorage.removeItem('preconnect-stats');}catch(e){}try{if(window.PCA)window.PCA.off=(v==='off');}catch(e){}}
  else{let s={};try{s=JSON.parse(localStorage.getItem(SETKEY))||{};}catch(e){}s[k]=v;try{localStorage.setItem(SETKEY,JSON.stringify(s));}catch(e){}}
  applySettings();settingsRender();try{if(typeof window!=='undefined'&&typeof window.onPreconnectSettings==='function')window.onPreconnectSettings(settings());}catch(e){}}
function setSetting(k,v){pcSetSetting(k,v);if(k==='sound'&&v==='on')pcCue('good');if(k==='haptics'&&v==='on')pcBuzz('good');}  /* the preview plays after the switch is saved, so it is audible */
function pcPrefersContrast(){try{return typeof matchMedia==='function'&&matchMedia('(prefers-contrast: more)').matches;}catch(e){return false;}}
/* contrast: normal | high (brighter text on black) | day (white text, bold edges, for sun and glare). A phone asking for more contrast gets high unless a stronger choice was made. */
function applySettings(){const s=settings();const de=(typeof document!=='undefined')&&document.documentElement;if(!de||!de.dataset)return;de.dataset.text=s.text;de.dataset.contrast=(s.contrast==='normal'&&pcPrefersContrast())?'high':s.contrast;de.dataset.motion=s.motion;}
function settingsRender(){const s=settings();if(typeof document==='undefined'||!document.querySelectorAll)return;document.querySelectorAll('[data-set]').forEach(g=>{const k=g.dataset.set;g.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.val===s[k]));});}
/* accessibility (Milestone 10): feedback lines announce themselves, overlays are dialogs, pads are buttons. Runs from settingsBind(), after the page exists. */
function pcA11y(){if(typeof document==='undefined')return;const set=(e,k,v)=>{if(e&&e.setAttribute&&!(e.getAttribute&&e.getAttribute(k)))e.setAttribute(k,v);};
  ['run-now','run-coach','g-now','radio','l-fb','qz-fb','dr-fb','b-msg','d-msg','r-msg','m-session','rc','st-live'].forEach(id=>set(document.getElementById(id),'aria-live','polite'));
  if(document.querySelectorAll){document.querySelectorAll('.overlay').forEach(o=>{set(o,'role','dialog');set(o,'aria-modal','true');});document.querySelectorAll('.pad').forEach(p=>set(p,'role','button'));}}
function settingsBind(){pcA11y();const g=id=>document.getElementById(id);const ov=g('setov');if(!ov)return;ov.onclick=e=>{const b=e.target&&e.target.closest&&e.target.closest('[data-set] button');if(b)setSetting(b.closest('[data-set]').dataset.set,b.dataset.val);};const c=g('set-close');if(c)c.onclick=()=>ov.classList.add('hidden');const gear=g('h-set');if(gear)gear.onclick=()=>{settingsRender();ov.classList.remove('hidden');ov.scrollTop=0;};}
function motionOK(){if(settings().motion==='off')return false;try{if(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)return false;}catch(e){}return true;}
/* A score that counts up to its final value (about 0.6 s). Stamps data-final at once; without animation frames or with motion off it lands immediately. */
function countUp(el,to,ms){if(!el)return;if(el.setAttribute)el.setAttribute('data-final',String(to));if(el.dataset)el.dataset.final=String(to);const n=+to||0,raf=(typeof requestAnimationFrame==='function')?requestAnimationFrame:null;if(!raf||!motionOK()){el.textContent=String(to);return;}const t0=performance.now();const step=t=>{const p=Math.min(1,(t-t0)/(ms||600)),e=1-Math.pow(1-p,3);el.textContent=String(Math.round(n*e));if(p<1)raf(step);else el.textContent=String(to);};raf(step);}
function haptic(ms){if(settings().haptics!=='on')return false;try{if(typeof navigator!=='undefined'&&navigator.vibrate){navigator.vibrate(ms||8);return true;}}catch(e){}return false;}

/* ---------- Due-again spacing (from Charge the Line): clear an activity at 70+ and it's due again in 1, 3, 7, 14, then 30 days. A miss resets. ---------- */
const PC_INT=[1,3,7,14,30],PC_PASS=70;
function pcSpacing(runs,now){const list=(runs||[]).filter(r=>r&&r.d&&Number.isFinite(+r.score)).slice().sort((a,b)=>String(a.d).localeCompare(String(b.d)));
  if(!list.length)return {status:'never',level:0,last:null,dueAt:null,dueIn:null};
  let level=0;for(const r of list){level=(+r.score>=PC_PASS)?Math.min(level+1,PC_INT.length):0;}
  const last=list[list.length-1],lastT=Date.parse(last.d),nowT=now?+new Date(now):Date.now();
  if(level===0)return {status:'missed',level:0,last:last.d,dueAt:last.d,dueIn:0};
  const dueT=lastT+PC_INT[level-1]*864e5,dueIn=Math.ceil((dueT-nowT)/864e5);
  return {status:dueIn<=0?'due':'ok',level,last:last.d,dueAt:new Date(dueT).toISOString(),dueIn};}
/* Best and most recent score from earlier runs of the same activity (pass the runs BEFORE recording the new one). */
function pcBestPrev(runs){const list=(runs||[]).filter(r=>r&&Number.isFinite(+r.score));const byD=list.filter(r=>r.d).slice().sort((a,b)=>String(a.d).localeCompare(String(b.d)));
  return {best:list.length?Math.max(...list.map(r=>+r.score)):null,prev:byD.length?+byD[byD.length-1].score:null,n:list.length};}

/* ---------- Debrief 2.0: the body of every result screen. The app keeps its own title, score element (use countUp on it), and buttons. ---------- */
function pcDebriefBody(o){o=o||{};const P=[];
  if(o.compare){const c=o.compare;let line;if(!c.n)line='Your first run of this one.';else{line=(c.best!==null?'Best '+c.best:'')+(c.prev!==null?(c.best!==null?' · ':'')+'last time '+c.prev:'');if(o.score!==undefined&&o.score!==null&&c.best!==null&&+o.score>c.best)line+=' · new best';}
    P.push(`<p class="pc-compare">${pcEsc(line)}</p>`);}
  if(o.kicker)P.push(`<p class="pc-kicker">${pcEsc(o.kicker)}</p>`);
  if(o.metrics&&o.metrics.length)P.push(`<table class="pc-table pc-metrics">${o.metrics.map(([a,b])=>`<tr><td class="l">${pcEsc(a)}</td><td>${pcEsc(b)}</td></tr>`).join('')}</table>`);
  if(o.feedback&&o.feedback.length)P.push(`<div class="pc-sec">What cost points</div><ul class="pc-feedback">${o.feedback.map(f=>`<li>${pcEsc(f)}</li>`).join('')}</ul>`);
  else if(o.clean!==false)P.push(`<p class="pc-clean">Clean run.</p>`);
  if(o.lessons&&o.lessons.length)P.push(`<div class="pc-sec">Learn from it</div><div class="chips pc-lessons">${o.lessons.map(l=>`<button class="chip warn warnchip pc-chip" data-k="${pcEsc(l.k)}">${pcEsc(l.name)}</button>`).join('')}</div>`);
  if(o.steps&&o.steps.length)P.push(`<div class="pc-sec">Your steps</div><table class="pc-table pc-steps">${o.steps.map(s=>`<tr><td>${s.ok?'<b class="pc-ok">✓</b>':'<b class="pc-miss">'+(s.missed?'✗':'⚠')+'</b>'} ${pcEsc(s.name)}${s.detail?` <span class="pc-detail">· ${pcEsc(s.detail)}</span>`:''}</td><td>${s.at===undefined||s.at===null?'':pcEsc(s.at)}</td></tr>`).join('')}</table>`);
  if(o.extra)P.push(o.extra);
  return P.join('');}
/* ---------- Shared engines (Milestone 5): lesson slides with a check, and multiple-choice quizzes (exam practice, drills). Apps keep their own overlays, records and statistics calls. ---------- */
function pcShuf(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
/* Lesson: cfg = {slides:[{t,pts,q,o:[[text,'good'|'partial'|'bad']],why,art?}], ov?, box?, label?, point?(text)->html, art?(key)->html, onDone(score,right,total), onQuit()} */
function pcLessonStart(cfg){const S={i:0,first:{},answered:false,ord:[],cfg,t0:Date.now()};const ov=document.getElementById(cfg.ov||'lessonov');if(ov)ov.classList.remove('hidden');pcLessonRender(S);return S;}
function pcLessonRender(S){const c=S.cfg,L=c.slides,s=L[S.i];S.answered=false;S.ord=pcShuf(s.o.map((o,k)=>k));const box=document.getElementById(c.box||'lesson-box');if(!box)return;const tv=!!(document.body&&document.body.classList&&document.body.classList.contains('tv'));
  box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><span class="tag">${pcEsc(c.label||'Lesson')} · ${S.i+1} of ${L.length}</span><button data-l="tv" style="padding:6px 10px;font-size:13px">${tv?'Phone view':'Big-screen view'}</button></div>
   <h2>${pcEsc(s.t)}</h2>${s.art&&c.art?`<div class="art">${c.art(s.art)}</div>`:''}<ul>${s.pts.map(x=>`<li>${c.point?c.point(x):pcEsc(x)}</li>`).join('')}</ul>
   <div style="border-top:1px solid var(--line,#2a2f37);padding-top:10px"><p style="font-size:14px;color:var(--soft,#aab2bd);margin:0 0 4px">Check your understanding</p><p style="font-size:17px;font-weight:700;margin:0 0 8px">${pcEsc(s.q)}</p>
   ${S.ord.map(k=>`<button class="opt" data-l="ans" data-k="${k}">${pcEsc(s.o[k][0])}</button>`).join('')}<p id="l-fb" style="font-size:15px"></p></div>
   <div class="dots">${L.map((_,k)=>`<i class="${k<=S.i?'on2':''}"></i>`).join('')}</div>
   <div class="row"><button data-l="prev" ${S.i?'':'disabled'}>Back</button><button class="go" data-l="next" id="l-next" disabled>${S.i+1<L.length?'Next':'Finish'}</button></div>
   <button data-l="quit" style="width:100%;margin-top:8px">Leave the lesson</button>`;const ov=document.getElementById(c.ov||'lessonov');if(ov)ov.scrollTop=0;}
function pcLessonAct(S,ds){if(!S)return;const c=S.cfg,L=c.slides,a=ds.l,g=id=>document.getElementById(id);
  if(a==='ans'){if(S.answered)return;const s=L[S.i],o=s.o[+ds.k];if(!o)return;const ok=o[1]==='good';if(S.first[S.i]===undefined)S.first[S.i]=ok;if(ok)pcCue('good');else pcFx('bad');if(ok){S.answered=true;const n=g('l-next');if(n)n.disabled=false;}const fb=g('l-fb');if(fb)fb.innerHTML=`<b style="color:${ok?'#7fe3a4':o[1]==='partial'?'#ffc23d':'#ff9a96'}">${ok?'Right.':o[1]==='partial'?'Not quite.':'No.'}</b> ${pcEsc(ok?s.why:'Try again.')}`;}
  else if(a==='next'){if(!S.answered)return;if(S.i+1<L.length){S.i++;pcLessonRender(S);}else{const right=Object.values(S.first).filter(Boolean).length;const ov=g(c.ov||'lessonov');if(ov)ov.classList.add('hidden');if(c.onDone)c.onDone(Math.round(right/L.length*100),right,L.length);}}
  else if(a==='prev'){if(S.i){S.i--;pcLessonRender(S);}}
  else if(a==='tv'){if(document.body&&document.body.classList)document.body.classList.toggle('tv');pcLessonRender(S);}
  else if(a==='quit'){const ov=g(c.ov||'lessonov');if(ov)ov.classList.add('hidden');if(c.onQuit)c.onQuit();}}
/* Quiz: cfg = {name, qs:[{q,a,d:[distractors],why?}], kind, id, ov?, titleEl?, metaEl?, bodyEl?, footEl?, why?, note?(score)->text, quitLabel?, menuAction?, menuLabel?, onDone(score,right,total), onQuit()}.
   Renders data-q buttons; the app's click handler passes the dataset to pcQuizAct and handles its own extra actions first. Every option list is shuffled once. */
function pcQuizStart(cfg){const qs=cfg.qs.map(x=>Object.assign({},x,{ord:pcShuf([x.a,...x.d])}));const S={cfg,qs,i:0,right:0,kind:cfg.kind,id:cfg.id,name:cfg.name};const ov=document.getElementById(cfg.ov||'quizov');if(ov)ov.classList.remove('hidden');pcQuizQ(S);return S;}
function pcQuizQ(S){const c=S.cfg,q=S.qs[S.i],g=id=>document.getElementById(id);const t=g(c.titleEl||'qz-title'),m=g(c.metaEl||'qz-meta');if(t)t.textContent=c.name;if(m)m.textContent=`${S.i+1} of ${S.qs.length} · ${S.right} right`;
  const b=g(c.bodyEl||'qz-body');if(b)b.innerHTML=`<p style="font-size:18px;margin:0 0 10px">${pcEsc(q.q)}</p>${q.ord.map((o,i)=>`<button class="opt" data-q="ans" data-i="${i}">${pcEsc(o)}</button>`).join('')}<p id="qz-fb" style="font-size:15px"></p>`;const f=g(c.footEl||'qz-foot');if(f)f.innerHTML=`<button data-q="quit" style="width:100%">${pcEsc(c.quitLabel||'Quit')}</button>`;}
function pcQuizAct(S,ds){if(!S||!S.cfg)return false;const c=S.cfg,a=ds.q,g=id=>document.getElementById(id);
  if(a==='quit'){if(c.onQuit)c.onQuit();else{const ov=g(c.ov||'quizov');if(ov)ov.classList.add('hidden');}return true;}
  if(a==='ans'){const q=S.qs[S.i];if(!q||q.done)return true;q.done=true;const ok=q.ord[+ds.i]===q.a;if(ok)S.right++;if(ok)pcCue('good');else pcFx('bad');const fb=g('qz-fb');if(fb)fb.innerHTML=`<b style="color:${ok?'#7fe3a4':'#ff9a96'}">${ok?'Right.':'Answer: '+pcEsc(q.a)+'.'}</b> ${pcEsc(q.why||c.why||'')}`;const f=g(c.footEl||'qz-foot');if(f)f.innerHTML=`<button data-q="next" class="go" style="width:100%">${S.i+1<S.qs.length?'Next':'Results'}</button>`;return true;}
  if(a==='next'){S.i++;if(S.i<S.qs.length)pcQuizQ(S);else{const sc=Math.round(S.right/S.qs.length*100);S.score=sc;const b=g(c.bodyEl||'qz-body');if(b)b.innerHTML=`<div class="big">${sc}</div><p>${S.right} of ${S.qs.length} right.${c.note?' '+pcEsc(c.note(sc)):''}</p>`;const f=g(c.footEl||'qz-foot');if(f)f.innerHTML=`<div class="row"><button data-q="${c.menuAction||'quit'}">${pcEsc(c.menuLabel||'Done')}</button><button data-q="again" class="go">Again</button></div>`;if(c.onDone)c.onDone(sc,S.right,S.qs.length);}return true;}
  return false;}
/* The Station look shared by every app (Milestone 4) plus the debrief styles, injected once in <head>; each app's own tokens apply, with safe fallbacks. */
/* ===== Sound and haptics (Milestone 6): short synthesized cues, no audio files, gated by the shared switches (sound off by default, haptics on). pcCue(name) plays tick, good, bad, done, breathe or warn; pcBuzz(name) vibrates a pattern; pcFx(name) does both. pcMetro(bpm) runs a drift-free metronome on the audio clock; pcMetro(0) stops it. iOS only starts audio inside a tap, so the first pointerdown on any page resumes the context. ===== */
let PC_AC=null,PC_METRO=null;
function pcAudio(){if(typeof window==='undefined')return null;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!PC_AC){try{PC_AC=new AC();}catch(e){return null;}}try{if(PC_AC.state==='suspended'&&PC_AC.resume)PC_AC.resume();}catch(e){}return PC_AC;}
const PC_CUES={tick:[[880,.03,.08,'square']],good:[[660,.06,.12],[990,.07,.14]],bad:[[220,.12,.18,'sawtooth']],done:[[523,.08,.15],[659,.08,.15],[784,.14,.2]],breathe:[[440,.18,.14]],warn:[[330,.07,.12,'triangle'],[330,.07,.12,'triangle']]};
function pcTone(ac,f,at,dur,gain,type){try{const o=ac.createOscillator(),g=ac.createGain();o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(0.0001,at);g.gain.exponentialRampToValueAtTime(gain,at+.008);g.gain.exponentialRampToValueAtTime(0.0001,at+dur);o.connect(g);g.connect(ac.destination);o.start(at);o.stop(at+dur+.02);}catch(e){}}
function pcCue(name){if(settings().sound!=='on')return false;const seq=PC_CUES[name];if(!seq)return false;const ac=pcAudio();if(!ac)return false;let t=ac.currentTime+.01;for(const [f,dur,gain,type] of seq){pcTone(ac,f,t,dur,gain,type);t+=dur+.04;}return true;}
const PC_BUZZ={tick:[8],good:[12],bad:[30,40,30],done:[20,60,20,60,40],warn:[20,30,20],breathe:[15]};
function pcBuzz(name){const p=PC_BUZZ[name];if(!p||settings().haptics!=='on')return false;try{if(typeof navigator!=='undefined'&&navigator.vibrate){navigator.vibrate(p);return true;}}catch(e){}return false;}
function pcFx(name){const s=pcCue(name),h=pcBuzz(name);return s||h;}
function pcMetro(bpm){if(PC_METRO){try{clearInterval(PC_METRO.iv);}catch(e){}PC_METRO=null;}if(!bpm||settings().sound!=='on')return false;const ac=pcAudio();if(!ac)return false;const period=60/bpm;let next=ac.currentTime+.05;
  const sched=()=>{let n=0;while(next<ac.currentTime+.3&&n++<8){pcTone(ac,880,next,.03,.08,'square');next+=period;}};
  PC_METRO={bpm,iv:setInterval(sched,100)};sched();return true;}
function pcMetroState(){return PC_METRO;}
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('pointerdown',()=>{if(settings().sound==='on')pcAudio();},{passive:true});

/* ===== Drill Night (Milestone 7): one instructor, a roster, and every module credits whoever is up. The session lives in localStorage 'preconnect-drill' = {on, inst, org, roster[], who, start}; names stay on the phone and never reach statistics. Each page carries <div id="pc-drill" class="pc-drillbar hidden"> and <div class="overlay hidden" id="pc-drillov"><div class="box" id="pc-drillbox"></div></div>, calls pcDrillBind() at boot, and wraps each saved run in pcDrillStamp(). ===== */
const PC_DRILLKEY='preconnect-drill';
function pcDrillRaw(){try{return JSON.parse(localStorage.getItem(PC_DRILLKEY))||{};}catch(e){return {};}}
function pcDrillSave(d){try{localStorage.setItem(PC_DRILLKEY,JSON.stringify(d));}catch(e){}}
function pcDrill(){const d=pcDrillRaw();return d&&d.on?d:null;}
function pcDrillStart(inst,roster,org){const d=pcDrillRaw();const names=(roster||[]).map(x=>String(x||'').trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);
  Object.assign(d,{on:true,inst:String(inst||'').trim(),org:String(org||'').trim(),roster:names,who:'',start:new Date().toISOString()});delete d.ended;pcDrillSave(d);return d;}
function pcDrillEnd(){const d=pcDrillRaw();d.on=false;d.who='';d.ended=new Date().toISOString();pcDrillSave(d);return d;}
function pcDrillWho(name){const d=pcDrillRaw();if(name!==undefined){name=String(name||'').trim();d.who=name;if(name&&!(d.roster||[]).includes(name))d.roster=(d.roster||[]).concat([name]);pcDrillSave(d);}return d.on?(d.who||''):'';}
function pcDrillStamp(run){const d=pcDrill();if(!d||!run)return run;if(d.who)run.who=[d.who];if(d.inst)run.inst=d.inst;run.night=d.start;return run;}
function pcDrillBar(){const g=id=>document.getElementById(id);const bar=g('pc-drill');if(!bar)return;const d=pcDrill();bar.classList.toggle('hidden',!d);if(!d)return;
  const hub=(bar.dataset&&bar.dataset.hub)||'../';const who=d.who||'';
  const h=`<span class="pc-drill-tag">DRILL NIGHT</span><button class="pc-drill-who" data-drill="pick">${who?'Up: '+pcEsc(who):'Who\'s up? Tap to pick'}</button><a class="pc-drill-link" href="${pcEsc(hub)}"${hub==='#'?' data-drill="hub"':''}>Board</a>`;
  if(bar.innerHTML!==h)bar.innerHTML=h;}
function pcDrillPick(){const g=id=>document.getElementById(id);const ov=g('pc-drillov'),box=g('pc-drillbox');if(!ov||!box)return;const d=pcDrill();if(!d)return;
  box.innerHTML=`<div class="sec" style="margin-top:0">Who's up?</div><p class="small" style="margin:0 0 8px">Runs are credited to this person until you switch.</p>`+(d.roster||[]).map(n=>`<button class="pc-drill-name${d.who===n?' on':''}" data-drill="who" data-n="${pcEsc(n)}">${pcEsc(n)}</button>`).join('')
    +`<div class="flex" style="margin-top:10px"><input id="pc-drill-new" placeholder="Add a name" style="flex:1;min-width:0"><button data-drill="add">Add</button></div><div class="flex" style="margin-top:10px"><button data-drill="none" style="flex:1">Nobody, just practicing</button><button class="go" data-drill="close" style="flex:1">Done</button></div>`;
  ov.classList.remove('hidden');}
function pcDrillAct(a,b){const g=id=>document.getElementById(id);const ov=g('pc-drillov');
  if(a==='pick')pcDrillPick();else if(a==='who'){pcDrillWho(b&&b.dataset?b.dataset.n:'');pcDrillBar();if(ov)ov.classList.add('hidden');}
  else if(a==='add'){const inp=g('pc-drill-new');const n=(inp&&inp.value||'').trim();if(!n)return;pcDrillWho(n);pcDrillBar();if(ov)ov.classList.add('hidden');}
  else if(a==='none'){pcDrillWho('');pcDrillBar();if(ov)ov.classList.add('hidden');}else if(a==='close'){if(ov)ov.classList.add('hidden');}
  else if(a==='hub'){if(typeof window!=='undefined'&&typeof window.onPcDrillHub==='function')window.onPcDrillHub();}}
function pcDrillBind(){const g=id=>document.getElementById(id);const bar=g('pc-drill'),ov=g('pc-drillov');if(!bar||!ov)return;
  const h=e=>{const b=e&&e.target&&e.target.closest&&e.target.closest('[data-drill]');if(!b)return;pcDrillAct(b.dataset.drill,b);};bar.onclick=h;ov.onclick=h;
  pcDrillBar();const d=pcDrill();if(d&&!d.who&&!(bar.dataset&&bar.dataset.auto==='no'))pcDrillPick();}

const PC_LOOK_CSS=`html[data-contrast="high"]{--bg:#000;--deck:#0e1013;--deck2:#181b20;--line:#4b535e;--ink:#fff;--soft:#d6dce3}html[data-text="large"] body{zoom:1.12}
html[data-contrast="day"]{--bg:#000;--deck:#000;--deck2:#14181d;--line:#9aa5b1;--ink:#fff;--soft:#e6ebf0;--muted:#e6ebf0}html[data-contrast="day"] body{background:#000;color:#fff}html[data-contrast="day"] .card,html[data-contrast="day"] .scen{border:2px solid var(--line);border-left-width:5px}html[data-contrast="day"] button{border:2px solid var(--line)}html[data-contrast="day"] .go,html[data-contrast="day"] .warn,html[data-contrast="day"] .pad{border-color:#fff}html[data-contrast="day"] .small,html[data-contrast="day"] .stat,html[data-contrast="day"] .pc-table td.l{color:var(--soft)}html[data-contrast="day"] input,html[data-contrast="day"] textarea{border:2px solid var(--line);background:#000;color:#fff}
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid var(--acc,#ff7a1a);outline-offset:2px}
@media (orientation:landscape) and (max-height:520px){.overlay{padding-top:8px!important;padding-bottom:8px!important}.overlay .box{max-width:760px}.pad{min-height:100px}}
.sec{font-family:"Saira Condensed",sans-serif;font-weight:600;font-size:14px;letter-spacing:2.5px;text-transform:uppercase;color:var(--soft,#aab2bd);margin:22px 0 8px;display:flex;align-items:center;gap:10px}.sec:after{content:"";flex:1;height:1px;background:var(--line,#2a2f37)}
.chip{display:inline-block;font-family:"Saira Condensed",sans-serif;font-weight:600;font-size:14px;letter-spacing:.5px;padding:2px 8px;border-radius:4px;background:var(--acc,#ff7a1a);color:var(--acc-ink,#0a0c0f);white-space:nowrap;line-height:1.5}.chip.dim{background:var(--deck2,#1c2026);color:var(--soft,#aab2bd)}.chip.due{background:#ffc23d;color:#0a0c0f}
.num{font-family:"Saira Condensed",sans-serif;font-weight:700;font-size:34px;line-height:1;color:var(--acc,#ff7a1a)}.small{font-size:13px;color:var(--soft,#aab2bd)}.flex{display:flex;align-items:center;gap:12px}.sp{flex:1}
.seg{display:flex;gap:3px;margin-top:8px}.seg i{flex:1;height:8px;background:var(--line,#2a2f37);border-radius:1px}.seg i.on{background:var(--acc,#ff7a1a);transform-origin:left;animation:fill .5s ease-out both}@keyframes fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes slidein{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}.in{animation:slidein .25s ease-out both}
.set{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line,#2a2f37)}.set:first-of-type{border-top:0}.set .k{font-size:16px}.set .k small{display:block;font-size:13px;color:var(--soft,#aab2bd);line-height:1.35}
.seg2{display:inline-flex;border:2px solid var(--line,#2a2f37);border-radius:6px;overflow:hidden;flex:none}.seg2 button{border:0;border-radius:0;min-height:46px;padding:8px 12px;font-family:"Saira Condensed",sans-serif;font-weight:600;font-size:15px;text-transform:uppercase;letter-spacing:.5px;background:transparent;color:var(--ink,#f6f7f9)}.seg2 button.on{background:var(--ink,#f6f7f9)!important;border-color:var(--ink,#f6f7f9)!important;color:#0a0c0f!important}
.gear{min-height:46px;padding:8px 10px;font-family:"Saira Condensed",sans-serif;font-weight:600;font-size:15px;letter-spacing:.5px;text-transform:uppercase;background:transparent;border:2px solid var(--line,#2a2f37);color:var(--ink,#f6f7f9);border-radius:6px}
.pc-drillbar{display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:6px 8px;border:1px solid #7a5cff;border-radius:8px;background:#1b1535}.pc-drillbar.hidden{display:none}.pc-drill-tag{font-family:"Saira Condensed",sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;color:#c9b8ff;white-space:nowrap}
.pc-drill-who{flex:1;min-width:0;min-height:44px;text-align:left;background:#3b2a6b;border:2px solid #7a5cff;color:#fff;border-radius:6px;padding:6px 10px;font-family:inherit;font-size:15px;font-weight:700;text-transform:none;letter-spacing:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-drill-link{color:#c9b8ff;font-size:14px;font-weight:700;text-decoration:none;min-height:44px;display:inline-flex;align-items:center;padding:0 6px}.pc-drill-name{display:block;width:100%;text-align:left;margin:6px 0;min-height:48px;font-size:17px;text-transform:none;letter-spacing:0}.pc-drill-name.on{border-color:#7a5cff;background:#3b2a6b;color:#fff}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}html[data-motion="off"] *{animation:none!important;transition:none!important}`;
function pcInstallCSS(){if(typeof document==='undefined'||!document.head||!document.createElement||document.getElementById('pc-core-css'))return;const st=document.createElement('style');st.id='pc-core-css';
  st.textContent=PC_LOOK_CSS+'.pc-sec{font-family:"Saira Condensed","Barlow Condensed","Arial Narrow",sans-serif;font-weight:600;font-size:14px;letter-spacing:2.5px;text-transform:uppercase;color:var(--soft,#aab2bd);margin:14px 0 6px;display:flex;align-items:center;gap:10px}.pc-sec:after{content:"";flex:1;height:1px;background:var(--line,#2a2f37)}'
  +'.pc-table{width:100%;border-collapse:collapse;font-size:15px}.pc-table td{padding:8px 0;border-top:1px solid var(--line,#2a2f37);vertical-align:top}.pc-table tr:first-child td{border-top:0}.pc-table td.l{color:var(--soft,#aab2bd)}.pc-table td:last-child{text-align:right;font-family:"Saira Condensed","Barlow Condensed","Arial Narrow",sans-serif;font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;padding-left:10px}'
  +'.pc-compare{font-size:14px;color:var(--soft,#aab2bd);margin:0 0 8px}.pc-kicker{font-size:15px;line-height:1.45;margin:0 0 10px}.pc-feedback{margin:0;padding-left:18px;font-size:15px;line-height:1.45}.pc-clean{font-size:15px;color:var(--soft,#aab2bd);margin:8px 0 0}.pc-ok{color:#7fe3a4}.pc-miss{color:#ffc23d}.pc-detail{color:var(--soft,#aab2bd)}';
  document.head.appendChild(st);}
/* CSV cells (final sweep, milestone 1). A spreadsheet runs a cell that starts with = + - @ (or a tab or return) as a
   formula, so a typed name like =HYPERLINK(...) would execute when a department opens the record. Such cells get a
   leading apostrophe (the spreadsheet shows it as text); quotes are doubled; every cell is quoted. Every CSV writer
   on the platform goes through pcCsv. */
function pcCsvCell(v){v=v===undefined||v===null?'':String(v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function pcCsv(rows){return rows.map(r=>r.map(pcCsvCell).join(',')).join('\n');}
pcInstallCSS();
