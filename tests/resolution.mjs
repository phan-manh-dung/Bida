import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.locator('#practice-start').click();await page.locator('#free-practice-start').click();
  await page.waitForFunction(() => window.__noir?.scene);
  const result = await page.evaluate(() => {
    const s = window.__noir.scene;
    const canvas = s.renderer.domElement;
    return { width: canvas.width, height: canvas.height, dpr: s.renderer.getPixelRatio() };
  });
  assert.ok(result.width * result.height <= 2200000, JSON.stringify(result));
  assert.ok(result.dpr >= 1, 'Full HD retains native pixel detail');
  console.log('High-DPI render budget passed', result);
} finally { await browser.close(); }
