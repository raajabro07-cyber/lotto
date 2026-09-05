
import fs from "fs";
import path from "path";
import {loadSynced,saveSynced} from "./storage.js";

const FOUR_FILE=path.resolve("data/four_digit_history.csv");
const FIRST_FILE=path.resolve("data/first_prize_history.csv");
let fourRows=[], firstRows=[], synced=[];

function parseCsvLine(line){
  const out=[];let cur="",q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){
      if(q&&line[i+1]==='"'){cur+='"';i++;} else q=!q;
    } else if(c===","&&!q){out.push(cur);cur="";}
    else cur+=c;
  }
  out.push(cur);return out;
}
function readCsv(file){
  const ls=fs.readFileSync(file,"utf8").replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean);
  const h=parseCsvLine(ls.shift());
  return ls.map(l=>{const v=parseCsvLine(l),o={};h.forEach((k,i)=>o[k]=v[i]??"");return o;});
}
function asDate(s){return new Date(s+"T00:00:00Z");}
const days=(a,b)=>Math.floor((a-b)/86400000);

export function loadData(){
  fourRows=readCsv(FOUR_FILE).filter(r=>/^\d{4}$/.test(r.winning_number)).map(r=>({...r,date:asDate(r.draw_date),four:r.winning_number}));
  firstRows=readCsv(FIRST_FILE).filter(r=>/^\d{6}$/.test(r.winning_number)).map(r=>({...r,date:asDate(r.draw_date),num:r.winning_number}));
  synced=loadSynced().map(r=>({...r,date:asDate(r.draw_date)}));
  return status();
}
function syncedFour(){return synced.filter(r=>r.kind==="four").map(r=>({...r,four:r.winning_number}));}
function syncedFirst(){return synced.filter(r=>r.kind==="first").map(r=>({...r,num:r.winning_number}));}
function allFour(){return [...fourRows,...syncedFour()].sort((a,b)=>a.date-b.date);}
function allFirst(){return [...firstRows,...syncedFirst()].sort((a,b)=>a.date-b.date);}
function recent(set,now,n){return set.filter(r=>{const x=days(now,r.date);return x>=0&&x<=n;});}
function lastFourHit(s,now){
  const a=allFour().filter(r=>r.date<=now&&r.four===s);
  return a.length?{days:days(now,a.at(-1).date),date:a.at(-1).draw_date,amount:a.at(-1).prize_amount||"",lottery:a.at(-1).lottery_name||""}:null;
}
function hits(s,set){return set.filter(r=>r.four===s).length;}
function yearMap(s){
  const y={};for(const r of allFour())if(r.four===s){const k=r.draw_date.slice(0,4);y[k]=(y[k]||0)+1;}return y;
}
export function profile4(s,now=new Date()){
  const all=allFour(),r30=recent(all,now,30),r90=recent(all,now,90),r180=recent(all,now,180),r365=recent(all,now,365);
  const total=hits(s,all),h30=hits(s,r30),h90=hits(s,r90),h180=hits(s,r180),h365=hits(s,r365),last=lastFourHit(s,now),ym=yearMap(s);
  const years=Math.max(new Set(all.map(r=>r.draw_date.slice(0,4))).size,1),active=Object.keys(ym).length;
  let score=0;
  score+=Math.min(42,h365*7);
  score+=Math.min(18,h180*4);
  score+=Math.min(12,h90*3);
  score+=Math.min(13,total*1.4);
  score+=Math.min(15,(active/years)*15);
  // recent six-day hard cooldown for suggestion eligibility; score remains visible.
  const cooldown=!!(last&&last.days<=6);
  return {s,total,h30,h90,h180,h365,last,yearly:ym,score:Math.max(0,Math.min(100,Math.round(score))),cooldown};
}
function hamming(a,b){let n=0;for(let i=0;i<4;i++)if(a[i]!==b[i])n++;return n;}
export function suggestNearby(input,now=new Date(),limit=5){
  const x=Number(input),out=[];
  for(let i=0;i<10000;i++){
    const s=String(i).padStart(4,"0");
    if(s===input)continue;
    const dist=Math.abs(i-x),ham=hamming(input,s);
    // wider family: +/-150 OR up to two digit changes.
    if(dist>150&&ham>2)continue;
    const p=profile4(s,now);
    if(p.total===0||p.cooldown)continue;
    // require some support, but don't over-filter if old history is strong.
    if(p.h365===0&&p.total<2)continue;
    const prox=dist<=10?12:dist<=30?8:dist<=75?5:dist<=150?2:0;
    const fam=ham===1?10:ham===2?4:0;
    const rank=p.score+prox+fam;
    out.push({...p,dist,ham,rank});
  }
  return out.sort((a,b)=>b.rank-a.rank||b.h365-a.h365||b.total-a.total).slice(0,limit);
}

