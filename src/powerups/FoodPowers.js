/**
 * FoodPowers.js - Food Power-up Mechanics & Chomp Attack System.
 * 
 * Manages:
 * - PIZZA: Giant Chomp Mode (eats enemies whole, spitting crumbs and gaining points)
 * - DONUT: Sugar Rush & Phase-Jump (pass through solid obstacles & hazards)
 * - BURGER: Heavy Stomp (seismic impact ground-pound)
 * - Collectible Food Items in the world
 */
import { events } from '../core/Events.js';

export const POWER_TYPES = {
  PIZZA: {
    id: 'PIZZA',
    name: 'Pizza Chomp Mode',
    color: '#F59E0B',
    duration: 15.0,
    description: 'Press Action (X / Space) to open giant jaw and swallow enemies!'
  },
  DONUT: {
    id: 'DONUT',
    name: 'Donut Phase-Jump',
    color: '#F472B6',
    duration: 15.0,
    description: 'Sugar Rush! Jump & dash right through solid obstacles and barriers!'
  },
  BURGER: {
    id: 'BURGER',
    name: 'Burger Heavy Stomp',
    color: '#D97706',
    duration: 15.0,
    description: 'Press Down in mid-air to unleash a seismic ground pound!'
  }
};

/**
 * World collectible food item.
 */
export class CollectibleFood {
  constructor(x, y, type = 'PIZZA') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.w = 28;
    this.h = 28;
    this.timer = Math.random() * 10;
    this.isCollected = false;
  }

  update(dt) {
    this.timer += dt;
  }

  render(ctx) {
    if (this.isCollected) return;

    ctx.save();
    const bob = Math.sin(this.timer * 4) * 4;
    ctx.translate(this.x, this.y + bob);

    // Subtle glow backing
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = this.type === 'PIZZA' ? 'rgba(245, 158, 11, 0.25)' :
                    this.type === 'DONUT' ? 'rgba(244, 114, 182, 0.25)' :
                    'rgba(217, 119, 6, 0.25)';
    ctx.fill();

    if (this.type === 'PIZZA') {
      this._renderPizza(ctx);
    } else if (this.type === 'DONUT') {
      this._renderDonut(ctx);
    } else if (this.type === 'BURGER') {
      this._renderBurger(ctx);
    }

    ctx.restore();
  }

  _renderPizza(ctx) {
    // Triangular slice
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(12, 10);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fillStyle = '#FBBF24';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#D97706';
    ctx.stroke();

    // Crust
    ctx.beginPath();
    ctx.moveTo(-12, 10);
    ctx.quadraticCurveTo(0, 13, 12, 10);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#B45309';
    ctx.stroke();

    // Pepperonis
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, -1, 3, 0, Math.PI * 2);
    ctx.arc(4, 5, 2.5, 0, Math.PI * 2);
    ctx.arc(-4, 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderDonut(ctx) {
    // Golden dough
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#F59E0B';
    ctx.fill();

    // Pink frosting
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#F472B6';
    ctx.fill();

    // Center hole
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1E1B2E';
    ctx.fill();

    // Colorful sprinkles
    ctx.fillStyle = '#67E8F9';
    ctx.fillRect(-6, -4, 3, 1.5);
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(4, 3, 3, 1.5);
    ctx.fillStyle = '#A7F3D0';
    ctx.fillRect(-1, 6, 1.5, 3);
  }

  _renderBurger(ctx) {
    // Top Bun
    ctx.beginPath();
    ctx.arc(0, -3, 11, Math.PI, 0);
    ctx.fillStyle = '#D97706';
    ctx.fill();
    // Sesame seeds
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(-4, -8, 1.5, 1);
    ctx.fillRect(2, -7, 1.5, 1);
    // Patty
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-11, -2, 22, 3.5);
    // Cheese
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-11, 1.5, 22, 2);
    // Bottom Bun
    ctx.fillStyle = '#D97706';
    ctx.fillRect(-10, 3.5, 20, 3.5);
  }
}

/**
 * Handles Food Power state machine and Chomp Hitbox detection.
 */
export class FoodPowerManager {
  constructor() {
    this.activePower = null;
    this.powerTimer = 0;
    this.chompActive = false;
    this.chompCooldown = 0;
    this.chompTimer = 0;
    this.chewTimer = 0;
  }

  applyPower(typeKey) {
    const power = POWER_TYPES[typeKey];
    if (!power) return;
    this.activePower = power.id;
    this.powerTimer = power.duration;

    events.emit('powerupActivated', {
      type: power.id,
      name: power.name,
      duration: power.duration
    });
  }

  update(dt, player, enemies = []) {
    this.chompTimer = Math.max(0, this.chompTimer - dt);
    this.chompActive = this.chompTimer > 0;
    player.isChomping = this.chompActive;
    // 1. Power duration countdown
    if (this.powerTimer > 0) {
      this.powerTimer -= dt;
      if (this.powerTimer <= 0) {
        const expired = this.activePower;
        this.activePower = null;
        events.emit('powerupExpired', { type: expired });
      }
    }

    // 2. Chomp Cooldown
    if (this.chompCooldown > 0) {
      this.chompCooldown -= dt;
    }

    // 3. Chew animation timer
    if (this.chewTimer > 0) {
      this.chewTimer -= dt;
    }

    // 4. Update player's power and phasing status
    player.activePower = this.activePower;
    player.isPhasing = (this.activePower === 'DONUT');
    player.isChewing = (this.chewTimer > 0);

    // 5. If chomping, evaluate mouth collision with edible enemies
    if (this.chompActive) {
      this._resolveChompHitbox(player, enemies);
    }
  }

  /**
   * Trigger Dinocky's Chomp attack.
   */
  triggerChomp(player, enemies = []) {
    if (this.chompCooldown > 0) return false;

    this.chompActive = true;
    this.chompTimer = 0.28;
    this.chompCooldown = 0.45;
    player.isChomping = true;

    // Check immediately on initiation
    this._resolveChompHitbox(player, enemies);

    return true;
  }

  _resolveChompHitbox(player, enemies) {
    // Mouth chomp reach in front of Dinocky
    const reach = (this.activePower === 'PIZZA') ? 64 : 42;
    const mouthCenterY = player.y - 28;
    const mouthHitbox = {
      x: player.facing > 0 ? player.x + 8 : player.x - 8 - reach,
      y: mouthCenterY - 24,
      w: reach,
      h: 46
    };

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (!enemy.isAlive || !enemy.isEdible) continue;

      // Check if enemy intersects mouth
      if (
        enemy.x + enemy.w > mouthHitbox.x &&
        enemy.x < mouthHitbox.x + mouthHitbox.w &&
        enemy.y + enemy.h > mouthHitbox.y &&
        enemy.y < mouthHitbox.y + mouthHitbox.h
      ) {
        // DINOCKY EATS THE ENEMY!
        enemy.isAlive = false;
        enemy.isEaten = true;
        this.chewTimer = 1.0; // trigger cute chewing animation

        events.emit('enemyEaten', {
          enemy: enemy,
          points: 250,
          pos: { x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2 }
        });

        // If Pizza power is active, eating enemies restores a burst of energy!
        if (this.activePower === 'PIZZA') {
          events.emit('bonusEnergy', { amount: 20 });
        }
      }
    }
  }
}
