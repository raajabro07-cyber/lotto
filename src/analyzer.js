
import fs from "fs"; import path from "path";
const FILE=path.resolve("data/full_ticket_6digit_2021_2026.csv"); let rows=[];
function parse(line){const o=[];let c="",q=false;for(let i=0;i<line.length;i++){const x=line[i];if(x=='"'){if(q&&line[i+1]=='"'){c+='"';i++;}else q=!q;}else if(x==","&&!q){o.push(c);c="";}else c+=x;}o.push(c);return o;}
export function loadData(){if(!fs.existsSync(FILE))return 0;const ls=fs.readFileSync(FILE,"utf8").replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean);if(ls.length<2)return 0;const h=parse(ls.shift());rows=ls.map(l=>{const v=parse(l),o={};h.forEach((k,i)=>o[k]=v[i]||"");return o;}).filter(r=>/^\d{6}$/.test(r.winning_number||""));return rows.length;}
function count(f,v){let n=0;for(const r of rows)if(r[f]===v)n++;return n;}
export function analyzeTicket(series,number){const n=String(number).replace(/\D/g,"");if(n.length!==6)return null;const exact=count("winning_number",n),l2=count("last2",n.slice(-2)),l3=count("last3",n.slice(-3)),l4=count("last4",n.slice(-4));const u=new Set(n).size;const bal=u>=5?15:u>=4?10:5;const score=Math.max(0,Math.min(100,Math.round(Math.min(30,Math.log10(l4+1)*18)+Math.min(25,Math.log10(l3+1)*12)+Math.min(20,Math.log10(l2+1)*7)+Math.min(10,exact*3)+bal)));return{series:(series||"").toUpperCase(),number:n,score,exact,last2:l2,last3:l3,last4:l4};}
export function rankTickets(t){return t.map(x=>analyzeTicket(x.series,x.number)).filter(Boolean).sort((a,b)=>b.score-a.score);}
export function dataCount(){return rows.length;}
