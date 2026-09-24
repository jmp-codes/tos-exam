const fs=require('fs'); const AI=require('./bloom-model.js'); const L=AI.LEVELS; const COL={Remembering:0,Understanding:0,Applying:1,Analyzing:1,Evaluating:2,Creating:2};
const tsv=f=>fs.readFileSync(f,'utf8').trim().split('\n').map(l=>l.split('\t'));
const ex=[]; for(const l of L) for(const f of [`data/${l.toLowerCase()}.txt`,`data/${l.toLowerCase()}_2.txt`,`data/${l.toLowerCase()}_3.txt`]) fs.readFileSync(f,'utf8').split('\n').map(s=>s.trim()).filter(Boolean).forEach(t=>ex.push({text:t,level:l}));
for(const f of ['hard.tsv','blind.tsv']) tsv(f).forEach(([lv,t])=>ex.push({text:t,level:lv}));
tsv('data/generated.tsv').forEach(([lv,t])=>ex.push({text:t,level:lv,weight:0.5}));
const m=AI.train(ex,{epochs:40,lr:0.5,l2:0.001});
let main=0,main3=0,alsoOk=0,both=0; const rows=tsv('dual.tsv');
for(const [mn,al,t] of rows){ const p=AI.predict(m,t); const a=p.also&&p.also.level;
  if(p.level===mn)main++; if(COL[p.level]===COL[mn])main3++; if(a===al)alsoOk++; if(new Set([p.level,a]).has(mn)&&new Set([p.level,a]).has(al))both++;
  if(process.argv[2]) console.log(`${p.level===mn?'✓':'✗'} main ${p.level.padEnd(13)} ${a===al?'✓':'✗'} also ${String(a).padEnd(13)} | want ${mn}/${al} | ${t.slice(0,60)}`); }
const n=rows.length; console.log(`Two-level set (${n}): main level ${Math.round(100*main/n)}% (3-col ${Math.round(100*main3/n)}%) · second level found ${Math.round(100*alsoOk/n)}% · both levels found (any order) ${Math.round(100*both/n)}%`);
for(const f of ['blind2.tsv','blind3.tsv','tricky2.tsv']){ let ok=0; const r=tsv(f); r.forEach(([lv,t])=>{ if(COL[AI.predict(m,t).level]===COL[lv]) ok++; }); console.log(`  regression ${f}: ${Math.round(100*ok/r.length)}%`); }
