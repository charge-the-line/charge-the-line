/* preconnect-core 1.2.0 sha256:5291e4448653cd0c2aca726816106004de7c0ad2b098079cdffaf46d4ea6179e */
/* Preconnect shared core. ONE file, copied byte-for-byte into every repo (the hub and all four modules).
   Rules: no build step, no module system, plain script. Top-level functions become globals the app's own script calls.
   Edit it in one repo, copy it to the others, and regenerate the header hash (tests/core_hash.js in the hub, or any suite tells you the hash it expected).
   Never define $ or esc here: every app has its own. */
const PCORE_VERSION='1.2.0';
function pcEsc(t){return String(t===undefined||t===null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ---------- Settings: one sheet, one key ('preconnect-settings'), honored by every module. Statistics use the Privacy page's key. ---------- */
const SETKEY='preconnect-settings',SETDEF={sound:'off',haptics:'on',text:'normal',contrast:'normal',motion:'auto'};
function settings(){let s={};try{s=JSON.parse(localStorage.getItem(SETKEY))||{};}catch(e){}const out=Object.assign({},SETDEF,s);let st='on';try{st=localStorage.getItem('preconnect-stats')==='off'?'off':'on';}catch(e){}out.stats=st;return out;}
function setSetting(k,v){if(k==='stats'){try{if(v==='off')localStorage.setItem('preconnect-stats','off');else localStorage.removeItem('preconnect-stats');}catch(e){}try{if(window.PCA)window.PCA.off=(v==='off');}catch(e){}}
  else{let s={};try{s=JSON.parse(localStorage.getItem(SETKEY))||{};}catch(e){}s[k]=v;try{localStorage.setItem(SETKEY,JSON.stringify(s));}catch(e){}}
  applySettings();settingsRender();try{if(typeof window!=='undefined'&&typeof window.onPreconnectSettings==='function')window.onPreconnectSettings(settings());}catch(e){}}
function applySettings(){const s=settings();const de=(typeof document!=='undefined')&&document.documentElement;if(!de||!de.dataset)return;de.dataset.text=s.text;de.dataset.contrast=s.contrast;de.dataset.motion=s.motion;}
function settingsRender(){const s=settings();if(typeof document==='undefined'||!document.querySelectorAll)return;document.querySelectorAll('[data-set]').forEach(g=>{const k=g.dataset.set;g.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.val===s[k]));});}
function settingsBind(){const g=id=>document.getElementById(id);const ov=g('setov');if(!ov)return;ov.onclick=e=>{const b=e.target&&e.target.closest&&e.target.closest('[data-set] button');if(b)setSetting(b.closest('[data-set]').dataset.set,b.dataset.val);};const c=g('set-close');if(c)c.onclick=()=>ov.classList.add('hidden');const gear=g('h-set');if(gear)gear.onclick=()=>{settingsRender();ov.classList.remove('hidden');ov.scrollTop=0;};}
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
  if(a==='ans'){if(S.answered)return;const s=L[S.i],o=s.o[+ds.k];if(!o)return;const ok=o[1]==='good';if(S.first[S.i]===undefined)S.first[S.i]=ok;if(ok){S.answered=true;const n=g('l-next');if(n)n.disabled=false;}const fb=g('l-fb');if(fb)fb.innerHTML=`<b style="color:${ok?'#7fe3a4':o[1]==='partial'?'#ffc23d':'#ff9a96'}">${ok?'Right.':o[1]==='partial'?'Not quite.':'No.'}</b> ${pcEsc(ok?s.why:'Try again.')}`;}
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
  if(a==='ans'){const q=S.qs[S.i];if(!q||q.done)return true;q.done=true;const ok=q.ord[+ds.i]===q.a;if(ok)S.right++;const fb=g('qz-fb');if(fb)fb.innerHTML=`<b style="color:${ok?'#7fe3a4':'#ff9a96'}">${ok?'Right.':'Answer: '+pcEsc(q.a)+'.'}</b> ${pcEsc(q.why||c.why||'')}`;const f=g(c.footEl||'qz-foot');if(f)f.innerHTML=`<button data-q="next" class="go" style="width:100%">${S.i+1<S.qs.length?'Next':'Results'}</button>`;return true;}
  if(a==='next'){S.i++;if(S.i<S.qs.length)pcQuizQ(S);else{const sc=Math.round(S.right/S.qs.length*100);S.score=sc;const b=g(c.bodyEl||'qz-body');if(b)b.innerHTML=`<div class="big">${sc}</div><p>${S.right} of ${S.qs.length} right.${c.note?' '+pcEsc(c.note(sc)):''}</p>`;const f=g(c.footEl||'qz-foot');if(f)f.innerHTML=`<div class="row"><button data-q="${c.menuAction||'quit'}">${pcEsc(c.menuLabel||'Done')}</button><button data-q="again" class="go">Again</button></div>`;if(c.onDone)c.onDone(sc,S.right,S.qs.length);}return true;}
  return false;}
