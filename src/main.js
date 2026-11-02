import { MeadowScene } from './lobby/MeadowScene.js';
import { GameSession } from './game/GameSession.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { AccountService } from './services/AccountService.js';
import { RewardQueue } from './services/RewardQueue.js';
import { CATALOG } from './cosmetics.js';

const $ = id => document.getElementById(id);
const PANELS = { auth: 'authPanel', lobby: 'lobbyPanel', levels: 'levelsPanel', shop: 'shopPanel', settings: 'settingsPanel', results: 'resultsPanel', game: 'gamePanel' };
const safeMessage = error => error?.message || 'Something went wrong. Please try again.';
const ACCESSORY_ICONS = {
  cap: '<g transform="rotate(-14 24 28)"><path d="M12 28c0-16 24-16 24 0Z"/><path d="M12 25.5h24V28H12Z" fill="#6A3818"/><ellipse cx="25" cy="29" rx="19" ry="4.5"/><circle cx="30" cy="25" r="1.8" fill="#FBBF24"/></g>',
  scarf: '<path d="M27 21l-2 18h6l3-18Z" fill="#9E1B1B"/><ellipse cx="24" cy="17" rx="17" ry="6"/><path d="M22 20l-3 21h6l2-21Z"/><circle cx="25" cy="20" r="3.5" fill="#B02020"/><path d="M20 41v3M22 41v3M24 41v3M28 39v3M30 39v3" stroke="#E25555"/>',
  bee_hat: '<ellipse cx="18" cy="11" rx="4" ry="6" transform="rotate(-30 18 11)" fill="#fff"/><ellipse cx="28" cy="11" rx="4" ry="6" transform="rotate(25 28 11)" fill="#fff"/><path d="M11 30l4-16q9-6 18 0l4 16Z"/><path d="M12 26h24l-1-4H13ZM14 19h20l-.7-3H14.7Z" fill="#1C1A17" stroke="none"/><ellipse cx="24" cy="31" rx="19" ry="5"/>',
  frog_hat: '<path d="M11 30l4-14q9-6 18 0l4 14Z"/><circle cx="17" cy="14" r="6"/><circle cx="31" cy="14" r="6"/><circle cx="17.5" cy="14" r="3.4" fill="#171113" stroke="none"/><circle cx="31.5" cy="14" r="3.4" fill="#171113" stroke="none"/><circle cx="18.6" cy="12.6" r="1.1" fill="#fff" stroke="none"/><circle cx="32.6" cy="12.6" r="1.1" fill="#fff" stroke="none"/><ellipse cx="24" cy="31" rx="19" ry="5"/>',
  glasses: '<path d="M4 20l5 4M44 20l-5 4M20.5 24q3.5-3 7 0" fill="none" stroke="#D9A877" stroke-width="2"/><circle cx="14" cy="26" r="7.5" fill="#ffffff70" stroke="var(--swatch)" stroke-width="2.6"/><circle cx="34" cy="26" r="7.5" fill="#ffffff70" stroke="var(--swatch)" stroke-width="2.6"/>'
};

