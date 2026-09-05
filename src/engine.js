
import fs from "fs";
import path from "path";
const FILE=path.resolve("data/first_prize_history.csv"); let rows=[];
function csv(line){const a=[];let c="",q=false;for(let i=0;i<line.length;i++){let x=line[i];if(x=='"'){if(q&&line[i+1]=='"'){c+='"';i++;}else q=!q;}else if(x==","&&!q){a.push(c);c="";}else c+=x;}a.push(c);return a;}
export function loadData(){const ls=fs.readFileSync(FILE,"utf8").replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean),h=csv(ls.shift());rows=ls.map(l=>{const v=csv(l),o={};h.forEach((k,i)=>o[k]=v[i]||"");o.num=o.first_prize_number;o.date=new Date(o.draw_date+"T00:00:00Z");return o;}).filter(r=>/^\d{6}$/.test(r.num)&&!isNaN(r.date)).sort((a,b)=>a.date-b.date);return rows.length;}
const days=(a,b)=>Math.floor((a-b)/86400000);
function suffixHits(s){return rows.filter(r=>r.num.endsWith(s));}
function gaps(list){const g=[];for(let i=1;i<list.length;i++)g.push(days(list[i].date,list[i-1].date));return g;}
function median(a){if(!a.length)return null;const x=[...a].sort((a,b)=>a-b),m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2;}
function lastGap(s,now){const a=suffixHits(s).filter(r=>r.date<=now);return a.length?days(now,a.at(-1).date):null;}
function bucket(g){return {d1:g.filter(x=>x===1).length,d2:g.filter(x=>x===2).length,d3:g.filter(x=>x===3).length,d46:g.filter(x=>x>=4&&x<=6).length,d715:g.filter(x=>x>=7&&x<=15).length,d1630:g.filter(x=>x>=16&&x<=30).length,d30:g.filter(x=>x>30).length};}
function profile4(s,now){
 const a=suffixHits(s),gs=gaps(a),b=bucket(gs),lg=lastGap(s,now),intervals=Math.max(gs.length,1),short=b.d1+b.d2+b.d3+b.d46;
 const freqPct=100*a.length/Math.max(rows.length,1),repeatPct=100*short/intervals;
 const recent=lg!==null&&lg<=6;
 let score=45+Math.min(25,a.length*2)+Math.min(15,repeatPct*.5);
 if(recent){ // user-requested historical cooldown model
   if(repeatPct<10)score-=25; else if(repeatPct<25)score-=15; else score-=7;
 } else if(lg!==null && median(gs)!==null){
   const med=median(gs); if(lg>=med*.7&&lg<=med*1.5)score+=10;
 }
 score=Math.max(0,Math.min(100,Math.round(score)));
 return {s,total:a.length,freqPct:+freqPct.toFixed(3),repeatPct:+repeatPct.toFixed(1),lastGap:lg,medianGap:median(gs),minGap:gs.length?Math.min(...gs):null,maxGap:gs.length?Math.max(...gs):null,b,score,recent};
}
function exact6(n,now){
 const a=rows.filter(r=>r.num===n),gs=gaps(a),lg=a.length?days(now,a.at(-1).date):null;
 const short=gs.filter(x=>x>=1&&x<=6).length,p=gs.length?100*short/gs.length:0;
 let score=35+Math.min(30,a.length*8)+Math.min(20,p*.5);
 if(lg!==null&&lg<=6)score-=p<15?25:12;
 return {total:a.length,repeatPct:+p.toFixed(1),lastGap:lg,score:Math.max(0,Math.min(100,Math.round(score)))};
}
function neighborCandidates(input,now){
 const out=[];
 // Scan every 0000-9999 candidate; prioritize data-driven score plus similarity as a small support only.
 for(let i=0;i<10000;i++){
   const s=String(i).padStart(4,"0"),p=profile4(s,now);
   if(!p.total)continue;
   let same=0;for(let j=0;j<4;j++)if(s[j]===input[j])same++;
   let rank=p.score + same*1.5;
   // Avoid immediate recent candidates unless their own short-repeat history is strong.
   if(p.lastGap!==null&&p.lastGap<=3&&p.repeatPct<25)rank-=15;
   out.push({...p,similarity:same,rank});
 }
 return out.sort((a,b)=>b.rank-a.rank).slice(0,5);
}
export function analyze(input,now=new Date()){
 const digits=String(input).replace(/\D/g,"");
 if(digits.length!==4&&digits.length!==6)return null;
 const s=digits.slice(-4),p4=profile4(s,now),e6=digits.length===6?exact6(digits,now):null;
 const suggestions=neighborCandidates(s,now);
 let combined=p4.score;
 if(e6)combined=Math.round(p4.score*.7+e6.score*.3);
 return {input:digits,suffix:s,p4,e6,combined,suggestions,asOf:now.toISOString().slice(0,10)};
}
export function status(){return {rows:rows.length,lastDate:rows.at(-1)?.draw_date||null};}
