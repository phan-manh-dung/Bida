import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS} from '../src/training/catalog.js';
import solutions from '../src/training/solutions.json' with {type:'json'};
import {loadLayout,simulateLesson,evaluateLesson} from '../src/training/engine.js';
import {PoolPhysics,RADIUS} from '../src/physics.js';
import {readProgress,recordAttempt,saveProgress} from '../src/training/progress.js';
import {describeShot} from '../src/training/coach.js';
import {suggestStance,spinExplanation} from '../src/training/stance.js';
import {OUTER_X,OUTER_Z} from '../src/table-model.js';
import {validPosition,searchCustom} from '../src/training/custom-solver.js';

test('custom placement rejects overlap, pockets and outside positions; solver returns verified shots',()=>{
 const lesson={...LESSONS[0],balls:LESSONS[0].balls.map(b=>({...b}))};
 assert.equal(validPosition(lesson.balls,0,lesson.balls[1].x,lesson.balls[1].z),false);
 assert.equal(validPosition(lesson.balls,0,100,0),false);
 assert.equal(validPosition(lesson.balls,0,0,0),true);
 const search=searchCustom(lesson);let step;do{step=search.next();}while(!step.done);
 assert.ok(step.value.tested<=1800);assert.ok(step.value.shots.length);
 for(const shot of step.value.shots)assert.equal(simulateLesson(lesson,shot).result.passed,true);
});

test('custom solver does not invent a solution through surrounding blockers',()=>{
 const balls=[{id:0,x:0,z:0},{id:1,x:2,z:1},...Array.from({length:6},(_,i)=>({id:i+2,x:.25*Math.cos(i*Math.PI/3),z:.25*Math.sin(i*Math.PI/3)}))];
 const search=searchCustom({id:'blocked',balls,target:1,pocket:0});let step;
 do{step=search.next();}while(!step.done);
 assert.equal(step.value.shots.length,0);assert.equal(step.value.tested,1800);
});

test('stance stays behind the shot and outside the rail for every direction',()=>{
 for(let angle=0;angle<Math.PI*2;angle+=.1){
  const lesson={balls:[{id:0,x:1,z:.5}]};
  const s=suggestStance(lesson,{angle},'left');
  const foot=s.feet[0],dx=foot.x-1,dz=foot.z-.5;
  assert.ok(Math.abs(foot.x)>OUTER_X||Math.abs(foot.z)>OUTER_Z);
  assert.ok(dx*Math.cos(angle)+dz*Math.sin(angle)<0);
  assert.ok(Math.abs(dx*Math.sin(angle)-dz*Math.cos(angle))<1e-8);
  assert.ok(Number.isFinite(s.reachCm));
 }
 assert.match(spinExplanation({x:-.5,y:.5}),/Cu-lê.*trái/);
 assert.match(spinExplanation({x:.5,y:-.5}),/Trô.*phải/);
});

test('every published lesson has valid geometry and physically successful sample shots',()=>{
  assert.equal(new Set(LESSONS.map(l=>l.id)).size,LESSONS.length);
  for(const lesson of LESSONS){
    assert.ok(solutions[lesson.id]?.length,lesson.id);
    for(const a of lesson.balls)for(const b of lesson.balls)if(a.id!==b.id)assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>2*RADIUS);
    for(const shot of solutions[lesson.id]){
      const result=simulateLesson(lesson,shot,true);
      assert.equal(result.physics.moving,false,`${lesson.id}: must settle`);
      assert.equal(result.result.passed,true,`${lesson.id}: ${result.result.message}`);
      assert.ok(result.paths[0].length>2);
      const info=describeShot(lesson,shot,result);
      assert.ok(Number.isFinite(info.overlap)&&info.overlap>=0&&info.overlap<=1);
      assert.ok(Number.isFinite(info.distance));
      const objectRails=result.events.filter(e=>e.type==='cushion'&&e.id===lesson.target&&!e.jaw);
      if(shot.bank||lesson.bank)assert.equal(objectRails.length,1,'Bank alternative really uses one rail');
    }
  }
});
test('lesson 3 offers a physically verified alternate route and fractional advice uses impact geometry',()=>{
  const lesson=LESSONS.find(l=>l.id==='cut-gentle');
  assert.ok(solutions[lesson.id].some(s=>s.bank&&s.pocket!==lesson.pocket));
  assert.ok(solutions[lesson.id].some(s=>s.tip.x<0));
  assert.ok(solutions[lesson.id].some(s=>s.tip.x>0));
  const straight=LESSONS[0],shot=solutions[straight.id][0];
  assert.ok(describeShot(straight,shot,simulateLesson(straight,shot)).overlap>.99);
});
test('retry restores original layout and removes prior velocities, spin and match state',()=>{
  const p=new PoolPhysics(),l=LESSONS[0];p.hand='any';p.rollingFriction=.05;
  loadLayout(p,l);p.shoot(0,.5,{y:-1});p.update(.1);loadLayout(p,l);
  assert.equal(p.moving,false);assert.equal(p.hand,null);assert.equal(p.shots,0);assert.equal(p.autoRespot,false);
  assert.equal(p.canPlaceCue,false);
  for(const a of l.balls){const b=p.balls.find(b=>b.id===a.id);assert.equal(b.x,a.x);assert.equal(b.z,a.z);assert.equal(b.vx,0);assert.equal(b.wy,0);}
});
test('scratch, miss and wrong pocket cannot complete an exercise',()=>{
  const l=LESSONS[0],p=new PoolPhysics();loadLayout(p,l);
  assert.equal(evaluateLesson(l,p,[]).passed,false);
  const events=[{type:'contact',a:0,b:1},{type:'pocket',id:1,pocketIndex:0}];
  assert.equal(evaluateLesson(l,p,events).passed,false);
  events[1].pocketIndex=l.pocket;p.cueBall.pocketed=true;
  assert.equal(evaluateLesson(l,p,events).passed,false);
});
test('progress distinguishes assisted completion, survives failures and handles unavailable storage',()=>{
  let p=recordAttempt({},'a',true,true);assert.equal(p.a.independent,false);
  p=recordAttempt(p,'a',true,false);p=recordAttempt(p,'a',false,false);
  assert.equal(p.a.independent,true);assert.equal(p.a.completed,true);assert.equal(p.a.attempts,3);
  assert.deepEqual(readProgress({getItem:()=>'{bad'}),{});assert.deepEqual(readProgress(undefined),{});
  assert.equal(saveProgress(undefined,p),false);
});
