/**
 * ThrillEnemies.js - Enemies that react to Dinocky.
 *
 * BaseLevel calls `think(dt, player, level)` before the usual `update`, so these
 * enemies can spot the player, wind up, dash, throw and dive. `speedScale` is raised in Hard Mode.
 */
import { BroccoliEnemy } from './Enemy.js';
import { AngryCarrot } from './VeggieEnemies.js';

const sign = value => (value < 0 ? -1 : 1);

/** Spots Dinocky ahead, shakes for a moment, then dashes to the end of its patrol. */
export class ChargerCarrot extends AngryCarrot {
  constructor(x, y) {
    super(x, y);
    this.name = 'Charging Carrot';
    this.vx = -55; this.walkSpeed = 55; this.dashSpeed = 340;
    this.state = 'patrol'; this.stateTime = 0; this.dir = -1; this.speedScale = 1;
  }

  think(dt, player, level) {
    this.stateTime += dt;
    const dx = player.x - (this.x + this.w / 2), dy = player.y - (this.y + this.h);
    if (this.state === 'patrol') {
      if (Math.abs(dx) < 280 && Math.abs(dy) < 70 && sign(dx) === sign(this.vx)) {
        this.state = 'windup'; this.stateTime = 0; this.dir = sign(dx); this.vx = 0;
        level?.addPopup(this.x + this.w / 2, this.y - 16, '!', '#DC2626');
      }
    } else if (this.state === 'windup') {
      if (this.stateTime > 0.5 / this.speedScale) { this.state = 'dash'; this.stateTime = 0; this.vx = this.dir * this.dashSpeed * this.speedScale; }
    } else if (this.state === 'dash') {
      const atEdge = this.x <= this.patrolLeft + 1 || this.x + this.w >= this.patrolRight - 1;
      if (this.stateTime > 1.2 || (this.stateTime > 0.1 && atEdge)) { this.state = 'rest'; this.stateTime = 0; this.vx = 0; }
    } else if (this.stateTime > 0.9 / this.speedScale) {
      this.state = 'patrol'; this.stateTime = 0; this.vx = -this.dir * this.walkSpeed * this.speedScale;
    }
  }

  render(ctx) {
    if (!this.isAlive) return;
    ctx.save();
    if (this.state === 'windup') ctx.translate((Math.random() - 0.5) * 3, 0);
    super.render(ctx);
    // Red sweatband marks the chargers apart from plain carrots.
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(this.x + 2, this.y + 6, this.w - 4, 4);
    if (this.state === 'dash') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 2;
      const back = this.dir > 0 ? this.x - 4 : this.x + this.w + 4;
      for (const y of [10, 20, 30]) {
        ctx.beginPath(); ctx.moveTo(back, this.y + y); ctx.lineTo(back - this.dir * 16, this.y + y); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

/** Waddles slowly and lobs florets in an arc at where Dinocky is standing. */
export class BroccoliLobber extends BroccoliEnemy {
  constructor(x, y) {
    super(x, y);
    this.name = 'Broccoli Lobber';
    this.vx = -28; this.speedScale = 1;
    this.cooldown = 1.2 + (x % 7) / 10; this.throwAnim = 0;
  }

  think(dt, player, level) {
    this.cooldown -= dt; this.throwAnim = Math.max(0, this.throwAnim - dt);
    const sx = this.x + this.w / 2, sy = this.y - 8;
    const dx = player.x - sx;
    if (this.cooldown > 0 || Math.abs(dx) > 520 || Math.abs(dx) < 30) return;
    this.cooldown = 2.4 / this.speedScale; this.throwAnim = 0.3;
    this.vx = sign(dx) * Math.abs(this.vx);
    const flight = 1.0, gravity = 900;
    const vx = Math.max(-520, Math.min(520, dx / flight));
    const vy = (player.y - 24 - sy - 0.5 * gravity * flight * flight) / flight;
    level?.spawnProjectile({ x: sx, y: sy, vx, vy, gravity, r: 9, kind: 'floret', life: 3 });
  }

  render(ctx) {
    super.render(ctx);
    if (!this.isAlive || this.cooldown > 0.5) return;
    // A floret held overhead warns that a throw is coming.
    ctx.fillStyle = '#16A34A';
    ctx.beginPath(); ctx.arc(this.x + this.w / 2, this.y - 14, 7, 0, Math.PI * 2); ctx.fill();
  }
}

/** Hovers over its patrol and swoops down at Dinocky, then climbs back up. */
export class SwoopBee {
  constructor(x, y) {
    Object.assign(this, { x, y, w: 30, h: 26, baseY: y, vx: -70, vy: 0, isAlive: true, isEaten: false,
      isEdible: true, isFlying: true, name: 'Swoop Bee', state: 'hover', cooldown: 1, timer: x % 5, speedScale: 1 });
  }

  think(dt, player) {
    this.cooldown -= dt;
    if (this.state !== 'hover' || this.cooldown > 0) return;
    const dx = player.x - (this.x + this.w / 2), dy = player.y - 26 - (this.y + this.h / 2);
    if (Math.abs(dx) < 170 && dy > 40 && dy < 360) {
      const time = 0.75 / this.speedScale;
      this.state = 'dive'; this.vx = dx / time; this.vy = dy / time;
      this.targetY = this.y + dy;
    }
  }

  update(dt) {
    if (!this.isAlive) return;
    this.timer += dt;
    this.x += this.vx * dt;
    if (this.state === 'hover') this.y = this.baseY + Math.sin(this.timer * 3) * 10;
    else if (this.state === 'dive') {
      this.y += this.vy * dt;
      if (this.y >= this.targetY) { this.state = 'rise'; this.vx = sign(this.vx) * 40; }
    } else {
      this.y -= 150 * this.speedScale * dt;
      if (this.y <= this.baseY) { this.y = this.baseY; this.state = 'hover'; this.cooldown = 1.6 / this.speedScale; this.vx = sign(this.vx) * 70 * this.speedScale; }
    }
  }

  render(ctx) {
    if (!this.isAlive) return;
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.scale(this.vx > 0 ? 1 : -1, 1);
    if (this.state === 'dive') ctx.rotate(0.5);
    // Wings flap above the striped body.
    const flap = Math.sin(this.timer * 40) * 0.5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 1;
    for (const x of [-4, 3]) {
      ctx.beginPath(); ctx.ellipse(x, -11, 6, 9, -0.4 + flap, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#FACC15';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1C1917';
    for (const x of [-6, 1]) ctx.fillRect(x, -10, 4, 20);
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-21, 2); ctx.lineTo(-14, 4); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -3, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1C1917'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(6, -8); ctx.lineTo(12, -6); ctx.stroke();
    ctx.restore();
  }
}
