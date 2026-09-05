
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import {extract} from "./ocr.js";
import {loadData,analyzeInput,status} from "./engine.js";
import {syncToday,syncUrl} from "./sync.js";

const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)throw Error("TELEGRAM_BOT_TOKEN missing");
const bot=new TelegramBot(token,{polling:false});
const app=express();
const port=Number(process.env.PORT||10000),secret=process.env.WEBHOOK_SECRET||"lotto-v7",max=Number(process.env.MAX_TICKETS_PER_PHOTO||10);
const admin=String(process.env.ADMIN_CHAT_ID||"").trim();
app.use(express.json({limit:"8mb"}));loadData();

const g=v=>v==null?"Never":`${v} day${v===1?"":"s"}`;
const kb=()=>({reply_markup:{inline_keyboard:[[{text:"🔄 Sync Today",callback_data:"sync_today"}],[{text:"📊 Status",callback_data:"status"}]]}});
function isAdmin(id){return !admin||String(id)===admin;}

function format4(x){
 const p=x.p4;
 let s=`INPUT: ${x.input}\nAS OF: ${x.asOf}\n\n4-DIGIT ANALYSIS: ${x.four}\n`;
 if(p.last){
   s+=`Last seen: ${p.last.date} (${g(p.last.days)} ago)`;
   if(p.last.amount)s+=` | Prize Rs ${p.last.amount}`;
   s+="\n";
 } else s+="Last seen: Never\n";
 s+=p.cooldown?`⚠️ 6-DAY COOLDOWN: ACTIVE — robot will NOT suggest ${x.four}\n`:`✅ 6-DAY COOLDOWN: CLEAR\n`;
 s+=`\nHistory: 365d=${p.h365} | 180d=${p.h180} | 90d=${p.h90} | 30d=${p.h30} | All=${p.total}\n`;
 const ys=Object.entries(p.yearly).map(([y,c])=>`${y}:${c}`).join(" | ");if(ys)s+=`Year-wise: ${ys}\n`;
 s+=`Historical Strength: ${p.score}/100\n\n🤖 ROBOT SUGGESTIONS\n`;
 if(!x.suggestions.length)s+=`No strong nearby historical suggestion found.\n`;
 else x.suggestions.forEach((c,i)=>{
   s+=`${i+1}. ${c.s} — ${c.score}/100${i===0?" ★ BEST":""}\n`;
   s+=`   365d:${c.h365} | 180d:${c.h180} | 90d:${c.h90} | All:${c.total}\n`;
   s+=`   Last:${c.last?g(c.last.days)+" ago":"Never"} | digit changes:${c.ham} | distance:${c.dist}\n`;
 });
 return s;
}
function formatFirst(f){
 if(!f)return"";
 const st=f.structure;
 let s=`\nFIRST-PRIZE 6D PATTERN\nNumber: ${f.n}\n`;
 s+=`Structure score: ${st.score}/100\nHistorical similarity: ${f.simScore}/100\nDate/Numerology similarity: ${f.rootMatch}/100 (number root ${st.root}, date root ${f.dateRoot})\n`;
 s+=`Doubles:${st.doubles} | Triples:${st.triples} | Near-serial pairs:${st.serial} | Max repeat:${st.maxRepeat} | Family density:${st.density}/4\n`;
 s+=`Overall First-Prize Pattern Score: ${f.score}/100\n`;
 if(f.near.length)s+=`Closest historical first-prize structures:\n`+f.near.map(n=>`• ${n.num} (${n.date})`).join("\n")+"\n";
 s+=f.red?`\n🔴🔴 RED ALERT — STRONG FIRST-PRIZE PATTERN MATCH 🔴🔴\n`:`No RED ALERT.\n`;
 s+=`Numerology/structure is a model feature, not proof of higher random-draw odds.\n`;
 return s;
}
function fmt(x){return format4(x)+formatFirst(x.first);}

