import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5174/',{waitUntil:'networkidle'});
 await page.locator('#ai-start').click();await page.locator('#start-match').click();
 await page.evaluate(()=>{const m=window.__noir.match;m.startRack(0);m.breaking=false;m.pushAvailable=true;m.notify();});
 for(const [width,height] of [[1366,768],[1920,1080],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const scene=await page.locator('#scene').boundingBox();
  for(const selector of ['.match-header','.match-sidebar','#push-call']){
   const box=await page.locator(selector).boundingBox();
   assert.ok(box.x+box.width<=scene.x+1||box.y+box.height<=scene.y+1||box.y>=scene.y+scene.height-1,`${selector} covers renderer at ${width}x${height}`);
  }
  await page.screenshot({path:`artifacts/unclutter-${width}.png`});
 }
 assert.ok(await page.evaluate(()=>{
  const {scene:s,physics:p}=window.__noir;
  if(s.ballLabels?.size)return false;
  const b=p.balls.find(b=>b.id===1),mesh=s.ballMeshes.get(1);s.syncBalls(0);const before=mesh.quaternion.clone();
  b.x=b.px=0;b.z=b.pz=0;b.vx=1.2;b.vz=.3;p.moving=true;for(let i=0;i<20;i++)p.update(1/120);s.syncBalls(0);
  return before.angleTo(mesh.quaternion)>.1&&!!mesh.material.map&&mesh.children.length===0;
 }), 'The numbered material rotates with the physical ball, without floating labels');
 await page.evaluate(()=>window.__noir.goHome());assert.deepEqual(errors,[]);
 console.log('PASS: header, push-out and notices outside table at four sizes; numbers rotate on ball surfaces.');
}finally{await browser.close();}
