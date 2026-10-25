/**
 * Enemy.js - Base Enemy Class & Sample Edible Enemies.
 * 
 * Part of the Codex API Contract:
 * - Any enemy with `isEdible = true` can be eaten whole by Dinocky
 * - Provides patrol physics, damage hitboxes, and edible states
 */
export class Enemy {
  constructor(x, y, w = 32, h = 32) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = -40;
    this.vy = 0;
    this.isAlive = true;
    this.isEaten = false;
    this.isEdible = true; // Dinocky can eat this enemy!
    this.timer = Math.random() * 5;
  }

  update(dt, obstacles = []) {
    if (!this.isAlive) return;

    this.timer += dt;

    // Simple patrol back and forth
    this.x += this.vx * dt;

    // Check collision with obstacles to reverse patrol direction
    for (const obs of obstacles) {
      if (
        this.x < obs.x + obs.w &&
        this.x + this.w > obs.x &&
        this.y < obs.y + obs.h &&
        this.y + this.h > obs.y
      ) {
        if (this.vx > 0) {
          this.x = obs.x - this.w;
          this.vx = -Math.abs(this.vx);
        } else {
          this.x = obs.x + obs.w;
          this.vx = Math.abs(this.vx);
        }
        break;
      }
    }
  }

  render(ctx) {
    // Base implementation - overridden by subclasses
  }
}

/**
 * Grumpy Broccoli: A crunchy edible vegetable enemy!
 */
export class BroccoliEnemy extends Enemy {
  constructor(x, y) {
    super(x, y, 32, 38);
    this.name = 'Grumpy Broccoli';
    this.vx = -45;
  }

  render(ctx) {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h);
    const facing = this.vx > 0 ? 1 : -1;
    ctx.scale(facing, 1);

    const bob = Math.abs(Math.sin(this.timer * 8)) * 3;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();

    // Stem
    ctx.fillStyle = '#A3E635';
    ctx.fillRect(-6, -20 - bob, 12, 18);

    // Broccoli Florette Top (puffy green clouds)
    ctx.fillStyle = '#15803D';
    const florets = [
      { x: -10, y: -24, r: 9 },
      { x: 0, y: -30, r: 11 },
      { x: 10, y: -24, r: 9 },
      { x: -4, y: -20, r: 8 },
      { x: 4, y: -20, r: 8 }
    ];
    for (const f of florets) {
      ctx.beginPath();
      ctx.arc(f.x, f.y - bob, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grumpy Face
    ctx.fillStyle = '#052E16';
    // Angled angry eyes
    ctx.beginPath();
    ctx.arc(3, -15 - bob, 2, 0, Math.PI * 2);
    ctx.arc(9, -15 - bob, 2, 0, Math.PI * 2);
    ctx.fill();

    // Angry brow
    ctx.beginPath();
    ctx.moveTo(1, -19 - bob);
    ctx.lineTo(11, -17 - bob);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#052E16';
    ctx.stroke();

    // Grumpy mouth
    ctx.beginPath();
    ctx.arc(6, -10 - bob, 3, Math.PI, 0);
    ctx.stroke();

    ctx.restore();
  }
}
