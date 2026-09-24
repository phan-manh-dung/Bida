import test from 'node:test';
import assert from 'node:assert/strict';
import { PoolPhysics, createRack, RADIUS, HALF_X, HALF_Z, clothMotion, GRAVITY, SLIDING_FRICTION, ROLLING_FRICTION, shotSpeed } from '../src/physics.js';
import { cueElevation, cuePose, supportHeight, CUE_LENGTH } from '../src/cue-pose.js';
import { pullTravel, pullPower } from '../src/shot-control.js';
import { CUSHIONS, POCKET_DETAILS, pocketPoint, FOOT_SPOT_X, HEAD_STRING_X, BREAK_CUE_X, CLOTH_Y, RAIL_TOP, UNITS_PER_MM, BALL_DIAMETER_MM, TABLE_LENGTH_MM, TABLE_WIDTH_MM } from '../src/table-model.js';

function runUntilStill(game, seconds = 35) {
  for (let i = 0; i < seconds * 120 && game.moving; i++) game.update(1 / 120);
  assert.equal(game.moving, false, 'All balls should settle');
}
function isolate(game, ids) {
  game.balls.forEach(b => { b.pocketed = !ids.includes(b.id); });
}

test('low tip draws back after impact while high tip follows the object ball',()=>{
 const outcomes=[];
 for(const y of [-1,0,1]){
  const p=new PoolPhysics();isolate(p,[0,1]);Object.assign(p.cueBall,{x:-1,z:0});Object.assign(p.balls[1],{x:0,z:0});
  let contact=null;p.onEvent=e=>{if(e.type==='contact'&&contact===null)contact=p.cueBall.x;};
  p.shoot(0,.5,{x:0,y});for(let i=0;i<180;i++)p.update(1/360);
  assert.notEqual(contact,null);outcomes.push({x:p.cueBall.x,vx:p.cueBall.vx,contact});
 }
 assert.ok(outcomes[0].vx<-.5&&outcomes[0].x<outcomes[0].contact-.15,'Backspin must physically reverse the cue ball after contact');
 assert.ok(outcomes[2].vx>1&&outcomes[2].x>outcomes[1].x+.1,'Follow must advance further than centre ball');
});

test('opposite side spin changes rail rebound in opposite directions and dissipates energy',()=>{
 const rebounds=[];
 for(const x of [-1,0,1]){
  const p=new PoolPhysics();isolate(p,[0,1]);Object.assign(p.cueBall,{x:3.6,z:.5});Object.assign(p.balls[1],{x:-3,z:1});
  let rebound=null;p.onEvent=e=>{if(e.type==='cushion'&&e.id===0&&rebound===null)rebound={vx:p.cueBall.vx,vz:p.cueBall.vz};};
  p.shoot(0,.45,{x,y:0});
  const energy=()=>p.balls.filter(b=>!b.pocketed).reduce((sum,b)=>sum+.5*(b.vx*b.vx+b.vz*b.vz)+.2*RADIUS*RADIUS*(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz),0);
  const initial=energy();for(let i=0;i<240;i++)p.update(1/360);
  assert.ok(rebound&&rebound.vx<0);assert.ok(energy()<=initial+1e-6);rebounds.push(rebound.vz);runUntilStill(p);
 }
 assert.ok(rebounds[0]*rebounds[2]<0);assert.ok(Math.abs(rebounds[0])>.1);assert.ok(Math.abs(rebounds[0]+rebounds[2])<1e-6);assert.ok(Math.abs(rebounds[1])<1e-8);
});

