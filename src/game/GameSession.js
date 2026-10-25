import { Engine } from '../core/Engine.js';
import { Input } from '../core/Input.js';
import { events } from '../core/Events.js';
import { Player } from '../character/Player.js';
import { Physics } from '../physics/Physics.js';
import { Level1 } from '../levels/Level1.js';
import { normalizeCosmetics } from '../cosmetics.js';

export class GameSession {
  constructor(canvas, { onUpdate, onResult, onPause, touchRoot } = {}) {
    this.canvas = canvas; this.callbacks = { onUpdate, onResult, onPause }; this.running = false;
    this.input = new Input(window, { enabled: false }); if (touchRoot) this.input.bindTouch(touchRoot);
    this.physics = new Physics();
    this.engine = new Engine(canvas, dt => this.update(dt), ctx => this.render(ctx));
    this.unsubscribers = [
      events.on('enemyEaten', data => { if (this.running) { this.score += data.points; this.eaten++; this.level.addPopup(data.pos.x, data.pos.y, `+${data.points}`, '#9F3254'); } }),
      events.on('enemyDefeated', data => { if (this.running) this.score += data.points; }),
      events.on('bonusEnergy', data => { if (this.running && this.player.powerManager.activePower === 'PIZZA') this.player.powerManager.powerTimer = Math.min(15, this.player.powerManager.powerTimer + data.amount / 10); }),
      events.on('levelCompleted', data => { if (this.running) this.score += data.bonus; })
    ];
  }
  start(runId, cosmetics) {
    this.stop(); this.runId = runId; this.level = new Level1(); this.player = new Player(80, 480);
    this.score = 0; this.eaten = 0; this.result = null; this.applyCosmetics(cosmetics); this.resume();
  }
  applyCosmetics(value) { this.cosmetics = normalizeCosmetics(value); if (this.player) this.player.model.cosmetics = this.cosmetics; }
  pause() { if (!this.running) return; this.running = false; this.engine.stop(); this.input.setEnabled(false); this.callbacks.onPause?.(); }
  resume() { if (!this.level || this.result) return; this.running = true; this.input.setEnabled(true); this.engine.start(); }
  stop() { this.running = false; this.engine.stop(); this.input.setEnabled(false); }
  update(dt) {
    if (!this.running) return;
    if (this.input.justPressed.has('KeyP')) { this.pause(); return; }
    const grounded = this.player.isGrounded, chomping = this.player.isChomping;
    this.level.beforeUpdate(this.player, this.input);
    this.physics.update(this.player, this.input, this.level.obstacles, this.level.oneWayPlatforms, dt);
    this.player.update(dt, this.input, this.level.enemies);
    if (grounded && !this.player.isGrounded && this.player.vy < 0) events.emit('jump', {});
    if (!chomping && this.player.isChomping) events.emit('chomp', {});
    this.level.update(dt, this.player); this.input.update();
    this.callbacks.onUpdate?.({ score: this.score, health: this.level.health, time: Math.ceil(this.level.timeLeft), power: this.player.powerManager.activePower, powerTime: Math.ceil(this.player.powerManager.powerTimer) });
    if (['won', 'lost'].includes(this.level.status)) {
      this.result = { runId: this.runId, levelId: '1-1', score: this.score,
        elapsed: Math.round((240 - this.level.timeLeft) * 1000) / 1000, completed: this.level.status === 'won' };
      this.stop(); this.callbacks.onResult?.(this.result);
    }
  }
  render(ctx) {
    if (!this.level) return;
    ctx.clearRect(0, 0, 960, 540); this.level.render(ctx); ctx.save(); ctx.translate(-this.level.cameraX, 0);
    if (!this.level.invulnerable || Math.floor(this.level.invulnerable * 12) % 2 === 0) this.player.render(ctx);
    ctx.restore();
  }
  dispose() { this.stop(); this.input.dispose(); this.unsubscribers.forEach(off => off()); }
}
