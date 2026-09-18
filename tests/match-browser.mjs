import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.locator('#ai-start').click();await page.locator('#race-target').fill('1');await page.locator('#ai-level').selectOption('B');await page.locator('#start-match').click();
 await page.evaluate(()=>window.__noir.match.startRack(1));
 assert.equal(await page.locator('#pull-cue').getAttribute('aria-disabled'),'true');
 await page.waitForFunction(()=>window.__noir.physics.shots===1,{},{timeout:10000});
 assert.equal(await page.evaluate(()=>window.__noir.match.turn),1);
 assert.equal(await page.evaluate(()=>window.__noir.match.shootHuman(0,.5,{})),false);
 await page.waitForFunction(()=>!window.__noir.physics.moving,{},{timeout:45000});
 await page.evaluate(()=>{const m=window.__noir.match;clearTimeout(m.timer);m.timer=null;});
 // Known legal final-nine position; play the actual mouse pull through the UI.
 await page.evaluate(()=>{
  const {match:m,physics:p,scene:s}=window.__noir;m.startRack(0);m.breaking=false;p.hand=null;m.pushAvailable=false;
  p.balls.forEach(b=>b.pocketed=b.id!==0&&b.id!==9);
  Object.assign(p.cueBall,{x:0,px:0,z:1.15,pz:1.15});Object.assign(p.balls.find(b=>b.id===9),{x:0,px:0,z:1.8,pz:1.8});
  s.angle=Math.PI/2;s.syncBalls(0);m.notify();
 });
 const box=await page.locator('#pull-cue').boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height*.2);await page.mouse.down();
 await page.mouse.move(box.x+box.width/2,box.y+box.height*(.2+.45*.28),{steps:8});await page.mouse.up();
 await page.waitForFunction(()=>window.__noir.match.phase==='match-over',{},{timeout:30000});
 assert.deepEqual(await page.evaluate(()=>window.__noir.match.score),[1,0]);
 await page.screenshot({path:'artifacts/match-win.png'});
 await page.locator('#match-decisions button').click();assert.equal(await page.locator('#home-screen').isVisible(),true);
 // A scheduled machine stroke must not execute after leaving the match.
 await page.locator('#ai-start').click();await page.locator('#start-match').click();
 await page.evaluate(()=>{window.__noir.match.startRack(1);window.__noir.goHome();});await page.waitForTimeout(1700);
 assert.equal(await page.evaluate(()=>window.__noir.physics.shots),0);assert.equal(await page.evaluate(()=>window.__noir.match),null);
 assert.deepEqual(errors,[]);console.log('PASS: AI takes an actual shot, human is locked out of its turn, mouse shot wins a race-to-one, leaving cancels pending AI.');
}finally{await browser.close();}
