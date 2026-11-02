/**
 * PigBoss.js - Sir Oinksalot, the giant pig at the end of World 1.
 *
 * Loop: wind up, charge into an arena wall, get dizzy. While dizzy he is harmless and
 * Dinocky can chomp (or Burger-stomp) him. Each hit adds a move:
 *   3 HP  charge
 *   2 HP  + belly-flop leap that sends shockwaves along the floor
 *   1 HP  + apples raining down during the wind-up, and everything is faster
 */
import { events } from '../core/Events.js';

const FLOOR = 480, GRAVITY = 1400;

export class PigBoss {
  constructor({ left, right, hard = false }) {
    this.name = 'Sir Oinksalot';
    this.isBoss = true;
    // Short enough (top at y 404) that Dinocky on an 80px ledge stays above the charge.
    this.w = 150; this.h = 76;
    this.left = left; this.right = right;
    this.x = right - 260; this.y = FLOOR - this.h;
    this.vx = 0; this.vy = 0; this.dir = -1;
    this.maxHp = hard ? 4 : 3; this.hp = this.maxHp;
    this.speedScale = hard ? 1.2 : 1;
    this.isAlive = true; this.isEaten = false;
    this.state = 'sleep'; this.stateTime = 0; this.timer = 0; this.moves = 0;
    this.appleTimer = 0;
  }

  // Dizzy (and only dizzy) pigs can be chomped; otherwise touching him hurts.
  get isEdible() { return this.state === 'dizzy'; }
  get harmless() { return ['sleep', 'dizzy', 'hurt', 'defeated'].includes(this.state); }
  get speed() { return (this.hp >= 3 ? 360 : this.hp === 2 ? 420 : 480) * this.speedScale; }

  wake(level) {
    if (this.state !== 'sleep') return;
    this.level = level;
    this.go('intro');
    level.addPopup(this.x + this.w / 2, this.y - 30, 'OINK!!', '#BE185D');
    level.triggerShake(9, 0.6);
    events.emit('bossAwake', {});
  }

  go(state) { this.state = state; this.stateTime = 0; }

  think(dt, player, level) {
    this.level = level;
    this.timer += dt; this.stateTime += dt;
    const center = this.x + this.w / 2;
    const toPlayer = player.x < center ? -1 : 1;
    switch (this.state) {
      case 'intro': if (this.stateTime > 1.2) this.go('idle'); break;
      case 'idle':
        this.vx = 0; this.dir = toPlayer;
        if (this.stateTime > 0.7 / this.speedScale) {
          this.moves++;
          // From 2 HP on, every other attack is a leap instead of a charge.
          this.go(this.hp <= 2 && this.moves % 2 === 0 ? 'leap' : 'windup');
          if (this.state === 'leap') this.startLeap(player);
        }
        break;
      case 'windup':
        this.dir = toPlayer;
        if (this.hp === 1) {
          this.appleTimer -= dt;
          if (this.appleTimer <= 0) {
            this.appleTimer = 0.3;
            const x = this.left + 40 + Math.random() * (this.right - this.left - 80);
            level.spawnProjectile({ x, y: -20, vx: 0, vy: 60, gravity: 700, r: 11, kind: 'apple', life: 3 });
          }
        }
        if (this.stateTime > (this.hp === 1 ? 1.5 : 0.9) / this.speedScale) { this.go('charge'); this.vx = this.dir * this.speed; }
        break;
      case 'charge':
        if (this.x <= this.left || this.x + this.w >= this.right) {
          this.x = Math.max(this.left, Math.min(this.right - this.w, this.x));
          this.vx = 0; this.go('dizzy');
          level.triggerShake(10, 0.4);
          level.addPopup(center, this.y - 20, 'BONK!', '#F59E0B');
          level.addBurst(this.dir > 0 ? this.right : this.left, FLOOR - 50, 14, ['#FDE68A', '#F59E0B', '#FFFFFF'], 'sparkle');
        }
        break;
      case 'dizzy':
        if (this.stateTime > 2.6) this.go('idle');
        break;
      case 'hurt':
        // Scoot back toward the middle of the arena.
        this.vx = ((this.left + this.right) / 2 - center) * 2.2;
        if (this.stateTime > 1.1) { this.vx = 0; this.go(this.hp > 0 ? 'idle' : 'defeated'); }
        break;
      case 'defeated':
        this.vx = 0;
        if (this.stateTime > 1.4 && this.isAlive) { this.isAlive = false; level.onBossDefeated?.(this); }
        break;
    }
  }

  startLeap(player) {
    this.dir = player.x < this.x + this.w / 2 ? -1 : 1;
    const flight = 2 * 720 / GRAVITY;
    const target = Math.max(this.left, Math.min(this.right - this.w, player.x - this.w / 2));
    this.vy = -720; this.vx = (target - this.x) / flight;
  }

  update(dt) {
    if (!this.isAlive) return;
    this.x += this.vx * dt;
    if (this.state === 'leap') {
      this.vy += GRAVITY * dt; this.y += this.vy * dt;
      if (this.y >= FLOOR - this.h) {
        this.y = FLOOR - this.h; this.vy = 0; this.vx = 0;
        const level = this.level;
        if (level) {
          level.triggerShake(12, 0.4);
          level.addBurst(this.x + this.w / 2, FLOOR, 18, ['#A16207', '#CA8A04', '#FDE68A'], 'crumb');
          for (const vx of [-300, 300]) {
            level.spawnProjectile({ x: this.x + this.w / 2 + Math.sign(vx) * 80, y: FLOOR - 12, vx: vx * this.speedScale, vy: 0, gravity: 0, r: 12, kind: 'shock', life: 2.6 });
          }
        }
        this.go('idle');
      }
    }
    this.x = Math.max(this.left, Math.min(this.right - this.w, this.x));
  }

