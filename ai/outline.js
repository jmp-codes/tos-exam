/* Outline v1 — reads slide decks and outlines (a title, then bullets) into concepts, groups and lists,
   then writes questions whose answer keys come straight from that structure.
   Why a separate reader: slides are not sentences. A bullet under "Capability-Based Planning" that says
   "Focuses on what the organization needs to achieve" is a fact about the slide's title, a line like
   "Initial – ad hoc, reactive" is one member of a list, and "Strengths"/"Weaknesses" sort the lines under them.
   Every question here is built from one of those facts, and every wrong choice is checked against the
   right answer's own facts so it cannot also be true. */
const Outline = (() => {
  const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
  const clean = s => String(s||"").replace(/\s+/g," ").replace(/\.(["”’])$/,"$1").replace(/^[\s,;:•▸-]+|[\s,;:.]+$/g,"").trim();
  const lc1 = s => { s=String(s||""); const w=s.split(" ")[0]||""; return /^[A-Z0-9]{2,}|^[A-Z][a-z]*[A-Z]|^[A-Z]\.|^I$/.test(w) || /^(John|U\.S|US|The Open Group|Department)\b/.test(s) ? s : s.charAt(0).toLowerCase()+s.slice(1); };
  const words = s => String(s).split(/\s+/).filter(Boolean);
  function rng(seed){ let s=seed||11; return ()=>{ s=(s*16807)%2147483647; return s/2147483647; }; }
  function shuffle(a,r){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  /* ---------------- words ---------------- */
  const VERB = new Set(("focus define map enable promote support help assess ensure provide show represent include reduce improve encourage identify highlight aid facilitate apply emphasize consider lack guide aim offer cover recognize combine require expand range act balance translate link bridge prepare adapt evaluate allow use integrate connect manage store visualize model document prevent deliver capture describe specify measure retain pool maximize minimize organize classify separate divide create design build develop implement govern plan align track monitor control detect exchange send receive request respond listen share handle process transform convert deploy run execute test scale secure protect enhance increase decrease lower speed simplify standardize optimize coordinate communicate interact depend flow travel ripple follow operate interface function work serve contain hold consist involve address solve analyze compare select choose determine establish maintain update extend complete deal explain illustrate outline present list record report check validate verify approve authorize fix isolate modify evolve change grow move break stall slow cause lead result affect influence drive benefit cost need want make give get take keep set put let see find tie embed become remain stay look seem appear tailor collect gather rely exist perform package reuse adopt disband freely treat accept reject grant deny encrypt compress authenticate schedule allocate assign cache replicate synchronize restore block filter route forward invoke expose publish subscribe queue mediate hide split join calculate compute display print read write return save load transfer carry learn teach study explore prioritize assist decide recommend stand".split(" ")));
  const NOUNISH = /^(design|plan|map|model|document|use|need|work|test|control|support|link|share|set|run|function|interface|cost|order|structure|focus|result|change|process|request|record|report|list|guide|benefit|balance|flow|range|scale|drive|aim|act|lead|cause|deal|display|exchange|schedule|queue|filter|block|return|transfer|study|package|standard|group)$/i;
  const NOUN_NEXT = /^(approach|approaches|process|processes|pattern|patterns|model|models|method|methods|framework|frameworks|system|systems|element|elements|of|for|level|layer|document|documents|tool|tools|phase|practice|principle|principles|decision|decisions|support|management|planning|flow|flows|map|maps|diagram|diagrams|graph|graphs)$/i;
  const LEMMA_X = {focuses:"focus",processes:"process",addresses:"address",accesses:"access",does:"do",has:"have",is:"be",goes:"go",biases:"bias"};
  function lemma(w){ const l=w.toLowerCase(); if(LEMMA_X[l]) return LEMMA_X[l]; if(/ies$/.test(l)) return l.slice(0,-3)+"y"; if(/(ches|shes|xes|sses|zzes)$/.test(l)) return l.slice(0,-2); if(/[^s]s$/.test(l)) return l.slice(0,-1); return l; }
  const isVerb3 = w => /[^s]s$/i.test(w) && VERB.has(lemma(w)) || /^(processes|addresses|accesses|focuses|passes|crosses|discusses)$/i.test(w);
  const isBase = w => VERB.has(String(w).toLowerCase());
  function third(v){ const l=v.toLowerCase(); if(l==="have") return "has"; if(l==="be") return "is"; if(l==="do") return "does"; if(l==="go") return "goes"; if(/(s|sh|ch|x|z|o)$/.test(l)) return l+"es"; if(/[^aeiou]y$/.test(l)) return l.slice(0,-1)+"ies"; return l+"s"; }
  // make the verb(s) at the start of a verb phrase agree: "Show modular structure" → "shows modular structure"
  function agree(vp, plural){ const w=words(vp); if(!w.length) return vp; if(/^(can|may|might|must|will|should|could|cannot)$/i.test(w[0])) return lc1(vp);
    const fix=x=>{ const lo=x.toLowerCase(); if(plural) return isVerb3(lo)?lemma(lo):lo; return isBase(lo)?third(lo):lo; };
    const was3=isVerb3(w[0]), v0=isVerb3(w[0])||isBase(w[0]); w[0]=fix(w[0]);
    for(let i=0;i<w.length-1;i++){ const nx=w[i+1]; if(!(isBase(nx)||isVerb3(nx))) continue; if(/[,.;]$/.test(nx) || i!==1 && PREP.test(w[i+2]||"")) continue; if(i!==1 && (i+2>=w.length || !v0 && NOUN_NEXT.test(w[i+2]||""))) continue;
      if(/^(and|or)$/i.test(w[i]) && i===1 && v0 || v0 && /,$/.test(w[i]) && isVerb3(nx)===was3 || v0 && /^(and|or)$/i.test(w[i]) && /,$/.test(w[i-1]||"") && isVerb3(nx)===was3) w[i+1]=fix(nx); }
    return w.join(" "); }
  function toBase(vp){ const w=words(vp); if(!w.length) return vp; const f=w[0].toLowerCase(); const was3=isVerb3(f); w[0]=was3?lemma(f):f; if(!was3) return w.join(" ");
    for(let i=0;i<w.length-1;i++){ const nx=w[i+1]; if(!isVerb3(nx) || i+2>=w.length || /[,.;]$/.test(nx) || PREP.test(w[i+2])) continue; if(/^(and|or)$/i.test(w[i]) || /,$/.test(w[i])) w[i+1]=lemma(nx); } return w.join(" "); }
  const ADJ = /^(highly|widely|well|most|more|less|easier|easy|best|often|sometimes|initially|mainly|essential|useful|critical|vital|crucial|important|necessary|suitable|strong|flexible|scalable|reactive|ad|hoc|complex|modular|applicable|adaptable|specialized|tailored|focused|used|designed|developed|created|governed|known|based|documented|measured|controlled|consistent|customizable|comprehensive|detailed|clear|heavy|resource-heavy|overly|fully|too|very|not|limited|defense-focused|well-defined|accepted|expensive|costly|slow|fast|rigid|simple|difficult|hard|bureaucratic|prescriptive|aligned|standardized|centralized|decentralized|independent|interoperable|reusable|maintainable|secure|reliable|efficient|effective|lightweight|large|small|common|cyclical|iterative|adaptive|structured|holistic|interconnected|and|or|,)$/i;
  const ADJ2 = /^(central|technical|federal|digital|critical|global|local|modular|cyclical|structural|operational|organizational|functional|logical|physical|internal|external|general|special|typical|practical|natural|additional|conventional|traditional|international|national|regional|essential|efficient|consistent|independent|different|dependent|relevant|significant|important|evident|resilient|coherent|transparent|redundant|agile|robust|stable|mature|secure|flexible|simple|complex|rigid|diverse|large|small|heavy|clear|major|minor|primary|secondary|necessary|ordinary|temporary|voluntary|arbitrary)$/i;
  const isAdjWord = w => ADJ.test(w) || ADJ2.test(w) || /^[a-z-]+(ed|able|ible|ive|ic|ful|ous|less|ly)$/i.test(w) && !/^(need|speed|feed|seed|bed|red|public|topic|logic|traffic|music|graphic|metric|basic)$/i.test(w) || /-(based|driven|centric|focused|heavy|level|wide|oriented|intensive|specific|ready|friendly)$/i.test(w);
  const PREP = /^(to|for|of|in|on|at|by|with|without|from|across|around|between|among|within|into|over|under|as|about|through|outside|than)$/i;
  /* what shape a bullet has: vp (verb phrase), np (noun phrase), adj, ger (-ing phrase), clause (own subject), question, neg */
  function formOf(t){ t=clean(t); const w=words(t); if(!w.length) return "np"; const f=w[0].replace(/[^A-Za-z-]/g,""), lo=f.toLowerCase();
    if(/\?$/.test(t)) return "question";
    if(/^not$/i.test(lo) && /^(an?|the)$/i.test(w[1]||"")) return "neg";
    if(/^(can|may|might|must|will|should|could|cannot)$/i.test(lo)) return "vp";
    if(isBase(lo) && !/^(set|use)$/i.test(lo) && !/^[A-Z]{2,}/.test(f)){ if(NOUNISH.test(lo) && NOUN_NEXT.test(w[1]||"")) return "np"; if(/^(data|process|change|flow|work|order|cost|focus)$/i.test(lo) && isVerb3(w[1]||"")) return "clause"; return "vp"; }
    if(isVerb3(lo) && !/^[A-Z]{2,}/.test(f) && !/,$/.test(w[0])){ if(/^\w+s and \w+s (\w+)$/i.test(t) && isBase(w[w.length-1])) return "clause"; if(/^(in|of|between|from|within|among)$/i.test(w[1]||"") && w.slice(2).some(x=>isBase(x))) return "clause"; return "vp"; }
    if(/^[a-z]{3,}ing$/i.test(lo)){ const st=lo.slice(0,-3); if([st, st+"e", st.replace(/(.)\1$/,"$1")].some(v=>VERB.has(v))) return "ger"; }
    // a verb after the subject → a clause ("Each service performs …", "Systems can connect", "Components act as equals")
    for(let i=1;i<Math.min(w.length,6);i++){ const x=w[i].replace(/[^A-Za-z-]/g,"").toLowerCase(); let prev=w[i-1]; if(/ly$/i.test(prev) && i>=2) prev=w[i-2]; if(!x) continue; if(/^(that|which|who|where|whose|when)$/i.test(x)) break; if(/[,:;(]$/.test(prev)||/^\(/.test(w[i])) break; if(/^[+&→=]$/.test(prev)) break;
      if(/^(is|are|was|were|can|cannot|may|might|must|will|should|could|has|have|do|does)$/.test(x)) return "clause";
      if(isVerb3(x) && i<w.length-1 && !isAdjWord(prev) && !PREP.test(prev) && !/^(the|a|an|of)$/i.test(prev)) return "clause";
      if(isBase(x) && /s$/i.test(prev) && !isBase(prev) && !PREP.test(prev) && !isAdjWord(x)) return "clause";
      if(PREP.test(x)) break; }
    // adjectives up to the first preposition or comma → adj ("Easy to understand …", "Complex and resource-heavy to implement")
    const head=[]; for(const x of w){ const y=x.replace(/[^A-Za-z,-]/g,""); if(PREP.test(y)||/[,;:—–(]/.test(x)&&head.length){ if(/,$/.test(x)) head.push(y.replace(/,$/,"")); break; } head.push(y); }
    if(head.length && head.every(x=>!x||isAdjWord(x))) return "adj";
    return "np"; }
  const NP_DEF = /^(an?|the|one)\s|^(\w+[\s-]+){0,3}(system|approach|element|process|repository|technique|framework|method|model|scheme|set|collection|way|standard|practice|tool|language|matrix|taxonomy|schema|evolution|design|methodology|representation|view|structure|classification|map|diagram|plan|strategy|field|discipline|concept|principle|layer|component|service|platform|pattern|graph|style|type|kind|form|part|core|center|centre|foundation)\b/i;
  const headWord = np => { const w=[]; for(const x of words(np)){ if(PREP.test(x)||/[(,:;—–]/.test(x)){ if(/[,:;]$/.test(x)) w.push(x.replace(/[,:;]$/,"")); break; } w.push(x); } return (w[w.length-1]||"").toLowerCase(); };
  const pluralWord = w => /[^s]s$|ies$|ches$|xes$/i.test(w) && !/(ss|us|is|sis)$/i.test(w) && !/^(analysis|basis|status|process|business|access|success|class)$/i.test(w);
  function aNP(np){ np=lc1(clean(np)); if(/^(an?|the|one|some|all|each|no|two|three|four|five|six)\s/i.test(np)) return np; if(/^(most|best|first|last|only|core|central|main)\b/i.test(np)) return "the "+np; if(pluralWord(headWord(np))) return np;
    return ((/^(?:[aeiou]|hon|hour)/i.test(np) && !/^(uni|use|eu|one|user|usa)/i.test(np)) || /^(?:[FHLMNRSX][A-Z]|[AEIOU][A-Z])/.test(np) ? "an " : "a ")+np; }

  /* ---------------- concept names ---------------- */
  const COUNT_HEAD = /\b(layer|framework|method|phase|level|model|pattern|map|continuum|scorecard|diagram|system|engine|block|view|graph|matrix|standard|stage|step|tier|pillar|cycle|schema|scheme)$/i;
  const stripParen = s => String(s).replace(/\s*\([^)]*\)\s*/g," ").trim();
  // "1. Point -to-Point Integration" → "Point-to-Point Integration"
  const unnum = s => String(s||"").replace(/^\s*(?:\(?\d{1,2}[.)]|\(?[a-hA-H][.)](?=\s+[A-Z]))\s+/,"").replace(/(\w)\s+([-–])(?=\w)/g,"$1$2").replace(/(\w)([-–])\s+(?=[a-z])/g,"$1$2");
  const lcWords = s => String(s||"").split(" ").map(w=>/^[A-Z][a-z]+$/.test(w)?w.toLowerCase():w).join(" ");
  function singularKey(s){ const w=s.split(" "); const l=w[w.length-1]; if(pluralWord(l) && l.length>3) w[w.length-1]=l.replace(/ies$/,"y").replace(/(ches|shes|xes)$/,m=>m.slice(0,-2)).replace(/([^s])s$/,"$1"); return w.join(" "); }
  const keyOf = s => singularKey(stripParen(String(s)).toLowerCase().replace(/^(the|an?)\s+/,"").replace(/[“”"']/g,"").replace(/\s*&\s*/g," and ").replace(/[^a-z0-9\s\/-]/g," ").replace(/\s+/g," ").trim());
  const nameLike = s => { s=clean(s); const w=words(s); if(!w.length||w.length>7) return false; if(w.length===2 && /^[a-z]/.test(w[1]) && (isAdjWord(w[0])||/ly$/i.test(w[0]))) return false; if(!/^[A-Z0-9]/.test(s)) return false; if(/^(the|a|an)\s/i.test(s)) return true; const caps=w.filter(x=>/^[A-Z0-9(]/.test(x)).length; return caps>=Math.ceil(w.filter(x=>!/^(of|and|the|in|for|to|a|an|on|with|&|–|-|—)$/i.test(x)).length*0.6) || w.length<=2 && !isBase(w[0].toLowerCase()) && !isVerb3(w[0].toLowerCase()) && !/^(some|many|all|each|most|more|less|no|not|one|two|this|these|those|they|it)$/i.test(w[0]); };
  const ATTR_LABEL = /^(purpose|goal|goals|aim|aims|focus|structure|used for|uses|developed by|created by|example|examples|result|results|outcome|outcomes|note|notes|content|definition|meaning|key idea|summary|source|remember|tip|important|answer|question|reason|problem|solution|input|output|date)$/i;

  /* ---------------- reading ---------------- */
  function looksOutline(text){ const L=String(text||"").split("\n").map(x=>x.trim()).filter(Boolean); if(L.length<12) return false;
    const short=L.filter(x=>words(x).length<=18).length, blocks=String(text).split(/\n\s*\n/).filter(b=>b.trim().split("\n").length>=2).length;
    return short/L.length>=0.8 && blocks>=3; }

  let CURB="";
  function read(text){
    const K={concepts:new Map(), list:[], groups:[], examples:[], seqs:[], facts:[], text:String(text||"")};
    const find=(name)=>{ if(!name) return null; const k=keyOf(name); if(!k) return null; if(K.concepts.has(k)) return K.concepts.get(k);
      for(const c of K.list) if(c.keys.has(k)) return c;
      { const pm=String(name).match(/^(.+?)\s*\(([^)]+)\)\s*$/); if(pm){ for(const part of [pm[2],pm[1]]){ const k2=keyOf(part); if(K.concepts.has(k2)) return K.concepts.get(k2); } } }
      // "Frameworks" → the one general "Architectural Framework"; "Component Mapping" → "Component Interaction Mapping"
      const kw=k.split(" "); const cand=K.list.filter(c=>[...c.keys].some(ck=>{ const cw=ck.split(" "); if(kw.length===1) return cw.length>1 && cw[cw.length-1]===kw[0]; if(kw.length>=2 && cw.length>kw.length && cw[0]===kw[0] && cw[cw.length-1]===kw[kw.length-1]) return kw.every(x=>cw.includes(x)); if(kw.length>=2 && kw.length===cw.length && kw.slice(0,-1).join(" ")===cw.slice(0,-1).join(" ") && /^(modeling|modelling|architecture|design)$/.test(kw[kw.length-1]) && /^(modeling|modelling|architecture|design)$/.test(cw[cw.length-1])) return true;
        if(kw.length>=2 && cw.length===kw.length+1 && cw.slice(1).join(" ")===kw.join(" ")) return true;
        if(kw.length>=1 && cw.length===kw.length+1 && cw.slice(0,-1).join(" ")===kw.join(" ") && /^(diagram|framework|model|method|layer|map|graph|view|pattern)$/.test(cw[cw.length-1])) return true; return false; }));
      if(kw.length===1){ const t1=cand.filter(c=>c.from==="title"); if(t1.length===1) return t1[0]; if(cand.length) return null; }
      if(cand.length===1) return cand[0]; if(kw.length===1){ const g=cand.filter(c=>!c.groups.length); if(g.length===1) return g[0]; }
      return null; };
    const concept=(name, from)=>{ name=unnum(clean(name)).replace(/\s*\((?:in|of|for)\s[^)]*\)\s*$/i,"").trim(); if(!name) return null; let c=find(name); if(c) { if(from==="title" && c.from!=="title"){ c.name=displayName(name,c); c.from="title"; } addKeys(c,name); return c; }
      c={name:"", keys:new Set(), from, abbr:"", expansion:"", def:[], does:[], traits:[], facts:[], purpose:[], focus:[], uses:[], benefits:[], challenges:[], strengths:[], weaknesses:[], applications:[], examples:[], creator:"", year:"", not:[], groups:[], partOf:[], results:[], src:[]};
      c.name=displayName(name,c); addKeys(c,name); K.list.push(c); return c; };
    function displayName(name,c){ const m=name.match(/^(.+?)\s*\(([^)]+)\)$/); if(m){ const a=clean(m[1]), b=clean(m[2]); if(/^[A-Z][A-Za-z]*[A-Z][A-Za-z]*$/.test(a) && words(b).length>=2){ c.abbr=a; c.expansion=c.expansion||b; return a; } if(/^[A-Z][A-Za-z]*[A-Z]+$/.test(b)){ c.abbr=b; return `${a} (${b})`; } } return name.replace(/^the\s+/i,"").trim(); }
    function addKeys(c,name){ const m=name.match(/^(.+?)\s*\(([^)]+)\)$/); c.keys.add(keyOf(name)); if(m){ c.keys.add(keyOf(m[1])); c.keys.add(keyOf(m[2])); } for(const k of c.keys) if(!K.concepts.has(k)) K.concepts.set(k,c); }
    const group=(o)=>{ const g={kind:null, noun:"", subject:null, members:[], desc:new Map(), ordered:false, src:"", ...o}; if(g.kind) g.kind=lcWords(g.kind); K.groups.push(g); return g; };
    const addMember=(g,name,desc,src)=>{ const c=concept(name,"member"); if(!c) return null; if(!g.members.includes(c)){ g.members.push(c); c.groups.push(g); } if(desc){ let d=clean(desc); const semi=d.split(/;\s*/); if(semi.length>1){ d=clean(semi[0]); attr(c,"facts",semi.slice(1).join("; "),src); } g.desc.set(c,{text:d,form:formOf(d),src}); } if(g.subject && g.subject!==c && !c.partOf.includes(g.subject)) c.partOf.push(g.subject); return c; };
    const attr=(c,field,t,src,extra)=>{ if(!c) return; t=clean(t).replace(/\s+→\s+/g, / from /i.test(t)?" to ":" → "); if(!t||t.length<3) return; { const dm=t.match(/^(?:defines?|refers?\s+to|means)\s+((?:an?|the)\s+.+)$/i); if(dm && (field==="does"||field==="def")){ field="def"; t=dm[1]; } } if(c[field].some(x=>x.text.toLowerCase()===t.toLowerCase())) return; c[field].push({text:t, form:formOf(t), src:src||t, slide:CURB, ...(extra||{})}); c.src.push(src||t); };

    // ---- split into slides/sections: first line = title; "▸ " marks indentation ----
    const blocks=[];
    for(const b of String(text||"").replace(/\r/g,"").split(/\n\s*\n/)){
      let lines=b.split("\n").map(x=>x.replace(/\(group shape\)/g,"").replace(/\s+$/,"")).filter(x=>x.trim());
      if(!lines.length) continue;
      lines=lines.map(x=>x.replace(/(\w)\s+-(?=\w)/g,"$1-")).map(x=>{ const m=x.match(/^((?:\s*▸\s*)*)(.*)$/); const lvl=(m[1].match(/▸/g)||[]).length || (/^\s{2,}/.test(x)?1:0); return {t:m[2].replace(/^\s*[-•▪◦●*]\s+/,"").replace(/\.$/,"").trim(), lvl}; }).filter(x=>x.t);
      for(let k=lines.length-2;k>=0;k--) if(/\b(to|and|or|of|the|a|an|from|for|with|in|on|by|as)$/i.test(lines[k].t) && /^[a-z]/.test(lines[k+1].t)){ lines[k].t+=" "+lines[k+1].t; lines.splice(k+1,1); }
      let title=lines.shift().t; const lines0title=title; const segs=title.split(/\s+—\s+/); if(segs.length>1) title=segs.filter(s=>!/^(topic|lesson|module|unit|chapter|part)\s*\d+$|^prepared by|^presented by/i.test(s.trim())).pop()||segs[segs.length-1];
      blocks.push({title:title.replace(/[.:]$/,"").trim(), rawTitle:lines0title, lines});
    }
    const SKIP=/^(topics?|topic overview|overview|agenda|outline|learning objectives?|objectives?|learning outcomes?|key takeaways?|takeaways|summary|recap|review|end of|thank you|thanks|presented by|prepared by|references?|bibliography|activity|quiz|exercise|reflection|questions?|discussion|lesson \d+|topic \d+|module \d+)\b/i;
    const later=[]; let TOPIC="";
    for(const B of blocks){ if(/^topic\s*\d+\s*[—–-]/i.test(B.rawTitle||"")) TOPIC=B.title;
      if(SKIP.test(B.title) || !B.lines.length) continue;
      if(B.lines.every(x=>/^(topic|lesson|module|unit|chapter|part)\s*\d+$/i.test(x.t))){ TOPIC=B.title; continue; }
      if(B.lines.some(x=>/^(presented by|prepared by|instructor|professor|lecturer)\b|^(lesson|module|unit|chapter)\s*\d+$/i.test(x.t)) && B.lines.length<=8) continue;
      if(/^(case example|example|case study|sample)\b/i.test(B.title) || B.lines.some(x=>/\s\|\s/.test(x.t))){ later.push(B); continue; }
      readBlock(B);
    }
    for(const B of later) readLater(B);
    // plain facts that name a known concept: "EA translates business strategy into IT architecture"
    K.list=K.list.filter(c=>c.name && words(c.name).length<=8);
    K.list.forEach(c=>{ if(!c.abbr && c.expansion && /^[A-Z][A-Za-z]*[A-Z]$/.test(c.name)) c.abbr=c.name; });
    return K;

    /* ---- one slide ---- */
    function readBlock(B){ CURB=B.title;
      let t=B.title.replace(/^\d+[.)]\s*/,"").replace(/\?$/,"").trim(); let mode="concept", subj=null, g=null;
      let m;
      if((m=t.match(/^(.+?)\s*[-–—]\s*strengths?\s*(?:&|and)\s*weakness(?:es)?$/i))){ subj=concept(m[1],"title"); mode="concept"; }
      else { t=t.replace(/^(?:introduction|intro)\s*(?:to\s+|[-–—:]\s*)/i,"");
        if((m=t.match(/^what\s+(?:is|are)\s+(an?\s+|the\s+)?(.+)$/i))){ subj=concept(m[2],"title"); if(m[1] && /^an?\s/i.test(m[1]) && subj && !/^[A-Z]{2,}|[A-Z][a-z]*[A-Z]/.test(m[2].split(" ")[0]) && !/\(/.test(m[2])) subj.art=m[1].trim().toLowerCase(); }
        else if((m=t.match(/^why\s+(?:use\s+|using\s+)?(.+?)(?:\s+(?:matters?|is needed|are needed|is important|are important|is used)(?:\s+in\s+.+)?)?$/i))){ if(/^(these|this|those|they|it|we)\b/i.test(m[1])) return; subj=concept(m[1],"title"); mode="benefits"; }
        else if((m=t.match(/^(?:the\s+)?(?:key\s+|main\s+)?(benefits|advantages|importance|value)\s+of\s+(?:using\s+|adopting\s+)?(.+)$/i))){ subj=concept(m[2],"title"); mode="benefits"; if(B.lines.filter(x=>glossary(x.t)).length>=2){ g=group({kind:`benefit of ${lc1(subj.name)}`, noun:"benefit", subject:subj, role:"benefit", src:B.title}); mode="group"; } }
        else if((m=t.match(/^(?:the\s+)?(?:key\s+|main\s+)?(goals?|purposes?|aims?|objectives)\s+of\s+(.+)$/i))){ subj=find(m[2])||find(m[2].split(" ").slice(0,-1).join(" "))||concept(m[2],"title"); mode="goals"; B.about=keyOf(m[2])!==keyOf(subj.name)&&!subj.keys.has(keyOf(m[2]))?m[2]:""; }
        else if((m=t.match(/^(?:the\s+)?(?:common\s+|key\s+|main\s+|major\s+)?(challenges|problems|issues|disadvantages|limitations|risks|drawbacks|pitfalls)\s+(?:of|in|with|for|when)\s+(?:the\s+|an?\s+)?(.+)$/i))){ subj=concept(m[2],"title"); mode="challenges"; if(B.lines.filter(x=>glossary(x.t)).length>=2){ g=group({kind:`challenge ${/^in$/i.test(t.match(/\s(of|in|with|for|when)\s/i)?.[1]||"")?"in":"of"} ${lc1(subj.name)}`, noun:"challenge", subject:subj, role:"challenge", src:B.title}); mode="group"; } }
        else if((m=t.match(/^(?:the\s+)?(?:real[- ]world\s+)?applications?(?:\s+(?:and|&)\s+examples?)?(?:\s+of\s+(.+))?$/i))){ subj=m[1]?concept(m[1],"title"):(TOPIC?find(TOPIC.replace(/\s*\([^)]*\)/,"")):null); if(!m[1] && subj) m[1]=subj.name; g=group({kind:m[1]?`application area of ${m[1]}`:"real-world application", noun:"application", subject:subj, role:"application", src:B.title}); mode="group"; }
        else if((m=t.match(/^(?:the\s+)?examples?\s+of\s+(.+)$/i))){ subj=concept(m[1],"title"); mode="examples"; }
        else if((m=t.match(/^(?:the\s+)?(.+?)\s+(phases|steps|stages)(?:\s+overview)?$/i)) || (m=t.match(/^(?:the\s+)?(phases|steps|stages)\s+(?:of|in)\s+(?:the\s+)?(.+)$/i))){ const sname=/^(phases|steps|stages)$/i.test(m[1])?m[2]:m[1], noun=/^(phases|steps|stages)$/i.test(m[1])?m[1]:m[2]; subj=concept(sname,"title"); g=group({kind:`${sname.replace(/^the\s+/i,"")} ${noun.toLowerCase().replace(/s$/,"")}`, short:sname.replace(/^the\s+/i,""), noun:noun.toLowerCase().replace(/s$/,""), subject:subj, ordered:true, src:B.title}); mode="group"; }
        else if((m=t.match(/^(?:the\s+)?(?:(common|typical|core|key|main|basic|major)\s+)?(types|kinds|levels|layers|components|elements|methods|patterns|tools|principles|models|techniques|categories|criteria|deliverables|features|parts|pillars|tiers|forms|approaches|standards)\s+(of|in|for)\s+(?:the\s+)?(.+)$/i))){ const noun=singularKey(m[2].toLowerCase()).replace(/criterium$/,"criterion").replace(/criteria$/,"criterion"); const s=m[4];
          subj=find(s)||(/^[A-Z]/.test(s)&&nameLike(s)&&!/^\w+ing\b/i.test(s)&&!/^(interaction|mapping|alignment|enterprise systems?)$/i.test(s)?concept(s,"title"):null);
          const sL=s.split(" ").map(w=>/^[A-Z][a-z]+$/.test(w)?w.toLowerCase():w).join(" "); const kind=/^(types|kinds|levels|categories|forms)$/i.test(m[2])?`${noun} of ${s}`:/^in$/i.test(m[3])&&/^(deliverables)$/i.test(m[2])?noun:`${m[1]&&/^core$/i.test(m[1])?"core ":""}${noun} ${m[3].toLowerCase()} ${sL}`;
          g=group({kind, noun, subject:subj, src:B.title, memberNoun:/^(types|kinds)$/i.test(m[2])?s:""}); mode="group"; }
        else if((m=t.match(/^(common|typical|core|key|main|major|popular|standard)\s+(.+s)$/i))){ g=group({kind:singularKey(lc1(m[2])), noun:singularKey(m[2].toLowerCase().split(" ").pop()), src:B.title}); mode="group"; }
        else if(/^[A-Z][\w-]*(\s+[A-Z&][\w-]*){0,3}$/.test(t) && pluralWord(t.split(" ").pop()) && !/(ss|us|is)$/i.test(t) && B.lines.filter(x=>glossary(x.t)).length>=2 && B.lines.filter(x=>glossary(x.t)).length>=B.lines.length*0.6){ g=group({kind:singularKey(lcWords(t)), noun:singularKey(t.split(" ").pop().toLowerCase()), src:B.title}); mode="group"; }
        else if((m=t.match(/^(.+?)\s+criteria$/i))){ g=group({kind:`${lc1(m[1])} criterion`, noun:"criterion", src:B.title, role:"criterion"}); mode="group"; }
        else if((m=t.match(/^(?:the\s+)?role\s+of\s+(.+?)(?:\s+in\s+.+)?$/i))){ subj=concept(m[1],"title"); }
        else if((m=t.match(/^(.+?)\s+as\s+an?\s+.+$/i))){ subj=concept(m[1],"title"); }
        else if(/:/.test(t) || /\b(concepts|foundations|fundamentals|basics|overview|approach)$/i.test(t)){ mode="misc"; }
        else { const t2=t.replace(/\s+in\s+(?:the\s+)?[A-Z][\w\s&-]*$/,"").replace(/\s*\((?:in|of|for)\s[^)]*\)$/i,""); subj=concept(t2||t,"title"); }
      }
      if(subj) subj.src.push(B.title);
      const lines=B.lines;
      for(let i=0;i<lines.length;i++){
        const L=lines[i]; let x=L.t;
        // repeated labels on a diagram ("Business Layer" under the layer list)
        if(g && g.members.some(c=>keyOf(c.name)===keyOf(x))) continue;
        const lab=labelOf(x);
        if(lab){ const kids=children(lines,i,lab); i+=kids.length; if(lab.first) kids.unshift({t:lab.first,lvl:L.lvl+1}); handleLabel(lab,kids,subj,g,B); continue; }
        handleLine(x,subj,mode,g,B);
      }
      if(g && g.members.length<2){ g.dead=true; }
      if(g && g.ordered && !g.memberNoun && g.noun) g.memberNoun=g.noun;
      if(g && g.noun && g.members.some(c=>keyOf(c.name)===keyOf(g.noun))) g.kind=null;
      if(g && g.kind && g.subject && / for mapping$/.test(g.kind)) g.kind=g.kind.replace(/ for mapping$/," for "+lcWords(g.subject.name));
    }
    function glossary(x){ x=unnum(x); const m=x.match(/^([^:]{1,60}?)\s*(?:\(([^)]{2,60})\))?\s*(?::|\s[–—-]\s)\s*(.{2,})$/); if(!m) return null; let term=clean(m[1]); if(m[2]) term=`${term} (${m[2]})`;
      const pre=x.slice(0,x.indexOf(m[3])); if(/:/.test(m[3]) && /\s[–—]\s/.test(m[1]+" ")) {}
      if(ATTR_LABEL.test(clean(m[1]))) return null; if(!nameLike(clean(m[1])) && !/^\d{3,}/.test(m[1])) return null; if(/^(in|when|if|for|with|without|because|to)\s/i.test(m[1])) return null;
      // "Phase A – Vision: Define scope" → term "Phase A – Vision"
      const pv=x.match(/^((?:phase|step|stage|level|tier)\s+\w+\s*[–—-]\s*[^:]{2,40}):\s*(.+)$/i); if(pv) return {term:clean(pv[1]), desc:clean(pv[2])};
      return {term, desc:clean(m[3])}; }
    function labelOf(x){ let m;
      if((m=x.match(/^(strengths?|weakness(?:es)?|benefits|advantages|disadvantages|limitations|pros|cons)(?:\s*:|\s+[–—-]\s+|$)\s*(.*)$/i))) return {type:/^(strength|benefit|advantage|pro)/i.test(m[1])?"strengths":"weaknesses", first:clean(m[2])||null};
      if((m=x.match(/^(?:key\s+)?(benefits|advantages)\s+of\s+(.+?):?$/i))) return {type:"benefits", about:m[2]};
      if((m=x.match(/^(?:key\s+)?features\s+of\s+(.+?):?$/i)) || (m=x.match(/^(.+?)\s+enhancements:?$/i))) return {type:"traits", about:m[1]};
      if((m=x.match(/^applications?(?:\s*(?:&|and)\s*suitability)?(?:\s+of\s+(.+?))?:?$/i))) return {type:"applications", about:m[1]};
      if(!/:$/.test(x)) return null;
      const t=x.replace(/:$/,"").trim();
      if((m=t.match(/^([A-Za-z ]{2,20}?)\s*:\s*/)) && ATTR_LABEL.test(m[1].trim())) return {type:"skip"};
      if((m=t.match(/^levels(?:\s+of\s+(.+))?$/i))) return {type:"group", noun:"level", of:m[1]||"", ordered:/maturity|capability/i.test(m[1]||"")};
      if((m=t.match(/^(types|kinds|phases|steps|stages|components|parts|layers|elements|categories)(?:\s+of\s+(.+))?$/i))) return {type:"group", noun:singularKey(m[1].toLowerCase()), of:m[2]||"", ordered:/^(phases|steps|stages)$/i.test(m[1])};
      if(/^(includes?|consists of|contains|comprises|made up of)$/i.test(t)) return {type:"group", noun:"part", include:true};
      if((m=t.match(/^(.+?)\s+(helps?|is used|are used|aims?|allows?|enables?)\s+(?:to|us to|organizations to)$/i))) return {type:"vp", about:m[1], verb:m[2]};
      if((m=t.match(/^(.+?)\s+(?:with\s+)?(?:a\s+)?(?:stronger\s+|strong\s+|main\s+|heavy\s+)?focus\s+on$/i)) || (m=t.match(/^(.+?\s(?:on|of|with|for))$/i))) return {type:"join", head:t};
      if((m=t.match(/\b(standards|types|kinds|levels|domains|criteria|layers|components|phases|steps|principles)\b/i))) return {type:"group", noun:singularKey(m[1].toLowerCase()).replace(/criteria$/,"criterion"), sentence:t, ordered:/phases|steps/i.test(m[1])};
      if(/\bconsider$/i.test(t)) return {type:"group", noun:"", sentence:t};
      if(/\b(include|includes|including|such as|are|consist of|covers?)$/i.test(t)) return {type:"group", noun:"", plainList:true, sentence:t};
      return {type:"context", ctx:t}; }
    function children(lines,i,lab){ const L=lines[i], out=[]; const deeper=lines[i+1] && lines[i+1].lvl>L.lvl;
      for(let k=i+1;k<lines.length;k++){ const y=lines[k];
        if(deeper){ if(y.lvl<=L.lvl) break; out.push(y); continue; }
        if(labelOf(y.t) && (lab.type==="strengths"||lab.type==="weaknesses"||labelOf(y.t).type!=="context")) break;
        if(lab.type==="strengths"||lab.type==="weaknesses"||lab.type==="traits"||lab.type==="benefits"||lab.type==="applications"){ out.push(y); continue; }
        const g0=out.length?!!glossary(out[0].t):!!glossary(y.t); if(g0 && !glossary(y.t)) break;
        if(!g0 && out.length && words(y.t).length>Math.max(6,words(out[0].t)*1.8)) break;
        if(!g0 && !out.length && words(y.t).length>12) break;
        out.push(y); }
      return out; }
    function handleLabel(lab,kids,subj,g,B){
      if(lab.type==="skip") return;
      let about=subj; if(lab.about){ const w=words(lab.about); about=null; for(let n=w.length;n>=1 && !about;n--) about=find(w.slice(0,n).join(" ")); about=about||subj||concept(lab.about,"label"); }
      if(lab.type==="strengths"||lab.type==="weaknesses"){ kids.forEach(k=>attr(about,lab.type,k.t,k.t)); return; }
      if(lab.type==="benefits"){ kids.forEach(k=>attr(about,"benefits",k.t,k.t)); return; }
      if(lab.type==="traits"){ kids.forEach(k=>attr(about,"traits",k.t,k.t)); return; }
      if(lab.type==="applications"){ kids.forEach(k=>attr(about,"applications",k.t,k.t)); return; }
      if(lab.type==="vp"){ kids.forEach(k=>{ if(formOf(k.t)==="vp") attr(about,"does",`${third(lemma(lab.verb.split(" ")[0]))} ${lab.verb.split(" ").length>1?lab.verb.split(" ").slice(1).join(" ")+" ":""}${/^(helps?)$/i.test(lab.verb)?"":"to "}${lc1(toBase(k.t))}`.replace(/\s+/g," "),k.t); }); return; }
      if(lab.type==="join"){ if(subj){ const list=kids.map(k=>lc1(k.t)); const np=`${lab.head} ${list.length>1?list.slice(0,-1).join(", ")+" and "+list[list.length-1]:list[0]||""}`; attr(subj,/^[A-Z][a-z]+\s+of\b/.test(lab.head)?"def":"traits",np,B.title); } return; }
      if(lab.type==="group"){ const gl=kids.map(k=>glossary(k.t)).filter(Boolean);
        { const wm=(lab.sentence||"").match(/^when\s+(\w+ing\s+.+?),\s*consider$/i); if(wm && g && g.role==="criterion") g.kind=`criterion for ${lcWords(wm[1]).replace(/^selecting a framework$/,"selecting a framework")}`; }
        if(gl.length>=2){ let kind=g&&g.kind||null, noun=lab.noun;
          const last=gl.map(x=>stripParen(x.term).split(" ").pop().toLowerCase()); const common=last.every(w=>w===last[0])?last[0]:"";
          if(lab.include && subj) kind=`part of ${subj.name}`; else if(lab.noun==="level") kind=common?`level of ${common}`:lab.of?`level of ${lc1(lab.of)}`:(subj?`level of ${lc1(subj.name)}`:"level");
          else if(lab.of) kind=`${noun} of ${lab.of}`; else if(!kind && noun) kind=common&&common!==noun?`${noun} of ${common}`:noun;
          if(lab.sentence && /standards/i.test(lab.sentence)){ const f=lab.sentence.match(/\bstandards\s+for\s+(.+)$/i); kind=f?`standard for ${f[1]}`:"standard"; }
          const G=g && !lab.include && lab.noun!=="level" && !lab.sentence?.match(/standards/i) ? g : group({kind, noun, subject:lab.include||lab.noun==="level"?subj:(lab.of?find(lab.of):null), ordered:!!lab.ordered, src:B.title, memberNoun:lab.noun==="level"&&!common?"level":(lab.of&&/^type|^kind/.test(noun)?lab.of:"")});
          if(lab.sentence && /standards/i.test(lab.sentence) && gl.every(x=>/^\d+$/.test(x.term))){ const org=lab.sentence.match(/\b([A-Z]{2,}(?:\/[A-Z]{2,})+)\b/); if(org) gl.forEach(x=>x.term=`${org[1]} ${x.term}`); }
          if(g && G===g && !g.kind) g.kind=kind; if(G.noun && gl.some(x=>keyOf(x.term)===keyOf(G.noun))) G.kind=null;
          gl.forEach((x,j)=>addMember(G,x.term,x.desc,kids[j]?.t||x.term));
          if(!lab.ordered && G.ordered===false && gl.every(x=>/^(phase|step|stage)\s/i.test(x.term))) G.ordered=true;
        } else if(subj && lab.include){ kids.forEach(k=>attr(subj,"traits","includes "+lc1(k.t),k.t)); }
        else if(kids.length>=2 && kids.every(k=>words(k.t).length<=5 && !/^(is|are|was|were)\b/i.test(k.t) && ["np","adj"].includes(formOf(k.t))) && (subj||lab.plainList)){ const G=group({kind:null, noun:lab.noun||"item", subject:lab.plainList?null:subj, src:B.title, plain:true}); kids.forEach(k=>addMember(G,k.t,null,k.t)); }
        return; }
      if(lab.type==="context"){ // "Banking System Modernization:" or "EA Response:" — examples if the lines name known ideas
        kids.forEach(k=>{ const gl=glossary(k.t); const c=gl&&find(gl.term); if(c) c.examples.push({text:gl.desc, ctx:lab.ctx, src:k.t}); else handleLine(k.t,subj,"concept",g,B,true); }); return; }
    }
    function handleLine(x,subj,mode,g,B,quiet){ let m;
      // attribute labels on a slide about one idea
      if((m=x.match(/^(purpose|goals?|aims?|focus|used for|uses|developed by|created by|example|examples|structure|result|results|outcome|outcomes|note)\s*:\s*(.+)$/i))){ const lab=m[1].toLowerCase(), v=clean(m[2]);
        if(!subj) return; if(/^(purpose|goal|goals|aim|aims)$/.test(lab)) attr(subj,"purpose",v,x); else if(lab==="focus") attr(subj,"focus",v,x); else if(/^used for|^uses/.test(lab)) attr(subj,"uses",v,x); else if(/by$/.test(lab)) subj.creator=subj.creator||v; else if(/^example/.test(lab)) subj.examples.push({text:v, src:x}); return; }
      if((m=x.match(/^(.+?)\s+stands\s+for\s*:?\s*(.+)$/i))){ const c=find(m[1])||subj; if(c) c.expansion=clean(m[2]); return; }
      if((m=x.match(/^([A-Z][\w\s\/-]{0,40}?)\s*=\s*(.+)$/)) && !/→/.test(m[2])){ const c=find(m[1])||(nameLike(m[1])?concept(m[1],"eq"):null); if(!c) return; const p=m[2].split(/\s+[–—-]\s+/); if(/^[A-Z]/.test(p[0]) && words(p[0]).length>=2 && words(p[0]).every(w=>/^[A-Z&]|^(of|and|for|the)$/.test(w))){ c.expansion=c.expansion||clean(p[0]); if(p[1]) attr(c,"def",p[1],x); } else if(words(m[1])[0]!==words(m[1])[0].toUpperCase() || true) attr(c,"def",m[2],x); return; }
      if((m=x.match(/^(?:initially\s+)?(?:developed|created|designed|founded|introduced)\s+by\s+(.+?)(?:\s+in\s+(?:the\s+)?(\d{4}s?))?(?:\s*[—–]\s*(.+))?$/i)) && subj){ subj.creator=subj.creator||clean(m[1]); if(m[2]) subj.year=m[2]; if(m[3]) attr(subj,"def",m[3],x); return; }
      if((m=x.match(/^not\s+(an?\s+[^—–,]+?)\s*[—–,]\s*it'?s\s+(an?\s+.+?)(?:,\s*not\s+.+)?$/i)) && subj){ subj.not.push(clean(m[1])); attr(subj,"def",m[2],x); return; }
      if(/\s\|\s/.test(x)) return;
      // "A SoS is a collection …", "In EA, UML helps bridge …", "EA translates business strategy into IT architecture"
      const x2=x.replace(/^in\s+[^,]{1,30},\s*/i,"");
      if((m=x2.match(/^(?:an?\s+|the\s+)?([A-Z][\w\s\/()-]{0,50}?)\s+(is|are)\s+(?!not\b|known\b|also\b|used\b)(.{6,})$/))){ const c=find(m[1]); if(c){ attr(c,/^(an?|the|one)\s/i.test(m[3])||NP_DEF.test(m[3])?"def":"traits",m[3],x); return; } }
      if((m=x2.match(/^(?:an?\s+|the\s+)?([A-Z][\w\s\/()-]{0,50}?)\s+([a-z]+s)\s+(.{4,})$/)) && isVerb3(m[2])){ const c=find(m[1]); if(c){ attr(c,"does",`${m[2]} ${m[3]}`,x); return; } if(subj && keyOf(m[1]).split(" ")[0]===keyOf(subj.name).split(" ")[0]){ attr(subj,"facts",x,x); return; } }
      if(mode==="goals" && (m=x.match(/^the\s+(?:main\s+)?(?:goal|aim|purpose)\s+is\s+to\s+(.+)$/i))){ attr(subj,"purpose",m[1],x,B.about?{about:B.about}:null); return; }
      // "Term – description" lines on any slide
      const gl=glossary(x);
      if(gl){ if(g && !g.dead){ addMember(g,gl.term,gl.desc,x); if(mode==="group"&&g.role==="challenge"&&g.subject) attr(g.subject,"challenges",`${gl.term}: ${gl.desc}`,x,{name:gl.term,desc:gl.desc}); if(g.role==="benefit"&&g.subject) attr(g.subject,"benefits",gl.term,x,{name:gl.term,desc:gl.desc}); return; }
        if(mode==="benefits"&&subj && !(/\(/.test(gl.term) || words(gl.term).length>=2 && words(gl.term).every(w=>/^[A-Z]/.test(w)))){ attr(subj,"benefits",x,x); return; }
        if(mode==="challenges"&&subj){ attr(subj,"challenges",x,x); return; }
        if(subj && keyOf(gl.term)===keyOf(subj.name)) { attr(subj,"def",gl.desc,x); return; }
        const c=concept(gl.term,"glossary"); if(c) attr(c,formOf(gl.desc)==="vp"?"does":"def",gl.desc,x); return; }
      if(!subj) return;
      if(/→/.test(x) && mode==="benefits"){ const p=x.split(/\s*→\s*/); attr(subj,"benefits",p[0],x,{result:p.slice(1).join(" → ")}); subj.results.push({cause:clean(p[0]),effect:clean(p.slice(1).join(" → ")),src:x}); return; }
      if(/→/.test(x) && mode==="examples"){ subj.examples.push({text:clean(x), src:x}); return; }
      if(mode==="examples"){ subj.examples.push({text:clean(x), src:x}); return; }
      if(mode==="benefits"){ if(!/^(they|it|this|these|without|with)\b/i.test(x) && formOf(x)!=="clause" && !/→/.test(x)) attr(subj,"benefits",x,x); return; }
      if(mode==="challenges"){ attr(subj,"challenges",x,x); return; }
      if(mode==="goals"){ const f=formOf(x); if(f==="vp") attr(subj,"purpose",x,x,B.about?{about:B.about}:null); return; }
      if(mode==="misc"||mode==="group") return;
      if(/→|=/.test(x) && !/\bfrom\b/i.test(x)) return;
      if(/^(they|it|this|these|those|each|every|some|there)\b/i.test(x)){ if(/^(each|every)\b/i.test(x)) attr(subj,"facts",x,x); return; }
      const f=formOf(x);
      if(f==="vp") attr(subj,"does",x,x);
      else if(f==="np"&&(NP_DEF.test(x)&&!/^\w+ed\s/i.test(x)||/^(an?|the|one of)\s/i.test(x))) attr(subj,"def",x,x);
      else if(f==="np"||f==="adj"||f==="ger") attr(subj,"traits",x,x);
      else if(f==="clause") attr(subj,"facts",x,x);
    }
    function readLater(B){ CURB=B.title;
      // tables: "FRAMEWORK | STRENGTHS | LIMITATIONS"
      const rows=B.lines.filter(x=>/\s\|\s/.test(x.t)).map(x=>x.t.split(/\s*\|\s*/));
      if(rows.length>=2){ const head=rows[0].map(h=>h.toLowerCase()); for(const r of rows.slice(1)){ const c=find(r[0]); if(!c) continue; r.slice(1).forEach((v,j)=>{ const h=head[j+1]||""; if(/strength|advantage|pro/.test(h)) attr(c,"strengths",v,r.join(" | "),{table:true}); else if(/limit|weak|disadvantage|con/.test(h)) attr(c,"weaknesses",v,r.join(" | "),{table:true}); }); c.row={cells:r, head:rows[0]}; } }
      // example slides: "Example: E-commerce Platform" + "Business Layer: Online shopping strategy & sales rules"
      const ctx=clean(B.title.replace(/^(case example|example|case study|sample)\s*[-–—:]?\s*/i,"")).replace(/^[A-Z][a-z]*\s*[-–—:]\s*/,m0=>/UML|EA/.test(m0)?"":m0);
      let cur=ctx;
      for(let i=0;i<B.lines.length;i++){ const x=B.lines[i].t; if(/\s\|\s/.test(x)) continue; const lab=/:$/.test(x)?x.replace(/:$/,""):null; if(lab){ if(!/^(content|layered breakdown|components|parts)\b/i.test(lab) && !/^content\s*\(/i.test(lab)) cur=clean(lab); continue; }
        const gl=glossary(x); if(!gl) continue; const c=find(gl.term); if(c) c.examples.push({text:gl.desc, ctx:/^(content)/i.test(cur)?ctx:cur, src:x}); }
    }
  }

  /* ---------------- writing questions ---------------- */
  const GENERIC = new Set("system systems enterprise enterprises architecture architectures architectural organization organizations organizational business businesses based using used help helps make makes provide provides support supports ensure ensures within across between their them they that this with from into over under about more most less such other each every all some many much also only just data component components service services process processes model models level levels".split(" "));
  const STOPW = new Set("too a an the of to in on at for from by with and or but is are was were be been being it its this that these those their there which who what when where how why as into than then also can may not no so very e g etc".split(" "));
  const stems = t => new Set((String(t).toLowerCase().match(/[a-z][a-z-]{2,}/g)||[]).filter(w=>!STOPW.has(w)&&!GENERIC.has(w)).map(w=>{ for(const x of ["ations","ation","ments","ment","ility","ity","ing","ies","ed","es","s"]) if(w.endsWith(x) && w.length-x.length>=4) return w.slice(0,-x.length).slice(0,5); return w.slice(0,5); }));
  const roots4 = t => new Set([...stems(t)].map(w=>w.slice(0,4)));
  const near = (a,b) => { const A=roots4(a), B=roots4(b); for(const w of A) if(B.has(w)) return true; return false; };
  const nearAny = (c,t) => allText(c).concat([...c.weaknesses,...c.challenges].map(x=>x.text)).some(x=>near(x,t));
  function overlap(a,b){ const A=stems(a), B=stems(b); if(!A.size||!B.size) return 0; let n=0; for(const w of A) if(B.has(w)) n++; return n/Math.min(A.size,B.size); }
  const allText = c => [...c.def,...c.does,...c.traits,...c.purpose,...c.focus,...c.uses,...c.benefits,...c.strengths,...c.facts,...c.applications].map(x=>x.text+(x.desc?" "+x.desc:"")).concat(c.groups.map(g=>g.desc.get(c)?.text||"")).filter(Boolean);
  const trueOf = (c,t,th=0.5) => allText(c).some(x=>overlap(x,t)>=th) ;
  const isPlural = n => { const s=stripParen(n); if(/^(phase|step|stage|level|tier)\s/i.test(s)) return false; if(/\band\b|&/.test(s)) return true; const l=s.split(" ").pop(); return pluralWord(l) && !/^[A-Z]{2,}s?$/.test(l) || /^[A-Z][a-z]*s$/.test(s) && pluralWord(s); };
  function subjOf(c, g, start){ // "the Zachman Framework", "Component Diagrams", "the Directed SoS"
    if(c.art && !g) { const s0=`${c.art} ${lcWords(c.name)}`; return start?cap(s0):s0; }
    let n=c.name; const mn=g&&g.memberNoun; if(mn && words(n).length===1 && !/^[A-Z]{2,}/.test(n)) n=`${n} ${mn}`;
    const bare=stripParen(n); let s=n;
    if(!isPlural(bare) && COUNT_HEAD.test(bare) && !/^[A-Z]{2,}\b/.test(bare) || mn && words(c.name).length===1) s="the "+n;
    return start?cap(s):s; }
  const joinAnd = s => { const p=s.split(/,\s*/); if(p.length===2 && !/\band\b/.test(s) && p.every(x=>words(x).length<=3)) return p[0]+" and "+p[1]; if(p.length===3 && !/\band\b/.test(p[2]) && p.every(x=>words(x).length<=3)) return p[0]+", "+p[1]+" and "+p[2]; return s; };
  function pluralKind(k){ const m=String(k).match(/^(.+?)(\s+(?:of|for|in)\s+.+)?$/); let a=m[1], b=m[2]||""; const w=a.split(" "); let l=w.pop();
    l=/^criterion$/i.test(l)?"criteria":/[^aeiou]y$/i.test(l)?l.slice(0,-1)+"ies":/(s|sh|ch|x|z)$/i.test(l)?l+"es":l+"s"; return [...w,l].join(" ")+b; }
  const lcThe = s => String(s).replace(/^The /,"the ");
  const STATIVE = /^(consists?|includes?|contains?|ranges?|comprises?|lacks?|goes|go|is|are|has|have|expands?|recognizes?)\b/i;
  const endQ = s => /[?!.]["”’)]?$/.test(s)?s:s+".";
  // "X <attr>" as a full sentence, or null when the attribute cannot be joined to X cleanly
  function stmt(c, a, g){ if(!a) return null; if(g && g.label) return null; const t=clean(a.text); if(/→|=|\||:/.test(t) || words(t).length>28) return null; const S=subjOf(c,g,true), pl=isPlural(c.name) && !(g&&g.memberNoun&&words(c.name).length===1);
    if(a.form==="vp") return `${S} ${agree(t,pl)}`;
    if(a.form==="adj"){ const adj=/,/.test(t)?joinAnd(t):t; if(/,/.test(adj) && words(adj).length<=4) return null; const past=/^(initially\s+)?(created|developed|founded|introduced)\b/i.test(t); return `${S} ${past?(pl?"were":"was"):(pl?"are":"is")} ${lc1(adj)}`; }
    if(a.form==="np"){ if(!(NP_DEF.test(t)||/^(most|one of|an?|the)\b/i.test(t)) || /,/.test(t.replace(/\([^)]*\)/g,"")) && !/^(an?|the|one of)\s/i.test(t)) return null; return `${S} ${pl?"are":"is"} ${aNP(t)}`; }
    return null; }
  // the claim a classmate makes: a full sentence if possible, otherwise the description in quotes
  const claimOf = (c,a,g) => { const s=stmt(c,a,g); return s?`“${s}.”`:`that “${lc1(clean(a.text)).replace(/\?$/,"")}” describes ${subjOf(c,g)}.`; };
  // what a "Which … ?" stem says about the right answer
  function clue(K0, a, trait){ const t=clean(a.text), K=K0?K0:"of the following";
    if(a.form==="vp") return `Which ${K} ${agree(t,false)}?`;
    if(a.form==="ger") return `Which ${K} involves ${lc1(t)}?`;
    if(a.form==="adj"){ if(/,/.test(t)&&joinAnd(t)===t) return `Which ${K} is described as “${lc1(t)}”?`; return `Which ${K} is ${lc1(joinAnd(t))}?`; }
    if(a.form==="clause") return `Which ${K} is the one in which ${lc1(t)}?`;
    if(a.form==="question") return `Which ${K} deals with the question: ${t.replace(/[.?]*$/,"?")}`;
    if(/^(an?|the|one of)\s/i.test(t)) return `Which ${K} is ${lc1(t)}?`;
    if(a.form==="np" && /,/.test(t.replace(/\([^)]*\)/g,"")) && t.split(/,\s*/).some(x=>formOf(x)==="adj")) return `Which ${K} is described as “${lc1(t)}”?`;
    if(a.form==="np"){ const hw=headWord(t); if(trait) return `Which ${K} is known for ${lc1(t)}?`; if(NP_DEF.test(t) && !pluralWord(hw) && (!/,/.test(t.replace(/\([^)]*\)/g,"")) || /^(\w+[\s-]+){0,2}(system|approach|element|process|repository|technique|method|model|scheme|collection|way|standard|practice|tool|language|matrix|taxonomy)\b/i.test(t))) return `Which ${K} is ${aNP(t)}?`; if(pluralWord(hw) && (t.replace(/\([^)]*\)/g,"").match(/,/g)||[]).length<1) return `Which ${K} refers to ${lc1(t)}?`; return `Which ${K} covers ${lc1(t)}?`; }
    return null; }
  const HEADW = /^(the|of|and|for|in|a|an|to|with|on|layer|layers|diagram|diagrams|framework|frameworks|architecture|architectural|level|levels|phase|type|types|pattern|patterns|method|methods|model|models|system|systems|criterion|benefit|challenge|map|maps|graph|graphs|view|views|approach|management|enterprise|sos)$/i;
  const giveaway = (c,t) => { const tw=(String(t).toLowerCase().match(/[a-z][a-z-]{2,}/g)||[]); const hit=name=>{ const nw=(stripParen(name).toLowerCase().match(/[a-z][a-z-]{2,}/g)||[]).filter(w=>!HEADW.test(w)); return nw.some(w=>tw.some(x=>x.slice(0,Math.min(5,w.length))===w.slice(0,Math.min(5,w.length)) && Math.min(w.length,x.length)>=4)); }; return hit(c.name) || !!c.expansion && hit(c.expansion); };
  const reQ = s => String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const mentions = (c,t) => new RegExp("\\b"+reQ(stripParen(c.name))+"\\b","i").test(t) || (c.abbr && new RegExp("\\b"+reQ(c.abbr)+"\\b").test(t));
  // a is a kind of b: "TOGAF" is one of the "architectural frameworks", so it cannot be a wrong answer next to "Architectural Framework"
  const kindOf = (a,b) => a.groups.some(g=>g.kind && keyOf(g.kind)===keyOf(b.name));
  const related = (a,b) => a===b || a.partOf.includes(b) || b.partOf.includes(a) || kindOf(a,b) || kindOf(b,a) || keyOf(a.name).split(" ").some(w=>w.length>=3 && keyOf(b.name).split(" ").includes(w)) && (keyOf(a.name).includes(keyOf(b.name))||keyOf(b.name).includes(keyOf(a.name)));

  function generate(text, opts={}){
    const K=read(text), r=rng(opts.seed||11), out=[]; const IT=/\b(system|software|data|architecture|network|IT|application|database|cloud|framework|UML|API)\b/.test(text);
    const ROLES=IT?["An enterprise architect","A systems analyst","An IT project team","A solutions architect","An IT manager","A development team"]:["A student","A project team","A group of researchers","A teacher"];
    let ri=Math.floor(r()*ROLES.length); const role=()=>ROLES[(ri++)%ROLES.length];
    const byName=new Map(); K.list.forEach(c=>byName.set(c.name.toLowerCase(),c));
    const push=(tpl,level,type,q,term,src,slide)=>{ if(typeof q==="string") q={stem:q}; if(!q||!q.stem) return;
      if(q.choices && q.answerText){ const ac=byName.get(String(q.answerText).toLowerCase()); if(ac && giveaway(ac,q.stem.replace(/^Which [^?]*?(is|are|does|do|would|should|has)\b/,"")) && !q.choices.every(ch=>giveaway({name:ch},q.stem))) return; } q.stem=q.stem.replace(/\s+/g," ").replace(/\s+([?.,])/g,"$1").replace(/\.\.$/,".").replace(/\?\.$/,"?"); out.push({tpl,level,type,...q,slots:{term:term||""},basis:src||"",slide:slide||""}); };
    const MC=(stem,answer,wrongs,keep)=>{ answer=String(answer).trim(); const w=[]; for(const x of wrongs){ const t=String(x||"").trim(); if(t && !w.some(y=>y.toLowerCase()===t.toLowerCase()) && t.toLowerCase()!==answer.toLowerCase()) w.push(t); }
      if(w.length<3) return null; const ch=shuffle([answer,...(keep?w:shuffle(w,r)).slice(0,3)],r); return {stem, choices:ch.map(cap), answer:"abcdefgh"[ch.indexOf(answer)], answerText:cap(answer)}; };
    const TF=(s,ans)=>({stem:`True or false: ${cap(s.replace(/\.$/,""))}.`, answer:ans?"True":"False"});
    const C=K.list.filter(c=>c.name);
    C.forEach(c=>{ if(c.abbr && c.name.includes("(") && words(stripParen(c.name)).length>4) c.name=c.abbr; });
    const G=K.groups.filter(g=>!g.dead && g.members.length>=2);
    G.forEach(g=>{ g.label = /^(benefit|challenge|criterion|application)$/.test(g.role||"") || g.members.every(m=>/(ity|ness|ment|ance|ence|ion|ies|curve|overhead|boundaries|limitations|support|adoption|coverage|dependencies|systems|it)$/i.test(stripParen(m.name)) && !/(layer|diagram|framework|pattern|type)/i.test(g.kind||"")); });
    const facts=c=>[...c.def,...c.does].filter(a=>a.form!=="clause");
    const major=c=>c.from==="title"||c.from==="eq"||c.from==="glossary"&&(c.def.length+c.does.length>=1);
    // siblings: other members of the same groups, then ideas with the same head noun, then the main ideas of the lesson
    function siblings(c, need){ const s=[]; const add=x=>{ if(x!==c && !s.includes(x) && !related(x,c)) s.push(x); };
      c.groups.forEach(g=>g.members.forEach(add)); const hw=keyOf(c.name).split(" ").pop(); C.filter(x=>keyOf(x.name).split(" ").pop()===hw && major(x)).forEach(add); if(need!=="group") C.filter(major).forEach(add); return s; }
    // wrong answers for "Which … ?": the clue must not also fit them, and they must not be named in it
    function wrongNames(c, t, pool){ return pool.filter(x=>!trueOf(x,t,0.3) && !mentions(x,t) && !giveaway(x,t) && keyOf(x.name)!==keyOf(c.name)); }
    function wrongDescs(c, a, pool){ const res=[]; for(const x of pool){ for(const b of facts(x).filter(b=>b.form===a.form || (a.form==="np"||a.form==="vp")&&(b.form==="np"||b.form==="vp"))){ if(trueOf(c,b.text,0.34) || overlap(b.text,a.text)>=0.34 || mentions(c,b.text) || mentions(x,b.text) || giveaway(c,b.text) || res.some(y=>overlap(y,b.text)>=0.5)) continue; res.push(b.text); break; } } return res; }
    const quoteOK = t => words(t).length<=24;

    const unique = (c,t) => !C.some(x=>x!==c && !related(x,c) && (trueOf(x,t,0.3) || giveaway(x,t)));
    const SPEAK=["A classmate says","During a design review, a team member states","A new analyst writes in a report","A student explains","In a project meeting, a manager says"]; let spk=Math.floor(r()*5);
    const setting = kind => /interaction|pattern|component|layer|method|diagram/i.test(kind||"")?"one system":/sos|system-of-systems/i.test(kind||"")?"one system-of-systems":"one organization";
    // a need taken from a slide's verb phrase, reworded so it reads as something a person needs to do
    const needOf = t => { let n=lc1(toBase(t)).replace(/^helps?\s+(?:to\s+|in\s+)?/i,"").replace(/^aims?\s+for\s+/i,"achieve ").replace(/^focus(?:es)?\s+on\s+how\b/i,"show how").replace(/^(provide|offer|define|give)\s+(?!an?\b|the\b|all\b|each\b|clear\b|common\b)([a-z]+(?:\s[a-z]+)?\s+(?:approach|way|language|roadmap|blueprint|structure|view|model|framework)\b)/i,(m0,v,np)=>`${v} a ${np}`).replace(/^(provide|offer)\s+common\b/i,"$1 a common");
      return /^\w+ing\b/.test(n)?null:n; };

    /* ---- groups: "Which type of SoS …?", "Which layer …?" ---- */
    for(const g of G){ const kind=g.kind; const noClaim=/^(application|criterion)$/.test(g.role||"");
      for(const c of (g.role==="application"?[]:g.members)){ const d=g.desc.get(c); if(!d) continue; const t=d.text; const sl=g.src;
        if(giveaway(c,t) || mentions(c,t)) continue;
        const pool=g.members.filter(x=>x!==c); const wrN=wrongNames(c,t,pool); const wr=wrN.map(x=>x.name);
        if(wr.length<2) continue;
        const st=g.label&&d.form==="adj"?`Which ${kind} is described as “${lc1(t)}”?`:clue(kind,d); if(st && !(g.subject && mentions(g.subject,t) && mentions(g.subject,kind||""))) push("O.R.which","Remembering","mc",MC(st,c.name,wr),c.name,d.src,sl);
        if(unique(c,t)) push("O.R.ident","Remembering","ident",{stem:`Identify the ${kind||"term"} being described: ${endQ(cap(t))}`,answer:c.name},c.name,d.src,sl);
        const s=stmt(c,d,g); if(s){ push("O.R.tf","Remembering","tf",TF(s,true),c.name,d.src,sl); if(unique(c,t)) push("O.R.blank","Remembering","blank",{stem:s.replace(subjOf(c,g,true),"________")+".",answer:c.name},c.name,d.src,sl); }
        // understanding: pick the description of a named member
        const vf=x=>x.form==="vp"?cap(agree(x.text,false)):x.text;
        const wd=pool.map(x=>g.desc.get(x)).filter(x=>x && overlap(x.text,t)<0.34 && !trueOf(c,x.text,0.34)).map(vf);
        if(wd.length>=2) push("O.U.desc","Understanding","mc",MC(`Which of the following best describes ${subjOf(c,g)}${g.label&&kind?`, one of the ${pluralKind(kind)}`:""}?`,vf(d),wd),c.name,d.src,sl);
        // applying: a situation that shows the member at work
        if(d.form==="clause" && kind && !g.ordered && !/^(standard|real-world)/.test(kind) && !(g.role==="challenge" && /\b(must|should|requires?|need to)\b/i.test(t)) && !/^(one|many|some|each)\b/i.test(t)){
          if(g.role==="challenge"){ const q=`${role()} is reviewing a design and finds this problem: “${cap(t)}.” Which ${kind} is this?`; push("O.A.facing","Applying","mc",MC(q,c.name,wr),c.name,d.src,sl); push("O.A.facing.case","Applying","case",MC("Situation: "+q,c.name,wr),c.name,d.src,sl); }
          else { const q=`In ${setting(kind)}, ${lc1(t)}. Which ${kind} does this describe?`; push("O.A.which","Applying","mc",MC(q,c.name,wr),c.name,d.src,sl); push("O.A.which.case","Applying","case",MC("Situation: "+q,c.name,wr),c.name,d.src,sl); } }
        if(g.role==="criterion" && d.form==="question") push("O.A.criterion","Applying","mc",MC(`While comparing frameworks, ${lc1(role())} asks, “${t}” Which ${kind} are they using to judge the options?`,c.name,wr),c.name,d.src,sl);
        if(g.role==="benefit" && (d.form==="vp"||d.form==="adj")) push("O.A.benefit","Applying","mc",MC(`${role()} wants a design where it is ${d.form==="vp"?"possible to "+lc1(toBase(t)):lc1(t)}. Which ${kind} are they looking for?`,c.name,wr),c.name,d.src,sl);
        // evaluating: judge a classmate's claim; analyzing: tell two members apart
        const o2=wrN.filter(x=>g.desc.get(x) && overlap(g.desc.get(x).text,t)<0.34 && !trueOf(c,g.desc.get(x).text,0.34) && quoteOK(g.desc.get(x).text));
        if(!noClaim && o2.length>=2 && quoteOK(t)){ const [y,z,w]=shuffle(o2,r); const dy=g.desc.get(y), dz=g.desc.get(z);
          if(overlap(dz.text,dy.text)<0.34){ const S=subjOf(c,g), Y=subjOf(y,g), Z=subjOf(z,g), W=w?subjOf(w,g):null; const lab=g.label&&kind?` (a ${kind})`:"";
            const none=`Incorrect — it describes none of the ${kind?pluralKind(kind):"ideas in the lesson"}`;
            const who=SPEAK[(spk++)%SPEAK.length];
            const said=x=>/^“/.test(x)?", "+x:" "+x;
            push("O.E.claim","Evaluating","mc",MC(`${who}${said(claimOf(c,dy,g)).replace(/describes (.+)\.$/,`describes $1${lab}.`)} Which judgment of this statement is correct?`,`Incorrect — that describes ${Y}, not ${S}`,[`Correct — that is an accurate description of ${S}`,`Incorrect — that describes ${Z}, not ${S}`,W?`Incorrect — that describes ${W}, not ${S}`:none]),c.name,d.src+" / "+dy.src,sl);
            push("O.E.claim","Evaluating","mc",MC(`${SPEAK[(spk++)%SPEAK.length]}${said(claimOf(c,d,g)).replace(/describes (.+)\.$/,`describes $1${lab}.`)} Which judgment of this statement is correct?`,`Correct — that is an accurate description of ${S}`,[`Incorrect — that describes ${Y}, not ${S}`,`Incorrect — that describes ${Z}, not ${S}`,W?`Incorrect — that describes ${W}, not ${S}`:none]),c.name,d.src,sl);
            const a1=stmt(c,d,g), b1=stmt(y,dy,g), a2=stmt(c,dy,g), b2=stmt(y,d,g), bz=stmt(y,dz,g), az=stmt(c,dz,g);
            // balanced choices: every half appears twice, so the key cannot be spotted by counting halves
            const a_y=stmt(c,dy,g), y_c=stmt(y,d,g), a_z=stmt(c,dz,g), y_z=stmt(y,dz,g), a_c=stmt(c,d,g), y_y=stmt(y,dy,g);
            if(a_c&&y_y&&a_y&&y_c&&a_z&&y_z) push("O.N.contrast","Analyzing","mc",MC(`Which statement correctly distinguishes ${S} from ${Y}?`,`${a_c}, while ${lcThe(y_y)}`,[`${a_y}, while ${lcThe(y_c)}`,`${a_z}, while ${lcThe(y_y)}`,`${a_y}, while ${lcThe(y_z)}`]),c.name,d.src+" / "+dy.src,sl);
            else if(!/[?]$/.test(t+dy.text+dz.text)) push("O.N.contrast","Analyzing","mc",MC(`Which pairing correctly describes ${S} and ${Y}${kind?`, two of the ${pluralKind(kind)}`:""}?`,`${cap(S)} — ${lc1(t)}; ${Y} — ${lc1(dy.text)}`,[`${cap(S)} — ${lc1(dy.text)}; ${Y} — ${lc1(t)}`,`${cap(S)} — ${lc1(dz.text)}; ${Y} — ${lc1(dy.text)}`,`${cap(S)} — ${lc1(dy.text)}; ${Y} — ${lc1(dz.text)}`]),c.name,d.src+" / "+dy.src,sl);
          } }
      }
      // ordered groups: phases, maturity levels
      const lettered=g.members.filter(x=>/^(phase|step|stage|level)\s+[A-Z0-9]\b|^\d+[.)]/i.test(x.name)).length>=g.members.length/2;
      if(g.ordered && g.members.length>=3 && !lettered){ const M=g.members, nm=x=>x.name; const seqName=kind?pluralKind(kind):`${g.short||g.subject?.name||""} ${pluralKind(g.noun||"step")}`.trim(); const unit=g.noun||"step";
        for(let i=0;i+1<M.length;i++) push("O.R.next","Remembering","mc",MC(`Among the ${seqName}, which ${unit} comes right after ${nm(M[i])}?`,nm(M[i+1]),M.filter((x,j)=>j!==i+1&&j!==i).map(nm)),nm(M[i+1]),g.src,g.src);
        const win=M.slice(0,Math.min(5,M.length)); const good=win.map(nm).join(" → "); const wr=new Set(); for(let t=0;t<30&&wr.size<3;t++){ const s=shuffle(win,r).map(nm).join(" → "); if(s!==good) wr.add(s); }
        const NUM=["","one","two","three","four","five","six"]; if(/^(phase|step|stage)$/.test(unit)) push("O.A.order","Applying","mc",MC(`${role()} is planning a project that follows the ${seqName}. In which order should the project plan list ${win.length===M.length?"them":`the first ${NUM[win.length]} ${pluralKind(unit)}`}?`,good,[...wr]),g.subject?.name||"",g.src,g.src);

        push("O.R.seq","Remembering","seq",{stem:`Arrange the ${seqName} in the correct order: ${shuffle(M,r).map(nm).join("; ")}.`,answer:M.map(nm).join(" → ")},g.subject?.name||"",g.src,g.src);
        const p=1+Math.floor(r()*Math.max(1,M.length-3)); const j=Math.min(M.length-2,p+1); const flip=r()<0.5; if(j>p) push("O.R.tf.order","Remembering","tf",TF(`Among the ${seqName}, ${flip?nm(M[j]):nm(M[p])} comes before ${flip?nm(M[p]):nm(M[j])}`,!flip),"",g.src,g.src);
      }
      // lists: enumeration, "Which is NOT …?", matching
      const nm=g.members.map(x=>x.name); const ofS=g.subject&&!mentions(g.subject,kind||"")&&!/\s(of|for|in)\s/.test(kind||"")?` of ${g.subject.name}`:"";
      if(kind && g.members.length>=3 && g.members.length<=9){ push("O.R.enum","Remembering","enum",{stem:`Enumerate the ${pluralKind(kind)}${ofS}.`,answer:nm.join(", ")},g.subject?.name||"",g.src,g.src);
        let outs=[]; const opp={benefit:"challenge",challenge:"benefit"}[g.role];
        if(opp) outs=G.filter(h=>h!==g && h.subject===g.subject && h.role===opp).flatMap(h=>h.members);
        if(!outs.length && g.subject && /^(part|component|element)$/.test(g.noun||"")) outs=G.filter(h=>h.members.includes(g.subject)).flatMap(h=>h.members).filter(x=>x!==g.subject);
        if(!outs.length && g.noun && !g.role && !g.label) outs=G.filter(h=>h!==g && h.noun===g.noun && h.subject!==g.subject && h.kind!==g.kind && !h.role).flatMap(h=>h.members);
        outs=outs.filter(x=>!g.members.includes(x) && !nm.some(n=>keyOf(n)===keyOf(x.name)) && !(g.subject && x.partOf.includes(g.subject)));
        if(outs.length) push("O.R.not","Remembering","mc",MC(`Which of the following is NOT one of the ${pluralKind(kind)}${ofS}?`,shuffle(outs,r)[0].name,shuffle(nm,r).slice(0,3)),"",g.src,g.src);
        const ds=g.members.filter(x=>g.desc.get(x)&&!giveaway(x,g.desc.get(x).text)).slice(0,6); if(ds.length>=3){ const extra=outs.length?[shuffle(outs,r)[0].name]:g.members.filter(x=>!ds.includes(x)).map(x=>x.name).slice(0,1); const colB=shuffle(ds.map(x=>x.name).concat(extra),r); push("O.R.match","Remembering","match",{stem:`Match each description in Column A with the correct ${kind} in Column B.`,columns:{a:ds.map(x=>cap(g.desc.get(x).text)),b:colB},answer:ds.map((x,i)=>`${i+1}-${"abcdefgh"[colB.indexOf(x.name)]}`).join(", ")},"",g.src,g.src); }
      }
      // creating: a design that gives each need to the right member
      if(!g.label && !g.ordered){ const uses=g.members.filter(x=>{ const d=g.desc.get(x); return d && d.form==="vp" && !giveaway(x,d.text) && !STATIVE.test(d.text); });
        for(let i=0;i+1<uses.length && i<3;i++){ const A=uses[i], B=uses[i+1], X=uses.find(u=>u!==A&&u!==B)||g.members.find(u=>u!==A&&u!==B); const pa=needOf(g.desc.get(A).text), pb=needOf(g.desc.get(B).text); if(!pa||!pb||!X||overlap(pa,pb)>=0.34) continue; const [a,b,x]=[A,B,X].map(u=>subjOf(u,g));
          push("O.C.assign","Creating","mc",MC(`${role()} is designing a solution with two requirements: (1) ${pa}; (2) ${pb}. Which design plan assigns the right ${g.noun||"part"} to each requirement?`,`Use ${a} for (1) and ${b} for (2)`,[`Use ${b} for (1) and ${a} for (2)`,`Use ${x} for (1) and ${b} for (2)`,`Use ${b} for (1) and ${x} for (2)`]),A.name,g.desc.get(A).src+" / "+g.desc.get(B).src,g.src); } }
      // open-ended comparison
      const M2=g.members.filter(x=>g.desc.get(x)); if(M2.length>=2 && !g.label){ const [a,b]=M2; const gd=`${a.name}: ${lc1(g.desc.get(a).text)}; ${b.name}: ${lc1(g.desc.get(b).text)}`; push("O.N.compare","Analyzing","essay",{stem:`Compare ${subjOf(a,g)} and ${subjOf(b,g)}. How are they different, and when would you choose each one?`,answer:gd},a.name,g.src,g.src); push("O.U.diff","Understanding","short",{stem:`What is the difference between ${subjOf(a,g)} and ${subjOf(b,g)}?`,answer:gd},a.name,g.src,g.src); }
      if(kind && g.members.length>=3) push("O.E.rank","Evaluating","essay",`Which of the ${pluralKind(kind)}${ofS} matters most for a growing organization? Defend your choice with reasons.`,"",g.src,g.src);
    }

    /* ---- more ways to ask, at every level (each key still comes from one slide fact) ---- */
    for(const g of G){ const kind=g.kind; if(!kind || g.role==="application") continue;
      const M=g.members.filter(x=>g.desc.get(x) && !giveaway(x,g.desc.get(x).text) && !mentions(x,g.desc.get(x).text));
      const dOf=x=>g.desc.get(x), txt=x=>dOf(x).text, S=x=>subjOf(x,g), vf=x=>dOf(x).form==="vp"?cap(agree(txt(x),false)):cap(txt(x));
      const distinct=(a,b)=>overlap(txt(a),txt(b))<0.34 && !trueOf(a,txt(b),0.34) && !trueOf(b,txt(a),0.34);
      if(M.length<3) continue; const PK=pluralKind(kind);
      for(const c of M){ const others=M.filter(x=>x!==c && distinct(c,x)); if(others.length<2) continue; const sl=g.src;
        // Remembering: a correctly matched pair
        const [y,z,w]=shuffle(others,r); const pairOK=[y,z,w].filter(Boolean).every((a,i,A)=>A.every((b,j)=>i===j||distinct(a,b)));
        if(pairOK) push("O.R.pair","Remembering","mc",MC(`Which pair is correctly matched?`,`${c.name} — ${lc1(txt(c))}`,[`${y.name} — ${lc1(txt(z))}`,`${z.name} — ${lc1(txt(w||c))}`,`${(w||y).name} — ${lc1(txt(w?y:c))}`].filter(x=>!x.startsWith(c.name+" — "+lc1(txt(c))))),c.name,dOf(c).src,sl);
        // Remembering: complete the statement
        const s0=stmt(c,dOf(c),g); if(s0){ const pre=S(c); const blanks=others.map(x=>stmt(c,dOf(x),g)).filter(Boolean).map(t=>t.slice(cap(pre).length).trim()); const key=s0.slice(cap(pre).length).trim();
          const lead=key.match(/^(is|are|was|were)\s/i); const allLead=lead && blanks.every(b=>b.toLowerCase().startsWith(lead[1].toLowerCase()+" "));
          const cut=x=>allLead?x.slice(lead[0].length):x;
          if(blanks.length>=2) push("O.R.complete","Remembering","mc",MC(`Complete the statement: ${cap(pre)}${allLead?" "+lead[1].toLowerCase():""} ________.`,cut(key),blanks.map(cut)),c.name,dOf(c).src,sl); }
        // Understanding: which does NOT describe this member (the others are true of other members, the key is the only one that is wrong for it)
        // Understanding: which statement about the group is NOT correct
        if(!g.label){ const trues=others.slice(0,3).map(x=>stmt(x,dOf(x),g)).filter(Boolean); const swapped=stmt(c,dOf(y),g);
          if(trues.length>=3 && swapped) push("O.U.false","Understanding","mc",MC(`Which statement about the ${PK} is NOT correct?`,swapped,trues),c.name,dOf(c).src+" / "+dOf(y).src,sl);
          const t1=stmt(c,dOf(c),g), f1=[y,z,w].filter(Boolean).map(x=>stmt(c,dOf(x),g)).filter(Boolean);
          if(t1 && f1.length>=2) push("O.U.true","Understanding","mc",MC(`Which statement about ${S(c)} is correct?`,t1,f1),c.name,dOf(c).src,sl); }
        // Applying: a team that has already used one member needs another next
        if(!g.label && !g.ordered && dOf(c).form==="vp" && dOf(y).form==="vp"){ const need=needOf(txt(c)), done=lc1(agree(txt(y),isPlural(y.name))); const wr=wrongNames(c,txt(c),M.filter(x=>x!==c)).map(x=>x.name);
          if(need && wr.length>=2) push("O.A.next","Applying","mc",MC(`${role()} already has ${S(y)}, which ${done}. The team now also needs to ${need}. Which ${kind} should they add?`,c.name,wr),c.name,dOf(c).src,sl); }
        // Evaluating: critique a plan that picks the wrong member
        if(!g.label && dOf(c).form==="vp" && !g.ordered){ const need=needOf(txt(c)); if(need) push("O.E.critique","Evaluating","mc",MC(`${role()} plans to use ${S(y)} to ${need}. Which is the best judgment of this plan?`,`It is a weak plan — this is what ${S(c)} ${isPlural(c.name)?"are":"is"} for`,[`It is a sound plan — this is what ${S(y)} ${isPlural(y.name)?"are":"is"} for`,`It is a weak plan — this is what ${S(z)} ${isPlural(z.name)?"are":"is"} for`,`It is a sound plan — any of the ${PK} would work equally well`]),c.name,dOf(c).src+" / "+dOf(y).src,sl); }
      }
      // Analyzing: what two members have in common; how a member relates to the subject
      const otherKinds=G.filter(h=>h!==g && h.kind && !h.members.some(m=>g.members.includes(m)) && h.role!=="application").map(h=>pluralKind(h.kind));
      const echo=x=>{ const kw=(kind+" "+(g.subject?g.subject.name+" "+(g.subject.abbr||""):"")+" "+(g.memberNoun||"")).toLowerCase().match(/[a-z]{3,}/g)||[]; return (S(x).toLowerCase().match(/[a-z]{3,}/g)||[]).some(w=>!/^(the|and)$/.test(w) && kw.some(k=>k.slice(0,4)===w.slice(0,4))) || /\band\b|&/.test(x.name); };
      const MC2=M.filter(x=>!echo(x));
      if(otherKinds.length>=3 && MC2.length>=2){ const [a,b]=shuffle(MC2,r); push("O.N.common","Analyzing","mc",MC(`What do ${S(a)} and ${S(b)} have in common?`,`Both are ${PK}${g.subject&&!/\s(of|for|in)\s/.test(kind)&&!mentions(g.subject,kind)?` of ${g.subject.name}`:""}`,shuffle(otherKinds,r).slice(0,3).map(k=>`Both are ${k}`)),a.name,g.src,g.src);
        if(false){ const x=shuffle(M,r)[0]; push("O.N.relation","Analyzing","mc",MC(`How is ${S(x)} related to ${subjOf(g.subject)}?`,`It is one of the ${PK}${!mentions(g.subject,kind)&&!/\s(of|for|in)\s/.test(kind)?` of ${g.subject.name}`:""}`,shuffle(otherKinds,r).slice(0,3).map(k=>`It is one of the ${k}`)),x.name,g.src,g.src); } }
      // Analyzing: a list that contains only one kind of point (benefits vs challenges of the same subject)
      const opp={benefit:"challenge",challenge:"benefit"}[g.role]; const og=opp&&G.find(h=>h.subject===g.subject&&h.role===opp);
      if(og && g.members.length>=4 && og.members.length>=3){ const P=shuffle(g.members,r).map(x=>x.name), B=shuffle(og.members,r).map(x=>x.name); const A=P.slice(0,3), a4=P[3];
        const wrongLists=[[A[1],a4,B[0]],[A[0],a4,B[1]],[A[2],a4,B[2]]].map(l=>shuffle(l,r).join(", "));
        push("O.N.sort","Analyzing","mc",MC(`Which list contains ONLY ${PK}?`,A.join(", "),wrongLists),"",g.src,g.src); }
      // Creating: a design that needs three members at once
      if(!g.label && !g.ordered){ const V=M.filter(x=>dOf(x).form==="vp" && needOf(txt(x))); if(V.length>=4){ const pick=shuffle(V,r).slice(0,3), out1=V.find(x=>!pick.includes(x)); const needs=pick.map(x=>needOf(txt(x)));
        if(needs.every((n,i)=>needs.every((m,j)=>i===j||overlap(n,m)<0.34))){ const names=pick.map(x=>x.name);
          push("O.C.combine","Creating","mc",MC(`${role()} is designing a solution that must (1) ${needs[0]}, (2) ${needs[1]}, and (3) ${needs[2]}. Which set of ${PK} should the design include?`,names.join(", "),[0,1,2].map(i=>names.map((n,j)=>j===i?out1.name:n).join(", "))),names[0],pick.map(x=>dOf(x).src).join(" / "),g.src); } } }
    }
    // Evaluating: which risk matters most for this framework / which option fits a stated priority
    for(const c of C){ const kg=c.groups.find(g=>g.kind && !g.label); if(!kg) continue; const sib=kg.members.filter(x=>x!==c); const S=subjOf(c);
      if(c.weaknesses.length){ const ow=[]; for(const x of sib) for(const b of x.weaknesses){ if(nearAny(c,b.text)||trueOf(c,b.text,0.2)||c.weaknesses.some(z=>overlap(z.text,b.text)>=0.2)||giveaway(x,b.text)||ow.some(y=>overlap(y,b.text)>=0.3)) continue; ow.push(b.text); }
        for(const n of c.weaknesses.slice(0,2)) if(ow.length>=2 && !giveaway(c,n.text)) push("O.E.risk","Evaluating","mc",MC(`An organization is about to adopt ${S}. Which of the following is a weakness of ${S} that it should weigh before deciding?`,cap(n.text),shuffle(ow,r)),c.name,n.src,n.slide); }
      for(const p of c.strengths.slice(0,2)){ if(giveaway(c,p.text)) continue; const wr=sib.filter(x=>!trueOf(x,p.text,0.3) && !x.strengths.some(z=>overlap(z.text,p.text)>=0.3)).map(x=>x.name); if(wr.length>=2) push("O.E.recommend","Evaluating","mc",MC(`${role()} says the organization's top priority is ${aNP(kg.kind)} with this strength: “${lc1(p.text)}.” Which ${kg.kind} would you recommend?`,c.name,wr),c.name,p.src,p.slide); }
    }
    /* ---- one idea at a time ---- */
    for(const c of C){ if(!major(c) && !c.def.length && !c.does.length && !c.strengths.length && !c.benefits.length) continue;
      const sib=siblings(c), sibG=siblings(c,"group");
      const sameHead=sibG.length>=2 && sibG.every(x=>keyOf(x.name).split(" ").pop()===keyOf(c.name).split(" ").pop());
      const K0=c.groups.find(g=>g.kind && !g.label)?.kind || (sameHead ? singularKey(keyOf(c.name).split(" ").pop()) : null);
      const kg=c.groups.find(g=>g.kind && !g.label && g.kind===K0); const pool0=kg?kg.members.filter(x=>x!==c):K0?sibG:sib;
      const S=subjOf(c), Sc=subjOf(c,null,true);
      // remembering: which idea fits this description?
      for(const a of [...c.def,...c.does,...c.focus,...c.traits.filter(x=>x.form!=="clause")].slice(0,6)){ if(giveaway(c,a.text)||mentions(c,a.text)) continue; const wr=wrongNames(c,a.text,pool0).map(x=>x.name); if(wr.length<2) continue; const sl=a.slide;
        const dupName=K0 && (K0.match(/\b[A-Z][A-Za-z]*[A-Z]\w*\b/g)||[]).some(w=>new RegExp("\\b"+w+"\\b").test(a.text));
        const st=clue(K0,a,c.traits.includes(a)); if(st && !dupName) push("O.R.which","Remembering","mc",MC(st,c.name,wr,!K0),c.name,a.src,sl);
        const s=stmt(c,a); if(s){ push("O.R.tf","Remembering","tf",TF(s,true),c.name,a.src,sl); if(unique(c,a.text) && (K0||a.form==="np")) push("O.R.blank","Remembering","blank",{stem:s.replace(Sc,"________")+".",answer:c.name},c.name,a.src,sl); }
        if(unique(c,a.text) && (K0||a.form==="np")) push("O.R.ident","Remembering","ident",{stem:`Identify the ${K0||"term"} being described: ${endQ(cap(a.text))}`,answer:c.name},c.name,a.src,sl); }
      if(c.not.length){ const s=`${Sc} ${isPlural(c.name)?"are":"is"} ${aNP(c.not[0])}`; push("O.U.tf.not","Understanding","tf",TF(s,false),c.name,c.src[0]); }
      // abbreviations, creators, years
      if(c.abbr && c.expansion){ const others=C.filter(x=>x!==c&&x.expansion&&x.abbr).map(x=>x.expansion); push("O.R.abbr.id","Remembering","ident",{stem:`What does ${c.abbr} stand for?`,answer:c.expansion},c.name,c.src[0]); }
      if(c.creator && !giveaway({name:c.creator},c.name+" "+(c.expansion||""))){ const others=C.filter(x=>x!==c&&x.creator&&x.creator.toLowerCase()!==c.creator.toLowerCase()).map(x=>x.creator); if(others.length>=2) push("O.R.who","Remembering","mc",MC(`Who developed ${S}?`,c.creator,others),c.name,c.src[0]); push("O.R.who.id","Remembering","ident",{stem:`Who developed ${S}?`,answer:c.creator},c.name,c.src[0]); }
      if(c.year && /^\d{4}$/.test(c.year)){ const y=+c.year; push("O.R.year","Remembering","mc",MC(`In what year was ${S} developed?`,String(y),[y-5,y+5,y-10,y+10].map(String)),c.name,c.src[0]); }
      // understanding: which description fits this idea?
      const main=c.def.find(a=>a.form==="np")||c.def[0]||c.purpose.find(a=>a.form==="vp")||c.does[0];
      if(main && !mentions(c,main.text)){ const wd=wrongDescs(c,main,K0?pool0.concat(sib):sib); if(wd.length>=2) push("O.U.desc","Understanding","mc",MC(`Which of the following best describes ${S}?`,main.text,wd,true),c.name,main.src,main.slide); }
      for(const p of [...c.purpose,...(c.purpose.length?[]:c.focus)].slice(0,2)){ if(p.form!=="vp") continue; const pool=[]; for(const x of sib){ for(const b of [...x.purpose,...x.focus,...x.does]){ if(b.form!=="vp"||STATIVE.test(b.text)||giveaway(c,b.text)||trueOf(c,b.text,0.34)||overlap(b.text,p.text)>=0.34||mentions(c,b.text)||mentions(x,b.text)||pool.some(y=>overlap(y,b.text)>=0.5)) continue; pool.push(b.text); break; } }
        const who0=p.about?lcWords(p.about):S; const stem0=c.focus.includes(p)?`What does ${who0} mainly aim to do?`:c.purpose.length>1?`Which of the following is a goal of ${who0}?`:`What is the main purpose of ${who0}?`;
        if(pool.length>=2) push("O.U.purpose","Understanding","mc",MC(stem0,"To "+lc1(toBase(p.text)),pool.map(b=>"To "+lc1(toBase(b))),true),c.name,p.src,p.slide); }
      for(const e of c.examples){ if(e.ctx || /=|→/.test(e.text)) continue; const pool=pool0.filter(x=>!x.examples.some(z=>overlap(z.text,e.text)>=0.34)&&!mentions(x,e.text)&&!trueOf(x,e.text,0.34)).map(x=>x.name); if(pool.length>=2 && !mentions(c,e.text)) push("O.U.example","Understanding","mc",MC(`“${cap(e.text)}” is an example of which ${K0||"of the following ideas"}?`,c.name,pool,!K0),c.name,e.src); }
      // strengths vs weaknesses, benefits vs challenges
      const pos=[...c.strengths,...c.benefits], neg=[...c.weaknesses,...c.challenges];
      const named=[...pos,...neg].every(x=>x.name);
      const lab=x=>named?`${x.name}: ${lc1(x.desc||"")}`.replace(/: $/,""):(x.desc?cap(x.desc):x.text.replace(/\s*→.*$/,"").replace(/^[^:]{2,40}:\s*/,m0=>x.name?"":m0));
      if(pos.length>=1 && neg.length>=2){ const wStr=c.strengths.length?"strength":"benefit"; const wWk=c.weaknesses.length?"weakness":"challenge"; const pl=w=>w==="weakness"?"weaknesses":w+"s";
        // wrong choices are the same kind of point (another framework's strength), never an obvious opposite
        const otherPts=(field)=>{ const res=[]; for(const x of pool0) for(const b of x[field]){ if(nearAny(c,b.text)||trueOf(c,b.text,0.2)||[...c.strengths,...c.weaknesses,...c.benefits,...c.challenges].some(z=>overlap(z.text,b.text)>=0.2)||giveaway(x,b.text)||giveaway(c,b.text)||res.some(y=>overlap(y.b.text,b.text)>=0.3)) continue; res.push({x,b}); } return res; };
        if(K0){ const oS=otherPts(c.strengths.length?"strengths":"benefits"), oW=otherPts(c.weaknesses.length?"weaknesses":"challenges");
          if(oS.length>=2) for(const p of pos.slice(0,3)) if(!giveaway(c,p.text)) push("O.U.pos","Understanding","mc",MC(`Which of the following is a ${wStr} of ${S}?`,lab(p),shuffle(oS,r).map(o=>o.b.text)),c.name,p.src,p.slide);
          if(oW.length>=2) for(const n of neg.slice(0,3)) if(!giveaway(c,n.text)) push("O.U.neg","Understanding","mc",MC(`${cap(pluralKind(K0))} differ in their ${pl(wWk)}. Which of the following is a ${wWk} of ${S}?`,lab(n),shuffle(oW,r).map(o=>o.b.text)),c.name,n.src,n.slide); }
        const sw=`${cap(pl(wStr))}: ${pos.map(lab).join("; ")}. ${cap(pl(wWk))}: ${neg.map(lab).join("; ")}.`;
        push("O.E.essay","Evaluating","essay",{stem:`Would you recommend ${S} to a small organization that changes quickly? Weigh its ${pl(wStr)} and ${pl(wWk)}, and justify your answer.`,answer:sw},c.name,c.src[0]);
        push("O.N.essay","Analyzing","essay",{stem:`Analyze how the ${pl(wStr)} and ${pl(wWk)} of ${S} affect where it should be used.`,answer:sw},c.name,c.src[0]); }
      // two frameworks side by side: a strength and a weakness that belong to one of them
      if(c.strengths.length && c.weaknesses.length && K0){ for(let k=0;k<Math.min(2,c.strengths.length,c.weaknesses.length);k++){ const pair=[c.strengths[k],c.weaknesses[k]]; const wr=pool0.filter(x=>(x.strengths.length||x.weaknesses.length) && !pair.some(p=>trueOf(x,p.text,0.3)||[...x.weaknesses].some(w=>overlap(w.text,p.text)>=0.3))).map(x=>x.name);
        if(wr.length>=2) push("O.N.profile","Analyzing","mc",MC(`Which ${K0} has this profile — strength: “${lc1(pair[0].text)}”; weakness: “${lc1(pair[1].text)}”?`,c.name,wr),c.name,pair[0].src+" / "+pair[1].src,pair[0].slide); } }
      // "Increased agility → faster response to market changes"

      // applying: a need → which idea?  evaluating: which choice is best, and why?
      if(K0 && pool0.length>=2) for(const a of c.does.concat(c.purpose.filter(x=>x.form==="vp")).slice(0,3)){ if(a.form!=="vp"||STATIVE.test(a.text)||giveaway(c,a.text)||mentions(c,a.text)) continue; const need=needOf(a.text); if(!need) continue; const wr=wrongNames(c,a.text,pool0).map(x=>x.name); if(wr.length<2) continue; const who=/agenc|government|federal|public sector/i.test(need)?"A government IT office":role();
        push("O.A.need","Applying","mc",MC(`${who} needs to ${need}. Which ${K0} should they use?`,c.name,wr),c.name,a.src,a.slide);
        const why=[...c.def,...c.does,...c.traits].find(b=>b!==a && (b.form==="vp"||b.form==="adj"||b.form==="np"&&/^(an?|the|one of)\s/i.test(b.text)) && overlap(b.text,a.text)<0.34 && !/[:→=]/.test(b.text) && !STATIVE.test(b.text) && words(b.text).length<=16);
        const o=pool0.find(x=>wr.includes(x.name) && [...x.def,...x.does].some(b=>b.form==="vp"&&!STATIVE.test(b.text)&&!trueOf(c,b.text,0.3)&&overlap(b.text,a.text)<0.34));
        if(why && o && !trueOf(o,why.text,0.3)){ const ow=[...o.def,...o.does].find(b=>b.form==="vp"&&!STATIVE.test(b.text)&&!trueOf(c,b.text,0.3)&&overlap(b.text,a.text)<0.34); const rs=(b,x)=>{ const pl=isPlural(x.name); return b.form==="vp"?`${pl?"they":"it"} ${agree(b.text,pl)}`:`${pl?"they are":"it is"} ${lc1(b.form==="np"?b.text:b.text)}`; };
          if(false) push("O.E.best","Evaluating","mc",MC(`${who} needs to ${need}. Which option gives the right choice together with a true statement about it?`,`${c.name}, because ${rs(why,c)}`,[`${o.name}, because ${rs(ow,o)}`,`${o.name}, because ${rs(why,o)}`,`${c.name}, because ${rs(ow,c)}`]),c.name,a.src+" / "+why.src+" / "+ow.src,a.slide); } }
      // case examples: "Banking System Modernization" + "Component Diagram: Reusable services (…)"
      for(const e of c.examples){ if(!e.ctx && !/→/.test(e.text) || /=/.test(e.text) && !/→/.test(e.text)) continue; if(!e.ctx && !/diagram|model|map|view|graph/i.test((K0||"")+" "+c.name)){ const pool=pool0.filter(x=>!mentions(x,e.text)).map(x=>x.name); if(K0 && pool.length>=2 && !/=/.test(e.text)) push("O.U.example","Understanding","mc",MC(`“${cap(e.text)}” is an example of which of the following?`,c.name,pool,true),c.name,e.src); continue; }
        const pool=pool0.filter(x=>!x.examples.some(z=>overlap(z.text,e.text)>=0.5)).map(x=>x.name); if(pool.length<2) continue; const ctx=e.ctx?lcWords(e.ctx.replace(/^(example|case)\s*[:–—-]\s*/i,"")):"";
        const ex=e.text.replace(/^(\w+)\s*=\s*/,""); const show=/diagram|model|map|view|graph/i.test((K0||"")+" "+c.name);
        const q=show?`${ctx?`In ${aNP(ctx)} project, which`:"Which"} ${K0||"of the following"} would a team use to show “${ex}”?`:`${ctx?`In ${aNP(ctx)}, which`:"Which"} ${K0||"of the following"} would contain “${lc1(ex)}”?`;
        push("O.A.example","Applying","mc",MC(q,c.name,pool),c.name,e.src); if(ctx) push("O.A.example.case","Applying","case",MC(show?`Situation: A team working on ${aNP(ctx)} project must show “${ex}”. Which ${K0||"of the following"} should they use?`:`Situation: In ${aNP(ctx)}, the team is placing “${lc1(ex)}”. Which ${K0||"of the following"} does it belong in?`,c.name,pool),c.name,e.src); }
      // open-ended items
      if(main && major(c)){ const one=/^(the|an?) /i.test(S)||!isPlural(c.name); const guide=[...c.def,...c.does,...c.purpose].slice(0,4).map(x=>cap(x.text)).join("; ");
        push("O.U.explain","Understanding","short",{stem:`Explain in your own words what ${S} ${one?"is":"are"} and why ${one?"it matters":"they matter"}.`,answer:guide},c.name,main.src,main.slide);
        if(IT) push("O.A.apply","Applying","short",{stem:`Describe how ${S} could be used in a real organization's IT project. Give one concrete example.`,answer:guide},c.name,main.src,main.slide);
        push("O.C.design","Creating","essay",{stem:`Design a plan for an organization that wants to use ${S}. Describe the steps, the people involved and what the organization would gain.`,answer:guide},c.name,main.src,main.slide); }
    }
    // de-duplicate
    const seen=new Set(); const res=out.filter(q=>{ const k=q.type+"|"+q.stem.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
    return {questions:res, K};
  }
  return {looksOutline, read, generate, formOf, stmt};
})();
if(typeof module!=="undefined") module.exports=Outline;