// ---------- first-prize structural / numerology ----------
function digitalRoot(n){let s=[...n].reduce((a,c)=>a+Number(c),0);while(s>9)s=String(s).split("").reduce((a,c)=>a+Number(c),0);return s;}
function dateRoot(d){const s=d.toISOString().slice(0,10).replace(/\D/g,"");return digitalRoot(s);}
function structural(n){
  const ds=[...n].map(Number);
  let doubles=0,triples=0,serial=0;
  for(let i=0;i<5;i++)if(ds[i]===ds[i+1])doubles++;
  for(let i=0;i<4;i++)if(ds[i]===ds[i+1]&&ds[i]===ds[i+2])triples++;
  for(let i=0;i<5;i++)if(Math.abs(ds[i]-ds[i+1])===1)serial++;
  const unique=new Set(ds).size;
  const counts={};for(const d of ds)counts[d]=(counts[d]||0)+1;
  const maxRepeat=Math.max(...Object.values(counts));
  const mirror=(n[0]===n[5]?1:0)+(n[1]===n[4]?1:0)+(n[2]===n[3]?1:0);
  const families=[
    [0,1,2,3],[1,2,3,4],[2,3,4,5],[3,4,5,6],[4,5,6,7],[5,6,7,8],[6,7,8,9]
  ];
  let density=0;
  for(const f of families)density=Math.max(density,f.filter(x=>ds.includes(x)).length);
  let score=doubles*12+triples*10+serial*7+(maxRepeat>=3?15:maxRepeat===2?8:0)+mirror*5+density*4+(unique>=4?5:0);
  return {doubles,triples,serial,maxRepeat,mirror,density,score:Math.min(100,score),root:digitalRoot(n)};
}
function featureDistance(a,b){
  const A=structural(a),B=structural(b);
  let d=0;
  d+=Math.abs(A.doubles-B.doubles)*3;
  d+=Math.abs(A.serial-B.serial)*2;
  d+=Math.abs(A.maxRepeat-B.maxRepeat)*3;
  d+=Math.abs(A.density-B.density)*2;
  d+=Math.abs(A.root-B.root);
  // positional similarity
  let same=0;for(let i=0;i<6;i++)if(a[i]===b[i])same++;
  return d-same*1.5;
}
export function analyzeFirstPrize(n,now=new Date()){
  if(!/^\d{6}$/.test(n))return null;
  const st=structural(n),dr=dateRoot(now),rootMatch=st.root===dr?100:Math.max(0,100-Math.abs(st.root-dr)*18);
  const history=allFirst();
  const sims=history.map(r=>({r,dist:featureDistance(n,r.num)})).sort((a,b)=>a.dist-b.dist).slice(0,8);
  const strongSims=sims.filter(x=>x.dist<=5).length;
  const simScore=Math.max(0,Math.min(100,Math.round(100-(sims[0]?.dist??25)*8)));
  const p4=profile4(n.slice(-4),now);
  let score=Math.round(st.score*.45+simScore*.35+rootMatch*.20);
  if(p4.cooldown)score=Math.max(0,score-15);
  const red=score>=78 && st.score>=45 && simScore>=60 && !p4.cooldown;
  return {n,structure:st,dateRoot:dr,rootMatch,simScore,strongSims,score,red,near:sims.slice(0,5).map(x=>({date:x.r.draw_date,num:x.r.num,dist:+x.dist.toFixed(1)})),last4:p4};
}

export function analyzeInput(input,now=new Date()){
  const d=String(input).replace(/\D/g,"");
  if(d.length!==4&&d.length!==6)return null;
  const four=d.slice(-4),p4=profile4(four,now),suggestions=suggestNearby(four,now,5),first=d.length===6?analyzeFirstPrize(d,now):null;
  return {input:d,four,p4,suggestions,first,asOf:now.toISOString().slice(0,10)};
}

export function addFullResult({draw_date,lottery_name="",draw_no="",source_url="",first_prize=null,four_numbers=[]}){
  let added4=0,added1=0;
  const seen=new Set(synced.map(r=>`${r.kind}|${r.draw_date}|${r.winning_number}|${r.prize_amount||""}`));
  if(first_prize&&/^\d{6}$/.test(first_prize)){
    const k=`first|${draw_date}|${first_prize}|`;
    if(!seen.has(k)){synced.push({kind:"first",draw_date,lottery_name,draw_no,winning_number:first_prize,source_url});seen.add(k);added1++;}
  }
  for(const item of four_numbers){
    const n=typeof item==="string"?item:item.number;
    const amount=typeof item==="string"?"":(item.amount||"");
    const rank=typeof item==="string"?"":(item.rank||"");
    if(!/^\d{4}$/.test(n)||/^20(1[9]|2\d)$/.test(n))continue;
    const k=`four|${draw_date}|${n}|${amount}`;
    if(!seen.has(k)){synced.push({kind:"four",draw_date,lottery_name,draw_no,winning_number:n,prize_amount:amount,prize_rank:rank,source_url});seen.add(k);added4++;}
  }
  saveSynced(synced);
  return {added4,added1};
}
export function status(){
  const a4=allFour(),a1=allFirst();
  const last=[...a4,...a1].sort((a,b)=>a.date-b.date).at(-1);
  return {fourRows:a4.length,firstRows:a1.length,syncedRows:synced.length,lastDate:last?.draw_date||null};
}
