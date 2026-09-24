const QType=require("./qtype.js"),fs=require("fs");
const f=process.argv[2]||"types-test.tsv";
const rows=fs.readFileSync(f,"utf8").split("\n").filter(l=>l.trim()&&!l.startsWith("#")).map(l=>{const i=l.indexOf("\t");return [l.slice(0,i).trim(),l.slice(i+1).replace(/\\n/g,"\n")]});
let ok=0;const per={};const miss=[];
for(const [t,q] of rows){const r=QType.detect(q);per[t]=per[t]||[0,0];per[t][1]++;if(r.type===t){ok++;per[t][0]++}else miss.push(`${t} -> ${r.type} (${r.why}): ${q.slice(0,90).replace(/\n/g," / ")}`)}
console.log(`${f}: ${ok}/${rows.length} = ${(100*ok/rows.length).toFixed(1)}%`);
for(const t in per)console.log(" ",t.padEnd(8),per[t].join("/"));
miss.forEach(m=>console.log("  MISS",m));
