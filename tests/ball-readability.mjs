import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.locator('#practice-start').click();await page.locator('#free-practice-start').click();
  const camera = () => page.evaluate(() => window.__noir.scene.camera.position.toArray());
  for (const view of ['top', 'orbit', 'cue']) {
    await page.locator('#menu-toggle').click(); await page.locator(`[data-view="${view}"]`).click();
    await page.waitForTimeout(200);
    const before = await camera();
    await page.mouse.move(650, 400);
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(200);
    assert.ok((await camera()).every((n, i) => Math.abs(n - before[i]) < 1e-9), `${view}: wheel must not zoom`);
  }
  await page.locator('#menu-toggle').click(); await page.locator('[data-view="top"]').click();
  const client = await page.context().newCDPSession(page);
  const before = await camera();
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 550, y: 400, id: 1 }, { x: 750, y: 400, id: 2 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 450, y: 400, id: 1 }, { x: 850, y: 400, id: 2 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
  assert.ok((await camera()).every((n, i) => Math.abs(n - before[i]) < 1e-9), 'Pinch must not zoom');
  await page.evaluate(() => { const { physics: p, scene: s } = window.__noir; p.reset('practice'); s.syncBalls(0); });
  await page.screenshot({ path: 'artifacts/balls-readable-desktop.png' });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(200);
    const result = await page.evaluate(async () => {
      const { scene: s, physics: p } = window.__noir;
      const { OUTER_X, OUTER_Z, CLOTH_Y } = await import('/src/table-model.js');
      const corners = [-OUTER_X, OUTER_X].flatMap(x => [-OUTER_Z, OUTER_Z].map(z => s.project(x, z, CLOTH_Y)));
      const numbers = p.balls.filter(b => b.id && !b.pocketed).every(b => {
        const mesh = s.ballMeshes.get(b.id);
        return mesh.material.map.isCanvasTexture && Math.abs(mesh.quaternion.w - b.qw) < 1e-9;
      });
      return { corners, numbers, floatingNumbers: s.scene.children.filter(o => o.isSprite).length };
    });
    assert.ok(result.numbers, 'Printed numbers use the physical ball orientation');
    assert.equal(result.floatingNumbers, 0, 'No camera-facing ball labels');
    assert.ok(result.corners.every(p => p.x >= 0 && p.y >= 0 && p.x <= viewport.width && p.y <= viewport.height), 'Table fits viewport');
  }
  await page.screenshot({ path: 'artifacts/balls-readable-mobile.png' });
  const rolling = await page.evaluate(() => {
    const { physics: p, scene: s } = window.__noir;
    cancelAnimationFrame(s.frame);
    const ball = p.balls.find(b => b.id === 1), mesh = s.ballMeshes.get(1);
    const before = mesh.quaternion.clone();
    ball.vx = 1; ball.wz = -1 / mesh.geometry.parameters.radius;
    p.moving = true;
    for (let i = 0; i < 30; i++) p.update(1 / 120);
    s.syncBalls(0);
    return before.angleTo(mesh.quaternion);
  });
  assert.ok(rolling > 0.1, 'The numbered surface rotates as the ball rolls');
  assert.deepEqual(errors, []);
  console.log('PASS: zoom locked, printed numbers rotate, table fits desktop/mobile, no JS errors.');
} finally { await browser.close(); }
