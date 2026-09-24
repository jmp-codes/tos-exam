/* BloomAI — a small Bloom's-level classifier that trains and runs in the browser.
   Multinomial logistic regression over word, word-pair and question-opening features. */
const BloomAI = (() => {
  const LEVELS = ["Remembering","Understanding","Applying","Analyzing","Evaluating","Creating"];
  const STOP = new Set(["the","a","an","of","to","in","and","is","are","for","on","with","that","this","be","by","as","at","it","its","from","or","your","you","each","their","given","following"]);
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
    const best=p.indexOf(Math.max(...p));
    // top words that pushed toward the chosen level, for explanation
    const NICE={"x:reasoning_ask":"asks for reasons","x:code":"code","w:blankslot":"fill-in blank","x:has_numbers":"numbers","x:many_numbers":"numbers"};
    const SKIP=/^(x:(short|medium|long|very_long|question_mark)|[a-z0-9]+:(the|is|are|a|an|of|which|what|to|in|it|this|that|0)$)/;
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
    return {level:model.levels[best], confidence:p[best], probs:Object.fromEntries(model.levels.map((l,i)=>[l,p[i]])), why};
  }
  return {LEVELS, features, train, predict};
})();
if(typeof module!=="undefined") module.exports=BloomAI;
