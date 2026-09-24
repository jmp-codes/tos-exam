/* FileText — reads the text of a lesson file offline, in the browser: .txt, .md, .docx, .pptx and text-based .pdf.
   Returns {kind, text, sections:[{title, text}], words, warnings}. PDF reading is built in (no library):
   it inflates compressed streams, reads object streams, and maps glyphs to letters with ToUnicode maps or
   WinAnsi/Differences encodings. Scanned PDFs (pictures of pages) have no text to read. */
const FileText = (() => {
  const enc = new TextDecoder("latin1");
  const words = t => (String(t).match(/\S+/g) || []).length;
  function tidy(t){ return String(t).replace(/ /g," ").replace(/[ \t]+/g," ").replace(/ *\n */g,"\n").replace(/\n{3,}/g,"\n\n").trim(); }
  function pack(kind, sections, warnings){
    sections = sections.map(s=>({title:tidy(s.title||""), text:tidy(s.text||"")})).filter(s=>s.text||s.title);
    // merge heading-only sections into the next one
    const out=[]; for(const s of sections){ const last=out[out.length-1]; if(last && !last.text && s.title && last.title){ last.title+=" — "+s.title; last.text=s.text; } else out.push(s); }
    const text = out.map(s=>(s.title?s.title+"\n":"")+s.text).join("\n\n");
    return {kind, text, sections:out.filter(s=>s.text), words:words(text), warnings:warnings||[]};
  }
  /* ---------- plain text / markdown ---------- */
  function fromPlain(t, kind){
    const lines = String(t).replace(/\r/g,"").split("\n");
    const secs=[{title:"",text:""}];
    for(const l of lines){
      const h = l.match(/^\s*#{1,6}\s+(.+)$/) || (/^\s*(lesson|chapter|unit|module|topic|part|aralin|yunit)\b.{0,70}$/i.test(l) && !/[.?!]\s*$/.test(l) ? [0,l.trim()] : null) || (/^\s*\d+(\.\d+)*\s+[A-Z][^.?!]{2,70}$/.test(l) ? [0,l.trim()] : null);
      if(h) secs.push({title:h[1],text:""}); else secs[secs.length-1].text += l.replace(/^\s*[-*•]\s+/,"")+"\n";
    }
    return pack(kind||"txt", secs.map(s=>({title:s.title, text:s.text.replace(/([^\n])\n(?=[^\n])/g,(m,a)=>/[.?!:;]$/.test(a)?a+"\n":a+" ")})));
  }
  /* ---------- Word (.docx) ---------- */
  async function fromDocx(buf){
    if(typeof JSZip==="undefined") throw new Error("The Word reader didn’t load. Check your connection and reload.");
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file("word/document.xml").async("string");
    const doc = new DOMParser().parseFromString(xml,"application/xml");
    const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const body = doc.getElementsByTagNameNS(W,"body")[0];
    const secs=[{title:"",text:""}];
    const ptext = p => { let t=""; for(const n of p.getElementsByTagNameNS(W,"*")){ if(n.localName==="t") t+=n.textContent; else if(n.localName==="tab") t+=" "; else if(n.localName==="br"||n.localName==="cr") t+=" "; } return t.trim(); };
    for(const el of Array.from(body.children)){
      if(el.localName==="p"){
        const t=ptext(el); if(!t) continue;
        const sty=(el.getElementsByTagNameNS(W,"pStyle")[0]?.getAttributeNS(W,"val")||"").toLowerCase();
        if(/^(heading|title|subtitle)|^berschrift|^titre/.test(sty) || /^heading\d/.test(sty)) secs.push({title:t,text:""});
        else secs[secs.length-1].text += t + (/[.?!:;]$/.test(t)?"":".") + "\n";
      } else if(el.localName==="tbl"){
        for(const tr of el.getElementsByTagNameNS(W,"tr")){
          const cells=Array.from(tr.getElementsByTagNameNS(W,"tc")).map(tc=>Array.from(tc.getElementsByTagNameNS(W,"p")).map(ptext).filter(Boolean).join(" ")).filter(Boolean);
          if(cells.length) secs[secs.length-1].text += cells.join(" — ") + (/[.?!]$/.test(cells[cells.length-1])?"":".") + "\n";
        }
      }
    }
    return pack("docx", secs);
  }
  /* ---------- PowerPoint (.pptx) ---------- */
  async function fromPptx(buf){
    if(typeof JSZip==="undefined") throw new Error("The PowerPoint reader didn’t load. Check your connection and reload.");
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>+a.match(/(\d+)\.xml/)[1]-+b.match(/(\d+)\.xml/)[1]);
    const A="http://schemas.openxmlformats.org/drawingml/2006/main", P="http://schemas.openxmlformats.org/presentationml/2006/main";
    const secs=[];
    for(const n of names){
      const doc=new DOMParser().parseFromString(await zip.file(n).async("string"),"application/xml");
      let title="", text="";
      for(const sp of doc.getElementsByTagNameNS(P,"sp")){
        const ph=sp.getElementsByTagNameNS(P,"ph")[0]; const isTitle=ph && /title/i.test(ph.getAttribute("type")||"");
        const paras=Array.from(sp.getElementsByTagNameNS(A,"p")).map(p=>({t:Array.from(p.getElementsByTagNameNS(A,"t")).map(t=>t.textContent).join("").trim(), lvl:+(p.getElementsByTagNameNS(A,"pPr")[0]?.getAttribute("lvl")||0)})).filter(x=>x.t);
        if(isTitle) title=paras.map(x=>x.t).join(" ");
        else for(let k=0;k<paras.length;k++){ const x=paras[k], nx=paras[k+1];
          // a short bullet followed by an indented one: "Term" + "Defines …" → "Term – Defines …"
          if(nx && nx.lvl>x.lvl && x.t.split(" ").length<=7 && !/[.:;]$/.test(x.t)){ text+=x.t+" – "+nx.t.replace(/[.;]$/,"")+".\n"; k++; continue; }
          text+=x.t+(/[.?!:;]$/.test(x.t)?"":".")+"\n"; }
      }
      secs.push({title,text});
    }
    return pack("pptx", secs);
  }
  /* ---------- PDF ---------- */
  async function inflate(bytes){
    if(typeof DecompressionStream==="undefined") throw new Error("This browser can’t read compressed PDFs. Try a recent Chrome, Edge or Firefox.");
    for(const fmt of ["deflate","deflate-raw"]){
      const ds=new DecompressionStream(fmt), w=ds.writable.getWriter(), r=ds.readable.getReader(), chunks=[]; let n=0;
      const src = fmt==="deflate-raw" ? bytes.subarray(2) : bytes;
      w.write(src).catch(()=>{}); w.close().catch(()=>{});
      try{ for(;;){ const {value,done}=await r.read(); if(done) break; chunks.push(value); n+=value.length; } }catch(e){ /* keep what inflated before any trailing junk */ }
      if(n){ const out=new Uint8Array(n); let o=0; for(const c of chunks){ out.set(c,o); o+=c.length; } return out; }
    }
    return new Uint8Array(0);
  }
  // tiny PDF object parser (enough for dictionaries, arrays, names, numbers, strings, refs)
  function parseObj(s, i){
    const ws=()=>{ for(;;){ while(i<s.length && /[\s\0]/.test(s[i])) i++; if(s[i]==="%"){ while(i<s.length && s[i]!=="\n" && s[i]!=="\r") i++; } else break; } };
    function val(){
      ws(); const c=s[i];
      if(c==="<" && s[i+1]==="<"){ i+=2; const d={}; for(;;){ ws(); if(s[i]===">"&&s[i+1]===">"){ i+=2; return d; } if(s[i]!=="/"){ if(i>=s.length) return d; i++; continue; } const k=name(); d[k]=val(); } }
      if(c==="["){ i++; const a=[]; for(;;){ ws(); if(s[i]==="]"){ i++; return a; } if(i>=s.length) return a; a.push(val()); } }
      if(c==="/") return {name:name()};
      if(c==="(") return {str:litStr()};
      if(c==="<"){ i++; let h=""; while(i<s.length && s[i]!==">") h+=s[i++]; i++; return {hex:h.replace(/\s/g,"")}; }
      const m=/^[+-]?(\d+\.?\d*|\.\d+)/.exec(s.slice(i,i+32));
      if(m){ i+=m[0].length; const r=/^\s+(\d+)\s+R\b/.exec(s.slice(i,i+24)); if(r && /^\d+$/.test(m[0])){ i+=r[0].length; return {ref:+m[0]}; } return +m[0]; }
      const w=/^[A-Za-z]+/.exec(s.slice(i,i+16)); if(w){ i+=w[0].length; return w[0]==="true"?true:w[0]==="false"?false:null; }
      i++; return null;
    }
    function name(){ i++; let n=""; while(i<s.length && !/[\s\/\[\]<>()%{}]/.test(s[i])) n+=s[i++]; return n.replace(/#([0-9a-fA-F]{2})/g,(m,h)=>String.fromCharCode(parseInt(h,16))); }
    function litStr(){ i++; let d=1, o=""; while(i<s.length){ const c=s[i++]; if(c==="\\"){ const e=s[i++]; const map={n:"\n",r:"\r",t:"\t",b:"\b",f:"\f"}; if(map[e]) o+=map[e]; else if(/[0-7]/.test(e)){ let oc=e; while(oc.length<3 && /[0-7]/.test(s[i])) oc+=s[i++]; o+=String.fromCharCode(parseInt(oc,8)&255); } else if(e==="\r"){ if(s[i]==="\n") i++; } else if(e!=="\n") o+=e; } else if(c==="("){ d++; o+=c; } else if(c===")"){ if(--d===0) break; o+=c; } else o+=c; } return o; }
    const v=val(); return {v, end:i};
  }
  const GLYPH={space:" ",exclam:"!",quotedbl:"\"",numbersign:"#",dollar:"$",percent:"%",ampersand:"&",quotesingle:"'",quoteright:"’",quoteleft:"‘",parenleft:"(",parenright:")",asterisk:"*",plus:"+",comma:",",hyphen:"-",period:".",slash:"/",zero:"0",one:"1",two:"2",three:"3",four:"4",five:"5",six:"6",seven:"7",eight:"8",nine:"9",colon:":",semicolon:";",less:"<",equal:"=",greater:">",question:"?",at:"@",bracketleft:"[",backslash:"\\",bracketright:"]",underscore:"_",braceleft:"{",bar:"|",braceright:"}",quotedblleft:"“",quotedblright:"”",endash:"–",emdash:"—",bullet:"•",fi:"fi",fl:"fl",ff:"ff",ffi:"ffi",ffl:"ffl",ellipsis:"…",ntilde:"ñ",Ntilde:"Ñ",eacute:"é",degree:"°",multiply:"×",divide:"÷",minus:"−",periodcentered:"·",nbspace:" ",copyright:"©",registered:"®",trademark:"™"};
  const WIN={128:"€",130:"‚",132:"„",133:"…",134:"†",135:"‡",137:"‰",139:"‹",140:"Œ",145:"‘",146:"’",147:"“",148:"”",149:"•",150:"–",151:"—",153:"™",155:"›",156:"œ",160:" "};
  const gname = n => GLYPH[n] || (/^[A-Za-z]$/.test(n)?n:null) || (/^uni([0-9A-F]{4})/.test(n)?String.fromCharCode(parseInt(n.slice(3,7),16)):null) || (/^[A-Za-z](\.|_)/.test(n)?n[0]:"");
  function parseCMap(s){
    const map={}; let bytes=1;
    const cs=/begincodespacerange([\s\S]*?)endcodespacerange/.exec(s); if(cs){ const h=/<([0-9a-fA-F]+)>/.exec(cs[1]); if(h) bytes=h[1].length/2; }
    const hex2str=h=>{ let o=""; for(let k=0;k+4<=h.length;k+=4) o+=String.fromCharCode(parseInt(h.slice(k,k+4),16)); if(h.length===2) o=String.fromCharCode(parseInt(h,16)); return o; };
    for(const b of s.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for(const m of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) map[parseInt(m[1],16)]=hex2str(m[2]);
    for(const b of s.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)){
      for(const m of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]+)>|\[([^\]]*)\])/g)){
        const lo=parseInt(m[1],16), hi=parseInt(m[2],16);
        if(m[4]!==undefined){ const base=m[4]; const start=parseInt(base.slice(-4)||base,16), pre=hex2str(base.slice(0,-4)); for(let c=lo;c<=hi && c-lo<65536;c++) map[c]=pre+String.fromCharCode(start+(c-lo)); }
        else { const arr=[...m[5].matchAll(/<([0-9a-fA-F]*)>/g)].map(x=>hex2str(x[1])); for(let c=lo;c<=hi;c++) map[c]=arr[c-lo]||""; }
      }
    }
    return {map, bytes};
  }
  function a85(b){ const t=enc.decode(b).replace(/\s/g,"").replace(/^<~/,"").replace(/~>.*$/,""); const out=[]; let g=[];
    const emit=(g,n)=>{ let v=0; for(let k=0;k<5;k++) v=v*85+((g[k]??84)); for(let k=0;k<n;k++) out.push((v>>>(24-8*k))&255); };
    for(const c of t){ if(c==="z"&&!g.length){ out.push(0,0,0,0); continue; } g.push(c.charCodeAt(0)-33); if(g.length===5){ emit(g,4); g=[]; } }
    if(g.length) emit(g,g.length-1); return new Uint8Array(out); }
  function ahx(b){ const t=enc.decode(b).replace(/[^0-9a-fA-F]/g,""); const out=new Uint8Array(Math.ceil(t.length/2)); for(let k=0;k<out.length;k++) out[k]=parseInt((t.slice(2*k,2*k+2)+"0").slice(0,2),16); return out; }
  async function fromPdf(buf){
    const bytes=new Uint8Array(buf); const s=enc.decode(bytes);
    if(!/^%PDF/.test(s.slice(0,1024).replace(/^[^%]*/,""))) throw new Error("This doesn’t look like a PDF file.");
    if(/\/Encrypt\s/.test(s)) return pack("pdf",[],["This PDF is password-protected or encrypted, so its text can’t be read. Save an unprotected copy and try again."]);
    const objs={}, streams={};
    // plain objects
    const re=/(\d+)\s+(\d+)\s+obj\b/g; let m;
    while((m=re.exec(s))){
      const num=+m[1]; let i=m.index+m[0].length;
      const p=parseObj(s,i); let v=p.v; i=p.end;
      const after=s.slice(i,i+40).match(/^\s*stream\r?\n/);
      if(after && v && typeof v==="object"){
        const st=i+after[0].length; let len=typeof v.Length==="number"?v.Length:-1; let end;
        if(len>=0 && s.slice(st+len,st+len+30).match(/^\s*endstream/)) end=st+len; else { end=s.indexOf("endstream",st); if(end<0) end=s.length; }
        streams[num]={dict:v, raw:bytes.subarray(st,end)};
        re.lastIndex=end;
      }
      objs[num]=v;
    }
    const get=x=>{ let g=0; while(x && x.ref!==undefined && g++<20) x=objs[x.ref]; return x; };
    const filters=d=>{ const f=get(d.Filter); return Array.isArray(f)?f.map(x=>get(x).name):f?[f.name]:[]; };
    const data=async num=>{ const st=streams[num]; if(!st) return ""; if(st.text!==undefined) return st.text; const fs=filters(st.dict); let b=st.raw;
      for(const f of fs){ if(f==="FlateDecode"||f==="Fl") b=await inflate(b); else if(f==="ASCII85Decode"||f==="A85") b=a85(b); else if(f==="ASCIIHexDecode"||f==="AHx") b=ahx(b); else return st.text=""; }
      return st.text=enc.decode(b); };
    // object streams (PDF 1.5+): objects packed inside a compressed stream
    for(const [num,st] of Object.entries(streams)){
      if(get(st.dict.Type)?.name!=="ObjStm") continue;
      const t=await data(num); const n=get(st.dict.N)|0, first=get(st.dict.First)|0;
      const head=t.slice(0,first).trim().split(/\s+/).map(Number);
      for(let k=0;k<n;k++){ const on=head[2*k], off=head[2*k+1]; if(objs[on]===undefined) objs[on]=parseObj(t,first+off).v; }
    }
    // pages in order
    const root=get(Object.values(objs).find(o=>o&&get(o.Type)?.name==="Catalog")?.Pages) || null;
    const pages=[];
    const walk=(node,inh,depth)=>{ node=get(node); if(!node||depth>40) return; const res=node.Resources!==undefined?node.Resources:inh;
      if(get(node.Type)?.name==="Page"||(!node.Kids&&node.Contents)) pages.push({node,res}); else (get(node.Kids)||[]).forEach(k=>walk(k,res,depth+1)); };
    if(root) walk(root,null,0);
    if(!pages.length) Object.values(objs).forEach(o=>{ if(o&&get(o.Type)?.name==="Page") pages.push({node:o,res:o.Resources}); });
    const fontCache=new Map();
    async function font(fref){
      const key=fref&&fref.ref!==undefined?fref.ref:fref; if(fontCache.has(key)) return fontCache.get(key);
      const f=get(fref)||{}; const out={map:null,bytes:1,enc:null,diff:{}};
      if(f.ToUnicode && f.ToUnicode.ref!==undefined){ const cm=parseCMap(await data(f.ToUnicode.ref)); out.map=cm.map; out.bytes=cm.bytes; }
      if(get(f.Subtype)?.name==="Type0"){ out.bytes=2; }
      const e=get(f.Encoding); if(e && e.name) out.enc=e.name; else if(e && typeof e==="object"){ out.enc=get(e.BaseEncoding)?.name||null; const d=get(e.Differences)||[]; let c=0; for(const x of d){ const v=get(x); if(typeof v==="number") c=v; else if(v&&v.name){ out.diff[c++]=gname(v.name); } } }
      fontCache.set(key,out); return out;
    }
    const decodeStr=(raw,f)=>{ let o=""; const b=f?f.bytes:1;
      for(let k=0;k<raw.length;k+=b){ const code=b===2?(raw.charCodeAt(k)<<8)|(raw.charCodeAt(k+1)||0):raw.charCodeAt(k);
        if(f&&f.map&&f.map[code]!==undefined) o+=f.map[code]; else if(f&&f.diff[code]!==undefined) o+=f.diff[code]; else if(b===1) o+=WIN[code]||(code>=32?String.fromCharCode(code):""); }
      return o; };
    const mul=(a,b)=>[a[0]*b[0]+a[1]*b[2],a[0]*b[1]+a[1]*b[3],a[2]*b[0]+a[3]*b[2],a[2]*b[1]+a[3]*b[3],a[4]*b[0]+a[5]*b[2]+b[4],a[4]*b[1]+a[5]*b[3]+b[5]];
    const allLines=[]; let scanned=0;
    for(let pi=0;pi<pages.length;pi++){
      const {node}=pages[pi]; const res=get(pages[pi].res)||{}; const fonts=get(res.Font)||{};
      const xobj=get(res.XObject)||{};
      let contents=get(node.Contents); if(!contents) continue; const list=Array.isArray(contents)?contents:[node.Contents];
      let cs=""; for(const c of list){ if(c&&c.ref!==undefined) cs+=(await data(c.ref))+"\n"; }
      const runs=[];
      const run=async(cs,fontsD,base,depth)=>{
        let ctm=base.slice(), stack=[], tm=[1,0,0,1,0,0], tlm=[1,0,0,1,0,0], fsz=12, lead=0, f=null, ops=[], i=0, hz=1, cspace=0;
        while(i<cs.length){
          const c=cs[i];
          if(/\s/.test(c)){ i++; continue; }
          if(c==="%"){ while(i<cs.length&&cs[i]!=="\n") i++; continue; }
          if(c==="("||c==="["||c==="/"||c==="<"||c==="-"||c==="+"||c==="."||/\d/.test(c)){ const p=parseObj(cs,i); ops.push(p.v); i=p.end; continue; }
          const w=/^[A-Za-z'"*]+[0-9]?/.exec(cs.slice(i,i+4)); const op=w?w[0]:cs[i]; i+=op.length;
          const A=ops; ops=[];
          const show=(str)=>{ const t=decodeStr(str,f); const M=mul(tm,ctm); const size=fsz*Math.sqrt(Math.abs(M[0]*M[3]-M[1]*M[2]))||fsz; runs.push({x:M[4],y:M[5],t,size,page:pi});
            tm=[tm[0],tm[1],tm[2],tm[3],tm[4]+(t.length*fsz*0.5*hz+cspace*t.length)*tm[0],tm[5]+(t.length*fsz*0.5*hz)*tm[1]]; };
          switch(op){
            case "q": stack.push(ctm.slice()); break;
            case "Q": ctm=stack.pop()||base.slice(); break;
            case "cm": if(A.length>=6) ctm=mul(A.slice(-6),ctm); break;
            case "BT": tm=[1,0,0,1,0,0]; tlm=tm.slice(); break;
            case "Tf": { const fn=A[0]&&A[0].name; fsz=+A[1]||fsz; f=fn&&fontsD[fn]?await font(fontsD[fn]):null; break; }
            case "Tz": hz=(+A[0]||100)/100; break;
            case "Tc": cspace=+A[0]||0; break;
            case "TL": lead=+A[0]||0; break;
            case "Td": case "TD": { const tx=+A[0]||0, ty=+A[1]||0; if(op==="TD") lead=-ty; tlm=mul([1,0,0,1,tx,ty],tlm); tm=tlm.slice(); break; }
            case "Tm": if(A.length>=6){ tlm=A.slice(0,6).map(Number); tm=tlm.slice(); } break;
            case "T*": tlm=mul([1,0,0,1,0,-lead],tlm); tm=tlm.slice(); break;
            case "Tj": if(A[0]) show(A[0].str!==undefined?A[0].str:hexStr(A[0].hex)); break;
            case "'": tlm=mul([1,0,0,1,0,-lead],tlm); tm=tlm.slice(); if(A[0]) show(A[0].str!==undefined?A[0].str:hexStr(A[0].hex)); break;
            case "\"": tlm=mul([1,0,0,1,0,-lead],tlm); tm=tlm.slice(); if(A[2]) show(A[2].str!==undefined?A[2].str:hexStr(A[2].hex)); break;
            case "TJ": { const arr=A[0]||[]; let str="", first=true; const flush=()=>{ if(str){ show(str); str=""; } };
              for(const el of arr){ if(el&&(el.str!==undefined||el.hex!==undefined)) str+=el.str!==undefined?el.str:hexStr(el.hex); else if(typeof el==="number"){ if(el<-180){ flush(); const M=mul(tm,ctm); runs.push({x:M[4],y:M[5],t:" ",size:fsz,page:pi,gap:true}); } } }
              flush(); break; }
            case "Do": { const x=A[0]&&A[0].name&&xobj[A[0].name]; if(x&&x.ref!==undefined&&depth<4){ const st=streams[x.ref]; if(st&&get(st.dict.Subtype)?.name==="Form"){ const r2=get(st.dict.Resources)||{}; const m2=get(st.dict.Matrix)||[1,0,0,1,0,0]; await run(await data(x.ref), get(r2.Font)||fontsD, mul(m2.map(Number),ctm), depth+1); } else if(st&&get(st.dict.Subtype)?.name==="Image") scanned++; } break; }
            case "BI": { const e=cs.indexOf("EI",i); i=e<0?cs.length:e+2; break; }
          }
        }
      };
      await run(cs,fonts,[1,0,0,1,0,0],0);
      // group runs into lines (top to bottom, left to right)
      const lines=[];
      for(const r of runs){ if(!r.t) continue; let L=lines.find(l=>Math.abs(l.y-r.y)<=Math.max(2,r.size*0.35)); if(!L){ L={y:r.y,size:r.size,runs:[],page:pi}; lines.push(L); } L.runs.push(r); L.size=Math.max(L.size,r.gap?0:r.size); }
      lines.sort((a,b)=>b.y-a.y);
      for(const L of lines){ L.runs.sort((a,b)=>a.x-b.x); let t="", endX=null;
        for(const r of L.runs){ if(r.gap){ if(!/\s$/.test(t)) t+=" "; continue; } if(endX!==null && r.x-endX>r.size*0.18 && !/\s$/.test(t) && !/^\s/.test(r.t)) t+=" "; t+=r.t; endX=r.x+r.t.length*r.size*0.45; }
        L.text=t.replace(/\s+/g," ").trim(); if(L.text) allLines.push(L); }
    }
    if(!allLines.length) return pack("pdf",[],[scanned?"This PDF looks scanned (pictures of pages), so there is no text to read. Use the original Word or PowerPoint file, or copy and paste the text.":"No readable text was found in this PDF."]);
    // lines → paragraphs and sections
    const sizes=allLines.map(l=>l.size).sort((a,b)=>a-b), body=sizes[Math.floor(sizes.length/2)];
    const gaps=[]; for(let k=1;k<allLines.length;k++) if(allLines[k].page===allLines[k-1].page){ const g=allLines[k-1].y-allLines[k].y; if(g>0) gaps.push(g); }
    gaps.sort((a,b)=>a-b); const lineGap=gaps.length?gaps[Math.floor(gaps.length*0.3)]:body*1.2;
    const repeated=new Set(); { const cnt={}, pg={}; allLines.forEach(l=>{ const k=l.text.replace(/\d+/g,"#"); cnt[k]=(cnt[k]||0)+1; (pg[k]=pg[k]||new Set()).add(l.page); }); Object.entries(cnt).forEach(([k,n])=>{ const np=pg[k].size; if(np>=2 && np>=pages.length*0.6 && n<=pages.length+1 && k.length<90) repeated.add(k); }); }
    const lens=allLines.map(l=>l.text.length).sort((a,b)=>a-b), fullLen=lens[Math.floor(lens.length*0.75)]||80;
    const BUL=/^[•▪◦●\-–\uE000-\uF8FF]\s*/;
    const secs=[{title:"",text:""}]; let para="";
    const endPara=()=>{ const t=para.trim(); if(t){ secs[secs.length-1].text+=t+(/[.?!:;]$/.test(t)?"":".")+"\n"; } para=""; };
    for(let k=0;k<allLines.length;k++){
      const L=allLines[k], prev=allLines[k-1];
      if(repeated.has(L.text.replace(/\d+/g,"#")) || /^(page\s*)?\d+(\s*(of|\/)\s*\d+)?$/i.test(L.text)) continue;
      const heading = L.size>=body*1.15 && L.text.length<=90 && !/[.,;]$/.test(L.text) || (/^(lesson|chapter|unit|module|aralin)\s+\d+/i.test(L.text) && L.text.length<=90);
      if(heading){ endPara(); const last=secs[secs.length-1]; if(!last.text && last.title && prev && prev.size>=body*1.15) last.title+=" "+L.text; else secs.push({title:L.text,text:""}); continue; }
      const newPara = !prev || prev.page!==L.page || (prev.y-L.y)>lineGap*1.45 || BUL.test(L.text) || (prev.text.length<fullLen*0.6 && !/[-,]$/.test(prev.text));
      if(newPara) endPara();
      const t=L.text.replace(BUL,"");
      if(para && /[A-Za-z]-$/.test(para) && /^[a-z]/.test(t)) para=para.slice(0,-1)+t; else para+=(para?" ":"")+t;
    }
    endPara();
    return pack("pdf", secs, scanned&&allLines.length<pages.length*3?["Some pages look scanned (pictures), so their text couldn’t be read."]:[]);
    function hexStr(h){ h=h||""; if(h.length%2) h+="0"; let o=""; for(let k=0;k<h.length;k+=2) o+=String.fromCharCode(parseInt(h.slice(k,k+2),16)); return o; }
  }
  async function read(file){
    const name=(file.name||"").toLowerCase(); const buf=await file.arrayBuffer();
    const head=enc.decode(new Uint8Array(buf.slice(0,5)));
    if(/\.pdf$/.test(name)||head==="%PDF-") return fromPdf(buf);
    if(/\.docx$/.test(name)) return fromDocx(buf);
    if(/\.pptx$/.test(name)) return fromPptx(buf);
    if(/\.(doc|ppt)$/.test(name)) throw new Error("Old .doc and .ppt files can’t be read. Save the file as .docx or .pptx (or PDF) and upload it again.");
    if(/\.(txt|md|markdown|text|csv)$/.test(name)||!/\.[a-z0-9]+$/.test(name)) return fromPlain(new TextDecoder("utf-8").decode(buf), /\.md|markdown$/.test(name)?"md":"txt");
    throw new Error("This file type isn’t supported. Upload a .pdf, .docx, .pptx or .txt file.");
  }
  return {read, fromPdf, fromDocx, fromPptx, fromPlain, parseCMap};
})();
if(typeof module!=="undefined") module.exports=FileText;
