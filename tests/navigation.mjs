import {chromium} from 'playwright';
import {createServer} from 'vite';
import assert from 'node:assert/strict';

const server=await createServer({server:{host:'127.0.0.1',port:5190}});
await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  const home=async()=>{
    await page.locator('#home-screen').waitFor({state:'visible'});
    assert.equal(new URL(page.url()).origin,new URL(server.resolvedUrls.local[0]).origin);
    assert.equal(await page.locator('#game').isVisible(),false);
  };
  assert.equal(await page.locator('[data-play], [data-home], .landing-nav [data-modes], #setup-back').count(),0);
  await page.locator('#ai-start').click();
  for(const [width,height] of [[1920,1080],[1536,864],[1366,768],[1280,720],[1280,620],[1024,768]]) {
    await page.setViewportSize({width,height});
    for(const game of ['8','9']) {
      await page.locator('#game-type').selectOption(game);
      const fits=await page.locator('#lobby').evaluate(e=>e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1);
      assert(fits,`setup should fit ${width}x${height}, ${game}-ball`);
    }
  }
  await page.screenshot({path:'artifacts/setup-fit.png'});
  await page.goBack();await home();
  await page.goForward();await page.locator('#setup-screen').waitFor({state:'visible'});
  await page.locator('#start-match').click();await page.locator('#game').waitFor({state:'visible'});
  await page.goBack();await page.locator('#setup-screen').waitFor({state:'visible'});
  await page.goBack();await home();
  await page.locator('#practice-start').click();await page.locator('#training-library').waitFor({state:'visible'});
  await page.goBack();await home();
  await page.goForward();await page.locator('#training-library').waitFor({state:'visible'});
  await page.locator('#free-practice-start').click();await page.locator('#game').waitFor({state:'visible'});
  await page.goBack();await page.locator('#free-practice-start').waitFor({state:'visible'});
  for(let i=0;i<3;i++){
    await page.locator('#saved-training-start').click();
    await page.locator('[data-new-layout]').click();
    await page.goBack();await page.locator('[data-new-layout]').waitFor({state:'visible'});
    await page.goBack();await page.locator('#saved-training-start').waitFor({state:'visible'});
    await page.goForward();await page.locator('[data-new-layout]').waitFor({state:'visible'});
    await page.goBack();await page.locator('#saved-training-start').waitFor({state:'visible'});
  }
  await page.goBack();await home();
  await page.locator('#ai-start').click();await page.locator('.brand').click();await home();
  await page.waitForFunction(()=>history.state?.noirRoute==='home');
  await page.locator('#ai-start').click();await page.goBack();await home();
  await page.setViewportSize({width:390,height:844});await page.locator('#ai-start').click();
  await page.locator('#start-match').scrollIntoViewIfNeeded();
  assert(await page.locator('#lobby').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await page.goBack();await home();
  assert.deepEqual(errors,[]);
  console.log('PASS: removed buttons, setup fits six desktop sizes, Back/Forward for setup, match, training, practice and mobile.');
} finally {await browser.close();await server.close();}
