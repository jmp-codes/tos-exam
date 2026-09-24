// Usage: node filetext-test.js  — reads the sample PDFs in fixtures/ and checks sections and key sentences
const FT=require('./filetext.js'),fs=require('fs');
const must=["A stack is a linear data structure that follows the Last In, First Out principle.","The average of a list is computed as A = S / n, where S is the sum of the values and n is the number of values."];
(async()=>{ let ok=0,n=0; for(const f of fs.readdirSync('fixtures').filter(x=>x.endsWith('.pdf'))){ const b=fs.readFileSync('fixtures/'+f); const r=await FT.fromPdf(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));
  const good=must.every(m=>r.text.includes(m)) || f.startsWith('long'); n++; if(good) ok++;
  console.log(`${good?'✓':'✗'} ${f.padEnd(22)} ${r.words} words · ${r.sections.length} sections: ${r.sections.map(s=>s.title).slice(0,5).join(' / ')}${r.sections.length>5?' …':''}`); }
  console.log(`${ok}/${n} PDFs read correctly`); })();