test('tip input clamps safely and pure side spin rotates the visible ball until it stops',()=>{
 const p=new PoolPhysics();isolate(p,[0,1]);
 p.shoot(0,.4,{x:100,y:100});
 assert.ok(Math.hypot(p.cueBall.wx,p.cueBall.wy,p.cueBall.wz)*RADIUS<=shotSpeed(.4)*1.25+1e-8);
 p.reset();isolate(p,[0,1]);Object.assign(p.cueBall,{x:0,z:0,wy:10});p.moving=true;
 const q=p.cueBall.qy;p.update(.05);assert.notEqual(p.cueBall.qy,q);assert.equal(p.cueBall.x,0);runUntilStill(p);assert.equal(p.cueBall.wy,0);
 p.reset();p.shoot(0,.4,{x:NaN,y:Infinity});assert.equal(Math.abs(p.cueBall.wy),0);assert.equal(Math.abs(p.cueBall.wz),0);
});

test('both layouts have 16 distinct, non-overlapping balls inside the table', () => {
  for (const layout of ['practice', 'rack']) {
    const balls = createRack(layout);
    assert.equal(new Set(balls.map(b => b.id)).size, 16);
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      assert.ok(Math.abs(a.x) < HALF_X - RADIUS && Math.abs(a.z) < HALF_Z - RADIUS);
      for (const b of balls.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= RADIUS * 2);
    }
  }
});
test('shot transfers motion to an object ball and rejects shooting while rolling', () => {
  const game = new PoolPhysics(); isolate(game, [0, 1]);
  Object.assign(game.cueBall, { x: -1, z: 0 });
  Object.assign(game.balls.find(b => b.id === 1), { x: 0, z: 0 });
  assert.equal(game.shoot(0, 0.4), true);
  assert.equal(game.shoot(Math.PI, 1), false);
  for (let i = 0; i < 50; i++) game.update(1 / 120);
  assert.ok(game.balls.find(b => b.id === 1).vx > 0.5);
  assert.equal(game.shots, 1);
  runUntilStill(game);
});
test('side pocket captures a ball and scratch respots cue without overlap', () => {
  const events = [];
  const game = new PoolPhysics(e => events.push(e)); isolate(game, [0, 1]);
  Object.assign(game.cueBall, { x: 0, z: -1.4 });
  Object.assign(game.balls.find(b => b.id === 1), { x: -2.8, z: 0 });
  game.shoot(-Math.PI / 2, 0.3); runUntilStill(game);
  assert.ok(events.some(e => e.type === 'pocket' && e.id === 0));
  assert.equal(game.cueBall.pocketed, false);
  assert.equal(game.scratch, true);
  assert.ok(Math.hypot(game.cueBall.x + 2.8, game.cueBall.z) > RADIUS * 2);
});
test('a ball aimed at a corner pocket is captured', () => {
  const game = new PoolPhysics(); isolate(game, [0, 1]);
  const b = game.balls.find(ball => ball.id === 1);
  Object.assign(b, { x: HALF_X - 0.55, z: HALF_Z - 0.55, vx: 2, vz: 2 });
  game.moving = true; runUntilStill(game);
  assert.equal(b.pocketed, true);
  assert.equal(game.cueBall.pocketed, false);
});
test('cushions reflect shots and friction eventually stops them', () => {
  const events = [];
  const game = new PoolPhysics(e => events.push(e)); isolate(game, [0, 1]);
  Object.assign(game.cueBall, { x: 3.5, z: 0 });
  Object.assign(game.balls.find(b => b.id === 1), { x: -3, z: 1 });
  game.shoot(0, 0.4);
  for (let i = 0; i < 50; i++) game.update(1 / 120);
  assert.ok(game.cueBall.vx < 0);
  runUntilStill(game);
  assert.ok(events.some(e => e.type === 'cushion'));
});
test('a full power break settles with no escaped balls or nonfinite positions', () => {
  const game = new PoolPhysics(); game.reset('rack');
  game.shoot(Math.atan2(-0.1, 4.15), 1); runUntilStill(game);
  for (const b of game.balls) {
    assert.ok(Number.isFinite(b.x) && Number.isFinite(b.z));
    if (!b.pocketed) {
      assert.ok(Math.abs(b.x) <= HALF_X + 0.06);
      assert.ok(Math.abs(b.z) <= HALF_Z + 0.06);
    }
  }
  assert.ok(game.balls.filter(b => b.id && (Math.abs(b.vx) + Math.abs(b.vz) === 0)).length === 15);
});
test('aim helper stops at the nearest object or cushion', () => {
  const game = new PoolPhysics(); isolate(game, [0, 1, 2]);
  Object.assign(game.cueBall, { x: -2, z: 0 });
  Object.assign(game.balls.find(b => b.id === 1), { x: 0, z: 0 });
  Object.assign(game.balls.find(b => b.id === 2), { x: 1, z: 0 });
  const aim = game.aimTarget(0);
  assert.equal(aim.target.id, 1);
  assert.ok(Math.abs(aim.x + 2 * RADIUS) < 0.001);
  const back = game.aimTarget(Math.PI);
  assert.equal(back.target, null);
  assert.ok(Math.abs(back.x + HALF_X - RADIUS) < 0.001);
});
test('reset clears a moving game, pocket states, and the shot count', () => {
  const game = new PoolPhysics();
  game.shoot(0, 0.7); game.update(0.1); game.balls[1].pocketed = true;
  game.reset('rack');
  assert.equal(game.shots, 0); assert.equal(game.moving, false);
  assert.ok(game.balls.every(b => !b.pocketed && b.vx === 0 && b.vz === 0));
});

