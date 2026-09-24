// Usage: node qgen-eval.js <qgen module> [show]
const fs=require('fs'); const Q=require(process.argv[2]||'./qgen.js'); const AI=require('./bloom-model.js'); const L=AI.LEVELS;
const tsv=f=>fs.readFileSync(f,'utf8').trim().split('\n').map(l=>l.split('\t'));
const ex=[]; for(const l of L) for(const f of [`data/${l.toLowerCase()}.txt`,`data/${l.toLowerCase()}_2.txt`,`data/${l.toLowerCase()}_3.txt`,`data/${l.toLowerCase()}_4.txt`]) if(fs.existsSync(f)) fs.readFileSync(f,'utf8').split('\n').map(s=>s.trim()).filter(Boolean).forEach(t=>ex.push({text:t,level:l}));
for(const f of ['hard.tsv','blind.tsv','blind2.tsv','blind3.tsv','tricky.tsv','tricky2.tsv']) tsv(f).forEach(([lv,t])=>ex.push({text:t,level:lv}));
tsv('data/generated.tsv').forEach(([lv,t])=>ex.push({text:t,level:lv,weight:0.5}));
const m=AI.train(ex,{epochs:40,lr:0.5,l2:0.001});
const P=fs.readFileSync('qgen-test2.txt','utf8').split('===').map(s=>s.trim());
const QT=require('./qtype.js'); const types={}; let tagree=0; let tot=0,ok=0; const cov={}; L.forEach(l=>cov[l]=0); const per={}; let mc=0, num=0;
P.forEach((p,i)=>{ const r=Q.generate(p,{seed:i+1}); const got=new Set();
  r.questions.forEach(q=>{ tot++; const pr=AI.predict(m,(q.type==='mtf'?'True or false: ':'')+q.stem); if(pr.level===q.level) ok++; got.add(q.level); per[q.level]=(per[q.level]||0)+1; if(q.type==='mc') mc++; if(q.numeric) num++; types[q.type]=(types[q.type]||0)+1; const dt=QT.detect({stem:q.stem,choices:q.choices,columns:q.columns,underline:q.underline}).type; const tt=q.type; if(dt===tt||(tt==='essay'&&dt==='short')||(tt==='short'&&dt==='essay')) tagree++; else if(process.argv[3]==='types') console.log('TYPE',tt,'->',dt,q.stem.slice(0,100));
    if(process.argv[3]&&(process.argv[3]==='all'||process.argv[3]==String(i+1))) console.log(`${pr.level===q.level?'✓':'✗'} P${i+1} [${q.level}/${q.type}${q.tpl?'/'+q.tpl:''}] ${q.stem}${q.choices?'  ('+q.choices.join(' | ')+') ans '+q.answer:''}${q.answer&&!q.choices?'  → '+q.answer:''}`); });
  L.forEach(l=>{ if(got.has(l)) cov[l]++; }); });
console.log(`${Q===undefined?'':''}paragraphs ${P.length} · questions ${tot} (${(tot/P.length).toFixed(1)} per paragraph) · level confirmed ${Math.round(100*ok/tot)}% · multiple choice ${mc} · numeric problems ${num}`);
console.log('paragraphs with at least one question per level: '+L.map(l=>`${l.slice(0,5)} ${cov[l]}/${P.length}`).join(' · '));
console.log('questions per level: '+L.map(l=>`${l.slice(0,5)} ${per[l]||0}`).join(' · '));
console.log('question types: '+Object.entries(types).map(([k,v])=>k+' '+v).join(' · ')+` · detector agrees with the generator on ${Math.round(100*tagree/tot)}%`);
