/* QGen v2.3 — offline question generator for TOS Builder.
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
  const lc = s => { s=trimP(s); if(/^[A-Z]{2,}|^[A-Z][a-z]*[A-Z]/.test(s)) return s; const w=s.split(" ")[0]; if(/^[A-Z]/.test(w) && new RegExp("[a-z,;:]\\s+"+reEsc(w)+"\\b").test(CUR)) return s; return s.charAt(0).toLowerCase()+s.slice(1); };
  const isName = s => /^([A-Z][a-z]+\.?\s+){1,3}[A-Z][a-z]+\.?$/.test(trimP(s).replace(/^(the|an?)\s+/i,""));
  function termCase(t){ t=trimP(t); if(!t) return t; const f=t.split(" ")[0]; if(/^[A-Z0-9]{2,}/.test(f)||/[a-z][A-Z]/.test(f)||/^[A-Z][a-z]+'s$/.test(f)) return t;
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
  /* ================= reading ================= */
  function read(text){
    CUR=String(text||""); const fil=isFilipino(text), S=sentences(text);
    const F={fil,text,defs:[],names:[],dates:[],lists:[],steps:[],examples:[],classes:[],formulas:[],causes:[],rels:[],comps:[],contrasts:[],purposes:[],limits:[],terms:new Map()};
    const addTerm=(t,w=1)=>{ t=noArt(t); if(!t||t.length<3||t.split(" ").length>5||PRON.test(t)||STOP.has(t.toLowerCase())||/[=]/.test(t)) return; const k=t.toLowerCase(); F.terms.set(k,{t,w:(F.terms.get(k)?.w||0)+w}); };
    let lastTerm=null;
    const ordered=[];
    for(const raw of S){
      let s=raw.replace(/[.!?]$/,"").trim(); let m;
      if(fil){ readFil(s,raw,F,addTerm); continue; }
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
      if((m=s.match(/^for (?:example|instance),?\s+(.+?)\s+(?:is|are)\s+(?:an?\s+)?(?:(?:real-life|common|good)\s+)?(?:example\s+of\s+(?:an?\s+)?)?(.+)$/i))){ F.examples.push({example:trimP(m[1]).replace(/^"|"$/g,""),term:noArt(m[2]).replace(/,?\s+(?:while|whereas)\b.*$/i,""),src:raw}); }
      else if((m=s.match(/^for (?:example|instance),?\s+(.+)$/i)) && lastTerm){ const e=trimP(m[1]).split(/\s+(?:is|are|earns|earn|uses|use|has|have|shows|show|can|will|produces|produce|gives|give|follows|follow)\s+/)[0]; F.examples.push({example:e,term:lastTerm,src:raw}); }
      if(/^(for (?:example|instance)|however|halimbawa|in addition|also)\b/i.test(s)) continue;
      if((m=s.match(/^(.+?)\s+(?:is|are)\s+(?:an?\s+)?examples?\s+of\s+(?:an?\s+)?(.+)$/i)) && !/^for /i.test(s)) F.examples.push({example:trimP(m[1]),term:noArt(m[2]),src:raw});
      if((m=s.match(/\b([a-z][\w\s]{2,40}?),?\s+such as\s+(.+?)(?:,\s*(?:is|are|can|which)\b.*)?$/i))){ splitItems(m[2]).map((x,i,a)=>i===a.length-1&&x.split(" ").length>2?x.split(/\s+(?:over|in|on|to|for|from|with|by|through)\s+/)[0]:x).forEach(x=>F.examples.push({example:x,term:noArt(m[1].split(/\s+(?:of|in|from|like)\s+/).pop()),src:raw})); }
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
      if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,40}?)\s+(?:is|are)\s+((?:more|less)\s+\w+|\w+er)\s+than\s+(?:an?\s+|the\s+)?(.{2,40})$/i)) && !PRON.test(m[1])) F.comps.push({a:noArt(m[1]),comp:m[2],b:noArt(m[3]),src:raw});
      // ---- limitations
      if((m=s.match(/^however,\s*(?:it|they|this)\s+(.+)$/i)) && lastTerm) F.limits.push({term:lastTerm,limit:trimP(m[1]),src:raw});
      // ---- purposes
      if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,50}?)\s+(?:is|are)\s+used\s+(to|for)\s+(.+)$/i)) && !PRON.test(m[1])){ F.purposes.push({term:noArt(m[1]),purpose:(m[2]==="to"?"":"for ")+trimP(m[3]),src:raw}); addTerm(m[1],2); }
      else if((m=s.match(/^(?:it|they)\s+(?:is|are)\s+used\s+to\s+(.+)$/i)) && lastTerm) F.purposes.push({term:lastTerm,purpose:trimP(m[1]),src:raw});
      else if((m=s.match(/^the\s+(?:main\s+)?(?:purpose|goal|aim|function)\s+of\s+(?:an?\s+|the\s+)?(.+?)\s+is\s+(?:to\s+)?(.+)$/i))) F.purposes.push({term:noArt(m[1]),purpose:trimP(m[2]),src:raw});
      else if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,40}?)\s+(?:helps?|allows?|enables?)\s+(?:to\s+)?(.+)$/i)) && words(m[1]).length<=4 && !PRON.test(m[1]) && !/^(planting|using|burning)\b/i.test(m[1])) F.purposes.push({term:noArt(m[1]),purpose:trimP(m[2]),src:raw,helps:true});
      // ---- causes and effects
      if((m=s.match(/^(.+?),?\s+because\s+(?:of\s+)?(.+)$/i))) F.causes.push({effect:trimP(m[1]),cause:trimP(m[2]),src:raw});
      else if((m=s.match(/^(.+?),?\s+(?:which\s+)?(?:helps?\s+(?:to\s+)?)?(results in|result in|leads to|lead to|causes|cause|produces|produce|prevents|prevent|reduces|reduce|increases|increase|releases|release|threatens|threaten)\s+(.+)$/i)) && words(m[1]).length<=10 && !/^when\b/i.test(m[1])){
        let cause=trimP(m[1]); const w2=cause.match(/^(.+?),\s*which$/i); if(w2) cause=w2[1];
        cause=cause.replace(/\s+(helps?|can|will|may|could|tends? to)$/i,"");
        let verb=m[2].toLowerCase(); if(!/s$/.test(verb) && !/(^|\s)(they|we|people)\s/i.test(cause) && !/s\b/.test(cause.split(" ").pop()||"")) verb=verb.replace(/^(result|lead|cause|produce|prevent|reduce|increase|release|threaten)$/,"$1s");
        if(/^(planting|using|burning|cutting|adding|increasing|reducing)\b/i.test(cause) && !/s$/.test(verb)) verb+="s";
        F.causes.push({cause,verb,effect:trimP(m[3]),src:raw});
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
        if(items.length>=3 && items.every(x=>x.split(" ").length<=4) && /,/.test(m[4])){ F.lists.push({kind:noArt(m[2]),subject:"",items,src:raw}); items.forEach(x=>addTerm(x,2)); }
        else if(!F.defs.some(d=>d.term.toLowerCase()===noArt(m[2]).toLowerCase())){ F.defs.push({art:(m[1]||"").trim().toLowerCase(),term:noArt(m[2]),verb:v,def:trimP(m[4]),src:raw}); addTerm(m[2],3); lastTerm=noArt(m[2]); }
      }
      (s.match(/(?<=[a-z,]\s)(?:[A-Z][a-z]+\s?){2,3}/g)||[]).forEach(w=>addTerm(w,1));
    }
    if(ordered.length>=2 && !F.steps.length) F.steps.push({process:"",steps:ordered,src:"",ordered:true});
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
    let d=[...new Set(pool.map(x=>trimP(x)).filter(x=>x && x.length<=90 && !eq(x,al)))];
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
    const artifact=F.fil ? (IT_T?"isang sistema":"isang proyekto") : IT_T ? shuffle(["a system","a database design","a program","an application"],r)[0] : shuffle(["a project","a lesson activity","a plan","an information campaign"],r)[0];
    const out=[];
    const push=(tpl,level,type,q,slots,src)=>{ if(!q) return; if(typeof q==="string") q={stem:q};
      if(q.stem.includes(CT)){ const c=nextCtx(); q={...q,stem:q.stem.split(CT).join(c),setting:c}; slots={...(slots||{}),ctx:c}; } else if(slots&&slots.ctx===CT){ slots={...slots}; delete slots.ctx; } q.stem=cap(q.stem.replace(/\s+/g," ").replace(/\s+([?.,])/g,"$1").replace(/\.\./g,".")); out.push({tpl,level,type,...q,slots:slots||{},basis:src||""}); };
    const D=F.defs.map(d=>d.term), terms=F.termList.filter(t=>!/\b(commonly|used|main|types?|parts?|kinds?)\b/i.test(t));
    const withArt=d=>(d.art&&!/^[A-Z]{2,}/.test(d.term)?d.art+" ":"")+d.term;
    const allEffects=F.causes.map(c=>c.effect), allItems=F.lists.flatMap(l=>l.items);
    const pairs=[...F.contrasts.map(c=>[c.a,c.b])];
    for(let a=0;a<F.defs.length;a++) for(let b=a+1;b<F.defs.length;b++) if(F.defs[a].head&&F.defs[a].head===F.defs[b].head) pairs.push([F.defs[a].term,F.defs[b].term]);
    F.lists.forEach(l=>{ if(l.items.length>=2) pairs.push([l.items[0],l.items[1]]); });
    if(F.fil){ writeFil(F,push,ctx,artifact,r,D,terms); }
    else {
    /* ---- definitions ---- */
    for(const d of F.defs){
      const t=withArt(d), T0=cap(t), dl=lc(d.def), be=/^(was|were|are)$/.test(d.verb)?d.verb:"is", S={term:t,def:dl,ctx};
      const kin=F.defs.filter(x=>x!==d&&x.head===d.head).map(x=>x.term);
      push("R.def.define","Remembering","short",{stem:`Define ${t}.`,answer:cap(d.def)},S,d.src);
      push("R.def.mc","Remembering","mc",mc(`Which term refers to ${dl}?`, d.term, [...kin,...D,...F.classes.map(c=>c.item),...allItems,...terms], r),S,d.src);
      push("R.def.blank","Remembering","blank",{stem:`____ ${d.verb} ${dl}.`,answer:cap(d.term)},S,d.src);
      push("R.def.tf","Remembering","tf",{stem:`True or false: ${T0} ${d.verb} ${dl}.`,answer:"True"},S,d.src);
      const other=F.defs.find(x=>x!==d&&x.head===d.head)||F.defs.find(x=>x!==d);
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
        push("E.ent.sig","Evaluating","essay",`How significant was ${t}? Justify your answer with evidence from the lesson.`,S,d.src);
        push("C.ent.timeline","Creating","essay",`Create an original timeline, story or presentation about ${t}.`,S,d.src);
        continue;
      }
      if(!F.examples.some(e=>same(e.term,d.term))) push("U.def.example","Understanding","short",`Give an example of ${t} and explain why it is an example.`,S,d.src);
      if(d.tool){
        push("A.tool.demo","Applying","short",`Demonstrate how ${t} would be applied in ${ctx}.`,S,d.src);
        push("N.tool.without","Analyzing","essay",`Analyze the problems that could arise in ${ctx} if ${t} were not used.`,S,d.src);
        push("E.tool.best","Evaluating","essay",`Is ${t} always the best approach for ${ctx}? Justify your answer.`,S,d.src);
        push("C.tool.design","Creating","essay",`Design ${artifact} for ${ctx} that makes use of ${t}.`,S,d.src);
      } else {
        push("A.con.observe","Applying","short",`Describe a real situation where ${t} can be observed, and use the definition to show that it fits.`,S,d.src);
        push("N.con.parts","Analyzing","essay",`Break down the definition of ${t} into its key parts and explain how each part contributes to its meaning.`,S,d.src);
        push("E.con.importance","Evaluating","essay",`How important is ${t} in the topic you studied? Justify your answer with reasons from the lesson.`,S,d.src);
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
    for(const l of F.lists){
      const what=l.subject?`the ${l.kind} of ${l.subject}`:`the ${l.kind}`, S={what,items:l.items.join(", ")};
      const outside=[...D,...F.lists.filter(x=>x!==l).flatMap(x=>x.items),...F.classes.map(c=>c.item),...terms].filter(t=>!l.items.some(x=>same(x,t)) && !same(t,l.subject||"~") && !same(t,l.kind));
      push("R.list.enum","Remembering","enum",{stem:`Enumerate ${what}.`,answer:l.items.map(cap).join(", ")},S,l.src);
      push("R.list.mc","Remembering","mc",mc(`Which of the following is one of ${what}?`, l.items[0], outside, r),S,l.src);
      if(l.items.length>=3 && outside.length){ const odd=shuffle(outside,r)[0]; const ch=shuffle([...shuffle(l.items,r).slice(0,3),odd],r); push("R.list.not","Remembering","mc",{stem:`Which of the following is NOT one of ${what}?`,choices:ch.map(cap),answer:"abcd"[ch.indexOf(odd)],answerText:cap(odd)},S,l.src); }
      push("U.list.describe","Understanding","short",`Describe each of ${what} in your own words.`,S,l.src);
      push(IT_T?"A.list.apply":"A.list.identify","Applying","short",IT_T?`Apply ${what} to a situation in ${ctx}.`:`Apply your knowledge of ${what} to identify each one in a real example or diagram.`,S,l.src);
      push("N.list.relate","Analyzing","essay",`Examine how ${what} (${l.items.join(", ")}) are related to one another.`,S,l.src);
      push("E.list.most","Evaluating","essay",`Which of ${what} is the most important? Justify your choice.`,S,l.src);
      push("C.list.model","Creating","essay",`Create an original diagram or model that shows how ${what} work together.`,S,l.src);
    }
    for(const st of F.steps){
      const pr0=st.process?st.process.replace(/^the\s+/i,""):"", proc=pr0?(/ing$/i.test(pr0)?pr0:`the ${pr0}`):"the process described";
      push("R.step.first","Remembering","mc",mc(`What is the first step of ${proc}?`, st.steps[0], st.steps.slice(1), r, 4, false),{process:proc},st.src);
      push("R.step.order","Remembering","seq",{stem:`Arrange the steps of ${proc} in the correct order: ${shuffle(st.steps,r).map(x=>lc(x)).join("; ")}.`,answer:st.steps.map(x=>lc(x)).join(" → ")},{process:proc},st.src);
      push("A.step.use","Applying","short",`Use the steps of ${proc} to investigate or solve a problem in ${ctx}. Show what you would do at each step.`,{process:proc},st.src);
      push("N.step.why","Analyzing","essay",`Analyze why the steps of ${proc} must be done in that order.`,{process:proc},st.src);
      push("C.step.new","Creating","essay",`Design a new checklist based on ${proc} that people in ${ctx} can follow.`,{process:proc},st.src);
    }
    /* ---- examples and classifications ---- */
    const exGroups=[]; for(const e of F.examples){ const g=exGroups.find(x=>same(x.term,e.term)&&x.src===e.src); if(g) g.list.push(e.example); else exGroups.push({...e,list:[e.example]}); }
    for(const e of exGroups){
      const term=termCase(e.term), S={term,example:e.example}, ex=e.example.replace(/^"|"$/g,"");
      const pool=[...F.examples.filter(x=>!same(x.term,e.term)).map(x=>x.example), ...F.classes.filter(c=>!same(c.category,e.term)).map(c=>c.item), ...D.filter(x=>!same(x,term))];
      const aTerm=/^(an?|the)\s/i.test(term)||/s$/.test(term)||!new RegExp("\\b(a|an)\\s+"+reEsc(term)+"\\b","i").test(CUR)?term:(/^[aeiou]/i.test(term)?"an ":"a ")+term;
      push("U.ex.which","Understanding","mc",mc(`Which of the following is an example of ${aTerm}?`, e.example, pool, r),S,e.src);
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
      push("R.form.what","Remembering","short",{stem:f.name?`What is the formula for ${f.name.replace(/^the\s+/i,"")}?`:`Write the formula given in the lesson.`,answer:f.expr},S,f.src);
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
      const pt=(/^(an?|the)\s/i.test(p.term)||/^[A-Z]{2,}/.test(p.term)||/s$/.test(p.term))?termCase(p.term):(/^[aeiou]/i.test(p.term)?"an ":"a ")+termCase(p.term);
      const purpose=p.purpose.replace(/^to\s+/i,""), S={term:pt,purpose};
      const actor=fixed?`In ${fixed}, someone`:IT_T?"An IT staff member":"A student";
      const tools=[...D,...F.purposes.map(x=>x.term),...F.classes.map(c=>c.item),...terms].filter(x=>!same(x,p.term));
      push("U.purp.what","Understanding","short",{stem:`What is the purpose of ${pt}?`,answer:cap(p.purpose)},S,p.src);
      push("A.purp.situation","Applying","case",mc(`${actor} needs to ${p.helps?"help "+purpose:purpose}. Which of the following should be used?`, termCase(p.term), tools, r),S,p.src);
      push("A.purp.use","Applying","short",IT_T?`Use ${pt} to ${p.helps?"help "+purpose:purpose} in ${ctx}. Show how you would do it.`:`Use ${pt} to ${p.helps?"help "+purpose:purpose}. Show your work.`,S,p.src);
      push("E.purp.how","Evaluating","essay",`Evaluate how well ${pt} ${p.helps?"helps "+purpose:"serves its purpose ("+purpose+")"}. Support your judgment.`,S,p.src);
    }
    for(const l of F.limits){ const t=termCase(l.term); push("E.limit.still","Evaluating","essay",`Considering that ${t} ${l.limit}, is it still a good choice for ${ctx}? Justify your answer.`,{term:t},l.src); }
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
      if(NEG.test(c.effect)) push("C.cause.plan","Creating","essay",`Propose an original plan to reduce ${/^(an?|the)\s/i.test(effect)||/^\w+ing\b/.test(effect)?effect:"the problem of "+effect}${hasCtx?" in "+ctx:""}.`,S,c.src);
      else push("C.cause.story","Creating","essay",c.verb?`Create an original diagram or story that shows how ${cause} ${c.verb} ${effect}.`:`Create an original diagram or story that shows how ${cause} leads to ${effect}.`,S,c.src);
    }
    for(const a of F.causes) for(const b of F.causes){ if(a===b) continue; const ae=a.effect.toLowerCase(), key=b.cause.toLowerCase().split(/\W+/).filter(w=>w.length>4&&!STOP.has(w)); if(key.length && key.some(w=>ae.includes(w))) push("N.chain.trace","Analyzing","essay",`Trace how ${lc(a.cause)} can eventually lead to ${lc(b.effect)}, explaining each link.`,{},a.src+" "+b.src); }
    const OPP={increases:"decreases",decreases:"increases",rises:"falls",falls:"rises","goes up":"goes down","goes down":"goes up"};
    for(const rl of F.rels){
      const correct=`It ${rl.dy}`, ch=shuffle([correct,`It ${OPP[rl.dy]}`,"It stays the same","It becomes zero"],r);
      push("U.rel.mc","Understanding","mc",{stem:`According to the lesson, when ${rl.x} ${rl.dx}, what happens to ${rl.y}?`,choices:ch,answer:"abcd"[ch.indexOf(correct)],answerText:correct},{x:rl.x,y:rl.y},rl.src);
      push("A.rel.predict","Applying","short",`Use the relationship between ${rl.x} and ${rl.y} to predict what happens in a real situation where ${rl.x} ${OPP[rl.dx]||rl.dx}. Explain your answer.`,{x:rl.x,y:rl.y},rl.src);
      push("N.rel.why","Analyzing","essay",`Analyze why ${rl.y} ${rl.dy} when ${rl.x} ${rl.dx}.`,{x:rl.x,y:rl.y},rl.src);
    }
    for(const cp of F.comps){
      push("U.comp.why","Understanding","short",`Explain why ${cp.a} ${/s$/.test(cp.a)?"are":"is"} ${cp.comp} than ${cp.b}.`,{a:cp.a,b:cp.b},cp.src);
      push("E.comp.always","Evaluating","essay",`Is ${cp.a} always better than ${cp.b}? Defend your answer.`,{a:cp.a,b:cp.b},cp.src);
    }
    const seenP=new Set();
    for(const [a0,b0] of pairs){ const a=termCase(a0), b=termCase(b0); const k=[a,b].map(x=>x.toLowerCase()).sort().join("|"); if(seenP.has(k)||same(a,b)) continue; seenP.add(k); const S={a,b};
      push("U.pair.diff","Understanding","short",`What is the difference between ${a} and ${b}?`,S);
      push("N.pair.compare","Analyzing","essay",`Compare ${a} and ${b} in terms of how they work and when each is used.`,S);
      if(IT_T){ push("E.pair.choose","Evaluating","essay",`Which is more appropriate for ${ctx}: ${a} or ${b}? Defend your choice.`,S); push("C.pair.combine","Creating","essay",`Propose a new approach that combines ${a} and ${b} to solve a problem in ${ctx}.`,S); }
      else { push("E.pair.significant","Evaluating","essay",`Which is more significant, ${a} or ${b}? Defend your answer.`,S); push("C.pair.illustrate","Creating","essay",`Create an original illustration or story that shows the difference between ${a} and ${b}.`,S); }
    }
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
      else { push("A.fil.patunay","Applying","short",`Gamitin ang kahulugan ng ${d.term} upang patunayan na ito ay makikita sa isang tunay na sitwasyon na iyong naobserbahan.`,S,d.src); push("N.fil.wala","Analyzing","essay",`Suriin kung ano ang magbabago kung wala ang ${d.term}.`,S,d.src); push("E.fil.halaga","Evaluating","essay",`Gaano kahalaga ang ${d.term}? Pangatwiranan ang iyong sagot gamit ang mga natutunan sa aralin.`,S,d.src); push("C.fil.gawain","Creating","essay",`Magdisenyo ng isang gawain o demonstrasyon na nagpapakita ng ${d.term}.`,S,d.src); }
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