test('a centre strike transitions from sliding to natural roll at 5/7 of its initial speed', () => {
  const ball = createRack()[0];
  const initialSpeed = 4;
  ball.vx = initialSpeed;
  const transitionTime = initialSpeed / (3.5 * SLIDING_FRICTION * GRAVITY);
  clothMotion(ball, transitionTime);
  assert.ok(Math.abs(ball.vx - initialSpeed * 5 / 7) < 1e-8);
  assert.ok(Math.abs(ball.vx + RADIUS * ball.wz) < 1e-8);
  assert.equal(ball.wx, 0);
});
test('rolling loses speed uniformly and stops without reversing or a visible snap', () => {
  const ball = createRack()[0];
  ball.vx = 1; ball.wz = -1 / RADIUS;
  clothMotion(ball, 0.25);
  assert.ok(Math.abs(ball.vx - (1 - ROLLING_FRICTION * GRAVITY * 0.25)) < 1e-8);
  const position = ball.x;
  clothMotion(ball, 10);
  assert.equal(ball.vx, 0); assert.equal(Math.abs(ball.wz), 0);
  assert.ok(ball.x > position);
  const stopped = ball.x; clothMotion(ball, 1); assert.equal(ball.x, stopped);
});
test('bi entering a pocket falls below the slate before disappearing', () => {
  const game = new PoolPhysics(); isolate(game, [0,1]);
  const ball = game.balls.find(b => b.id === 1);
  Object.assign(ball, { x: 0, z: HALF_Z - 0.3, vx: 0, vz: 2, wx: 2 / RADIUS });
  game.moving = true;
  for (let i = 0; i < 500 && !ball.pocketed; i++) game.update(1 / 360);
  assert.ok(ball.pocketed && ball.falling);
  game.update(0.05); assert.ok(ball.y < RADIUS);
  runUntilStill(game); assert.equal(ball.falling, false); assert.ok(ball.y < -0.5);
});
test('a near miss hits a side-pocket jaw instead of being magnetically captured', () => {
  const events = [], game = new PoolPhysics(event => events.push(event)); isolate(game, [0,1]);
  const ball = game.balls.find(b => b.id === 1);
  Object.assign(ball, { x: 0.205, z: HALF_Z - 0.6, vx: 0, vz: 2.5, wx: 2.5 / RADIUS });
  game.moving = true;
  for (let i = 0; i < 90; i++) game.update(1 / 360);
  assert.ok(events.some(e => e.type === 'cushion'));
  assert.equal(ball.pocketed, false);
});
test('zero power, nonfinite input, and finished racks cannot be shot', () => {
  const game = new PoolPhysics();
  assert.equal(game.shoot(0,0),false); assert.equal(game.shoot(NaN,0.5),false); assert.equal(game.shoot(0,Infinity),false);
  game.balls.forEach(b => { if (b.id) b.pocketed = true; });
  assert.equal(game.shoot(0,1),false); assert.equal(game.shots,0);
});
test('30 Hz and 144 Hz presentation produce the same settled shot', () => {
  const results = [30,144].map(fps => {
    const game = new PoolPhysics(); game.shoot(-0.281,0.65);
    for (let frame = 0; frame < fps * 45 && game.moving; frame++) game.update(1 / fps);
    assert.equal(game.moving,false);
    return game.balls;
  });
  for (let i = 0; i < results[0].length; i++) {
    const a = results[0][i], b = results[1][i];
    assert.equal(a.pocketed,b.pocketed);
    assert.ok(Math.hypot(a.x - b.x,a.z - b.z) < 0.001);
    for (const key of ['qx','qy','qz','qw']) assert.ok(Math.abs(a[key]-b[key]) < 0.0001, `Rotation ${key} must not depend on display refresh`);
  }
});

