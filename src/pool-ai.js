import { PoolPhysics, shotSpeed, RADIUS, HALF_X, HALF_Z } from './physics.js';
import { POCKET_DETAILS, pocketPoint, HEAD_STRING_X } from './table-model.js';
import { LEVELS, legalTargets } from './match-rules.js';

export function powerForSpeed(speed){let lo=.025,hi=1;for(let i=0;i<24;i++){const m=(lo+hi)/2;if(shotSpeed(m)<speed)lo=m;else hi=m;}return (lo+hi)/2;}
function clearPath(a,b,balls,exclude,radius) {
  const dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
  return !balls.some(ball=>{
    if(ball.pocketed||exclude.includes(ball.id))return false;
    const t=Math.max(0,Math.min(1,((ball.x-a.x)*dx+(ball.z-a.z)*dz)/Math.max(length2,1e-9)));
    return Math.hypot(ball.x-a.x-dx*t,ball.z-a.z-dz*t)<radius;
  });
}
export function chooseShot(physics,match,random=Math.random) {
  const level=LEVELS.find(l=>l.id===match.config.level)||LEVELS[0],cue=physics.cueBall;
  const remaining=physics.balls.filter(b=>b.id&&!b.pocketed).map(b=>b.id);
  const ids=legalTargets(match.config.game,match.groups[match.turn],remaining,match.breaking);
  if(match.breaking){const b=physics.balls.filter(b=>b.id&&!b.pocketed).sort((a,b)=>a.x-b.x)[0];return {angle:Math.atan2(b.z-cue.z,b.x-cue.x),power:.9,ball:b.id,pocket:0};}
  const candidates=[];
  for(const id of ids){const ball=physics.balls.find(b=>b.id===id);if(!ball)continue;
    POCKET_DETAILS.forEach((p,index)=>{
      const [px,pz]=pocketPoint(p,0,p.front+.055),dx=px-ball.x,dz=pz-ball.z,length=Math.hypot(dx,dz);
      const ghost={x:ball.x-dx/length*RADIUS*2,z:ball.z-dz/length*RADIUS*2};
      if(Math.abs(ghost.x)>HALF_X-RADIUS||Math.abs(ghost.z)>HALF_Z-RADIUS)return;
      const path=Math.hypot(ghost.x-cue.x,ghost.z-cue.z),cos=((ghost.x-cue.x)*dx+(ghost.z-cue.z)*dz)/(path*length);
      if(cos<.24||!clearPath(cue,ghost,physics.balls,[0,id],RADIUS*2.04)||!clearPath(ball,{x:px,z:pz},physics.balls,[0,id],RADIUS*2.02))return;
      const a=physics.rollingFriction*34;
      const speed=(Math.sqrt(2*a*length)+.65)/cos*1.35+path*.24;
      candidates.push({angle:Math.atan2(ghost.z-cue.z,ghost.x-cue.x),power:powerForSpeed(speed),ball:id,pocket:index,score:path+length+5*(1-cos)});
    });
  }
  candidates.sort((a,b)=>a.score-b.score);
  let shot=candidates[Math.floor(random()*Math.min(candidates.length,level.error>.02?3:1))];
  if(!shot){
    const targets=physics.balls.filter(b=>ids.includes(b.id));
    targets.sort((a,b)=>Number(clearPath(cue,b,physics.balls,[0,b.id],2*RADIUS))-Number(clearPath(cue,a,physics.balls,[0,a.id],2*RADIUS))||Math.hypot(a.x-cue.x,a.z-cue.z)-Math.hypot(b.x-cue.x,b.z-cue.z));
    const b=targets[0];if(!b)return null;
    shot={angle:Math.atan2(b.z-cue.z,b.x-cue.x),power:.38,ball:b.id,pocket:0};
  }
  return {...shot,angle:shot.angle+(random()+random()-1)*level.error,power:Math.max(.025,Math.min(1,shot.power*(1+(random()-.5)*level.error*3)))};
}
export function lagPower(friction,levelId,random=Math.random) {
  // Calibrate a straight lag against the same friction/rail solver as the game.
  let best=.4,error=Infinity;
  for(let i=0;i<=32;i++){
    const power=.25+i*.009,sim=new PoolPhysics();sim.rollingFriction=friction;
    sim.balls.forEach(b=>{b.pocketed=b.id>1;});Object.assign(sim.cueBall,{x:HEAD_STRING_X-.1,z:-.8});Object.assign(sim.balls[1],{x:0,z:1.7});
    let foot=0;sim.onEvent=e=>{if(e.type==='cushion'&&e.id===0&&e.inward[0]===-1)foot++;};
    sim.shoot(0,power);for(let n=0;n<1600&&sim.moving;n++)sim.update(1/120);
    const distance=Math.abs(sim.cueBall.x-(-HALF_X+RADIUS+.05));
    if(foot===1&&!sim.scratch&&distance<error){error=distance;best=power;}
  }
  const level=LEVELS.find(l=>l.id===levelId)||LEVELS[0];return Math.max(.2,Math.min(.65,best+(random()-.5)*level.error));
}
