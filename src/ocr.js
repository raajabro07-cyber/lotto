
import {createWorker} from "tesseract.js";
export async function extract(buf,max=10){
  const w=await createWorker("eng");
  try{
    const {data:{text}}=await w.recognize(buf),up=text.toUpperCase(),out=[],seen=new Set();
    for(const m of up.matchAll(/\b([A-Z]{1,3})\s*[-:]?\s*(\d{6})\b/g)){
      if(!seen.has(m[2])){seen.add(m[2]);out.push({series:m[1],number:m[2]});if(out.length>=max)break;}
    }
    if(!out.length)for(const m of up.matchAll(/\b(\d{6})\b/g)){
      if(!seen.has(m[1])){seen.add(m[1]);out.push({series:"",number:m[1]});if(out.length>=max)break;}
    }
    return out;
  }finally{await w.terminate();}
}