test('light pulls travel short distances, with a monotonic full power range', () => {
  let previous=0;
  for(let p=.01;p<=1;p+=.01) { assert.ok(shotSpeed(p)>previous);previous=shotSpeed(p); }
  const distances=[.1,.2,.3].map(power=>{
    const game=new PoolPhysics();isolate(game,[0,1]);
    Object.assign(game.cueBall,{x:-2,z:0});Object.assign(game.balls[1],{x:-3,z:1});
    game.shoot(0,power);runUntilStill(game);return game.cueBall.x+2;
  });
  assert.ok(distances[0]>.015 && distances[0]<RADIUS*2,`10% travel ${distances[0]}`);
  assert.ok(distances[1]>distances[0]*5 && distances[1]<1.5,`20% travel ${distances[1]}`);
  assert.ok(distances[2]>distances[1]*2);
  assert.ok(Math.abs(shotSpeed(1)-24.225)<1e-10);
});

test('pull travel preserves distinct fractions on phone and desktop',()=>{
  for(const height of [230,390,620]) for(const fraction of [.1,.25,.5,1])
    assert.ok(Math.abs(pullPower(pullTravel(height)*fraction,pullTravel(height))-fraction)<1e-10);
  assert.equal(pullPower(-10,100),0);assert.equal(pullPower(120,100),1);
});

test('cue bridge clears rail profile throughout the pull and forward stroke',()=>{
  const top=CLOTH_Y+RAIL_TOP;
  for(const [x,z] of [[0,0],[-2.45,.1],[4.29,.8],[-4.29,.8],[.6,2.09],[.6,-2.09],[4.15,1.94],[-4.15,-1.94]]) {
    for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12) {
      const ball={x,z},elevation=cueElevation(ball,angle,top);
      assert.ok(elevation>=0 && elevation<Math.PI/2);
      for(const power of [0,.25,.5,1]) {
        const pose=cuePose(ball,angle,power,elevation);
        for(let local=.1;local<=2.78;local+=.012) {
          const px=pose.position[0]-pose.axis[0]*local,pz=pose.position[2]-pose.axis[2]*local;
          const bottom=pose.position[1]-pose.axis[1]*local-(.021+.026*local/CUE_LENGTH);
          assert.ok(bottom>=supportHeight(px,pz,top)-.001,`Cue cuts rail: ${x},${z},${angle},${power},${local}`);
        }
      }
    }
  }
});

test('break event is emitted once at the first rack contact, not at release',()=>{
  const events=[],game=new PoolPhysics(e=>events.push(e));game.reset('rack');
  game.shoot(Math.atan2(-.1,4.15),1);
  assert.equal(events.some(e=>e.isBreak),false);
  runUntilStill(game);
  const contacts=events.filter(e=>e.isBreak);
  assert.equal(contacts.length,1);assert.equal(contacts[0].type,'collision');assert.ok(contacts[0].speed>8);
});

