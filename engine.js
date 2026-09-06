
import fs from "fs";
const FOUR=JSON.parse(fs.readFileSync("data/four_index.json","utf8"));
const FIRST=JSON.parse(fs.readFileSync("data/first_index.json","utf8"));
const META=JSON.parse(fs.readFileSync("data/meta.json","utf8"));
const SYNC="data/synced_results.json";
let synced=[];try{synced=JSON.parse(fs.readFileSync(SYNC,"utf8"));if(!Array.isArray(synced))synced=[];}catch{synced=[];}

const DAY=86400000,D=s=>new Date(s+"T00:00:00Z"),diff=(a,b)=>Math.floor((a-b)/DAY);
function todayIST(){
 const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const o={};for(const x of p)o[x.type]=x.value;return `${o.year}-${o.month}-${o.day}`;
}
function validIso(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||"")))return false;const d=D(s);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}
function isFuture(s){return validIso(s)&&s>todayIST();}
synced=synced.filter(r=>validIso(r.draw_date)&&!isFuture(r.draw_date));try{fs.writeFileSync(SYNC,JSON.stringify(synced));}catch{}

function syncDates(n){return synced.filter(r=>r.kind==="four"&&r.winning_number===n).map(r=>r.draw_date);}
function dates(n){return [...(FOUR[n]?.dates||[]),...syncDates(n)].filter(d=>validIso(d)&&!isFuture(d)).sort();}
function total(n){return (FOUR[n]?.count||0)+synced.filter(r=>r.kind==="four"&&r.winning_number===n).length;}
export function status(){
 let latestComplete=META.static_last_complete||null,latestAny=latestComplete;
 for(const r of synced){
   if(!latestAny||r.draw_date>latestAny)latestAny=r.draw_date;
   if(r.kind==="draw"&&r.complete===true&&(!latestComplete||r.draw_date>latestComplete))latestComplete=r.draw_date;
 }
 return{fourHistoricalRows:Object.values(FOUR).reduce((a,x)=>a+x.count,0),fourUnique:Object.keys(FOUR).length,
   firstRows:FIRST.length,syncedRows:synced.length,lastDate:latestAny,lastCompleteDate:latestComplete};
}
function prof(n,now){
 const ds=dates(n),h=k=>ds.filter(d=>{const q=diff(now,D(d));return q>=0&&q<=k}).length;
 let last=null;for(let i=ds.length-1;i>=0;i--){const q=diff(now,D(ds[i]));if(q>=0){last={date:ds[i],days:q};break;}}
 let score=Math.min(42,h(365)*7)+Math.min(18,h(180)*4)+Math.min(12,h(90)*3)+Math.min(28,total(n)*1.4);
 return{s:n,total:total(n),h30:h(30),h90:h(90),h180:h(180),h365:h(365),last,score:Math.min(100,Math.round(score)),cooldown:!!(last&&last.days<=6)};
}
function ham(a,b){let c=0;for(let i=0;i<4;i++)if(a[i]!==b[i])c++;return c;}
function suggest(n,now){
 const x=Number(n),a=[];
 for(const s of Object.keys(FOUR)){if(s===n)continue;const dist=Math.abs(Number(s)-x),h=ham(n,s);if(dist>150&&h>2)continue;
   const p=prof(s,now);if(p.cooldown)continue;if(p.h365===0&&p.total<2)continue;
   const rank=p.score+(dist<=10?12:dist<=30?8:dist<=75?5:2)+(h===1?10:h===2?4:0);a.push({...p,dist,ham:h,rank});}
 return a.sort((a,b)=>b.rank-a.rank||b.h365-a.h365||b.total-a.total).slice(0,5);
}
function root(n){let s=[...n].reduce((a,c)=>a+Number(c),0);while(s>9)s=[...String(s)].reduce((a,c)=>a+Number(c),0);return s;}
function struct(n){
 const d=[...n].map(Number);let doubles=0,triples=0,serial=0;for(let i=0;i<5;i++){if(d[i]===d[i+1])doubles++;if(Math.abs(d[i]-d[i+1])===1)serial++;}
 for(let i=0;i<4;i++)if(d[i]===d[i+1]&&d[i]===d[i+2])triples++;const c={};d.forEach(x=>c[x]=(c[x]||0)+1);
 const maxRepeat=Math.max(...Object.values(c)),fams=[[0,1,2,3],[1,2,3,4],[2,3,4,5],[3,4,5,6],[4,5,6,7],[5,6,7,8],[6,7,8,9]];
 let density=0;for(const f of fams)density=Math.max(density,f.filter(x=>d.includes(x)).length);
 return{doubles,triples,serial,maxRepeat,density,root:root(n),score:Math.min(100,doubles*15+triples*12+serial*8+(maxRepeat>=3?20:maxRepeat===2?10:0)+density*5)};
}
function first(n,now){
 const s=struct(n),dr=root(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(now).replace(/\D/g,"")),rm=Math.max(0,100-Math.abs(s.root-dr)*18);
 let best=6;for(const r of FIRST){let same=0;for(let i=0;i<6;i++)if(r.n[i]===n[i])same++;best=Math.min(best,6-same);}
 const sim=Math.max(0,100-best*16),p4=prof(n.slice(-4),now);let score=Math.round(s.score*.5+sim*.3+rm*.2);if(p4.cooldown)score-=15;
 return{structure:s,rootMatch:rm,simScore:sim,score:Math.max(0,score),red:score>=78&&!p4.cooldown};
}
export function analyzeInput(input,now=new Date()){
 const d=String(input).replace(/\D/g,"");if(d.length!==4&&d.length!==6)return null;const f=d.slice(-4);
 return{input:d,four:f,p4:prof(f,now),suggestions:suggest(f,now),first:d.length===6?first(d,now):null,asOf:todayIST()};
}
export function addFullResult(r){
 if(!validIso(r.draw_date))return{added4:0,added1:0,rejected:true,reason:"INVALID_DATE"};
 if(isFuture(r.draw_date))return{added4:0,added1:0,rejected:true,reason:"FUTURE_DATE"};
 let a4=0,a1=0;const keys=new Set(synced.map(x=>`${x.kind}|${x.draw_date}|${x.winning_number||""}|${x.prize_amount||""}`));
 if(r.first_prize&&/^\d{6}$/.test(r.first_prize)){
   const k=`first|${r.draw_date}|${r.first_prize}|`;if(!keys.has(k)){synced.push({kind:"first",draw_date:r.draw_date,winning_number:r.first_prize,draw_no:r.draw_no||""});keys.add(k);a1++;}
 }
 for(const it of r.four_numbers||[]){
   const n=it.number,amount=it.amount||"";if(!/^\d{4}$/.test(n))continue;
   const k=`four|${r.draw_date}|${n}|${amount}`;if(!keys.has(k)){synced.push({kind:"four",draw_date:r.draw_date,winning_number:n,prize_amount:amount,prize_rank:it.rank||"",draw_no:r.draw_no||"",is_bumper:!!r.is_bumper});keys.add(k);a4++;}
 }
 const marker=`draw|${r.draw_date}||`;if(!keys.has(marker))synced.push({kind:"draw",draw_date:r.draw_date,complete:true,draw_no:r.draw_no||"",is_bumper:!!r.is_bumper});
 try{fs.writeFileSync(SYNC,JSON.stringify(synced));}catch{}
 return{added4:a4,added1:a1};
}
