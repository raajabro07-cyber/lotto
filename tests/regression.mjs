
import {analyzeInput,status} from "../src/engine.js";
import {analyzeBumper} from "../src/bumper.js";
function ok(cond,msg){if(!cond){console.error("FAIL",msg);process.exitCode=1;}else console.log("PASS",msg);}
const now=new Date("2026-09-06T12:00:00Z");
let a=analyzeInput("3542",now);ok(a.p4.last?.date==="2026-09-04","3542 last seen = 2026-09-04");ok(a.p4.cooldown===true,"3542 cooldown active");
a=analyzeInput("0817",now);ok(a.p4.last?.date==="2026-09-04","0817 last seen = 2026-09-04");ok(a.p4.cooldown===true,"0817 cooldown active");
a=analyzeInput("1107",now);ok(a.p4.last?.date==="2026-09-05","1107 partial validation = 2026-09-05");
const b=analyzeBumper("3068",now);ok(b.p4.last?.date==="2026-07-18","B3068 last bumper = 2026-07-18");ok(b.p4.inLast2>0,"B3068 recent bumper filter blocked");
const s=status();ok(s.lastCompleteDate==="2026-09-04","static latest complete = 2026-09-04 before catch-up");
