import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.locator('#practice-start').click();await page.locator('#training-start').click();assert.equal(await page.locator('.lesson-card').count(),12);
 await page.screenshot({path:'artifacts/training-library.png'});
 await page.locator('[data-lesson="straight-short"]').click();
 await page.locator('#training-library [data-hand="right"]').click();
 assert.equal(await page.locator('#pull-cue').getAttribute('aria-disabled'),'false');
 assert.equal(await page.evaluate(()=>window.__noir.scene.inputLocked),false);
 assert.equal(await page.locator('[data-retry]').count(),0);
 await page.locator('[data-execute]').click();
 await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>window.__noir.physics.shots),0,'Prepare must never shoot');
 assert.equal(await page.evaluate(()=>window.__noir.physics.moving),false);
 assert.equal(await page.locator('#pull-cue').getAttribute('aria-valuenow'),'0');
 const chosen=await page.evaluate(async id=>{
  const shots=(await import('/src/training/solutions.json')).default[id];
  const {orderOptions}=await import('/src/training/options.js');
  return orderOptions(shots)[Number(document.querySelector('#training-variant').value)];
 },'straight-short');
 assert.deepEqual(await page.evaluate(()=>window.__noir.scene.tip),chosen.tip);
 assert.ok(Math.abs(await page.evaluate(()=>window.__noir.scene.angle)-chosen.angle)<1e-9);
 const box=await page.locator('#pull-cue').boundingBox();
 const travel=await page.evaluate(async()=>{const {pullTravel}=await import('/src/shot-control.js');return pullTravel(document.querySelector('#pull-cue').clientHeight);});
 await page.mouse.move(box.x+box.width/2,box.y+15);await page.mouse.down();
 await page.mouse.move(box.x+box.width/2,box.y+15+travel*chosen.power);await page.mouse.up();

 await page.waitForFunction(()=>window.__noir.physics.shots===1);
 await page.waitForFunction(()=>!window.__noir.physics.moving,undefined,{timeout:60000});
 assert.equal(await page.locator('#training-result').isVisible(),true);
 assert.equal(await page.locator('#training-result [data-retry]').isEnabled(),true);
 assert.equal(await page.locator('#training-result [data-exit]').isEnabled(),true);
 await page.screenshot({path:'artifacts/training-result-actions.png'});
 const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('noir:training:v1')));
 assert.equal(progress['straight-short'].completed,true);assert.equal(progress['straight-short'].independent,false);
 assert.equal(await page.locator('#pull-cue').getAttribute('aria-disabled'),'true');
 await page.locator('[data-retry]').click();assert.equal(await page.locator('#training-result').isVisible(),false);assert.equal(await page.evaluate(()=>window.__noir.physics.shots),0);
 assert.equal(await page.evaluate(()=>window.__noir.scene.inputLocked),false);
 await page.locator('[data-save]').click();await page.locator('[data-library]').click();
 await page.locator('#training-filter').selectOption('saved');assert.equal(await page.locator('.lesson-card').count(),1);
 await page.reload({waitUntil:'networkidle'});await page.locator('#practice-start').click();await page.locator('#training-start').click();
 assert.ok((await page.locator('[data-lesson="straight-short"]').innerText()).includes('✓'));
 await page.locator('[data-lesson="bank"]').click();
 for(const size of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);await page.waitForTimeout(250);
  const ball=await page.locator('.spin-ball').boundingBox();assert.ok(ball.x>=0&&ball.y>=0&&ball.x+ball.width<=size.width&&ball.y+ball.height<=size.height);
  assert.equal(await page.locator('#training-panel').isVisible(),false,'Coach is collapsed on phones');
  await page.screenshot({path:`artifacts/training-${size.width}.png`});
 }
 await page.locator('#phone-coach').click();await page.locator('[data-library]').click();await page.locator('[data-practice]').click();
 assert.equal(await page.locator('#training-panel').isVisible(),false);
 assert.equal(await page.evaluate(()=>window.__noir.physics.balls.filter(b=>!b.pocketed).length),16);
 assert.deepEqual(errors,[]);console.log('PASS training: catalog, hints, real cue shot, scoring, retry, persistence, filters, responsive layouts, exit to practice');
}finally{await browser.close();}
