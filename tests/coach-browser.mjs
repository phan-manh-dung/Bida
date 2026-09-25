import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.locator('#training-start').click();await page.locator('[data-lesson="cut-gentle"]').click();
 await page.locator('#training-library [data-hand="left"]').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('noir:training:hand')),'left');
 const leftFoot=await page.evaluate(()=>window.__noir.scene.scene.getObjectByName('training-stance-1').position.toArray());
 await page.locator('#training-panel [data-hand="right"]').click();
 const rightFoot=await page.evaluate(()=>window.__noir.scene.scene.getObjectByName('training-stance-1').position.toArray());
 assert.notDeepEqual(leftFoot,rightFoot,'Hand changes body side');
 assert.match(await page.locator('p.coach-spin').innerText(),/Tác dụng/);
 await page.locator('details.coach-spin summary').click();
 assert.match(await page.locator('details.coach-spin').innerText(),/Trô phải/);
 assert.equal(await page.locator('.coach-diagram:visible').count(),3);
 assert.equal(await page.locator('[data-step]').count(),0);
 const pulse=await page.evaluate(async()=>{
  const marker=window.__noir.scene.scene.getObjectByName('training-destination'),values=[];
  for(let i=0;i<35;i++){await new Promise(requestAnimationFrame);values.push(marker.material.opacity);}
  return Math.max(...values)-Math.min(...values);
 });
 assert.ok(pulse>.1,'Destination pulses on the live table');
 const beforePosition=await page.evaluate(()=>window.__noir.scene.scene.getObjectByName('training-destination').position.toArray());
 await page.locator('#training-variant').selectOption('1');
 const afterPosition=await page.evaluate(()=>window.__noir.scene.scene.getObjectByName('training-destination').position.toArray());
 assert.notDeepEqual(beforePosition,afterPosition,'Changing the shot updates its destination');
 await page.locator('#training-variant').selectOption('0');
 await page.screenshot({path:'artifacts/coach-lesson3-aim.png'});
 assert.equal(await page.locator('.coach-extra, [data-demo], [data-apply], [data-retry]').count(),0);
 const shot=await page.evaluate(async()=>{const all=(await import('/src/training/solutions.json')).default;return all['cut-gentle'].findIndex(s=>s.bank);});
 await page.locator('#training-variant').selectOption(String(shot));
 await page.locator('[data-execute]').click();
 await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>window.__noir.physics.shots),0,'Prepare must never shoot');
 assert.equal(await page.evaluate(()=>window.__noir.physics.moving),false);
 assert.equal(await page.locator('#pull-cue').getAttribute('aria-valuenow'),'0');
 const chosen=await page.evaluate(async id=>{
  const shots=(await import('/src/training/solutions.json')).default[id];
  const {orderOptions}=await import('/src/training/options.js');
  return orderOptions(shots)[Number(document.querySelector('#training-variant').value)];
 },'cut-gentle');
 assert.deepEqual(await page.evaluate(()=>window.__noir.scene.tip),chosen.tip);
 assert.ok(Math.abs(await page.evaluate(()=>window.__noir.scene.angle)-chosen.angle)<1e-9);
 const box=await page.locator('#pull-cue').boundingBox();
 const travel=await page.evaluate(async()=>{const {pullTravel}=await import('/src/shot-control.js');return pullTravel(document.querySelector('#pull-cue').clientHeight);});
 await page.mouse.move(box.x+box.width/2,box.y+15);await page.mouse.down();
 await page.mouse.move(box.x+box.width/2,box.y+15+travel*chosen.power);await page.mouse.up();

 await page.waitForFunction(()=>window.__noir.physics.shots===1);
 assert.equal(await page.locator('[data-retry]').count(),0);
 await page.evaluate(()=>{const p=window.__noir.physics;for(let i=0;i<3600&&p.moving;i++)p.update(1/120);});
 assert.equal(await page.locator('[data-retry]').isVisible(),true);
 assert.equal(await page.locator('[data-execute]').count(),0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('noir:training:v1'))['cut-gentle'].completed),true,'Alternate pocket must be scored using the selected route');
 assert.equal(await page.locator('[data-exit]').isVisible(),true);
 await page.locator('[data-exit]').click();
 assert.equal(await page.locator('#training-library').isVisible(),true);
 await page.locator('[data-lesson="cut-gentle"]').click();
 await page.locator('[data-independent]').click();assert.equal(await page.locator('.coach-diagram:visible').count(),0);
 assert.equal(await page.evaluate(()=>!!window.__noir.scene.scene.getObjectByName('training-destination')),false);
 await page.locator('[data-hint]').click();assert.equal(await page.locator('.coach-diagram:visible').count(),3);
 assert.deepEqual(errors,[]);console.log('PASS visual coach: compact illustrations, ordered options, live execution and post-shot retry, alternate bank scoring, independent mode');
}finally{await browser.close();}
