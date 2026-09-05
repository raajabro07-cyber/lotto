
import express from "express";import TelegramBot from "node-telegram-bot-api";import {extract} from "./ocr.js";import {loadData,analyze,status} from "./engine.js";
const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)throw Error("TELEGRAM_BOT_TOKEN missing");
const bot=new TelegramBot(token,{polling:false}),app=express(),port=Number(process.env.PORT||10000),secret=process.env.WEBHOOK_SECRET||"lotto-v4",max=Number(process.env.MAX_TICKETS_PER_PHOTO||10);app.use(express.json({limit:"6mb"}));loadData();
const gv=v=>v==null?"Never":`${v}d`;
function fmt(x){
 const p=x.p4,b=p.b;
 let s=`INPUT: ${x.input}\nAS OF: ${x.asOf}\n\nLAST-4: ${x.suffix}\nHistorical appearances: ${p.total}\nHistorical frequency: ${p.freqPct}% of draws\nObserved 1-6 day repeat rate: ${p.repeatPct}%\nLast seen: ${gv(p.lastGap)} ago\nMedian recurrence gap: ${gv(p.medianGap)}\nShortest/Longest gap: ${gv(p.minGap)} / ${gv(p.maxGap)}\nRepeat gaps: 1d=${b.d1}, 2d=${b.d2}, 3d=${b.d3}, 4-6d=${b.d46}, 7-15d=${b.d715}, 16-30d=${b.d1630}, 30+d=${b.d30}\nLast-4 Repeat Probability (Historical Model): ${p.score}%\n`;
 if(x.e6)s+=`\nEXACT 6-DIGIT: ${x.input}\nHistorical appearances: ${x.e6.total}\nObserved 1-6 day repeat rate: ${x.e6.repeatPct}%\nLast seen: ${gv(x.e6.lastGap)} ago\n6-Digit Repeat Probability (Historical Model): ${x.e6.score}%\n`;
 s+=`\nCOMBINED HISTORICAL MODEL: ${x.combined}%\n\nBOT CANDIDATES\n`;
 x.suggestions.forEach((c,i)=>s+=`${i+1}. ${c.s} — ${c.score}% | hits ${c.total} | last ${gv(c.lastGap)} | 1-6d repeat ${c.repeatPct}%${i===0?"  BEST":""}\n`);
 return s+"\nPercentages are model scores/observed historical rates, not guaranteed future draw probabilities.";
}
async function handle(m){if(!m?.chat?.id)return;const id=m.chat.id;
 if(m.text==="/start"){const st=status();return bot.sendMessage(id,`Kerala Lottery One-Week Test V4\nRows: ${st.rows}\nThrough: ${st.lastDate}\n\nType a 4-digit or 6-digit number, or send ticket photo.`);}
 if(m.text==="/status"){const st=status();return bot.sendMessage(id,`ONLINE\nRows: ${st.rows}\nThrough: ${st.lastDate}`);}
 if(m.text){const vals=[...m.text.matchAll(/\b(\d{4}|\d{6})\b/g)].map(x=>x[1]).slice(0,max);for(const v of vals){const a=analyze(v,new Date());if(a)await bot.sendMessage(id,fmt(a));}return;}
 if(m.photo?.length){await bot.sendMessage(id,"Photo analyse cheyyunnu...");try{const f=m.photo.at(-1),url=await bot.getFileLink(f.file_id),r=await fetch(url),buf=Buffer.from(await r.arrayBuffer()),ts=await extract(buf,max);if(!ts.length)return bot.sendMessage(id,"OCR clear alla. Number manually type cheyyuka.");await bot.sendMessage(id,"Detected:\n"+ts.map(t=>`${t.series? t.series+" ":""}${t.number}`).join("\n"));for(const t of ts){const a=analyze(t.number,new Date());if(a)await bot.sendMessage(id,fmt(a));}}catch(e){console.error(e);await bot.sendMessage(id,"Photo analysis error.");}}
}
app.get("/",(_,r)=>r.send(`Kerala Lottery V4 ONLINE | rows=${status().rows}`));app.get("/health",(_,r)=>r.json({ok:true,...status()}));app.post(`/telegram/${secret}`,(req,res)=>{res.sendStatus(200);handle(req.body?.message).catch(console.error);});
app.listen(port,"0.0.0.0",async()=>{const u=process.env.RENDER_EXTERNAL_URL;if(u){try{await bot.setWebHook(`${u.replace(/\/$/,"")}/telegram/${secret}`);console.log("Webhook set");}catch(e){console.error(e.message);}}console.log("ONLINE",status());});
