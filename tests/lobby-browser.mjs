import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createDatabase, asUser, rpc, ageRun, USER_A, USER_B } from './database-fixture.js';

// Auth email delivery is deliberately intercepted. RPCs execute the shipping SQL in PostgreSQL (PGlite).
const db = await createDatabase();
const base = process.env.GAME_URL || 'http://127.0.0.1:3001';
const browserRoot = join(homedir(), 'AppData/Local/ms-playwright');
let executablePath = process.env.CHROMIUM_PATH;
if (!executablePath && !existsSync(chromium.executablePath()) && existsSync(browserRoot)) {
  const installed = (await readdir(browserRoot)).filter(name => /^chromium-\d+$/.test(name)).sort().at(-1);
  if (installed) executablePath = join(browserRoot, installed, 'chrome-win64/chrome.exe');
}
const browser = await chromium.launch({ headless: true, executablePath, args: ['--enable-unsafe-swiftshader'] });
const errors = [], requests = [];
let failFinish = false, requestsChain = Promise.resolve();
const user = id => ({ id, aud: 'authenticated', role: 'authenticated', email: id === USER_A ? 'mochi@example.test' : 'berry@example.test', email_confirmed_at: new Date().toISOString(), user_metadata: { display_name: 'Mochi' }, app_metadata: { provider: 'email', providers: ['email'] }, created_at: new Date().toISOString() });
const token = id => `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`;
const session = id => ({ access_token: token(id), refresh_token: `refresh-${id}`, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: user(id) });
await mkdir('.impeccable/review', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('https://*.supabase.co/**', route => {
    requestsChain = requestsChain.then(async () => {
      const request = route.request(), url = new URL(request.url()), body = request.postDataJSON() || {};
      requests.push(url.pathname);
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(data) });
      if (request.method() === 'OPTIONS') return reply({});
      if (url.pathname.endsWith('/signup')) return reply({ user: user(USER_B), session: null });
      if (url.pathname.endsWith('/recover') || url.pathname.endsWith('/logout')) return reply({});
      if (url.pathname.endsWith('/token')) {
        if (body.password === 'incorrect') return reply({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
        return reply(session(body.email?.startsWith('berry') ? USER_B : USER_A));
      }
      let id = USER_A;
      try { id = JSON.parse(Buffer.from(request.headers().authorization.split('.')[1], 'base64url').toString()).sub; } catch {}
      if (url.pathname.endsWith('/user')) return reply(user(id));
      if (url.pathname.includes('/rpc/')) {
        const name = url.pathname.split('/').at(-1);
        if (name === 'finish_run' && failFinish) return route.abort('internetdisconnected');
        const names = { game_snapshot: [], start_run: [], purchase_cosmetic: ['p_item_id'], equip_cosmetic: ['p_item_id'], finish_run: ['p_run_id', 'p_score', 'p_elapsed', 'p_completed'] };
        if (!names[name]) return reply({ message: 'Unknown operation' }, 404);
        try {
          await asUser(db, id);
          const result = await rpc(db, name, names[name].map(key => body[key]));
          if (name === 'start_run') await ageRun(db, result, id);
          return reply(result);
        } catch (error) { return reply({ code: error.code, message: error.message }, 400); }
      }
      return reply({});
    }).catch(error => { errors.push(error.message); });
    return requestsChain;
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base); await page.locator('#loading').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.querySelector('#sceneHost').dataset.renderer === 'webgl');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '.impeccable/review/auth-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.impeccable/review/auth-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#signupTab').click(); await page.locator('#displayName').fill('Berry Explorer');
  await page.locator('#email').fill('berry@example.test'); await page.locator('#password').fill('SnackTest123!');
  await page.locator('#authSubmit').click(); await page.waitForFunction(() => document.getElementById('authMessage').textContent.includes('Check your email'));
  await page.locator('#loginTab').click(); await page.locator('#forgotPassword').click(); await page.locator('#authSubmit').click();
  await page.waitForFunction(() => document.getElementById('authMessage').textContent.includes('reset link'));
  await page.locator('#backToLogin').click(); await page.locator('#email').fill('mochi@example.test'); await page.locator('#password').fill('incorrect');
  await page.locator('#authSubmit').click(); await page.waitForFunction(() => document.getElementById('authMessage').classList.contains('error'));
  await page.locator('#password').fill('SnackTest123!'); await page.locator('#authSubmit').click();
  await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'lobby');
  await page.screenshot({ path: '.impeccable/review/lobby-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.impeccable/review/lobby-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#settingsOpen').click(); await page.locator('#reducedMotion').check(); await page.locator('#soundEnabled').uncheck();
  await page.locator('#volume').fill('40'); await page.locator('#settingsBack').click();
  await page.reload(); await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'lobby');
  await page.locator('#settingsOpen').click(); assert.equal(await page.locator('#reducedMotion').isChecked(), true);
  assert.equal(await page.locator('#soundEnabled').isChecked(), false); await page.locator('#settingsBack').click();
  await page.locator('#startOpen').click(); await page.screenshot({ path: '.impeccable/review/levels-desktop.png', fullPage: true });
  assert.equal(await page.locator('.level-node.locked').count(), 2);
  await page.locator('#playLevel').click(); await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'game');
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(800); await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space'); await page.keyboard.press('KeyX');
  await page.locator('#pauseGame').click(); assert.equal(await page.locator('#pauseOverlay').isVisible(), true);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: '.impeccable/review/game-landscape.png', fullPage: true });
  await page.locator('#resumeGame').click();
  const touchSession = await context.newCDPSession(page);
  await touchSession.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const touchPoints = await Promise.all(['right', 'jump'].map(async (action, id) => {
    const box = await page.locator(`[data-control="${action}"]`).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, id };
  }));
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints });
  assert.equal(await page.locator('[data-held="true"]').count(), 2);
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  assert.equal(await page.locator('[data-held="true"]').count(), 0);
  // Controlled completion exercises the result -> real SQL -> wallet pipeline, independent of the physics route test.
  failFinish = true;
  await page.evaluate(async () => {
    const { Level1 } = await import('/src/levels/Level1.js'); const { events } = await import('/src/core/Events.js');
    Level1.prototype.update = function() { this.status = 'won'; this.timeLeft = 200; events.emit('levelCompleted', { bonus: 2000 }); };
  });
  await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'results');
  await page.waitForFunction(() => !document.getElementById('retrySave').hidden);
  assert.equal(await page.locator('#coinBalance').textContent(), '0');
  failFinish = false; await page.locator('#retrySave').click();
  await page.waitForFunction(() => document.getElementById('coinBalance').textContent === '100');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '.impeccable/review/results-desktop.png', fullPage: true });
  await page.locator('#resultsPanel [data-home]').click(); await page.locator('#shopOpen').click();
  await page.locator('[data-item="mint"]').click(); await page.locator('#buyItem').click();
  await page.waitForFunction(() => document.getElementById('coinBalance').textContent === '25');
  await page.locator('#equipItem').click(); await page.waitForFunction(() => document.getElementById('equipItem').textContent === 'Equipped');
  await page.screenshot({ path: '.impeccable/review/shop-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: '.impeccable/review/shop-mobile.png', fullPage: true });
  await page.reload(); await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'lobby');
  assert.equal(await page.locator('#coinBalance').textContent(), '25');
  await page.locator('#shopOpen').click(); await page.locator('[data-item="mint"]').click(); assert.equal(await page.locator('#equipItem').textContent(), 'Equipped');
  await page.locator('#settingsOpen').click(); await page.locator('#signOut').click();
  await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'auth');
  await page.goto(`${base}/?recovery=1#access_token=${token(USER_A)}&refresh_token=recovery-fixture&expires_in=3600&token_type=bearer&type=recovery`);
  await page.waitForFunction(() => document.getElementById('authSubmit').textContent.includes('Save new password'));
  await page.locator('#password').fill('NewSnackTest123!'); await page.locator('#authSubmit').click();
  await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'lobby');
  assert.ok(requests.some(path => path.endsWith('/user')));
  const fallback = await context.newPage();
  await fallback.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl2' ? null : get.call(this, type, ...args); }; });
  await fallback.goto(base); await fallback.waitForFunction(() => document.querySelector('#sceneHost').dataset.renderer === 'canvas');
  await fallback.screenshot({ path: '.impeccable/review/fallback.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Browser flow passed: WebGL, responsive screens, signup/recovery/login transport, session restore, real SQL rewards/shop, offline retry, cosmetics persistence, pause, and Canvas fallback.');
} finally { await browser.close(); await db.close(); }
