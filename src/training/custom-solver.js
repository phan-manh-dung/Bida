import {HALF_X,HALF_Z,RADIUS,POCKET_DETAILS} from '../table-model.js';
import {aimFor,simulateLesson} from './engine.js';

export function validPosition(balls,id,x,z){
  return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=HALF_X-RADIUS&&Math.abs(z)<=HALF_Z-RADIUS
    &&balls.every(b=>b.id===id||Math.hypot(b.x-x,b.z-z)>=RADIUS*2+.005)
    &&POCKET_DETAILS.every(p=>Math.hypot(p.x-x,p.z-z)>.25);
}

// Yield between batches in the caller (worker). All other balls remain in the
// simulation: a geometric ghost-ball line alone is never called a solution.
export function* searchCustom(layout){
  const tips=[{x:0,y:0},{x:0,y:-.65},{x:0,y:.65},{x:-.5,y:0},{x:.5,y:0},{x:-.4,y:.5},{x:.4,y:-.5}];
  const results=[];let tested=0;
  search: for(const bank of [false,true])for(const tip of tips)for(let pocket=0;pocket<6;pocket++){
    const lesson={...layout,pocket,bank};
    const base=aimFor(lesson);let found=false;
    for(const offset of [0,-.006,.006,-.018,.018]){
      for(const power of [.22,.36,.52,.72,.9]){
        const shot={angle:base+offset,power,tip,pocket,bank};
        const preview=simulateLesson(lesson,shot);
        tested++;
        if(preview.result.passed){
          const rails=preview.events.filter(e=>e.type==='cushion'&&e.id===0).length;
          results.push({...shot,score:power+Math.hypot(tip.x,tip.y)*.25+rails*.12+(bank?1:0)});
          found=true;
        }
        if(tested%30===0)yield {tested};
        if(tested>=1800)break search;
        if(found)break;
      }
      if(found)break;
    }
    if(results.length>=10)break search;
  }
  return {tested,shots:results.sort((a,b)=>a.score-b.score).slice(0,8)};
}
