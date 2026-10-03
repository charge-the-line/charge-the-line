const q=require('./qa.js');const {api}=q.env;const {CAMP}=api;let total=0,bad=0;const t0=Date.now();
for(let ci=0;ci<CAMP.length;ci++){let f=0;for(let k=0;k<100;k++){for(const tier of [0,1,2]){const r=q.play(ci,tier);total++;if(!r.ok){f++;bad++;}}}console.log(CAMP[ci].name.slice(0,44).padEnd(45),f?f+' FAILED':'300/300 complete');}
console.log(`\n${total} full playthroughs, ${bad} failures, ${((Date.now()-t0)/1000).toFixed(1)}s`);
