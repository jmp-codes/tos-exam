/* BloomAI v3 — a small Bloom's-level classifier that trains and runs in the browser.
   Multinomial logistic regression over word, word-pair and question-opening features. */
const BloomAI = (() => {
  const LEVELS = ["Remembering","Understanding","Applying","Analyzing","Evaluating","Creating"];
  const STOP = new Set(["the","a","an","of","to","in","and","is","are","for","on","with","that","this","be","by","as","at","it","its","from","or","your","you","each","their","given","following"]);

  /* Sentence-construction patterns: how a question is built says a lot about the thinking it asks for.
     Each pattern becomes a model feature and is shown to the teacher as the reason. */
  const P = (id, level, name, rx) => ({id, level, name, rx});
  const PATTERNS = [
    // ---------- Remembering ----------
    P("R1","Remembering","“Which of the following is/are …” (recall a fact)", /^which (of the following|of these|one)\s+(is|are|was|were)\b(?!\s+(the\s+)?(best|most|least|correct explanation|better|more|incorrect|inconsistent|invalid|valid|true about))/i),
    P("R2","Remembering","“… is called / known as / referred to as …”", /\b(is|are|was) (called|known as|termed|referred to as|also called)\b/i),
    P("R3","Remembering","Fill-in-the-blank (____)", /_{2,}/),
    P("R4","Remembering","Starts with define / list / name / enumerate / state / label", /^(define|list|name|enumerate|state|label|recall|memorize|identify the (term|name|symbol|part|type))\b/i),
    P("R5","Remembering","Who / When / Where question", /^(who|when|where|in what year|what year)\b/i),
    P("R6","Remembering","Asks what an acronym stands for", /\b(stand|stands) for\b|full (meaning|form)|\bacronym\b|ibig sabihin ng [A-Z]{2,}/i),
    P("R7","Remembering","True or false", /^(true or false|tama o mali)\b/i),
    P("R8","Remembering","“What is a/an …?” (definition)", /^what (is|are) (a|an)\s+[a-z\- ]{2,30}\??$/i),
    P("R9","Remembering","Asks for the term, symbol, formula or unit", /^(what|which) (is|are) the (name|term|symbol|formula|unit|si unit|chemical symbol|keyword|command|tag|default port|capital|meaning of the (word|term))\b|^give the (formula|symbol|definition|meaning|term)\b/i),
    P("R10","Remembering","Filipino recall: Tukuyin / Ano ang tawag / Sino / Kailan / Isa-isahin", /^(tukuyin ang (kahulugan|tawag)|ano ang tawag|ano ang ibig sabihin|sino ang|kailan|saan|ibigay ang (kahulugan|pormula|simbolo|tatlong|dalawang)|isa-isahin|pangalanan|anong)\b/i),
    // ---------- Understanding ----------
    P("U1","Understanding","“Which best describes / explains / illustrates …”", /\b(best|correctly|most accurately)\s+(describes?|explains?|illustrates?|expresses?|summarizes?|represents?|restates?|defines?)\b/i),
    P("U2","Understanding","Starts with explain / describe / summarize / discuss / interpret / classify", /^(explain|describe|summarize|summarise|discuss|interpret|paraphrase|restate|illustrate|classify|translate)\b/i),
    P("U3","Understanding","“Why is / are / do …” (reason behind a concept)", /^why (is|are|do|does|did|can|should|must|would)\b(?!.*\b(program|code|query|output|print|error|fail|failing|return|crash|slow|wrong answer|different answers|loop)\b)/i),
    P("U4","Understanding","“In your own words” / “What is meant by”", /in your own words|what (is|was) meant by|what does it mean|meaning of the (idiom|saying|statement)|sa sariling salita/i),
    P("U5","Understanding","Asks for the difference between two ideas", /(what is|explain|describe) the difference between|pagkakaiba ng/i),
    P("U6","Understanding","Asks for an example", /\bgive an example\b|\bmagbigay ng halimbawa\b/i),
    P("U7","Understanding","Asks for the purpose / role / main idea", /\b(purpose|role|main idea|significance|importance) of\b|\bmain idea\b|kahalagahan ng/i),
    P("U8","Understanding","Filipino explanation: Ipaliwanag / Ilarawan / Ibuod / Bakit", /^(ipaliwanag|ilarawan|ibuod|ipahayag|bakit|uriin)\b/i),
    // ---------- Applying ----------
    P("A1","Applying","Starts with solve / compute / calculate / find / convert / simplify", /^(solve|compute|calculate|find|convert|simplify|expand|factor|evaluate the (expression|value|integral|limit)|estimate)\b/i),
    P("A2","Applying","“How many / how much / how long …” (count or compute)", /\bhow (many|much|long|far|fast)\b/i),
    P("A3","Applying","A situation with numbers, then a question to work out", /^(if|a|an|given|there are|suppose|when)\b[^?]*\d[^?]*\b(what|how|find|compute|calculate|determine)\b/i),
    P("A4","Applying","Math notation to work out (P(…), C(n,r), n!, mod)", /\bP\s*\(|\bC\s*\(\s*\d|\d+\s*!|\bmod\b|\d+\s*(choose|P)\s*\d/i),
    P("A5","Applying","“Write a program / query / function / code that …” (use a known method)", /^(write|give) (a|an|the) (python |java |sql |javascript |c )?(program|function|method|query|statement|code|loop|sql|html|css|xpath|regular expression|command)/i),
    P("A6","Applying","Starts with use / apply / perform / complete / draw / construct a truth table", /^(use|using|apply|perform|complete|draw|construct a truth table|show the steps|demonstrate how|implement|execute|sort|traverse)\b/i),
    P("A7","Applying","“What is [number/expression] …?” (calculate a value)", /^what is (the (value|result|sum|product|probability|area|mean|median|mode|range|decimal|binary|percentage)\b[^?]*\d|[^a-z]*\d)/i),
    P("A8","Applying","Filipino computation: Lutasin / Kalkulahin / Gamitin / Ilapat / Ilang paraan", /^(lutasin|kalkulahin|kuwentahin|gamitin|ilapat|isagawa|hanapin|i-convert|isulat ang (programa|sql|query|code))\b|\bilang (paraan|posibleng|subnet)\b/i),
    // ---------- Analyzing ----------
    P("N1","Analyzing","“What is the output / what will be printed / what will happen”", /what (is|will be|would be) (the )?(output|printed|displayed|returned|result of (running|executing))|what (is|gets|will be) printed|what will happen|what does the following (code|function|query|program) (return|print|output|display)|magiging output/i),
    P("N2","Analyzing","Finds an error, bug, cause, fallacy or violation", /\b(error|bug|flaw|fallacy|root cause|cause of|causes|caused|bottleneck|violat\w*|inconsistent|invalid|unsound|incorrect step|mistake|wrong)\b.{0,60}(\?|$)|^(which|what) .{0,40}\b(causes?|explains? the difference|went wrong)\b/i),
    P("N3","Analyzing","Starts with compare / contrast / differentiate / examine / analyze / trace / infer", /^(compare|contrast|differentiate|distinguish|categorize|organize|examine|analy[sz]e|trace|debug|inspect|infer|deduce|break down|investigate|determine whether)\b/i),
    P("N4","Analyzing","Code or data is given to examine", /[=;{}\[\]]|\w\(.*\)|print\(|console\.|printf|\bgiven (the|two|this) (code|table|data|graph|chart|diagram|log|output|xml|schema|results?|scenario|dataset)\b/i),
    P("N5","Analyzing","Asks what can be inferred / the relationship / what explains a result", /\b(inferred|infer|relationship between|what (does|do) (this|the \w+) suggest|alternative explanation|account for|what explains)\b/i),
    P("N6","Analyzing","“Why does the [program/page/query] …” (diagnose a problem)", /^why (does|do|did|is|are) (the|this|a|two)?\s*\w*\s*(program|code|query|page|website|web|parser|request|service|function|loop|test|system|network|students get|results?|answers?)/i),
    P("N7","Analyzing","Filipino analysis: Suriin / Ihambing / Pag-ibahin / Tukuyin ang sanhi o mali", /^(suriin|ihambing|pag-ibahin|tukuyin ang (sanhi|mali|ugnayan|pagkakaiba)|alamin (kung|ang) (aling|mali|sanhi)|batay sa)\b|hindi balido|\bsanhi\b/i),
    // ---------- Evaluating ----------
    P("E1","Evaluating","Asks you to justify / defend / support a judgment", /\b(justify|defend|support your (answer|choice|stand|position|view)|explain your (judgment|choice|reasoning|ranking|stand)|weigh the|pangatwiranan|patunayan|ipaliwanag ang iyong (paninindigan|pagpili))\b/i),
    P("E2","Evaluating","“Which is best / most appropriate / better … and why?”", /\b(best|better|most (appropriate|effective|efficient|suitable|reasonable|realistic|convincing|trustworthy|feasible|secure)|strongest|fairer|more (realistic|appropriate|effective))\b(?!\s+(describes?|explains?|illustrates?|expresses?|summarizes?|represents?))[^?]*\?/i),
    P("E3","Evaluating","Yes/no judgment question (Is it / Should / Do you agree …?)", /^(is|are|was|would|should|do you (agree|think)|does the|do the|can we (say|conclude)|makatwiran ba|sang-ayon ka ba|dapat bang)\b[^?]*\?/i),
    P("E4","Evaluating","Starts with evaluate / assess / judge / critique / recommend / rank", /^(evaluate|assess|judge|critique|appraise|recommend|decide|prioriti[sz]e|rank|rate|weigh|verify|validate|argue|select the best|tayahin|husgahan|ipagtanggol|magbigay ng rekomendasyon)\b(?!\s+the\s+(expression|value|integral))/i),
    // ---------- Creating ----------
    P("C1","Creating","Starts with design / create / develop / compose / propose / plan / invent", /^(design|create|develop|compose|formulate|propose|plan|devise|invent|generate|build|produce|draft|outline|sketch|prepare|construct an original|construct a new|put together|come up with)\b/i),
    P("C2","Creating","Asks for something original / new / your own", /\b(original|your own|a new version|new ending|new feature|new (game|recipe|design|algorithm|problem|story))\b/i),
    P("C3","Creating","“Write a story / poem / essay / proposal / letter / speech”", /^write (an? )?(original |new |short |persuasive )?(story|poem|haiku|essay|letter|proposal|speech|song|script|paragraph|research|case study|version)/i),
    P("C4","Creating","Filipino creation: Bumuo / Lumikha / Magdisenyo / Gumawa ng orihinal / Sumulat ng", /^(bumuo|lumikha|magdisenyo|magplano|magmungkahi|gumawa ng (orihinal|panukala|plano|kuwento|disenyo|programa)|sumulat ng (orihinal|liham|sanaysay|tula|kuwento))\b/i),
  ];

  /* Construction reader: looks past the first verb to what the whole sentence actually demands.
     The highest genuine demand wins ("Compare … and recommend one" → Evaluating),
     and routine products stay routine ("Create a truth table" → Applying). */
  const K = (level, name, rx, not) => ({level, name, rx, not});
  const HAS_ORIGINAL = /\b(original|your own|own design|own plan|sarili (mong|nating|ninyong|kong)|orihinal)\b/i;
  const READER = [
    K("Remembering","Asks you to state a formula or definition",
      /^(give|state|what is|what are|write down|recall|ibigay ang) the (formula|definition|pormula)|^ibigay ang (pormula|kahulugan)\b/i, /\b(and|then) (use|compute|calculate|apply|solve)\b/i),
    K("Applying","Makes a routine product (truth table, query, formula, table of values…)",
      /^(create|construct|build|design|develop|make|prepare|draw|write|give|set up|define|gumawa ng|bumuo ng)\b[^?]*\b(truth table|talahanayan ng katotohanan|sql (statement|query)|the query|a query|the formula|frequency (table|distribution)|table of values|binary (representation|equivalent)|venn diagram (for|of)|graph of|equation of|(function|method|query|statement|formula) that (returns|computes|prints|lists|shows|counts|checks|finds|converts))\b/i, /\b(original|your own|own design|own plan|sarili (mong|nating|ninyong|kong)|orihinal)\b|^(create|build|develop|design|make) (a|an) (program|system|app|application|circuit|device|game|machine)\b/i),
    K("Creating","Asks how you would design or build something",
      /\bhow (you|we|would you) (would )?(design|build|create|develop|plan|make|set up|organi[sz]e|improve|solve)\b|\bpaano mo (ididisenyo|bubuuin|gagawin)\b/i),
    K("Creating","Asks for something original or your own",
      /\b(original(?!\s+(statement|text|document|source|question|data|price|value|form|file|list|order|meaning|proposition|sentence|equation|argument))|your own (design|plan|solution|version|system|app|program|idea|story|poem|problem|algorithm|website|device|game)|a new (version|ending|design|game|recipe|solution|way)|sarili (mong|nating|ninyong) (disenyo|plano|bersyon)|orihinal)\b/i),
    K("Creating","Starts a new product (design / develop / propose / compose … a system, app, plan, story…)",
      /^(design|develop|build|create|propose|plan|invent|compose|devise|formulate|draft|outline|sketch|produce|generate|put together|bumuo|lumikha|magdisenyo|magplano|magmungkahi)\b[^?]*\b(system|app|application|website|device|program|plan|proposal|game|solution|campaign|project|story|poem|haiku|essay|song|lesson|questionnaire|survey|policy|rules|network|database|prototype|architecture|feature|poster|logo|script|layout|model|dashboard|sistema|programa|plano|disenyo|tula|kuwento|sanaysay|dula)\b/i),
    K("Evaluating","Asks for a judgment (justify, defend, recommend, decide, verdict…)",
      /\b(justify|defend|recommend(ation)?|decide (whether|if)|verdict|your (judgment|judgement|stand|position)|take (a|your) (clear )?stand|taking a clear stand|conclude which|can be trusted|is it worth|worth (it|the cost)|pangatwiranan|patunayan|paninindigan|mas (mainam|mabuti|angkop)|makatwiran ba|sang-ayon ka ba)\b|\bwhich\b[^?.]*\byou would (buy|choose|use|approve|pick|recommend|adopt|fund)\b|\b(stronger|weaker|better|best|fairer|more (appropriate|effective|reliable|realistic)) of the (two|three|options|proposals)\b/i),
    K("Analyzing","Looks for errors, flaws, causes or what went wrong",
      /\b(what is wrong|what went wrong|errors?|bugs?|mistakes?|flaws?|fallac(y|ies)|root cause|cause of|causes? (the|of)|step[^?.]{0,40}\b(invalid|wrong|mistake|error)|(invalid|incorrect|wrong) step|kung bakit mali|sanhi ng|not supported by)\b/i, /\b(difference between|what is an?\b|meaning of|explain what|is called|are called|the term)\b|_{2,}|^(describe|summarize|summarise|explain|list|discuss|enumerate) the (main )?causes? of\b/i),
    K("Analyzing","Examines code output, data patterns or relationships",
      /\b(output of (the|this|following|given)|what (is|will be|gets) printed|(identify|determine|describe|find|analy[sz]e) the relationship between|relationship between[^?.]*\b(in|shown|given|from|based on) (the|this)\b|pattern (shown|in the)|what drives|dependent variable|independent variable|different (number of rows|outputs?|results?)|return a different|produce different|inferred|infer)\b/i),
    K("Analyzing","Asks why a program, query or result behaves as it does",
      /\bwhy (does|do|did|the (given|two|following))\b[^?.]{0,30}\b(program|code|query|queries|loop|function|service|web page|page|parser|documents?|results?|outputs?|two students|students get|answers? differ)\b/i),
    K("Applying","Asks you to compute or give a computed answer",
      /\b(compute|calculate|give the (answer|result|gcd|lcm|value|total)|state the result|then give|showing the (conversion|solution|computation)|how many|how much|value of [a-z]\s*(\?|if|when|given|after|,|$)|probability of (drawing|getting|rolling|picking|choosing)|number of (subsets|edges|ways|handshakes|combinations|permutations|hosts)|factorial|\d+\s*!|halaga ng (\d|[a-z]\b(?!\w))|ilang paraan)\b|\b(when|if) [a-z] ?= ?-?\d/i),
    K("Understanding","Asks for an explanation in your own words or the best explanation",
      /\b(in your own words|best (explanation|describes|explains|summarizes|summarises)|gives the best explanation|main (idea|purpose)|sa sariling salita)\b/i),
    K("Remembering","Asks for a name, symbol, definition or what an acronym stands for",
      /\b(stands? for|full (form|meaning)|give the definition|definition of [^?.]* as (given|stated)|correct (symbol|tag|term|name|keyword|command)|name of the)\b/i),
  ];
  function construct(text){
    const t=String(text||"").trim();
    for(const r of READER){ if(r.rx.test(t) && !(r.not && r.not.test(t))) return {level:r.level, name:r.name}; }
    return null;
  }
  function patterns(text){ const t=String(text||"").trim(); return PATTERNS.filter(p=>p.rx.test(t)); }
  function words(text){
    return String(text||"").toLowerCase()
      .replace(/_{2,}/g," blankslot ").replace(/[0-9]+(\.[0-9]+)?/g," 0 ")
      .replace(/[^a-z0-9'?]+/g," ").replace(/\?/g," ? ")
      .split(/\s+/).filter(Boolean);
  }
  function features(text){
    const raw=String(text||""), w=words(raw), f=new Map();
    const add=(k,v=1)=>f.set(k,(f.get(k)||0)+v);
    const content=w.filter(t=>!STOP.has(t));
    content.forEach(t=>add("w:"+t));
    for(let i=0;i<w.length-1;i++) add("b:"+w[i]+"_"+w[i+1]);
    // how the question opens carries a lot of signal ("what is", "how many", "design a")
    if(w[0]) add("s1:"+w[0],2);
    if(w[1]) add("s2:"+w[0]+"_"+w[1],2);
    if(w[2]) add("s3:"+w[0]+"_"+w[1]+"_"+w[2],1);
    const nums=(raw.match(/\d/g)||[]).length;
    if(nums) add("x:has_numbers"); if(nums>3) add("x:many_numbers");
    if(/[=;{}\[\]<>]|\w\(|print|console\.|printf/.test(raw)) add("x:code");
    if(/\?\s*$/.test(raw)) add("x:question_mark");
    const n=w.length; add(n<8?"x:short":n<18?"x:medium":n<30?"x:long":"x:very_long");
    if(/\b(justify|defend|support your|explain why|why)\b/i.test(raw)) add("x:reasoning_ask");
    for(const p of patterns(raw)) add("p:"+p.id, 2.5);
    const k=construct(raw); if(k) add("k:"+k.level, 4);
    // normalise to unit length so long questions don't dominate
    let norm=0; f.forEach(v=>norm+=v*v); norm=Math.sqrt(norm)||1;
    f.forEach((v,k)=>f.set(k,v/norm));
    return f;
  }
  function train(examples, opts={}){
    const K=LEVELS.length, epochs=opts.epochs||60, lr0=opts.lr||0.5, l2=opts.l2??1e-4;
    const data=examples.filter(e=>LEVELS.includes(e.level)).map(e=>({f:features(e.text),y:LEVELS.indexOf(e.level),w:e.weight||1}));
    const W=new Map(); const bias=new Float64Array(K);
    const row=k=>{ let r=W.get(k); if(!r){ r=new Float64Array(K); W.set(k,r);} return r; };
    let seed=opts.seed||7; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    const idx=data.map((_,i)=>i);
    for(let ep=0;ep<epochs;ep++){
      for(let i=idx.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]]; }
      const lr=lr0/(1+ep*0.1);
      for(const i of idx){
        const {f,y,w}=data[i]; const s=Float64Array.from(bias);
        f.forEach((v,k)=>{ const r=W.get(k); if(r) for(let c=0;c<K;c++) s[c]+=r[c]*v; });
        const m=Math.max(...s); let z=0; for(let c=0;c<K;c++){ s[c]=Math.exp(s[c]-m); z+=s[c]; }
        for(let c=0;c<K;c++){
          const g=(s[c]/z-(c===y?1:0))*w;
          bias[c]-=lr*g;
          f.forEach((v,k)=>{ const r=row(k); r[c]-=lr*(g*v + l2*r[c]); });
        }
      }
    }
    const weights={}; W.forEach((r,k)=>{ if(r.some(x=>Math.abs(x)>1e-4)) weights[k]=Array.from(r,x=>Math.round(x*1e4)/1e4); });
    return {version:1, levels:LEVELS, bias:Array.from(bias,x=>Math.round(x*1e4)/1e4), weights, trainedOn:data.length, trainedAt:new Date().toISOString()};
  }
  function predict(model, text){
    const K=model.levels.length, s=model.bias.slice();
    const f=features(text), contrib=[];
    f.forEach((v,k)=>{ const r=model.weights[k]; if(r){ for(let c=0;c<K;c++) s[c]+=r[c]*v; contrib.push([k,r,v]); } });
    const m=Math.max(...s); let z=0; const p=s.map(x=>{ const e=Math.exp(x-m); z+=e; return e; }).map(e=>e/z);
    let best=p.indexOf(Math.max(...p)), overridden=false;
    // the construction reader is very precise when it fires, so it has the final say
    const kc=construct(text);
    if(kc && model.levels[best]!==kc.level){ best=model.levels.indexOf(kc.level); overridden=true; }
    // top words that pushed toward the chosen level, for explanation
    const NICE={"x:reasoning_ask":"asks for reasons","x:code":"code","w:blankslot":"fill-in blank","x:has_numbers":"numbers","x:many_numbers":"numbers"};
    const SKIP=/^(p:|k:|x:(short|medium|long|very_long|question_mark)|[a-z0-9]+:(the|is|are|a|an|of|which|what|to|in|it|this|that|0)$)/;
    const seen=new Set(), why=[];
    contrib.map(([k,r,v])=>[k,r[best]*v]).filter(([,x])=>x>0).sort((a,b)=>b[1]-a[1]).forEach(([k])=>{
      if(why.length>=3||SKIP.test(k)) return;
      const t=NICE[k]||k.replace(/^[a-z0-9]+:/,"").replace(/_/g," ").replace(/\bblankslot\b/g,"____").replace(/\b0\b/g,"#");
      if(!/[a-z]/.test(t) && t!=="____") return;
      const ws=t.split(" "), EDGE=/^(of|the|and|for|a|an|is|it|to|in|on|#|are|be|by|with|that|this|which|what|when|or)$/;
      if(ws.length>1 && (EDGE.test(ws[0])||EDGE.test(ws[ws.length-1]))) return;
      if(ws.length===1 && (STOP.has(t)||EDGE.test(t))) return;
      if(t && !seen.has(t) && ![...seen].some(x=>x.includes(t)||t.includes(x))){ seen.add(t); why.push(t); }
    });
    const pats=patterns(text), agree=pats.filter(x=>x.level===model.levels[best]), k=kc;
    return {level:model.levels[best], confidence: overridden ? Math.max(0.75,p[best]) : (kc ? Math.max(p[best],0.85) : p[best]), overridden, probs:Object.fromEntries(model.levels.map((l,i)=>[l,p[i]])), why, pattern: (k&&k.level===model.levels[best]) ? k.name : (agree[0]?agree[0].name:null), construction: k, patterns:pats.map(x=>({level:x.level,name:x.name}))};
  }
  return {LEVELS, PATTERNS, patterns, construct, features, train, predict};
})();
if(typeof module!=="undefined") module.exports=BloomAI;
