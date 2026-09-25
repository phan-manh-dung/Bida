import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173/';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.locator('#practice-start').click();await page.locator('#free-practice-start').click();
  await page.waitForFunction(() => window.__noir?.scene && !document.querySelector('#loading'));
  await page.screenshot({ path: 'artifacts/desktop-v2.png' });
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(await page.locator('#shoot, .toast, .site-header, .intro').count(), 0);
  assert.equal(await page.locator('[data-view]').count(), 3);
  await page.evaluate(()=>{const {physics,scene}=window.__noir;physics.reset('practice');scene.angle=-.281;scene.syncBalls(0);});
  const target = await page.evaluate(() => window.__noir.scene.project(0.15, -0.65));
  await page.mouse.click(target.x, target.y);
  assert.ok(Math.abs(await page.evaluate(() => window.__noir.scene.angle) - Math.atan2(-0.75, 2.6)) < 0.02);
  async function beginPull(fraction = 0.5) {
    const r = await page.locator('#pull-cue').boundingBox();
    const x = r.x + r.width * 0.45, y = r.y + r.height * 0.25;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x, y + r.height * 0.45 * fraction, { steps: 10 });
    return { x, y };
  }
  const restingCue=await page.locator('.cue-stick').boundingBox();
  const cueTrack=await page.locator('#pull-cue').boundingBox();
  assert.ok(restingCue.height/cueTrack.height>.88,'The resting cue spans almost the full control');
  await beginPull(0.6);
  const drawnCue=await page.locator('.cue-stick').boundingBox();
  assert.ok(drawnCue.y+drawnCue.height>cueTrack.y+cueTrack.height,'Cue slides beyond the lower clip edge');
  assert.equal(await page.locator('#pull-cue').evaluate(el=>getComputedStyle(el).overflow),'hidden');
  assert.ok(Number(await page.locator('#pull-cue').getAttribute('aria-valuenow')) >= 59);
  assert.equal(await page.evaluate(() => window.__noir.physics.shots), 0, 'Pulling alone does not shoot');
  await page.screenshot({ path: 'artifacts/pulling-v2.png' });
  await page.mouse.up();
  await page.waitForFunction(() => window.__noir.physics.shots === 1);
  assert.equal(await page.locator('#pull-cue').getAttribute('aria-disabled'), 'true');
  await beginPull(0.7); await page.mouse.up();
  assert.equal(await page.evaluate(() => window.__noir.physics.shots), 1, 'Cannot shoot twice during motion');
  await page.waitForFunction(() => !window.__noir.physics.moving, undefined, { timeout: 45000 });
  const changed = await page.evaluate(() => {
    const b = window.__noir.physics.balls.find(b => b.id === 1);
    return b.pocketed || Math.hypot(b.x - 0.15, b.z + 0.65) > 0.1;
  });
  assert.ok(changed);
  const cancelled = await beginPull(0.5);
  await page.mouse.move(cancelled.x, cancelled.y); await page.mouse.up();
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.__noir.physics.shots), 1, 'Returning cue to rest cancels');
  await beginPull(0.5); await page.keyboard.press('Escape'); await page.mouse.up();
  assert.equal(await page.evaluate(() => window.__noir.physics.shots), 1, 'Escape cancels a pending shot');

  await page.locator('#settings-toggle').click();
  assert.equal(await page.locator('#settings-dialog').isVisible(), true);
  await page.waitForFunction(() => ['break','collision','pocket'].every(type=>window.__noir.audio.buffers.get(type)?.length));
  assert.equal(await page.locator('#sound').isEnabled(), true, 'User recordings are loaded');
  assert.equal(await page.evaluate(()=>[...window.__noir.scene.ballMeshes.values()].some(ball=>ball.castShadow)),false,'Balls use one contact shadow, avoiding doubled shadows');
  assert.equal(await page.evaluate(()=>{
    const {scene:s,physics:p}=window.__noir;s.syncBalls(0);
    return p.balls.every(b=>Math.abs(s.ballMeshes.get(b.id).quaternion.w-b.qw)<1e-8);
  }),true,'Stopped orientations match physics');
  // An in-memory silent WAV checks decoding/playback wiring, not subjective sound realism.
  const wav = Buffer.alloc(44 + 4410 * 2);
  wav.write('RIFF',0); wav.writeUInt32LE(wav.length - 8,4); wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(44100,24); wav.writeUInt32LE(88200,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34);
  wav.write('data',36); wav.writeUInt32LE(wav.length - 44,40);
  await page.locator('.audio-import summary').click();
  await page.locator('[data-audio="collision"]').setInputFiles({ name:'test-silence.wav', mimeType:'audio/wav', buffer:wav });
  await page.waitForFunction(() => window.__noir.audio.ready);
  assert.equal(await page.locator('#sound').isEnabled(),true);
  assert.equal(await page.evaluate(() => { window.__noir.audio.play({ type:'collision',speed:4 },0.3); return window.__noir.audio.voices.size > 0; }),true);
  await page.locator('[data-cloth="wine"]').click(); await page.locator('#guide').uncheck();
  await page.screenshot({ path: 'artifacts/options-v2.png' });
  await page.keyboard.press('Escape'); await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#practice-start').click();await page.locator('#free-practice-start').click();
  await page.locator('#settings-toggle').click();
  assert.equal(await page.locator('[data-cloth="wine"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#guide').isChecked(), false);
  await page.locator('[data-cloth="blue"]').click(); await page.locator('#guide').check();
  await page.keyboard.press('Escape');
  await page.locator('#menu-toggle').click(); await page.locator('#help').click();
  assert.equal(await page.locator('#help-dialog').isVisible(), true); await page.keyboard.press('Escape');
  await page.locator('#menu-toggle').click(); await page.locator('#fullscreen').click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  assert.equal(await page.locator('#pull-cue').isVisible(), true);
  await page.locator('#menu-toggle').click(); await page.locator('#fullscreen').click();
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.locator('#menu-toggle').click(); await page.locator('#new-game').click();
  await page.locator('[data-layout="rack"]').click();
  assert.equal(await page.evaluate(() => window.__noir.physics.shots), 0);
  await page.locator('#pull-cue').focus();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('#pull-cue').getAttribute('aria-valuenow'),'10');
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#pull-cue').getAttribute('aria-valuenow'),'0');
  await page.keyboard.down('Space'); await page.waitForTimeout(250); await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__noir.physics.shots === 1);
  await page.locator('#menu-toggle').click(); await page.locator('#new-game').click(); await page.locator('[data-layout="rack"]').click();
  await page.locator('#menu-toggle').click(); await page.locator('[data-view="cue"]').click();
  await page.screenshot({ path: 'artifacts/cue-view-v2.png' });
  await page.locator('#menu-toggle').click(); await page.locator('[data-view="top"]').click();
  await page.screenshot({ path: 'artifacts/top-view-v2.png' });
  for (const [width, height] of [[390,844],[844,390],[768,1024],[1024,768],[1920,1080]]) {
    await page.setViewportSize({ width, height });
    for (const view of ['orbit','top']) {
      await page.locator('#menu-toggle').click(); await page.locator(`[data-view="${view}"]`).click();
      await page.waitForTimeout(180);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight), false);
      const fits = await page.evaluate(() => {
        const s = window.__noir.scene, r = document.querySelector('#scene').getBoundingClientRect();
        return [-5.16,5.16].every(x => [-2.96,2.96].every(z => {
          const p = s.project(x,z,0.28);
          return p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
        }));
      });
      assert.ok(fits, `The entire table should fit ${width}x${height} in ${view} view`);
      if (view === 'orbit' || width === 390) await page.screenshot({ path: `artifacts/${width}x${height}-${view}-v2.png` });
    }
  }
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const touchPage = await mobile.newPage(); touchPage.on('pageerror', e => errors.push(e.message));
  await touchPage.goto(baseURL, { waitUntil: 'networkidle' });
  await touchPage.locator('#practice-start').click();await touchPage.locator('#free-practice-start').click();
  await touchPage.waitForFunction(() => !!window.__noir?.scene);
  await touchPage.evaluate(()=>{const {physics,scene}=window.__noir;physics.reset('practice');scene.angle=-.281;scene.syncBalls(0);});
  // Project the touch after the newly visible canvas has rendered its fitted camera.
  await touchPage.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  const touchTarget = await touchPage.evaluate(() => window.__noir.scene.project(1,0.5));
  await touchPage.touchscreen.tap(touchTarget.x,touchTarget.y);
  await touchPage.waitForFunction(() => Math.abs(window.__noir.scene.angle - Math.atan2(0.4,3.45)) < 0.03);
  const cdp = await mobile.newCDPSession(touchPage), r = await touchPage.locator('#pull-cue').boundingBox();
  const tx = r.x + r.width * 0.45, ty = r.y + r.height * 0.25;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx, y: ty + r.height * 0.15 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  assert.equal(await touchPage.evaluate(() => window.__noir.physics.shots),0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx, y: ty + r.height * 0.15 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touchPage.waitForFunction(() => window.__noir.physics.shots === 1);
  assert.deepEqual(errors, []);
  console.log('PASS: clean fullscreen table, mouse/touch pull-to-shoot, cancellation, collisions, hidden menus, preferences, cameras and six responsive viewports.');
} finally { await browser.close(); }
