// node scen-dump.js [files…] — prints every scenario-style question (a situation, a place, a person or a task)
const fs=require('fs'), Q=require('./qgen.js');
const files=process.argv.slice(2).filter(f=>f.endsWith('.txt')); const P=[];
(files.length?files:['qgen-test2.txt','fixtures/chapters.txt','fixtures/fresh-lessons.txt','fixtures/ea-lesson1.txt','fixtures/mw-lesson4.txt']).forEach(f=>fs.readFileSync(f,'utf8').split('===').map(s=>s.trim()).filter(Boolean).forEach(t=>P.push(t)));
const SC=/^(A\.(tool|purp|mc\.task|mc\.process|mc\.next|con|list\.apply|step\.use|rel\.predict|tf\.predict)|N\.(tool|mc\.affected|case)|E\.(tool|purp|mc\.bestwhy|mc\.effective|case|limit|pair\.choose|tf\.best)|C\.(tool|mc\.combine|mc\.pair|case|mc\.plan|pair\.combine|step\.new|cause\.plan))/;
const out=[]; P.forEach((p,i)=>Q.generate(p,{seed:i+1}).questions.forEach(q=>{ if(SC.test(q.tpl)) out.push({p:i+1,tpl:q.tpl,level:q.level,stem:q.stem,choices:q.choices,answer:q.answerText||q.answer}); }));
if(process.argv.includes('json')) console.log(JSON.stringify(out)); else out.forEach(o=>console.log(`P${o.p} ${o.tpl} | ${o.stem}${o.choices?'  ['+o.choices.join(' | ')+'] → '+o.answer:''}`));
console.error(out.length+' scenario questions');
