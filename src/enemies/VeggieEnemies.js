import { Enemy } from './Enemy.js';

/** Patrol within a safe stretch of ground or a platform, never over a ledge. */
export function setPatrol(enemy, left, right) {
  enemy.patrolLeft = left;
  enemy.patrolRight = right;
  return enemy;
}

class PatrolEnemy extends Enemy {
  update(dt, obstacles = []) {
    super.update(dt, obstacles);
    if (!this.isAlive) return;
    if (this.x < this.patrolLeft) {
      this.x = this.patrolLeft;
      this.vx = Math.abs(this.vx);
    } else if (this.x + this.w > this.patrolRight) {
      this.x = this.patrolRight - this.w;
      this.vx = -Math.abs(this.vx);
    }
  }

  face(ctx, y) {
    ctx.fillStyle = '#431407';
    ctx.fillRect(-7, y, 3, 4);
    ctx.fillRect(4, y, 3, 4);
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, y - 4); ctx.lineTo(-3, y - 2);
    ctx.moveTo(9, y - 4); ctx.lineTo(3, y - 2);
    ctx.moveTo(-3, y + 9); ctx.lineTo(3, y + 9);
    ctx.stroke();
  }
}

export class AngryCarrot extends PatrolEnemy {
  constructor(x, y) {
    super(x, y, 28, 36);
    this.name = 'Angry Carrot';
    this.isEdible = true;
    this.vx = -72;
    this.patrolLeft = x - 100;
    this.patrolRight = x + 128;
  }

  render(ctx) {
    if (!this.isAlive) return;
    ctx.save();
    ctx.translate(this.x + 14, this.y + 18);
    ctx.rotate(Math.sin(this.timer * 12) * 0.08);
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(-13, -11); ctx.quadraticCurveTo(0, -19, 13, -11);
    ctx.quadraticCurveTo(12, 4, 0, 18);
    ctx.quadraticCurveTo(-12, 4, -13, -11); ctx.fill();
    ctx.strokeStyle = '#15803D'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(-6, -20);
    ctx.moveTo(0, -13); ctx.lineTo(3, -23);
    ctx.moveTo(0, -13); ctx.lineTo(9, -19); ctx.stroke();
    this.face(ctx, -7);
    ctx.restore();
  }
}

/** A hopping wrapped candy; its collision body follows the visible hop. */
export class CandyEnemy extends PatrolEnemy {
  constructor(x, y) {
    super(x, y, 32, 30);
    this.name = 'Sour Candy';
    this.isEdible = true;
    this.baseY = y;
    this.vx = -55;
    this.patrolLeft = x - 90;
    this.patrolRight = x + 122;
    this.hopHeight = 48;
  }

  update(dt, obstacles = []) {
    super.update(dt, obstacles);
    if (this.isAlive) this.y = this.baseY - Math.abs(Math.sin(this.timer * 3)) * this.hopHeight;
  }

  render(ctx) {
    if (!this.isAlive) return;
    ctx.save(); ctx.translate(this.x + 16, this.y + 15);
    ctx.fillStyle = '#A855F7';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-21, -9);
    ctx.lineTo(-21, 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(21, -9);
    ctx.lineTo(21, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F9A8D4';
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF1F2'; ctx.fillRect(-11, -9, 22, 4);
    this.face(ctx, -3);
    ctx.restore();
  }
}
