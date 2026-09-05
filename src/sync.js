
import {addFullResult} from "./engine.js";

function htmlText(html){
  return html.replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/[ \t]+/g," ");
}
function parseDateFromUrl(url){
  const m=url.match(/today-(\d{1,2})-(\d{2})-(20\d{2})\.html/i);
  return m?`${m[3]}-${m[2]}-${String(m[1]).padStart(2,"0")}`:null;
}
function parseDrawNo(url){
  const m=url.match(/result-([a-z]{1,4})-(\d{2,4})-today/i);
  return m?`${m[1].toUpperCase()}-${m[2]}`:"";
}
function parseLottery(url){
  const s=url.split("/").at(-1).toLowerCase();
  const map=[
    ["win-win","Win Win"],["sthree-sakthi","Sthree Sakthi"],["karunya-plus","Karunya Plus"],["karunya","Karunya"],
    ["nirmal","Nirmal"],["akshaya","Akshaya"],["fifty-fifty","Fifty Fifty"],["suvarna-keralam","Suvarna Keralam"],
    ["dhanalekshmi","Dhanalekshmi"],["bhagyathara","Bhagyathara"],["samrudhi","Samrudhi"]
  ];
  for(const [k,v] of map)if(s.includes(k))return v;
  return s.includes("bumper")?"Bumper":"";
}
function parseFull(html,url){
  const text=htmlText(html);
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let rank="",amount="",first=null;
  const four=[];
  const amountRe=/(?:Rs\.?|INR|₹)\s*([0-9][0-9,]*)/i;

  for(const line of lines){
    if(/\b(first|1st)\s+prize\b/i.test(line))rank="1";
    else if(/\b(second|2nd)\s+prize\b/i.test(line))rank="2";
    else if(/\b(third|3rd)\s+prize\b/i.test(line))rank="3";
    else if(/\b(fourth|4th)\s+prize\b/i.test(line))rank="4";
    else if(/\b(fifth|5th)\s+prize\b/i.test(line))rank="5";
    else if(/\b(sixth|6th)\s+prize\b/i.test(line))rank="6";
    else if(/\b(seventh|7th)\s+prize\b/i.test(line))rank="7";
    else if(/\b(eighth|8th)\s+prize\b/i.test(line))rank="8";
    else if(/\b(ninth|9th)\s+prize\b/i.test(line))rank="9";

    const am=line.match(amountRe);
    if(am)amount=am[1].replace(/,/g,"");

    // first prize 6D with or without series
    if(rank==="1"&&!first){
      const m=line.match(/\b(?:[A-Z]{1,3}\s*[-:]?\s*)?(\d{6})\b/);
      if(m)first=m[1];
    }

    // Four-digit lower prize numbers: require lower-prize context OR multiple 4D tokens on line.
    const cleaned=line.replace(/\b20(1[9]|2\d)\b/g," ");
    const nums=[...cleaned.matchAll(/(?<!\d)(\d{4})(?!\d)/g)].map(m=>m[1])
      .filter(n=>!/^20(1[9]|2\d)$/.test(n));
    const lowerRank=/^[4-9]$/.test(rank);
    if((lowerRank||nums.length>=2)&&nums.length){
      for(const n of nums)four.push({number:n,rank,amount});
    }
  }
  const uniq=[];const seen=new Set();
  for(const x of four){
    const k=`${x.number}|${x.rank}|${x.amount}`;
    if(!seen.has(k)){seen.add(k);uniq.push(x);}
  }
  return {draw_date:parseDateFromUrl(url),lottery_name:parseLottery(url),draw_no:parseDrawNo(url),source_url:url,first_prize:first,four_numbers:uniq};
}
async function fetchText(url){
  const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0"}});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  return r.text();
}
async function discoverToday(){
  const now=new Date();
  const dd=String(now.getUTCDate()).padStart(2,"0"),mm=String(now.getUTCMonth()+1).padStart(2,"0"),yyyy=now.getUTCFullYear();
  const targets=["https://www.keralalotteries.net/","https://www.keralalotteries.net/p/kerala-lottery-old-result.html"];
  const found=new Set();
  for(const t of targets){
    try{
      const h=await fetchText(t);
      const re=new RegExp(`href=["']([^"']*today-${dd}-${mm}-${yyyy}\\.html)["']`,"ig");
      for(const m of h.matchAll(re)){found.add(m[1].startsWith("http")?m[1]:new URL(m[1],t).href);}
    }catch{}
  }
  return [...found];
}
export async function syncUrl(url){
  const html=await fetchText(url);
  const parsed=parseFull(html,url);
  if(!parsed.draw_date)throw new Error("Could not detect draw date from URL");
  const added=addFullResult(parsed);
  return {...parsed,...added};
}
export async function syncToday(){
  const urls=await discoverToday();
  if(!urls.length)return {ok:false,message:"No today's result page found automatically",pages:0,added4:0,added1:0};
  let a4=0,a1=0,pages=0,details=[];
  for(const u of urls){
    try{
      const r=await syncUrl(u);a4+=r.added4;a1+=r.added1;pages++;details.push({url:u,first:r.first_prize,four:r.four_numbers.length});
    }catch(e){details.push({url:u,error:e.message});}
  }
  return {ok:(a4+a1)>0,message:`Full sync complete`,pages,added4:a4,added1:a1,details};
}
