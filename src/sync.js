
import {addFullResult,status} from "./engine.js";
const HOME="https://result.keralalotteries.com/";

function clean(h){
  return h.replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<\/(?:p|div|li|tr|td|h\d)>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&");
}
async function get(u){
  const r=await fetch(u,{headers:{"user-agent":"Mozilla/5.0","accept":"text/html,application/xhtml+xml"}});
  if(!r.ok)throw Error(`HTTP ${r.status}`);
  return r.text();
}
function pad(n){return String(n).padStart(2,"0");}
function validDate(y,m,d){
  const s=`${y}-${pad(m)}-${pad(d)}`;
  const dt=new Date(s+"T00:00:00Z");
  return !Number.isNaN(dt.getTime())&&dt.toISOString().slice(0,10)===s?s:null;
}
function parseDateStrict(text){
  // DD/MM/YYYY or DD-MM-YYYY only. Never guess MM/DD.
  let m=text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if(m)return validDate(Number(m[3]),Number(m[2]),Number(m[1]));
  m=text.match(/\b(\d{1,2})-(\d{1,2})-(20\d{2})\b/);
  if(m)return validDate(Number(m[3]),Number(m[2]),Number(m[1]));
  return null;
}
function parseResult(h,date,url){
  const t=clean(h);
  let first=null;
  const fm=t.match(/(?:1st|First)\s*Prize[\s\S]{0,500}?\b[A-Z]{1,3}\s+(\d{6})\b/i);
  if(fm)first=fm[1];
  const specs=[
    ["4","5000",/(?:4th|Fourth)\s*Prize[\s\S]*?(?=(?:5th|Fifth)\s*Prize|$)/i],
    ["5","2000",/(?:5th|Fifth)\s*Prize[\s\S]*?(?=(?:6th|Sixth)\s*Prize|$)/i],
    ["6","1000",/(?:6th|Sixth)\s*Prize[\s\S]*?(?=(?:7th|Seventh)\s*Prize|$)/i],
    ["7","500",/(?:7th|Seventh)\s*Prize[\s\S]*?(?=(?:8th|Eighth)\s*Prize|$)/i],
    ["8","200",/(?:8th|Eighth)\s*Prize[\s\S]*?(?=(?:9th|Ninth)\s*Prize|$)/i],
    ["9","100",/(?:9th|Ninth)\s*Prize[\s\S]*?$/i]
  ];
  const four=[],seen=new Set();
  for(const [rank,amount,re] of specs){
    const m=t.match(re); if(!m)continue;
    const block=m[0].replace(/\b20(?:1\d|2\d)\b/g," ");
    for(const x of block.matchAll(/(?<!\d)(\d{4})(?!\d)/g)){
      const key=rank+"|"+x[1];
      if(!seen.has(key)){seen.add(key);four.push({number:x[1],rank,amount});}
    }
  }
  return{draw_date:date,source_url:url,first_prize:first,four_numbers:four};
}
async function latestOfficial(){
  const h=await get(HOME);
  const matches=[...h.matchAll(/href=["']([^"']*viewlotisresult\.php\?drawserial=\d+[^"']*)["']/ig)];
  if(!matches.length)throw Error("Official latest-result link not found");
  const link=matches[0],u=new URL(link[1],HOME).href;
  const near=h.slice(Math.max(0,link.index-900),link.index+900);
  let date=parseDateStrict(near);
  const rh=await get(u);
  if(!date)date=parseDateStrict(clean(rh));
  if(!date)throw Error("Strict draw date not found");
  const today=new Date().toISOString().slice(0,10);
  if(date>today)throw Error(`Future draw date rejected: ${date}`);
  return parseResult(rh,date,u);
}
export async function syncToday(){
  try{
    const r=await latestOfficial();
    if(r.four_numbers.length<50)throw Error(`Incomplete parse: only ${r.four_numbers.length} four-digit results`);
    const a=addFullResult(r);
    if(a.rejected)throw Error(`${a.reason}: ${r.draw_date}`);
    const st=status();
    if(st.lastDate && st.lastDate>new Date().toISOString().slice(0,10))throw Error(`Post-sync future date detected: ${st.lastDate}`);
    return{ok:true,message:"SYNC VERIFIED",drawDate:r.draw_date,parsed4:r.four_numbers.length,pages:1,...a,databaseLatest:st.lastDate};
  }catch(e){
    return{ok:false,message:`Sync failed safely: ${e.message}`,drawDate:null,parsed4:0,pages:0,added4:0,added1:0,databaseLatest:status().lastDate};
  }
}
export async function syncUrl(u){
  const h=await get(u),t=clean(h);
  let date=parseDateStrict(t);
  if(!date){
    const x=u.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
    if(x)date=validDate(Number(x[1]),Number(x[2]),Number(x[3]));
  }
  if(!date)throw Error("Strict draw date not found");
  const today=new Date().toISOString().slice(0,10);
  if(date>today)throw Error(`Future draw date rejected: ${date}`);
  const r=parseResult(h,date,u);
  if(r.four_numbers.length<20)throw Error(`Incomplete parse: ${r.four_numbers.length}`);
  const a=addFullResult(r);
  if(a.rejected)throw Error(a.reason);
  return{...r,...a};
}