/* The Station look shared by every app (Milestone 4) plus the debrief styles, injected once in <head>; each app's own tokens apply, with safe fallbacks. */
const PC_LOOK_CSS=`html[data-contrast="high"]{--bg:#000;--deck:#0e1013;--deck2:#181b20;--line:#4b535e;--ink:#fff;--soft:#d6dce3}html[data-text="large"] body{zoom:1.12}
.sec{font-family:"Saira Condensed",sans-serif;font-weight:600;font-size:14px;letter-spacing:2.5px;text-transform:uppercase;color:var(--soft,#aab2bd);margin:22px 0 8px;display:flex;align-items:center;gap:10px}.sec:after{content:"";flex:1;height:1px;background:var(--line,#2a2f37)}
.chip{display:inline-block;font-family:"Saira Condensed",sans-serif;font-weight:600;font-size:14px;letter-spacing:.5px;padding:2px 8px;border-radius:4px;background:var(--acc,#ff7a1a);color:var(--acc-ink,#0a0c0f);white-space:nowrap;line-height:1.5}.chip.dim{background:var(--deck2,#1c2026);color:var(--soft,#aab2bd)}.chip.due{background:#ffc23d;color:#0a0c0f}
.num{font-family:"Saira Condensed",sans-serif;font-weight:700;font-size:34px;line-height:1;color:var(--acc,#ff7a1a)}.small{font-size:13px;color:var(--soft,#aab2bd)}.flex{display:flex;align-items:center;gap:12px}.sp{flex:1}
.seg{display:flex;gap:3px;margin-top:8px}.seg i{flex:1;height:8px;background:var(--line,#2a2f37);border-radius:1px}.seg i.on{background:var(--acc,#ff7a1a);transform-origin:left;animation:fill .5s ease-out both}@keyframes fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes slidein{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}.in{animation:slidein .25s ease-out both}
.set{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line,#2a2f37)}.set:first-of-type{border-top:0}.set .k{font-size:16px}.set .k small{display:block;font-size:13px;color:var(--soft,#aab2bd);line-height:1.35}
.seg2{display:inline-flex;border:2px solid var(--line,#2a2f37);border-radius:6px;overflow:hidden;flex:none}.seg2 button{border:0;border-radius:0;min-height:46px;padding:8px 12px;font-family:"Saira Condensed",sans-serif;font-weight:600;font-size:15px;text-transform:uppercase;letter-spacing:.5px;background:transparent;color:var(--ink,#f6f7f9)}.seg2 button.on{background:var(--ink,#f6f7f9)!important;border-color:var(--ink,#f6f7f9)!important;color:#0a0c0f!important}
.gear{min-height:46px;padding:8px 10px;font-family:"Saira Condensed",sans-serif;font-weight:600;font-size:15px;letter-spacing:.5px;text-transform:uppercase;background:transparent;border:2px solid var(--line,#2a2f37);color:var(--ink,#f6f7f9);border-radius:6px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}html[data-motion="off"] *{animation:none!important;transition:none!important}`;
function pcInstallCSS(){if(typeof document==='undefined'||!document.head||!document.createElement||document.getElementById('pc-core-css'))return;const st=document.createElement('style');st.id='pc-core-css';
  st.textContent=PC_LOOK_CSS+'.pc-sec{font-family:"Saira Condensed","Barlow Condensed","Arial Narrow",sans-serif;font-weight:600;font-size:14px;letter-spacing:2.5px;text-transform:uppercase;color:var(--soft,#aab2bd);margin:14px 0 6px;display:flex;align-items:center;gap:10px}.pc-sec:after{content:"";flex:1;height:1px;background:var(--line,#2a2f37)}'
  +'.pc-table{width:100%;border-collapse:collapse;font-size:15px}.pc-table td{padding:8px 0;border-top:1px solid var(--line,#2a2f37);vertical-align:top}.pc-table tr:first-child td{border-top:0}.pc-table td.l{color:var(--soft,#aab2bd)}.pc-table td:last-child{text-align:right;font-family:"Saira Condensed","Barlow Condensed","Arial Narrow",sans-serif;font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;padding-left:10px}'
  +'.pc-compare{font-size:14px;color:var(--soft,#aab2bd);margin:0 0 8px}.pc-kicker{font-size:15px;line-height:1.45;margin:0 0 10px}.pc-feedback{margin:0;padding-left:18px;font-size:15px;line-height:1.45}.pc-clean{font-size:15px;color:var(--soft,#aab2bd);margin:8px 0 0}.pc-ok{color:#7fe3a4}.pc-miss{color:#ffc23d}.pc-detail{color:var(--soft,#aab2bd)}';
  document.head.appendChild(st);}
pcInstallCSS();
