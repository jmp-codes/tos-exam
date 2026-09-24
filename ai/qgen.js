/* QGen v2.9 — offline question generator for TOS Builder.
   Reads a sentence or paragraph for definitions, names, dates, lists, steps, examples, classifications,
   formulas, causes, relationships, comparisons, purposes and limitations, then fills Bloom's-level
   question patterns. Every pattern has an id so the app can rank patterns by what teachers keep and
   learn teachers' own patterns from their edits. Our AI (BloomAI) double-checks each draft's level. */
const QGen = (() => {
  const LEVELS = ["Remembering","Understanding","Applying","Analyzing","Evaluating","Creating"];
  const STOP = new Set("a an the of to in on at for from by with and or but is are was were be been being it its this that these those their there which who whom whose what when where how why as into than then also can may might must should would could will shall do does did has have had not no so such very more most less least other another each every any some many much one two three first second however example".split(" "));
  const PRON = /^(it|its|this|that|these|those|they|their|he|his|she|her|we|our|you|your|i|there|here|such|ito|iyon|sila|siya|kanilang|nito)\b/i;
  const IT = /\b(database|software|network|server|programming|program|web|internet|application|api|protocol|query|queries|security|computer|middleware|website|information system|data structure|data|cloud|firewall|algorithm)\b/i;
  const NEG = /\b(vulnerab\w*|threat\w*|damage\w*|pollution|warming|shortage|anomal\w*|attack\w*|risk\w*|loss|decline|destroy\w*|disease|flood\w*|erosion|poverty|errors?|failure|crime|abuse\w*|nasisira|polusyon)\b/i;
  let CUR="";
  const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
  const trimP = s => String(s||"").replace(/\s+/g," ").replace(/^[\s,;:]+|[\s,;:.]+$/g,"").trim();
  const noArt = s => trimP(s).replace(/^(an?|the|ang|ang mga|mga)\s+/i,"");
  const words = s => noArt(s).split(/\s+/).filter(Boolean);
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const lc = s => { s=trimP(s); if(/^[A-Z]{2,}|^[A-Z][a-z]*[A-Z]/.test(s)||TITLE(s)) return s; const w=s.split(" ")[0]; if(/^[A-Z]/.test(w) && new RegExp("(?:[a-z,;:]|\\b(?:A|An|The))[ \\t]+"+reEsc(w)+"\\b").test(CUR.replace(/^[^\n]{0,90}[^.!?:;\n]$/gm,""))) return s; return s.charAt(0).toLowerCase()+s.slice(1); };
  const isName = s => /^([A-Z][a-z]+\.?\s+){1,3}[A-Z][a-z]+\.?$/.test(trimP(s).replace(/^(the|an?)\s+/i,""));
  const TITLE=t=>{ const w=String(t).split(" "); return w.length>1 && w.every(x=>/^[A-Z0-9(]/.test(x)||/^(of|and|the|in|for|to|a|an|on|with)$/.test(x)) && w.filter(x=>/^[A-Z]/.test(x)).length>=2; };
  function termCase(t){ t=trimP(t); if(!t) return t; if(TITLE(t)) return t; const f=t.split(" ")[0]; if(/^[A-Z0-9]{2,}/.test(f)||/[a-z][A-Z]/.test(f)||/^[A-Z][a-z]+'s$/.test(f)) return t;
    if(/^[A-Z]/.test(t)){ if(/\b[A-Z][a-z]+(?:'s|s'|’s)(\s|$)/.test(t)) return t; if(new RegExp("(?:[a-z,;:]|\\b(?:A|An|The))[ \\t]+"+reEsc(f)+"\\b").test(CUR.replace(/^[^\n]{0,90}[^.!?:;\n]$/gm,""))) return t; return t.charAt(0).toLowerCase()+t.slice(1); } return t; }
  function sentences(text){
    // a short title-like line (a heading) followed by a new line that starts with a capital ends a sentence
    text=String(text||"").replace(/\r/g,"").replace(/^([0-9A-Z][^\n]{0,70}?[^.!?:;,\s-])[ \t]*\n(?=\s*[A-Z0-9"“])/gm,(m0,l)=>/\b(and|or|the|of|a|an|to|in|for|with|is|are|ng|ang|at|sa)$/i.test(l)?m0:l+".\n");
    text=text.replace(/([A-Za-z0-9)])!(?=\s*[\/*)(,+×=\-]|\s*$|\s+(?:where|and|ways|is|are)\b|,)/gm,"$1<bang>");
    return text.replace(/\s+/g," ").replace(/(\b(e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms))\./g,"$1<dot>").replace(/(\d)\.(\d)/g,"$1<dot>$2")
      .match(/[^.!?]+[.!?]?/g)?.map(s=>s.replace(/<dot>/g,".").replace(/<bang>/g,"!").trim()).filter(s=>s.split(" ").length>=3) || [];
  }
  function isFilipino(text){ const w=String(text).toLowerCase().match(/[a-zñ']+/g)||[]; const f=w.filter(x=>/^(ang|ng|mga|ay|sa|na|at|ito|kung|para|nito|siya|upang|dahil|hindi|tulad|halimbawa)$/.test(x)).length; return w.length>0 && f/w.length>0.12; }
  function splitItems(s){ return trimP(s).replace(/\s+etc$/i,"").split(/\s*,\s*(?:and\s+|or\s+|at\s+)?|\s+and\s+|\s+at\s+|\s+or\s+|;\s*/).map(noArt).filter(x=>x && x.split(" ").length<=6); }
  function rng(seed){ let s=seed||11; return ()=>{ s=(s*16807)%2147483647; return s/2147483647; }; }
  function shuffle(a,r){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  const same = (a,b) => { a=String(a).toLowerCase(); b=String(b).toLowerCase(); return a===b || a.includes(b) || b.includes(a); };


  /* Small subject word banks: used only when the text itself has too few wrong choices. */
  const BANK = {
    it:["router","compiler","operating system","primary key","foreign key","firewall","encryption","array","linked list","queue","stack","hash table","algorithm","flowchart","pseudocode","database","index","API","web server","protocol","IP address","bandwidth","cache","variable","function","loop","class","object","interface","malware","backup","cloud storage","middleware","XML","JSON"],
    math:["mean","median","mode","range","variance","standard deviation","probability","ratio","percentage","slope","function","equation","inequality","permutation","combination","set","subset","union","intersection","factorial","prime number","simple interest","compound interest"],
    sci:["photosynthesis","respiration","evaporation","condensation","friction","inertia","gravity","velocity","acceleration","speed","voltage","current","resistance","energy","mass","density","atom","molecule","cell","chlorophyll","ecosystem","erosion","climate","greenhouse gas"],
    econ:["supply","demand","inflation","scarcity","opportunity cost","market","price","shortage","surplus","equilibrium price","tax","income","profit","budget"],
    eng:["metaphor","simile","personification","hyperbole","irony","alliteration","onomatopoeia","oxymoron","noun","verb","adjective","adverb","thesis statement","topic sentence"],
    hist:["Katipunan","La Liga Filipina","Propaganda Movement","Treaty of Paris","Galleon Trade","Martial Law","EDSA Revolution","Commonwealth","Malolos Congress","Philippine Revolution"]
  };
  function domain(text){ const t=String(text).toLowerCase(); const sc={it:/(network|database|program|software|computer|data|internet|algorithm|stack|queue|firewall|server|code)/g,math:/(formula|mean|median|probability|interest|equation|sum|number)/g,sci:/(energy|plant|cell|voltage|current|heat|climate|speed|force|atom)/g,econ:/(price|supply|demand|market|good|consumer|producer)/g,eng:/(figure of speech|metaphor|simile|sentence|verb|noun|poem)/g,hist:/(treaty|war|revolution|spain|spanish|american|filipinos|founded|declared)/g};
    let best=null,bn=0; for(const k in sc){ const n=(t.match(sc[k])||[]).length; if(n>bn){bn=n;best=k;} } return best; }
  /* ---- slides, outlines and glossaries: headings with bullet items ("Term – description") ---- */
  const LEMMA_X={focuses:"focus",processes:"process",addresses:"address",accesses:"access",is:"be",has:"have",does:"do",goes:"go"};
  function lemma(w){ const l=w.toLowerCase(); if(LEMMA_X[l]) return LEMMA_X[l]; if(/ies$/.test(l)) return l.slice(0,-3)+"y"; if(/(ch|sh|x|z|ss)es$/.test(l)) return l.slice(0,-2); if(/[^s]s$/.test(l)) return l.slice(0,-1); return l; }
  const DESC_VERB=/^(defines?|describes?|provides?|represents?|shows?|stores?|manages?|controls?|connects?|converts?|allows?|enables?|ensures?|supports?|handles?|organizes?|focuses|uses?|applies|specifies|identifies|measures?|protects?|translates?|coordinates?|integrates?|monitors?|collects?|processes|delivers?|sends?|receives?|creates?|tracks?|reduces?|improves?|lowers?|speeds?|increases?|helps?|guides?|links?|maps?|documents?|captures?|models?|defines|runs?|executes?|routes?|forwards?|filters?|holds?|keeps?|contains?|lists?|records?|checks?|validates?|verifies?|transforms?|exchanges?|carries|moves?|calls?|invokes?|exposes?|publishes?|subscribes?|queues?|brokers?|mediates?|lets|gives|offers|serves|acts|works|makes|builds|hides|performs|combines|separates|divides|breaks|stands|transfers|exchanges|carries|sends|shares|stores|loads|saves|splits|joins|compares|calculates|computes|displays|prints|reads|writes|returns|accepts|rejects|grants|denies|encrypts|decrypts|compresses|authenticates|authori[sz]es|schedules|allocates|assigns|balances|caches|replicates|synchroni[sz]es|backs up|restores|detects|prevents|blocks|allows)\b/i;
  const looksVerb=d=>DESC_VERB.test(d) || /^[a-z]+(?<!ss)s\s+(an?|the|all|each|every|data|messages?|requests?|information|files?|users?|objects?|programs?|web|xml|json|lightweight|small|large|multiple|one|two)\b/i.test(d);
  const SKIP_HEAD=/^(learning objectives?|objectives?|outline|agenda|overview|summary|references?|reflection|activity|assessment|quiz|exercise|discussion|questions?|thank you|introduction|case|case study|scenario|examples?|prepared by|group activity|learning outcomes?)\b/i;
  function singular(w){ w=w.toLowerCase(); if(/ies$/.test(w)) return w.slice(0,-3)+"y"; if(/(ss|us|is)$/.test(w)) return w; if(/(ches|shes|xes|sses)$/.test(w)) return w.slice(0,-2); return w.replace(/s$/,""); }
  function headNoun(h){ h=h.replace(/\s*\([^)]*\)\s*$/,""); const ty=h.match(/^(?:the\s+)?(?:\w+\s+)?(?:types|kinds|categories|forms|classes)\s+of\s+(?:the\s+)?(.+)$/i); if(ty) return singular(ty[1].split(/\s+/).pop()); const w=h.replace(/[^A-Za-z\s-]/g," ").trim().split(/\s+/); const last=w[w.length-1]||""; if(!/s$/i.test(last)||/^(terms|concepts|definitions|basics|notes|foundations|fundamentals|essentials)$/i.test(last)) return null; return singular(last); }
  function kindOf(h){ return h.replace(/^(the|a|an)\s+/i,"").split(/\s+/).map(w=>/^[A-Z0-9]{2,}$/.test(w)?w:w.toLowerCase()).join(" "); }
  const pv=(v,rest)=>(lemma(v)+" "+rest).replace(/^(\w+) and (\w+?s)\b/,(m0,a,b)=>a+" and "+lemma(b));
  const overlaps0=(a,b)=>{ const k=x=>new Set((String(x).toLowerCase().match(/[a-z]{4,}/g)||[]).map(w=>w.slice(0,5))); const A=k(a); for(const w of k(b)) if(A.has(w)) return true; return false; };
  function structured(text, F, addTerm){
    const blocks=String(text).replace(/\r/g,"").split(/\n\s*\n/); const keep=[];
    for(const blk of blocks){
      const lines=blk.split("\n").map(x=>x.replace(/^\s*[-•▪◦●*]\s+/,"").trim()).filter(Boolean);
      if(lines.length<2){ keep.push(blk); continue; }
      let head=lines[0]; const isHead=!/[.!]$/.test(head) && head.split(" ").length<=12; if(!isHead){ keep.push(blk); continue; }
      head=head.replace(/[?:]$/,"").trim(); const items=lines.slice(1).map(x=>x.replace(/[.;]$/,"").trim());
      if(SKIP_HEAD.test(head)){ continue; }
      const used=new Set(); const hn=headNoun(head);
      const isSentence=x=>/\b(is|are|was|were|has|have|can|will|leads? to|causes?|provides?|uses?|helps?)\b/i.test(x) && x.split(" ").length>=6 && !/^[^–—:]{2,60}\s[–—:-]\s/.test(x);
      // a slide whose title is the term and whose bullets say what it does: "Business Architecture" + "Defines …", "Describes …"
      if((!/s$/i.test(head.split(" ").pop()||"") || TITLE(head)) && !/^(?:the\s+|common\s+|key\s+|main\s+|major\s+)?(benefits|advantages|importance|uses|purposes|roles?|goals|functions|types|kinds|categories|components|elements|layers|parts|principles|characteristics|features|levels|models|tiers|pillars|phases|steps|stages|challenges|problems|issues|disadvantages|limitations|risks|drawbacks|examples)\b/i.test(head)){ const vb=items.map((x,i)=>[x,i]).filter(([x])=>DESC_VERB.test(x) && !/^[^–—:]{2,60}\s[–—:-]\s/.test(x)); if(vb.length>=1 && vb.length>=items.length/2 && head.split(" ").length<=6 && !/^(what|why|how|when|who)\b/i.test(head)){ const T=termCase(noArt(head)); vb.forEach(([x,i])=>{ const v=x.split(" ")[0]; if(!/^(defines?|is|means|refers)$/i.test(v)) F.purposes.push({term:T,purpose:pv(v,x.slice(v.length).trim()),src:x}); used.add(i); });
          const f0=vb[0][0], dm=f0.match(/^(?:defines?|is|means|refers to)\s+(?:as\s+)?((?:an?|the)\s+.+)$/i); if(!F.defs.some(d=>same(d.term,T))) F.defs.push({art:"",term:T,verb:"is",def:dm?dm[1]:`the one that ${f0.charAt(0).toLowerCase()+f0.slice(1)}`,src:f0}); addTerm(T,3); } }
      // glossary items: "Term – description", "Term: description", "Term (ABC) – description"
      const pitM=head.match(/^(?:the\s+|common\s+|key\s+|major\s+|typical\s+)?(challenges|problems|issues|disadvantages|limitations|risks|drawbacks|pitfalls|mistakes|errors|barriers|obstacles)\b(?:\s+(?:of|in|with|for|when)\s+(?:the\s+|an?\s+)?(.+))?$/i);
      if(pitM){ const subj=pitM[2]?termCase(noArt(pitM[2])):""; items.forEach((x,i)=>{ const m3=x.match(/^([A-Z][^:]{2,50}):\s+(.{6,})$/); if(m3){ F.defs.push({art:"",term:termCase(m3[1].trim()),verb:"is",def:m3[2].replace(/^(.)/,c=>c.toLowerCase()),src:x,group:head}); used.add(i); return; } const m2=x.match(/^(.{4,80}?)\s+[–—-]\s+(.{4,})$/); if(m2){ F.causes.push({cause:trimP(m2[1]),verb:"leads to",effect:trimP(m2[2]).replace(/^(.)/,c=>c.toLowerCase()),src:x,pitfall:true}); used.add(i); } }); if(subj) items.forEach((x,i)=>{ if(used.has(i)||/\b(leads? to|causes?|results? in|may|can|might|will|is|are|do|does|has|have)\b/i.test(x)) return; F.limits.push({term:subj,limit:"faces "+(/^[A-Z][A-Z]/.test(x)?x:x.replace(/^(.)/,c=>c.toLowerCase())),src:x}); used.add(i); }); keep.push(items.filter((x,i)=>!used.has(i)).map(x=>/[.!?]$/.test(x)?x:x+".").join("\n")); continue; }
      const glos=[];
      items.forEach((x,i)=>{ const m=x.match(/^([A-Z0-9][^–—:]{1,60}?)\s*(?:\(([A-Za-z0-9&]{2,10})\))?\s*(?:[–—:]|\s-\s)\s*(.{6,})$/); if(!m) return; if(m[1].split(" ").length>7) return;
        if(/^(result|results|note|notes|example|examples|answer|question|output|input|reason|goal|objective|problem|solution|conclusion|summary|source|prepared by|date|remember|tip|key idea|important)$/i.test(m[1].trim())) return;
        let mt=m[1].trim(); const exp=mt.match(/^(.+?)\s*\(([^)]{11,})\)$/); if(exp){ mt=exp[1]; F.aliases=(F.aliases||[]).concat([[exp[1],exp[2]]]); }
        const raw1=noArt(mt), tc=raw1.split(" ").length>1&&raw1.split(" ").every(w=>/^[A-Z0-9]/.test(w)||/^(of|and|the|in|for|to|a|an)$/.test(w)); const term=tc?raw1:termCase(raw1), abbr=m[2]||"", desc=m[3].trim(); let def=null, verb="is";
        if(/^(an?|the)\s/i.test(desc)) def=desc.replace(/^(.)/,c=>c.toLowerCase());
        else if(looksVerb(desc)){ const v=desc.split(" ")[0]; const rest=desc.slice(v.length).trim(); def=`the ${hn||"one"} that ${v.toLowerCase()} ${rest}`; F.purposes.push({term,purpose:pv(v,rest),src:x,glossary:true}); }
        else if(/^used (to|for)\s/i.test(desc)){ F.purposes.push({term,purpose:desc.replace(/^used\s+to\s+/i,"").replace(/^used\s+for\s+/i,"for "),src:x,glossary:true}); def=`the ${hn||"one"} ${desc}`; }
        else if(/^\S+(\s+\S+){0,5}\s+(is|are|was|were|can|will|has|have|must)\b/i.test(desc)) def=`the ${hn||"approach"} in which ${desc.replace(/^(.)/,c=>c.toLowerCase())}`;
        else if(/^(used|centered|centred|based|designed|built|developed|known|made|owned|maintained|adopted|created)\b/i.test(desc)) def=`the ${hn||"one"} ${desc.replace(/^(.)/,c=>c.toLowerCase())}`;
        else if(/^(most|more|highly|widely|very|often|mainly|mostly)\b/i.test(desc)) def=`the ${hn||"one"} that is ${desc.replace(/^(.)/,c=>c.toLowerCase()).replace(/;\s*/," and ")}`;
        else if(/^[a-z]/.test(desc)) def=desc;
        if(def){ glos.push(term); used.add(i); if(!F.defs.some(d=>d.term.toLowerCase()===term.toLowerCase())) F.defs.push({art:"",term,verb,def:trimP(def),src:x,abbr,group:head}); addTerm(term,3); } });
      if(glos.length>=2) F.lists.push({kind:kindOf(head),subject:"",items:glos,src:head,glossary:true});
      // ordered sequences: "Phases of …", "Steps in …"
      const plain=items.filter((x,i)=>!used.has(i) && !isSentence(x) && x.split(" ").length<=10);
      const seqM=head.match(/^(?:the\s+)?(?:\w+\s+)?(phases|steps|stages|process|procedure|cycle|life ?cycle|workflow)\s+(?:of|in|for)\s+(?:the\s+)?(.+)$/i) || head.match(/^(.+?)\s+(phases|steps|stages|process|procedure|workflow|cycle|life ?cycle|methodology)$/i);
      const avgW=plain.reduce((a,x)=>a+x.split(" ").length,0)/Math.max(1,plain.length);
      for(let k=plain.length-1;k>=0;k--) if(plain[k].split(" ").length>=Math.max(7,avgW*2)) plain.splice(k,1);
      if(seqM && plain.length>=3){ const proc=/^(phases|steps|stages|process|procedure|cycle|life ?cycle|workflow|methodology)$/i.test(seqM[1])?seqM[2]:seqM[1]; F.steps.push({process:proc.replace(/^the\s+/i,""),steps:plain.map(x=>x.replace(/^(\d+[.)]|[A-Z][.)])\s*/,"")),src:head}); items.forEach((x,i)=>{ if(plain.includes(x)) used.add(i); }); }
      // benefits / purposes of a subject
      const benM=head.match(/^(?:the\s+)?(?:key\s+|main\s+)?(benefits|advantages|importance|uses|purposes|roles?|goals|functions)\s+of\s+(?:the\s+|an?\s+)?(.+)$/i) || head.match(/^why\s+(.+?)\s+matters?$/i);
      if(benM){ const subj=termCase(noArt(benM[2]||benM[1])); items.forEach((x,i)=>{ if(used.has(i)) return; const v=x.split(" ")[0]; if(DESC_VERB.test(x)||/^[A-Z][a-z]+s\b/.test(v)){ F.purposes.push({term:subj,purpose:pv(v,x.slice(v.length).trim()),src:x,benefit:true}); used.add(i); }
        else if(x.split(" ").length<=12 && !/\b(is|are|was|were)\b/i.test(x)){ F.purposes.push({term:subj,purpose:"bring about "+x.replace(/^(.)/,c=>c.toLowerCase()),src:x,benefit:true}); used.add(i); } }); addTerm(subj,2); }
      // challenges / limitations of a subject
      const chM=head.match(/^(?:the\s+|common\s+|key\s+|major\s+)?(challenges|problems|issues|disadvantages|limitations|risks|drawbacks)\s+(?:of|in|with|for)\s+(?:the\s+|an?\s+)?(.+)$/i);
      if(chM){ const subj=termCase(noArt(chM[2])); items.forEach((x,i)=>{ if(used.has(i)||/\b(leads? to|causes?|results? in)\b/i.test(x)) return; if(/\b(may|can|might|will|is|are|do|does|has|have)\b/i.test(x)) return; F.limits.push({term:subj,limit:"faces "+(/^[A-Z][A-Z]/.test(x)?x:x.replace(/^(.)/,c=>c.toLowerCase())),src:x}); used.add(i); }); }
      // types / components / layers of X (plain noun items)
      const typM=head.match(/^(?:the\s+)?(?:\w+\s+)?(types|kinds|categories|components|elements|layers|parts|principles|characteristics|features|levels|models|tiers|pillars)\s+of\s+(?:the\s+|an?\s+)?(.+)$/i);
      if(typM && !seqM){ const it=items.filter((x,i)=>!used.has(i) && x.split(" ").length<=6 && !isSentence(x)); if(it.length>=2){ F.lists.push({kind:typM[1].toLowerCase(),subject:termCase(noArt(typM[2])),items:it,src:head}); items.forEach((x,i)=>{ if(it.includes(x)) used.add(i); }); } }
      // anything not understood here goes on to the sentence reader
      const rest=items.filter((x,i)=>!used.has(i)); keep.push(rest.map(x=>/[.!?]$/.test(x)?x:x+".").join("\n"));
    }
    return keep.join("\n\n");
  }
  /* ================= reading ================= */
  function read(text){
    text=String(text||"").replace(/^(?:\s*▸\s*)+/gm,"");
    CUR=String(text||""); const fil=isFilipino(text);
    const F={fil,text,defs:[],names:[],dates:[],lists:[],steps:[],examples:[],classes:[],formulas:[],causes:[],rels:[],comps:[],contrasts:[],purposes:[],limits:[],terms:new Map()};
    const addTerm=(t,w=1)=>{ t=noArt(t); if(!t||t.length<3||t.split(" ").length>5||PRON.test(t)||STOP.has(t.toLowerCase())||/[=]/.test(t)) return; const k=t.toLowerCase(); F.terms.set(k,{t,w:(F.terms.get(k)?.w||0)+w}); };
    const S=sentences(fil?text:structured(text,F,addTerm)).filter(x=>!/\?$/.test(x));
    let lastTerm=null;
    const ordered=[];
    for(const raw of S){
      let s=raw.replace(/[.!?]$/,"").trim(); let m;
      if(fil){ readFil(s,raw,F,addTerm); continue; }
      // ---- two comparisons joined by "but" ----
      if(/\bthan\b[^,]*,\s*but\b[^.]*\bthan\b/i.test(s)){ for(const part of s.split(/,\s*but\s+/i)){ const mc=part.match(/^(?:an?\s+|the\s+)?(.{2,40}?)\s+(?:is|are)\s+((?:more|less)\s+\w+|\w+er)\s+than\s+(?:an?\s+|the\s+)?(.{2,60})$/i); if(mc) F.comps.push({a:noArt(mc[1]),comp:mc[2],b:noArt(mc[3]),src:raw}); } continue; }
      // ---- more ways lessons state facts ----
      { let mm, handled=false; const T0=x=>termCase(noArt(trimP(x)));
        if((mm=s.match(/^(?:an?\s+|the\s+)?([A-Za-z][\w\s\-\/]{1,40}?)\s*,\s*(?:also\s+)?(?:known|called|referred to)\s+as\s+(?:an?\s+|the\s+)?([\w\s\-\/]{2,40}?)\s*,\s*(.+)$/i))){ const T=T0(mm[1]); addTerm(T,3); addTerm(mm[2],2); s=`${mm[1]} ${mm[3]}`; F.aliases=(F.aliases||[]).concat([[T,trimP(mm[2])]]); }
        if((mm=s.match(/^(?:an?\s+|the\s+)?([A-Za-z][\w\s\-\/]{1,40}?)\s*,\s*(?:which|that)\s+(\w+s)\s+(.+?),\s*(.+)$/i)) && looksVerb(mm[2]+" "+mm[3])){ F.purposes.push({term:T0(mm[1]),purpose:pv(mm[2],mm[3]),src:raw}); addTerm(mm[1],2); s=`${mm[1]} ${mm[4]}`; }
        if((mm=s.match(/^(?:an?\s+|the\s+)?([A-Za-z][\w\s\-\/]{1,40}?)\s+(?:consists? of|is made up of|are made up of|is composed of|are composed of|has|have)\s+(?:the following\s*:?\s*)?(.+?(?:,|\band\b).+)$/i)) && !PRON.test(mm[1]) && splitItems(mm[2]).length>=2 && !/\b(is|are|was|were)\b/.test(mm[2])){ F.lists.push({kind:"parts",subject:T0(mm[1]),items:splitItems(mm[2]),src:raw}); addTerm(mm[1],2); handled=true; }
        else if((mm=s.match(/^(?:the\s+)?(?:main\s+|common\s+|key\s+)?([A-Za-z][\w\s\-\/]{2,40}?s)\s+(?:include|includes|are)\s+(?:the following\s*:?\s*)?([^.]+?(?:,|\band\b)[^.]+)$/i)) && !PRON.test(mm[1]) && splitItems(mm[2]).length>=2 && splitItems(mm[2]).every(x=>x.split(" ").length<=5 && !/^(used|made|able|known|called|found|given|done|seen)\b/i.test(x) && !/\b(is|are|was|were|can|will|to)\b/i.test(x)) && !/^(used|made|able|known|called|found|an?|the|very|more|less|not)\b/i.test(mm[2].trim()) && !/^(advantages|benefits|disadvantages|types|kinds|steps)$/i.test(mm[1].trim())){ F.lists.push({kind:mm[1].toLowerCase().replace(/^(the|main|common|key)\s+/,""),subject:"",items:splitItems(mm[2]),src:raw}); handled=true; }
        else if((mm=s.match(/^(?:an?\s+|the\s+)?([A-Za-z][\w\s\-\/]{1,40}?)\s+(?:can be|is|are|may be)\s+(?:classified|divided|grouped|categori[sz]ed|sorted)\s+into\s+(?:\w+\s+(?:types|kinds|groups|categories)\s*:?\s*)?(.+)$/i)) && splitItems(mm[2]).length>=2){ F.lists.push({kind:"types",subject:T0(mm[1]),items:splitItems(mm[2]),src:raw}); addTerm(mm[1],2); handled=true; }
        else if((mm=s.match(/^(?:an?\s+|the\s+)?([A-Za-z0-9][\w\-\/]*(?:\s+[\w\-\/]+){0,3})\s+vs\.?\s+(?:an?\s+|the\s+)?([A-Za-z0-9][\w\-\/]*(?:\s+[\w\-\/]+){0,3})\s*:\s*(.+)$/i))){ s=mm[3]; }
        if(!handled && (mm=s.match(/^(?:an?\s+|the\s+)?([\w\-\/]+(?:\s+[\w\-\/]+){0,3})\s+(?:is|are)\s+((?:more|less)\s+\w+|\w+er),\s*(?:while|whereas|but)\s+(?:an?\s+|the\s+)?([\w\-\/]+(?:\s+[\w\-\/]+){0,3})\s+(?:is|are)\s+((?:more|less)\s+\w+|\w+er)$/i))){ F.comps.push({a:noArt(mm[1]),comp:mm[2],b:noArt(mm[3]),src:raw}); F.comps.push({a:noArt(mm[3]),comp:mm[4],b:noArt(mm[1]),src:raw}); addTerm(mm[1],2); addTerm(mm[3],2); handled=true; }
        if(!handled && (mm=s.match(/^(?:an?\s+|the\s+)?(.{2,40}?)\s+(spreads?|occurs?|happens?|fails?|crashes|breaks?|stops?|slows? down|increases?|decreases?)\s+when\s+(.+)$/i)) && !PRON.test(mm[1])){ F.causes.push({cause:trimP(mm[3]),effect:`${noArt(mm[1])} ${mm[2]}`,src:raw,cond:null}); handled=true; }
        if(!handled && (mm=s.match(/^if\s+(.+?),\s*(?:then\s+)?(.+)$/i)) && !/\d/.test(mm[1]) && mm[2].split(" ").length>=3){ F.causes.push({cause:trimP(mm[1]),effect:trimP(mm[2]),src:raw}); handled=true; }
        if(!handled && (mm=s.match(/^(?:one|another|a|the)?\s*(?:main\s+|major\s+|key\s+)?(disadvantage|limitation|drawback|weakness|problem)\s+of\s+(?:an?\s+|the\s+)?(.+?)\s+is\s+that\s+(?:it|they)\s+(.+)$/i))){ F.limits.push({term:T0(mm[2]),limit:trimP(mm[3]),src:raw}); handled=true; }
        if(!handled && (mm=s.match(/^(?:one|another|a|the)?\s*(?:main\s+|major\s+|key\s+)?(advantage|benefit|strength)\s+of\s+(?:an?\s+|the\s+)?(.+?)\s+is\s+that\s+(?:it|they)\s+(\w+)\s+(.+)$/i))){ F.purposes.push({term:T0(mm[2]),purpose:pv(mm[3],mm[4]),src:raw,benefit:true}); handled=true; }
        if(!handled && (mm=s.match(/^(?:an?\s+|the\s+)?([A-Za-z][\w\-\/]*(?:\s+[\w\-\/()]+){0,3})\s+(\w+s)\s+(.{6,})$/)) && !PRON.test(mm[1]) && DESC_VERB.test(mm[2]+" x") && !/\b(is|are|was|were|has|have|include|includes)\b/i.test(mm[2]) && !/^(this|that|these|those|it|they|there|each|every|some|many|most|all)\b/i.test(mm[1]) && !/^(is|are|was|were|be)\b/i.test(mm[3]) && !/^(university|school|student|students|people|person|company|organization|organizations|team|teams|user|users|teacher|government|agency|office|result|results)$/i.test(mm[1].trim()) && (F.terms.has(noArt(mm[1]).toLowerCase())||TITLE(mm[1])||/^[A-Z]{2,}/.test(mm[1])||F.defs.some(d=>same(d.term,mm[1]))) && !F.purposes.some(p=>same(p.term,mm[1])&&overlaps0(p.purpose,mm[3]))){ F.purposes.push({term:T0(mm[1]),purpose:pv(mm[2],mm[3]),src:raw}); addTerm(mm[1],2); }
        if(handled) continue;
      }
      // ---- formulas: "The formula for X is A = B * C, where P is …" / "V = I * R"
      if((m=s.match(/(?:the\s+)?formula(?:\s+for\s+(?:the\s+)?(.+?))?\s+is\s+([A-Za-z][\w]*\s*=\s*[^,]+?)(?:,\s*where\s+(.+))?$/i)) || (m=s.match(/^()([A-Za-z]\w*\s*=\s*[A-Za-z0-9\s*\/+\-().^]+?)(?:,\s*where\s+(.+))?$/)) || (m=s.match(/^(?:the\s+)?(.+?)\s+(?:is|are|can be)\s+(?:computed|calculated|found|obtained|given|determined|solved|expressed)\s+(?:as|by|using|with)(?:\s+the\s+formula)?\s+([A-Za-z]\w*\s*=\s*[A-Za-z0-9\s*\/+\-().^]+?)(?:,\s*where\s+(.+))?$/i))){
        const f=parseFormula(m[2], m[3]||"", m[1]||lastTerm||""); if(f){ f.src=raw; F.formulas.push(f); if(!f.vars[f.lhs].mean && f.lhs.length>2) f.vars[f.lhs].mean=f.lhs; }
        continue;
      }
      if(/\bwhere\s+[A-Za-z]\s+is\b/.test(s) && F.formulas.length){ addVars(F.formulas[F.formulas.length-1], s.replace(/^.*?\bwhere\s+/i,"")); continue; }
      // ---- steps: First/Then/Next/Finally
      if((m=s.match(/^(first|second|third|then|next|after that|afterwards|finally|lastly),?\s+(.+)$/i))){ ordered.push(cap(trimP(m[2]))); continue; }
      // ---- examples: "For example, E is a/an X" / "For example, E" / "X such as a, b and c" / "E is an example of X"
      if((m=s.match(/^for (?:example|instance),?\s*"([^"]+)"\s+is\s+an?\s+([\w\s-]+?)(?:,\s*(?:while|whereas)\s+"([^"]+)"\s+is\s+an?\s+([\w\s-]+))?$/i))){ F.examples.push({example:`"${m[1]}"`,term:noArt(m[2]),src:raw}); if(m[3]) F.examples.push({example:`"${m[3]}"`,term:noArt(m[4]),src:raw}); continue; }
      if((m=s.match(/^for (?:example|instance),?\s+(.+?)\s+(?:is|are)\s+(?:an?\s+)?(?:(?:real-life|common|good)\s+)?(?:example\s+of\s+(?:an?\s+)?)?(.+)$/i)) && words(m[2]).length<=6 && !/^(used|made|built|found|called|known|located|based|done|given|shown|seen|applied|considered|needed|able)\b/i.test(m[2]) && !/\s(uses|use|has|have|shows|makes|gives|decides|checks|sends|stores|needs|helps)\s/i.test(" "+m[1]+" ")){ F.examples.push({example:trimP(m[1]).replace(/^"|"$/g,""),term:noArt(m[2]).replace(/,?\s+(?:while|whereas)\b.*$/i,""),src:raw}); }
      else if((m=s.match(/^for (?:example|instance),?\s+(.+)$/i)) && lastTerm){ const e=trimP(m[1]).split(/\s+(?:is|are|earns|earn|uses|use|has|have|shows|show|can|will|produces|produce|gives|give|follows|follow)\s+/)[0]; F.examples.push({example:e,term:lastTerm,src:raw}); }
      if(/^(for (?:example|instance)|however|halimbawa|in addition|also)\b/i.test(s)) continue;
      if((m=s.match(/^(.+?)\s+(?:is|are)\s+(?:an?\s+)?examples?\s+of\s+(?:an?\s+)?(.+)$/i)) && !/^for /i.test(s)) F.examples.push({example:trimP(m[1]),term:noArt(m[2]),src:raw});
      if((m=s.match(/\b([a-z][\w\s]{2,40}?),?\s+such as\s+(.+?)(?:,\s*(?:is|are|can|which)\b.*)?$/i)) && !/^(is|are|was|were|covers?|has|have|that|which)\b/i.test(noArt(m[1].split(/\s+(?:of|in|from|like)\s+/).pop())) && !/\b(area|place|thing|way|things|places)$/i.test(m[1].trim())){ { const np=m[1].match(/(?:\b(?:an?|the|of|such)\s+)([\w-]+(?:\s+[\w-]+){0,2})$/i); if(/\b(that|which|who|measures?|performs?|uses?|holds?)\b/i.test(m[1])){ if(!np) continue; m[1]=np[1]; } } splitItems(m[2]).map((x,i,a)=>i===a.length-1&&x.split(" ").length>2?x.split(/\s+(?:over|in|on|to|for|from|with|by|through)\s+/)[0]:x).forEach(x=>F.examples.push({example:x,term:noArt(m[1].split(/\s+(?:of|in|from|like)\s+/).pop()),src:raw})); }
      // ---- dates and events
      if((m=s.match(/^(?:the\s+)?(.+?)\s+(was|were)\s+(signed|founded|established|built|discovered|invented|declared|created|written|published|held|born|killed|executed|launched|started|approved|ratified)\s+(?:on|in)\s+(?:[A-Z][a-z]+\s+\d{1,2},\s+)?(\d{3,4})\b/i))) F.dates.push({subject:trimP(m[1]),verb:`${m[2]} ${m[3]}`,year:m[4],src:raw});
      else if((m=s.match(/^(?:the\s+)?(.+?)\s+(began|started|ended|occurred|happened|took place)\s+(?:on|in)\s+(?:[A-Z][a-z]+\s+\d{1,2},\s+)?(\d{3,4})\b/i))) F.dates.push({subject:trimP(m[1]),verb:m[2],year:m[3],src:raw});
      else if((m=s.match(/^in\s+(\d{3,4}),\s*(.+)$/i))) F.dates.push({subject:"",clause:trimP(m[2]),year:m[1],src:raw});
      // ---- names: "A is known as B"
      if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,60}?)\s+(is called|are called|is known as|are known as|was called|was known as|is considered|was considered)\s+(?:an?\s+|the\s+)?(.{2,60})$/i)) && words(m[3]).length<=6){
        if(isName(m[1])) F.names.push({who:trimP(m[1]),title:trimP(m[3]),verb:m[2].toLowerCase(),src:raw});
        else { F.defs.push({art:"",term:noArt(m[3]),verb:/are/i.test(m[2])?"are":"is",def:lc(m[1]),src:raw}); addTerm(m[3],3); lastTerm=noArt(m[3]); }
        continue;
      }
      // ---- classification: "X is a type/kind/form of Y"
      if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,50}?)\s+(?:is|are)\s+(?:an?\s+)?(?:type|kind|form|category|branch|part)s?\s+of\s+(?:an?\s+)?(.+?)(?:\s+(?:that|which|in|used)\b.*)?$/i)) && !PRON.test(m[1])){ F.classes.push({item:noArt(m[1]),category:noArt(m[2]),src:raw}); addTerm(m[1],2); addTerm(m[2],1); }
      // ---- lists
      if((m=s.match(/^(?:there\s+are\s+)?(?:the\s+)?(?:\w+\s+)?(?:main\s+|basic\s+|major\s+)?(types|kinds|parts|steps|components|examples|layers|phases|stages|characteristics|elements|principles|functions|categories|levels|branches|properties|features|advantages|disadvantages|causes|effects|operations|service models|models)\s+of\s+(.+?)(?:\s+(?:commonly\s+)?used)?\s*(?:are|include|includes|consist of|:)\s*(.+)$/i))){
        const items=splitItems(m[3]); if(items.length>=2){ const L={kind:m[1].toLowerCase(),subject:trimP(m[2]),items,src:raw}; F.lists.push(L); items.forEach(x=>addTerm(x,2)); if(/^steps$/.test(L.kind)) F.steps.push({process:L.subject,steps:items,src:raw}); lastTerm=noArt(m[2]); continue; }
      }
      if((m=s.match(/^(?:(?:an?|the)\s+)?(.+?)\s+(?:has|have|consists of|consist of|is composed of|includes|include)\s+(?:\w+\s+)?(?:main\s+)?(parts|components|layers|steps|types|elements|stages|phases|features|operations)[:\s]+(.+)$/i))){
        const items=splitItems(m[3]); if(items.length>=2){ F.lists.push({kind:m[2].toLowerCase(),subject:noArt(m[1]),items,src:raw}); items.forEach(x=>addTerm(x,2)); continue; }
      }
      // ---- "X, unlike Y, is …" (definition + contrast)
      if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,40}?),\s*unlike\s+(?:an?\s+|the\s+)?(.{2,40}?),\s*(is|are)\s+(.+)$/i))){ F.contrasts.push({a:noArt(m[1]),b:noArt(m[2]),src:raw}); addTerm(m[1],3); addTerm(m[2],2); s=`${m[1]} ${m[3]} ${m[4]}`; }
      // ---- relationships
      if((m=s.match(/^when\s+(?:the\s+)?(.+?)\s+(increases|decreases|rises|falls|goes up|goes down),\s*(?:the\s+)?(.+?)\s+(increases|decreases|rises|falls|goes up|goes down)/i))) F.rels.push({x:trimP(m[1]),dx:m[2],y:trimP(m[3]),dy:m[4],src:raw});
      else if((m=s.match(/^(increasing|decreasing|raising|lowering|reducing)\s+(?:the\s+)?(.+?)\s+(increases|reduces|decreases|raises|lowers)\s+(?:the\s+)?(.+)$/i))){ const up=/^(increasing|raising)$/i.test(m[1]); const yup=/^(increases|raises)$/i.test(m[3]); F.rels.push({x:trimP(m[2]),dx:up?"increases":"decreases",y:trimP(m[4]),dy:yup?"increases":"decreases",src:raw}); }
      // ---- comparatives
      if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,40}?)\s+(?:is|are)\s+((?:more|less)\s+\w+|\w+er)\s+than\s+(?:an?\s+|the\s+)?(.{2,40})$/i)) && !PRON.test(m[1]) && !/\b(occurs?|happens?|when|if|where|because)\b/i.test(m[1])) F.comps.push({a:noArt(m[1]),comp:m[2],b:noArt(m[3]),src:raw});
      // ---- limitations
      if((m=s.match(/^however,\s*(?:it|they|this)\s+(.+)$/i)) && lastTerm) F.limits.push({term:lastTerm,limit:trimP(m[1]),src:raw});
      // ---- purposes
      if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,50}?)\s+(?:is|are)\s+used\s+(to|for)\s+(.+)$/i)) && !PRON.test(m[1])){ { const hd=m[1].match(/^(.+?)\s+(?:is|are)\s+(?:an?|the)\s+.+?\s+(?:that|which)$/i); if(hd) m[1]=hd[1]; } F.purposes.push({term:noArt(m[1]),purpose:(m[2]==="to"?"":"for ")+trimP(m[3]),src:raw}); addTerm(m[1],2); }
      else if((m=s.match(/^(?:it|they)\s+(?:is|are)\s+used\s+to\s+(.+)$/i)) && lastTerm) F.purposes.push({term:lastTerm,purpose:trimP(m[1]),src:raw});
      else if((m=s.match(/^the\s+(?:main\s+)?(?:purpose|goal|aim|function)\s+of\s+(?:an?\s+|the\s+)?(.+?)\s+is\s+(?:to\s+)?(.+)$/i))) F.purposes.push({term:noArt(m[1]),purpose:trimP(m[2]),src:raw});
      else if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,40}?)\s+(?:helps?|allows?|enables?)\s+(?:to\s+)?(.+)$/i)) && words(m[1]).length<=4 && !PRON.test(m[1]) && !/^(planting|using|burning)\b/i.test(m[1])) F.purposes.push({term:noArt(m[1]),purpose:trimP(m[2]),src:raw,helps:true});
      // ---- causes and effects
      if((m=s.match(/^(.+?),?\s+because\s+(?:of\s+)?(.+)$/i))) F.causes.push({effect:trimP(m[1]),cause:trimP(m[2]),src:raw});
      else if((m=s.match(/^(.+?),?\s+(?:which\s+)?(?:helps?\s+(?:to\s+)?)?(results in|result in|leads to|lead to|causes|cause|prevents|prevent|reduces|reduce|increases|increase|threatens|threaten|releases|release|produces|produce)\s+(.+)$/i)) && words(m[1]).length<=10 && !(/^(releases?|produces?)$/i.test(m[2]) && !/^\w+ing\b/.test(trimP(m[1]))) && !/\b(teams?|people|users?|students?|staff|employees?|developers?|managers?|workers?|he|she|they|we|you)\b/i.test(m[1]) && !/^when\b/i.test(m[1]) && !/\b(used|able|going|have|has|need|needs|want|wants)\s+to$|\bto$/i.test(trimP(m[1]))){
        let cause=trimP(m[1]); const w2=cause.match(/^(.+?),\s*which$/i); if(w2) cause=w2[1];
        cause=cause.replace(/\s+(helps?|can|will|may|could|tends? to)$/i,"");
        let verb=m[2].toLowerCase(); if(!/s$/.test(verb) && !/(^|\s)(they|we|people)\s/i.test(cause) && !/s\b/.test(cause.split(" ").pop()||"")) verb=verb.replace(/^(result|lead|cause|produce|prevent|reduce|increase|release|threaten)$/,"$1s");
        if(/^(planting|using|burning|cutting|adding|increasing|reducing)\b/i.test(cause) && !/s$/.test(verb)) verb+="s";
        let eff0=trimP(m[3]); const inf=eff0.match(/^(.+?)\s+to\s+(\w+)$/); if(inf && /^(causes?|leads?)$/i.test(verb.split(" ")[0])){ const v=inf[2].toLowerCase(); const g=/ie$/.test(v)?v.slice(0,-2)+"ying":/[^e]e$/.test(v)?v.slice(0,-1)+"ing":/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(v)?v+v.slice(-1)+"ing":v+"ing"; eff0=`${inf[1]} ${g}`; verb=/s$/.test(verb)?"leads to":"lead to"; }
        F.causes.push({cause,verb,effect:eff0,src:raw});
      }
      else if((m=s.match(/^(?:due to|because of|as a result of)\s+(.+?),\s*(.+)$/i))) F.causes.push({cause:trimP(m[1]),effect:trimP(m[2]),src:raw});
      else if((m=s.match(/^without\s+(?:an?\s+|the\s+)?(.+?),\s*(.+)$/i))) F.causes.push({cause:"the absence of "+noArt(m[1]),effect:trimP(m[2]),src:raw,absence:noArt(m[1])});
      else if((m=s.match(/^(?:an?\s+|the\s+)?(.{2,40}?)\s+occurs\s+when\s+(.+)$/i))) F.causes.push({cause:trimP(m[2]),effect:noArt(m[1])+" occurs",src:raw,cond:noArt(m[1])});
      // ---- contrasts
      if((m=s.match(/^unlike\s+(?:an?\s+|the\s+)?(.+?),\s*(?:an?\s+|the\s+)?(.+?)\s+(is|are|does|do|has|have|can|uses|use|stores|store|allows|allow|requires|require|provides|provide|follows|follow)\b/i))){ F.contrasts.push({a:noArt(m[2]),b:noArt(m[1]),src:raw}); addTerm(m[1],2); addTerm(m[2],2); }
      else if((m=s.match(/^(?:an?\s+|the\s+)?(.{2,40}?)\s+(?:is|are|does|do|has|have|uses|use|follows|follow)\b.+?,?\s+(?:whereas|while)\s+(?:an?\s+|the\s+)?(.{2,40}?)\s+(?:is|are|does|do|has|have|uses|use|follows|follow)\b/i))){ F.contrasts.push({a:noArt(m[1]),b:noArt(m[2]),src:raw}); addTerm(m[1],2); addTerm(m[2],2); }
      else if((m=s.match(/^(?:an?\s+|the\s+)?(.{2,30}?),\s*whereas,\s*(.+)$/i)) && lastTerm){ F.contrasts.push({a:noArt(m[1]),b:lastTerm,src:raw}); }
      // ---- definitions (last, so formulas/lists/classes are not misread)
      if((m=s.match(/^((?:an?|the)\s+)?(.{2,60}?)\s+(is defined as|are defined as|refers to|refer to|pertains to|means|states that|is|are|was|were)\s+(?!(?:to|not|also|used|very|often|usually|important|necessary|essential|responsible|made|found|called|known|one of|able|when|because|due|affected|computed|more|less|signed|founded|an? (?:type|kind|form|example)|the (?:type|kind|form|example)|\w+er than|\w+\s+if\b)\b)(.{8,})$/i))
         && words(m[2]).length<=5 && !PRON.test(m[2]) && !/^(two|three|four|some|many|all|most)\b/i.test(noArt(m[2])) && !/\b(and|or|,|formula|if|when)\b/i.test(m[2]) && !/=/.test(m[4]) && !/^(main\s+|basic\s+|major\s+|different\s+)?(\w+\s+)?(types|kinds|parts|steps|components|examples|layers|phases|stages|characteristics|elements|principles|functions|categories|levels|branches|properties|features)\s+of\b/i.test(m[2])){
        const v=m[3].toLowerCase(), items=splitItems(m[4]);
        if(items.length>=3 && items.every(x=>x.split(" ").length<=4) && /,/.test(m[4]) && !/^(an?|the)\s/i.test(m[4])){ F.lists.push({kind:noArt(m[2]),subject:"",items,src:raw}); items.forEach(x=>addTerm(x,2)); }
        else if(!F.defs.some(d=>d.term.toLowerCase()===noArt(m[2]).toLowerCase())){ F.defs.push({art:(m[1]||"").trim().toLowerCase(),term:noArt(m[2]),verb:v,def:trimP(m[4]),src:raw}); addTerm(m[2],3); lastTerm=noArt(m[2]); }
      }
      (s.match(/(?<=[a-z,]\s)(?:[A-Z][a-z]+\s?){2,3}/g)||[]).forEach(w=>addTerm(w,1));
    }
    if(ordered.length>=2 && !F.steps.length) F.steps.push({process:"",steps:ordered,src:"",ordered:true});
    { const AB={}; for(const m0 of String(text).matchAll(/\b([A-Z][a-z]+(?:\s+[A-Za-z][a-z]+){0,4})\s+\(([A-Z]{2,6})\)/g)) AB[m0[2]]=m0[1].replace(/^(.)/,c=>c.toUpperCase()).split(" ").map(w=>/^(of|and|the|for|in)$/i.test(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
      const full=t=>{ const k=String(t).trim(); if(AB[k]) return AB[k]; const m1=k.match(/^(.+?)\s*\(([A-Z]{2,6})\)$/); return m1&&AB[m1[2]]?AB[m1[2]]:t; };
      F.purposes.forEach(p=>p.term=full(p.term)); F.causes.forEach(c=>{ c.cause=c.cause.replace(/\b([A-Z]{2,6})\b/g,w=>w); }); F.defs.forEach(d=>d.term=full(d.term)); F.abbr=AB; }
    F.lists=F.lists.filter(l=>!l.items.some(x=>/^(true|false|yes|no|\d+)$/i.test(x.trim())||/\b(usually|written|often|called)\b/i.test(x)));
    F.defs.forEach(d=>{ d.term=termCase(d.term); d.head=(d.def.toLowerCase().replace(/^(an?|the)\s+/,"").split(/\s+/)[0]||""); d.entity=/^[A-Z]/.test(d.term)&&!/^[A-Z]{2,}/.test(d.term)&&!/\b(theorem|law|map|principle|rule|method|algorithm|gate|table|test|model|equation|formula|diagram|circuit|distribution|search|sort|code|protocol)s?$/i.test(d.term); d.tool=IT.test(text)||F.purposes.some(p=>same(p.term,d.term)); });
    F.termList=[...F.terms.values()].filter(x=>x.w>=1).sort((a,b)=>b.w-a.w).map(x=>termCase(x.t));
    F.main=F.defs[0]?.term||F.lists[0]?.subject||F.purposes[0]?.term||F.termList[0]||"";
    return F;
  }
  function readFil(s,raw,F,addTerm){
    let m;
    if((m=s.match(/(?:ang\s+)?mga\s+(uri|bahagi|hakbang|halimbawa|katangian|elemento|sanhi|epekto)\s+ng\s+(.+?)\s+ay\s+(.+)$/i))){ F.lists.push({kind:m[1],subject:noArt(m[2]),items:splitItems(m[3]),src:raw}); return; }
    if((m=s.match(/^halimbawa,?\s+(?:ang\s+)?(.+?)\s+ay\s+(?:isang\s+)?(?:uri\s+ng\s+)?(.+)$/i))){ F.examples.push({example:noArt(m[1]),term:noArt(m[2]),src:raw}); return; }
    if((m=s.match(/^(.+?)\s+dahil\s+(?:sa\s+)?(.+)$/i))){ F.causes.push({effect:trimP(m[1]),cause:trimP(m[2]),src:raw}); return; }
    if((m=s.match(/^hindi\s+tulad\s+ng\s+(.+?),\s*(?:ang\s+)?(.+?)\s+ay\s+(.+)$/i))){ F.contrasts.push({a:noArt(m[2]),b:noArt(m[1]),src:raw}); addTerm(m[1],2); addTerm(m[2],2); }
    if((m=s.match(/^(?:ang\s+)?(.+?)\s+ay\s+ginagamit\s+(?:upang|para sa|sa)\s+(.+)$/i))){ F.purposes.push({term:noArt(m[1]),purpose:trimP(m[2]),src:raw}); return; }
    if((m=s.match(/^(?:ang\s+(?:mga\s+)?)?(.{2,60}?)\s+ay\s+(?:isang\s+|ang\s+)?(.{8,})$/i)) && !PRON.test(m[1])){ F.defs.push({term:noArt(m[1]),verb:"ay",def:trimP(m[2]),src:raw,head:""}); addTerm(m[1],3); }
  }

  /* ---- formulas: parse, evaluate, and build number problems ---- */
  function addVars(f, where){
    trimP(where).split(/\s*,\s*(?:and\s+)?|\s+and\s+(?=[A-Za-z]\s+is\b)/).forEach(part=>{
      const m=part.match(/^([A-Za-z]\w*)\s+(?:is|are|=)\s+(?:the\s+)?(.+)$/i); if(!m) return;
      let mean=trimP(m[2]), unit=""; const u=mean.match(/^(.+?)\s+in\s+(\w+)$/); if(u){ mean=u[1]; unit=u[2]; }
      if(f.vars[m[1]]!==undefined) f.vars[m[1]]={mean,unit};
    });
  }
  function parseFormula(expr, where, name){
    const m=String(expr).match(/^\s*([A-Za-z]\w*)\s*=\s*(.+?)\s*$/); if(!m) return null;
    const lhs=m[1], rhs=m[2].replace(/×|·/g,"*").replace(/÷/g,"/");
    if(!/^[\w\s*\/+\-().^!]+$/.test(rhs)) return null;
    const ids=[...new Set(rhs.match(/[A-Za-z]\w*/g)||[])].filter(v=>!/^(pi|sqrt)$/i.test(v));
    if(!ids.length || ids.length>4) return null;
    const f={name:trimP(name).replace(/^the\s+/i,""), expr:`${lhs} = ${m[2].trim()}`, lhs, rhs, vars:{}};
    [lhs,...ids].forEach(v=>f.vars[v]={mean:"",unit:""});
    if(where) addVars(f, where);
    if(!f.vars[lhs].mean && f.name) f.vars[lhs].mean=f.name;
    return f;
  }
  function evalFormula(f, vals){
    try{ let js=f.rhs.replace(/\^/g,"**").replace(/\bpi\b/gi,"Math.PI").replace(/\bsqrt\b/gi,"Math.sqrt");
      for(let k=0;k<6 && /!/.test(js);k++) js=js.replace(/(\w+|\([^()]*\))!/g,"__f($1)");
      const __f=x=>{ if(x<0||x>170||Math.round(x)!==x) return NaN; let p=1; for(let i=2;i<=x;i++) p*=i; return p; };
      const fn=new Function("__f",...Object.keys(vals), `return (${js});`); const r=fn(__f,...Object.values(vals)); return Number.isFinite(r)?r:null; }catch(e){ return null; }
  }
  const fmtNum = x => { const r=Math.round(x*100)/100; return Math.abs(r)>=1000 ? r.toLocaleString("en-US") : String(r); };
  function niceValue(v, meaning, r){
    const t=(meaning||"").toLowerCase();
    if(/rate|percent|probability/.test(t)) return [0.02,0.03,0.04,0.05,0.06,0.08,0.1][Math.floor(r()*7)];
    if(/year|time|hour|second|minute/.test(t)) return 1+Math.floor(r()*9);
    if(/principal|amount|price|cost|money|salary/.test(t)) return (1+Math.floor(r()*20))*1000;
    if(/number of|total/.test(t)) return 2+Math.floor(r()*40);
    return 2+Math.floor(r()*48);
  }
  function numberProblem(f, r){
    const inputs=Object.keys(f.vars).filter(v=>v!==f.lhs); let vals={};
    const fact=/!/.test(f.rhs);
    for(let tries=0;tries<30;tries++){
      vals={}; for(const v of inputs) vals[v]=fact ? 2+Math.floor(r()*9) : niceValue(v,f.vars[v].mean,r);
      // a part (chosen, selected, favorable) can't be larger than its whole
      const part=inputs.find(v=>/chosen|selected|taken|favou?rable|success/i.test(f.vars[v].mean)), whole=inputs.find(v=>v!==part && /number of|total/i.test(f.vars[v].mean));
      if(part && whole && vals[part]>vals[whole]) [vals[part],vals[whole]]=[vals[whole],vals[part]];
      if(part && whole && fact && vals[part]===vals[whole]) continue;
      const a=evalFormula(f,vals); if(a!==null && a>=0 && (!fact || Math.round(a)===a)) break;
    }
    if(inputs.length===2 && /\//.test(f.rhs)){ const [a,b]=f.rhs.split("/").map(x=>x.trim()); if(vals[a]!==undefined && vals[b]!==undefined && /favorable|favourable/.test(f.vars[a].mean) && vals[a]>vals[b]) [vals[a],vals[b]]=[vals[b],vals[a]]; }
    const ans=evalFormula(f,vals); if(ans===null) return null;
    const desc=inputs.map(v=>{ const mn=f.vars[v].mean, u=f.vars[v].unit; return mn ? `the ${mn.replace(/^the\s+/i,"")} (${v}) is ${fmtNum(vals[v])}${u?" "+u:""}` : `${v} = ${fmtNum(vals[v])}`; });
    const target=f.vars[f.lhs].mean||f.lhs, tu=f.vars[f.lhs].unit;
    const list=desc.length>1 ? desc.slice(0,-1).join(", ")+" and "+desc[desc.length-1] : desc[0];
    const stem=`If ${list}, use ${f.expr} to compute ${f.vars[f.lhs].mean?`the ${target.replace(/^the\s+/i,"")} (${f.lhs})`:f.lhs}.`;
    const wrong=new Set(); const vs=Object.values(vals);
    if(fact){ const F_=x=>{ let p=1; for(let i=2;i<=x;i++) p*=i; return p; }; const [x,y]=[Math.max(...vs),Math.min(...vs)];
      [ans*F_(y), ans/F_(y), Math.pow(x,y), x*y, F_(x), F_(x)/F_(y), ans+x].forEach(z=>{ if(Number.isInteger(z) && z>0 && z!==ans) wrong.add(fmtNum(z)); }); }
    else [ans*10, ans/10, vs.reduce((a,b)=>a+b,0), vs.length>=2?vs[0]/vs[1]:ans+1, vs.length>=2?vs[1]/vs[0]:ans-1, ans*2, ans/2, ans+vs[0]].forEach(x=>{ if(Number.isFinite(x) && Math.abs(x-ans)>1e-9) wrong.add(fmtNum(x)); });
    wrong.delete(fmtNum(ans));
    return {stem, answer:fmtNum(ans)+(tu?" "+tu:""), answerNum:fmtNum(ans), wrong:[...wrong].slice(0,5), unit:tu};
  }

  /* ================= writing ================= */
  let BACKUP=[];
  function mc(stem, answer, pool, r, n=4, useBank=true){
    const al=String(answer);
    const num=/^-?[\d,.]+$/.test(al), eq=(x,y)=>num?String(x).replace(/,/g,"")===String(y).replace(/,/g,""):same(x,y);
    let d=[]; for(const x0 of pool){ const x=trimP(x0); if(x && x.length<=90 && !eq(x,al) && !d.some(y=>y.toLowerCase()===x.toLowerCase())) d.push(x); }
    if(d.length<3 && useBank && al.split(" ").length<=4) d=d.concat(shuffle(BACKUP.filter(x=>!same(x,al) && !d.some(y=>same(x,y)) && !new RegExp("\\b"+reEsc(x)+"\\b","i").test(CUR)),r).slice(0,3-d.length));
    if(d.length<2) return null;
    const ch=shuffle([answer,...shuffle(d,r).slice(0,Math.min(n-1,d.length))],r);
    return {stem, choices:ch.map(x=>cap(String(x))), answer:"abcdefgh"[ch.indexOf(answer)], answerText:cap(String(answer))};
  }
  /* ---- settings library: real places used in applied, analysis, evaluation and creation questions ---- */
  const SETTINGS = [
    {id:"school", label:"School and campus", items:["a state university's registrar's office","a college library","a senior high school canteen","a campus clinic","a university's enrollment process","a school's guidance office","a computer laboratory","a campus dormitory","a school's supply office","a student council election","a college's scholarship office","a school's grading and class records","a campus bookstore","a school's alumni office","a college's online learning platform"]},
    {id:"gov", label:"Barangay and local government", items:["a barangay hall","a barangay health center","the municipal treasurer's office","a municipal disaster risk reduction office","the barangay tanod's incident logbook","a municipal civil registry","a public library run by the municipality","the barangay's senior citizen assistance program","a city business permit office","a municipal social welfare office","a barangay's waste collection schedule","a provincial agriculture office"]},
    {id:"health", label:"Health services", items:["a rural health unit","a community pharmacy","a district hospital's emergency room","a dental clinic","a vaccination drive in a barangay","a hospital's patient records section","a medical laboratory","a maternity clinic","a school feeding program","a blood donation drive"]},
    {id:"biz", label:"Small business and market", items:["a sari-sari store","a public market","a small bakery","a carinderia","a motorcycle repair shop","an online shop that sells local products","a water refilling station","a computer shop","a small printing and photocopy business","a hardware store","a cooperative store","a pawnshop","a laundry shop","a milk tea shop","a mini-grocery"]},
    {id:"agri", label:"Farming and fisheries", items:["a rice farm","a fishing cooperative","a coconut plantation","a vegetable farm","a poultry farm","a seaweed farm","a mango orchard","an irrigation association","a fish port","a farmers' market"]},
    {id:"tourism", label:"Tourism and transport", items:["a beach resort","a small hotel","a travel agency","a tricycle terminal","a bus company","a port's passenger terminal","a local tour guide association","a restaurant near a tourist spot","a homestay business","an island-hopping tour"]},
    {id:"office", label:"Offices and companies", items:["a bank branch","a call center","a small accounting firm","an insurance office","a logistics and delivery company","a manufacturing plant","a software development company","a real estate office","a telecommunications company's customer service","an electric cooperative's billing office","a water district's billing office","a remittance center"]},
    {id:"home", label:"Home and daily life", items:["a household kitchen","a family's monthly budget","a family's backyard garden","a jeepney ride to school","a household's electricity use","a family's savings plan","a neighborhood clean-up drive","a birthday party preparation","a family's water use at home","a trip to the market"]}
  ];
  const SETTINGS_FIL = ["isang barangay","isang sari-sari store","isang paaralan","isang health center","isang palengke","isang sakahan","isang kooperatiba","isang munisipyo","isang pamilya","isang karinderya","isang resort","isang tanggapan ng rehistro sa kolehiyo"];
  const DOMAIN_SETTINGS = {it:["school","gov","health","biz","office","tourism","agri"], math:["biz","home","school","agri","office"], sci:["home","agri","health","school","tourism"], econ:["biz","agri","gov","tourism","office","home"], eng:["school","home","gov"], hist:["gov","school","tourism"], other:["school","gov","biz","home"]};
  function generate(text, opts={}){
    // slide decks and outlines: read them as titles + bullets (see outline.js), not as sentences
    if(typeof Outline!=="undefined" && !opts.noOutline && !isFilipino(text) && Outline.looksOutline(text)){
      const o=Outline.generate(text,{seed:opts.seed}); const stats=opts.stats||{};
      let res=o.questions.map((q,i)=>{ const s=stats[q.tpl]; return {...q, score:(s?((s.kept+1)/(s.shown+2)-0.5)*4:0)-i*0.0001}; });
      if(opts.level) res=res.filter(q=>q.level===opts.level);
      if(opts.type&&opts.type!=="any") res=res.filter(q=>opts.type==="short"?(q.type==="short"||q.type==="essay"):q.type===opts.type);
      res.sort((a,b)=>b.score-a.score);
      const K=o.K; return {questions:res, outline:true, facts:{definitions:K.list.filter(c=>c.def.length).length, names:0, dates:0, lists:K.groups.length, steps:K.groups.filter(g=>g.ordered).length, examples:K.list.reduce((a,c)=>a+c.examples.length,0), classes:0, formulas:0, causes:0, relationships:0, comparisons:K.list.filter(c=>c.strengths.length||c.benefits.length).length, purposes:K.list.reduce((a,c)=>a+c.does.length+c.purpose.length,0), terms:K.list.slice(0,8).map(c=>c.name), filipino:false, main:K.list[0]?.name||""}};
    }
    const F=read(text), r=rng(opts.seed||11);
    BACKUP = F.fil ? [] : (BANK[domain(text)]||[]);
    const IT_T=IT.test(text);
    // setting: the teacher's own text, else settings from the library that fit the subject (one per question, rotating)
    const fixed=trimP(opts.context);
    let pool=[];
    if(!fixed && opts.useLibrary!==false){
      const dom=IT_T?"it":(domain(text)||"other"), cats=opts.categories||DOMAIN_SETTINGS[dom]||DOMAIN_SETTINGS.other;
      if(F.fil) pool=(opts.filSettings||[]).concat(SETTINGS_FIL);
      else pool=SETTINGS.filter(c=>cats.includes(c.id)).flatMap(c=>c.items);
      const mine=(opts.mySettings||[]).map(trimP).filter(x=>x && !F.fil===!isFilipino(x));
      pool=shuffle(pool,rng((opts.seed||11)*7+3)); pool=shuffle(mine,rng((opts.seed||11)*5+1)).concat(pool);   // yours first
      pool=[...new Set(pool)];
    }
    const CT="\u27e8ctx\u27e9";
    const ctx=fixed || (pool.length?CT:(F.fil ? "inyong paaralan o komunidad" : IT_T ? "a school information system" : "your school or community"));
    const hasCtx=!!fixed || pool.length>0;
    let ci=0; const nextCtx=()=>pool[(ci++)%pool.length];
    const artifact=F.fil ? (IT_T?"isang sistema":"isang proyekto") : IT_T ? shuffle(["a system","a database design","a program","an application"],r)[0] : shuffle(["a project","a class activity","a plan","an information campaign"],r)[0];
    const out=[];
    const push=(tpl,level,type,q,slots,src)=>{ if(!q) return; if(typeof q==="string") q={stem:q};
      if(q.stem.includes(CT)){ const c=nextCtx(); q={...q,stem:q.stem.split(CT).join(c),setting:c}; slots={...(slots||{}),ctx:c}; } else if(slots&&slots.ctx===CT){ slots={...slots}; delete slots.ctx; } q.stem=cap(q.stem.replace(/\s+/g," ").replace(/\s+([?.,])/g,"$1").replace(/\.\./g,".")); out.push({tpl,level,type,...q,slots:slots||{},basis:src||""}); };
    const fragment=x=>/^(first|last)\s+(in|out)$/i.test(x)||/\s(in|out|of|to|for|and|or|the|a)$/i.test(x)||/^(in|out|of|and|or)\s/i.test(x);
    const inSentence=x=>CUR.split("\n").some(l=>/[.!?]\s*$/.test(l.trim()) && new RegExp("\\b"+reEsc(x)+"\\b","i").test(l));
    const D=F.defs.map(d=>d.term), terms=F.termList.filter(t=>!/\b(commonly|used|main|types?|parts?|kinds?)\b/i.test(t) && !fragment(t) && (F.defs.some(d=>same(d.term,t))||F.purposes.some(p=>same(p.term,t))||inSentence(t)));
    const withArt=d=>(d.art&&!/^[A-Z]{2,}/.test(d.term)?d.art+" ":"")+d.term;
    const allEffects=F.causes.map(c=>c.effect), allItems=F.lists.flatMap(l=>l.items);
    const pairs=[...F.contrasts.map(c=>[c.a,c.b])];
    for(let a=0;a<F.defs.length;a++) for(let b=a+1;b<F.defs.length;b++) if(F.defs[a].head&&F.defs[a].head===F.defs[b].head) pairs.push([F.defs[a].term,F.defs[b].term]);
    F.lists.forEach(l=>{ if(l.items.length>=2) pairs.push([l.items[0],l.items[1]]); });
    const MC=(stem, answer, wrongs, extra, ordered)=>{ answer=String(answer).trim(); const w=[]; for(const x of wrongs){ const t=String(x||"").trim(); if(t && !w.some(y=>y.toLowerCase()===t.toLowerCase()) && t.toLowerCase()!==answer.toLowerCase()) w.push(t); }
      if(w.length<2) return null; const ch=shuffle([answer,...(ordered?w:shuffle(w,r)).slice(0,3)],r); return {stem, choices:ch.map(cap), answer:"abcdefgh"[ch.indexOf(answer)], answerText:cap(answer), ...(extra||{})}; };
    const art=t=>{ if(/^(an?|the)\s/i.test(t)||/\//.test(t)||/^\w+ing\b/i.test(t)) return t; const b=bare(t), key=b.toLowerCase().replace(/s$/,"");
      if(/^[A-Z]{2,}\s+[a-z]/.test(b)){ const m1=new RegExp("\\b(a|an|the)\\s+"+reEsc(b)+"\\b","i").exec(CUR); return (m1?m1[1].toLowerCase():"a")+" "+b; }
      if(/^[A-Z]{2,}\b/.test(t)||TITLE(t)) return t;
      const d0=F.defs.find(d=>d.term.toLowerCase().replace(/s$/,"")===key); if(d0 && d0.art && d0.term.toLowerCase()===b.toLowerCase()) return d0.art+" "+b; if(/s$/.test(b)&&!/(ss|is|us)$/.test(b)&&d0) return b;
      const m0=new RegExp("\\b(a|an|the)\\s+"+reEsc(b)+"\\b","i").exec(CUR); const bareUse=new RegExp("(^|[.!?]\\s+|\\n)"+reEsc(b)+"\\s+(is|are|was|were|states|refers|means|has|have|can|shows|gives|uses|helps|allows)\\b","i").test(CUR);
      if(bareUse && !(d0&&d0.art)) return b; if(m0) return m0[1].toLowerCase()+" "+b; return art0(t); };
    const art0=t=>/^(an?|the)\s/i.test(t)||/^[A-Z]{2,}/.test(t)||/s$/.test(t)&&!/ss$/.test(t)||/^[A-Z][a-z]+(?:'s|s')/.test(t)?t:(/^[aeiou]/i.test(t)?"an ":"a ")+t;
    const bare=t=>termCase(String(t).replace(/^(an?|the)\s+/i,""));
    const short=(t,n=22)=>{ n=Math.max(n,40); t=lc(String(t).replace(/[.]$/,"")); const w=t.split(" "); return w.length>n?w.slice(0,n).join(" ")+"…":t; };
    const actorIn = fixed?`In ${fixed}, a staff member`:IT_T?"An IT staff member":"A student";
    const normT=x=>String(x).toLowerCase().replace(/^(an?|the)\s+/,"").replace(/[^a-z0-9' ]/g,"").replace(/s\b/g,"").trim();
    const defOf = t=>{ const k=normT(t); return F.defs.find(d=>normT(d.term)===k) || F.defs.find(d=>{ const dk=normT(d.term); return k.length>=4 && dk.length>=4 && (new RegExp("\\b"+reEsc(dk)+"\\b").test(k)||new RegExp("\\b"+reEsc(k)+"\\b").test(dk)); }); };
    const isStmt=d=>d && /^states/.test(d.verb||"");
    const beOf=d=>isStmt(d)?"states that":"is";
    const kw=x=>new Set(String(x).toLowerCase().match(/[a-z]{4,}/g)?.filter(w=>!STOP.has(w)&&!/^(that|this|with|from|into|used|make|makes|more|less|help|helps)$/.test(w)).map(w=>w.slice(0,5))||[]);
    const overlaps=(a,b)=>{ const A=kw(a); for(const w of kw(b)) if(A.has(w)) return true; return false; };
    const kin=(a,b)=>F.lists.some(l=>{ const k=l.kind.toLowerCase(); const inA=l.items.some(x=>same(x,a)), inB=l.items.some(x=>same(x,b)); return (inA&&k.includes(String(b).toLowerCase()))||(inB&&k.includes(String(a).toLowerCase())); });
    // "is a" links: a stack is a data structure, a LAN is a computer network, bubble sort is a sorting algorithm.
    // A parent or child of the answer is never used as a wrong choice, because it would also be right.
    const headNP=d=>String(d.def).toLowerCase().replace(/^(an?|the)\s+/,"").split(/\s+(that|which|who|whose|used|for|of|in|with|where|such|because|to)\b/)[0];
    const isA=(a,b)=>{ const d=defOf(a); if(!d||isStmt(d)) return false; const hb=normT(b); if(!hb||hb.length<3) return false; const h=headNP(d);
      if(new RegExp("\\b"+reEsc(hb)+"s?\\b").test(h)) return true; const lb=hb.split(" ").pop(); const hh=h.split(" ").pop(); return hb.split(" ").length>1 && lb===hh && lb.length>3 && !defOf(b)?.def?.toLowerCase().startsWith("the one"); };
    const titleLine=(String(text).split("\n").map(x=>x.trim()).find(Boolean)||"").toLowerCase();
    const umbrella=t=>{ const k=normT(t); if(!k||k.length<4) return false; const d=defOf(t); return (!/[.!?]$/.test(titleLine) && new RegExp("\\b"+reEsc(k)+"s?\\b").test(titleLine)) || !!(d && /^(the |a |an )?(branch|field|study|discipline|science|measure)\b/i.test(d.def)); };
    const related=(a,b)=>!!a&&!!b&&(umbrella(a)||umbrella(b)||isA(a,b)||isA(b,a)||kin(a,b)||(()=>{ const na=normT(a), nb=normT(b); return na&&nb&&na!==nb&&(new RegExp("\\b"+reEsc(na)+"\\b").test(nb)||new RegExp("\\b"+reEsc(nb)+"\\b").test(na)); })());
    const blocks=CUR.split(/\n\s*\n/); const secOf=t=>{ const rx=new RegExp("\\b"+reEsc(bare(t))+"\\b","i"); return blocks.findIndex(b=>rx.test(b)); };
    const stepItems=new Set(F.steps.flatMap(st=>st.steps.map(x=>x.toLowerCase())));
    // a plural category answer ("Boolean laws") would make its own members right too: leave out members and same-section terms
    const memberOf=(x,T)=>{ const hd=bare(T).split(" ").pop().toLowerCase(); if(!/s$/.test(hd)) return false; const sg=hd.replace(/s$/,""); return new RegExp("\\b"+reEsc(sg)+"s?\\b","i").test(x) || (secOf(x)>=0 && secOf(x)===secOf(T) && blocks.length>2); };
    const compared=(a,b)=>F.comps.some(c=>(same(c.a,a)&&same(c.b,b))||(same(c.a,b)&&same(c.b,a)));
    const clash=(term,purpose)=>F.purposes.some(o=>same(o.term,term)&&overlaps(o.purpose,purpose));
    const toolPool=[...new Set([...F.purposes.map(p=>bare(p.term)),...D.map(bare),...F.classes.map(c=>c.item),...terms.map(bare)])];
    for(let k=toolPool.length-1;k>=0;k--){ const x=toolPool[k]; if(F.names.some(n=>same(n.who,x)) || new RegExp("\\bby "+reEsc(x)+"\\b").test(CUR) || /^(usually|often|always|also|only|very|more|less|written|called|known|mainly|mostly)\b/i.test(x) || /\b(is|are|was|were|as|be)\b/i.test(x) || /^\d/.test(x) || /^(true|false|yes|no|none|all|both|1|0)$/i.test(x) || (!F.defs.some(d=>same(d.term,x)) && !F.purposes.some(p=>same(p.term,x)) && !CUR.split("\n").some(l=>/[.!?]\s*$/.test(l.trim()) && new RegExp("\\b"+reEsc(x)+"\\b","i").test(l)))) toolPool.splice(k,1); }
    const procName=st=>{ const p0=st.process?st.process.replace(/^(the|an?)\s+/i,""):""; return !p0?"the procedure":/^\w+ing\b/i.test(p0)||/\w+ing$/i.test(p0)?p0:`the ${p0}`; };
    const OPP2={increases:"decreases",decreases:"increases",rises:"falls",falls:"rises","goes up":"goes down","goes down":"goes up"};
    /* ---- scenes: who is doing what, and where — built to fit the kind of idea being tested ---- */
    const DOM=IT_T?"it":(domain(text)||"other");
    const SYSTEM_FIT=[
      ["the enrollment database of a state university","database table record key normaliz index view query student sql data"],
      ["the inventory database of a hardware store","database table record key normaliz index view query stock product sql data search sort"],
      ["the patient records system of a district hospital","database record key index view privacy patient data security firewall integration"],
      ["the network of a senior high school","network router switch lan wan firewall cable topology wi-fi traffic ip bandwidth troubleshoot"],
      ["the Wi-Fi network of a public library","network router switch wireless firewall traffic bandwidth access"],
      ["the online ordering app of a milk tea shop","app order queue stack undo list array search sort web http api service cloud"],
      ["the queueing system of a bank branch","queue first in first out schedule customer line array"],
      ["the text editor used by the school paper","stack undo editor last in first out text"],
      ["the soil-moisture sensors of a rice farm","iot sensor actuator pump mqtt coap gateway edge devices device moisture temperature humidity broker publish subscribe reading"],
      ["the cold-storage monitoring of a fish port","iot sensor temperature mqtt gateway edge cloud alert devices device broker reading"],
      ["the smart water meters of a water district","iot sensor meter mqtt coap gateway edge device reading"],
      ["the systems of a hospital that must share patient data","integration middleware message broker queue service soa api soap http esb interoperab"],
      ["the payment and inventory systems of a supermarket chain","integration middleware message queue broker service api esb rpc"],
      ["the mobile app and servers of a food delivery service","http api rest web service cloud server order delivery app"],
      ["the ticketing system of a bus company","queue record database booking search sort"],
      ["the grading system of a senior high school","database record table sort search average algorithm"]];
    const SYSTEMS=SYSTEM_FIT.map(x=>x[0]);
    const fitSystem=(t,list,avoid)=>{ const q=String(t).toLowerCase(); let best=null, bs=0; for(const [sys,kw] of (list||SYSTEM_FIT)){ if(avoid && new RegExp("\\b"+reEsc(String(avoid).toLowerCase().replace(/s$/,""))+"s?\\b","i").test(sys)) continue; let sc=0; for(const w of kw.split(" ")) if(w.length>2 && q.includes(w)) sc++; sc+=r()*0.5; if(sc>bs){ bs=sc; best=sys; } } return bs>=1?best:null; };
    const ORGS=["a state university","a provincial hospital","a rural bank","a municipal government","a logistics company","an electric cooperative","a water district","a chain of drugstores","a telecommunications company","a large public high school"];
    const DEVICES=["the control circuit of a vending machine","the alarm circuit of a school gate","the control circuit of a water pump","a traffic light controller","the lighting control of a classroom","a coin-operated charging station"];
    const ACTIVITIES={math:["choosing officers for a class organization","arranging students in a row for a class picture","creating passwords for a school portal","planning the menu for a school event","scheduling games in an intramural league","drawing raffle winners at a school fair","assigning seats for an examination","packing relief goods into family packs"],logic:["an alarm that sounds when a door is open and the system is armed","a vending machine that gives a drink only when enough coins are inserted and a button is pressed","a pump that turns on when the tank is low or a switch is pressed","a school gate that opens when a valid ID is tapped"],other:["a school project","a community activity","a situation at home"]};
    const ROLES=[[/\b(network|router|switch|traffic|lan|wan|internet|firewall|ip address|bandwidth)\b/i,"network administrator"],[/\b(database|tables?|records?|quer(y|ies)|sql|normali[sz]|primary key|foreign key)\b/i,"database administrator"],[/\b(architecture|enterprise|togaf|zachman|business strategy|governance|stakeholder|roadmap|capabilit)/i,"enterprise architect"],[/\b(message|middleware|broker|integration|service|api|soap|http|mqtt|amqp|protocol|publish|subscribe)\b/i,"integration developer"],[/\b(program|code|software|application|editor|function|algorithm|sort|search|stack|queue|array|list|loop|variable)\b/i,"software developer"],[/\b(circuit|gate|voltage|current|resist|boolean|logic)\b/i,"electronics technician"],[/\b(farmers?|crops?|harvests?|soil|rice|fertili[sz]\w*)\b/i,"municipal agriculturist"],[/\b(price|consumer|market|goods?|seller|buyer|supply|demand|subsid)\w*/i,"market supervisor"],[/\b(patient|health|disease|clinic|vaccine|nurse)\b/i,"nurse in charge"],[/\b(probability|chance|game|investment|raffle|lottery)\b/i,"treasurer of a student organization"],[/\b(interest|loan|savings|deposit|bank)\b/i,"bank teller"],[/\b(plants?|leaf|leaves|cells?|photosynthesis|experiment|organisms?|chlorophyll|starch|species)\b/i,"science student"],[/\b(nutrients?|vitamins?|proteins?|carbohydrates?|diet|meal|food)\b/i,"school nutritionist"]];
    const roleCount=(rx,t)=>(String(t).match(new RegExp(rx.source,"gi"))||[]).length;
    const roleFor=s=>{ let best=null, bs=0; for(const [rx,ro] of ROLES){ const sc=3*roleCount(rx,s)+roleCount(rx,text); if(sc>bs){ bs=sc; best=ro; } } return best||(IT_T?"IT officer":"student"); };
    const aRole=ro=>(/^[aeiou]/i.test(ro)?"an ":"a ")+ro;
    const PRINC=/\b(law|theorem|principle|rule|formula|property|postulate|axiom|identity|equation|counting|permutation|combination|probability|expected value|event|sample space|mean|median|mode)\b/i;
    const TOOLY=/\b(device|tool|software|program|application|system|protocol|structure|algorithm|method|technique|framework|approach|language|diagram|map|table|model|service|platform|component|layer|network|router|switch|firewall|database|key|gate|sort|search|middleware|bus|broker|architecture|queue|stack|list|array|cable|server|computer|app|website|chart|checklist|plan)\b/i;
    const kindOf=t=>{ const d=defOf(t); if(d&&d.entity) return "entity"; const s=(t+" "+(d?d.def:"")).toLowerCase();
      if(PRINC.test(t)||(!IT_T&&DOM==="math")) return "principle";
      const TOOL2=/\b(policy|policies|ceiling|subsid\w*|tax|tariff|program|campaign|index|indexes|view|views|gateway|sensor|actuator|protocol|computing|filter|meter|machine|app|tool|device|software|system|method|technique|model|map|table)\b/i;
      if(F.purposes.some(p=>same(p.term,t)&&!p.benefit) && (TOOLY.test(t)||TOOL2.test(t)||(IT_T&&TOOLY.test(s)))) return "tool";
      const headOf=d?(d.def.replace(/^(an?|the)\s+/i,"").split(/\s+(that|which|who|used|for|of|in|with|where|such)\b/i)[0]):""; 
      if(IT_T && (TOOLY.test(t)||TOOLY.test(headOf))) return "tool";
      return "concept"; };
    let si=0; const placePool=pool.length?pool:SETTINGS.filter(c=>(DOMAIN_SETTINGS[DOM]||DOMAIN_SETTINGS.other).includes(c.id)).flatMap(c=>c.items);
    const mySet=(opts.mySettings||[]).map(trimP).filter(Boolean);
    const settingFor=t=>{ if(fixed) return fixed; const k=kindOf(t); if(k==="principle"||k==="entity") return null;
      if(mySet.length && r()<0.5) return mySet[(si++)%mySet.length];
      if(IT_T && k==="tool"){ const info=t+" "+((defOf(t)||{}).def||"")+" "+F.purposes.filter(p=>same(p.term,t)).map(p=>p.purpose).join(" "); const ro=roleFor(info);
        if(ro==="enterprise architect") return ORGS[(si++*7+Math.floor(r()*ORGS.length))%ORGS.length];
        if(ro==="electronics technician") return DEVICES[(si++*7+Math.floor(r()*DEVICES.length))%DEVICES.length];
        return fitSystem(info,null,bare(t)); }
      return placePool.length?placePool[(si++*5+Math.floor(r()*placePool.length))%placePool.length]:null; };
    const activityFor=t=>{ const a=/\b(gate|boolean|logic|truth table|circuit|karnaugh)\b/i.test(t+" "+text)?ACTIVITIES.logic:(DOM==="math"||PRINC.test(t))?ACTIVITIES.math:ACTIVITIES.other; return a[Math.floor(r()*a.length)]; };
    // a scene sentence for a need: "A network administrator working on the network of a senior high school needs to …"
    const hasOwnPlace=p=>/\b(in|for|of|between|on|at|from|within|across)\s+(an?\s+|the\s+)?\w+/i.test(p) && p.split(" ").length>=6;
    const needAsProblem=(who,purpose)=>{ let m;
      if((m=purpose.match(/^speed up (.+)$/i))) return `${who} reports that ${m[1]} take too long.`;
      if((m=purpose.match(/^make (.+?) faster$/i))) return `${who} reports that ${m[1]} ${/s$/.test(m[1])?"take":"takes"} too long.`;
      if((m=purpose.match(/^(block|prevent|stop) (.+)$/i))) return `${who} keeps finding cases of ${m[2]} and wants them to stop.`;
      if((m=purpose.match(/^protect (.+?) from (.+)$/i))) return `${who} has to keep ${m[1]} safe from ${m[2]}.`;
      if((m=purpose.match(/^reduce (.+)$/i))) return `${who} wants to cut down ${m[1]}.`;
      if((m=purpose.match(/^lower (.+)$/i))) return `${who} wants to bring down ${m[1]}.`;
      if((m=purpose.match(/^improve (.+)$/i))) return `${who} is not satisfied with the ${m[1].replace(/^the\s+/i,"")} and wants it better.`;
      if((m=purpose.match(/^find (.+)$/i))) return `${who} must locate ${m[1]}.`;
      if((m=purpose.match(/^(show|display) (.+?) to (.+)$/i))) return `${who} must make sure that ${m[3]} can see ${m[2]}.`;
      if((m=purpose.match(/^(show|display) (.+)$/i))) return `${who} must let people see ${m[2]}.`;
      if((m=purpose.match(/^schedule (.+)$/i))) return `${who} must line up ${m[1]} so they are handled in turn.`;
      if((m=purpose.match(/^implement (.+)$/i))) return `${who} is building ${m[1]}.`;
      if((m=purpose.match(/^store (.+)$/i))) return `${who} needs a place to keep ${m[1]}.`;
      if((m=purpose.match(/^identify (.+)$/i))) return `${who} must pin down ${m[1]}.`;
      if((m=purpose.match(/^connect (.+)$/i))) return `${who} must link ${m[1]}.`;
      if((m=purpose.match(/^process (.+)$/i))) return `${who} must handle ${m[1]}.`;
      if((m=purpose.match(/^update (.+)$/i))) return `${who} must revise ${m[1]}.`;
      return null; };
    const scene=(p, verb)=>{ const purpose=p.purpose.replace(/^to\s+/i,""), ro=roleFor(purpose+" "+p.term+" "+text.slice(0,400));
      let where=fixed||""; if(!where && IT_T && kindOf(p.term)==="tool" && !hasOwnPlace(purpose) && r()<0.7){ const s0=settingFor(p.term); if(s0) where=s0; }
      const who=where?((SYSTEMS.includes(where)||DEVICES.includes(where)||(/^(the|an?)\s/i.test(where)&&/system|network|app|portal|records|catalog|circuit|controller|control/i.test(where)))?`${aRole(ro)} working on ${where}`:`${aRole(ro)} at ${where}`):aRole(ro);
      const prob=!p.helps&&needAsProblem(cap(who),purpose);
      return {text:prob||`${cap(who)} ${verb||"needs to"} ${p.helps?"help "+purpose:purpose}.`, who, where, ro, problem:!!prob}; };
    const isAre=x=>/s$/.test(x)&&!/(ss|us|is|sis)$/.test(x)&&!/^[A-Z]{2,}$/.test(x)?"are":"is";
    const itThey=x=>isAre(x)==="are"?"they are":"it is";
    const reasonFor=t=>{ const d=defOf(t); if(!d||d.entity||isStmt(d)) return null; const df=short(d.def,16); if(/^(the one that|each|every)\b/i.test(df)) return null; return `${itThey(bare(t))} ${df}`; };
    const theNP=x=>{ x=String(x).trim(); return /^(the|an?|this|that|its|their|his|her|our|your|[A-Z])\b/.test(x)||/s$/.test(x.split(" ")[0])&&!/ss$/.test(x.split(" ")[0])?x:"the "+x; };
    const stepNP=x=>{ const t=lc(x); if(/^\w+ing\b/i.test(t)) return t; if(/\b(phase|step|stage)$/i.test(t)) return /^the\s/i.test(t)?t:"the "+t; return `the “${t}” step`; };
    const doingProc=st=>{ const p0=st.process?st.process.replace(/^(the|an?)\s+/i,""):""; if(!p0) return "is following a procedure"; if(/^\w+ing\b/i.test(p0)) return "is "+p0.toLowerCase().replace(/\b(boolean|sql|togaf|html|css|ip|lan|wan)\b/gi,w=>w==="boolean"?"Boolean":w.toUpperCase()); return "is following the steps of "+(/^[A-Z]{2,}|^[A-Z][a-z]+\s[A-Z]/.test(p0)?"the "+p0:/ing$/i.test(p0)?p0:"the "+p0); };
    let oi=0; const orgFor=need=>{ if(fixed) return fixed; if(IT_T){ const ro=roleFor(need||""); if(ro==="enterprise architect") return ORGS[(oi++*3+1)%ORGS.length]; if(ro==="electronics technician") return "the team building "+DEVICES[(oi++*3+1)%DEVICES.length]; const f=need?fitSystem(need):null; return "the team behind "+(f||SYSTEMS[(oi++*5+3)%SYSTEMS.length]); } const all=SETTINGS.flatMap(c=>c.items); const nw=(String(need||"").toLowerCase().match(/[a-z]{4,}/g)||[]).map(w=>w.slice(0,5)); let best=null, bs=0; for(const pl of all){ const pw=(pl.toLowerCase().match(/[a-z]{4,}/g)||[]).map(w=>w.slice(0,5)); const sc=pw.filter(w=>nw.includes(w)).length; if(sc>bs){ bs=sc; best=pl; } } if(best) return best;
      const KEY=[[/vegetable|rice|crop|farm|harvest|fish|food supply|market|price|goods/,"the municipal agriculture office"],[/health|disease|patient|nutrition|body|anemia|tooth/,"a rural health unit"],[/school|student|class|learn/,"a public high school"],[/water|flood|typhoon|disaster/,"a municipal disaster risk reduction office"],[/money|interest|loan|savings|bank/,"a rural bank"]];
      for(const [rx,pl] of KEY) if(rx.test(String(need||"").toLowerCase())) return pl; return "the community"; };
    const effNP=eff=>isClause(eff)?`the situation where ${eff}`:(/^(an?|the)\s/i.test(eff)||/^\w+ing\b/.test(eff)?eff:"the problem of "+eff);
    const pluralNP=x=>{ const h=String(x).split(/\s+(of|for|in|at|that|with)\s+/)[0].trim().split(" ").pop(); return /s$/.test(h)&&!/(ss|us|is)$/.test(h); };
    const isClause=x=>/\b(is|are|was|were|has|have|can|will|may|trap|traps|makes?|becomes?|gets?|goes|go|lose|loses|occurs?|happens?)\b/i.test(x) && x.split(" ").length>=3;
    if(F.fil){ writeFil(F,push,ctx,artifact,r,D,terms); }
    else {
    /* ---- definitions ---- */
    for(const d of F.defs){
      const t=withArt(d), T0=cap(t), dl=lc(d.def), be=/^(was|were|are)$/.test(d.verb)?d.verb:"is", S={term:t,def:dl,ctx};
      const kin=F.defs.filter(x=>x!==d&&x.head===d.head).map(x=>x.term);
      push("R.def.define","Remembering","short",{stem:`Define ${t}.`,answer:cap(d.def)},S,d.src);
      push("R.def.mc","Remembering","mc",mc(`Which term refers to ${dl}?`, d.term, [...kin,...D,...F.classes.map(c=>c.item),...allItems,...terms].filter(x=>!related(x,d.term)&&!stepItems.has(String(x).toLowerCase())), r),S,d.src);
      push("R.def.blank","Remembering","blank",{stem:`____ ${d.verb} ${dl}.`,answer:cap(d.term)},S,d.src);
      push("R.def.tf","Remembering","tf",{stem:`True or false: ${T0} ${d.verb} ${dl}.`,answer:"True"},S,d.src);
      const other=F.defs.find(x=>x!==d&&x.head===d.head&&!related(x.term,d.term)&&isStmt(x)===isStmt(d))||F.defs.find(x=>x!==d&&!related(x.term,d.term)&&isStmt(x)===isStmt(d));
      if(other) push("R.def.tf-false","Remembering","tf",{stem:`True or false: ${T0} ${d.verb} ${lc(other.def)}.`,answer:"False"},S,d.src);
      push("R.def.ident","Remembering","ident",{stem:`Identify the term being described: ${cap(d.def.replace(/[.]$/,""))}.`,answer:cap(d.term)},S,d.src);
      if(other && !same(other.term,d.term)){
        const wrongT=cap(withArt(other));
        if(r()<0.5) push("R.def.mtf","Remembering","mtf",{stem:`${T0} ${d.verb} ${dl}.`,underline:T0,answer:"True"},S,d.src);
        else push("R.def.mtf","Remembering","mtf",{stem:`${wrongT} ${d.verb} ${dl}.`,underline:wrongT,answer:`False — ${cap(d.term)}`},S,d.src);
      }
      if(F.defs.length>=3) push("U.def.best","Understanding","mc",mc(`Which of the following best describes ${t}?`, dl, F.defs.filter(x=>x!==d).map(x=>lc(x.def)), r, 4, false),S,d.src);
      push("U.def.own","Understanding","short",`Explain in your own words what ${t} ${be}.`,S,d.src);
      if(d.entity){
        push("N.ent.without","Analyzing","essay",`Analyze what would have changed if ${t} had not existed.`,S,d.src);
        push("N.ent.factors","Analyzing","essay",`Analyze the factors that made ${t} significant.`,S,d.src);
        push("E.ent.sig","Evaluating","essay",`How significant was ${t}? Justify your answer with evidence.`,S,d.src);
        push("C.ent.timeline","Creating","essay",`Create an original timeline, story or presentation about ${t}.`,S,d.src);
        continue;
      }
      if(!F.examples.some(e=>same(e.term,d.term))) push("U.def.example","Understanding","short",`Give an example of ${t} and explain why it is an example.`,S,d.src);
      const K0=kindOf(d.term), T1=art(bare(d.term));
      if(K0==="tool"){ const st0=settingFor(d.term)||(IT_T?"a system you know":"your school"), ro=roleFor(d.term+" "+d.def), sys=/system|network|app|portal|catalog|records|circuit|controller|control of/i.test(st0), org=ORGS.includes(st0);
        push("A.tool.demo","Applying","short",`${cap(aRole(ro))} is improving ${st0}. Explain step by step how ${T1} could be used there and what it would do.`,{...S,ctx:st0},d.src);
        push("N.tool.without","Analyzing","essay",`${cap(st0)} ${pluralNP(st0)?"do":"does"} not use ${T1}. Analyze the problems this could cause and explain how each problem is connected to what ${T1} ${isAre(bare(d.term))==="are"?"do":"does"}.`,{...S,ctx:st0},d.src);
        push("E.tool.best","Evaluating","essay",`${cap(aRole(ro))} proposes using ${T1} in ${st0}. Is this a good decision? Weigh its benefits and limits, and justify your answer.`,{...S,ctx:st0},d.src);
        push("C.tool.design","Creating","essay",org?`Plan how ${st0} could adopt ${T1}. Describe the steps, the people involved and what the organization would gain.`:sys?`Design an improvement to ${st0} that makes use of ${T1}. Describe how the parts of your design work together.`:`Design a simple system for ${st0} that makes use of ${T1}. Describe how the parts of your design work together.`,{...S,ctx:st0},d.src);
      } else if(K0==="principle"){ const act=activityFor(d.term);
        push("A.prin.use","Applying","short",`Use ${T1} to work out a problem about ${act}. Show each step of your solution.`,S,d.src);
        push("N.prin.when","Analyzing","essay",`Analyze how you can tell that a problem about ${act} calls for ${T1} rather than another rule.`,S,d.src);
        push("E.prin.claim","Evaluating","essay",`A classmate says ${T1} is only useful in the classroom. Do you agree? Justify your answer with a real example.`,S,d.src);
        push("C.prin.problem","Creating","essay",`Write an original word problem about ${activityFor(d.term+" x")} that is solved using ${T1}, then solve it.`,S,d.src);
      } else {
        push("U.con.observe","Understanding","short",`Describe a real situation where ${t} can be observed, and use the definition to show that it fits.`,S,d.src);
        push("N.con.parts","Analyzing","essay",`Break down the definition of ${t} into its key parts and explain how each part contributes to its meaning.`,S,d.src);
        push("E.con.importance","Evaluating","essay",`How important is ${t}? Justify your answer with reasons and examples.`,S,d.src);
        push("C.con.demo","Creating","essay",`Design an activity or demonstration that shows ${t} to your classmates.`,S,d.src);
      }
      push("C.def.original","Creating","essay",`Create an original example or scenario that illustrates ${t}.`,S,d.src);
    }
    /* ---- names and dates ---- */
    for(const nm of F.names){
      const title=nm.title.replace(/^(an?|the)\s+/i,""), art=/^an?\s/i.test(nm.title)?"":"the ", v=nm.verb.replace(/^(is|was)\s+/,""), be=/^was/.test(nm.verb)?"was":"is", S={who:nm.who,title};
      const others=F.names.filter(x=>x!==nm).map(x=>x.who).concat((F.text.match(/(?<=[a-z,]\s)(?:[A-Z][a-z]+\s){1,2}[A-Z][a-z]+/g)||[]).filter(x=>!same(x,nm.who)));
      push("R.name.who","Remembering","short",{stem:`Who ${be} ${v} ${art}${title}?`,answer:nm.who},S,nm.src);
      push("R.name.mc","Remembering","mc",mc(`Who ${be} ${v} ${art}${title}?`, nm.who, others, r),S,nm.src);
      push("U.name.why","Understanding","short",`Explain why ${nm.who} ${be} ${v} ${art}${title}.`,S,nm.src);
      push("E.name.deserve","Evaluating","essay",`Do you agree that ${nm.who} deserves to be ${v} ${art}${title}? Justify your answer.`,S,nm.src);
    }
    const IRREG={began:"begin",started:"start",ended:"end",occurred:"occur",happened:"happen","took place":"take place"};
    for(const dt of F.dates){
      if(!dt.subject) continue;
      const years=F.dates.map(x=>x.year).filter(y=>y!==dt.year); const y=+dt.year; [y-2,y+1,y+3,y-5].forEach(v=>years.push(String(v)));
      const subj=/^[A-Z]/.test(dt.subject)&&!/^The\b/.test(dt.subject)&&/^(Treaty|Battle|Revolution|Declaration|Constitution|Republic|Act|War)\b|\b(Treaty|War|Revolution|Battle|Act)\b/.test(dt.subject)?"the "+dt.subject:dt.subject;
      const aux=/^(was|were)\s/.test(dt.verb)?dt.verb.split(" ")[0]:"did";
      const q=aux==="did" ? `When did ${subj} ${IRREG[dt.verb]||dt.verb}?` : `When ${aux} ${subj} ${dt.verb.replace(/^(was|were)\s+/,"")}?`;
      const S={event:subj,year:dt.year};
      push("R.date.when","Remembering","short",{stem:q,answer:dt.year},S,dt.src);
      push("R.date.mc","Remembering","mc",mc(q, dt.year, years, r, 4, false),S,dt.src);
    }
    const dated=F.dates.filter(d=>d.subject);
    if(dated.length>=2) push("R.date.order","Remembering","seq",{stem:`Arrange these events in the order they happened: ${shuffle(dated.map(d=>d.subject),r).join("; ")}.`,answer:dated.slice().sort((a,b)=>a.year-b.year).map(d=>d.subject).join(" → ")},{},"");
    /* ---- lists and steps ---- */
    const realKind=l=>!/\bvs\.?\b|versus/i.test(l.kind) && !/^(key|important|basic|main|other|related|additional|more)\s+(concepts|terms|ideas|points|definitions|notes|words|topics)$/i.test(l.kind) && !/^(concepts|terms|ideas|definitions|notes|summary|overview)$/i.test(l.kind);
    for(const l of F.lists){ if(!realKind(l)) continue;
      const what=l.subject?`the ${l.kind} of ${l.subject}`:`the ${l.kind}`, S={what,items:l.items.join(", ")};
      const outside=[...D,...F.lists.filter(x=>x!==l).flatMap(x=>x.items),...F.classes.map(c=>c.item),...terms].filter(t=>!l.items.some(x=>same(x,t)) && !same(t,l.subject||"~") && !same(t,l.kind));
      push("R.list.enum","Remembering","enum",{stem:`Enumerate ${what}.`,answer:l.items.map(cap).join(", ")},S,l.src);
      push("R.list.mc","Remembering","mc",mc(`Which of the following is one of ${what}?`, l.items[0], outside, r),S,l.src);
      if(l.items.length>=3 && outside.length){ const odd=shuffle(outside,r)[0]; const ch=shuffle([...shuffle(l.items,r).slice(0,3),odd],r); push("R.list.not","Remembering","mc",{stem:`Which of the following is NOT one of ${what}?`,choices:ch.map(cap),answer:"abcd"[ch.indexOf(odd)],answerText:cap(odd)},S,l.src); }
      push("U.list.describe","Understanding","short",`Describe each of ${what} in your own words.`,S,l.src);
      { const toolList=IT_T && l.items.filter(x=>kindOf(x)==="tool").length>=Math.ceil(l.items.length/2) && !/\b(steps|phases|stages)\b/i.test(l.kind); const st1=toolList?settingFor(l.items[0]):null;
        push(toolList?"A.list.apply":"A.list.identify","Applying","short",toolList&&st1?`For ${st1}, explain where each of ${what} would be used and why.`:`Apply your knowledge of ${what} to identify each one in a real example or diagram.`,S,l.src); }
      push("N.list.relate","Analyzing","essay",`Examine how ${what} (${l.items.join(", ")}) are related to one another.`,S,l.src);
      push("E.list.most","Evaluating","essay",`Which of ${what} is the most important? Justify your choice.`,S,l.src);
      push("C.list.model","Creating","essay",`Create an original diagram or model that shows how ${what} work together.`,S,l.src);
    }
    for(const st of F.steps){
      const proc=procName(st);
      push("R.step.first","Remembering","mc",mc(`What is the first step of ${proc}?`, st.steps[0], st.steps.slice(1), r, 4, false),{process:proc},st.src);
      push("R.step.order","Remembering","seq",{stem:`Arrange the steps of ${proc} in the correct order: ${shuffle(st.steps,r).map(x=>lc(x)).join("; ")}.`,answer:st.steps.map(x=>lc(x)).join(" → ")},{process:proc},st.src);
      { const roS=roleFor((st.process||"")+" "+st.steps.join(" ")); const stx=IT_T?(fixed||(roS==="electronics technician"?DEVICES:roS==="enterprise architect"?ORGS:SYSTEMS)[Math.floor(r()*SYSTEMS.length)%(roS==="electronics technician"?DEVICES.length:roS==="enterprise architect"?ORGS.length:SYSTEMS.length)]):(fixed||placePool[Math.floor(r()*Math.max(1,placePool.length))]||"your school"); const prob=IT_T?`a problem reported in ${stx}`:DOM==="sci"?"a question you want to test at home or in school":fixed?`a problem at ${fixed}`:"a problem in your school or community";
        const GER={designing:"design",building:"build",creating:"create",developing:"develop",planning:"plan",writing:"write",making:"make",constructing:"construct",preparing:"prepare"}; const gm=proc.match(/^(\w+ing)\s+(.+)$/i);
        if(gm && GER[gm[1].toLowerCase()]) push("A.step.use","Applying","short",`Use the steps of ${gm[1].toLowerCase()} ${gm[2].toLowerCase()} to ${GER[gm[1].toLowerCase()]} ${gm[2].toLowerCase().replace(/^(an?|the)\s+/,"a ")} for ${IT_T?stx.replace(/^the (\w+ )?(database|system|app|network) of /,"")||stx:"your class or community"}. Show what you would do at each step.`,{process:proc,ctx:stx},st.src);
        else push("A.step.use","Applying","short",`Use the steps of ${proc} on ${prob}. Show what you would do at each step.`,{process:proc,ctx:stx},st.src); }
      push("N.step.why","Analyzing","essay",`Analyze why the steps of ${proc} must be done in that order.`,{process:proc},st.src);
      push("C.step.new","Creating","essay",`Design a one-page checklist based on ${proc} that a new ${IT_T?roleFor((st.process||"")+" "+st.steps.join(" ")):"student"} could follow. Add a check for each step and explain why it matters.`,{process:proc},st.src);
    }
    /* ---- examples and classifications ---- */
    const exGroups=[]; for(const e of F.examples){ const g=exGroups.find(x=>same(x.term,e.term)&&x.src===e.src); if(g) g.list.push(e.example); else exGroups.push({...e,list:[e.example]}); }
    for(const e of exGroups){
      const term=termCase(e.term), S={term,example:e.example}, ex=e.example.replace(/^"|"$/g,"");
      const pool=[...F.examples.filter(x=>!same(x.term,e.term)).map(x=>x.example), ...F.classes.filter(c=>!same(c.category,e.term)).map(c=>c.item), ...D.filter(x=>!same(x,term))];
      const aTerm=/^(an?|the)\s/i.test(term)||/s$/.test(term)||!new RegExp("\\b(a|an)\\s+"+reEsc(term)+"\\b","i").test(CUR)?term:(/^[aeiou]/i.test(term)?"an ":"a ")+term;
      push("R.ex.which","Remembering","mc",mc(`Which of the following is an example of ${aTerm}?`, e.example, pool.filter(x=>!related(x,term)&&!F.examples.some(y=>same(y.example,x)&&related(y.term,term))), r),S,e.src);
      if(e.list.length===1) push("U.ex.why","Understanding","short",/\s(and|at)\s/.test(ex)?`Explain why ${ex} are examples of ${aTerm}.`:`Explain why ${ex} is an example of ${aTerm}.`,S,e.src);
      const exs=e.list.map(x=>x.replace(/^"|"$/g,"")); const exList=exs.length>1?exs.slice(0,-1).join(", ")+" and "+exs[exs.length-1]:exs[0];
      push("U.ex.another","Understanding","short",`Give another example of ${aTerm} besides ${exList}, and explain why it fits.`,S,e.src);
    }
    for(const c of F.classes){
      const cats=[...new Set(F.classes.map(x=>x.category).concat(D))].filter(x=>!same(x,c.category)&&!same(x,c.item));
      push("R.class.what","Remembering","mc",mc(`${cap(c.item)} is a type of which of the following?`, c.category, cats, r),{item:c.item,category:c.category},c.src);
    }
    /* ---- formulas: number problems ---- */
    for(const f of F.formulas){
      const S={expr:f.expr};
      push("R.form.what","Remembering","short",{stem:f.name?`What is the formula for ${f.name.replace(/^the\s+/i,"")}?`:`Write the formula that relates ${Object.keys(f.vars).join(", ")}.`,answer:f.expr},S,f.src);
      const syms=Object.keys(f.vars).filter(v=>f.vars[v].mean);
      if(syms.length>=3){ const v=shuffle(syms,r)[0]; push("R.form.symbol","Remembering","mc",mc(`In the formula ${f.expr}, what does ${v} stand for?`, f.vars[v].mean, syms.filter(x=>x!==v).map(x=>f.vars[x].mean), r, 4, false),S,f.src); }
      for(let k=0;k<2;k++){
        const p=numberProblem(f,r); if(!p) break;
        push("A.form.compute","Applying","problem",{stem:p.stem,answer:p.answer,numeric:true},S,f.src);
        const m2=mc(p.stem, p.answerNum, p.wrong, r, 4, false); if(m2){ m2.numeric=true; push("A.form.mc","Applying","mc",m2,S,f.src); }
      }
      const k0=Object.keys(f.vars).find(v=>v!==f.lhs);
      push("N.form.effect","Analyzing","essay",`Using ${f.expr}, analyze what happens to ${f.vars[f.lhs].mean?"the "+f.vars[f.lhs].mean.replace(/^the\s+/i,""):f.lhs} when ${f.vars[k0]?.mean?"the "+f.vars[k0].mean.replace(/^the\s+/i,""):k0} is doubled.`,S,f.src);
      push("C.form.problem","Creating","essay",`Write an original word problem that uses ${f.expr}, then solve it.`,S,f.src);
    }
    /* ---- matching type (one set per lesson) ---- */
    const mdefs=F.defs.filter((d,i,a)=>a.findIndex(x=>same(x.term,d.term))===i && d.def.split(" ").length<=30).map(d=>({term:d.term,def:d.def}));
    F.purposes.forEach(p=>{ const t=termCase(p.term).replace(/^(an?|the)\s+/i,""); if(!mdefs.some(d=>same(d.term,t)||same(noArt(d.term).replace(/s$/,""),t.replace(/s$/,"")))) mdefs.push({term:t,def:"Used to "+p.purpose.replace(/^to\s+/i,"")}); });
    if(mdefs.length>=3){
      const set=shuffle(mdefs,r).slice(0,6), extra=[...F.classes.map(c=>c.item),...allItems,...terms].find(t=>!mdefs.some(d=>same(d.term,t)));
      const colB=shuffle([...set.map(d=>cap(d.term)),...(extra?[cap(extra)]:[])],r);
      const colA=set.map(d=>cap(d.def.replace(/[.]$/,"")));
      push("R.match.defs","Remembering","match",{stem:"Match each description in Column A with the correct term in Column B.",columns:{a:colA,b:colB},answer:set.map((d,i)=>`${i+1}-${"abcdefgh"[colB.indexOf(cap(d.term))]}`).join(", ")},{},"");
    }
    /* ---- analogies ---- */
    { const pr=[]; exGroups.forEach(e=>pr.push([e.list[0],termCase(e.term),"ex"])); F.classes.forEach(c=>pr.push([c.item,c.category,"cls"]));
      const ok=pr.filter(p=>p[0].split(" ").length<=6 && p[1].split(" ").length<=4);
      let n=0; for(let i=0;i<ok.length && n<3;i++) for(let j=0;j<ok.length && n<3;j++){ const [x1,y1,k1]=ok[i],[x2,y2,k2]=ok[j]; if(j<=i||k1!==k2||same(y1,y2)||same(x1,x2)) continue; n++;
        push("U.analogy","Understanding","analogy",{stem:`${cap(x1)} : ${y1} :: ${cap(x2)} : ______`,answer:y2},{a:x1,b:y1},""); break; } }
    /* ---- purposes: situation questions ---- */
    for(const p of F.purposes){
      const pt=art(bare(p.term)), purpose=p.purpose.replace(/^to\s+/i,""), S={term:pt,purpose}; const sc=scene(p);
      const tools=[...D,...F.purposes.map(x=>x.term),...F.classes.map(c=>c.item),...terms].filter(x=>!same(x,p.term)&&!clash(x,purpose)&&!related(x,p.term)&&!compared(x,p.term)&&!stepItems.has(String(x).toLowerCase()));
      push("U.purp.what","Understanding","short",{stem:`What is the purpose of ${pt}?`,answer:cap(p.purpose)},S,p.src);
      if(!p.benefit && kindOf(p.term)==="tool") push("A.purp.situation","Applying","case",mc(`Situation: ${sc.text} Which of the following should be used?`, bare(p.term), tools, r),{...S,ctx:sc.where},p.src);
      if(kindOf(p.term)==="tool"||p.benefit) push("A.purp.use","Applying","short",`${sc.text} Explain step by step how ${pt} could be used to ${sc.problem?"solve this":"do this"}.`,{...S,ctx:sc.where},p.src);
      else push("U.purp.explain","Understanding","short",`Use what you know about ${pt} to explain what would happen if ${isAre(bare(p.term))==="are"?"they":"it"} could no longer ${purpose}.`,S,p.src);
      { const alt0=F.purposes.find(x=>!same(x.term,p.term)&&!overlaps(x.purpose,purpose)); push("E.purp.claim","Evaluating","essay",alt0?`A classmate says that ${art(bare(alt0.term))} could ${purpose} just as well as ${pt}. Evaluate this claim by comparing what each one does.`:`A classmate says that ${pt} ${isAre(bare(p.term))==="are"?"are":"is"} not really needed to ${purpose}. Evaluate this claim.`,S,p.src); }
    }
    for(const l of F.limits){ const t=termCase(l.term); const stl=settingFor(t); push("E.limit.still","Evaluating","essay",`Considering that ${t} ${l.limit}, ${stl?`should ${stl} still adopt it`:"is it still worth using"}? Justify your answer.`,{term:t},l.src); }
    /* ---- causes, relationships, comparisons ---- */
    for(const c of F.causes){
      const effect=lc(c.effect), cause=lc(c.cause), S={cause,effect};
      if(c.verb){
        const clause0=/\b(is|are|was|were|has|have|traps?|makes?|gives?|uses?|can|will)\b/i.test(cause) && !/^\w+ing\b/.test(cause);
        const direct=!/^(leads? to|results? in|causes?)$/.test(c.verb);
        push("U.cause.how","Understanding","short",clause0?`Explain how ${effect} results when ${cause}.`:`Explain how ${cause} ${c.verb} ${effect}.`,S,c.src);
        const v3=v=>v.split(" ").map((w,i)=>i===0&&!/s$/.test(w)?w+"s":w).join(" ");
        const asIt=x=>`It ${v3(x.verb)} ${lc(x.effect)}`;
        const others=F.causes.filter(x=>x!==c && x.verb && !same(x.effect,c.effect)).map(asIt);
        const clause=/\b(is|are|was|were|has|have|helps?|traps?|releases?|makes?|causes?|gives?|uses?|can|will)\b/i.test(cause) && !/^\w+ing\b/.test(cause);
        push("U.cause.result","Understanding","mc",mc(clause?`What is the most likely result when ${cause}?`:`What is the most likely result of ${/^(an?|the)\s/i.test(cause)||/^\w+ing\b/.test(cause)?cause:"the "+cause}?`, asIt(c), others, r, 4, false),S,c.src);
        push("N.cause.rel","Analyzing","essay",clause0?`Analyze how ${effect} is related to the fact that ${cause}.`:direct?`Analyze the effects of ${cause}, including how it ${c.verb.replace(/^(\w+?)s?$/,m0=>m0.endsWith("s")?m0:m0+"s")} ${effect}.`:`Analyze the relationship between ${cause} and ${effect}.`,S,c.src);
        push("E.cause.agree","Evaluating","essay",`Do you agree that ${cause} always ${c.verb} ${effect}? Justify your answer.`,S,c.src);
      } else {
        push("U.cause.why","Understanding","short",{stem:c.cond?`Explain when ${/^(an?|the)\s/i.test(c.cond)?c.cond:(/^[aeiou]/i.test(c.cond)?"an ":"a ")+c.cond} occurs.`:`Explain why ${effect}.`,answer:cap(c.cause)},S,c.src);
        push("N.cause.connect","Analyzing","essay",c.absence?`Analyze why ${effect} without ${/^(an?|the)\s/i.test(c.absence)?c.absence:(/^[aeiou]/i.test(c.absence)?"an ":"a ")+c.absence}.`:`Analyze how the fact that ${cause} is connected to why ${effect}.`,S,c.src);
        push("E.cause.enough","Evaluating","essay",`Is the reason that ${cause} enough to explain why ${effect}? Justify your answer.`,S,c.src);
      }
      if(NEG.test(c.effect)){ const og=orgFor(c.effect+" "+c.cause); push("C.cause.plan","Creating","essay",`Propose an original plan for ${og} to ${isClause(effect)?"prevent":"reduce"} ${effNP(effect)}. Explain how each part of your plan deals with the cause.`,{...S,ctx:og},c.src); }
      else push("C.cause.story","Creating","essay",c.verb?`Create an original diagram or story that shows how ${cause} ${c.verb} ${effect}.`:`Create an original diagram or story that shows how ${cause} leads to ${effect}.`,S,c.src);
    }
    for(const a of F.causes) for(const b of F.causes){ if(a===b) continue; const ae=a.effect.toLowerCase(), key=b.cause.toLowerCase().split(/\W+/).filter(w=>w.length>4&&!STOP.has(w)); if(key.length && key.some(w=>ae.includes(w))) push("N.chain.trace","Analyzing","essay",`Trace how ${lc(a.cause)} can eventually lead to ${lc(b.effect)}, explaining each link.`,{},a.src+" "+b.src); }
    const OPP={increases:"decreases",decreases:"increases",rises:"falls",falls:"rises","goes up":"goes down","goes down":"goes up"};
    for(const rl of F.rels){
      const correct=`It ${rl.dy}`, ch=shuffle([correct,`It ${OPP[rl.dy]}`,"It stays the same","It becomes zero"],r);
      push("R.rel.mc","Remembering","mc",{stem:`When ${theNP(rl.x)} ${rl.dx}, what happens to ${theNP(rl.y)}?`,choices:ch,answer:"abcd"[ch.indexOf(correct)],answerText:correct},{x:rl.x,y:rl.y},rl.src);
      push("A.rel.predict","Applying","short",`Suppose ${theNP(rl.x)} ${OPP[rl.dx]||rl.dx}. Predict what will happen to ${theNP(rl.y)}, and explain your answer.`,{x:rl.x,y:rl.y},rl.src);
      push("N.rel.why","Analyzing","essay",`Analyze why ${theNP(rl.y)} ${rl.dy} when ${theNP(rl.x)} ${rl.dx}.`,{x:rl.x,y:rl.y},rl.src);
    }
    for(const cp of F.comps){
      push("U.comp.why","Understanding","short",`Explain why ${cp.a} ${/s$/.test(cp.a)?"are":"is"} ${cp.comp} than ${cp.b}.`,{a:cp.a,b:cp.b},cp.src);
      push("E.comp.always","Evaluating","essay",`Is ${cp.a} always better than ${cp.b}? Defend your answer.`,{a:cp.a,b:cp.b},cp.src);
    }
    const seenP=new Set();
    for(const [a0,b0] of pairs){ const a=termCase(a0), b=termCase(b0); const k=[a,b].map(x=>x.toLowerCase()).sort().join("|"); if(seenP.has(k)||same(a,b)) continue; seenP.add(k); const S={a,b};
      push("U.pair.diff","Understanding","short",`What is the difference between ${a} and ${b}?`,S);
      push("N.pair.compare","Analyzing","essay",`Compare ${a} and ${b} in terms of how they work and when each is used.`,S);
      const stepPair=F.steps.some(st=>st.steps.some(x=>same(x,a0))&&st.steps.some(x=>same(x,b0)))||F.lists.some(l=>/\b(steps|phases|stages)\b/i.test(l.kind)&&l.items.some(x=>same(x,a0)));
      if(stepPair) continue;
      const alts=F.comps.some(c=>(same(c.a,a0)&&same(c.b,b0))||(same(c.a,b0)&&same(c.b,a0))) || F.lists.some(l=>/\b(types|kinds|models|protocols|topolog\w*|methods|algorithms|options|frameworks|approaches|forms)\b/i.test(l.kind) && l.items.some(x=>same(x,a0)) && l.items.some(x=>same(x,b0)));
      if(IT_T && alts && kindOf(a0)==="tool" && kindOf(b0)==="tool"){ const stp=settingFor(a0)||SYSTEMS[0]; push("E.pair.choose","Evaluating","essay",`For ${stp}, which is more appropriate: ${art(a)} or ${art(b)}? Defend your choice with at least two reasons.`,{...S,ctx:stp}); push("C.pair.combine","Creating","essay",`Propose a design for ${settingFor(b0)||stp} that uses both ${art(a)} and ${art(b)}. Explain what each one does in your design.`,S); }
      else { push("E.pair.significant","Evaluating","essay",`Which is more significant, ${a} or ${b}? Defend your answer.`,S); push("C.pair.illustrate","Creating","essay",`Create an original illustration or story that shows the difference between ${a} and ${b}.`,S); }
    }
    /* ================= multiple choice at every level ================= */
    // --- Understanding: which concept does an example illustrate?
    for(const e of exGroups){ const ex=e.list[0].replace(/^"|"$/g,""), T=bare(e.term);
      push("U.mc.illustrates","Understanding","mc",MC(`Which concept is best illustrated by ${/^[A-Z"]/.test(e.list[0])?`“${ex}”`:ex}?`, T, [...D.map(bare),...F.examples.map(x=>bare(x.term)),...F.classes.map(c=>c.category),...terms.map(bare)].filter(x=>!same(x,T)&&!related(x,T)&&!stepItems.has(x.toLowerCase()))),{term:T},e.src); }
    { const ps=F.purposes.filter((p,i,A)=>A.findIndex(x=>same(x.term,p.term))===i);
      for(const p of ps){ const T=bare(p.term), purpose=p.purpose.replace(/^to\s+/i,""); const wrong=shuffle(F.purposes.filter(x=>!same(x.term,p.term)&&!overlaps(x.purpose,purpose)).map(x=>"To "+x.purpose.replace(/^to\s+/i,"")),r).concat(shuffle(F.defs.filter(d=>!same(d.term,p.term)).map(d=>"To serve as "+short(d.def,10)),r));
        push("U.mc.purpose","Understanding","mc",MC(`Which of the following best describes the main purpose of ${art(T)}?`, "To "+purpose, wrong, null, true),{term:T,purpose},p.src); } }
    // --- Applying: put a tool to work; next step of a procedure; a process in use
    for(const p of F.purposes){ const T=bare(p.term), purpose=p.purpose.replace(/^to\s+/i,""), others=toolPool.filter(x=>!same(x,T)&&!clash(x,purpose)&&!related(x,T)&&!memberOf(x,T)&&!stepItems.has(x.toLowerCase())&&!compared(x,T));
      if(kindOf(p.term)!=="tool" && !p.benefit) continue;
      const sc=scene(p), dd=defOf(T), hn=dd&&(dd.def.match(/^the (\w+) (that|in which)/)||[])[1];
      push("A.mc.task","Applying","mc",MC(`${sc.text} ${hn&&/^(domain|layer|area|phase|perspective|stage|view|level|tier)$/i.test(hn)?`Which ${hn} should they work on?`:hn&&hn!=="one"&&hn!=="approach"?`Which ${hn} should they use?`:"Which of the following should they use?"}`, T, others),{term:T,purpose,ctx:sc.where},p.src); }
    for(const st of F.steps){ const proc=procName(st), who=cap(aRole(roleFor((st.process||"")+" "+st.steps.join(" ")+" "+text.slice(0,300))));
      if(st.steps.some(x=>/^repeat/i.test(x))) continue;
      for(let k=0;k<st.steps.length-1 && k<(st.steps.length>=6?4:2);k++) push("A.mc.next","Applying","mc",MC(`${who} ${doingProc(st)} and has just finished ${stepNP(st.steps[k])}. What should come next?`, cap(lc(st.steps[k+1])), st.steps.filter((x,i)=>i!==k+1).map(x=>cap(lc(x)))),{process:proc},st.src); }
    for(const d of F.defs){ const m=d.def.match(/^(?:the\s+|a\s+)?(?:process|act|method|technique|practice|way|procedure)\s+(?:of|for)\s+(\w+ing\b.*)$/i); if(!m) continue;
      push("A.mc.process","Applying","mc",MC(`${cap(aRole(roleFor(d.term+" "+d.def)))} needs a way of ${lc(m[1])}. Which of the following should be applied?`, bare(d.term), [...D.map(bare),...toolPool].filter(x=>!same(x,d.term)&&!related(x,d.term)&&!stepItems.has(x.toLowerCase()))),{term:bare(d.term)},d.src); }
    { const org=fixed||(IT_T?"an organization":"a community");
      for(const p of F.purposes.filter(x=>x.glossary)){ const d=F.defs.find(x=>same(x.term,p.term)); if(!d||!d.group) continue; const m0=p.purpose.match(/^(define|describe|provide|manage|store|control|handle|organize|specify|represent|support|protect|monitor|track|deliver|process|connect|capture|model|document)\s+(.{6,})$/i); if(!m0) continue;
        const obj=m0[2].replace(/\s+(needed|used|that|which)\b.*$/i,"").replace(/^(an?|the)\s+/i,"the "); const objNP=/^(the|all|every|each|any|its|their)\b/i.test(obj)?obj:"its "+obj; if(obj.split(" ").length>12) continue;
        const peers=F.defs.filter(x=>x.group===d.group&&!same(x.term,d.term)).map(x=>bare(x.term)); if(peers.length<2) continue; const hn=(d.def.match(/^the (\w+) that/)||[])[1]||"part";
        push("N.mc.affected","Analyzing","mc",MC(`If ${org} makes major changes to ${objNP}, which ${hn} is most directly affected?`, bare(d.term), peers),{term:bare(d.term)},p.src); } }
    // --- Analyzing: odd one out; differences; causes; relationships; formula effects
    for(const l of F.lists){ if(l.items.length<3) continue; const outs=[...D,...F.lists.filter(x=>x!==l).flatMap(x=>x.items),...F.classes.map(c=>c.item),...terms].filter(t=>!l.items.some(x=>same(x,t))&&!same(t,l.subject||"~")&&!same(t,l.kind)&&t.split(" ").length<=4);
      if(!outs.length) continue; const odd=shuffle(outs,r)[0]; const ch=shuffle([...shuffle(l.items,r).slice(0,3),odd],r);
      push("N.mc.odd","Analyzing","mc",{stem:"Which of the following does not belong with the others?",choices:ch.map(cap),answer:"abcd"[ch.indexOf(odd)],answerText:cap(odd)},{what:l.kind},l.src); }
    const seenD=new Set();
    for(const [a0,b0] of pairs){ const da=defOf(a0), db=defOf(b0); if(!da||!db||da===db||isStmt(da)!==isStmt(db)||isA(da.term,db.term)||isA(db.term,da.term)) continue; const be=beOf(da); const a=bare(da.term), b=bare(db.term); const k=[a,b].sort().join("|"); if(seenD.has(k)) continue; seenD.add(k);
      const A=short(da.def), B=short(db.def);
      push("N.mc.diff","Analyzing","mc",MC(`Which of the following best explains the difference between ${art(a)} and ${art(b)}?`, `${cap(art(a))} ${be} ${A}, while ${art(b)} ${be} ${B}`, [`${cap(art(a))} ${be} ${B}, while ${art(b)} ${be} ${A}`, `${cap(art(a))} and ${art(b)} mean the same thing and can be used interchangeably`, `${cap(art(a))} is a special kind of ${b}, so they differ only in name`]),{a,b},da.src+" "+db.src);
      push("E.mc.claimsame","Evaluating","mc",MC(`A classmate claims that ${art(a)} and ${art(b)} are the same thing. Which statement best evaluates this claim?`, `The claim is incorrect, because ${art(a)} ${be} ${A}, while ${art(b)} ${be} ${B}`, [`The claim is correct, because both deal with the same topic`, `The claim is correct, because ${art(a)} ${be} ${B}`, `The claim cannot be judged, because there is not enough information about ${art(b)}`]),{a,b},da.src+" "+db.src); }
    for(const c of F.causes){ const eff=lc(c.effect), cau=lc(c.cause); if(eff.split(" ").length>14) continue;
      const wrong=[...F.causes.filter(x=>x!==c&&!same(x.cause,c.cause)).map(x=>lc(x.cause)),...F.causes.filter(x=>x!==c).map(x=>lc(x.effect))].filter(x=>!same(x,cau)&&!same(x,eff));
      const gen=[`it happens by chance and has no clear cause`,`the opposite of ${cau.split(" ").slice(0,6).join(" ")}`];
      if(c.verb) push("N.mc.cause","Analyzing","mc",MC(`Which of the following is the most likely cause of ${/^(an?|the)\s/i.test(eff)||/^\w+ing\b/.test(eff)?eff:"the "+eff}?`, cau, wrong.concat(gen)),{cause:cau,effect:eff},c.src); }
    for(const rl of F.rels){ const good=`When ${rl.x} ${rl.dx}, ${rl.y} ${rl.dy}`;
      push("N.mc.rel","Analyzing","mc",MC(`Which statement best describes the relationship between ${rl.x} and ${rl.y}?`, good, [`When ${rl.x} ${rl.dx}, ${rl.y} ${OPP2[rl.dy]}`, `${cap(rl.x)} and ${rl.y} are not related at all`, `When ${rl.y} ${rl.dy}, ${rl.x} always stays the same`]),{x:rl.x,y:rl.y},rl.src);
      push("C.mc.hypo","Creating","mc",MC(`Which hypothesis would you propose to test the relationship between ${rl.x} and ${rl.y} in an experiment?`, `If ${rl.x} ${rl.dx}, then ${rl.y} will ${({increases:"increase",decreases:"decrease",rises:"rise",falls:"fall","goes up":"go up","goes down":"go down"})[rl.dy]}`, [`If ${rl.x} ${rl.dx}, then ${rl.y} will ${({increases:"increase",decreases:"decrease",rises:"rise",falls:"fall","goes up":"go up","goes down":"go down"})[OPP2[rl.dy]]}`, `${cap(rl.y)} does not depend on ${rl.x}, so no experiment is needed`, `If ${rl.y} changes, ${rl.x} will always stay the same`]),{x:rl.x,y:rl.y},rl.src); }
    for(const f of F.formulas){ const ins=Object.keys(f.vars).filter(v=>v!==f.lhs); if(!ins.length) continue;
      const base={}; ins.forEach(v=>base[v]=/!/.test(f.rhs)?6:4); const a0=evalFormula(f,base);
      for(const v of shuffle(ins,r).slice(0,2)){ const b2={...base,[v]:base[v]*2}; const a1=evalFormula(f,b2); if(a0===null||a1===null||!a0) continue; const ratio=Math.round(a1/a0*1000)/1000;
        const say={2:"It doubles",0.5:"It is cut in half",4:"It becomes four times as large",0.25:"It becomes one-fourth as large",1:"It stays the same",8:"It becomes eight times as large",3:"It triples"}[ratio]; if(!say) continue;
        const nm=x=>f.vars[x].mean?`the ${f.vars[x].mean.replace(/^the\s+/i,"")}`:x;
        push("N.mc.formula","Analyzing","mc",MC(`Using ${f.expr}, what happens to ${nm(f.lhs)} (${f.lhs}) if ${nm(v)} (${v}) is doubled and everything else stays the same?`, say, ["It doubles","It is cut in half","It stays the same","It becomes four times as large","It becomes one-fourth as large"].filter(x=>x!==say)),{expr:f.expr},f.src); }
      // Creating: rearrange a product/quotient formula to solve for another variable
      const mm=f.rhs.replace(/\s+/g,"").match(/^([A-Za-z]\w*)([*\/])([A-Za-z]\w*)$/);
      if(mm){ const [,x,op,y]=mm, L=f.lhs; let good, bad;
        if(op==="*"){ good=`${x} = ${L} / ${y}`; bad=[`${x} = ${L} * ${y}`,`${x} = ${y} / ${L}`,`${x} = ${L} - ${y}`]; }
        else { good=`${x} = ${L} * ${y}`; bad=[`${x} = ${L} / ${y}`,`${x} = ${y} / ${L}`,`${x} = ${L} + ${y}`]; }
        push("C.mc.derive","Creating","mc",MC(`Which formula would you derive from ${f.expr} to solve for ${f.vars[x].mean?`the ${f.vars[x].mean.replace(/^the\s+/i,"")} (${x})`:x}?`, good, bad),{expr:f.expr},f.src); } }
    // --- Evaluating: best choice with a reason; most effective action; judging a claim
    const BADWHY=["because it is the most popular choice","because it was the first option considered","because it is the newest option available"];
    for(const p of F.purposes){ const T=bare(p.term), purpose=p.purpose.replace(/^to\s+/i,""); const others=F.purposes.filter(x=>!same(x.term,p.term)); if(kindOf(p.term)!=="tool") continue;
      const why=reasonFor(T); const sc=scene(p,"must");
      let ans, alt;
      if(why){ ans=`${cap(T)}, because ${why}`; alt=[...others.filter(o=>!overlaps(o.purpose,purpose)&&reasonFor(bare(o.term))&&!compared(o.term,T)).map(o=>`${cap(bare(o.term))}, because ${reasonFor(bare(o.term))}`), ...F.defs.filter(d=>!same(d.term,T)&&!d.entity&&!compared(d.term,T)&&!related(d.term,T)&&!F.purposes.some(o=>same(o.term,d.term)&&overlaps(o.purpose,purpose))&&!kin(d.term,T)).slice(0,3).map(d=>`${cap(bare(d.term))}, because ${reasonFor(bare(d.term))||"it is related to the topic"}`), `${cap(T)}, because ${shuffle(["it is the most popular choice","it was the first option considered","it is the newest option available"],r)[0].replace(/^it is\b/,itThey(T))}`]; }
      else continue;
      push("E.mc.bestwhy","Evaluating","mc",MC(`${sc.text} Which is the best choice, and why?`, ans, alt.filter(x=>x!==ans)),{term:T,purpose,ctx:sc.where},p.src); }
    const fix=c=>{ c=lc(c); let m;
      if((m=c.match(/^(?:the\s+)?(?:poor|weak|bad|improper|incorrect)\s+(.+)$/i))) return `Improve ${m[1]}`;
      if((m=c.match(/^(?:the\s+)?(?:lack|absence|shortage) of\s+(.+)$/i))) return /s$/.test(m[1])||/^(support|time|money|water|food|data|information|training|funding|power|communication)\b/i.test(m[1])?`Provide enough ${m[1]}`:`Make sure there is ${art(m[1])}`;
      if((m=c.match(/^(?:too much|excessive|too many)\s+(.+)$/i))) return `Reduce ${m[1]}`;
      if((m=c.match(/^(ignoring|skipping|neglecting|burning|cutting|using|overusing|dumping)\s+(.+)$/i))) return `Stop ${m[1].toLowerCase()} ${m[2]}`;
      if(/^\w+ing\b/.test(c)||isClause(c)) return null; if(/\b(typhoons?|earthquakes?|storms?|floods?|rain|droughts?|weather|climate|volcan\w*|tsunamis?|el ni[nñ]o|la ni[nñ]a|seasons?|aging|age|genes?|genetics?)\b/i.test(c)) return null; return `Prevent ${c}`; };
    for(const c of F.causes){ if(!NEG.test(c.effect)) continue; const act=fix(c.cause); if(!act) continue; const eff=lc(c.effect);
      const others=F.causes.filter(x=>x!==c&&!same(x.cause,c.cause)).map(x=>fix(x.cause)).filter(Boolean);
      const effN=effNP(eff), verbN=isClause(eff)?"prevent":"reduce", org=orgFor(eff+" "+c.cause);
      push("E.mc.effective","Evaluating","mc",MC(`${cap(org)} wants to ${verbN} ${effN}. Which of the following would be the most effective action?`, act, others.concat([`Fix each case as it appears, without changing ${lc(c.cause)}`,`Assign more people to handle the problem when it happens`,`Buy new equipment and hope it prevents the problem`])),{cause:lc(c.cause),effect:eff,ctx:org},c.src);
      push("C.mc.plan","Creating","mc",MC(`You are asked to help ${org} ${verbN} ${effN}. Which plan would you propose?`, `${act} first, then check regularly whether the problem goes down`, [`${act} once, and assume the problem is solved without checking`, ...(others.length?[`${others[0]} first, then check regularly whether the problem goes down`]:[]), `Train people to report the problem faster, and deal with each case as it comes`, `Check regularly whether the problem goes down, without changing ${lc(c.cause)}`]),{cause:lc(c.cause),effect:eff,ctx:org},c.src); }
    for(const cp of F.comps){ const a=bare(cp.a), qm=cp.b.match(/^(.+?)\s+((?:for|in|when|with|on|during)\s+.+)$/i), b=bare(qm?qm[1]:cp.b), q=qm?" "+qm[2]:"";
      push("E.mc.claim","Evaluating","mc",MC(`A student claims that ${art(a)} is always a better choice than ${art(b)}. Which statement best evaluates this claim?`, `The claim goes too far: ${art(a)} is ${cp.comp} than ${art(b)}${q}, but the better choice depends on the situation`, [`The claim is fully correct, since ${art(a)} is ${cp.comp} than ${art(b)} in every way`, `The claim is wrong, because ${art(b)} is ${cp.comp} than ${art(a)}${q}`, `The claim cannot be judged, because there is no basis for comparing them`]),{a,b},cp.src); }
    // --- Evaluating: judging a classmate's definition, example, computation or order
    for(const d of F.defs){ if(d.entity) continue; const T=bare(d.term), other=F.defs.find(x=>x!==d&&!same(x.term,d.term)&&!x.entity&&isStmt(x)===isStmt(d)&&!related(x.term,d.term));
      const useWrong=other && r()<0.6 && isStmt(other)===isStmt(d), said=useWrong?short(other.def,16):short(d.def,16);
      const ans=useWrong?`The statement is incorrect, because ${art(T)} ${beOf(d)} ${short(d.def,16)}`:`The statement is correct, because it matches what ${art(T)} ${isStmt(d)?"states":"is"}`;
      const wr=useWrong?[`The statement is correct, because it matches what ${art(T)} ${isStmt(d)?"states":"is"}`,`The statement is incorrect, because ${art(T)} ${beOf(useWrong?other:d)} ${said} only in some cases`,`The statement cannot be judged without more examples`]
                       :[other?`The statement is incorrect, because ${art(T)} ${beOf(other)} ${short(other.def,16)}`:`The statement is incorrect, because it describes a different concept`,`The statement is only partly correct, because ${art(T)} has no fixed meaning`,`The statement cannot be judged without more examples`];
      push("E.mc.defjudge","Evaluating","mc",MC(`A classmate says that ${art(T)} ${useWrong?beOf(other):beOf(d)} ${said}. Which statement best evaluates this claim?`, ans, wr),{term:T},d.src); }
    for(const e of exGroups){ const T=bare(e.term), ex=e.list[0].replace(/^"|"$/g,""), exq=/^[A-Z"]/.test(e.list[0])?`“${ex}”`:ex; const other=[...D.map(bare),...F.examples.map(x=>bare(x.term))].find(x=>!same(x,T)&&!related(x,T)); if(!other) continue;
      push("E.mc.exjudge","Evaluating","mc",MC(`A classmate says that ${exq} is an example of ${art(other)}. Which statement best evaluates this claim?`, `The claim is incorrect, because ${exq} is an example of ${art(T)}`, [`The claim is correct, because ${exq} fits the meaning of ${art(other)}`,`The claim is correct, because any example can belong to any concept`,`The claim cannot be judged without more information`]),{term:T,example:ex},e.src); }
    for(const f of F.formulas){ const p=numberProblem(f,r); if(!p||!p.wrong.length) continue; const w=p.wrong[0];
      push("E.mc.calccheck","Evaluating","mc",MC(`${p.stem.replace(/^If /,"Given that ").replace(/, use .*$/,"")}, a classmate says the ${f.vars[f.lhs].mean?f.vars[f.lhs].mean.replace(/^the\s+/i,""):f.lhs} is ${w}. Which statement best evaluates this answer?`, `The answer is incorrect; using ${f.expr} gives ${p.answer}`, [`The answer is correct, because it follows ${f.expr}`,`The answer is incorrect; the correct value is ${p.wrong[1]||p.wrong[0]+"0"}`,`The answer cannot be checked without more data`]),{expr:f.expr},f.src); }
    for(const st of F.steps){ if(st.steps.length<3) continue; const proc=procName(st);
      let bad=st.steps.map(lc); for(let t=0;t<10 && bad.join()===st.steps.map(lc).join();t++) bad=shuffle(st.steps,r).map(lc);
      push("E.mc.orderjudge","Evaluating","mc",MC(`A classmate lists the steps of ${proc} as: ${bad.join(" → ")}. Which statement best evaluates this list?`, `The order is wrong; it should start with ${lc(st.steps[0])} and end with ${lc(st.steps[st.steps.length-1])}`, [`The order is correct, because every step is included`,`The order is wrong, because ${lc(st.steps[1])} should always be done first`,`The order does not matter, as long as every step is done`]),{process:proc},st.src); }
    // --- Creating: rearranging a product formula; designing a fair test of a cause
    for(const f of F.formulas){ const toks=f.rhs.replace(/\s+/g,"").split("*"); if(toks.length<3||!toks.every(t=>/^[A-Za-z]\w*$/.test(t))) continue;
      const x=toks[0], rest=toks.slice(1), L=f.lhs;
      push("C.mc.derive","Creating","mc",MC(`Which formula would you derive from ${f.expr} to solve for ${f.vars[x].mean?`the ${f.vars[x].mean.replace(/^the\s+/i,"")} (${x})`:x}?`, `${x} = ${L} / (${rest.join(" * ")})`, [`${x} = ${L} * ${rest.join(" * ")}`,`${x} = (${rest.join(" * ")}) / ${L}`,`${x} = ${L} - ${rest.join(" - ")}`]),{expr:f.expr},f.src); }
    for(const c of F.causes){ if(!c.verb||c.pitfall||/^the effort|\bto \w+$/i.test(lc(c.effect))||/^(trying|treating|lack|absence)\b/i.test(c.cause)) continue; const cau=lc(c.cause), eff=lc(c.effect); if(cau.split(" ").length>8||eff.split(" ").length>10) continue;
      push("C.mc.experiment","Creating","mc",MC(`Which investigation would you design to test whether ${cau} really ${c.verb} ${eff}?`, `Change only ${cau.replace(/^(the|a|an)\s+/i,"the ")}, keep everything else the same, and measure ${eff.replace(/^(the|a|an)\s+/i,"the ")}`, [`Measure ${eff.replace(/^(the|a|an)\s+/i,"the ")} once without changing anything`,`Change several factors at the same time and compare the results`,`Ask people whether they believe ${cau} matters`]),{cause:cau,effect:eff},c.src); }
    /* ================= true or false and situational items above Remembering ================= */
    const TF=(stem,ans)=>({stem:`True or false: ${stem}`, answer:ans?"True":"False"});
    { const seenU=new Set(); for(const [a0,b0] of pairs){ const a=bare(a0), b=bare(b0); const k=[a,b].map(x=>x.toLowerCase()).sort().join("|"); if(seenU.has(k)||same(a,b)) continue; seenU.add(k);
        if(stepItems.has(String(a0).toLowerCase())||stepItems.has(String(b0).toLowerCase())) continue; push("U.tf.same","Understanding","tf",TF(`${cap(art(a))} and ${art(b)} mean the same thing.`,false),{a,b}); } }
    for(const rl of F.rels){ const flip=r()<0.5, dy=flip?OPP2[rl.dy]:rl.dy; const ydo={increases:"increase",decreases:"decrease",rises:"rise",falls:"fall","goes up":"go up","goes down":"go down"}[dy];
      push("U.tf.predict","Understanding","tf",TF(`${fixed?`In ${fixed}, if`:"If"} ${theNP(rl.x)} ${rl.dx}, we can expect ${theNP(rl.y)} to ${ydo}.`,!flip),{x:rl.x,y:rl.y},rl.src); }
    for(const f of F.formulas){ const p=numberProblem(f,r); if(!p) continue; const flip=r()<0.5&&p.wrong.length; const val=flip?p.wrong[0]:p.answerNum;
      push("A.tf.compute","Applying","tf",TF(`${p.stem.replace(/^If /,"If ").replace(/, use (.+?) to compute (.+)\.$/,(m0,e,t)=>`, then ${t.replace(/^the\s+/i,"the ")} is ${val}${p.unit?" "+p.unit:""} (using ${e}).`)}`,!flip),{expr:f.expr},f.src);
      const ins=Object.keys(f.vars).filter(v=>v!==f.lhs); const base={}; ins.forEach(v=>base[v]=/!/.test(f.rhs)?6:4); const v=ins[0]; const a0=evalFormula(f,base), a1=v?evalFormula(f,{...base,[v]:base[v]*2}):null;
      if(a0&&a1){ const ratio=Math.round(a1/a0*1000)/1000; const say={2:"double",0.5:"cut in half",4:"become four times as large",1:"stay the same"}[ratio]; if(say){ const flip2=r()<0.5, s2=flip2?(say==="double"?"stay the same":"double"):say;
        push("N.tf.formula","Analyzing","tf",TF(`Using ${f.expr}, doubling ${f.vars[v].mean?`the ${f.vars[v].mean.replace(/^the\s+/i,"")}`:v} while keeping everything else the same makes ${f.vars[f.lhs].mean?`the ${f.vars[f.lhs].mean.replace(/^the\s+/i,"")}`:f.lhs} ${s2}.`,!flip2),{expr:f.expr},f.src); } } }
    { const seenN=new Set(); for(const [a0,b0] of pairs){ const da=defOf(a0), db=defOf(b0); if(!da||!db||da===db||isStmt(da)!==isStmt(db)) continue; const be=beOf(da); const a=bare(da.term), b=bare(db.term); const k=[a,b].sort().join("|"); if(seenN.has(k)) continue; seenN.add(k); const sw=r()<0.5;
        push("N.tf.diff","Analyzing","tf",TF(`The main difference between ${art(a)} and ${art(b)} is that ${art(a)} ${be} ${short(sw?db.def:da.def)}, while ${art(b)} ${be} ${short(sw?da.def:db.def)}.`,!sw),{a,b},da.src+" "+db.src); } }
    for(const c of F.causes){ if(!c.verb) continue; const eff=lc(c.effect), cau=lc(c.cause); const other=F.causes.find(x=>x!==c&&x.verb&&!same(x.cause,c.cause)); const flip=other&&r()<0.5;
      push("N.tf.cause","Analyzing","tf",TF(`The most likely cause of ${/^(an?|the)\s/i.test(eff)||/^\w+ing\b/.test(eff)?eff:"the "+eff} is ${flip?lc(other.cause):cau}.`,!flip),{cause:cau,effect:eff},c.src); }
    // (a true-or-false 'best choice because' item only matched a need to a definition, so it is no longer written)
    for(const cp of F.comps){ const a=bare(cp.a), qm=cp.b.match(/^(.+?)\s+((?:for|in|when|with|on|during)\s+.+)$/i), b=bare(qm?qm[1]:cp.b);
      push("E.tf.claim","Evaluating","tf",TF(`Because ${art(a)} is ${cp.comp} than ${art(b)}${qm?" "+qm[2]:""}, it is always the better choice in every situation.`,false),{a,b},cp.src); }
    // judging two options against a requirement the lesson compares them on
    { const CRIT={faster:"speed",quicker:"speed",lighter:"keeping the load on the devices and the network light",cheaper:"keeping costs low","more secure":"security","more efficient":"efficiency","more reliable":"reliability","more accurate":"accuracy","more flexible":"flexibility","more scalable":"handling growth",simpler:"simplicity",easier:"ease of use","more durable":"durability",stronger:"strength",larger:"capacity",smaller:"small size",healthier:"health"};
      for(const cp of F.comps){ const a=bare(cp.a), qm=cp.b.match(/^(.+?)\s+((?:for|in|when|with|on|during)\s+.+)$/i), b=bare(qm?qm[1]:cp.b), q=qm?" "+qm[2]:""; const comp=cp.comp.toLowerCase();
        const need=CRIT[comp]? `the most important requirement is ${CRIT[comp]}` : qm&&/^more important$/.test(comp)? `the goal is ${qm[2].replace(/^(for|in)\s+/i,"")}` : `the most important requirement is that the choice be ${comp}`;
        const who=cap(orgFor(a+" "+b+" "+cp.b)); const A=art(a), B=art(b);
        push("E.case.criteria","Evaluating","case",MC(`Situation: ${who} must choose between ${A} and ${B}${qm&&!/^more important$/.test(comp)?" "+qm[2]:""}, and ${need}. Which choice is better, and why?`, `${cap(A)}, because ${A} ${isAre(a)} ${cp.comp} than ${B}${q}`, [`${cap(B)}, because ${B} ${isAre(b)} ${cp.comp} than ${A}${q}`, `${cap(B)}, because it is more widely used`, `Either one, because the requirement does not change the choice`]),{a,b},cp.src);
        const flip=r()<0.5; push("E.tf.criteria","Evaluating","tf",TF(`If ${need.replace(/^the most important requirement is /,"the most important requirement is ")}, ${flip?B:A} is the better choice than ${flip?A:B}${qm&&!/^more important$/.test(comp)?" "+qm[2]:""}.`,!flip),{a,b},cp.src); } }
    /* ================= "Which statement is correct?" items, one set per level =================
       Every fact gives a true and a false statement at the level it tests; mixing statements from different facts
       makes many more multiple-choice items from the same file without repeating a stem. */
    { const ST={Remembering:[],Understanding:[],Applying:[],Analyzing:[],Evaluating:[]}; const add=(lv,t,f,src)=>{ if(t&&f&&t!==f) ST[lv].push({t:cap(t.replace(/\.$/,"")),f:cap(f.replace(/\.$/,"")),src:src||""}); };
      for(const d of F.defs){ if(d.entity) continue; const o=F.defs.find(x=>x!==d&&!same(x.term,d.term)&&!x.entity&&isStmt(x)===isStmt(d)&&!related(x.term,d.term)); if(o) add("Remembering",`${cap(art(bare(d.term)))} ${d.verb} ${lc(d.def)}`,`${cap(art(bare(d.term)))} ${d.verb} ${lc(o.def)}`,d.src); }
      for(const p of F.purposes){ const T=bare(p.term), o=F.purposes.find(x=>!same(x.term,p.term)&&!overlaps(x.purpose,p.purpose)); if(o) add("Remembering",`${cap(art(T))} ${isAre(T)} used to ${p.purpose.replace(/^to\s+/i,"")}`,`${cap(art(T))} ${isAre(T)} used to ${o.purpose.replace(/^to\s+/i,"")}`,p.src); }
      for(const e of exGroups){ const T=bare(e.term), o=[...D.map(bare)].find(x=>!same(x,T)); const ex=e.list[0].replace(/^"|"$/g,""); if(o) add("Remembering",`${/^[A-Z"]/.test(e.list[0])?`“${ex}”`:cap(ex)} is an example of ${art(T)}`,`${/^[A-Z"]/.test(e.list[0])?`“${ex}”`:cap(ex)} is an example of ${art(o)}`,e.src); }
      { const seen=new Set(); for(const [a0,b0] of pairs){ const a=bare(a0), b=bare(b0), k=[a,b].map(x=>x.toLowerCase()).sort().join("|"); if(seen.has(k)||same(a,b)||stepItems.has(String(a0).toLowerCase())||stepItems.has(String(b0).toLowerCase())) continue; seen.add(k); add("Understanding",`${cap(art(a))} and ${art(b)} are different ideas and should not be used as if they were the same`,`${cap(art(a))} and ${art(b)} mean the same thing, so either word can be used`); } }
      const DO={increases:"increase",decreases:"decrease",rises:"rise",falls:"fall","goes up":"go up","goes down":"go down"};
      for(const rl of F.rels){ add("Understanding",`If ${theNP(rl.x)} ${rl.dx}, we can expect ${theNP(rl.y)} to ${DO[rl.dy]}`,`If ${theNP(rl.x)} ${rl.dx}, we can expect ${theNP(rl.y)} to ${DO[OPP2[rl.dy]]}`,rl.src);
        add("Analyzing",`${cap(theNP(rl.y))} depends on ${theNP(rl.x)}: when one ${rl.dx.replace(/s$/,"")==="goe"?"goes":rl.dx}, the other ${rl.dy}`,`${cap(theNP(rl.y))} depends on ${theNP(rl.x)}: when one ${rl.dx}, the other ${OPP2[rl.dy]}`,rl.src); }
      for(const f of F.formulas) for(let k=0;k<3;k++){ const pp=numberProblem(f,r); if(!pp||!pp.wrong.length) continue; const head=pp.stem.replace(/, use (.+?) to compute (.+)\.$/,(m0,e,t)=>`, then ${t} is `); if(head===pp.stem) continue; add("Applying",`${head}${pp.answer} (using ${f.expr})`,`${head}${pp.wrong[0]}${pp.unit?" "+pp.unit:""} (using ${f.expr})`,f.src); }
      for(const f of F.formulas){ const ins=Object.keys(f.vars).filter(v=>v!==f.lhs); const base={}; ins.forEach(v=>base[v]=/!/.test(f.rhs)?6:4); for(const v of ins){ const a0=evalFormula(f,base), a1=evalFormula(f,{...base,[v]:base[v]*2}); if(!a0||a1===null) continue; const ratio=Math.round(a1/a0*1000)/1000; const say={2:"doubles",0.5:"is cut in half",4:"becomes four times as large",1:"stays the same"}[ratio]; if(!say) continue; const nm=x=>f.vars[x].mean?`the ${f.vars[x].mean.replace(/^the\s+/i,"")}`:x;
        add("Analyzing",`In ${f.expr}, doubling ${nm(v)} while everything else stays the same means ${nm(f.lhs)} ${say}`,`In ${f.expr}, doubling ${nm(v)} while everything else stays the same means ${nm(f.lhs)} ${say==="doubles"?"stays the same":"doubles"}`,f.src); } }
      { const seen=new Set(); for(const [a0,b0] of pairs){ const da=defOf(a0), db=defOf(b0); if(!da||!db||da===db||isStmt(da)!==isStmt(db)) continue; const be=beOf(da); const a=bare(da.term), b=bare(db.term), k=[a,b].sort().join("|"); if(seen.has(k)) continue; seen.add(k);
        add("Analyzing",`The main difference between ${art(a)} and ${art(b)} is that ${art(a)} ${be} ${short(da.def,30)}, while ${art(b)} ${be} ${short(db.def,30)}`,`The main difference between ${art(a)} and ${art(b)} is that ${art(a)} ${be} ${short(db.def,30)}, while ${art(b)} ${be} ${short(da.def,30)}`,da.src); } }
      for(const c of F.causes){ if(!c.verb) continue; const o=F.causes.find(x=>x!==c&&!same(x.cause,c.cause)); const eff=lc(c.effect); const effN=/^(an?|the)\s/i.test(eff)||/^\w+ing\b/.test(eff)?eff:"the "+eff; const cv=x=>pluralNP(x)?"are":"is"; if(o) add("Analyzing",`${cap(lc(c.cause))} ${cv(c.cause)} the most likely cause of ${effN}`,`${cap(lc(o.cause))} ${cv(o.cause)} the most likely cause of ${effN}`,c.src); }
      for(const cp of F.comps){ const a=bare(cp.a), qm=cp.b.match(/^(.+?)\s+((?:for|in|when|with|on|during)\s+.+)$/i), b=bare(qm?qm[1]:cp.b), q=qm?" "+qm[2]:"";
        add("Evaluating",`${cap(art(a))} ${isAre(a)} ${cp.comp} than ${art(b)}${q}, but the better choice still depends on what the situation needs`,`Because ${art(a)} ${isAre(a)} ${cp.comp} than ${art(b)}${q}, it is always the better choice in every situation`,cp.src);
        add("Evaluating",`When ${cp.comp.replace(/^more /,"being more ").replace(/^(\w+er)$/,"being $1")} matters most, ${art(a)} is the better choice than ${art(b)}${q}`,`When ${cp.comp.replace(/^more /,"being more ").replace(/^(\w+er)$/,"being $1")} matters most, ${art(b)} is the better choice than ${art(a)}${q}`,cp.src); }
      for(const c of F.causes){ if(!NEG.test(c.effect)) continue; const act=fix(c.cause), o=F.causes.find(x=>x!==c&&!same(x.cause,c.cause)&&fix(x.cause)); if(!act) continue; const eff=lc(c.effect), effN=effNP(eff);
        add("Evaluating",`To ${isClause(eff)?"prevent":"reduce"} ${effN}, the best first step is to ${act.charAt(0).toLowerCase()+act.slice(1)}`,o?`To ${isClause(eff)?"prevent":"reduce"} ${effN}, the best first step is to ${fix(o.cause).charAt(0).toLowerCase()+fix(o.cause).slice(1)}`:`To ${isClause(eff)?"prevent":"reduce"} ${effN}, the best first step is to fix each case as it appears`,c.src); }
      const STEM={Remembering:["Which of the following statements is correct?","Which of the following statements is NOT correct?"],Understanding:["Which of the following statements shows a correct understanding of the ideas?","Which of the following statements shows a misunderstanding of the ideas?"],Applying:["Which of the following computed results is correct?","Which of the following computed results is NOT correct?"],Analyzing:["Which of the following conclusions is valid?","Which of the following conclusions is NOT valid?"],Evaluating:["Which of the following judgments is best justified?","Which of the following judgments is NOT justified?"]};
      for(const [lv,list] of Object.entries(ST)){ if(list.length<2) continue; const L0=shuffle(list,r);
        L0.forEach((x,i)=>{ const others=L0.filter((_,j)=>j!==i); push(`${lv[0]==="A"&&lv[1]==="n"?"N":lv[0]}.stmt.true`,lv,"mc",MC(STEM[lv][0], x.t, [x.f,...shuffle(others.map(o=>o.f),r)], null, true),{},x.src);
          if(others.length>=2) push(`${lv[0]==="A"&&lv[1]==="n"?"N":lv[0]}.stmt.false`,lv,"mc",MC(STEM[lv][1], x.f, shuffle(others.map(o=>o.t),r)),{},x.src); }); } }
    // situational (case) items: a short situation, then a question that needs analysis, judgment or a plan
    for(const c of F.causes){ if(!c.verb||!NEG.test(c.effect)) continue; const eff=lc(c.effect), cau=lc(c.cause); const wrong=[...F.causes.filter(x=>x!==c&&!same(x.cause,c.cause)).map(x=>lc(x.cause)),`it happens by chance and has no clear cause`,`the opposite of ${cau.split(" ").slice(0,6).join(" ")}`];
      const org2=orgFor(eff+" "+cau); for(let k=wrong.length-1;k>=0;k--){ const w=wrong[k]; if(F.causes.some(x=>lc(x.cause)===w && x!==c && overlaps0(x.effect,c.effect))) wrong.splice(k,1); } push("N.case.cause","Analyzing","case",MC(isClause(eff)?`Situation: ${cap(org2)} notices that ${eff}. Which of the following is the most likely cause?`:`Situation: ${cap(org2)} keeps running into ${eff.replace(/^(an?|the)\s+/i,"")}. Which of the following is the most likely cause?`, cau, wrong),{cause:cau,effect:eff},c.src); }
    for(const p of F.purposes){ const T=bare(p.term), purpose=p.purpose.replace(/^to\s+/i,""); const o=F.purposes.filter(x=>!same(x.term,p.term)&&!overlaps(x.purpose,purpose)&&!kin(x.term,p.term)&&!compared(x.term,p.term)); if(!o.length||kindOf(p.term)!=="tool") continue; const O=bare(o[0].term); const wT=reasonFor(T), wO=reasonFor(O); if(!wT||!wO) continue; const sc=scene(p,"must");
      push("E.case.suggest","Evaluating","case",MC(`Situation: ${sc.text} One co-worker suggests ${art(T)}, and another suggests ${art(O)}. Which suggestion is better, and why?`, `${cap(art(T))}, because ${wT}`, [`${cap(art(O))}, because ${wO}`,`${cap(art(O))}, because ${wT}`,`Both are equally good for this need`]),{term:T,purpose,ctx:sc.where},p.src); }
    { const ps=F.purposes.filter((p,i,A)=>A.findIndex(x=>same(x.term,p.term))===i && kindOf(p.term)==="tool");
      for(let i=0;i+1<ps.length && i<2;i++){ const A=bare(ps[i].term), B=bare(ps[i+1].term), pa=ps[i].purpose.replace(/^to\s+/i,""), pb=ps[i+1].purpose.replace(/^to\s+/i,"");
        push("N.case.plan","Analyzing","case",MC(`Situation: ${cap(orgFor(pa+" "+pb+" "+A+" "+B))} needs to ${pa} and also ${pb}. Which assignment of tools to these needs is correct?`, `Use ${art(A)} to ${pa}, and ${art(B)} to ${pb}`, [`Use ${art(A)} to ${pb}, and ${art(B)} to ${pa}`, `Use only ${art(A)} for both needs`, `Use only ${art(B)} for both needs`]),{a:A,b:B},ps[i].src+" "+ps[i+1].src); } }
    // --- Creating: a plan that combines two tools; designing a procedure
    { const ps=F.purposes.filter((p,i,A)=>A.findIndex(x=>same(x.term,p.term))===i);
      const combosOk=ps.filter(p=>kindOf(p.term)==="tool"); ps.length=0; ps.push(...combosOk);
      const combos=[]; for(let i=0;i<ps.length;i++) for(let j=i+1;j<ps.length;j++) if(!overlaps(ps[i].purpose,ps[j].purpose)) combos.push([i,j]);
      for(const [i,j] of shuffle(combos,r).slice(0,8)){ const A=bare(ps[i].term), B=bare(ps[j].term), pa=ps[i].purpose.replace(/^to\s+/i,""), pb=ps[j].purpose.replace(/^to\s+/i,"");
        const others=ps.filter((x,k)=>k!==i&&k!==j).map(x=>bare(x.term)).filter(x=>!compared(x,A)&&!compared(x,B)&&!related(x,A)&&!related(x,B));
        if(others.length>=2) push("N.mc.pair","Analyzing","mc",MC(`${cap(orgFor(pa+" "+pb+" "+A+" "+B))} needs a solution that can ${pa} and also ${pb}. Which pair of components meets both requirements?`, `${A} and ${B}`, [`${others[0]} and ${others[1]}`, `${A} and ${others[0]}`, `${others[1]} and ${B}`, `${others[0]} only`]),{a:A,b:B},ps[i].src+" "+ps[j].src);
        push("N.mc.combine","Analyzing","mc",MC(`${cap(orgFor(pa+" "+pb+" "+A+" "+B))} needs to ${pa} and also ${pb}. Which assignment of tools to these needs is correct?`, `Use ${art(A)} to ${pa}, and ${art(B)} to ${pb}`, [`Use ${art(A)} to ${pb}, and ${art(B)} to ${pa}`, `Use only ${art(A)} for both needs`, `Use only ${art(B)} for both needs`]),{a:A,b:B},ps[i].src+" "+ps[j].src); } }
    for(const st of F.steps){ if(st.steps.length<3) continue; const proc=procName(st);
      const good=st.steps.map(lc).join(" → "); const wr=new Set(); for(let t=0;t<12 && wr.size<3;t++){ const s2=shuffle(st.steps,r).map(lc).join(" → "); if(s2!==good) wr.add(s2); }
      push("C.mc.procedure","Creating","mc",MC(`Which sequence of steps would you design for a new checklist based on ${proc}?`, good, [...wr]),{process:proc},st.src); }
    }
    // ---- teachers' own patterns (learned from their edits)
    const termPool=[]; [...F.defs.map(d=>withArt(d)),...F.purposes.map(p=>termCase(p.term).replace(/^(\w+)s$/,"$1"))].forEach(t=>{ if(!termPool.some(x=>same(noArt(x),noArt(t)))) termPool.push(t); });
    const pools={term:termPool,a:pairs.map(p=>p[0]),b:pairs.map(p=>p[1]),cause:F.causes.map(c=>lc(c.cause)),effect:F.causes.map(c=>lc(c.effect)),ctx:pool.length?pool.slice(0,6):[ctx],example:F.examples.map(e=>e.example),process:F.steps.map(s=>s.process).filter(Boolean)};
    for(const mt of (opts.myTemplates||[])){
      if(!!mt.fil!==!!F.fil) continue;
      const slots=[...new Set((mt.text.match(/\{(\w+)\}/g)||[]).map(x=>x.slice(1,-1)))];
      if(!slots.length || slots.some(s=>!(pools[s]||[]).length)) continue;
      const n=Math.min(3,...slots.map(s=>pools[s].length));
      for(let i=0;i<n;i++){ const stem=mt.text.replace(/\{(\w+)\}/g,(m0,s)=>pools[s][i%pools[s].length]); push("Y."+mt.id,mt.level,mt.type||"short",{stem,mine:true},Object.fromEntries(slots.map(s=>[s,pools[s][i%pools[s].length]])),""); }
    }
    // de-duplicate, rank by what teachers keep, filter
    const stats=opts.stats||{}; const seen=new Set();
    let res=out.filter(q=>{ const k=(q.type==="mc"?"mc|":"")+q.stem.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
    res.forEach((q,i)=>{ const s=stats[q.tpl]; q.score=(q.mine?2:0)+(s?((s.kept+1)/(s.shown+2)-0.5)*4:0)-i*0.0001; });
    if(opts.level) res=res.filter(q=>q.level===opts.level);
    if(opts.type&&opts.type!=="any") res=res.filter(q=>opts.type==="short"?(q.type==="short"||q.type==="essay"):q.type===opts.type);
    res.sort((a,b)=>b.score-a.score);
    return {questions:res, facts:{definitions:F.defs.length, names:F.names.length, dates:F.dates.filter(d=>d.subject).length, lists:F.lists.length, steps:F.steps.length, examples:F.examples.length, classes:F.classes.length, formulas:F.formulas.length, causes:F.causes.length, relationships:F.rels.length, comparisons:F.contrasts.length+F.comps.length, purposes:F.purposes.length, terms:F.termList.slice(0,8), filipino:F.fil, main:F.main}};
  }
  function writeFil(F,push,ctx,artifact,r,D,terms){
    const IT_T=IT.test(F.text);
    for(const d of F.defs){ const S={term:d.term};
      push("R.fil.ano","Remembering","short",`Ano ang ${d.term}?`,S,d.src);
      push("R.fil.mc","Remembering","mc",mc(`Ano ang tawag sa ${lc(d.def)}?`, d.term, [...D,...terms], r),S,d.src);
      push("R.fil.tf","Remembering","tf",{stem:`Tama o mali: Ang ${d.term} ay ${lc(d.def)}.`,answer:"Tama"},S,d.src);
      push("R.fil.tukuyin","Remembering","ident",{stem:`Tukuyin ang tinutukoy: ${cap(d.def.replace(/[.]$/,""))}.`,answer:d.term},S,d.src);
      push("U.fil.own","Understanding","short",`Ipaliwanag sa sariling salita ang kahulugan ng ${d.term}.`,S,d.src);
      if(IT_T){ push("A.fil.gamit","Applying","short",`Gamitin ang ${d.term} sa isang sitwasyon sa ${ctx} at ipakita ang mga hakbang.`,S,d.src); push("N.fil.wala","Analyzing","essay",`Suriin ang mga problemang maaaring mangyari sa ${ctx} kung hindi gagamitin ang ${d.term}.`,S,d.src); push("E.fil.makatwiran","Evaluating","essay",`Makatwiran ba ang paggamit ng ${d.term} sa ${ctx}? Pangatwiranan ang iyong sagot.`,S,d.src); push("C.fil.disenyo","Creating","essay",`Magdisenyo ng ${artifact} para sa ${ctx} na gumagamit ng ${d.term}.`,S,d.src); }
      else { push("A.fil.patunay","Applying","short",`Gamitin ang kahulugan ng ${d.term} upang patunayan na ito ay makikita sa isang tunay na sitwasyon na iyong naobserbahan.`,S,d.src); push("N.fil.wala","Analyzing","essay",`Suriin kung ano ang magbabago kung wala ang ${d.term}.`,S,d.src); push("E.fil.halaga","Evaluating","essay",`Gaano kahalaga ang ${d.term}? Pangatwiranan ang iyong sagot.`,S,d.src); push("C.fil.gawain","Creating","essay",`Magdisenyo ng isang gawain o demonstrasyon na nagpapakita ng ${d.term}.`,S,d.src); }
      push("C.fil.orihinal","Creating","essay",`Bumuo ng orihinal na halimbawa na nagpapakita ng ${d.term}.`,S,d.src);
    }
    for(const l of F.lists){ push("R.fil.isa","Remembering","enum",{stem:`Isa-isahin ang mga ${l.kind} ng ${l.subject}.`,answer:l.items.join(", ")},{},l.src); push("N.fil.ugnay","Analyzing","essay",`Suriin kung paano nag-uugnayan ang mga ${l.kind} ng ${l.subject}.`,{},l.src); push("E.fil.pinaka","Evaluating","essay",`Alin sa mga ${l.kind} ng ${l.subject} ang pinakamahalaga? Pangatwiranan ang iyong sagot.`,{},l.src); }
    for(const e of F.examples){ const pool=[...F.examples.filter(x=>x!==e).map(x=>x.example),...F.lists.flatMap(l=>l.items),...D.filter(x=>!same(x,e.term))]; push("U.fil.halimbawa","Understanding","mc",mc(`Alin sa mga sumusunod ang halimbawa ng ${e.term}?`, e.example, pool, r),{},e.src); push("A.fil.iba","Applying","short",`Magbigay ng iba pang halimbawa ng ${e.term} bukod sa ${e.example}, at ipaliwanag kung bakit ito akma.`,{},e.src); }
    for(const c of F.causes){ push("U.fil.bakit","Understanding","short",{stem:`Bakit ${lc(c.effect)}?`,answer:c.cause},{},c.src); push("N.fil.sanhi","Analyzing","essay",`Suriin kung paano humahantong ang ${lc(c.cause)} sa ${lc(c.effect)}.`,{},c.src); push("C.fil.plano","Creating","essay",`Bumuo ng orihinal na plano upang mabawasan ang ${lc(c.cause)} sa ${ctx}.`,{},c.src); }
    for(const p of F.purposes){ push("A.fil.sitwasyon","Applying","mc",mc(`Kailangan ng isang tao na ${p.purpose}. Alin sa mga sumusunod ang dapat gamitin?`, p.term, [...D,...terms].filter(x=>!same(x,p.term)), r),{},p.src); }
    for(const c of F.contrasts){ push("U.fil.pagkakaiba","Understanding","short",`Ano ang pagkakaiba ng ${c.a} at ${c.b}?`,{},c.src); push("N.fil.ihambing","Analyzing","essay",`Ihambing ang ${c.a} at ${c.b} batay sa kanilang gamit at katangian.`,{},c.src); push("E.fil.mas","Evaluating","essay",`Alin ang mas mahalaga, ${c.a} o ${c.b}? Pangatwiranan ang iyong sagot.`,{},c.src); }
  }
  /* ---- learning a teacher's own pattern from an edited question ---- */
  function learnTemplate(edited, slots, level, type, fil){
    let t=" "+String(edited).split("\n")[0].trim()+" ", used=0;
    const order=Object.entries(slots||{}).filter(([k,v])=>typeof v==="string" && v.length>=3 && !["def","items","what","expr"].includes(k)).sort((a,b)=>b[1].length-a[1].length);
    for(const [k,v] of order){ const rx=new RegExp("\\b"+reEsc(v)+"\\b","gi"); if(rx.test(t)){ t=t.replace(rx,"{"+k+"}"); used++; } }
    t=t.trim(); if(!used || !/\{(term|a|b|cause|effect|example|process)\}/.test(t)) return null;
    return {id:"t"+Date.now().toString(36)+Math.random().toString(36).slice(2,5), text:t, level, type:type==="mc"?"short":type, fil:!!fil, at:Date.now()};
  }
  return {read, generate, isFilipino, learnTemplate, parseFormula, evalFormula, SETTINGS, SETTINGS_FIL, DOMAIN_SETTINGS};
})();
if(typeof module!=="undefined") module.exports=QGen;
