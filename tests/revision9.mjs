import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  await page.locator('#practice-start').click();
 const result=await page.evaluate(async()=>{
  const {scene:s,physics:p}=window.__noir;
  const {RADIUS,UNITS_PER_MM}=await import('/src/table-model.js');
  cancelAnimationFrame(s.frame);p.reset('practice');
  p.balls.forEach(b=>b.pocketed=b.id>1);
  Object.assign(p.cueBall,{x:-2,px:-2,z:0,pz:0});Object.assign(p.balls[1],{x:3,z:1});
  s.angle=0;s.lastTime=1000;s.strike(.45,()=>p.shoot(0,.45));s.striking.start=1000;
  const frames=[];let time=1067;
  for(const gap of [0,8,16,7,14,9,17,12,8]){
    time+=gap;s.animate(time);cancelAnimationFrame(s.frame);
    frames.push({t:time,x:s.ballMeshes.get(0).position.x,cue:s.cue.visible,guide:s.guide.visible,ghost:s.ghost.visible});
  }
  return {frames,shadows:s.ballShadows.size,
    ballShadows:[...s.ballMeshes.values()].some(b=>b.castShadow||b.receiveShadow),
    cueShadows:s.cue.children.some(b=>b.castShadow),
    sizes:[...s.ballMeshes.values()].map(b=>({mm:2*b.geometry.parameters.radius/UNITS_PER_MM,scale:b.scale.toArray()})),radius:RADIUS};
 });
 assert.equal(result.shadows,0);assert.equal(result.ballShadows,false);assert.equal(result.cueShadows,false);
 for(const frame of result.frames){assert.equal(frame.cue,false);assert.equal(frame.guide,false);assert.equal(frame.ghost,false);}
 for(const size of result.sizes){assert.ok(Math.abs(size.mm-57.2)<1e-8);assert.deepEqual(size.scale,[1,1,1]);}
 let previousSpeed=Infinity;
 for(let i=1;i<result.frames.length;i++){
  const a=result.frames[i-1],b=result.frames[i],speed=(b.x-a.x)/((b.t-a.t)/1000);
  assert.ok(speed>0 && speed<=previousSpeed+.02,'Uneven frame intervals must not make the rolling ball jump/accelerate');previousSpeed=speed;
 }
 await page.screenshot({path:'artifacts/rolling-v9.png'});
 console.log('PASS: 57.2 mm rendered balls, no moving shadows/cue/guide after impact, continuous travel at uneven frame intervals.');
}finally{await browser.close();}
