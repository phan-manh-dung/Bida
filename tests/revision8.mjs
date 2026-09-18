import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  await page.locator('#practice-start').click();
 assert.equal(await page.locator('[data-cloth="gray"]').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:'artifacts/gray-v8.png'});
 const result=await page.evaluate(()=>{
   const {scene:s,physics:p}=window.__noir;
   cancelAnimationFrame(s.frame);
   p.reset('practice');p.balls.forEach(b=>b.pocketed=b.id>1);
   Object.assign(p.cueBall,{x:-2,px:-2,z:0,pz:0});
   Object.assign(p.balls[1],{x:3,z:1});
   s.angle=0;s.lastTime=1000;let impacts=0;
   s.strike(.85,()=>{impacts++;p.shoot(0,.85);});s.striking.start=1000;
   const frame=t=>{s.animate(t);cancelAnimationFrame(s.frame);};
   frame(1040);const before=p.cueBall.x;
   frame(1067);const atContact=s.ballMeshes.get(0).position.x;
   const speeds=[Math.hypot(p.cueBall.vx,p.cueBall.vz)];
   for(let i=1;i<=8;i++){frame(1067+i*8);speeds.push(Math.hypot(p.cueBall.vx,p.cueBall.vz));}
   return {before,atContact,impacts,speeds};
 });
 assert.equal(result.before,-2);assert.ok(result.atContact>-2,'Ball must render movement in the impact frame');
 assert.equal(result.impacts,1);
 for(let i=1;i<result.speeds.length;i++)assert.ok(result.speeds[i]<=result.speeds[i-1]+1e-10,'No delayed acceleration after the strike');
 console.log('PASS: charcoal default, same-frame strike, single impact and decreasing launch speed.');
}finally{await browser.close();}
