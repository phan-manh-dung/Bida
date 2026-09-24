import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.locator('#training-start').click();await page.locator('[data-lesson="cut-gentle"]').click();
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
 await page.locator('.coach-extra summary').click();
 const before=await page.evaluate(()=>[window.__noir.physics.shots,localStorage.getItem('noir:training:v1')]);
 await page.locator('[data-demo]').click();await page.waitForTimeout(300);
 assert.equal(await page.locator('.coach-diagram animate').count(),4);
 assert.deepEqual(await page.evaluate(()=>[window.__noir.physics.shots,localStorage.getItem('noir:training:v1')]),before);
 await page.screenshot({path:'artifacts/coach-lesson3-motion.png'});
 const shot=await page.evaluate(async()=>{const all=(await import('/src/training/solutions.json')).default;return all['cut-gentle'].findIndex(s=>s.bank);});
 await page.locator('#training-variant').selectOption(String(shot));
 await page.locator('[data-apply]').click();
 await page.evaluate(async index=>{
  const s=(await import('/src/training/solutions.json')).default['cut-gentle'][index],p=window.__noir.physics;
  p.shoot(window.__noir.scene.angle,s.power,window.__noir.scene.tip);for(let i=0;i<3600&&p.moving;i++)p.update(1/120);
 },shot);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('noir:training:v1'))['cut-gentle'].completed),true,'Alternate pocket must be scored using the selected route');
 await page.locator('[data-independent]').click();assert.equal(await page.locator('.coach-diagram:visible').count(),0);
 assert.equal(await page.evaluate(()=>!!window.__noir.scene.scene.getObjectByName('training-destination')),false);
 await page.locator('[data-hint]').click();assert.equal(await page.locator('.coach-diagram:visible').count(),3);
 assert.deepEqual(errors,[]);console.log('PASS visual coach: compact illustrations, ordered options, isolated animated preview, alternate bank scoring, independent mode');
}finally{await browser.close();}
