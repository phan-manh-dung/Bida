import {PoolPhysics,RADIUS} from '../physics.js';
import {POCKET_DETAILS,pocketPoint,HALF_Z} from '../table-model.js';

export function loadLayout(physics,lesson){
  physics.reset('practice');physics.autoRespot=false;
  for(const ball of physics.balls){
    const point=lesson.balls.find(p=>p.id===ball.id);
    ball.pocketed=!point;
    if(point)Object.assign(ball,point,{px:point.x,pz:point.z});
  }
}
export function aimFor(lesson){
  const cue=lesson.balls.find(b=>!b.id),ball=lesson.balls.find(b=>b.id===lesson.target);
  let [x,z]=pocketPoint(POCKET_DETAILS[lesson.pocket],0,POCKET_DETAILS[lesson.pocket].front+.055);
  if(lesson.bank)z=2*(-HALF_Z+RADIUS)-z;
  const length=Math.hypot(x-ball.x,z-ball.z);
  const ghost={x:ball.x-(x-ball.x)/length*RADIUS*2,z:ball.z-(z-ball.z)/length*RADIUS*2};
  return Math.atan2(ghost.z-cue.z,ghost.x-cue.x);
}
export function simulateLesson(lesson,shot,trace=false){
  lesson=resolveLesson(lesson,shot);
  const events=[];let impact=null;
  const physics=new PoolPhysics(e=>{events.push(e);if(!impact&&e.type==='contact'&&(e.a===0||e.b===0)){
    const c=physics.cueBall,b=physics.balls.find(b=>b.id===lesson.target);
    impact={cue:{x:c.x,z:c.z},object:{x:b.x,z:b.z}};
  }});loadLayout(physics,lesson);
  const paths={0:[],[lesson.target]:[]};
  physics.shoot(shot.angle,shot.power,shot.tip);
  for(let i=0;i<3600&&physics.moving;i++){
    if(trace&&i%4===0)for(const id of Object.keys(paths)){
      const b=physics.balls.find(b=>b.id===Number(id));if(!b.pocketed)paths[id].push([b.x,b.z]);
    }
    physics.update(1/120);
  }
  if(trace)for(const id of Object.keys(paths)){const b=physics.balls.find(b=>b.id===Number(id));if(!b.pocketed)paths[id].push([b.x,b.z]);}
  return {physics,events,paths,impact,result:evaluateLesson(lesson,physics,events)};
}
export function resolveLesson(lesson,shot){
  return {...lesson,pocket:shot.pocket??lesson.pocket,bank:shot.bank??lesson.bank,skill:shot.bank?'bank':lesson.skill};
}
export function evaluateLesson(lesson,physics,events){
  const contact=events.find(e=>e.type==='contact'&&(e.a===0||e.b===0));
  const first=contact&&(contact.a===0?contact.b:contact.a);
  const pocket=events.find(e=>e.type==='pocket'&&e.id===lesson.target);
  const scratch=physics.scratch||physics.cueBall.pocketed||events.some(e=>e.type==='off-table');
  if(scratch)return {passed:false,message:'Bi cái rơi lỗ hoặc có bi ra ngoài bàn. Thử lại và quan sát đường bi cái.'};
  if(first!==lesson.target)return {passed:false,message:'Chưa chạm đúng bi mục tiêu. Bật đường mẫu để so sánh điểm ngắm.'};
  if(!pocket)return {passed:false,message:'Bi mục tiêu chưa vào lỗ. So sánh hướng ngắm và lực với phương án mẫu.'};
  if(pocket.pocketIndex!==lesson.pocket)return {passed:false,message:'Bi đã vào một lỗ khác. Bài này cần lỗ đang được đánh dấu.'};
  const cue=lesson.balls.find(b=>!b.id),object=lesson.balls.find(b=>b.id===lesson.target),end=physics.cueBall;
  const d=Math.hypot(object.x-cue.x,object.z-cue.z),ux=(object.x-cue.x)/d,uz=(object.z-cue.z)/d;
  const cx=object.x-ux*2*RADIUS,cz=object.z-uz*2*RADIUS;
  const travel=(end.x-cx)*ux+(end.z-cz)*uz;
  let technique=true;
  if(lesson.skill==='stop')technique=Math.hypot(end.x-cx,end.z-cz)<.4;
  if(lesson.skill==='draw')technique=travel<-.25;
  if(lesson.skill==='follow')technique=travel>.3;
  // A rebound that happens to finish behind the object is not a draw lesson.
  if(['draw','follow','stop'].includes(lesson.skill)&&events.some(e=>e.type==='cushion'&&e.id===0))technique=false;
  if(lesson.skill==='bank')technique=events.slice(0,events.indexOf(pocket)).filter(e=>e.type==='cushion'&&e.id===lesson.target&&!e.jaw).length===1;
  if(!technique)return {passed:false,potted:true,message:'Đã vào bi an toàn, nhưng chưa đạt mục tiêu kỹ thuật. Xem lại yêu cầu và thử cách chạm đầu cơ khác.'};
  return {passed:!physics.moving,message:'Đạt mục tiêu! Bạn có thể thử phương án khác, tự đánh không gợi ý hoặc chuyển bài.'};
}
