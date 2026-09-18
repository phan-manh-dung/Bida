import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConfig,competitionRack,judgeShot,lagResult,legalTargets,LEVELS,TABLES} from '../src/match-rules.js';
import {PoolPhysics,RADIUS,HALF_X} from '../src/physics.js';
import {FOOT_SPOT_X,HEAD_STRING_X} from '../src/table-model.js';
import {PoolMatch} from '../src/match.js';
import {chooseShot,lagPower} from '../src/pool-ai.js';
const config=(game='9',extra={})=>normalizeConfig({game,level:'I',target:5,table:'club',...extra});
const state=(extra={})=>({game:'9',rack:'nine-wpa',turn:0,groups:[null,null],fouls:[0,0],breaking:false,...extra});
const shot=(extra={})=>({first:1,pockets:[],off:[],rails:new Set(),railAfter:true,crossed:new Set(),crossedKitchen:false,remaining:[1,2,3,4,5,6,7,8,9],startPositions:{},call:null,safety:false,push:false,...extra});
test('race validation, default name and roster counts',()=>{
 for(const target of [0,101,1.5,NaN])assert.throws(()=>config('9',{target}));
 for(const target of [1,100])assert.equal(config('9',{target,name:'  '}).name,'Người chơi 1');
 assert.equal(LEVELS[0].opponents.length,3);assert.equal(LEVELS.find(l=>l.id==='B').opponents.length,4);
 assert.equal(config('8',{rack:'nine-classic'}).rack,'eight');
});
test('both nine-ball racks have 1 at apex, 9 at centre and no overlap',()=>{
 for(const rack of ['nine-wpa','nine-classic']){
  const balls=competitionRack(config('9',{rack})).filter(b=>b.id&&!b.pocketed);assert.equal(balls.length,9);
  const one=balls.find(b=>b.id===1),nine=balls.find(b=>b.id===9);
  assert.equal(one.z,0);assert.equal(nine.z,0);assert.ok(one.x<nine.x);
  assert.ok(Math.abs((rack==='nine-wpa'?nine:one).x-FOOT_SPOT_X)<1e-12);
  for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++)assert.ok(Math.hypot(balls[i].x-balls[j].x,balls[i].z-balls[j].z)>=RADIUS*2);
 }
});
test('random eight-ball racks preserve the centre and opposite back groups',()=>{
 for(let n=0;n<40;n++){
  const b=competitionRack(config('8')).filter(b=>b.id).sort((a,b)=>a.x-b.x||a.z-b.z);
  assert.equal(b[4].id,8);assert.equal(b[0].x,FOOT_SPOT_X);assert.ok((b[10].id<8)!==(b[14].id<8));
 }
});
test('nine ball: lowest first, scratch, rail after contact and respot 9 on foul',()=>{
 assert.match(judgeShot(state(),shot({first:2})).foul,/sai/);
 assert.match(judgeShot(state(),shot({first:null})).foul,/Không chạm/);
 assert.match(judgeShot(state(),shot({railAfter:false})).foul,/băng/);
 const result=judgeShot(state(),shot({pockets:[{id:0},{id:9}]}));assert.equal(result.winner,null);assert.deepEqual(result.spot,[9]);assert.equal(result.hand,'any');
 assert.equal(judgeShot(state(),shot({pockets:[{id:9}]})).winner,0);
});
test('break tests count distinct object balls, current WPA has the additional head-string condition',()=>{
 const s=shot({rails:new Set([1,2,3,4]),crossed:new Set([1,2])});
 assert.equal(judgeShot(state({breaking:true}),s).choice,'illegal-nine');
 assert.equal(judgeShot(state({breaking:true,rack:'nine-classic'}),s).choice,null);
 assert.ok(judgeShot(state({breaking:true}),shot({rails:new Set([1])})).foul);
 const golden=judgeShot(state({breaking:true}),shot({pockets:[{id:9}],crossed:new Set([2])}));
 assert.equal(golden.winner,null);assert.equal(golden.choice,'illegal-nine');assert.deepEqual(golden.spot,[9]);
 assert.equal(judgeShot(state({breaking:true}),shot({pockets:[{id:9}],crossed:new Set([2,3])})).winner,0);
});
test('push out suspends wrong-first/no-rail, spots 9 and offers opponent the choice',()=>{
 const result=judgeShot(state(),shot({first:null,railAfter:false,push:true,pockets:[{id:9}]}));
 assert.equal(result.foul,null);assert.equal(result.choice,'push');assert.deepEqual(result.spot,[9]);assert.equal(result.winner,null);
 assert.ok(judgeShot(state(),shot({push:true,pockets:[{id:0}]})).foul);
});
test('third consecutive nine-ball foul loses the rack',()=>{
 assert.equal(judgeShot(state({fouls:[2,0]}),shot({first:null})).winner,1);
 assert.equal(judgeShot(state({game:'8',fouls:[2,0]}),shot({first:null})).winner,null);
});
test('8-ball break never assigns groups or wins by pocketing eight',()=>{
 assert.equal(judgeShot(state({game:'8',breaking:true}),shot({pockets:[{id:1}]})).group,null);
 const e=judgeShot(state({game:'8',breaking:true}),shot({pockets:[{id:8}]}));assert.equal(e.choice,'eight-break');assert.equal(e.winner,null);
 assert.equal(judgeShot(state({game:'8',breaking:true}),shot({pockets:[{id:8},{id:0}]})).choice,'eight-foul');
 assert.equal(judgeShot(state({game:'8',breaking:true}),shot({rails:new Set([1]),railAfter:true})).choice,'illegal-eight');
});
test('8-ball assigns the called group only on a legal called shot',()=>{
 const s=shot({pockets:[{id:10,pocketIndex:2},{id:1,pocketIndex:1}],call:{ball:10,pocket:2},remaining:[1,8,10]});
 assert.equal(judgeShot(state({game:'8'}),s).group,'stripe');
 assert.equal(judgeShot(state({game:'8'}),{...s,call:{ball:10,pocket:3}}).group,null);
 assert.equal(judgeShot(state({game:'8'}),{...s,safety:true}).next,1);
});
test('8-ball: early eight, wrong pocket, simultaneous last group+8 and scratch lose; legal called 8 wins',()=>{
 const st=state({game:'8',groups:['solid','stripe']});
 const s=shot({first:8,remaining:[8,9],pockets:[{id:8,pocketIndex:3}],call:{ball:8,pocket:3}});
 assert.equal(judgeShot(st,s).winner,0);
 for(const changed of [{remaining:[1,8,9]},{call:{ball:8,pocket:2}},{pockets:[{id:8,pocketIndex:3},{id:0}]},{off:[8]}])assert.equal(judgeShot(st,{...s,...changed}).winner,1);
});
test('ball in hand rejects overlap, restricts kitchen and lets both coordinates move',()=>{
 const p=new PoolPhysics();p.hand='any';assert.equal(p.placeCue(1.2,1),true);assert.equal(p.cueBall.x,1);
 const b=p.balls[1];assert.equal(p.placeCue(b.z,b.x),false);
 p.hand='kitchen';p.placeCue(0,3);assert.ok(p.cueBall.x<HEAD_STRING_X);
});
test('lag rules reject no/double far-rail, crossing, pocket and retry tied/invalid lags',()=>{
 const balls=[{x:-4,z:-.8,pocketed:false},{x:-3,z:.8,pocketed:false}],valid=()=>[{foot:1,bad:false},{foot:1,bad:false}];
 assert.equal(lagResult(balls,valid()).winner,0);
 for(const bad of [{foot:0},{foot:2},{bad:true}]){const r=valid();Object.assign(r[0],bad);assert.equal(lagResult(balls,r).winner,1);}
 assert.equal(lagResult(balls,[{foot:0},{foot:0}]).winner,null);
 assert.equal(lagResult([balls[0],{...balls[1],x:-4}],valid()).winner,null);
});
test('AI produces finite shots for all ranks and cloth presets change lag calibration',()=>{
 const p=new PoolPhysics();p.reset('practice');
 for(const l of LEVELS){const s=chooseShot(p,{config:config('9',{level:l.id}),groups:[null,null],turn:1,breaking:false});assert.ok(Number.isFinite(s.angle)&&s.power>=.025&&s.power<=1);assert.equal(s.ball,1);}
 const slow=lagPower(TABLES.novice.friction,'PRO',()=>.5),fast=lagPower(TABLES.tournament.friction,'PRO',()=>.5);assert.ok(slow>fast);
});
test('match race, alternating breaks and disposal cancel scheduled machine actions',()=>{
 const p=new PoolPhysics(),s={syncBalls(){},setView(){},strike(){}};
 const m=new PoolMatch(p,s,config('8',{target:2}));p.onEvent=e=>m.event(e);
 m.startRack(0);assert.equal(m.turn,0);m.winRack(0);assert.equal(m.phase,'rack-over');m.choose('next');assert.equal(m.turn,1);
 m.winRack(0);assert.equal(m.phase,'match-over');assert.deepEqual(m.score,[2,0]);m.dispose();assert.equal(m.timer,null);
});

