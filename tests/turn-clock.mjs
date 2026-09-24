import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.locator('#ai-start').click();await page.locator('#start-match').click();
 await page.evaluate(()=>window.__noir.match.startRack(0));
 assert.equal((await page.locator('.match-score-line').textContent()).trim(),'0 - 0');
 assert.ok(await page.evaluate(()=>window.__noir.match.turnDeadline-performance.now()>58000));
 assert.equal(await page.locator('.player-card .player-score').count(),0);
 assert.equal(await page.locator('#game .camera-control').count(),0);
 await page.locator('#menu-toggle').click();
 await page.locator('#menu-dialog [data-view="orbit"]').click();
 assert.equal(await page.evaluate(()=>window.__noir.scene.view),'orbit');
 assert.equal(await page.locator('#menu-dialog').isVisible(),false);
 await page.locator('#menu-toggle').click();await page.locator('#menu-dialog [data-view="top"]').click();
 await page.evaluate(()=>window.__noir.match.winRack(0));
 assert.equal((await page.locator('.match-score-line').textContent()).trim(),'1 - 0');
 assert.equal(await page.locator('#next-rack').isVisible(),true);
 assert.equal(await page.locator('#next-rack').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(40, 184, 108)');
 await page.screenshot({path:'artifacts/next-rack-taskbar.png'});
 await page.locator('#next-rack').click();
 assert.equal(await page.evaluate(()=>window.__noir.match.rackNumber),2);
 assert.equal(await page.locator('#next-rack').isVisible(),false);
 await page.evaluate(()=>window.__noir.match.startRack(0));
 assert.equal(await page.locator('#human-score').evaluate(e=>e.classList.contains('clock-running')),true);
 assert.equal(await page.locator('#match-status').isVisible(),false);
 const offset=()=>page.locator('#human-score .clock-progress').evaluate(e=>Number(e.style.strokeDashoffset));
 const before=await offset();await page.waitForTimeout(150);assert.ok(await offset()>before);
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:900});
  const layout=await page.evaluate(()=>{
   const cards=[...document.querySelectorAll('.player-card')].map(c=>{
    const name=c.querySelector('.player-info').getBoundingClientRect(),row=c.querySelector('.player-balls').getBoundingClientRect(),avatar=c.querySelector('.player-avatar').getBoundingClientRect();
    return {aligned:Math.abs(row.x-name.x)<1,below:row.top>=name.bottom,beside:c.id==='ai-score'?row.right<=avatar.left:row.x>=avatar.right};
   });
   return {cards,menu:document.querySelector('#menu-toggle').getBoundingClientRect().top};
  });
  assert.ok(layout.cards.every(c=>c.aligned&&c.below&&c.beside),JSON.stringify(layout));assert.ok(layout.menu<30);
  await page.screenshot({path:`artifacts/turn-clock-${width}.png`});
 }
 await page.setViewportSize({width:1440,height:900});
 // Expiry while charging cancels the pending input and blocks play for two seconds.
 const box=await page.locator('#pull-cue').boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+40);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+100);
 await page.evaluate(()=>{const m=window.__noir.match;m.turnDeadline=performance.now()-1;m.expireTurn();});
 assert.equal(await page.locator('.foul-popup').isVisible(),true);
 assert.equal(await page.locator('#scene').evaluate(e=>getComputedStyle(e).filter),'none');
 assert.equal(await page.locator('#pull-cue').getAttribute('aria-disabled'),'true');
 await page.mouse.up();
 assert.equal(await page.evaluate(()=>window.__noir.physics.shots),0);
 await page.screenshot({path:'artifacts/turn-clock-foul.png'});
 await page.waitForTimeout(1000);assert.equal(await page.locator('.foul-popup').isVisible(),true);
 await page.waitForFunction(()=>!window.__noir.match.foulNotice);
 assert.equal(await page.locator('.foul-popup').isVisible(),false);
 assert.equal(await page.locator('#ai-score').evaluate(e=>e.classList.contains('clock-running')),true);
 assert.equal(await page.locator('#ai-score .clock-progress').evaluate(e=>getComputedStyle(e).stroke),'rgb(53, 217, 121)');
 await page.waitForFunction(()=>window.__noir.physics.moving);
 assert.equal(await page.locator('#match-status').isVisible(),false);
 assert.equal(await page.locator('.clock-running').count(),0);
 await page.evaluate(()=>window.__noir.goHome());
 assert.deepEqual(errors,[]);
 console.log('PASS: ball rows below names beside avatars, top menu, running clocks, expiry during charge, 2s popup without dimming, AI turn and no running-shot notice.');
}finally{await browser.close();}
