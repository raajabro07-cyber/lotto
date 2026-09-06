
import fs from "fs";
import {addFullResult,status} from "./engine.js";
const INDEX="https://www.keralalotteries.net/p/kerala-lottery-old-result.html",LOTIS="https://www.lotteryagent.kerala.gov.in/result/public/";
const HEALTH="data/source_health.json";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function clean(h){return h.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<br\s*\/?>/gi,"\n").replace(/<\/(?:p|div|li|tr|td|h\d)>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/\r/g,"");}
function health(x){try{fs.writeFileSync(HEALTH,JSON.stringify(x));}catch{}}
async function get(u){
 let last="";
 for(let i=0;i<3;i++){const r=await fetch(u,{headers:{"user-agent":"Mozilla/5.0 (compatible; KeralaLotteryBot/12.0)","accept":"text/html,application/xhtml+xml"}});
  if(r.ok){health({source:u,status:"OK",at:new Date().toISOString()});return r.text();}
  last=`HTTP ${r.status}`;if(r.status!==429)break;health({source:u,status:"429",attempt:i+1,at:new Date().toISOString()});await sleep(i===0?3000:i===1?8000:15000);}
 throw Error(last||"FETCH_FAILED");
}
const pad=n=>String(n).padStart(2,"0");
function todayIST(){const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),o={};for(const x of p)o[x.type]=x.value;return `${o.year}-${o.month}-${o.day}`;}
function validISO(y,m,d){const s=`${y}-${pad(m)}-${pad(d)}`,x=new Date(s+"T00:00:00Z");return !Number.isNaN(x.getTime())&&x.toISOString().slice(0,10)===s?s:null;}
function dateUrl(u){const m=u.match(/today-(\d{1,2})-(\d{2})-(20\d{2})\.html/i);return m?validISO(+m[3],+m[2],+m[1]):null;}
function drawUrl(u){const m=u.match(/-([a-z]{1,4})-(\d{1,4})-today-/i);return m?`${m[1].toUpperCase()}-${m[2]}`:"";}
function parse(html,url){
 const t=clean(html),date=dateUrl(url),draw_no=drawUrl(url),is_bumper=/bumper/i.test(url)||/^BR-/.test(draw_no);
 if(!date)throw Error("DATE_MISSING");if(date>todayIST())throw Error("FUTURE_DATE");
 const fm=t.match(/(?:1st|First)\s*Prize[\s\S]{0,900}?\b[A-Z]{1,3}\s+(\d{6})\b/i),first=fm?.[1]||null;
 const ranks=is_bumper?["5","6","7","8","9"]:["4","5","6","7","8","9"],four=[],counts={},declared={};
 for(let i=0;i<ranks.length;i++){
  const rank=ranks[i],next=ranks[i+1],start=new RegExp(`(?:${rank}th|${rank==="4"?"Fourth":rank==="5"?"Fifth":rank==="6"?"Sixth":rank==="7"?"Seventh":rank==="8"?"Eighth":"Ninth"})\\s*Prize`,"i");
  const sm=start.exec(t);if(!sm){counts[rank]=0;declared[rank]=0;continue;}
  const tail=t.slice(sm.index),end=next?new RegExp(`(?:${next}th|${next==="5"?"Fifth":next==="6"?"Sixth":next==="7"?"Seventh":next==="8"?"Eighth":"Ninth"})\\s*Prize`,"i").exec(tail.slice(sm[0].length)):null;
  const block=end?tail.slice(0,sm[0].length+end.index):tail;
  const dm=block.match(/Last\s+four\s+digits\s+to\s+be\s+drawn\s+(\d+)\s+times/i);declared[rank]=dm?+dm[1]:0;
  const arr=[...block.replace(/\b20(?:1\d|2\d)\b/g," ").matchAll(/(?<!\d)(\d{4})(?!\d)/g)].map(x=>x[1]);
  const seen=new Set();for(const n of arr)if(!seen.has(n)){seen.add(n);four.push({number:n,rank,amount:""});}
  counts[rank]=seen.size;
 }
 return{draw_date:date,draw_no,is_bumper,first_prize:first,four_numbers:four,counts,declared,source_url:url};
}
function validate(r){
 if(!r.first_prize)throw Error("FIRST_PRIZE_MISSING");
 for(const rank of Object.keys(r.declared)){
  if(!r.declared[rank])throw Error(`DECLARED_COUNT_MISSING_P${rank}`);
  if(r.counts[rank]!==r.declared[rank])throw Error(`COUNT_MISMATCH_P${rank}:${r.counts[rank]}/${r.declared[rank]}`);
 }
 return true;
}
async function officialMap(){try{const t=clean(await get(LOTIS)),m=new Map();for(const x of t.matchAll(/\(([A-Z]{1,4}-\d{1,4})\)[\s\S]{0,120}?(\d{2})-(\d{2})-(20\d{2})/g))m.set(x[1],`${x[4]}-${x[3]}-${x[2]}`);return m;}catch{return new Map();}}
async function links(){
 const h=await get(INDEX),a=[];for(const x of h.matchAll(/href=["']([^"']+\.html)["']/ig)){const u=x[1].startsWith("http")?x[1]:new URL(x[1],INDEX).href,d=dateUrl(u);if(d&&/lottery-result|bumper/i.test(u)&&d<=todayIST())a.push({date:d,url:u});}
 const seen=new Set();return a.filter(x=>!seen.has(x.url)&&seen.add(x.url)).sort((a,b)=>a.date.localeCompare(b.date));
}
async function one(item,omap){
 const r=parse(await get(item.url),item.url);validate(r);const od=omap.get(r.draw_no);if(od&&od!==r.draw_date)throw Error(`LOTIS_DATE_MISMATCH:${od}`);
 const a=addFullResult(r);if(a.rejected)throw Error(a.reason);return{...r,...a,officialVerified:!!od};
}
export async function syncToday(){
 const st=status(),from=st.lastCompleteDate,today=todayIST();
 if(from>=today)return{ok:true,message:"DATABASE ALREADY CURRENT",from,to:today,found:0,verified:0,failed:0,added4:0,added1:0,databaseLatest:from};
 try{
  const omap=await officialMap(),all=await links(),miss=all.filter(x=>x.date>from&&x.date<=today).slice(0,30);let verified=0,failed=0,a4=0,a1=0,errors=[];
  for(const item of miss){try{const r=await one(item,omap);verified++;a4+=r.added4;a1+=r.added1;}catch(e){failed++;errors.push(`${item.date}:${e.message}`);break;}}
  const now=status();return{ok:failed===0,message:failed?"CATCH-UP STOPPED SAFELY":"CATCH-UP SYNC COMPLETE",from,to:today,found:miss.length,verified,failed,added4:a4,added1:a1,databaseLatest:now.lastCompleteDate,errors};
 }catch(e){return{ok:false,message:`Sync failed safely: ${e.message}`,from,to:today,found:0,verified:0,failed:1,added4:0,added1:0,databaseLatest:status().lastCompleteDate,errors:[e.message]};}
}
export async function syncUrl(u){const omap=await officialMap(),r=await one({url:u,date:dateUrl(u)},omap);return r;}
