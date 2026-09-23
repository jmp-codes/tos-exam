const fs=require('fs'); const AI=require('./bloom-model.js'); const L=AI.LEVELS; const COL={Remembering:0,Understanding:0,Applying:1,Analyzing:1,Evaluating:2,Creating:2};
const ex=[]; for(const l of L) [`data/${l.toLowerCase()}.txt`,`data/${l.toLowerCase()}_2.txt`].filter(p=>fs.existsSync(p)).map(p=>fs.readFileSync(p,'utf8')).join('\n').split('\n').map(s=>s.trim()).filter(Boolean).forEach(t=>ex.push({text:t,level:l}));
const src=fs.readFileSync('../questions.js','utf8'); const verbLevel=new Function(src.slice(src.indexOf('const BLOOM'),src.indexOf('let qView'))+'; return verbLevel;')();
const model=AI.train(ex,{epochs:40,lr:0.5,l2:0.001});
const hard=fs.readFileSync('hard.tsv','utf8').trim().split('\n').map(l=>l.split('\t'));
let a6=0,a3=0,k6=0,k3=0; const miss=[];
for(const [lv,t] of hard){ const p=AI.predict(model,t), v=verbLevel(t);
  if(p.level===lv)a6++; if(COL[p.level]===COL[lv])a3++; else miss.push(`${lv} → AI:${p.level} (${(p.confidence*100)|0}%) | ${t.slice(0,60)}`);
  if(v&&v.level===lv)k6++; if(v&&v.col===COL[lv])k3++; }
const n=hard.length;
console.log(`Hard set (${n}): Our AI 6-level ${(100*a6/n).toFixed(0)}%  3-column ${(100*a3/n).toFixed(0)}%  | Keywords 6-level ${(100*k6/n).toFixed(0)}%  3-column ${(100*k3/n).toFixed(0)}%`);
console.log(miss.join('\n')); fs.writeFileSync('model.json',JSON.stringify(model)); console.log('model size',(fs.statSync('model.json').size/1024|0),'KB');
