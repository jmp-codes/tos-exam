// Usage: node matrix.js <lessons.txt>  — how many questions of each type the generator makes at each level
const fs=require('fs'), Q=require('./qgen.js'); const L=["Remembering","Understanding","Applying","Analyzing","Evaluating","Creating"];
const P=process.argv.slice(2).flatMap(f=>fs.readFileSync(f,'utf8').split('===').map(s=>s.trim()).filter(Boolean));
const M={}, cov={}; P.forEach((p,i)=>{ const seen=new Set(); Q.generate(p,{seed:i+1}).questions.forEach(q=>{ const k=q.level+'|'+q.type; M[k]=(M[k]||0)+1; seen.add(k); }); seen.forEach(k=>cov[k]=(cov[k]||0)+1); });
const T=[...new Set(Object.keys(M).map(k=>k.split('|')[1]))].sort();
console.log('level'.padEnd(14)+T.map(t=>t.padStart(8)).join(''));
L.forEach(l=>console.log(l.padEnd(14)+T.map(t=>(M[l+'|'+t]?`${M[l+'|'+t]}(${cov[l+'|'+t]})`:'-').padStart(8)).join('')));
console.log(`(count, and in parentheses the number of the ${P.length} lessons that got at least one)`);
