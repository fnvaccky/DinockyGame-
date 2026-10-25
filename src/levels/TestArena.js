/**
 * TestArena.js - Interactive Playable Stage & Physics Sandbox.
 * 
 * Includes:
 * - Solid ground and boundary walls
 * - One-way semi-solid platforms (jump through from bottom, drop through with Down + Jump)
 * - Solid obstacle barrier blocks (to test Donut Phase-Jump)
 * - Collectible food power-ups (Pizza, Donut, Burger)
 * - Patrol Broccoli enemies ready to be chomped
 */
import { CollectibleFood } from '../powerups/FoodPowers.js';
import { BroccoliEnemy } from '../enemies/Enemy.js';

export class TestArena {
  constructor() {
    this.width = 960;
    this.height = 540;

    // Solid obstacles {x, y, w, h, isPhaseable}
    this.obstacles = [
      // Ground floor
      { x: 0, y: 480, w: 960, h: 60, type: 'ground', isPhaseable: false },
      // Left and right boundary walls
      { x: -20, y: 0, w: 20, h: 540, type: 'boundary', isPhaseable: false },
      { x: 960, y: 0, w: 20, h: 540, type: 'boundary', isPhaseable: false },

      // Solid Obstacle Barrier Wall 1 (Phase through with Donut!)
      { x: 340, y: 350, w: 40, h: 130, type: 'barrier', label: 'PHASE BARRIER', isPhaseable: true },
      // Solid Obstacle Barrier Wall 2
      { x: 620, y: 320, w: 45, h: 160, type: 'barrier', label: 'PHASE BARRIER', isPhaseable: true },

      // Stepping block
      { x: 120, y: 410, w: 60, h: 70, type: 'block', isPhaseable: true }
    ];

    // One-Way Semi-Solid Platforms (Jump up from below, land on top!)
    this.oneWayPlatforms = [
      { x: 180, y: 330, w: 120, h: 14, label: 'JUMP-THROUGH' },
      { x: 420, y: 280, w: 150, h: 14, label: 'JUMP-THROUGH' },
      { x: 700, y: 240, w: 160, h: 14, label: 'JUMP-THROUGH' },
      { x: 260, y: 190, w: 130, h: 14, label: 'JUMP-THROUGH' }
    ];

    // Collectible Foods
    this.foodItems = [
      new CollectibleFood(240, 290, 'PIZZA'),
      new CollectibleFood(490, 240, 'DONUT'),
      new CollectibleFood(780, 200, 'BURGER'),
      new CollectibleFood(80, 440, 'DONUT')
    ];

    // Patrol Enemies
    this.enemies = [
      new BroccoliEnemy(420, 442),
      new BroccoliEnemy(730, 442),
      new BroccoliEnemy(740, 202)
    ];

    // Floating text notifications / particles
    this.popups = [];
  }

  update(dt, player) {
    // 1. Update food items & check collection
    for (const food of this.foodItems) {
      if (!food.isCollected) {
        food.update(dt);

        // Check if player collected food
        const dx = Math.abs(player.x - food.x);
        const dy = Math.abs((player.y - 26) - food.y);
        if (dx < 28 && dy < 32) {
          food.isCollected = true;
          player.powerManager.applyPower(food.type);

          this.addPopup(food.x, food.y - 10, `+ ${food.type} POWER!`, '#F59E0B');
        }
      }
    }

    // 2. Update enemies
    for (const enemy of this.enemies) {
      enemy.update(dt, this.obstacles);
    }

    // 3. Update popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y -= dt * 45;
      p.alpha -= dt * 1.2;
      if (p.alpha <= 0) {
        this.popups.splice(i, 1);
      }
    }
  }

  addPopup(x, y, text, color = '#FFFFFF') {
    this.popups.push({ x, y, text, color, alpha: 1.0 });
  }

  render(ctx) {
    // 1. Render Sky Background & Decor
    this._renderBackground(ctx);

    // 2. Render Solid Obstacles & Ground
    this._renderObstacles(ctx);

    // 3. Render One-Way Platforms
    this._renderOneWayPlatforms(ctx);

    // 4. Render Collectibles
    for (const food of this.foodItems) {
      food.render(ctx);
    }

    // 5. Render Enemies
    for (const enemy of this.enemies) {
      enemy.render(ctx);
    }

    // 6. Render Popups
    this._renderPopups(ctx);
  }

  _renderBackground(ctx) {
    // Soft pastel sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 480);
    sky.addColorStop(0, '#FEF3C7');
    sky.addColorStop(0.5, '#FCE7F3');
    sky.addColorStop(1, '#EDE9FE');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Cute puffy clouds in background
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    this._drawCloud(ctx, 160, 90, 45);
    this._drawCloud(ctx, 580, 70, 55);
    this._drawCloud(ctx, 840, 110, 40);
    ctx.restore();
  }

  _drawCloud(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.5, cy + r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.6, cy + r * 0.25, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderObstacles(ctx) {
    for (const obs of this.obstacles) {
      if (obs.type === 'boundary') continue;

      if (obs.type === 'ground') {
        // Ground floor: Grass rim + waffle cake texture
        ctx.fillStyle = '#4ADE80';
        ctx.fillRect(obs.x, obs.y, obs.w, 14);

        ctx.fillStyle = '#78350F';
        ctx.fillRect(obs.x, obs.y + 14, obs.w, obs.h - 14);

        // Biscuit grid texture
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        for (let gx = 0; gx < obs.w; gx += 32) {
          ctx.beginPath();
          ctx.moveTo(gx, obs.y + 14);
          ctx.lineTo(gx, obs.y + obs.h);
          ctx.stroke();
        }
      } else if (obs.type === 'barrier') {
        // Solid Obstacle Wall (Phaseable with Donut)
        ctx.save();
        ctx.fillStyle = '#9333EA';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        // Hazard diagonal stripes
        ctx.strokeStyle = '#C084FC';
        ctx.lineWidth = 4;
        ctx.save();
        ctx.beginPath();
        ctx.rect(obs.x, obs.y, obs.w, obs.h);
        ctx.clip();
        for (let sy = obs.y - 40; sy < obs.y + obs.h + 40; sy += 18) {
          ctx.moveTo(obs.x - 10, sy);
          ctx.lineTo(obs.x + obs.w + 10, sy + 30);
        }
        ctx.stroke();
        ctx.restore();

        // Label banner
        ctx.fillStyle = '#F3E8FF';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(obs.x + obs.w / 2, obs.y + obs.h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('DONUT PHASE WALL', 0, 3);
        ctx.restore();

        ctx.restore();
      } else {
        // Stepping stone block
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#B45309';
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      }
    }
  }

  _renderOneWayPlatforms(ctx) {
    for (const plat of this.oneWayPlatforms) {
      ctx.save();
      // Semi-solid wooden candy shelf
      ctx.fillStyle = '#F472B6';
      ctx.fillRect(plat.x, plat.y, plat.w, 5);

      ctx.fillStyle = '#FDA4AF';
      ctx.fillRect(plat.x, plat.y + 5, plat.w, plat.h - 5);

      // Indicator arrows showing jump-up from below
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲ JUMP-THROUGH ▲', plat.x + plat.w / 2, plat.y + 11);
      ctx.restore();
    }
  }

  _renderPopups(ctx) {
    for (const p of this.popups) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.font = 'bold 15px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }
}
