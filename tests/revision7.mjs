import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  await page.locator('#practice-start').click();await page.locator('#free-practice-start').click();
  const result=await page.evaluate(async()=>{
    const {scene:s,physics:p}=window.__noir;
    const {HEAD_STRING_X}=await import('/src/table-model.js');
    const canvas=s.ballMeshes.get(0).material.map.image,ctx=canvas.getContext('2d');
    const pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
    return {onLine:p.cueBall.x===HEAD_STRING_X,z:p.cueBall.z,dots:[.125,.375,.625,.875].map(x=>pixel(x*canvas.width,canvas.height/2)),outside:pixel(canvas.width*.125+16,canvas.height/2),edge:pixel(canvas.width*.125+12,canvas.height/2),pole:pixel(canvas.width/2,0)};
  });
  assert.equal(result.onLine,true);assert.equal(result.z,0);
  for(const color of [...result.dots,result.edge])assert.ok(color.slice(0,3).every(v=>v<40));
  for(const color of [result.outside,result.pole])assert.ok(color.slice(0,3).every(v=>v>230));
  await page.evaluate(()=>window.__noir.scene.setCloth('green'));
  await page.screenshot({path:'artifacts/green-v7.png'});
  await page.evaluate(()=>{const{scene:s,physics:p}=window.__noir;s.setView('top');p.shoot(0,1);});
  await page.waitForTimeout(3000);
  await page.screenshot({path:'artifacts/break-v7.png'});
  console.log('PASS: cue centred on head string, four enlarged black dots, white poles; green cloth and break captures saved.');
}finally{await browser.close();}
