
import fs from "fs"; import path from "path";
const FILE=path.resolve("data/first_prize_history.csv"); let rows=[];
function p(line){const a=[];let c="",q=false;for(let i=0;i<line.length;i++){const x=line[i];if(x=='"'){if(q&&line[i+1]=='"'){c+='"';i++;}else q=!q;}else if(x==","&&!q){a.push(c);c="";}else c+=x;}a.push(c);return a;}
export function loadData(){const ls=fs.readFileSync(FILE,"utf8").replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean),h=p(ls.shift());rows=ls.map(l=>{const v=p(l),o={};h.forEach((k,i)=>o[k]=v[i]||"");o.num=o.first_prize_number;o.date=new Date(o.draw_date+"T00:00:00Z");return o;}).filter(r=>/^\d{6}$/.test(r.num)&&!isNaN(r.date)).sort((a,b)=>a.date-b.date);return rows.length;}
const days=(a,b)=>Math.floor((a-b)/86400000);
const within=(now,d)=>rows.filter(r=>{const x=days(now,r.date);return x>=0&&x<=d;});
const suf=(s,set=rows)=>set.filter(r=>r.num.endsWith(s)).length;
const exact=(n,set=rows)=>set.filter(r=>r.num===n).length;
function lastS(s,now){const a=rows.filter(r=>r.date<=now&&r.num.endsWith(s));return a.length?days(now,a.at(-1).date):null;}
function lastE(n,now){const a=rows.filter(r=>r.date<=now&&r.num===n);return a.length?days(now,a.at(-1).date):null;}
const pct=(a,b)=>b?+(100*a/b).toFixed(2):0;
function prof4(s,now){
 const r30=within(now,30),r90=within(now,90),r180=within(now,180),r365=within(now,365);
 const all=suf(s),c30=suf(s,r30),c90=suf(s,r90),c180=suf(s,r180),c365=suf(s,r365),yearly={};
 for(const r of rows)if(r.num.endsWith(s)){const y=r.draw_date.slice(0,4);yearly[y]=(yearly[y]||0)+1;}
 const years=new Set(rows.map(r=>r.draw_date.slice(0,4))).size||1,active=Object.keys(yearly).length,lg=lastS(s,now);
 let score=Math.min(40,c365*8)+Math.min(20,c180*5)+Math.min(15,c90*4)+Math.min(10,all*2)+Math.min(15,(active/years)*15);
 if(lg!==null&&lg<=2)score-=8; else if(lg!==null&&lg<=4)score-=4;
 return{s,all,c30,c90,c180,c365,yearly,lastGap:lg,score:Math.max(0,Math.min(100,Math.round(score))),rate365:pct(c365,r365.length),rateAll:pct(all,rows.length)};
}
function prof6(n,now){const r365=within(now,365),all=exact(n),c365=exact(n,r365),lg=lastE(n,now);let score=Math.min(100,c365*25+all*10);if(lg!==null&&lg<=2)score=Math.max(0,score-8);return{all,c365,lastGap:lg,score,rate365:pct(c365,r365.length)};}
function ham(a,b){let n=0;for(let i=0;i<4;i++)if(a[i]!==b[i])n++;return n;}
function candidates(input,now){
 const x=Number(input),a=[];
 for(let i=0;i<10000;i++){const s=String(i).padStart(4,"0"),dist=Math.abs(i-x),h=ham(input,s);if(s===input|| (dist>100&&h>2))continue;const q=prof4(s,now);if(q.all===0)continue;
 const prox=dist<=10?10:dist<=25?7:dist<=50?4:dist<=100?2:0,fam=h===1?8:h===2?3:0,rank=q.score+prox+fam;a.push({...q,dist,ham:h,rank});}
 return a.sort((a,b)=>b.rank-a.rank||b.c365-a.c365||b.all-a.all).filter(c=>c.score>=45&&(c.c365>=2||c.all>=3)).slice(0,5);
}
export function analyze(input,now=new Date()){const d=String(input).replace(/\D/g,"");if(d.length!==4&&d.length!==6)return null;const s=d.slice(-4);return{input:d,suffix:s,p4:prof4(s,now),e6:d.length===6?prof6(d,now):null,suggestions:candidates(s,now),asOf:now.toISOString().slice(0,10)};}
export function status(){return{rows:rows.length,lastDate:rows.at(-1)?.draw_date||null};}
