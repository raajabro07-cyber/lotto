
import fs from "fs";
import path from "path";
const SYNC_FILE=path.resolve("data/synced_results.json");

export function loadSynced(){
  try{
    const x=JSON.parse(fs.readFileSync(SYNC_FILE,"utf8"));
    return Array.isArray(x)?x:[];
  }catch{return [];}
}
export function saveSynced(rows){
  try{
    fs.writeFileSync(SYNC_FILE,JSON.stringify(rows,null,2));
    return true;
  }catch{return false;}
}
