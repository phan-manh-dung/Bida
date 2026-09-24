const KEY='noir:training:v1';
export function readProgress(storage){
  try{const data=JSON.parse(storage.getItem(KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}
}
export function recordAttempt(progress,id,passed,assisted){
  const old=progress[id]||{};
  return {...progress,[id]:{...old,attempts:(Number(old.attempts)||0)+1,completed:!!old.completed||passed,independent:!!old.independent||(passed&&!assisted),lastPassed:passed}};
}
export function saveProgress(storage,progress){try{storage.setItem(KEY,JSON.stringify(progress));return true;}catch{return false;}}