test('pocket mouths, jaw angles and slate shelves match selected WPA dimensions',()=>{
  const long=CUSHIONS.find(c=>c.inward[1]===-1 && c.nose[0][0]>0);
  const short=CUSHIONS.find(c=>c.inward[0]===-1);
  assert.ok(Math.abs(Math.hypot(long.nose[1][0]-short.nose[1][0],long.nose[1][1]-short.nose[1][1])/.088-4.5)<1e-9);
  assert.ok(Math.abs(long.nose[0][0]*2/.088-5)<1e-9);
  for(const c of CUSHIONS) for(const end of [0,1]) {
    const start=c.nose[end],inner=c.nose[1-end],back=c.back[end];
    const a=[inner[0]-start[0],inner[1]-start[1]],b=[back[0]-start[0],back[1]-start[1]];
    const angle=Math.acos((a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b)))*180/Math.PI;
    assert.ok(Math.abs(angle-(Math.abs(start[0])<.3?104:142))<1e-8);
  }
  for(const p of POCKET_DETAILS) {
    const mouthDepth=p.side?0:-4.5*.088/2;
    const shelf=(p.front-mouthDepth)/.088;
    assert.ok(p.side?shelf>=0&&shelf<=.375:shelf>=1&&shelf<=2.25);
  }
});

test('all six updated pocket openings capture a centered entry',()=>{
  for(const p of POCKET_DETAILS) {
    const game=new PoolPhysics();isolate(game,[0,1]);
    const [x,z]=pocketPoint(p,0,p.front-.4);
    Object.assign(game.balls[1],{x,z,px:x,pz:z,vx:p.nx*2,vz:p.nz*2,wx:p.nz*2/RADIUS,wz:-p.nx*2/RADIUS});
    game.moving=true;runUntilStill(game);
    assert.equal(game.balls[1].pocketed,true,`Pocket ${p.x},${p.z}`);
  }
});

test('new games rack fifteen balls at the foot spot with the cue centered on the head string',()=>{
  const game=new PoolPhysics();assert.equal(game.layout,'rack');
  const balls=game.balls.filter(b=>b.id);assert.equal(balls.length,15);
  assert.equal(balls[0].x,FOOT_SPOT_X);assert.equal(balls[0].z,0);
  assert.equal(game.cueBall.x,BREAK_CUE_X);assert.equal(game.cueBall.x,HEAD_STRING_X);
  assert.equal(game.cueBall.z,0);assert.equal(balls[4].id,8);
  assert.ok((balls[10].id<8)!==(balls[14].id<8),'Back corners are opposite groups');
  const rows=new Map();for(const b of balls)rows.set(b.x,(rows.get(b.x)||0)+1);
  assert.deepEqual([...rows.values()],[1,2,3,4,5]);
  game.reset();assert.equal(game.canPlaceCue,true);
});

test('cue placement is clamped along the kitchen line and locked after the first shot',()=>{
  const game=new PoolPhysics();assert.equal(game.placeCue(1.1),true);
  assert.equal(game.cueBall.x,BREAK_CUE_X);assert.equal(game.cueBall.z,1.1);assert.equal(game.cueBall.pz,1.1);
  assert.equal(game.placeCue(Infinity),false);game.placeCue(100);
  assert.ok(game.cueBall.z<HALF_Z-RADIUS);game.placeCue(-100);assert.ok(game.cueBall.z>-HALF_Z+RADIUS);
  game.placeCue(0);game.shoot(0,.1);assert.equal(game.placeCue(1),false);
  runUntilStill(game);assert.equal(game.canPlaceCue,false);assert.equal(game.placeCue(1),false);
  game.reset();assert.equal(game.canPlaceCue,true);
  game.reset('practice');assert.equal(game.placeCue(1),false);
});

