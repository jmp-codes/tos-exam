// Usage: node mc-eval.js [show|miss]  — multiple choice at every Bloom's level: coverage, level check, answer-key sanity
const fs=require('fs'); const Q=require('./qgen.js'); const AI=require('./bloom-model.js'); const L=AI.LEVELS;
const tsv=f=>fs.readFileSync(f,'utf8').trim().split('\n').map(l=>l.split('\t'));
const ex=[]; for(const l of L) for(const f of [1,2,3,4].map(k=>`data/${l.toLowerCase()}${k===1?'':'_'+k}.txt`)) if(fs.existsSync(f)) fs.readFileSync(f,'utf8').split('\n').map(s=>s.trim()).filter(Boolean).forEach(t=>ex.push({text:t,level:l}));
for(const f of ['hard.tsv','blind.tsv','blind2.tsv','blind3.tsv','tricky.tsv','tricky2.tsv']) tsv(f).forEach(([lv,t])=>ex.push({text:t,level:lv}));
tsv('data/generated.tsv').forEach(([lv,t])=>ex.push({text:t,level:lv,weight:0.5}));
const m=AI.train(ex,{epochs:40,lr:0.5,l2:0.001});
const sets=process.argv.filter(a=>a.endsWith('.txt')); const P=[];
(sets.length?sets:['qgen-test2.txt']).forEach(f=>fs.readFileSync(f,'utf8').split('===').map(s=>s.trim()).filter(Boolean).forEach(t=>P.push(t)));
const show=process.argv.includes('show'), miss=process.argv.includes('miss');
const cov={}, cnt={}, ok={}, bad=[]; L.forEach(l=>{cov[l]=0;cnt[l]=0;ok[l]=0;});
P.forEach((p,i)=>{ const r=Q.generate(p,{seed:i+1,type:'mc'}); const got=new Set();
  r.questions.forEach(q=>{ cnt[q.level]++; got.add(q.level); const pr=AI.predict(m,q.stem); const good=pr.level===q.level; if(good) ok[q.level]++;
    // answer-key sanity
    const probs=[]; if(!q.choices||q.choices.length<3) probs.push('fewer than 3 choices'); const lcs=(q.choices||[]).map(c=>c.toLowerCase()); if(new Set(lcs).size!==lcs.length) probs.push('duplicate choices');
    const k="abcdefgh".indexOf(q.answer); if(k<0||k>=q.choices.length) probs.push('answer letter out of range'); else if(q.answerText && q.choices[k]!==q.answerText) probs.push('answer text mismatch');
    if((q.choices||[]).some(c=>!c||/\bundefined\b|\bNaN\b|\$\{/.test(c))||/\bundefined\b|\bNaN\b|\$\{/.test(q.stem)) probs.push('broken text');
    if(probs.length) bad.push(`P${i+1} ${q.tpl}: ${probs.join(', ')} | ${q.stem}`);
    if(show||(miss&&!good)) console.log(`${good?'✓':'✗ ('+pr.level+')'} P${i+1} [${q.level} ${q.tpl}] ${q.stem}\n     ${q.choices.map((c,j)=>("abcd"[j]===q.answer?'*':' ')+c).join(' | ')}`); });
  L.forEach(l=>{ if(got.has(l)) cov[l]++; }); });
const tot=L.reduce((a,l)=>a+cnt[l],0), tok=L.reduce((a,l)=>a+ok[l],0);
console.log(`${P.length} lessons · ${tot} multiple-choice questions · level confirmed ${(100*tok/tot).toFixed(1)}% · answer-key problems ${bad.length}`);
console.log(L.map(l=>`${l.slice(0,5)}: ${cnt[l]} (${cnt[l]?Math.round(100*ok[l]/cnt[l]):0}% confirmed, in ${cov[l]}/${P.length} lessons)`).join('\n'));
bad.slice(0,20).forEach(b=>console.log('  PROBLEM',b));
