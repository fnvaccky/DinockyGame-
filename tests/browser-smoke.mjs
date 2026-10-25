// Optional browser check: node tests/browser-smoke.mjs /absolute/path/to/playwright/index.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.addInitScript(() => {
    window.audioStarts = 0;
    const Audio = window.AudioContext;
    window.AudioContext = class extends Audio {
      createOscillator() {
        const osc = super.createOscillator();
        const start = osc.start.bind(osc);
        osc.start = (...args) => { window.audioStarts++; return start(...args); };
        return osc;
      }
    };
  });
  await page.goto(process.env.GAME_URL || 'http://localhost:3000');
  await page.waitForFunction(() => typeof window.changeLevel === 'function');
  assert.equal(await page.locator('#hudTimer').textContent(), '240');
  assert.equal(await page.locator('#hudHearts').getAttribute('aria-label'), '3 of 3 hearts');
  await mkdir('.impeccable/review', { recursive: true });
  await page.screenshot({ path: '.impeccable/review/desktop.png', fullPage: true });

  await page.locator('#gameCanvas').click();
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => document.getElementById('hudPower').textContent === 'PIZZA');
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => Number(document.getElementById('hudTimer').textContent) < 240);
  await page.keyboard.press('KeyP');
  const time = await page.locator('#hudTimer').textContent();
  assert.ok(Number(time) < 240);
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('#hudTimer').textContent(), time);
  assert.ok(await page.evaluate(() => window.audioStarts > 0), 'food pickup produced real Web Audio oscillator starts');
  await page.locator('#soundButton').click();
  assert.equal(await page.locator('#soundButton').getAttribute('aria-pressed'), 'false');
  await page.locator('#soundButton').click();
  await page.keyboard.press('KeyR');
  await page.waitForFunction(() => document.getElementById('hudPower').textContent === 'None');
  assert.equal(await page.locator('#hudPower').textContent(), 'None');
  assert.equal(await page.locator('#hudTimer').textContent(), '240');
  await page.keyboard.press('Space');
  await page.keyboard.press('KeyX');
  await page.locator('#tabBtnStudio').click();
  assert.equal(await page.locator('#gameTab').isVisible(), false);
  const studioTime = await page.locator('#hudTimer').textContent();
  await page.locator('[data-action="chew"]').click();
  await page.locator('[data-power="DONUT"]').click();
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('#hudTimer').textContent(), studioTime);
  await page.locator('#tabBtnGame').click();
  await page.locator('#levelSelect').selectOption('arena');
  assert.equal(await page.locator('#hudLevel').textContent(), 'Test Arena');
  assert.equal(await page.locator('#hudTimer').textContent(), '--');
  await page.locator('#levelSelect').selectOption('world');
  assert.equal(await page.locator('#hudTimer').textContent(), '240');

  const result = await page.evaluate(async () => {
    const { Level1 } = await import('/src/levels/Level1.js');
    const { Player } = await import('/src/character/Player.js');
    const { events } = await import('/src/core/Events.js');
    // Render every section with the real Canvas API, including both new enemy models.
    const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 540;
    const ctx = canvas.getContext('2d');
    const level = new Level1();
    for (const x of [0, 960, 1920, 2880, 3520]) {
      level.cameraX = x; level.render(ctx);
      new Player(x + 80, 480).render(ctx);
    }
    for (const type of ['PIZZA', 'DONUT', 'BURGER']) events.emit('powerupActivated', { type, name: type, duration: 15 });
    for (const name of ['jump', 'chomp', 'stomp', 'checkpoint', 'playerHurt', 'gameOver']) events.emit(name, {});
    return canvas.toDataURL().length;
  });
  assert.ok(result > 10000);
  // Keep the finished browser scene ready for the player.
  await page.evaluate(() => window.resetGame());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.impeccable/review/mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('Browser smoke passed: loading, food pickup, keyboard controls, real audio, pause, reset, studio, stage switch, all section renders, and mobile overflow.');
} finally {
  await browser.close();
}
