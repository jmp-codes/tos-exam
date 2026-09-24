// Usage: node suite.js [set ...] [--show]   (trains once on all training data, never on blind4/tricky3/dual2/sealed)
const fs=require('fs'); const AI=require('./bloom-model.js'); const L=AI.LEVELS; const COL={Remembering:0,Understanding:0,Applying:1,Analyzing:1,Evaluating:2,Creating:2};
const tsv=f=>fs.readFileSync(f,'utf8').trim().split('\n').map(l=>l.split('\t'));
const args=process.argv.slice(2), show=args.includes('--show'), sets=args.filter(a=>!a.startsWith('--'));
const ex=[]; for(const l of L) for(const f of [`data/${l.toLowerCase()}.txt`,`data/${l.toLowerCase()}_2.txt`,`data/${l.toLowerCase()}_3.txt`,`data/${l.toLowerCase()}_4.txt`]) if(fs.existsSync(f)) fs.readFileSync(f,'utf8').split('\n').map(s=>s.trim()).filter(Boolean).forEach(t=>ex.push({text:t,level:l}));
for(const f of ['hard.tsv','blind.tsv','blind2.tsv','blind3.tsv','tricky.tsv','tricky2.tsv']) tsv(f).forEach(([lv,t])=>ex.push({text:t,level:lv}));
if(fs.existsSync('dual_train.tsv')) tsv('dual_train.tsv').forEach(([m,a,t])=>{ ex.push({text:t,level:m,weight:1}); ex.push({text:t,level:a,weight:0.34}); });
tsv('data/generated.tsv').forEach(([lv,t])=>ex.push({text:t,level:lv,weight:0.5}));
const m=AI.train(ex,{epochs:40,lr:0.5,l2:0.001});
for(const f of (sets.length?sets:['blind4.tsv','tricky3.tsv','dual2.tsv'])){
  const rows=tsv(f);
  if(rows[0].length===3){ let main=0,m3=0,also=0,both=0; const miss=[];
    for(const [mn,al,t] of rows){ const p=AI.predict(m,t), a=p.also&&p.also.level; if(p.level===mn)main++; if(COL[p.level]===COL[mn])m3++; if(a===al)also++; const ok=new Set([p.level,a]).has(mn)&&new Set([p.level,a]).has(al); if(ok)both++; else miss.push(`want ${mn}/${al} got ${p.level}/${a} | ${t}`); }
    const n=rows.length; console.log(`${f.padEnd(12)} n=${n}  both levels ${(100*both/n).toFixed(1)}%  main level ${(100*main/n).toFixed(1)}% (3-col ${(100*m3/n).toFixed(1)}%)  second level ${(100*also/n).toFixed(1)}%`); if(show) console.log('  '+miss.join('\n  '));
  } else { let s6=0,s3=0; const miss=[];
    for(const [lv,t] of rows){ const p=AI.predict(m,t); if(p.level===lv)s6++; if(COL[p.level]===COL[lv])s3++; else miss.push(`${lv}→${p.level} | ${t}`); }
    const n=rows.length; console.log(`${f.padEnd(12)} n=${n}  3-column ${(100*s3/n).toFixed(1)}%  6-level ${(100*s6/n).toFixed(1)}%`); if(show) console.log('  '+miss.join('\n  ')); }
}
