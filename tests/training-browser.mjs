import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.locator('#training-start').click();assert.equal(await page.locator('.lesson-card').count(),12);
 await page.screenshot({path:'artifacts/training-library.png'});
 await page.locator('[data-lesson="straight-short"]').click();
 assert.equal(await page.locator('#pull-cue').getAttribute('aria-disabled'),'false');
 assert.equal(await page.evaluate(()=>window.__noir.scene.inputLocked),false);
 await page.locator('[data-apply]').click();
 const shot=await page.evaluate(async()=>{const s=(await import('/src/training/solutions.json')).default;return s['straight-short'][0];});
 assert.ok(Math.abs((await page.evaluate(()=>window.__noir.scene.angle))-shot.angle)<1e-8);
 await page.screenshot({path:'artifacts/training-lesson.png'});
 // Exact input through the actual cue slider and release animation.
 const box=await page.locator('#pull-cue').boundingBox();
 const travel=await page.evaluate(async()=>{const {pullTravel}=await import('/src/shot-control.js');return pullTravel(document.querySelector('#pull-cue').clientHeight);});
 await page.mouse.move(box.x+box.width/2,box.y+15);await page.mouse.down();
 await page.mouse.move(box.x+box.width/2,box.y+15+travel*shot.power);await page.mouse.up();
 await page.waitForFunction(()=>window.__noir.physics.shots===1);
 await page.evaluate(()=>{const p=window.__noir.physics;for(let i=0;i<3600&&p.moving;i++)p.update(1/120);});
 const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('noir:training:v1')));
 assert.equal(progress['straight-short'].completed,true);assert.equal(progress['straight-short'].independent,false);
 assert.equal(await page.locator('#pull-cue').getAttribute('aria-disabled'),'true');
 await page.locator('[data-retry]').click();assert.equal(await page.evaluate(()=>window.__noir.physics.shots),0);
 assert.equal(await page.evaluate(()=>window.__noir.scene.inputLocked),false);
 await page.locator('[data-save]').click();await page.locator('[data-library]').click();
 await page.locator('#training-filter').selectOption('saved');assert.equal(await page.locator('.lesson-card').count(),1);
 await page.reload({waitUntil:'networkidle'});await page.locator('#training-start').click();
 assert.ok((await page.locator('[data-lesson="straight-short"]').innerText()).includes('✓'));
 await page.locator('[data-lesson="bank"]').click();
 for(const size of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);await page.waitForTimeout(250);
  const ball=await page.locator('.spin-ball').boundingBox();assert.ok(ball.x>=0&&ball.y>=0&&ball.x+ball.width<=size.width&&ball.y+ball.height<=size.height);
  const panel=await page.locator('#training-panel').boundingBox();
  assert.ok(ball.x+ball.width<=panel.x||ball.x>=panel.x+panel.width||ball.y+ball.height<=panel.y||ball.y>=panel.y+panel.height,'Spin selector must not be covered by the coach');
  await page.screenshot({path:`artifacts/training-${size.width}.png`});
 }
 await page.locator('[data-library]').click();await page.locator('[data-practice]').click();
 assert.equal(await page.locator('#training-panel').isVisible(),false);
 assert.equal(await page.evaluate(()=>window.__noir.physics.balls.filter(b=>!b.pocketed).length),16);
 assert.deepEqual(errors,[]);console.log('PASS training: catalog, hints, real cue shot, scoring, retry, persistence, filters, responsive layouts, exit to practice');
}finally{await browser.close();}
