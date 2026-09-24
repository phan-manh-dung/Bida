// Offline authoring tool. Never searches on the UI thread.
import {writeFile} from 'node:fs/promises';
import {LESSONS} from '../src/training/catalog.js';
import {aimFor,simulateLesson} from '../src/training/engine.js';
const solutions={};
for(const lesson of LESSONS){
  const variants=[];
  const tips=lesson.skill==='draw'?[-.9,-.65]:lesson.skill==='follow'?[.65,.9]:[0,-.65,.65];
  for(const y of tips){
    let found;
    const offsets=lesson.bank?Array.from({length:81},(_,i)=>(i-40)*.005):[0,.002,-.002,.005,-.005];
    outer:for(const offset of offsets)for(let power=.18;power<=(lesson.bank?.85:.65);power+=.025){
      const shot={angle:aimFor(lesson)+offset,power:Number(power.toFixed(4)),tip:{x:0,y}};
      const sim=simulateLesson(lesson,shot);
      if(sim.result.passed){found={...shot,label:y<0?'Đầu cơ thấp':y>0?'Đầu cơ cao':'Đầu cơ ở tâm'};break outer;}
    }
    if(found)variants.push(found);
  }
  if(!variants.length)throw new Error(`No verified solution: ${lesson.id}`);
  solutions[lesson.id]=variants;console.log(lesson.id,variants.length);
}
await writeFile(new URL('../src/training/solutions.json',import.meta.url),JSON.stringify(solutions,null,2)+'\n');
