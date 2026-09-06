
import fs from "fs";
const B4=JSON.parse(fs.readFileSync("data/bumper_four_index.json","utf8"));
const B6=JSON.parse(fs.readFileSync("data/bumper_first_index.json","utf8"));
const META=JSON.parse(fs.readFileSync("data/bumper_meta.json","utf8"));
const RECENT_FILE="data/bumper_recent.json";
const DAY=86400000,D=s=>new Date(s+"T00:00:00Z"),df=(a,b)=>Math.floor((a-b)/DAY);
function recent(){try{return JSON.parse(fs.readFileSync(RECENT_FILE,"utf8"));}catch{return{draws:[]};}}
function recentDates(){const r=recent();return (r.draws?.length?r.draws:META.last2_draws).map(x=>x.date);}
function recentNums(){
 const r=recent(),m=new Map();
 for(const d of r.draws||[])for(const n of d.four_numbers||[])m.set(`${d.date}|${n}`,true);
 return m;
}
function allDates(n){
 const ds=[...(B4[n]?.dates||[])],r=recent();
 for(const d of r.draws||[])if((d.four_numbers||[]).includes(n))ds.push(d.date);
 return [...new Set(ds)].sort();
}
function p4(n,now){
 const ds=allDates(n),count=Math.max(B4[n]?.count||0,ds.length),h=k=>ds.filter(d=>{const q=df(now,D(d));return q>=0&&q<=k}).length;
 let last=null;for(let i=ds.length-1;i>=0;i--){const q=df(now,D(ds[i]));if(q>=0){last={date:ds[i],days:q};break;}}
 const l2=recentDates(),inLast2=ds.filter(d=>l2.includes(d)).length;
 let score=Math.min(50,h(730)*10)+Math.min(25,count*5)+Math.min(15,h(365)*5);if(inLast2===1)score-=20;if(inLast2>=2)score-=40;
 return{n,total:count,h365:h(365),h730:h(730),last,inLast2,score:Math.max(0,Math.min(100,Math.round(score)))};
}
function ham(a,b){let c=0;for(let i=0;i<4;i++)if(a[i]!==b[i])c++;return c;}
function candidatesSet(){const s=new Set(Object.keys(B4));const r=recent();for(const d of r.draws||[])for(const n of d.four_numbers||[])s.add(n);return [...s];}
function sug(n,now){
 const x=Number(n),a=[];for(const s of candidatesSet()){if(s===n)continue;const dist=Math.abs(Number(s)-x),h=ham(n,s);if(dist>200&&h>2)continue;
   const p=p4(s,now);if(p.inLast2>0)continue;const rank=p.score+(dist<=20?10:dist<=60?6:3)+(h===1?8:h===2?3:0);a.push({...p,dist,ham:h,rank});}
 return a.sort((a,b)=>b.rank-a.rank||b.total-a.total).slice(0,5);
}
function root(n){let s=[...n].reduce((a,c)=>a+Number(c),0);while(s>9)s=[...String(s)].reduce((a,c)=>a+Number(c),0);return s;}
function st(n){const d=[...n].map(Number);let doubles=0,serial=0;for(let i=0;i<5;i++){if(d[i]===d[i+1])doubles++;if(Math.abs(d[i]-d[i+1])===1)serial++;}return{doubles,serial,root:root(n),score:Math.min(100,doubles*18+serial*8)};}
function f6(n,now){const s=st(n),dr=root(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(now).replace(/\D/g,"")),rm=Math.max(0,100-Math.abs(s.root-dr)*18);let best=6;for(const r of B6){let same=0;for(let i=0;i<6;i++)if(r.n[i]===n[i])same++;best=Math.min(best,6-same);}const sim=Math.max(0,100-best*16),p=p4(n.slice(-4),now);let score=Math.round(s.score*.5+sim*.3+rm*.2);if(p.inLast2>0)score-=20;return{structure:s,rootMatch:rm,simScore:sim,score:Math.max(0,score),red:score>=78&&p.inLast2===0};}
export function analyzeBumper(input,now=new Date()){const d=String(input).replace(/\D/g,"");if(d.length!==4&&d.length!==6)return null;const four=d.slice(-4);return{input:d,four,p4:p4(four,now),suggestions:sug(four,now),first:d.length===6?f6(d,now):null,last2:recentDates()};}
