import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5174/',{waitUntil:'networkidle'});
 for(const [width,height] of [[1366,768],[1536,864],[1920,870],[1280,620]]){
  await page.setViewportSize({width,height});
  assert.ok(await page.locator('#lobby').evaluate(e=>e.scrollHeight<=e.clientHeight+1),`homepage overflow ${width}x${height}`);
 }
 await page.setViewportSize({width:1366,height:768});await page.screenshot({path:'artifacts/homepage-refined.png'});
 await page.locator('#ai-start').click();assert.equal(await page.locator('[name=follow]').count(),0);await page.locator('#start-match').click();
 assert.equal(await page.evaluate(()=>window.__noir.scene.view),'top');
 await page.evaluate(()=>window.__noir.match.startRack(0));
 assert.equal(await page.locator('.capture-slot').count(),18);
 assert.equal(await page.locator('.aim-adjust').count(),0);

 const camera=await page.evaluate(()=>window.__noir.scene.camera.position.toArray());
 await page.mouse.move(350,350);await page.mouse.down();await page.mouse.move(650,450,{steps:10});await page.mouse.up();
 assert.deepEqual(await page.evaluate(()=>window.__noir.scene.camera.position.toArray()),camera);
 await page.evaluate(()=>{const {match:m,physics:p,scene:s}=window.__noir;m.breaking=false;p.hand=null;p.balls.find(b=>b.id===1).pocketed=true;m.captured=[[1],[]];m.aimNextTarget();m.notify();s.syncBalls(0);});
 assert.equal(await page.locator('#human-score .filled').count(),1);
 assert.ok(await page.evaluate(()=>{const {scene:s,physics:p}=window.__noir,b=p.balls.find(b=>b.id===2);return Math.abs(s.angle-Math.atan2(b.z-p.cueBall.z,b.x-p.cueBall.x))<1e-8;}));
 await page.screenshot({path:'artifacts/table-refined.png'});
 await page.evaluate(()=>{const {match:m,physics:p}=window.__noir;m.shootHuman(Math.PI,.06,{});for(let i=0;i<15000&&p.moving;i++)p.update(1/120);});
 assert.equal(await page.locator('#match-status').evaluate(e=>e.classList.contains('is-foul')),true);
 const shots=await page.evaluate(()=>window.__noir.physics.shots);
 await page.screenshot({path:'artifacts/foul-refined.png'});await page.waitForTimeout(1200);
 assert.equal(await page.evaluate(()=>window.__noir.physics.shots),shots);
 assert.equal(await page.evaluate(()=>window.__noir.match.foulNotice),true);
 await page.waitForFunction(()=>!window.__noir.match.foulNotice);
 await page.evaluate(()=>window.__noir.goHome());
 assert.deepEqual(errors,[]);console.log('PASS: laptop fit, top camera, controlled orbit, no fine-aim toolbar, 9-ball tracker/auto aim and 2-second foul pause.');
}finally{await browser.close();}
