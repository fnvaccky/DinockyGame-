/**
 * Hazards.js - Moving platforms, crumbling wafers and pop-up spikes.
 *
 * Moving and crumbling platforms are one-way platforms, so Physics lands on them like any shelf;
 * BaseLevel carries the rider and removes crumbled wafers until they regrow.
 */

/** A one-way platform easing back and forth between its start and start + (dx, dy). */
export class MovingPlatform {
  constructor({ x, y, w, dx = 0, dy = 0, period = 4, phase = 0 }) {
    Object.assign(this, { baseX: x, baseY: y, x, y, w, h: 14, dx, dy, period, moving: true });
    this.t = phase * period;
  }

  /** Advances the platform and returns how far it moved this frame. */
  update(dt) {
    this.t += dt;
    const s = (1 - Math.cos((Math.PI * 2 * this.t) / this.period)) / 2;
    const x = this.baseX + this.dx * s, y = this.baseY + this.dy * s;
    const moved = { x: x - this.x, y: y - this.y };
    this.x = x; this.y = y;
    return moved;
  }

  render(ctx, theme) {
    ctx.save();
    ctx.fillStyle = theme === 'grove' ? '#A21CAF' : theme === 'cove' ? '#92400E' : '#0F766E';
    ctx.fillRect(this.x, this.y, this.w, 6);
    ctx.fillStyle = theme === 'grove' ? '#F0ABFC' : theme === 'cove' ? '#FCD34D' : '#5EEAD4';
    ctx.fillRect(this.x, this.y + 6, this.w, this.h - 6);
    // Arrows hint at the direction of travel.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(this.dy ? '▲ ▼' : '◀ ▶', this.x + this.w / 2, this.y + 13);
    ctx.restore();
  }
}

/** A wafer that shakes when stood on, crumbles, then regrows. */
export class CrumblePlatform {
  constructor(x, y, w, { delay = 0.55, regrow = 3 } = {}) {
    Object.assign(this, { x, y, w, h: 14, delay, regrow, state: 'solid', timer: 0, crumble: true });
  }

  /** Returns true when the platform is solid this frame. */
  update(dt, standing) {
    if (this.state === 'solid' && standing) { this.state = 'shaking'; this.timer = this.delay; }
    else if (this.state !== 'solid') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'shaking') { this.state = 'gone'; this.timer = this.regrow; }
        else this.state = 'solid';
      }
    }
    return this.state !== 'gone';
  }

  render(ctx) {
    ctx.save();
    if (this.state === 'gone') {
      ctx.strokeStyle = 'rgba(146, 64, 14, 0.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y, this.w, this.h);
      ctx.restore();
      return;
    }
    const shake = this.state === 'shaking' ? (Math.random() - 0.5) * 4 : 0;
    ctx.translate(shake, 0);
    ctx.fillStyle = '#F5D08A'; ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = '#B7791F'; ctx.lineWidth = 1.5;
    // Wafer grid with cracks that widen while it shakes.
    for (let gx = this.x + 10; gx < this.x + this.w; gx += 14) {
      ctx.beginPath(); ctx.moveTo(gx, this.y); ctx.lineTo(gx, this.y + this.h); ctx.stroke();
    }
    if (this.state === 'shaking') {
      ctx.strokeStyle = '#7C2D12'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.x + this.w * 0.3, this.y); ctx.lineTo(this.x + this.w * 0.4, this.y + 7);
      ctx.lineTo(this.x + this.w * 0.33, this.y + this.h); ctx.moveTo(this.x + this.w * 0.7, this.y);
      ctx.lineTo(this.x + this.w * 0.62, this.y + this.h); ctx.stroke();
    }
    ctx.restore();
  }
}

/** Floor spikes that pop up on a rhythm; they flicker as a warning before rising. */
export function popSpikes(x, floorY, w, { period = 2.6, up = 1.1, offset = 0 } = {}) {
  return { x, y: floorY - 16, w, h: 16, cycle: { period, up, offset }, active: false, warning: false };
}

export function updatePopSpikes(hazard, time) {
  const { period, up, offset } = hazard.cycle;
  const t = (time + offset) % period;
  hazard.active = t < up;
  hazard.warning = !hazard.active && t > period - 0.55;
}
