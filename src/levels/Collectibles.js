import { events } from '../core/Events.js';

/**
 * StarTreat - Golden star snack collectible that gives bonus points.
 */
export class StarTreat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 26;
    this.h = 26;
    this.timer = Math.random() * 10;
    this.isCollected = false;
  }

  update(dt) {
    this.timer += dt;
  }

  render(ctx) {
    if (this.isCollected) return;
    ctx.save();
    const bob = Math.sin(this.timer * 4.5) * 4;
    ctx.translate(this.x, this.y + bob);

    // Glow aura
    const pulse = 1 + Math.sin(this.timer * 6) * 0.08;
    ctx.beginPath();
    ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 190, 72, 0.28)';
    ctx.fill();

    // 5-pointed golden star
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = 11 * pulse;
      const method = i === 0 ? 'moveTo' : 'lineTo';
      ctx[method](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#F59E0B';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FEF08A';
    ctx.stroke();

    // Little glossy shine
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-2, -3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * JellyBouncePad - Springy strawberry jelly pad that bounces Dinocky high into the sky!
 */
export class JellyBouncePad {
  constructor(x, y, w = 48, h = 18) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.squish = 0;
    this.timer = Math.random() * 5;
  }

  bounce() {
    this.squish = 1.0;
  }

  update(dt) {
    this.timer += dt;
    if (this.squish > 0) {
      this.squish = Math.max(0, this.squish - dt * 5.0);
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h);
    const squishScaleY = 1 - this.squish * 0.45;
    const squishScaleX = 1 + this.squish * 0.35;
    ctx.scale(squishScaleX, squishScaleY);

    // Jelly body
    ctx.beginPath();
    ctx.ellipse(0, -this.h / 2, this.w / 2, this.h, 0, Math.PI, 0);
    ctx.fillStyle = '#EC4899';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#BE185D';
    ctx.stroke();

    // Frosting highlight on top
    ctx.beginPath();
    ctx.ellipse(0, -this.h + 2.5, this.w * 0.38, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FDF2F8';
    ctx.fill();

    // Little sugar dots
    ctx.fillStyle = '#FBCFE8';
    ctx.beginPath();
    ctx.arc(-9, -this.h / 2, 2.5, 0, Math.PI * 2);
    ctx.arc(9, -this.h / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

