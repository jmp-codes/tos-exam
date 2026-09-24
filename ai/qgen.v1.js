/* QGen — offline question generator for TOS Builder.
   Reads a sentence or paragraph, pulls out definitions, lists, causes, contrasts and purposes,
   then fills Bloom's-level question patterns. Our AI (BloomAI) double-checks each draft's level. */
const QGen = (() => {
  const LEVELS = ["Remembering","Understanding","Applying","Analyzing","Evaluating","Creating"];
  const STOP = new Set("a an the of to in on at for from by with and or but is are was were be been being it its this that these those their there which who whom whose what when where how why as into than then also can may might must should would could will shall do does did has have had not no so such very more most less least other another each every any some many much one two three first second".split(" "));
  const PRON = /^(it|its|this|that|these|those|they|their|he|his|she|her|we|our|you|your|i|there|here|such|ito|iyon|sila|siya|kanilang|nito)\b/i;
  const IT = /\b(database|software|network|server|programming|program|web|internet|application|api|protocol|query|queries|security|computer|middleware|website|information system|data)\b/i;

  const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
  const trimP = s => String(s||"").replace(/\s+/g," ").replace(/^[\s,;:]+|[\s,;:.]+$/g,"").trim();
  const noArt = s => trimP(s).replace(/^(an?|the|ang|ang mga|mga)\s+/i,"");
  const words = s => noArt(s).split(/\s+/).filter(Boolean);
  function sentences(text){
    return String(text||"").replace(/\s+/g," ").replace(/(\b(e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms))\./g,"$1<dot>")
      .match(/[^.!?]+[.!?]?/g)?.map(s=>s.replace(/<dot>/g,".").trim()).filter(s=>s.split(" ").length>=4) || [];
  }
  function isFilipino(text){
    const w=String(text).toLowerCase().match(/[a-zñ']+/g)||[];
    const f=w.filter(x=>/^(ang|ng|mga|ay|sa|na|at|ito|kung|para|nito|siya|ang|upang|dahil|hindi|tulad)$/.test(x)).length;
    return w.length>0 && f/w.length>0.12;
  }
  // keep a term's capital letter only if it is a name or acronym
  function termCase(term, text){
    const t=trimP(term); if(!t) return t;
    const first=t.split(" ")[0];
    if(/^[A-Z0-9]{2,}/.test(first) || /[a-z][A-Z]/.test(first)) return t;
    if(/^[A-Z]/.test(t)){
      const esc=first.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      if(new RegExp("[a-z,;:]\\s+"+esc+"\\b").test(text)) return t;       // capitalised mid-sentence: a name
      return t.charAt(0).toLowerCase()+t.slice(1);
    }
    return t;
  }
  let CUR="";
  const lc = s => { s=trimP(s); if(/^[A-Z]{2,}|^[A-Z][a-z]*[A-Z]/.test(s)) return s; const w=s.split(" ")[0]; if(/^[A-Z]/.test(w) && new RegExp("[a-z,;:]\\s+"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b").test(CUR)) return s; return s.charAt(0).toLowerCase()+s.slice(1); };
  const isName = s => /^([A-Z][a-z]+\.?\s+){1,3}[A-Z][a-z]+\.?$/.test(trimP(s).replace(/^(the|an?)\s+/i,""));
  function splitItems(s){
    return trimP(s).replace(/\s+etc$/i,"").split(/\s*,\s*(?:and\s+|or\s+|at\s+)?|\s+and\s+|\s+at\s+|\s+or\s+|;\s*/).map(noArt).filter(x=>x && x.split(" ").length<=6);
  }

  /* ---------- read the text ---------- */
  function read(text){
    CUR=String(text||""); const fil=isFilipino(text), S=sentences(text);
    const facts={defs:[],lists:[],causes:[],contrasts:[],purposes:[],steps:[],names:[],terms:new Map(),fil,text};
    const addTerm=(t,w=1)=>{ t=noArt(t); if(!t||t.length<3||t.split(" ").length>5||PRON.test(t)||STOP.has(t.toLowerCase())) return; const k=t.toLowerCase(); facts.terms.set(k,{t,w:(facts.terms.get(k)?.w||0)+w}); };
    for(const raw of S){
      const s=raw.replace(/[.!?]$/,"").trim(); let m;
      if(fil){
        if((m=s.match(/(?:ang\s+)?mga\s+(uri|bahagi|hakbang|halimbawa|katangian|elemento|sanhi|epekto)\s+ng\s+(.+?)\s+ay\s+(.+)$/i))){ facts.lists.push({kind:m[1],subject:noArt(m[2]),items:splitItems(m[3]),src:raw}); }
        else if((m=s.match(/^(?:ang\s+(?:mga\s+)?)?(.{2,60}?)\s+ay\s+(?:isang\s+|ang\s+)?(.{8,})$/i)) && !PRON.test(m[1])){ facts.defs.push({term:noArt(m[1]),verb:"ay",def:trimP(m[2]),src:raw}); addTerm(m[1],3); }
        if((m=s.match(/^(.+?)\s+dahil\s+(?:sa\s+)?(.+)$/i))) facts.causes.push({effect:trimP(m[1]),cause:trimP(m[2]),src:raw});
        if((m=s.match(/^hindi\s+tulad\s+ng\s+(.+?),\s*(?:ang\s+)?(.+?)\s+ay\s+(.+)$/i))){ facts.contrasts.push({a:noArt(m[2]),b:noArt(m[1]),src:raw}); addTerm(m[1],2); addTerm(m[2],2); }
        if((m=s.match(/^(?:ang\s+)?(.+?)\s+ay\s+ginagamit\s+(?:upang|para sa|sa)\s+(.+)$/i))) facts.purposes.push({term:noArt(m[1]),purpose:trimP(m[2]),src:raw});
        continue;
      }
      // definitions: "X is/refers to Y", "Y is called X"
      if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,60}?)\s+(is called|are called|is known as|are known as|was called|was known as|is considered|was considered)\s+(?:an?\s+|the\s+)?(.{2,60})$/i)) && words(m[3]).length<=6){
        if(isName(m[1])) facts.names.push({who:trimP(m[1]),title:trimP(m[3]),verb:m[2].toLowerCase(),src:raw});
        else { facts.defs.push({term:noArt(m[3]),verb:/are/i.test(m[2])?"are":"is",def:lc(m[1]),src:raw}); addTerm(m[3],3); }
      } else if((m=s.match(/^((?:an?|the)\s+)?(.{2,60}?)\s+(is defined as|are defined as|refers to|refer to|pertains to|means|is|are|was|were)\s+(?!(?:to|not|also|used|very|often|usually|important|necessary|essential|responsible|made|found|called|known|one of|able|when|because|due)\b)(.{8,})$/i))
                && words(m[2]).length<=5 && !PRON.test(m[2]) && !/\b(and|or|,)\b/.test(m[2].toLowerCase()) && !/^(main\s+|basic\s+|major\s+|different\s+)?(\w+\s+)?(types|kinds|parts|steps|components|examples|layers|phases|stages|characteristics|elements|principles|functions|categories|levels|branches|properties|features)\s+of\b/i.test(m[2])){
        const v=m[3].toLowerCase(), items=splitItems(m[4]);
        if(items.length>=3 && items.every(x=>x.split(" ").length<=4) && /,/.test(m[4])){ facts.lists.push({kind:noArt(m[2]),subject:"",items,src:raw}); items.forEach(x=>addTerm(x,2)); }
        else { facts.defs.push({art:(m[1]||"").trim().toLowerCase(),term:noArt(m[2]),verb:v,def:trimP(m[4]),src:raw}); addTerm(m[2],3); }
      }

      // lists: "The three types of X are a, b and c", "X has four parts: a, b, c"
      if((m=s.match(/(?:the\s+)?(?:\w+\s+)?(types|kinds|parts|steps|components|examples|layers|phases|stages|characteristics|elements|principles|functions|categories|levels|branches|properties|features|advantages|disadvantages|causes|effects)\s+of\s+(.+?)\s+(?:are|include|includes|consist of)[:\s]+(.+)$/i))){
        const items=splitItems(m[3]); if(items.length>=2){ facts.lists.push({kind:m[1].toLowerCase(),subject:trimP(m[2]).replace(/\s+(commonly|usually|often)?\s*(used|found|seen|known)$/i,""),items,src:raw}); items.forEach(x=>addTerm(x,2)); }
      } else if((m=s.match(/^(?:(?:an?|the)\s+)?(.+?)\s+(?:has|have|consists of|consist of|is composed of|includes|include)\s+(?:\w+\s+)?(parts|components|layers|steps|types|elements|stages|phases|features)[:\s]+(.+)$/i))){
        const items=splitItems(m[3]); if(items.length>=2){ facts.lists.push({kind:m[2].toLowerCase(),subject:noArt(m[1]),items,src:raw}); items.forEach(x=>addTerm(x,2)); addTerm(m[1],2); }
      }
      // causes and effects
      if((m=s.match(/^(.+?),?\s+because\s+(?:of\s+)?(.+)$/i))) facts.causes.push({effect:trimP(m[1]),cause:trimP(m[2]),src:raw});
      else if((m=s.match(/^(.+?)\s+(results in|result in|leads to|lead to|causes|cause|produces|produce|prevents|prevent|reduces|reduce|increases|increase)\s+(.+)$/i)) && words(m[1]).length<=10) facts.causes.push({cause:trimP(m[1]),verb:m[2].toLowerCase(),effect:trimP(m[3]),src:raw});
      else if((m=s.match(/^(?:due to|because of|as a result of)\s+(.+?),\s*(.+)$/i))) facts.causes.push({cause:trimP(m[1]),effect:trimP(m[2]),src:raw});
      // contrasts
      if((m=s.match(/^unlike\s+(?:an?\s+|the\s+)?(.+?),\s*(?:an?\s+|the\s+)?(.+?)\s+(is|are|does|do|has|have|can|uses|use|stores|store|allows|allow|requires|require|provides|provide)\b/i))){ facts.contrasts.push({a:noArt(m[2]),b:noArt(m[1]),src:raw}); addTerm(m[1],2); addTerm(m[2],2); }
      else if((m=s.match(/^(?:an?\s+|the\s+)?(.{2,40}?)\s+(?:is|are|does|do|has|have|uses|use)\b.+?,?\s+(?:whereas|while)\s+(?:an?\s+|the\s+)?(.{2,40}?)\s+(?:is|are|does|do|has|have|uses|use)\b/i))){ facts.contrasts.push({a:noArt(m[1]),b:noArt(m[2]),src:raw}); addTerm(m[1],2); addTerm(m[2],2); }
      // purposes
      if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,50}?)\s+(?:is|are)\s+used\s+(to|for)\s+(.+)$/i))) facts.purposes.push({term:noArt(m[1]),purpose:(m[2]==="to"?"":"for ")+trimP(m[3]),src:raw}),addTerm(m[1],2);
      else if((m=s.match(/^the\s+(?:main\s+)?(?:purpose|goal|aim|function)\s+of\s+(?:an?\s+|the\s+)?(.+?)\s+is\s+(?:to\s+)?(.+)$/i))) facts.purposes.push({term:noArt(m[1]),purpose:trimP(m[2]),src:raw}),addTerm(m[1],2);
      else if((m=s.match(/^(?:(?:an?|the)\s+)?(.{2,40}?)\s+(?:helps?|allows?|enables?)\s+(.+)$/i)) && words(m[1]).length<=4 && !PRON.test(m[1])) facts.purposes.push({term:noArt(m[1]),purpose:trimP(m[2]),src:raw,helps:true}),addTerm(m[1],1);
      if(/^(first|second|then|next|after that|finally|lastly)\b/i.test(s)) facts.steps.push(s.replace(/^(first|second|then|next|after that|finally|lastly),?\s*/i,""));
      // frequent content words as backup terms
      (s.match(/\b[A-Za-z][a-z]{4,}\b/g)||[]).forEach(w=>{ if(!STOP.has(w.toLowerCase())) addTerm(w,0.2); });
      (s.match(/(?<=[a-z,]\s)(?:[A-Z][a-z]+\s?){2,3}/g)||[]).forEach(w=>addTerm(w,1));
    }
    facts.defs=facts.defs.map(d=>({...d,term:termCase(d.term,text)}));
    facts.defs.forEach(d=>{ d.head=(d.def.toLowerCase().replace(/^(an?|the)\s+/,"").split(/\s+/)[0]||""); d.tool = IT.test(text) || facts.purposes.some(p=>p.term.toLowerCase()===d.term.toLowerCase()); });
    facts.termList=[...facts.terms.values()].filter(x=>x.w>=1).sort((a,b)=>b.w-a.w).map(x=>termCase(x.t,text));
    facts.main = facts.defs[0]?.term || facts.lists[0]?.subject || facts.purposes[0]?.term || facts.termList[0] || "";
    return facts;
  }

  /* ---------- question patterns per level ---------- */
  function pick(arr,n,rnd){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a.slice(0,n); }
  function mc(stem, answer, pool, rnd, n=4){
    const al=answer.toLowerCase();
    const d=[...new Set(pool.map(trimP).filter(x=>x && x.toLowerCase()!==al && !x.toLowerCase().includes(al) && !al.includes(x.toLowerCase())))];
    if(d.length<2) return null;
    const ch=pick([answer,...pick(d,Math.min(n-1,d.length),rnd)],99,rnd);
    return {stem, choices:ch.map(cap), answer:"abcdefgh"[ch.indexOf(answer)], answerText:cap(answer)};
  }
  function generate(text, opts={}){
    const F=read(text); const rnd=(s=>()=>{ s=(s*16807)%2147483647; return s/2147483647; })(opts.seed||11);
    const ctx = trimP(opts.context) || (F.fil ? "inyong paaralan o komunidad" : IT.test(text) ? "a school information system" : "your school or community");
    const artifact = F.fil ? (IT.test(text)?"isang sistema":"isang proyekto") : IT.test(text) ? pick(["a system","a database design","a program","an application"],1,rnd)[0] : pick(["a project","a lesson activity","a plan","an information campaign"],1,rnd)[0];
    const out=[]; const push=(level,type,q,basis)=>{ if(!q) return; if(typeof q==="string") q={stem:q}; q.stem=cap(q.stem.replace(/\s+/g," ").replace(/\s+([?.,])/g,"$1")); out.push({level,type,...q,basis:basis||""}); };
    const terms=F.termList, defs=F.defs, D=F.defs.map(d=>d.term);
    const pairs=[...F.contrasts.map(c=>[c.a,c.b])];
    for(let a=0;a<F.defs.length;a++) for(let b=a+1;b<F.defs.length;b++) if(F.defs[a].head && F.defs[a].head===F.defs[b].head) pairs.push([F.defs[a].term,F.defs[b].term]);
    F.lists.forEach(l=>{ if(l.items.length>=2) pairs.push([l.items[0],l.items[1]]); });
    const T = F.main;
    if(F.fil){
      for(const d of defs){
        push("Remembering","short",`Ano ang ${d.term}?`, d.src);
        push("Remembering","mc",mc(`Ano ang tawag sa ${lc(d.def)}?`, d.term, [...D,...terms], rnd), d.src);
        push("Remembering","tf",{stem:`Tama o mali: Ang ${d.term} ay ${lc(d.def)}.`, answer:"Tama"}, d.src);
        push("Understanding","short",`Ipaliwanag sa sariling salita ang kahulugan ng ${d.term}.`, d.src);
        if(IT.test(text)){
          push("Applying","short",`Gamitin ang ${d.term} sa isang sitwasyon sa ${ctx} at ipakita ang mga hakbang.`, d.src);
          push("Analyzing","essay",`Suriin ang mga problemang maaaring mangyari sa ${ctx} kung hindi gagamitin ang ${d.term}.`, d.src);
          push("Evaluating","essay",`Makatwiran ba ang paggamit ng ${d.term} sa ${ctx}? Pangatwiranan ang iyong sagot.`, d.src);
          push("Creating","essay",`Magdisenyo ng ${artifact} para sa ${ctx} na gumagamit ng ${d.term}.`, d.src);
        } else {
          push("Applying","short",`Gamitin ang kahulugan ng ${d.term} upang patunayan na ito ay makikita sa isang tunay na sitwasyon na iyong naobserbahan.`, d.src);
          push("Analyzing","essay",`Suriin kung ano ang magbabago kung wala ang ${d.term}.`, d.src);
          push("Evaluating","essay",`Gaano kahalaga ang ${d.term}? Pangatwiranan ang iyong sagot gamit ang mga natutunan sa aralin.`, d.src);
          push("Creating","essay",`Magdisenyo ng isang gawain o demonstrasyon na nagpapakita ng ${d.term}.`, d.src);
        }
        push("Creating","essay",`Bumuo ng orihinal na halimbawa na nagpapakita ng ${d.term}.`, d.src);
      }
      for(const l of F.lists){ push("Remembering","short",{stem:`Isa-isahin ang mga ${l.kind} ng ${l.subject}.`, answer:l.items.join(", ")}, l.src); push("Analyzing","essay",`Suriin kung paano nag-uugnayan ang mga ${l.kind} ng ${l.subject}.`, l.src); }
      for(const c of F.causes){ push("Understanding","short",{stem:`Bakit ${lc(c.effect)}?`, answer:c.cause}, c.src); push("Analyzing","essay",`Suriin kung paano humahantong ang ${lc(c.cause)} sa ${lc(c.effect)}.`, c.src); }
      for(const [a,b] of pairs){ push("Understanding","short",`Ano ang pagkakaiba ng ${a} at ${b}?`); push("Analyzing","essay",`Ihambing ang ${a} at ${b} batay sa kanilang gamit at katangian.`); push("Evaluating","essay",IT.test(text)?`Alin ang mas mainam para sa ${ctx}: ${a} o ${b}? Pangatwiranan ang iyong sagot.`:`Alin ang mas mahalaga, ${a} o ${b}? Pangatwiranan ang iyong sagot.`); }
      if(T && IT.test(text)) push("Evaluating","essay",`Tayahin ang bisa ng ${T} sa ${ctx}. Pangatwiranan ang iyong sagot.`);
    } else {
      const withArt = d => (d.art && !/^[A-Z]{2,}/.test(d.term) ? d.art+" " : "")+d.term;
      for(const d of defs){
        const t=withArt(d), T0=cap(t), dl=lc(d.def);
        push("Remembering","short",{stem:`Define ${t}.`, answer:cap(d.def)}, d.src);
        push("Remembering","mc",mc(`Which term refers to ${dl}?`, d.term, [...D,...F.lists.flatMap(l=>l.items),...terms.filter(x=>!/\b(commonly|used|main|types?|parts?|kinds?) /i.test(x))], rnd), d.src);
        push("Remembering","blank",{stem:`____ ${d.verb} ${dl}.`, answer:cap(d.term)}, d.src);
        push("Remembering","tf",{stem:`True or false: ${T0} ${d.verb} ${dl}.`, answer:"True"}, d.src);
        const other=defs.find(x=>x!==d && x.head===d.head) || defs.find(x=>x!==d);
        if(other) push("Remembering","tf",{stem:`True or false: ${T0} ${d.verb} ${lc(other.def)}.`, answer:"False"}, d.src);
        if(defs.length>=3) push("Understanding","mc",mc(`Which of the following best describes ${t}?`, dl, defs.filter(x=>x!==d).map(x=>lc(x.def)), rnd), d.src);
        const entity=/^[A-Z]/.test(d.term) && !/^[A-Z]{2,}/.test(d.term);
        const be = /^(was|were|are)$/.test(d.verb) ? d.verb : "is";
        push("Understanding","short",`Explain in your own words what ${t} ${be}.`, d.src);
        if(!entity) push("Understanding","short",`Give an example of ${t} and explain why it is an example.`, d.src);
        if(d.tool){
          push("Applying","short",`Give an example of how ${t} is used in ${ctx}, and show the steps involved.`, d.src);
          push("Applying","short",`Demonstrate how ${t} would be applied in ${ctx}.`, d.src);
          push("Analyzing","essay",`Analyze the problems that could arise in ${ctx} if ${t} were not used.`, d.src);
          push("Evaluating","essay",`Is ${t} always the best approach for ${ctx}? Justify your answer.`, d.src);
          push("Evaluating","essay",`Assess the strengths and weaknesses of ${t} in ${ctx}, then give your judgment.`, d.src);
          push("Creating","essay",`Design ${artifact} for ${ctx} that makes use of ${t}.`, d.src);
        } else if(entity){
          push("Analyzing","essay",`Analyze what would have changed if ${t} had not existed.`, d.src);
          push("Analyzing","essay",`Analyze the factors that made ${t} significant.`, d.src);
          push("Evaluating","essay",`How significant was ${t}? Justify your answer with evidence from the lesson.`, d.src);
          push("Creating","essay",`Create an original timeline, story or presentation about ${t}.`, d.src);
        } else {
          push("Applying","short",`Describe a real situation where ${t} can be observed, and use the definition to show that it fits.`, d.src);
          push("Analyzing","essay",`Analyze what would change if ${t} did not exist or did not occur.`, d.src);
          push("Analyzing","essay",`Break down the definition of ${t} into its key parts and explain how each part contributes to its meaning.`, d.src);
          push("Evaluating","essay",`How important is ${t} in the topic you studied? Justify your answer with reasons from the lesson.`, d.src);
          push("Creating","essay",`Design an activity or demonstration that shows ${t} to your classmates.`, d.src);
        }
        if(!entity) push("Creating","essay",`Create an original example or scenario that illustrates ${t}.`, d.src);
      }
      for(const nm of F.names){
        const title=nm.title.replace(/^(an?|the)\s+/i,""), art=/^the\s/i.test(nm.title)||!/^an?\s/i.test(nm.title)?"the ":"";
        const past=/^was/.test(nm.verb);
        push("Remembering","short",{stem:`Who ${past?"was":"is"} ${nm.verb.replace(/^(is|was)\s+/,"")} ${art}${title}?`, answer:nm.who}, nm.src);
        const others=F.names.filter(x=>x!==nm).map(x=>x.who).concat((text.match(/(?<=[a-z,]\s)(?:[A-Z][a-z]+\s){1,2}[A-Z][a-z]+/g)||[]).filter(x=>x!==nm.who));
        push("Remembering","mc",mc(`Who ${past?"was":"is"} ${nm.verb.replace(/^(is|was)\s+/,"")} ${art}${title}?`, nm.who, others, rnd), nm.src);
        push("Understanding","short",`Explain why ${nm.who} ${past?"was":"is"} ${nm.verb.replace(/^(is|was)\s+/,"")} ${art}${title}.`, nm.src);
        push("Evaluating","essay",`Do you agree that ${nm.who} deserves to be ${nm.verb.replace(/^(is|was)\s+/,"")} ${art}${title}? Justify your answer.`, nm.src);
      }
      for(const l of F.lists){
        const what = l.subject ? `the ${l.kind} of ${l.subject}` : `the ${l.kind}`;
        push("Remembering","short",{stem:`Enumerate ${what}.`, answer:l.items.map(cap).join(", ")}, l.src);
        const others=[...D,...F.lists.filter(x=>x!==l).flatMap(x=>x.items),...terms].filter(t=>!l.items.map(x=>x.toLowerCase()).includes(t.toLowerCase()) && !/\b(commonly|used|main|types?|parts?|kinds?) /i.test(t) && t.toLowerCase()!==String(l.subject).toLowerCase() && t.toLowerCase()!==l.kind.toLowerCase());
        push("Remembering","mc",mc(`Which of the following is one of ${what}?`, l.items[0], others, rnd), l.src);
        push("Understanding","short",`Describe each of ${what} in your own words.`, l.src);
        if(IT.test(text)) push("Applying","short",`Apply ${what} to a situation in ${ctx}.`, l.src);
        else push("Applying","short",`Apply your knowledge of ${what} to identify each one in a real example or diagram.`, l.src);
        push("Analyzing","essay",`Examine how ${what} (${l.items.join(", ")}) are related to one another.`, l.src);
        push("Evaluating","essay",`Which of ${what} is the most important? Justify your choice.`, l.src);
        push("Creating","essay",`Create an original diagram or model that shows how ${what} work together.`, l.src);
      }
      for(const c of F.causes){
        const effect=lc(c.effect), cause=lc(c.cause);
        if(c.verb){ push("Understanding","short",{stem:`Explain how ${cause} ${c.verb} ${effect}.`}, c.src); push("Analyzing","essay",`Analyze the relationship between ${cause} and ${effect}.`, c.src); push("Evaluating","essay",`Do you agree that ${cause} always ${c.verb} ${effect}? Justify your answer.`, c.src); }
        else { push("Understanding","short",{stem:`Explain why ${effect}.`, answer:cap(c.cause)}, c.src); push("Analyzing","essay",`Analyze how the fact that ${cause} is connected to why ${effect}.`, c.src); push("Evaluating","essay",`Is the reason that ${cause} enough to explain why ${effect}? Justify your answer.`, c.src); }
        if(c.verb && words(c.cause).length<=6) push("Creating","essay",`Propose an original solution that addresses the effect of ${cause}.`, c.src);
        else push("Creating","essay",`Create an original timeline, diagram or story that shows how ${cause.replace(/\s+$/,"")} led to the result that ${effect}.`, c.src);
      }
      for(const p of F.purposes){
        const purpose=p.purpose.replace(/^to\s+/i,"");
        push("Understanding","short",{stem:`What is the purpose of ${/^(an?|the)\s/i.test(p.term)||/^[A-Z]{2,}/.test(p.term)?p.term:"a "+p.term}?`, answer:cap(p.purpose)}, p.src);
        const pt = (/^(an?|the)\s/i.test(p.term)||/^[A-Z]{2,}/.test(p.term)) ? p.term : "a "+p.term;
        push("Applying","short",IT.test(text)?`Use ${pt} to ${p.helps?"help "+purpose:purpose} in ${ctx}. Show how you would do it.`:`Use ${pt} to ${p.helps?"help "+purpose:purpose}. Show your work.`, p.src);
        push("Evaluating","essay",`Evaluate how well ${pt} ${p.helps?"helps "+purpose:"serves its purpose ("+purpose+")"}. Support your judgment.`, p.src);
      }
      for(const [a,b] of pairs){
        push("Understanding","short",`What is the difference between ${a} and ${b}?`);
        push("Analyzing","essay",`Compare ${a} and ${b} in terms of how they work and when each is used.`);
        push("Analyzing","essay",`Differentiate ${a} from ${b} using an example.`);
        if(IT.test(text)){ push("Evaluating","essay",`Which is more appropriate for ${ctx}: ${a} or ${b}? Defend your choice.`); push("Creating","essay",`Propose a new approach that combines ${a} and ${b} to solve a problem in ${ctx}.`); }
        else { push("Evaluating","essay",`Which is more significant, ${a} or ${b}? Defend your answer.`); push("Creating","essay",`Create an original illustration or story that shows the difference between ${a} and ${b}.`); }
      }
      if(F.steps.length>=2){ push("Applying","short",`Follow the steps described in the text to complete a similar task in ${ctx}. Show each step.`); push("Analyzing","essay",`Explain why the steps described in the text must be done in that order.`); }
      if(!defs.length && T){
        push("Remembering","short",`Define ${T}.`); push("Understanding","short",`Explain in your own words what ${T} is.`);
        push("Applying","short",`Give an example of how ${T} is used in ${ctx}.`); push("Analyzing","essay",`Analyze what would change if ${T} were not present.`);
        push("Evaluating","essay",`Is ${T} important for ${ctx}? Justify your answer.`); push("Creating","essay",`Create an original example or scenario that illustrates ${T}.`);
      }
    }
    // de-duplicate, filter by level and type
    const seen=new Set(); let res=out.filter(q=>{ const k=q.stem.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
    if(opts.level) res=res.filter(q=>q.level===opts.level);
    if(opts.type && opts.type!=="any") res=res.filter(q=> opts.type==="short" ? (q.type==="short"||q.type==="essay") : q.type===opts.type);
    return {questions:res, facts:{definitions:F.defs.length, lists:F.lists.length, causes:F.causes.length, contrasts:F.contrasts.length, purposes:F.purposes.length, terms:F.termList.slice(0,8), filipino:F.fil, main:F.main}};
  }
  return {read, generate, isFilipino};
})();
if(typeof module!=="undefined") module.exports=QGen;
