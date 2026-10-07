import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {stat,utimes} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__noir?.previewReloadReady);
 const before=await page.evaluate(()=>{
  const {scene:s,physics:p,startPractice}=window.__noir;startPractice();
  p.balls[0].x=-1.8;p.balls[0].px=-1.8;p.shots=3;s.angle=.31;s.setView('orbit');
  s.camera.position.set(4,8,10);s.controls.update();
  return {camera:s.camera.position.toArray(),ball:p.balls[0].x,angle:s.angle};
 });
 const file='src/main.js',info=await stat(file);
 // Trigger Vite's actual file-save reload without modifying source contents.
 const reload=page.waitForEvent('framenavigated',f=>f===page.mainFrame());
 await utimes(file,info.atime,new Date());await reload;
 await page.waitForFunction(()=>window.__noir?.previewReloadReady);
 const after=await page.evaluate(()=>({visible:!document.querySelector('#game').hidden,view:window.__noir.scene.view,camera:window.__noir.scene.camera.position.toArray(),ball:window.__noir.physics.balls[0].x,shots:window.__noir.physics.shots,angle:window.__noir.scene.angle}));
 assert.equal(after.visible,true);assert.equal(after.view,'orbit');assert.equal(after.ball,before.ball);assert.equal(after.shots,3);assert.equal(after.angle,before.angle);
 after.camera.forEach((v,i)=>assert.ok(Math.abs(v-before.camera[i])<1e-6));
 await page.evaluate(()=>window.__noir.goHome());await page.reload();await page.waitForFunction(()=>window.__noir?.previewReloadReady);
 assert.equal(await page.locator('#game').evaluate(el=>el.hidden),true);
 assert.deepEqual(errors,[]);console.log('PASS: real Vite save restores practice, camera and idle balls; home stays home.');
}finally{await browser.close();}
