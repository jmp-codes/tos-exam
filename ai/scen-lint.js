// node scen-lint.js [qgen module] — counts construction problems in scenario-style questions across all sample lessons
const fs=require('fs'); const Q=require(process.argv[2]&&process.argv[2].endsWith('.js')?process.argv[2]:'./qgen.js');
const P=[]; ['qgen-test2.txt','fixtures/chapters.txt','fixtures/fresh-lessons.txt','fixtures/ea-lesson1.txt','fixtures/mw-lesson4.txt'].forEach(f=>fs.readFileSync(f,'utf8').split('===').map(s=>s.trim()).filter(Boolean).forEach(t=>P.push(t)));
const SC=/^(A\.|N\.(tool|mc\.affected|case|prin)|E\.(tool|purp|mc\.bestwhy|mc\.effective|case|limit|pair\.choose|tf\.best|prin)|C\.(tool|mc\.combine|mc\.pair|case|mc\.plan|pair\.combine|step\.new|cause\.plan|prin))/;
const RULES=[
 ["doubled word", /\b(\w+) \1\b/i],
 ["article clash", /\b(the|a|an) (the|a|an)\b/i],
 ["'a/an' before an uncountable or Latin plural", /\b(a|an) (stomata|data(?! (structure|architect|breach|center|model))|software(?! (developer|development|engineer|firewall|company))|information(?! (system|campaign))|pseudocode|feedback|equipment|advice|research|evidence|stacks|queues|subsidies)\b/i],
 ["step named without an article", /has just finished (?!the |an? |\w+ing\b)/i],
 ["'following the …ing'", /following the \w+ing\b/i],
 ["'the problem of' + a clause", /the problem of [^.?]*\b(is|are|trap|traps|has)\b/i],
 ["clause after reduce/prevent", /\b(reduce|prevent) (an? |the )?\w+ (is|are|was|were)\b/i],
 ["filler 'in a real situation'", /in a real situation/i],
 ["student doing an official's job", /^(a|an) student (must|needs to|wants to) (help farmers|protect consumers|block|schedule|implement|route|forward)/i],
 ["vague 'serves its purpose (…)'", /serves its purpose \(/i],
 ["stem repeats the answer's reason", null],
 ["'always the best approach for <place>'", /always the best approach for/i],
 ["math/logic rule placed in a business or office", /(law|theorem|principle|permutation|combination|counting|identity law|null law|mean|median|mode)\b[^.?]*\b(in|for) (a|an|the) (pawnshop|milk tea shop|rice farm|coconut plantation|rural health unit|travel agency|bank branch|call center|barangay|restaurant|campus dormitory|software development company)/i],
 ["science structure used by a person", /(student|staff member)[^.?]* needs to (let carbon dioxide|absorb light)/i],
 ["over 60 words", null]];
let tot=0; const cnt={}; const ex={};
P.forEach((p,i)=>Q.generate(p,{seed:i+1}).questions.forEach(q=>{ if(!SC.test(q.tpl)) return; tot++; const all=q.stem+" "+(q.choices||[]).join(" | ");
  for(const [name,rx] of RULES){ let hit=false;
    if(name==="over 60 words") hit=q.stem.split(/\s+/).length>60;
    else if(name==="stem repeats the answer's reason"){ const a=q.answerText||""; const m=a.match(/because (?:it is|they are) used to (.+)$/i); hit=!!(m && q.stem.toLowerCase().includes(m[1].toLowerCase().slice(0,30))); }
    else hit=rx.test(all);
    if(hit){ cnt[name]=(cnt[name]||0)+1; (ex[name]=ex[name]||[]).push(q.stem.slice(0,140)); } } }));
const bad=Object.values(cnt).reduce((a,b)=>a+b,0);
console.log(`${tot} scenario questions · ${bad} problems found`);
Object.entries(cnt).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${String(v).padStart(3)}  ${k}   e.g. ${ex[k][0]}`));
