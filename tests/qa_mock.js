// Headless test harness: loads ../index.html into a fake DOM so bots can play the real game logic.
const fs=require('fs');
function boot(storeInit){
const html=fs.readFileSync(process.env.APP||require('path').join(__dirname,'..','index.html'),'utf8');
const js=html.split('<script>')[1].split('</script>')[0];
const els={};
function mk(id){const e={id,_cls:new Set(),style:{},dataset:{},textContent:'',innerHTML:'',value:'',disabled:false,_lab:null,children:[],
  classList:{add:c=>e._cls.add(c),remove:c=>e._cls.delete(c),toggle:(c,v)=>{(v===undefined?!e._cls.has(c):v)?e._cls.add(c):e._cls.delete(c)},contains:c=>e._cls.has(c)},
  querySelector(){if(!e._lab)e._lab=mk(id+'-lab');return e._lab;},querySelectorAll:()=>[],prepend(){},insertAdjacentHTML(){},focus(){},select(){},setAttribute(){},appendChild(){},remove(){},closest:()=>null,click(){}};
  Object.defineProperty(e,'lastChild',{get:()=>({remove(){}})});return e;}
for(const m of html.matchAll(/<[a-z0-9]+([^>]*?)id="([^"]+)"([^>]*)>/g)){const e=mk(m[2]);const attrs=m[1]+' '+m[3];const cm=attrs.match(/class="([^"]*)"/);if(cm)cm[1].split(/\s+/).forEach(c=>c&&e._cls.add(c));els[m[2]]=e;}
const missing=new Set();const store=Object.assign({},storeInit||{});
global.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);}};
global.document={body:mk('body'),addEventListener(){},getElementById:i=>{if(!els[i]){missing.add(i);els[i]=mk(i);}return els[i];},querySelectorAll:()=>[],createElement:()=>mk('x')};
global.window=Object.assign(global.window||{},{addEventListener(){}});global.location=Object.assign({protocol:'file:'},global.__loc||{});
Object.defineProperty(globalThis,'navigator',{value:{userAgent:'qa-bot',clipboard:{writeText:async t=>{global.__clip=t;}}},configurable:true,writable:true});
global.performance={now:()=>0};global.setInterval=()=>{};
global.Blob=function(parts){this.text=parts.join('');global.__blob=this.text;};global.URL={createObjectURL:()=>'blob:x'};
const api=new Function(require('fs').readFileSync(require('path').join(__dirname,'..','preconnect-core.js'),'utf8')+'\n'+js+';return {render,pcPauseHide,pcPauseShow,pcOnPause,intakeVal,resDemand,addSteps,ffRun,ffStep,evCam,addDecision,mss,RADIO_N:()=>RADIO_N,learnRows,dueInfo,ding,pcCue,pcBuzz,pcFx,pcDrill,pcDrillStart,pcDrillWho,pcDrillStamp,pcDrillBar,pcDrillBind,pcDrillPick,instOn,VARIANTS,applyVariant,pickVariant,inject,INJECTS,instOpen,instClose,instAct,instSync,INST:()=>INST,setInst:v=>{INST=v;instSync();},INSTHOLD:()=>INSTHOLD,relayBand,LINE,LINE_DEF,RELAY,resetLayout,faults,applyFault,NOZ,FLC,learnRows,pcShuf,pcLessonStart,pcLessonAct,pcQuizStart,pcQuizAct,LESSON,DRILLS,GUIDE_ALL:GUIDE,lessonStart,lessonAct,LS:()=>LS,drillMenu,drillStart,quizAct,QZ:()=>QZ,flOf,recordX,showBrief,finish,settings,setSetting,pcSpacing,pcBestPrev,pcDebriefBody,GUIDE,DECG,missionControls,incidentKey,openCard,enterLearn,exitLearn,LEARN:()=>LEARN,S,CAMP,loadCampaign,tick,stepsDone:()=>stepsDone,DEC:()=>DEC,setValve,$,residual,supplied,linePsi,totalFlow,snapshot,pdp,describe,load,save,showMenu,setTier:t=>{TIER=t;},VALVES,dischargesClosed};')();
return {api,els,missing,store};}
module.exports={boot};
