import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.locator('#practice-start').click();await page.locator('#free-practice-start').click();
  await page.waitForFunction(() => !!window.__noir?.scene);
  await page.screenshot({ path: 'artifacts/desktop-v2.png' });
  await page.evaluate(() => {
    const s = window.__noir.scene;
    s.controls.enableDamping = false;
    s.camera.position.set(6.1, 2.35, 4.0); s.controls.target.set(3.75,0,1.6); s.controls.update();
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'artifacts/pocket-detail-v2.png' });
  await page.locator('#menu-toggle').click(); await page.locator('[data-view="cue"]').click();
  await page.screenshot({ path: 'artifacts/cue-view-v2.png' });
  await page.locator('#menu-toggle').click(); await page.locator('[data-view="top"]').click();
  await page.screenshot({ path: 'artifacts/top-view-v2.png' });
  for (const [width,height] of [[390,844],[844,390]]) {
    await page.setViewportSize({ width,height }); await page.locator('#menu-toggle').click(); await page.locator('[data-view="orbit"]').click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: `artifacts/${width}x${height}-orbit-v2.png` });
  }
  console.log('Saved current desktop, pocket detail, cue, top, portrait and landscape views.');
} finally { await browser.close(); }
