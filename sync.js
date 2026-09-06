
import fs from "fs";
import {addFullResult,status} from "./engine.js";

const PRIMARY_INDEX="https://www.keralalotteries.net/p/kerala-lottery-old-result.html";
const PRIMARY_HOME="https://www.keralalotteries.net/";
const LOTIS="https://www.lotteryagent.kerala.gov.in/result/public/";
const FALLBACK="https://keralalottery.com.co/kerala-lottery-weekly-chart-update-2026-kerala-weekly-chart/";
const BUMPER_RECENT="data/bumper_recent.json";

function clean(h){return h.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<br\s*\/?>/gi,"\n").replace(/<\/(?:p|div|li|tr|td|h\d)>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/\r/g,"");}
async function get(u){const r=await fetch(u,{headers:{"user-agent":"Mozilla/5.0 (compatible; KeralaLotteryBot/10.0)","accept":"text/html,application/xhtml+xml"}});
 if(!r.ok)throw Error(`HTTP ${r.status}`);return r.text();}
const pad=n=>String(n).padStart(2,"0");
function todayIST(){const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),o={};for(const x of p)o[x.type]=x.value;return `${o.year}-${o.month}-${o.day}`;}
function validISO(y,m,d){const s=`${y}-${pad(m)}-${pad(d)}`,x=new Date(s+"T00:00:00Z");return !Number.isNaN(x.getTime())&&x.toISOString().slice(0,10)===s?s:null;}
function dateFromUrl(u){let m=u.match(/today-(\d{1,2})-(\d{2})-(20\d{2})\.html/i);if(m)return validISO(+m[3],+m[2],+m[1]);m=u.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);return m?validISO(+m[1],+m[2],+m[3]):null;}
function drawFromUrl(u){const m=u.match(/-([a-z]{1,4})-(\d{1,4})-today-/i);return m?`${m[1].toUpperCase()}-${m[2]}`:"";}
function parseResult(html,url){
 const t=clean(html),date=dateFromUrl(url);if(!date)throw Error("URL draw date missing");if(date>todayIST())throw Error(`Future date ${date}`);
 const draw_no=drawFromUrl(url),is_bumper=/bumper/i.test(url)||/^BR-/.test(draw_no);
 let first=null;const fm=t.match(/(?:1st|First)\s*Prize[\s\S]{0,800}?\b[A-Z]{1,3}\s+(\d{6})\b/i);if(fm)first=fm[1];
 const specs=is_bumper?[
  ["5","5000",/(?:5th|Fifth)\s*Prize[\s\S]*?(?=(?:6th|Sixth)\s*Prize|$)/i],
  ["6","2000",/(?:6th|Sixth)\s*Prize[\s\S]*?(?=(?:7th|Seventh)\s*Prize|$)/i],
  ["7","1000",/(?:7th|Seventh)\s*Prize[\s\S]*?(?=(?:8th|Eighth)\s*Prize|$)/i],
  ["8","500",/(?:8th|Eighth)\s*Prize[\s\S]*?(?=(?:9th|Ninth)\s*Prize|$)/i],
  ["9","300",/(?:9th|Ninth)\s*Prize[\s\S]*?$/i]
 ]:[
  ["4","5000",/(?:4th|Fourth)\s*Prize[\s\S]*?(?=(?:5th|Fifth)\s*Prize|$)/i],
  ["5","2000",/(?:5th|Fifth)\s*Prize[\s\S]*?(?=(?:6th|Sixth)\s*Prize|$)/i],
  ["6","1000",/(?:6th|Sixth)\s*Prize[\s\S]*?(?=(?:7th|Seventh)\s*Prize|$)/i],
  ["7","500",/(?:7th|Seventh)\s*Prize[\s\S]*?(?=(?:8th|Eighth)\s*Prize|$)/i],
  ["8","200",/(?:8th|Eighth)\s*Prize[\s\S]*?(?=(?:9th|Ninth)\s*Prize|$)/i],
  ["9","100",/(?:9th|Ninth)\s*Prize[\s\S]*?$/i]
 ];
 const four=[],counts={},seen=new Set();
 for(const [rank,amount,re] of specs){const m=t.match(re);counts[rank]=0;if(!m)continue;const block=m[0].replace(/\b20(?:1\d|2\d)\b/g," ");
  for(const x of block.matchAll(/(?<!\d)(\d{4})(?!\d)/g)){const k=rank+"|"+x[1];if(!seen.has(k)){seen.add(k);four.push({number:x[1],rank,amount});counts[rank]++;}}}
 return{draw_date:date,draw_no,is_bumper,source_url:url,first_prize:first,four_numbers:four,counts};
}
function validate(r){if(!r.first_prize)throw Error("First prize missing");const total=r.four_numbers.length;
 if(r.is_bumper){if(total<100)throw Error(`Incomplete bumper parse ${total}`);}
 else{if(total<300)throw Error(`Incomplete weekly parse ${total}`);for(const k of ["4","5","6","7","8","9"])if(!r.counts[k])throw Error(`Prize ${k} missing`);}
}
async function officialMap(){
 try{const t=clean(await get(LOTIS)),map=new Map();for(const m of t.matchAll(/\(([A-Z]{1,4}-\d{1,4})\)[\s\S]{0,120}?(\d{2})-(\d{2})-(20\d{2})/g))map.set(m[1],`${m[4]}-${m[3]}-${m[2]}`);return map;}catch{return new Map();}
}
async function fallbackFirst(date){
 try{const t=clean(await get(FALLBACK)),[y,m,d]=date.split("-"),mons=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],label=`${d}-${mons[+m-1]}-${y}`,i=t.toLowerCase().indexOf(label.toLowerCase());if(i<0)return null;const x=t.slice(i,i+500).match(/\b[A-Z]{1,3}\s+(\d{6})\b/);return x?.[1]||null;}catch{return null;}
}
async function archiveLinks(){
 const h=await get(PRIMARY_INDEX),map=new Map();
 for(const x of h.matchAll(/href=["']([^"']+\.html)["']/ig)){const u=x[1].startsWith("http")?x[1]:new URL(x[1],PRIMARY_INDEX).href,dt=dateFromUrl(u);if(dt&&/lottery-result|bumper/i.test(u)&&dt<=todayIST())if(!map.has(dt))map.set(dt,u);}
 return [...map.entries()].map(([date,url])=>({date,url})).sort((a,b)=>a.date.localeCompare(b.date));
}
async function verifyAndAdd(item,omap){
 const r=parseResult(await get(item.url),item.url);validate(r);
 const od=omap.get(r.draw_no);
 if(od&&od!==r.draw_date)throw Error(`LOTIS mismatch ${r.draw_no}: ${od} vs ${r.draw_date}`);
 if(!od){const ff=await fallbackFirst(r.draw_date);if(ff&&ff!==r.first_prize)throw Error(`Fallback first-prize mismatch ${r.draw_date}`);}
 const a=addFullResult(r);if(a.rejected)throw Error(a.reason);return{...r,...a,officialVerified:!!od};
}
async function refreshRecentBumpers(links){
 try{const b=links.filter(x=>/bumper/i.test(x.url)).slice(-2),draws=[];
  for(const item of b){const r=parseResult(await get(item.url),item.url);validate(r);draws.push({code:r.draw_no,date:r.draw_date,url:item.url,first_prize:r.first_prize,four_numbers:[...new Set(r.four_numbers.map(x=>x.number))]});}
  if(draws.length)fs.writeFileSync(BUMPER_RECENT,JSON.stringify({draws}));return draws;
 }catch{return[];}
}
export async function syncToday(){
 const st=status(),from=st.lastCompleteDate||"2026-09-04",today=todayIST(),omap=await officialMap();
 try{
  const links=await archiveLinks(),missing=links.filter(x=>x.date>from&&x.date<=today).slice(0,30);
  let verified=0,failed=0,a4=0,a1=0,details=[];
  for(const item of missing){try{const r=await verifyAndAdd(item,omap);verified++;a4+=r.added4;a1+=r.added1;details.push(`${r.draw_date}:${r.draw_no}`);}catch(e){failed++;details.push(`${item.date}:FAIL`);}}
  const bumpers=await refreshRecentBumpers(links);
  const now=status();
  return{ok:failed===0,message:missing.length?`${failed?"CATCH-UP PARTIAL":"CATCH-UP SYNC COMPLETE"}`:"DATABASE ALREADY CURRENT",
    from,to:today,found:missing.length,verified,failed,added4:a4,added1:a1,databaseLatest:now.lastCompleteDate,bumperRefresh:bumpers.map(x=>`${x.code}@${x.date}`)};
 }catch(e){return{ok:false,message:`Sync failed safely: ${e.message}`,from,to:today,found:0,verified:0,failed:1,added4:0,added1:0,databaseLatest:status().lastCompleteDate,bumperRefresh:[]};}
}
export async function syncUrl(u){const omap=await officialMap(),r=await verifyAndAdd({url:u,date:dateFromUrl(u)},omap);return r;}
