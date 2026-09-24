const fs=require('fs'); const V2=require('./bloom-model.v2.js'), V3=require('./bloom-model.js');
const L=V3.LEVELS, COL={Remembering:0,Understanding:0,Applying:1,Analyzing:1,Evaluating:2,Creating:2};
const tsv=f=>fs.readFileSync(f,'utf8').trim().split('\n').map(l=>{const [lv,t]=l.split('\t');return {level:lv,text:t};});
const hand=[]; for(const l of L) for(const f of [`data/${l.toLowerCase()}.txt`,`data/${l.toLowerCase()}_2.txt`]) fs.readFileSync(f,'utf8').split('\n').map(s=>s.trim()).filter(Boolean).forEach(t=>hand.push({text:t,level:l}));
const hb=[...tsv('hard.tsv'),...tsv('blind.tsv')];
const gen=tsv('data/generated.tsv').map(e=>({...e,weight:+(process.argv[2]||0.5)}));
const b2=tsv('blind2.tsv'), b3=tsv('blind3.tsv');
const src=fs.readFileSync('../questions.js','utf8'); const verbLevel=new Function(src.slice(src.indexOf('const BLOOM'),src.indexOf('let qView'))+'; return verbLevel;')();
function score(pred,set){ let a6=0,a3=0; const miss=[]; for(const e of set){ const p=pred(e.text); if(!p){ continue;} if(p===e.level)a6++; if(COL[p]===COL[e.level])a3++; else miss.push(`${e.level}→${p}: ${e.text.slice(0,70)}`);} return {s6:Math.round(100*a6/set.length),s3:Math.round(100*a3/set.length),miss}; }
const O={epochs:40,lr:0.5,l2:0.001};
const cfgs=[
 ['Keyword check', null],
 ['v2 (words only, hand-written data)', ()=>{const m=V2.train([...hand,...hb],O); return t=>V2.predict(m,t).level;}],
 ['v3 + sentence patterns', ()=>{const m=V3.train([...hand,...hb],O); return t=>V3.predict(m,t).level;}],
 ['v3 + patterns + generated data', ()=>{const m=V3.train([...hand,...hb,...gen],O); return t=>V3.predict(m,t).level;}],
];
for(const [name,mk] of cfgs){
  const t0=Date.now(); const pred = mk? mk() : (t=>{const v=verbLevel(t); return v?v.level:'none';});
  const r2=score(pred,b2), r3=score(pred,b3);
  console.log(`${name.padEnd(36)} blind2 ${r2.s3}% (6-lvl ${r2.s6}%)   blind3 ${r3.s3}% (6-lvl ${r3.s6}%)   ${mk?((Date.now()-t0)+'ms'):''}`);
  if(process.argv[3]&&name.includes(process.argv[3])) console.log(r3.miss.join('\n'));
}
const tr=tsv(process.argv[5]||'tricky.tsv');
for(const [name,mk] of cfgs){ const pred = mk? mk() : (t=>{const v=verbLevel(t); return v?v.level:'none';}); const r=score(pred,tr);
  console.log(`TRICKY ${name.padEnd(36)} 3-col ${r.s3}%  6-lvl ${r.s6}%`); if(process.argv[4]&&name.includes(process.argv[4])) console.log('  '+r.miss.join('\n  ')); }