test('actual missed shot passes the turn with ball in hand and locks the human',()=>{
 const p=new PoolPhysics(),s={syncBalls(){},strike(){}};
 const m=new PoolMatch(p,s,config('9'));p.onEvent=e=>m.event(e);m.startRack(0);m.breaking=false;p.hand=null;
 p.balls.forEach(b=>b.pocketed=b.id>1);Object.assign(p.cueBall,{x:0,z:0});Object.assign(p.balls[1],{x:2,z:1});
 m.shootHuman(-Math.PI/2,.05,{});for(let i=0;i<2400&&p.moving;i++)p.update(1/120);
 assert.equal(m.turn,1);assert.equal(p.hand,'any');assert.equal(m.canHumanShoot,false);assert.match(m.message,/Không chạm/);m.dispose();
});

test('kitchen foul is judged at first contact, not by a later crossing',()=>{
 const result=judgeShot(state({game:'8'}),shot({kitchen:true,crossedKitchen:true,firstInKitchenWithoutCross:true}));
 assert.match(result.foul,/vạch bếp/);
});

test('a frozen ball must leave its rail before another contact counts',()=>{
 const p=new PoolPhysics(),events=[];p.onEvent=e=>events.push(e);p.balls.forEach(b=>b.pocketed=b.id>1);
 Object.assign(p.balls[1],{x:1,z:2.2-RADIUS,vz:.5});p.shoot(0,.1);p.step(1/360);
 assert.equal(events.find(e=>e.type==='cushion'&&e.id===1)?.fresh,false);
 Object.assign(p.balls[1],{z:2-RADIUS,vz:-.5});p.step(1/360);
 events.length=0;Object.assign(p.balls[1],{z:2.2-RADIUS,vz:.5});p.step(1/360);
 assert.equal(events.find(e=>e.type==='cushion'&&e.id===1)?.fresh,true);
});