export class App {
  constructor() {
    this.account = new AccountService(); this.queue = new RewardQueue(); this.user = null; this.snapshot = null;
    this.screen = 'auth'; this.authMode = 'login'; this.sessionVersion = 0; this.selectedLevel = '1-1';
    this.sound = new SoundEngine();
    this.scene = new MeadowScene($('sceneHost'));
    this.game = new GameSession($('gameCanvas'), {
      touchRoot: $('touchControls'), onUpdate: value => this.updateGameHUD(value),
      onPause: () => { $('pauseOverlay').hidden = false; this.sound.stop(); },
      onResult: result => { void this.finish(result); }
    });
    this.settings = { sound: true, volume: 70, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem('dinocky:settings') || '{}')); } catch { /* Browser storage may be unavailable. */ }
    this.applySettings(); this.bind(); this.renderShop(); this.show('auth', false);
    if (!this.account.client) {
      $('authSubmit').disabled = true;
      this.authMessage('Accounts are being set up. Please come back soon.', true);
    } else {
      this.authSubscription = this.account.client.auth.onAuthStateChange((event, session) => {
        // Leave the auth callback before calling another Supabase operation.
        setTimeout(() => {
          if (event === 'SIGNED_OUT') this.clearSession();
          else if (event === 'PASSWORD_RECOVERY') { this.recovery = true; this.user = session?.user; this.setAuthMode('reset'); this.show('auth'); }
          else if (event === 'SIGNED_IN' && !this.recovery) void this.acceptSession(session);
        }, 0);
      }).data.subscription;
      void this.initialize();
    }
  }
  async initialize() {
    this.busy(true, 'Finding your adventure…');
    try {
      const session = await this.account.session();
      if (new URLSearchParams(location.search).has('recovery') && session) { this.recovery = true; this.user = session.user; this.setAuthMode('reset'); }
      else if (session) await this.acceptSession(session);
    } catch (error) { this.authMessage(safeMessage(error), true); }
    finally { this.busy(false); }
  }
  async acceptSession(session) {
    if (!session?.user || this.recovery) return;
    if (this.user?.id === session.user.id && (this.snapshot || this.accepting)) return;
    const version = ++this.sessionVersion;
    this.user = session.user; this.account.user = session.user; this.accepting = true;
    try {
      const snapshot = await this.account.snapshot();
      if (version !== this.sessionVersion) return;
      this.setSnapshot(snapshot); this.show('lobby'); await this.syncPending();
    } catch (error) { if (version === this.sessionVersion) { this.show('auth'); this.authMessage(safeMessage(error), true); } }
    finally { if (version === this.sessionVersion) this.accepting = false; }
  }
  clearSession() {
    ++this.sessionVersion; this.accepting = false; this.user = null; this.account.user = null; this.snapshot = null;
    this.game.stop(); this.sound.stop(); this.scene.setCosmetics({}); this.recovery = false;
    $('profileName').hidden = true; $('wallet').hidden = true; this.setAuthMode('login'); this.show('auth');
  }
  getLocalProgress() {
    if (!this.user?.id) return {};
    try { return JSON.parse(localStorage.getItem(`dinocky:progress:${this.user.id}`) || '{}'); }
    catch { return {}; }
  }
  saveLocalProgress(levelId, { score, elapsed, completed }) {
    if (!this.user?.id || !completed) return;
    try {
      const all = this.getLocalProgress();
      const prev = all[levelId] || { clears: 0, best_score: 0, best_time: 999 };
      all[levelId] = {
        clears: (prev.clears || 0) + 1,
        best_score: Math.max(prev.best_score || 0, score),
        best_time: Math.min(prev.best_time || 999, elapsed)
      };
      localStorage.setItem(`dinocky:progress:${this.user.id}`, JSON.stringify(all));
    } catch {}
  }
  setSnapshot(snapshot) {
    this.snapshot = snapshot;
    $('coinBalance').textContent = snapshot.profile.coins;
    $('profileName').textContent = snapshot.profile.display_name;
    $('welcomeLine').textContent = `Welcome back, ${snapshot.profile.display_name}. Ready for a little adventure?`;
    $('profileName').hidden = false; $('wallet').hidden = false;

    const local = this.getLocalProgress();
    const getProg = id => {
      const remote = snapshot.progress?.find(p => p.level_id === id);
      const loc = local[id];
      if (!remote && !loc) return null;
      return {
        clears: Math.max(remote?.clears || 0, loc?.clears || 0),
        best_score: Math.max(remote?.best_score || 0, loc?.best_score || 0),
        best_time: Math.min(remote?.best_time ? Number(remote.best_time) : 999, loc?.best_time ? Number(loc.best_time) : 999)
      };
    };

    const p11 = getProg('1-1');
    const p12 = getProg('1-2');
    const p13 = getProg('1-3');

    $('levelBest').textContent = p11 ? `Best: ${p11.best_score} · ${Number(p11.best_time).toFixed(1)}s · ${p11.clears} clears` : 'Your first adventure starts here';

    // 1-2 Sugarberry Grove unlock: unlocked once 1-1 has >= 1 clear
    const unlocked12 = (p11?.clears || 0) > 0 || (p12?.clears || 0) > 0;
    const btn12 = $('playLevel12');
    if (btn12) {
      btn12.classList.toggle('available', unlocked12);
      btn12.classList.toggle('locked', !unlocked12);
      const small12 = $('levelBest12');
      if (small12) small12.textContent = p12 ? `Best: ${p12.best_score} · ${Number(p12.best_time).toFixed(1)}s · ${p12.clears} clears` : (unlocked12 ? 'Sweet berry branches await' : 'Clear 1–1 to unlock');
      const icon12 = btn12.querySelector('.level-action-icon');
      if (icon12) icon12.innerHTML = unlocked12 ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 3 14 9L7 21Z" fill="currentColor" stroke="none"/></svg>' : '○';
    }

    // 1-3 Cookie Crumble Cove unlock: unlocked once 1-2 has >= 1 clear
    const unlocked13 = (p12?.clears || 0) > 0 || (p13?.clears || 0) > 0;
    const btn13 = $('playLevel13');
    if (btn13) {
      btn13.classList.toggle('available', unlocked13);
      btn13.classList.toggle('locked', !unlocked13);
      const small13 = $('levelBest13');
      if (small13) small13.textContent = p13 ? `Best: ${p13.best_score} · ${Number(p13.best_time).toFixed(1)}s · ${p13.clears} clears` : (unlocked13 ? 'Grand World 1 finale!' : 'Clear 1–2 to unlock');
      const icon13 = btn13.querySelector('.level-action-icon');
      if (icon13) icon13.innerHTML = unlocked13 ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 3 14 9L7 21Z" fill="currentColor" stroke="none"/></svg>' : '○';
    }

    this.scene.setCosmetics(this.equipped());
    if (this.screen === 'shop') this.selectItem(this.selectedItem || 'pink');
  }
  equipped() { return { color: this.snapshot?.profile.equipped_color || 'pink', accessory: this.snapshot?.profile.equipped_accessory || null }; }
  show(screen, focus = true) {
    if (!['auth', 'settings'].includes(screen) && (!this.user || !this.snapshot)) screen = 'auth';
    this.screen = screen; $('app').dataset.screen = screen;
    for (const [name, id] of Object.entries(PANELS)) $(id).hidden = name !== screen;
    $('worldLayout').hidden = screen === 'game';
    if (screen === 'game') this.scene.stop();
    else { this.game.stop(); if (!document.hidden) this.scene.start(); }
    const titles = { lobby: 'Your next snack<br>is out there.', shop: 'A look for<br>every adventure.', levels: 'Oh, the places<br>we’ll snack.' };
    $('sceneTitle').innerHTML = titles[screen] || 'Little dino.<br>Big appetite.';
    $('signOut').hidden = !this.user;
    if (screen !== 'shop') this.scene.setCosmetics(this.equipped());
    this.scene.resize();
    $('app').scrollTop = 0; $('app').scrollLeft = 0; window.scrollTo(0, 0);
    if (focus) (document.querySelector(`#${PANELS[screen]} h2`) || (screen === 'lobby' ? $('startOpen') : null))?.focus({ preventScroll: true });
  }
  bind() {
    $('authForm').addEventListener('submit', e => { e.preventDefault(); void this.submitAuth(); });
    $('loginTab').onclick = () => this.setAuthMode('login'); $('signupTab').onclick = () => this.setAuthMode('signup');
    $('forgotPassword').onclick = () => this.setAuthMode('recover'); $('backToLogin').onclick = () => this.setAuthMode('login');
    $('togglePassword').onclick = () => {
      const show = $('password').type === 'password'; $('password').type = show ? 'text' : 'password';
      $('togglePassword').textContent = show ? 'Hide' : 'Show'; $('togglePassword').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    };
    $('startOpen').onclick = $('levelsOpen').onclick = () => this.show('levels');
    $('shopOpen').onclick = () => { this.show('shop'); this.selectItem(this.equipped().color); };
    document.querySelectorAll('[data-home]').forEach(button => { button.onclick = () => this.show('lobby'); });
    $('playLevel').onclick = () => { this.selectedLevel = '1-1'; void this.startLevel('1-1'); };
    if ($('playLevel12')) {
      $('playLevel12').onclick = () => {
        if ($('playLevel12').classList.contains('available')) {
          this.selectedLevel = '1-2'; void this.startLevel('1-2');
        } else {
          this.toast('Clear Snack Meadow (1–1) to unlock Sugarberry Grove!');
        }
      };
    }
    if ($('playLevel13')) {
      $('playLevel13').onclick = () => {
        if ($('playLevel13').classList.contains('available')) {
          this.selectedLevel = '1-3'; void this.startLevel('1-3');
        } else {
          this.toast('Clear Sugarberry Grove (1–2) to unlock Cookie Crumble Cove!');
        }
      };
    }
    $('replayLevel').onclick = () => { void this.startLevel(this.selectedLevel || '1-1'); };
    if ($('nextLevel')) {
      $('nextLevel').onclick = () => {
        const next = this.selectedLevel === '1-1' ? '1-2' : this.selectedLevel === '1-2' ? '1-3' : '1-1';
        this.selectedLevel = next;
        void this.startLevel(next);
      };
    }
    $('pauseGame').onclick = () => this.game.pause();
    $('resumeGame').onclick = () => { $('pauseOverlay').hidden = true; this.game.resume(); $('gameCanvas').focus(); };
    $('leaveGame').onclick = () => { void this.abandon(); this.show('lobby'); };
    $('settingsOpen').onclick = () => { if (this.screen === 'settings') return; this.settingsReturn = this.screen; if (this.screen === 'game') this.game.pause(); this.show('settings'); };
    $('settingsBack').onclick = () => this.show(this.settingsReturn || (this.user ? 'lobby' : 'auth'));
    $('soundEnabled').onchange = () => { this.settings.sound = $('soundEnabled').checked; this.applySettings(); };
    $('volume').oninput = () => { this.settings.volume = Number($('volume').value); this.applySettings(); };
    $('reducedMotion').onchange = () => { this.settings.reducedMotion = $('reducedMotion').checked; this.applySettings(); };
    $('signOut').onclick = () => { void this.signOut(); };
    $('buyItem').onclick = () => { void this.shopAction('purchase', this.selectedItem); };
    $('equipItem').onclick = () => { void this.shopAction('equip', this.selectedItem); };
    $('removeAccessory').onclick = () => { void this.shopAction('equip', null); };
    $('retrySave').onclick = () => { void this.syncPending(); };
    window.addEventListener('online', () => { void this.syncPending(); this.updateConnection(); if (this.screen === 'shop') this.selectItem(this.selectedItem); });
    window.addEventListener('offline', () => { this.updateConnection(); if (this.screen === 'shop') this.selectItem(this.selectedItem); });
    window.addEventListener('blur', () => { if (this.screen === 'game') this.game.pause(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.scene.stop(); this.game.pause(); this.sound.stop(); }
      else if (this.screen !== 'game') this.scene.start();
    });
    window.addEventListener('pagehide', () => { this.game.stop(); this.scene.stop(); });
    window.addEventListener('pageshow', () => { if (this.screen !== 'game') this.scene.start(); });
    this.updateConnection();
  }
  setAuthMode(mode) {
    this.authMode = mode;
    const signup = mode === 'signup', recover = mode === 'recover', reset = mode === 'reset';
    $('authTitle').innerHTML = signup ? 'Meet your new<br>adventure buddy.' : recover ? 'Lost your<br>snack code?' : reset ? 'A fresh start.' : 'Your adventure<br>starts here.';
    $('authDescription').textContent = signup ? 'A little introduction, then a big adventure.' : recover ? 'We’ll email you a password reset link.' : reset ? 'Choose a new password for your next adventure.' : 'Sign in and let’s find something tasty.';
    $('nameField').hidden = !signup; $('displayName').required = signup;
    $('passwordField').hidden = recover; $('password').required = !recover;
    $('emailField').hidden = reset; $('email').required = !reset;
    $('password').autocomplete = signup || reset ? 'new-password' : 'current-password';
    $('password').value = ''; $('password').type = 'password'; $('togglePassword').textContent = 'Show';
    $('forgotPassword').hidden = signup || recover || reset; $('backToLogin').hidden = !(recover || reset);
    $('authTabs').hidden = recover || reset;
    $('loginTab').classList.toggle('selected', !signup); $('signupTab').classList.toggle('selected', signup);
    $('loginTab').setAttribute('aria-pressed', String(!signup)); $('signupTab').setAttribute('aria-pressed', String(signup));
    $('authSubmit').textContent = signup ? 'Create my account →' : recover ? 'Send reset link →' : reset ? 'Save new password →' : 'Let’s go →';
    this.authMessage('');
  }
  async submitAuth() {
    if (this.authBusy) return;
    this.authBusy = true; $('authSubmit').disabled = true; this.authMessage('One little moment…');
    const email = $('email').value.trim(), password = $('password').value;
    try {
      if (this.authMode === 'signup') {
        const data = await this.account.signup(email, password, $('displayName').value.trim() || 'Snack Explorer');
        if (data.session) await this.acceptSession(data.session);
        else this.authMessage('Check your email to confirm your account, then come back to log in.');
      } else if (this.authMode === 'recover') {
        await this.account.recover(email); this.authMessage('If an account exists for that address, a reset link is on its way.');
      } else if (this.authMode === 'reset') {
        await this.account.changePassword(password); this.recovery = false;
        history.replaceState(null, '', location.pathname); this.snapshot = null;
        const session = await this.account.session(); await this.acceptSession(session); this.toast('Password updated. Welcome back!');
      } else {
        const data = await this.account.login(email, password); await this.acceptSession(data.session);
      }
    } catch (error) { this.authMessage(safeMessage(error), true); }
    finally { this.authBusy = false; $('authSubmit').disabled = !this.account.client; }
  }
  async startLevel(levelId = this.selectedLevel || '1-1') {
    if (this.starting || !this.user) return;
    this.starting = true; this.selectedLevel = levelId; this.busy(true, 'Packing your snacks…');
    const userId = this.user.id;
    try {
      const runId = await this.account.startRun();
      if (this.user?.id !== userId) return;
      $('pauseOverlay').hidden = true; this.show('game');
      const levelTitle = levelId === '1-2' ? 'Sugarberry Grove' : levelId === '1-3' ? 'Cookie Crumble Cove' : 'Snack Meadow';
      this.updateGameHUD({ health: 3, time: 240, score: 0, levelId, levelTitle });
      this.game.start(runId, this.equipped(), levelId); $('gameCanvas').focus();
    } catch (error) { this.toast(navigator.onLine ? safeMessage(error) : 'Connect to the internet to start an adventure.'); }
    finally { this.starting = false; this.busy(false); }
  }
  updateGameHUD(value) {
    $('gameHearts').textContent = '♥'.repeat(value.health) + '♡'.repeat(3 - value.health);
    $('gameHearts').setAttribute('aria-label', `${value.health} of 3 hearts`);
    $('gameTime').textContent = value.time; $('gameScore').textContent = value.score;
    if ($('gameLevelTitle')) $('gameLevelTitle').textContent = value.levelTitle || 'Snack Meadow';
    if ($('gameLevelNumber')) $('gameLevelNumber').textContent = value.levelId || '1–1';
    const meter = $('gamePowerMeter'), bar = $('gamePowerBar');
    if (value.power) {
      $('gamePower').textContent = `${value.power} · ${value.powerTime}s`;
      if (meter && bar) {
        meter.hidden = false;
        bar.style.width = `${Math.min(100, Math.max(0, (value.powerTime / 15) * 100))}%`;
        bar.className = `power-bar power-${value.power.toLowerCase()}`;
      }
    } else {
      $('gamePower').textContent = 'Find a snack!';
      if (meter) meter.hidden = true;
    }
  }
  async finish(result) {
    if (!this.user) return;
    this.saveLocalProgress(result.levelId, result);
    this.lastResult = result; this.queue.add(this.user.id, result);
    $('resultsTitle').textContent = result.completed ? 'Sweet success!' : 'Another little try?';
    $('resultsSubtitle').textContent = result.completed
      ? (result.levelId === '1-3' ? '★ World 1 Champion! All delicious secrets unlocked! ★' : 'That was one delicious adventure.')
      : 'Every great explorer takes a few tumbles.';
    $('resultScore').textContent = result.score;
    const prog = this.getLocalProgress()[result.levelId] || this.snapshot.progress?.find(p => p.level_id === result.levelId);
    $('resultBest').textContent = prog?.best_score ?? result.score;
    $('resultCoins').textContent = result.completed ? 'Saving…' : '0';

    const nextBtn = $('nextLevel');
    if (nextBtn) {
      if (result.completed && (result.levelId === '1-1' || result.levelId === '1-2')) {
        nextBtn.hidden = false;
        nextBtn.textContent = result.levelId === '1-1' ? 'Next: Sugarberry Grove (1–2) →' : 'Next: Cookie Crumble Cove (1–3) →';
      } else {
        nextBtn.hidden = true;
      }
    }

    $('saveStatus').textContent = 'Saving your adventure…'; this.show('results'); await this.syncPending();
  }
  async abandon() {
    if (!this.user || !this.game.runId || this.game.result) return;
    const result = { runId: this.game.runId, score: this.game.score, elapsed: Math.max(0, 240 - this.game.level.timeLeft), completed: false };
    this.game.stop(); this.game.result = result; this.queue.add(this.user.id, result); await this.syncPending();
  }
  async syncPending() {
    if (!this.user || this.syncing) return;
    const userId = this.user.id; this.syncing = true;
    try {
      const receipts = await this.queue.flush(userId, result => this.account.finishRun(result));
      if (this.user?.id !== userId) return;
      for (const receipt of receipts) {
        if (receipt.snapshot) this.setSnapshot(receipt.snapshot);
        if (receipt.runId === this.lastResult?.runId) {
          $('resultCoins').textContent = receipt.rejected ? '0' : `+${receipt.reward}`;
          $('saveStatus').textContent = receipt.rejected ? receipt.rejected : 'All saved. Your next adventure is waiting.';
          $('resultBest').textContent = this.snapshot.progress.find(p => p.level_id === '1-1')?.best_score ?? '—';
        }
      }
      const pending = this.queue.read(userId).length > 0;
      $('retrySave').hidden = !pending;
      if (pending) $('saveStatus').textContent = 'Save pending. Reconnect and retry — your reward will only be added once.';
      this.updateConnection();
    } finally { this.syncing = false; }
  }
  renderShop() {
    const items = $('shopItems');
    for (const item of CATALOG) {
      const button = document.createElement('button'); button.className = 'shop-item'; button.dataset.item = item.id;
      button.style.setProperty('--swatch', item.color); button.setAttribute('aria-pressed', 'false');
      const art = item.kind === 'color' ? '<span class="swatch" aria-hidden="true"></span>' : `<svg viewBox="0 0 48 48" aria-hidden="true">${ACCESSORY_ICONS[item.id]}</svg>`;
      button.innerHTML = `${art}<strong>${item.name}</strong><small>${item.price ? `${item.price} coins` : 'Yours, always'}</small>`;
      button.onclick = () => this.selectItem(item.id); items.append(button);
    }
  }
  selectItem(id) {
    const item = CATALOG.find(value => value.id === id) || CATALOG[0]; this.selectedItem = item.id;
    const equipped = this.equipped(), owned = this.snapshot?.owned.includes(item.id), isEquipped = equipped[item.kind] === item.id;
    this.scene.setCosmetics({ ...equipped, [item.kind]: item.id });
    document.querySelectorAll('[data-item]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.item === item.id)));
    $('itemName').textContent = item.name; $('itemDescription').textContent = item.description;
    $('buyItem').hidden = owned; $('buyItem').textContent = `Buy · ${item.price} coins`;
    $('buyItem').disabled = !navigator.onLine || !this.snapshot || this.snapshot.profile.coins < item.price;
    $('equipItem').hidden = !owned; $('equipItem').disabled = isEquipped || !navigator.onLine; $('equipItem').textContent = isEquipped ? 'Equipped' : 'Equip';
    $('removeAccessory').hidden = !equipped.accessory;
    $('removeAccessory').disabled = !navigator.onLine;
    $('shopMessage').textContent = !navigator.onLine ? 'You can try on looks offline. Reconnect to buy or equip.' : owned ? (isEquipped ? 'This look is ready for your next adventure.' : 'Looking good! Equip it to keep it.') : this.snapshot?.profile.coins < item.price ? 'Finish a level to earn more coins for this look.' : 'Just trying it on. Buy it to make it yours.';
  }
  async shopAction(action, id) {
    if (this.shopping || !this.user) return;
    this.shopping = true; this.busy(true, action === 'purchase' ? 'Wrapping up your new look…' : 'Getting Dinocky dressed…');
    const userId = this.user.id;
    try {
      const snapshot = await this.account[action](id);
      if (userId !== this.user?.id) return;
      this.setSnapshot(snapshot); this.selectItem(this.selectedItem); this.toast(action === 'purchase' ? 'It’s yours! Select Equip to wear it.' : 'Ready for an adventure.');
    } catch (error) { $('shopMessage').textContent = safeMessage(error); }
    finally { this.shopping = false; this.busy(false); }
  }
  async signOut() {
    this.busy(true, 'See you next snack time…');
    try { await this.abandon(); await this.account.logout(); this.clearSession(); }
    catch (error) { this.toast(safeMessage(error)); }
    finally { this.busy(false); }
  }
  applySettings() {
    this.settings.volume = Math.max(0, Math.min(100, Number(this.settings.volume) || 0));
    $('soundEnabled').checked = Boolean(this.settings.sound); $('volume').value = this.settings.volume;
    $('volumeLabel').textContent = `${this.settings.volume}%`; $('reducedMotion').checked = Boolean(this.settings.reducedMotion);
    this.sound.setMuted(!this.settings.sound); this.sound.setVolume(this.settings.volume / 100); this.scene.setReducedMotion(Boolean(this.settings.reducedMotion));
    try { localStorage.setItem('dinocky:settings', JSON.stringify(this.settings)); } catch { /* Settings still work for this visit. */ }
  }
  authMessage(message, error = false) { $('authMessage').textContent = message; $('authMessage').classList.toggle('error', error); }
  busy(value, message = '') { $('loading').hidden = !value; $('loadingText').textContent = message; }
  toast(message) { clearTimeout(this.toastTimer); $('toast').textContent = message; $('toast').hidden = false; this.toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500); }
  updateConnection() { $('connectionStatus').textContent = !navigator.onLine ? 'Offline · your meadow will wait' : this.user && this.queue.read(this.user.id).length ? 'Adventure save pending' : this.user ? 'Your adventure, saved with you' : 'Made for little adventures'; }
  dispose() { this.game.dispose(); this.scene.dispose(); this.sound.dispose(); this.authSubscription?.unsubscribe(); }
}

new App();
