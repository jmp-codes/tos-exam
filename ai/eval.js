const fs=require('fs'); const AI=require('./bloom-model.js');
const L=AI.LEVELS; const COL={Remembering:0,Understanding:0,Applying:1,Analyzing:1,Evaluating:2,Creating:2};
const ex=[]; for(const l of L){ fs.readFileSync(`data/${l.toLowerCase()}.txt`,'utf8').split('\n').map(s=>s.trim()).filter(Boolean).forEach(t=>ex.push({text:t,level:l})); }
// keyword baseline from the app
const src=fs.readFileSync('../questions.js','utf8'); const kw=src.slice(src.indexOf('const BLOOM'), src.indexOf('let qView'));
const verbLevel=new Function(kw+'; return verbLevel;')();
let seed=3; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const byL={}; ex.forEach(e=>(byL[e.level]=byL[e.level]||[]).push(e)); Object.values(byL).forEach(a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}});
const F=5; const folds=[...Array(F)].map(()=>[]); Object.values(byL).forEach(a=>a.forEach((e,i)=>folds[i%F].push(e)));
const opts={epochs:+process.argv[2]||60,lr:+process.argv[3]||0.5,l2:+(process.argv[4]??1e-4)};
let m6=0,m3=0,k6=0,k3=0,kn=0,n=0; const conf={}; const t0=Date.now();
for(let f=0;f<F;f++){
  const trainSet=folds.filter((_,i)=>i!==f).flat(), test=folds[f];
  const model=AI.train(trainSet,opts);
  for(const e of test){ n++; const p=AI.predict(model,e.text);
    if(p.level===e.level) m6++; if(COL[p.level]===COL[e.level]) m3++;
    const key=e.level+'→'+p.level; conf[key]=(conf[key]||0)+1;
    const v=verbLevel(e.text); if(!v) kn++; else { if(v.level===e.level) k6++; if(v.col===COL[e.level]) k3++; } }
}
console.log(`opts ${JSON.stringify(opts)}  time ${(Date.now()-t0)/F|0} ms/train`);
console.log(`Our AI      6-level ${(100*m6/n).toFixed(1)}%   3-column ${(100*m3/n).toFixed(1)}%`);
console.log(`Keywords    6-level ${(100*k6/n).toFixed(1)}%   3-column ${(100*k3/n).toFixed(1)}%   (no keyword: ${kn})`);
if(process.argv[5]) console.log(Object.entries(conf).filter(([k])=>k.split('→')[0]!==k.split('→')[1]).sort((a,b)=>b[1]-a[1]).slice(0,12));
