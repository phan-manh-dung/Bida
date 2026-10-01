import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/');await page.locator('#ai-start').click();await page.locator('#start-match').click();
 await page.evaluate(()=>{const {match:m,scene:s}=window.__noir;m.startRack(1);s.setView('cue');});
 await page.waitForFunction(()=>window.__noir.scene.power>0);await page.waitForTimeout(700);
 const pose=()=>page.evaluate(()=>window.__noir.scene.camera.position.toArray());
 const aiming=await pose();assert.ok(Math.abs(aiming[0])<.1,'Opponent gets a horizontal full-table view');
 await page.waitForFunction(()=>window.__noir.physics.moving);await page.waitForTimeout(500);
 assert.ok((await pose()).every((v,i)=>Math.abs(v-aiming[i])<.02),'Camera stays steady during opponent shot');
 await page.waitForFunction(()=>!window.__noir.physics.moving,undefined,{timeout:45000});
 await page.evaluate(()=>{const {match:m,scene:s}=window.__noir;clearTimeout(m.timer);m.timer=null;m.startRack(0);s.angle=.3;m.notify();});await page.waitForTimeout(1200);
 assert.ok(Math.abs((await pose())[0])>1,'Own turn follows own cue heading');
 assert(await page.evaluate(()=>window.__noir.scene.cue.visible));assert.deepEqual(errors,[]);
 console.log('PASS opponent overview, steady shot camera and own-turn aiming with visible cue');
}finally{await browser.close();}
