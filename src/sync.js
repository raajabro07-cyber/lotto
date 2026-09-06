
import {addFullResult,status} from "./engine.js";

const PRIMARY_INDEX="https://www.keralalotteries.net/p/kerala-lottery-old-result.html";
const PRIMARY_HOME="https://www.keralalotteries.net/";
const FALLBACK_CHART="https://keralalottery.com.co/kerala-lottery-weekly-chart-update-2026-kerala-weekly-chart/";

function clean(h){
  return h.replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<\/(?:p|div|li|tr|td|h\d)>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/\r/g,"");
}
async function get(u){
  const r=await fetch(u,{headers:{
    "user-agent":"Mozilla/5.0 (compatible; KeralaLotteryBot/9.0)",
    "accept":"text/html,application/xhtml+xml"
  }});
  if(!r.ok)throw Error(`HTTP ${r.status} ${u}`);
  return r.text();
}
const pad=n=>String(n).padStart(2,"0");
function todayIST(){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const o={};for(const p of parts)o[p.type]=p.value;
  return `${o.year}-${o.month}-${o.day}`;
}
function validISO(y,m,d){
  const s=`${y}-${pad(m)}-${pad(d)}`,x=new Date(s+"T00:00:00Z");
  return !Number.isNaN(x.getTime())&&x.toISOString().slice(0,10)===s?s:null;
}
function dateFromUrl(u){
  let m=u.match(/today-(\d{1,2})-(\d{2})-(20\d{2})\.html/i);
  if(m)return validISO(Number(m[3]),Number(m[2]),Number(m[1]));
  m=u.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
  if(m)return validISO(Number(m[1]),Number(m[2]),Number(m[3]));
  return null;
}
function dateFromText(t){
  let m=t.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/);
  return m?validISO(Number(m[3]),Number(m[2]),Number(m[1])):null;
}
function lotteryMeta(t,u){
  const text=t.replace(/\s+/g," ");
  const patterns=[
    ["Samrudhi",/\bSamrudhi\b/i],["Bhagyathara",/\bBhagyathara\b/i],["Sthree Sakthi",/\bSthree\s+Sakthi\b/i],
    ["Dhanalekshmi",/\bDhanalekshmi\b/i],["Karunya Plus",/\bKarunya\s+Plus\b/i],["Suvarna Keralam",/\bSuvarna\s+Keralam\b/i],
    ["Karunya",/\bKarunya\b/i],["Bumper",/\bBumper\b/i]
  ];
  let name="";for(const [n,re] of patterns)if(re.test(text)){name=n;break;}
  const dm=text.match(/\b([A-Z]{1,4})\s*[- ]\s*(\d{1,4})\b/);
  return{lottery_name:name,draw_no:dm?`${dm[1]}-${dm[2]}`:""};
}
function parseResultPage(html,url,forcedDate=null){
  const t=clean(html),date=forcedDate||dateFromUrl(url)||dateFromText(t);
  if(!date)throw Error("Draw date not found");
  if(date>todayIST())throw Error(`Future draw date rejected: ${date}`);

  const meta=lotteryMeta(t,url);
  let first=null;
  const fm=t.match(/(?:1st|First)\s*Prize[\s\S]{0,700}?\b[A-Z]{1,3}\s+(\d{6})\b/i);
  if(fm)first=fm[1];

  const specs=[
    ["4","5000",/(?:4th|Fourth)\s*Prize[\s\S]*?(?=(?:5th|Fifth)\s*Prize|$)/i],
    ["5","2000",/(?:5th|Fifth)\s*Prize[\s\S]*?(?=(?:6th|Sixth)\s*Prize|$)/i],
    ["6","1000",/(?:6th|Sixth)\s*Prize[\s\S]*?(?=(?:7th|Seventh)\s*Prize|$)/i],
    ["7","500",/(?:7th|Seventh)\s*Prize[\s\S]*?(?=(?:8th|Eighth)\s*Prize|$)/i],
    ["8","200",/(?:8th|Eighth)\s*Prize[\s\S]*?(?=(?:9th|Ninth)\s*Prize|$)/i],
    ["9","100",/(?:9th|Ninth)\s*Prize[\s\S]*?$/i]
  ];
  const four=[],counts={},seen=new Set();
  for(const [rank,amount,re] of specs){
    const m=t.match(re); if(!m){counts[rank]=0;continue;}
    const block=m[0].replace(/\b20(?:1\d|2\d)\b/g," ");
    const nums=[...block.matchAll(/(?<!\d)(\d{4})(?!\d)/g)].map(x=>x[1]);
    counts[rank]=0;
    for(const n of nums){
      const k=rank+"|"+n;
      if(!seen.has(k)){seen.add(k);four.push({number:n,rank,amount});counts[rank]++;}
    }
  }
  return{draw_date:date,source_url:url,source_name:"keralalotteries.net",first_prize:first,four_numbers:four,counts,...meta};
}
async function discoverPrimary(){
  const today=todayIST(),[y,m,d]=today.split("-");
  const wanted=`${d}-${m}-${y}`;
  const pages=[PRIMARY_INDEX,PRIMARY_HOME];
  const candidates=new Set();
  for(const page of pages){
    try{
      const h=await get(page);
      for(const x of h.matchAll(/href=["']([^"']+\.html)["']/ig)){
        const u=x[1].startsWith("http")?x[1]:new URL(x[1],page).href;
        const dt=dateFromUrl(u);
        if(dt===today)candidates.add(u);
        else if(u.includes(`today-${wanted}`))candidates.add(u);
      }
    }catch{}
  }
  if(candidates.size)return [...candidates][0];

  // If today's result is not published yet, pick latest valid <= today from index.
  const h=await get(PRIMARY_INDEX);
  const all=[];
  for(const x of h.matchAll(/href=["']([^"']+\.html)["']/ig)){
    const u=x[1].startsWith("http")?x[1]:new URL(x[1],PRIMARY_INDEX).href,dt=dateFromUrl(u);
    if(dt&&dt<=today)all.push({u,dt});
  }
  all.sort((a,b)=>b.dt.localeCompare(a.dt));
  return all[0]?.u||null;
}
function validateFull(r){
  const total=r.four_numbers.length;
  const weeklyLike=!/bumper/i.test(r.lottery_name||"");
  if(!r.first_prize)throw Error("First prize missing");
  if(weeklyLike){
    // Standard weekly result should contain several hundred 4D entries.
    if(total<300)throw Error(`Incomplete 4D parse: ${total}`);
    for(const k of ["4","5","6","7","8","9"])if((r.counts[k]||0)===0)throw Error(`Prize ${k} block missing`);
  }else if(total<50)throw Error(`Incomplete bumper/special parse: ${total}`);
  return true;
}
async function fallbackVerify(expectedDate){
  try{
    const h=clean(await get(FALLBACK_CHART));
    const [y,m,d]=expectedDate.split("-");
    const mons=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const label=`${d}-${mons[Number(m)-1]}-${y}`;
    const i=h.toLowerCase().indexOf(label.toLowerCase());
    if(i<0)return{ok:false};
    const near=h.slice(i,i+300);
    const fm=near.match(/\b[A-Z]{1,3}\s+(\d{6})\b/);
    return{ok:true,first:fm?.[1]||null,source:"keralalottery.com.co"};
  }catch{return{ok:false};}
}
export async function syncToday(){
  const today=todayIST();
  try{
    const url=await discoverPrimary();
    if(!url)throw Error("No result link found in primary archive");
    const r=parseResultPage(await get(url),url);
    validateFull(r);

    // If result is older than today, don't pretend today synced.
    const latestOnly=r.draw_date!==today;
    const fb=await fallbackVerify(r.draw_date);
    if(fb.ok&&fb.first&&r.first_prize&&fb.first!==r.first_prize)throw Error("Fallback first-prize mismatch");

    const a=addFullResult(r);
    if(a.rejected)throw Error(a.reason||"Database rejected result");
    const st=status();
    return{
      ok:true,
      message:latestOnly?"LATEST AVAILABLE RESULT SYNCED":"SYNC VERIFIED",
      drawDate:r.draw_date,parsed4:r.four_numbers.length,counts:r.counts,
      pages:1,source:r.source_name,fallbackVerified:fb.ok,
      ...a,databaseLatest:st.lastDate
    };
  }catch(e){
    const fb=await fallbackVerify(today);
    return{
      ok:false,message:`Sync failed safely: ${e.message}`,
      drawDate:null,parsed4:0,pages:0,added4:0,added1:0,
      source:"none",fallbackVerified:fb.ok,fallbackFirst:fb.first||null,
      databaseLatest:status().lastDate
    };
  }
}
export async function syncUrl(u){
  const r=parseResultPage(await get(u),u);
  validateFull(r);
  const a=addFullResult(r);
  if(a.rejected)throw Error(a.reason||"Database rejected result");
  return{...r,...a};
}