async function sendStatus(id){
 const s=status();
 return bot.sendMessage(id,`BOT ONLINE\n4-digit historical rows: ${s.fourRows}\nFirst-prize rows: ${s.firstRows}\nSynced runtime rows: ${s.syncedRows}\nLatest date: ${s.lastDate}`,kb());
}
async function doSync(id){
 if(!isAdmin(id))return bot.sendMessage(id,"Sync is admin-only.");
 await bot.sendMessage(id,"🔄 Full result sync starting...");
 const r=await syncToday();
 return bot.sendMessage(id,`${r.ok?"✅":"⚠️"} ${r.message}\nPages: ${r.pages}\n4-digit added: ${r.added4}\nFirst-prize added: ${r.added1}`,kb());
}
async function handle(m){
 if(!m?.chat?.id)return;const id=m.chat.id;
 if(m.text==="/start"){const s=status();return bot.sendMessage(id,`Kerala Lottery FINAL V7\n\n4-digit full-prize history + 6-day cooldown + robot nearby suggestions + 6-digit first-prize RED ALERT + full daily sync.\n\n4D rows: ${s.fourRows}\nFirst-prize rows: ${s.firstRows}`,kb());}
 if(m.text==="/status")return sendStatus(id);
 if(m.text==="/sync")return doSync(id);
 if(m.text?.startsWith("/syncurl ")){
   if(!isAdmin(id))return bot.sendMessage(id,"Sync is admin-only.");
   const url=m.text.slice(9).trim();
   try{
     const r=await syncUrl(url);
     return bot.sendMessage(id,`✅ URL sync complete\nDate:${r.draw_date}\nFirst prize:${r.first_prize||"not found"}\n4-digit parsed:${r.four_numbers.length}\nAdded 4D:${r.added4}\nAdded first:${r.added1}`,kb());
   }catch(e){return bot.sendMessage(id,`❌ Sync URL failed: ${e.message}`);}
 }
 if(m.text){
   const vals=[...m.text.matchAll(/\b(\d{4}|\d{6})\b/g)].map(x=>x[1]).slice(0,max);
   for(const v of vals){const a=analyzeInput(v,new Date());if(a)await bot.sendMessage(id,fmt(a),kb());}
   return;
 }
 if(m.photo?.length){
   await bot.sendMessage(id,"Photo analyse cheyyunnu...");
   try{
     const f=m.photo.at(-1),url=await bot.getFileLink(f.file_id),r=await fetch(url),buf=Buffer.from(await r.arrayBuffer()),ts=await extract(buf,max);
     if(!ts.length)return bot.sendMessage(id,"OCR clear alla. Number manually type cheyyuka.",kb());
     await bot.sendMessage(id,"Detected:\n"+ts.map(t=>`${t.series?t.series+" ":""}${t.number}`).join("\n"));
     for(const t of ts){const a=analyzeInput(t.number,new Date());if(a)await bot.sendMessage(id,fmt(a),kb());}
   }catch(e){console.error(e);await bot.sendMessage(id,"Photo analysis error.",kb());}
 }
}
async function handleCallback(q){
 const id=q.message?.chat?.id;if(!id)return;
 try{await bot.answerCallbackQuery(q.id);}catch{}
 if(q.data==="sync_today")return doSync(id);
 if(q.data==="status")return sendStatus(id);
}

app.get("/",(_,r)=>{const s=status();r.send(`Kerala Lottery FINAL V7 ONLINE | 4D=${s.fourRows} | FIRST=${s.firstRows}`);});
app.get("/health",(_,r)=>r.json({ok:true,...status()}));
app.post(`/telegram/${secret}`,(req,res)=>{
 res.sendStatus(200);
 if(req.body?.callback_query)handleCallback(req.body.callback_query).catch(console.error);
 else handle(req.body?.message).catch(console.error);
});
app.listen(port,"0.0.0.0",async()=>{
 const u=process.env.RENDER_EXTERNAL_URL;
 if(u){try{await bot.setWebHook(`${u.replace(/\/$/,"")}/telegram/${secret}`);console.log("Webhook set");}catch(e){console.error(e.message);}}
 console.log("ONLINE",status());
});
