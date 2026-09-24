/* QType — recognizes the format of an exam question (multiple choice, matching, identification, …).
   Works on the question text, and on its choices/columns when the app has them. */
const QType = (() => {
  const TYPES = {
    mc:      {label:"Multiple choice",        directions:"Choose the letter of the correct answer."},
    tf:      {label:"True or false",          directions:"Write TRUE if the statement is correct and FALSE if it is not."},
    mtf:     {label:"Modified true or false", directions:"Write TRUE if the statement is correct. If it is false, change the underlined word or phrase to make the statement correct."},
    blank:   {label:"Fill in the blank",      directions:"Fill in each blank with the correct word or phrase."},
    ident:   {label:"Identification",         directions:"Identify the term or concept being described."},
    enum:    {label:"Enumeration",            directions:"Enumerate what is asked."},
    match:   {label:"Matching type",          directions:"Match each item in Column A with the correct item in Column B. Write the letter only."},
    seq:     {label:"Sequencing",             directions:"Arrange the items in the correct order."},
    analogy: {label:"Analogy",                directions:"Complete each analogy."},
    problem: {label:"Problem solving",        directions:"Solve each problem. Show your solution."},
    code:    {label:"Code tracing / output",  directions:"Determine the output or result of the given code."},
    case:    {label:"Situational / case",     directions:"Read each situation carefully and answer the question that follows."},
    short:   {label:"Short answer",           directions:"Answer each question briefly."},
    essay:   {label:"Essay",                  directions:"Answer each question in a well-organized essay."}
  };
  const ORDER=["mc","tf","mtf","blank","ident","enum","match","seq","analogy","problem","code","case","short","essay"];
  const R = (type, why, rx, not) => ({type, why, rx, not});
  const RULES = [
    R("match","mentions Column A / Column B or matching", /\b(match(ing)?(\s+type)?\b|column a\b|column b\b|hanay a\b|hanay b\b|pagtapatin|itapat)/i, /\bwhich of the following (best )?match/i),
    R("mtf","asks to correct an underlined word", /underlined|salungguhit|<u>|\bmodified true\b|\*[^*\s][^*]*\*/i),
    R("tf","true-or-false format", /^(true or false|tama o mali|t\/f)\b|\bwrite (true|t) if\b|\bisulat ang tama\b|\btrue or false\s*:/i),
    R("code","asks for the output of code", /\boutput of\b|\bwill be (printed|displayed|returned)\b|\bwhat (is|gets|will be) printed\b|\bwhat does the following (code|sql|query|program|function|statement)\b|\btrace the (code|program|loop|function)\b|\+=|\*=|-=|;\s*\w+\s*=|print\(|console\.log|printf\(|range\(|\bSELECT\s+[\w*(]/i),
    R("case","gives a situation, then asks", /^(situation|case study|case|scenario)\s*[:.\d]|^read the (case|situation|scenario|passage)\b|\b(needs?|wants?|plans?) to\b[^?]{8,}\b(which|what|how)\b[^?]*\?|^sitwasyon\b|^kailangan ng\b/i),
    R("analogy","analogy format (A : B :: C : ?)", /::|\bis to\b[^?]*\bas\b/i),
    R("seq","asks to put items in order", /^(arrange|order|sequence|put)\b[^?]*\b(order|sequence|least|greatest|smallest|largest|earliest|latest)\b|^(arrange|sequence)\b|\bchronological order\b|\b(in the|in their) correct order\b|\bin what order\b|\bfrom (least|greatest|smallest|largest|first|earliest|oldest)\b|^(ayusin|pagsunud-sunurin|pagsunod-sunurin)\b/i),
    R("blank","has a blank to fill in", /_{3,}|\.{5,}/),
    R("enum","asks to enumerate or list several items", /^(enumerate|list|isa-isahin|itala)\b|^(give|name|state|cite|provide|magbigay ng)\s+(two|three|four|five|six|seven|eight|ten|\d+|at least \w+)\b|^name the (two|three|four|five|six|seven|\d+)\b/i),
    R("ident","asks to identify a term being described", /^(identify the (term|concept|word|person|device|process)\b|identification\b|tukuyin ang tinutukoy|tukuyin kung ano)|^what (term|word|concept|device|process) (refers to|is used|is being described|describes)\b|^what do you call\b|^what is (the )?(term|name) (for|of|given to)\b|^ano ang tawag\b|^it is (the|a|an)\b/i),
    R("mc","has lettered choices", /(^|[\s\n])\(?[a-dA-D][.)]\s*\S[\s\S]*?[\s\n]\(?[b-dB-D][.)]\s*\S/),
    R("problem","numbers to work with and something to compute", /\d/, null),
    R("essay","asks for an extended written answer", /\bessay\b|\bsanaysay\b|\b(not less than|at least|minimum of)\s+\d+\s+(words|sentences)\b|\(\s*\d+\s*(points?|pts)\s*\)|\bwell[- ]organized\b|\bsupport your (answer|position|stand) with (evidence|examples)\b|^discuss\b/i),
  ];
  const PROBLEM_ASK = /\b(solve|compute|calculate|find|how many|how much|how far|how long|what (is|are|was|will be) (the |its |their |his |her )?(total |final |new |average |)?(average|mean|median|speed|area|perimeter|volume|value|probability|total|cost|price|interest|sum|product)|kalkulahin|lutasin|hanapin|ilang)\b/i;
  function detect(q){
    const text = typeof q==="string" ? q : [q.stem||"", ...(q.choices||[]).map((c,i)=>`${"abcdefgh"[i]}) ${c}`)].join("\n");
    const stem = typeof q==="string" ? q : (q.stem||"");
    if(q && q.columns) return out("match","has Column A and Column B");
    if(q && q.qtype && TYPES[q.qtype]) return out(q.qtype,"set when the question was created");
    if(q && q.underline) return out("mtf","has an underlined word to correct");
    for(const r of RULES){
      if(r.type==="problem"){ const digits=(stem.match(/\d/g)||[]).length; if(digits && PROBLEM_ASK.test(stem) && !/_{3,}/.test(stem)) return out("problem",r.why); continue; }
      if(r.type==="mc"){ if(q && q.choices && q.choices.length>=2) return out("mc","has "+q.choices.length+" choices"); if(r.rx.test(text)) return out("mc",r.why); continue; }
      const t = r.type==="essay"||r.type==="tf"||r.type==="mtf" ? text : stem;
      if(r.rx.test(t) && !(r.not && r.not.test(t))) return out(r.type,r.why);
    }
    // long open-ended prompts that ask for judgment or explanation become essays
    const words=stem.split(/\s+/).length;
    if(words>=18 && /\b(explain|discuss|evaluate|justify|defend|analy[sz]e|argue|critique|propose|design|describe)\b/i.test(stem)) return out("essay","long open-ended prompt");
    return out("short","open question with a brief answer");
    function out(type,why){ return {type,label:TYPES[type].label,why}; }
  }
  return {TYPES, ORDER, detect};
})();
if(typeof module!=="undefined") module.exports=QType;
