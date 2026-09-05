
import fs from "fs";
import path from "path";

const FILE=path.resolve("data/first_prize_history.csv");
let rows=[];

function csv(line){
  const out=[]; let cur="",q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){
      if(q && line[i+1]==='"'){cur+='"';i++;}
      else q=!q;
    } else if(c==="," && !q){out.push(cur);cur="";}
    else cur+=c;
  }
  out.push(cur);
  return out;
}

export function loadData(){
  const lines=fs.readFileSync(FILE,"utf8").replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean);
  const h=csv(lines.shift());
  rows=lines.map(l=>{
    const v=csv(l),o={};
    h.forEach((k,i)=>o[k]=v[i]??"");
    o.date=new Date(o.draw_date+"T00:00:00Z");
    o.num=o.first_prize_number;
    return o;
  }).filter(r=>/^\d{6}$/.test(r.num) && !Number.isNaN(r.date.getTime()))
    .sort((a,b)=>a.date-b.date);
  return rows.length;
}

function daysBetween(a,b){return Math.floor((a-b)/86400000);}
function cntSuffix(n,k,subset){const s=n.slice(-k);return subset.filter(r=>r.num.slice(-k)===s).length;}
function lastSeenGap(n,k,now){
  const s=n.slice(-k);
  for(let i=rows.length-1;i>=0;i--){
    if(rows[i].date>now) continue;
    if(rows[i].num.slice(-k)===s) return daysBetween(now,rows[i].date);
  }
  return null;
}
function exactLastGap(n,now){
  for(let i=rows.length-1;i>=0;i--){
    if(rows[i].date>now) continue;
    if(rows[i].num===n) return daysBetween(now,rows[i].date);
  }
  return null;
}
function recentRows(now,days){return rows.filter(r=>{const d=daysBetween(now,r.date);return d>=0&&d<=days;});}
function dowCount(n,k,now){
  const dow=now.getUTCDay(), s=n.slice(-k);
  return rows.filter(r=>r.date.getUTCDay()===dow && r.num.slice(-k)===s).length;
}
function transitionScore(n,now){
  const recent=rows.filter(r=>r.date<=now).slice(-1)[0];
  if(!recent) return 0;
  let shared=0;
  for(let i=0;i<6;i++) if(recent.num[i]===n[i]) shared++;
  // Penalize being too identical to immediate prior draw; mild bonus for 1-2 shared positions.
  if(shared>=5) return -8;
  if(shared===4) return -5;
  if(shared===1 || shared===2) return 4;
  return 0;
}

export function analyzeTicket(series,number,now=new Date()){
  const n=String(number).replace(/\D/g,"");
  if(n.length!==6) return null;

  const all2=cntSuffix(n,2,rows), all3=cntSuffix(n,3,rows), all4=cntSuffix(n,4,rows);
  const r30=recentRows(now,30), r90=recentRows(now,90), r365=recentRows(now,365);
  const hot30=cntSuffix(n,2,r30), hot90=cntSuffix(n,3,r90), hot365=cntSuffix(n,4,r365);
  const gapExact=exactLastGap(n,now), gap2=lastSeenGap(n,2,now), gap3=lastSeenGap(n,3,now), gap4=lastSeenGap(n,4,now);
  const dow3=dowCount(n,3,now);

  let score=45;

  // Long-term recurrence signal
  score += Math.min(12,Math.log10(all2+1)*6);
  score += Math.min(10,Math.log10(all3+1)*7);
  score += Math.min(8,Math.log10(all4+1)*8);

  // Current-date / recency adjustments
  score += Math.min(6,hot30*1.5);
  score += Math.min(6,hot90*1.2);
  score += Math.min(5,hot365*1.0);

  // Repeat suppression: very recent exact/suffix repeats get penalties.
  if(gapExact!==null && gapExact<=1) score-=18;
  else if(gapExact!==null && gapExact<=3) score-=12;
  else if(gapExact!==null && gapExact<=7) score-=7;

  if(gap4!==null && gap4<=1) score-=8;
  else if(gap4!==null && gap4<=3) score-=5;

  if(gap3!==null && gap3>=5 && gap3<=45) score+=4;
  if(gap2!==null && gap2>=2 && gap2<=14) score+=3;

  // Day-of-week recurrence
  score += Math.min(5,dow3*0.8);

  // Previous-draw transition heuristic
  score += transitionScore(n,now);

  // Digit diversity/stability
  const unique=new Set(n).size;
  if(unique>=5) score+=5;
  else if(unique<=2) score-=5;

  score=Math.max(0,Math.min(100,Math.round(score)));

  return {
    series:(series||"").toUpperCase(), number:n, score,
    all2,all3,all4,hot30,hot90,hot365,
    gapExact,gap2,gap3,gap4,dow3,
    asOf:now.toISOString().slice(0,10)
  };
}
export function rankTickets(tickets,now=new Date()){
  return tickets.map(t=>analyzeTicket(t.series,t.number,now)).filter(Boolean).sort((a,b)=>b.score-a.score);
}
export function status(){
  const last=rows.at(-1);
  return {rows:rows.length,lastDate:last?.draw_date||null};
}