  /** A chomp or Burger stomp while dizzy; returns the points scored, or 0 if it didn't land. */
  takeHit() {
    if (this.state !== 'dizzy') return 0;
    this.hp--;
    this.go('hurt');
    this.level?.triggerShake(8, 0.3);
    this.level?.addPopup(this.x + this.w / 2, this.y - 24, this.hp > 0 ? 'SQUEAL!' : 'OINK... oof', '#BE185D');
    events.emit('bossHit', { hp: this.hp });
    return this.hp > 0 ? 500 : 2000;
  }

  onChomp() { return this.takeHit(); }

  render(ctx) {
    if (!this.isAlive && this.state !== 'defeated') return;
    const { x, y, w, h } = this;
    ctx.save();
    // Shadow stays on the floor, shrinking while he is in the air.
    const lift = Math.max(0, FLOOR - (y + h));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath(); ctx.ellipse(x + w / 2, FLOOR, w * 0.5 * (1 - Math.min(0.5, lift / 400)), 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x + w / 2, y + h);
    if (this.state === 'defeated') ctx.rotate(-this.dir * Math.min(1.4, this.stateTime * 2));
    if (this.state === 'windup') ctx.translate((Math.random() - 0.5) * 4, 0);
    if (this.state === 'hurt' && Math.floor(this.stateTime * 14) % 2) ctx.globalAlpha = 0.45;
    ctx.scale(this.dir * 0.85, 0.85);
    const bob = this.state === 'charge' ? Math.abs(Math.sin(this.timer * 18)) * 4 : Math.sin(this.timer * 3) * 1.5;
    const pink = '#F9A8C9', dark = '#E879A6', blush = this.state === 'windup' || this.state === 'charge' ? '#F43F5E' : '#FB7185';

    // Legs
    ctx.fillStyle = dark;
    const step = this.state === 'charge' ? Math.sin(this.timer * 22) * 8 : 0;
    for (const [lx, s] of [[-48, 1], [-24, -1], [26, 1], [48, -1]]) ctx.fillRect(lx - 8 + step * s, -26, 16, 26);
    ctx.fillStyle = '#7F1D1D';
    for (const [lx, s] of [[-48, 1], [-24, -1], [26, 1], [48, -1]]) ctx.fillRect(lx - 8 + step * s, -6, 16, 6);

    // Curly tail
    ctx.strokeStyle = dark; ctx.lineWidth = 5;
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 3; t += 0.2) {
      const r = 3 + t * 1.6, px = -78 - Math.cos(t) * r * 0.6, py = -64 - bob + Math.sin(t) * r * 0.6;
      if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Body
    ctx.fillStyle = pink;
    ctx.beginPath(); ctx.ellipse(-6, -50 - bob, 72, 42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath(); ctx.ellipse(-16, -70 - bob, 40, 12, -0.1, 0, Math.PI * 2); ctx.fill();

    // Head
    ctx.fillStyle = pink;
    ctx.beginPath(); ctx.arc(50, -60 - bob, 34, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(30, -84 - bob); ctx.lineTo(36, -110 - bob); ctx.lineTo(52, -90 - bob); ctx.fill();
    ctx.beginPath(); ctx.moveTo(56, -92 - bob); ctx.lineTo(70, -112 - bob); ctx.lineTo(76, -84 - bob); ctx.fill();
    // Crown: he is the boss, after all
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath(); ctx.moveTo(36, -90 - bob); ctx.lineTo(38, -108 - bob); ctx.lineTo(46, -98 - bob); ctx.lineTo(54, -112 - bob);
    ctx.lineTo(62, -98 - bob); ctx.lineTo(70, -108 - bob); ctx.lineTo(70, -90 - bob); ctx.closePath(); ctx.fill();
    // Cheek and snout
    ctx.fillStyle = blush;
    ctx.beginPath(); ctx.arc(42, -48 - bob, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(80, -54 - bob, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9D174D';
    ctx.beginPath(); ctx.ellipse(82, -59 - bob, 3, 4.5, 0, 0, Math.PI * 2); ctx.ellipse(82, -48 - bob, 3, 4.5, 0, 0, Math.PI * 2); ctx.fill();

    // Eyes: angry brows, or dizzy spirals and orbiting stars
    if (this.state === 'dizzy' || this.state === 'defeated') {
      ctx.strokeStyle = '#3B0764'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 4; t += 0.3) {
        const r = t * 0.75, px = 58 + Math.cos(t + this.timer * 8) * r, py = -70 - bob + Math.sin(t + this.timer * 8) * r;
        if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      if (this.state === 'dizzy') {
        ctx.fillStyle = '#FDE047';
        for (let i = 0; i < 3; i++) {
          const a = this.timer * 4 + (i * Math.PI * 2) / 3;
          ctx.beginPath(); ctx.arc(46 + Math.cos(a) * 30, -116 - bob + Math.sin(a) * 8, 5, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else {
      ctx.fillStyle = '#1F2937';
      ctx.beginPath(); ctx.arc(60, -70 - bob, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(61.5, -71.5 - bob, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1F2937'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(48, -84 - bob); ctx.lineTo(68, -76 - bob); ctx.stroke();
    }
    // Steam puffs while winding up
    if (this.state === 'windup') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      const puff = (this.stateTime * 3) % 1;
      for (const dy of [-60, -48]) { ctx.beginPath(); ctx.arc(96 + puff * 20, dy - bob - puff * 8, 4 + puff * 5, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
}
