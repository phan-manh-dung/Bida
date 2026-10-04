// Capture the normal game, then isolate the tabletop for reference comparison.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>!!window.__noir);
 await page.evaluate(()=>{window.__noir.startPractice();window.__noir.scene.setView('top');});
 await page.waitForTimeout(600);
 const label=process.argv[2]||'final';
 await page.screenshot({path:`artifacts/table-top-${label}.png`});
 await page.evaluate(()=>{const s=window.__noir.scene;cancelAnimationFrame(s.frame);for(const b of s.ballMeshes.values())b.visible=false;s.cue.visible=false;s.guide.visible=false;s.ghost.visible=false;s.renderer.setClearColor('#202326',1);s.scene.getObjectByName('table-markings').visible=false;s.renderer.render(s.scene,s.camera);});
 await page.locator('#scene canvas').screenshot({path:`artifacts/table-surface-${label}.png`});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({errors}));
}finally{await browser.close();}