test('ten full breaks spread the rack, including its inner balls',()=>{
  for(const z of [-1.2,-.9,-.6,-.3,0,.15,.45,.75,1.05,1.35]) {
    const game=new PoolPhysics();game.placeCue(z);
    const start=game.balls.map(b=>({x:b.x,z:b.z})),travel=new Array(16).fill(0);
    game.shoot(Math.atan2(-z,FOOT_SPOT_X-BREAK_CUE_X),1);
    for(let frame=0;frame<360;frame++) {
      game.update(1/120);
      game.balls.forEach((b,i)=>{travel[i]=Math.max(travel[i],Math.hypot(b.x-start[i].x,b.z-start[i].z));});
    }
    assert.ok(travel.slice(1).filter(d=>d>.5).length>=13,`Rack stayed clustered at z=${z}: ${travel}`);
    const inner=[2,3,5,8,9].filter(i=>travel[i]>.5);
    assert.ok(inner.length>=4,`Inner cluster stayed frozen at z=${z}`);
    // A single ball may remain near its starting point in an off-centre break;
    // the straight-on fixture must transmit the impact through the centre.
    if(z===0)assert.ok(travel[5]>RADIUS, 'Centre break failed to move the eight ball by its radius');
    runUntilStill(game);
    assert.ok(game.balls.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.z)));
  }
});

test('dense-rack impulse propagation does not depend on ball array order',()=>{
  const a=new PoolPhysics(),b=new PoolPhysics();b.balls.reverse();
  for(const game of [a,b]) { game.placeCue(.45);game.shoot(Math.atan2(-.45,FOOT_SPOT_X-BREAK_CUE_X),1); }
  for(let frame=0;frame<120;frame++) {a.update(1/120);b.update(1/120);}
  for(const first of a.balls) {
    const second=b.balls.find(ball=>ball.id===first.id);
    assert.ok(Math.hypot(first.x-second.x,first.z-second.z)<1e-7);
    assert.ok(Math.hypot(first.vx-second.vx,first.vz-second.vz)<1e-7);
  }
});

test('finite ball contact transfers momentum without adding kinetic energy or repeated sounds',()=>{
  const events=[],game=new PoolPhysics(e=>events.push(e));isolate(game,[0,1]);
  Object.assign(game.cueBall,{x:-(2*RADIUS+.007),z:0,vx:5,vz:0,wx:0,wz:-5/RADIUS});
  Object.assign(game.balls[1],{x:0,z:0});
  for(let i=0;i<6;i++)game.step(1/360);
  const a=game.cueBall,b=game.balls[1];
  assert.ok(b.vx>4.5 && a.vx<.4);
  assert.ok(Math.abs(a.vx+b.vx-5)<.03);
  assert.ok(a.vx*a.vx+b.vx*b.vx<=25.01);
  assert.equal(events.filter(e=>e.type==='collision').length,1);
});

test('physical scale is a 2540 by 1270 mm bed with 65 mm balls',()=>{
  assert.equal(TABLE_LENGTH_MM,2540);assert.equal(TABLE_WIDTH_MM,1270);
  assert.equal(BALL_DIAMETER_MM,65);
  assert.ok(Math.abs(HALF_X*2/UNITS_PER_MM-2540)<1e-9);
  assert.ok(Math.abs(HALF_Z*2/UNITS_PER_MM-1270)<1e-9);
  assert.ok(Math.abs(RADIUS*2/UNITS_PER_MM-65)<1e-9);
  assert.ok(Math.abs(RADIUS/HALF_X-65/2540)<1e-12);
});

test('all pull strengths have 25 percent less launch speed',()=>{
  for(const p of [.025,.1,.25,.5,.75,1]) {
    const previous=.15*p+22.15*p**1.8+10*p**4;
    assert.ok(Math.abs(shotSpeed(p)/previous-.75)<1e-12);
  }
});
