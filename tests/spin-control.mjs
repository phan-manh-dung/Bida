import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.locator('#ai-start').click();await page.locator('#start-match').click();
 await page.evaluate(()=>{
  const {match:m,physics:p,scene:s}=window.__noir;m.startRack(0);m.breaking=false;p.hand=null;
  p.balls.forEach(b=>b.pocketed=b.id>1);Object.assign(p.cueBall,{x:-1,px:-1,z:0,pz:0});Object.assign(p.balls[1],{x:0,px:0,z:0,pz:0});s.angle=0;m.notify();
  const original=p.onEvent;p.onEvent=e=>{if(e.type==='shot')window.spinAtShot={wx:p.cueBall.wx,wy:p.cueBall.wy,wz:p.cueBall.wz};original(e);};
 });
 const ball=page.locator('.spin-ball');assert.equal(await ball.isEnabled(),true);
 let box=await ball.boundingBox();
 await page.mouse.click(box.x+box.width/2,box.y+box.height*.86);
 assert.ok((await page.evaluate(()=>window.__noir.scene.tip.y))<-.8);
 await page.screenshot({path:'artifacts/spin-draw-desktop.png'});
 await ball.focus();await page.keyboard.press('KeyR');assert.deepEqual(await page.evaluate(()=>window.__noir.scene.tip),{x:0,y:0});
 await ball.focus();await page.keyboard.press('ArrowUp');assert.ok((await page.evaluate(()=>window.__noir.scene.tip.y))>0);
 await page.keyboard.press('KeyR');
 await page.mouse.click(box.x+box.width/2,box.y+box.height*.86);
 const pull=page.locator('#pull-cue');await pull.focus();
 for(let i=0;i<10;i++)await page.keyboard.press('ArrowDown');
 await page.keyboard.press('Enter');await page.waitForFunction(()=>window.spinAtShot);
 assert.ok((await page.evaluate(()=>window.spinAtShot.wz))>10,'Actual UI shot must carry backspin');
 assert.equal(await ball.isEnabled(),false,'No spin input while balls move');
 assert.deepEqual(await page.evaluate(()=>window.__noir.scene.tip),{x:0,y:0});
 await page.evaluate(()=>{const m=window.__noir.match;m.startRack(1);clearTimeout(m.timer);m.timer=null;});
 assert.equal(await ball.isEnabled(),false,'AI turn locks the selector');
 await page.screenshot({path:'artifacts/spin-disabled.png'});
 await page.evaluate(()=>window.__noir.match.startRack(0));
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(150);
  box=await ball.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height);
  await page.mouse.click(box.x+box.width*.85,box.y+box.height/2);
  assert.ok((await page.evaluate(()=>window.__noir.scene.tip.x))>.8);
  await page.screenshot({path:`artifacts/spin-${viewport.width}.png`});
 }
 await page.evaluate(()=>window.__noir.goHome());assert.deepEqual(errors,[]);
 console.log('PASS: tip drag/reset/keyboard, actual backspin shot, turn lock, bright/dim state and mobile layout.');
}finally{await browser.close();}
