import { TestArena } from './TestArena.js';
import { events } from '../core/Events.js';
import { updatePopSpikes } from './Hazards.js';

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y;

export class BaseLevel extends TestArena {
  constructor() {
    super();
    this.status = 'ready';
    this.health = 3;
    this.maxHealth = 3;
    this.hard = false;
    this.timeLeft = 240;
    this.cameraX = 0;
    this.invulnerable = 0;
    this.isStomping = false;
    this.theme = 'meadow';

    // Polish systems: Screen shake, particles, treats, bounce pads, chomp combos
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.shakeX = 0;
    this.shakeY = 0;

    this.particles = [];
    this.treats = [];
    this.bouncePads = [];

    this.comboCount = 0;
    this.comboTimer = 0;
    this.ambientTimer = 0;
    this.flagTimer = 0;
    this.signs = [];

    // Thrill systems: thrown projectiles, moving and crumbling platforms (also listed in
    // oneWayPlatforms), and spikes with a `cycle` that pop up on a rhythm.
    this.projectiles = [];
    this.movers = [];
    this.crumblers = [];
    this.hazardTimer = 0;
  }

  /** Hard Mode: one heart, no checkpoint, faster enemies and quicker crumbling wafers. */
  setHardMode(hard) {
    this.hard = Boolean(hard);
    if (!this.hard) return this;
    this.health = this.maxHealth = 1;
    this.checkpoint.disabled = true;
    for (const enemy of this.enemies) {
      if (enemy.isBoss) continue;
      enemy.speedScale = 1.35; enemy.vx *= 1.35;
      if (enemy.walkSpeed) enemy.walkSpeed *= 1.35;
    }
    for (const wafer of this.crumblers) wafer.delay *= 0.7;
    return this;
  }

  spawnProjectile(projectile) {
    this.projectiles.push({ life: 3, gravity: 0, r: 8, ...projectile });
  }

