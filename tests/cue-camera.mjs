import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/');
 await page.evaluate(()=>{window.__noir.startPractice();window.__noir.scene.setView('cue');});
 await page.waitForFunction(()=>window.__noir.scene.cue.visible);
 assert.equal(await page.locator('.cue-camera-tools').count(),0);
 assert.equal(await page.locator('#pull-cue').isVisible(),false);
 const area=await page.locator('#scene canvas').boundingBox();await page.mouse.move(area.x+area.width*.6,area.y+area.height*.5);
 const state=()=>page.evaluate(()=>{const s=window.__noir.scene;return {angle:s.angle,phi:s.controls.getPolarAngle(),distance:s.camera.position.distanceTo(s.controls.target)};});
 const before=await state();await page.mouse.wheel(0,-200);await page.waitForTimeout(250);const after=await state();
 assert.ok(after.phi<before.phi);assert.ok(Math.abs(after.distance-before.distance)<1e-7);assert.equal(after.angle,before.angle);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);assert(await page.locator('#pull-cue').isVisible());
 assert.equal(await page.evaluate(()=>window.__noir.scene.controls.enableZoom),false);
 assert.deepEqual(errors,[]);console.log('PASS cue camera: visible cue, wheel elevation without zoom, removed toolbar and mobile force control');
}finally{await browser.close();}
