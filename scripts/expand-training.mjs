// Add physically verified alternatives; this can be rerun after calibration.
import {readFile,writeFile} from 'node:fs/promises';
import {LESSONS} from '../src/training/catalog.js';
import {simulateLesson,aimFor} from '../src/training/engine.js';
const file=new URL('../src/training/solutions.json',import.meta.url),all=JSON.parse(await readFile(file,'utf8'));
for(const lesson of LESSONS){
 const base=all[lesson.id].filter(s=>!s.expanded),extra=[];
 // A small lateral tip offset gives a real spin comparison, without inventing an effect.
 for(const x of [-.55,.55]){
  for(const s of base){const shot={...s,tip:{x,y:0},expanded:true,label:x<0?'Ép phê trái':'Ép phê phải'};
   if(simulateLesson(lesson,shot).result.passed){extra.push(shot);break;}
  }
 }
 if(lesson.id==='cut-gentle'){
  for(const bank of [false,true]){
   let found=false;
   for(const pocket of [2,4,5,1,0,3]){
    if(!bank&&pocket===lesson.pocket)continue;
    const layout={...lesson,pocket,bank,skill:bank?'bank':undefined};
    const offsets=bank?Array.from({length:65},(_,i)=>(i-32)*.006):Array.from({length:41},(_,i)=>(i-20)*.0005);
    outer:for(const offset of offsets)for(let power=.23;power<.86;power+=.025){
     const shot={angle:aimFor(layout)+offset,power:Number(power.toFixed(4)),tip:{x:0,y:0},pocket,bank,expanded:true,label:bank?'Thử đường một băng':'Đổi lỗ đích'};
     const sim=simulateLesson(lesson,shot);
     if(sim.result.passed&&(bank||!sim.events.some(e=>e.type==='cushion'&&e.id===lesson.target))){extra.push(shot);found=true;break outer;}
    }
    if(found)break;
   }
  }
 }
 all[lesson.id]=[...base,...extra];console.log(lesson.id,all[lesson.id].length);
}
await writeFile(file,JSON.stringify(all,null,2)+'\n');
