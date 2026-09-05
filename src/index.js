
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import {extractTickets} from "./ocr.js";
import {loadData,rankTickets,status} from "./analyzer.js";

const token=process.env.TELEGRAM_BOT_TOKEN;
if(!token) throw new Error("TELEGRAM_BOT_TOKEN missing in Render Environment");

const secret=process.env.WEBHOOK_SECRET || "lottery-secure-hook";
const port=Number(process.env.PORT || 10000);
const max=Number(process.env.MAX_TICKETS_PER_PHOTO || 10);
const bot=new TelegramBot(token,{polling:false});
const app=express();
app.use(express.json({limit:"6mb"}));
loadData();

function g(v){return v===null||v===undefined?"Never":`${v} days`;}
function report(a){
  if(!a.length)return"Ticket number clear ayi kandethan pattiyilla. 6-digit number type cheyyuka.";
  let s=`DATE-AWARE HISTORICAL ANALYSIS\nAs of: ${a[0].asOf}\n\n`;
  a.forEach((x,i)=>{
    s+=`${i===0&&a.length>1?"BEST HISTORICAL RANK\n":""}${i+1}. ${x.series?x.series+" ":""}${x.number}\n`;
    s+=`Historical Pattern Score: ${x.score}/100\n`;
    s+=`Exact last seen: ${g(x.gapExact)}\n`;
    s+=`Last4 gap: ${g(x.gap4)} | Last3 gap: ${g(x.gap3)} | Last2 gap: ${g(x.gap2)}\n`;
    s+=`30d Last2 hits: ${x.hot30} | 90d Last3 hits: ${x.hot90} | 365d Last4 hits: ${x.hot365}\n`;
    s+=`All-history Last4/3/2: ${x.all4}/${x.all3}/${x.all2}\n\n`;
  });
  s+="This is historical pattern analysis only, not a true future winning probability.";
  return s;
}

async function handle(m){
  if(!m?.chat?.id)return;
  const id=m.chat.id;
  if(m.text==="/start"){
    const st=status();
    return bot.sendMessage(id,`Kerala Lottery Analyzer V2 ready.\nHistorical rows: ${st.rows}\nDatabase through: ${st.lastDate}\n\nSend 1-10 tickets in a photo or type 6-digit numbers.`);
  }
  if(m.text==="/status"){
    const st=status();
    return bot.sendMessage(id,`ONLINE\nHistorical rows: ${st.rows}\nDatabase through: ${st.lastDate}`);
  }
  if(m.text){
    const t=[...m.text.toUpperCase().matchAll(/\b([A-Z]{1,3})?\s*[-:]?\s*(\d{6})\b/g)]
      .map(x=>({series:x[1]||"",number:x[2]})).slice(0,max);
    if(t.length)return bot.sendMessage(id,report(rankTickets(t,new Date())));
  }
  if(m.photo?.length){
    try{
      await bot.sendMessage(id,"Photo analyse cheyyunnu...");
      const f=m.photo.at(-1),link=await bot.getFileLink(f.file_id);
      const res=await fetch(link),buf=Buffer.from(await res.arrayBuffer());
      const t=await extractTickets(buf,max);
      if(!t.length)return bot.sendMessage(id,"OCR clear alla. Photo straight/close ayi ayakkuka, allenkil number type cheyyuka.");
      await bot.sendMessage(id,"Detected:\n"+t.map(x=>`${x.series?x.series+" ":""}${x.number}`).join("\n"));
      return bot.sendMessage(id,report(rankTickets(t,new Date())));
    }catch(e){console.error(e);return bot.sendMessage(id,"Photo analysis error. Number manually type cheyyuka.");}
  }
}

app.get("/",(_,r)=>{const s=status();r.send(`Kerala Lottery Analyzer V2 ONLINE | rows=${s.rows} | through=${s.lastDate}`);});
app.get("/health",(_,r)=>r.json({ok:true,...status()}));
app.post(`/telegram/${secret}`,(req,res)=>{res.sendStatus(200);handle(req.body?.message).catch(console.error);});

app.listen(port,"0.0.0.0",async()=>{
  console.log("Server ONLINE on port",port);
  console.log("Database",status());
  const base=process.env.RENDER_EXTERNAL_URL || process.env.SERVICE_URL;
  if(base){
    try{
      const url=`${base.replace(/\/$/,"")}/telegram/${secret}`;
      await bot.setWebHook(url);
      console.log("Telegram webhook set:",url);
    }catch(e){console.error("Webhook setup failed:",e.message);}
  } else console.log("No external URL env found yet; open/redeploy after Render assigns URL.");
});