  /** Stomps defeat ordinary enemies outright; a boss decides for itself. */
  defeatEnemy(enemy, points) {
    if (enemy.takeHit) {
      const scored = enemy.takeHit();
      if (scored) events.emit('enemyDefeated', { enemy, points: scored, pos: { x: enemy.x, y: enemy.y } });
      return;
    }
    enemy.isAlive = false;
    this.addBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 12, ['#F472B6', '#FBBF24', '#60A5FA'], 'crumb');
    events.emit('enemyDefeated', { enemy, points, pos: { x: enemy.x, y: enemy.y } });
  }

  _onPlatform(player, plat) {
    const halfW = player.getHitbox().halfW;
    return player.isGrounded && Math.abs(player.y - plat.y) < 2 &&
      player.x + halfW > plat.x && player.x - halfW < plat.x + plat.w;
  }

  _updateThrills(dt, player) {
    this.hazardTimer += dt;
    for (const hazard of this.hazards) if (hazard.cycle) updatePopSpikes(hazard, this.hazardTimer);

    // Riders move with their platform.
    for (const mover of this.movers) {
      const riding = this._onPlatform(player, mover);
      const moved = mover.update(dt);
      if (riding) { player.x += moved.x; player.y += moved.y; }
    }
    for (const wafer of this.crumblers) {
      const solid = wafer.update(dt, this._onPlatform(player, wafer));
      const index = this.oneWayPlatforms.indexOf(wafer);
      if (!solid && index >= 0) this.oneWayPlatforms.splice(index, 1);
      else if (solid && index < 0) this.oneWayPlatforms.push(wafer);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const hitGround = p.kind !== 'shock' && this.obstacles.some(o => o.type !== 'boundary' &&
        p.x > o.x && p.x < o.x + o.w && p.y + p.r > o.y && p.y < o.y + o.h);
      if (p.life <= 0 || p.y > this.height + 50 || hitGround || p.x < -50 || p.x > this.width + 50) {
        if (hitGround) this.addBurst(p.x, p.y, 6, p.kind === 'apple' ? ['#DC2626', '#FCA5A5'] : ['#16A34A', '#86EFAC'], 'crumb');
        this.projectiles.splice(i, 1);
      }
    }
  }

  _renderThrills(ctx) {
    for (const mover of this.movers) mover.render(ctx, this.theme);
    for (const wafer of this.crumblers) wafer.render(ctx);
    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'shock') {
        ctx.fillStyle = 'rgba(202, 138, 4, 0.85)';
        ctx.beginPath(); ctx.moveTo(-p.r * 1.4, p.r); ctx.quadraticCurveTo(0, -p.r * 1.6, p.r * 1.4, p.r); ctx.fill();
      } else if (p.kind === 'apple') {
        ctx.fillStyle = '#DC2626';
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#16A34A'; ctx.fillRect(-1, -p.r - 5, 3, 6);
        // Shadow on the floor shows where the apple will land.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.beginPath(); ctx.ellipse(0, 480 - p.y, p.r, 4, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.rotate(p.life * 8);
        ctx.fillStyle = '#15803D';
        for (const [fx, fy] of [[-4, -2], [4, -2], [0, 4]]) { ctx.beginPath(); ctx.arc(fx, fy, p.r * 0.6, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    }
  }

  triggerShake(intensity = 6, duration = 0.22) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  addBurst(x, y, count = 10, colors = ['#F59E0B', '#FBBF24', '#FEF3C7'], type = 'crumb') {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 70 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'crumb' ? 90 : 20),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: type === 'sparkle' ? 4 + Math.random() * 3 : 3 + Math.random() * 4,
        life: 0.55 + Math.random() * 0.35,
        maxLife: 0.9,
        type,
        gravity: type === 'crumb' ? 420 : 60,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 10
      });
    }
  }

  beforeUpdate(player, input) {
    if (this.status === 'ready' && (input.left || input.right || input.jumpJustPressed || input.actionJustPressed)) {
      this.status = 'playing';
    }
    if (this.status === 'playing' && player.activePower === 'BURGER' && input.down && !player.isGrounded) {
      this.isStomping = true;
      player.vy = 650;
    }
    if (player.activePower !== 'BURGER') this.isStomping = false;
  }

  update(dt, player) {
    if (this.status === 'won' || this.status === 'lost') return;

    this.flagTimer += dt;
    this.ambientTimer += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);

    if (this.status === 'playing') {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft === 0) { this.lose('Time is up!'); return; }
    }

    // Screen shake decay
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      if (this.shakeDuration <= 0) {
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
      }
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    // Enemies that react to Dinocky decide before they move.
    for (const enemy of this.enemies) if (enemy.isAlive) enemy.think?.(dt, player, this);

    // Base update for food items & enemies & popups
    super.update(dt, player);
    this._updateThrills(dt, player);

    // Update patrol bounds for all enemies
    for (const enemy of this.enemies) {
      if (enemy.patrolLeft !== undefined && enemy.x < enemy.patrolLeft) {
        enemy.x = enemy.patrolLeft;
        enemy.vx = Math.abs(enemy.vx);
      }
      if (enemy.patrolRight !== undefined && enemy.x + enemy.w > enemy.patrolRight) {
        enemy.x = enemy.patrolRight - enemy.w;
        enemy.vx = -Math.abs(enemy.vx);
      }
    }

    // Burger heavy stomp landing
    if (this.isStomping && player.isGrounded) {
      this.isStomping = false;
      events.emit('stomp', { x: player.x, y: player.y });
      this.triggerShake(7, 0.25);
      this.addPopup(player.x, player.y - 65, 'HEAVY STOMP!', '#D97706');
      this.addBurst(player.x, player.y, 16, ['#D97706', '#F59E0B', '#FEF3C7'], 'crumb');

      for (const enemy of this.enemies) {
        if (enemy.isAlive && Math.abs(enemy.x + enemy.w / 2 - player.x) < 150 &&
            Math.abs(enemy.y + enemy.h - player.y) < 65) {
          this.defeatEnemy(enemy, 150);
        }
      }
    }

    // Stomping in the air directly landing on enemy
    const hitbox = player.getHitbox();
    const body = { x: player.x - hitbox.halfW, y: player.y - hitbox.height, w: hitbox.width, h: hitbox.height };

    if (this.isStomping && player.vy > 0) {
      for (const enemy of this.enemies) {
        if (enemy.isAlive && overlaps(body, enemy) && body.y < enemy.y) {
          this.triggerShake(5, 0.18);
          this.defeatEnemy(enemy, 150);
        }
      }
    }

    // Checkpoint activation
    if (!this.checkpoint.active && !this.checkpoint.disabled && player.x >= this.checkpoint.x && player.isGrounded && Math.abs(player.y - 480) < 5) {
      this.checkpoint.active = true;
      this.addPopup(this.checkpoint.x, 370, 'CHECKPOINT!', '#15803D');
      this.addBurst(this.checkpoint.x + 20, 360, 15, ['#22C55E', '#86EFAC', '#FEF08A'], 'sparkle');
      events.emit('checkpoint', {});
    }

    // Phasing walls safety
    const insideWall = this.obstacles.some(o => o.isPhaseable && overlaps(body, o));
    if (!insideWall) {
      this.lastSafePosition = { x: player.x, y: player.y };
    } else if (!player.isPhasing) {
      player.x = this.lastSafePosition.x;
      player.y = this.lastSafePosition.y;
      player.vx = 0;
      player.vy = 0;
      body.x = player.x - hitbox.halfW;
      body.y = player.y - hitbox.height;
    }

    // Jelly bounce pads interaction
    for (const pad of this.bouncePads) {
      pad.update(dt);
      if (player.vy >= 0 &&
          player.x >= pad.x - 8 && player.x <= pad.x + pad.w + 8 &&
          player.y >= pad.y - 4 && player.y <= pad.y + 18) {
        pad.bounce();
        player.y = pad.y;
        player.vy = -750;
        player.isGrounded = false;
        this.triggerShake(4, 0.15);
        this.addPopup(pad.x + pad.w / 2, pad.y - 20, 'BOING! ★', '#EC4899');
        this.addBurst(pad.x + pad.w / 2, pad.y, 10, ['#F472B6', '#FBCFE8', '#FFFFFF'], 'sparkle');
        events.emit('bounce', { x: pad.x, y: pad.y });
      }
    }

    // Star treat collection
    for (const treat of this.treats) {
      if (!treat.isCollected) {
        treat.update(dt);
        const dx = Math.abs(player.x - treat.x);
        const dy = Math.abs((player.y - 26) - treat.y);
        if (dx < 26 && dy < 30) {
          treat.isCollected = true;
          events.emit('enemyDefeated', { points: 100 });
          events.emit('starCollected', { x: treat.x, y: treat.y });
          this.addPopup(treat.x, treat.y - 12, '+100 ★', '#F59E0B');
          this.addBurst(treat.x, treat.y, 10, ['#FBBF24', '#FCD34D', '#FFFFFF'], 'sparkle');
        }
      }
    }

    // Update juice particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.rotation += p.vRot * dt;
    }

    // Hazards and enemy collision damage
    if (player.y > this.height + 100) {
      this.hurt(player, true);
    } else if (!player.isPhasing && (this.hazards.some(h => h.active !== false && overlaps(body, h)) ||
        this.enemies.some(e => e.isAlive && !e.harmless && overlaps(body, e)))) {
      this.hurt(player);
    } else {
      const hit = this.projectiles.findIndex(p => overlaps(body, { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }));
      if (hit >= 0 && !this.invulnerable) { this.projectiles.splice(hit, 1); this.hurt(player); }
    }

    // Level completion
    if (this.status !== 'lost' && overlaps(body, this.goal)) {
      this.status = 'won';
      this.addBurst(this.goal.x + 25, 360, 25, ['#EC4899', '#FBBF24', '#34D399', '#60A5FA', '#F43F5E'], 'sparkle');
      events.emit('levelCompleted', { bonus: Math.ceil(this.timeLeft) * 10 });
    }

    // Smooth camera track
    this.cameraX = Math.max(0, Math.min(this.width - 960, player.x - 320));
  }

  hurt(player, fell = false) {
    if (this.status === 'lost' || (!fell && this.invulnerable > 0)) return;
    this.health--;
    this.triggerShake(7, 0.25);
    events.emit('playerHurt', { health: this.health });
    if (this.health <= 0) { this.lose('Out of hearts!'); return; }
    this.invulnerable = 2;
    if (fell) {
      const spawn = this.checkpoint.active ? this.checkpoint : this.spawn;
      player.x = spawn.x; player.y = spawn.y;
      player.vx = 0; player.vy = 0; player.isGrounded = false;
      player.coyoteTimer = 0; player.jumpBufferTimer = 0;
      player.isDroppingThrough = false; player.dropThroughTimer = 0;
      this.isStomping = false;
    } else {
      player.vx = -player.facing * 220;
      player.vy = -260;
      player.isGrounded = false;
    }
  }

  lose(reason) {
    this.status = 'lost';
    this.resultMessage = reason;
    this.triggerShake(8, 0.35);
    events.emit('gameOver', { reason });
  }

  render(ctx) {
    ctx.save();
    if (this.shakeDuration > 0) {
      ctx.translate(this.shakeX, this.shakeY);
    }

    this._renderBackground(ctx);

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    this._renderObstacles(ctx);
    this._renderOneWayPlatforms(ctx);

    // Render Hazards
    for (const h of this.hazards) {
      const spikeColor = this.theme === 'grove' ? '#BE185D' : this.theme === 'cove' ? '#78350F' : '#9F1239';
      ctx.fillStyle = spikeColor;
      const height = !h.cycle || h.active ? h.h : h.warning && Math.floor(this.hazardTimer * 12) % 2 ? 7 : 3;
      for (let x = h.x; x < h.x + h.w; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, h.y + h.h);
        ctx.lineTo(x + 8, h.y + h.h - height);
        ctx.lineTo(x + 16, h.y + h.h);
        ctx.fill();
      }
    }

    // Render Signs
    for (const [x, y, title, detail] of this.signs) {
      ctx.textAlign = 'left';
      ctx.fillStyle = this.theme === 'grove' ? '#831843' : this.theme === 'cove' ? '#581C87' : '#4C1D95';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(title, x, y);
      ctx.font = '12px sans-serif';
      ctx.fillText(detail, x, y + 20);
    }

    // Render Bounce Pads
    for (const pad of this.bouncePads) {
      pad.render(ctx);
    }

    // Render Flags
    if (!this.checkpoint.disabled) this.drawFlag(ctx, this.checkpoint.x, 480, this.checkpoint.active ? '#16A34A' : '#64748B', 'SAVE');
    this.drawFlag(ctx, this.goal.x, 480, this.theme === 'grove' ? '#DB2777' : this.theme === 'cove' ? '#D97706' : '#DB2777', 'FINISH');

    // Render Collectible Treats
    for (const treat of this.treats) {
      treat.render(ctx);
    }

    // Render Foods & Enemies
    for (const food of this.foodItems) food.render(ctx);
    for (const enemy of this.enemies) enemy.render(ctx);
    this._renderThrills(ctx);

    // Render Juice Particles
    this._renderParticles(ctx);

    // Render Popups
    this._renderPopups(ctx);

    ctx.restore();
    ctx.restore();
  }

  drawFlag(ctx, x, floor, color, text) {
    ctx.fillStyle = '#78350F';
    ctx.fillRect(x, floor - 180, 5, 180);

    // Animated fluttering cloth banner
    ctx.save();
    ctx.translate(x + 5, floor - 180);
    const flutter = Math.sin(this.flagTimer * 7 + x * 0.01) * 3;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(45, flutter, 85, 0);
    ctx.lineTo(85, 34);
    ctx.quadraticCurveTo(45, 34 + flutter, 0, 34);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Gold finial on top of pole
    ctx.beginPath();
    ctx.arc(-2.5, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#F59E0B';
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 42, 22 + flutter * 0.5);
    ctx.restore();
  }

  _renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        // Little cross sparkle rays
        ctx.fillRect(-p.size * 1.6, -0.75, p.size * 3.2, 1.5);
        ctx.fillRect(-0.75, -p.size * 1.6, 1.5, p.size * 3.2);
      } else {
        // Food crumb
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  _renderObstacles(ctx) {
    for (const obs of this.obstacles) {
      if (obs.type === 'boundary') continue;

      if (obs.type === 'ground') {
        if (this.theme === 'grove') {
          // Grove: Sweet strawberry icing rim + cocoa biscuit
          ctx.fillStyle = '#FB7185';
          ctx.fillRect(obs.x, obs.y, obs.w, 14);

          ctx.fillStyle = '#653018';
          ctx.fillRect(obs.x, obs.y + 14, obs.w, obs.h - 14);

          // Sugar drizzle texture
          ctx.strokeStyle = 'rgba(255, 241, 242, 0.18)';
          ctx.lineWidth = 2;
          for (let gx = 0; gx < obs.w; gx += 32) {
            ctx.beginPath();
            ctx.moveTo(obs.x + gx, obs.y + 14);
            ctx.lineTo(obs.x + gx, obs.y + obs.h);
            ctx.stroke();
          }
        } else if (this.theme === 'cove') {
          // Cove: Rich chocolate crust with vanilla cream waffle lines
          ctx.fillStyle = '#D97706';
          ctx.fillRect(obs.x, obs.y, obs.w, 14);

          ctx.fillStyle = '#451A03';
          ctx.fillRect(obs.x, obs.y + 14, obs.w, obs.h - 14);

          ctx.strokeStyle = 'rgba(254, 243, 199, 0.16)';
          ctx.lineWidth = 2;
          for (let gx = 0; gx < obs.w; gx += 36) {
            ctx.beginPath();
            ctx.moveTo(obs.x + gx, obs.y + 14);
            ctx.lineTo(obs.x + gx, obs.y + obs.h);
            ctx.stroke();
          }
        } else {
          // Meadow: Grass rim + waffle cake texture
          ctx.fillStyle = '#4ADE80';
          ctx.fillRect(obs.x, obs.y, obs.w, 14);

          ctx.fillStyle = '#78350F';
          ctx.fillRect(obs.x, obs.y + 14, obs.w, obs.h - 14);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 2;
          for (let gx = 0; gx < obs.w; gx += 32) {
            ctx.beginPath();
            ctx.moveTo(obs.x + gx, obs.y + 14);
            ctx.lineTo(obs.x + gx, obs.y + obs.h);
            ctx.stroke();
          }
        }
      } else if (obs.type === 'barrier') {
        // Solid Phase Barrier (pass through with Donut)
        ctx.save();
        ctx.fillStyle = this.theme === 'grove' ? '#C026D3' : '#9333EA';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        // Hazard diagonal stripes
        ctx.strokeStyle = this.theme === 'grove' ? '#F472B6' : '#C084FC';
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
        // Stepping block
        const blockColor = this.theme === 'grove' ? '#EC4899' : this.theme === 'cove' ? '#B45309' : '#F59E0B';
        const borderColor = this.theme === 'grove' ? '#BE185D' : this.theme === 'cove' ? '#78350F' : '#B45309';
        ctx.fillStyle = blockColor;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.lineWidth = 2;
        ctx.strokeStyle = borderColor;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      }
    }
  }

  _renderOneWayPlatforms(ctx) {
    for (const plat of this.oneWayPlatforms) {
      ctx.save();
      const topColor = this.theme === 'grove' ? '#F43F5E' : this.theme === 'cove' ? '#EA580C' : '#F472B6';
      const bodyColor = this.theme === 'grove' ? '#FDA4AF' : this.theme === 'cove' ? '#FDBA74' : '#FDA4AF';

      ctx.fillStyle = topColor;
      ctx.fillRect(plat.x, plat.y, plat.w, 5);

      ctx.fillStyle = bodyColor;
      ctx.fillRect(plat.x, plat.y + 5, plat.w, plat.h - 5);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲ JUMP-THROUGH ▲', plat.x + plat.w / 2, plat.y + 11);
      ctx.restore();
    }
  }

  _drawCloud(ctx, x, y, radius) {
    for (const [dx, dy, scale] of [[0, 0, 1], [-0.6, 0.3, 0.7], [0.7, 0.3, 0.65]]) {
      ctx.beginPath();
      ctx.arc(x + dx * radius, y + dy * radius, radius * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

