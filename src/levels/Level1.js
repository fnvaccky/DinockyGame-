import { TestArena } from './TestArena.js';
import { Tilemap } from './Tilemap.js';
import { CollectibleFood } from '../powerups/FoodPowers.js';
import { BroccoliEnemy } from '../enemies/Enemy.js';
import { AngryCarrot, CandyEnemy, setPatrol } from '../enemies/VeggieEnemies.js';
import { events } from '../core/Events.js';

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y;

export class Level1 extends TestArena {
  constructor() {
    super();
    this.name = 'World 1-1';
    // Forty-pixel tiles: two short pits and a continuous, jumpable main route.
    const rows = Array.from({ length: 14 }, () => Array(112).fill('.'));
    const run = (row, start, end, symbol) => rows[row].fill(symbol, start, end);
    for (const row of [12, 13]) {
      run(row, 0, 27, '#'); run(row, 30, 61, '#'); run(row, 64, 112, '#');
    }
    run(10, 15, 17, 'X'); run(11, 15, 17, 'X');
    run(8, 17, 21, '='); run(7, 22, 25, '='); run(10, 25, 31, '=');
    for (let row = 7; row < 12; row++) run(row, 40, 41, 'B');
    run(10, 36, 38, '='); run(8, 38, 40, '=');
    run(11, 50, 52, '^');
    run(10, 59, 62, '='); run(9, 63, 67, '=');
    run(11, 75, 77, '^');
    run(10, 81, 84, '='); run(8, 85, 88, '='); run(6, 89, 93, '=');
    this.tilemap = new Tilemap({ rows: rows.map(row => row.join('')) });
    this.width = this.tilemap.width;
    this.height = this.tilemap.height;
    this.obstacles = [...this.tilemap.obstacles,
      { x: -40, y: -200, w: 40, h: 900, type: 'boundary', isPhaseable: false },
      { x: this.width, y: -200, w: 40, h: 900, type: 'boundary', isPhaseable: false }];
    this.oneWayPlatforms = this.tilemap.oneWayPlatforms;
    this.hazards = this.tilemap.hazards;
    this.foodItems = [
      new CollectibleFood(240, 448, 'PIZZA'),
      new CollectibleFood(760, 288, 'PIZZA'),
      new CollectibleFood(1400, 448, 'DONUT'),
      new CollectibleFood(2160, 448, 'BURGER'),
      new CollectibleFood(2720, 448, 'BURGER'),
      new CollectibleFood(3440, 288, 'DONUT'),
      new CollectibleFood(3660, 208, 'PIZZA'),
      new CollectibleFood(3980, 448, 'PIZZA')
    ];
    this.enemies = [
      setPatrol(new BroccoliEnemy(440, 442), 360, 560),
      setPatrol(new AngryCarrot(820, 444), 720, 980),
      setPatrol(new CandyEnemy(1720, 450), 1680, 1930),
      setPatrol(new AngryCarrot(2240, 444), 2200, 2360),
      setPatrol(new BroccoliEnemy(2820, 442), 2780, 2960),
      setPatrol(new AngryCarrot(2900, 444), 2780, 2960),
      setPatrol(new CandyEnemy(3500, 290), 3400, 3520),
      setPatrol(new CandyEnemy(3860, 450), 3780, 3960),
      setPatrol(new AngryCarrot(4130, 444), 4050, 4250)
    ];
    this.spawn = { x: 80, y: 480 };
    this.lastSafePosition = { ...this.spawn };
    this.checkpoint = { x: 2120, y: 480, active: false };
    this.goal = { x: 4320, y: 300, w: 45, h: 180 };
    this.cameraX = 0;
    this.health = 3;
    this.timeLeft = 240;
    this.status = 'ready';
    this.invulnerable = 0;
    this.isStomping = false;
    this.signs = [
      [80, 365, 'WORLD 1-1', 'Snack Meadow'],
      [260, 365, 'PIZZA CHOMP', 'X / E to eat enemies'],
      [850, 180, 'CANDY SHELVES', 'Down + Jump to drop'],
      [1400, 240, 'DONUT PHASE', 'Walk through purple walls'],
      [2150, 330, 'BURGER STOMP', 'Down while in the air'],
      [3280, 350, 'SWEET SUMMIT', 'Follow the upper food trail']
    ];
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
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.status === 'playing') {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft === 0) { this.lose('Time is up!'); return; }
    }
    // Reuse the existing collection and popup behavior, with bounded patrols.
    super.update(dt, player);
    for (const enemy of this.enemies) {
      // Broccoli also shares the safe patrol bounds without changing Part 1's base class.
      if (enemy.x < enemy.patrolLeft) { enemy.x = enemy.patrolLeft; enemy.vx = Math.abs(enemy.vx); }
      if (enemy.x + enemy.w > enemy.patrolRight) {
        enemy.x = enemy.patrolRight - enemy.w; enemy.vx = -Math.abs(enemy.vx);
      }
    }
    if (this.isStomping && player.isGrounded) {
      this.isStomping = false;
      events.emit('stomp', { x: player.x, y: player.y });
      this.addPopup(player.x, player.y - 65, 'HEAVY STOMP!', '#D97706');
      for (const enemy of this.enemies) {
        if (enemy.isAlive && Math.abs(enemy.x + enemy.w / 2 - player.x) < 150 &&
            Math.abs(enemy.y + enemy.h - player.y) < 65) {
          enemy.isAlive = false;
          events.emit('enemyDefeated', { enemy, points: 150, pos: { x: enemy.x, y: enemy.y } });
        }
      }
    }
    if (!this.checkpoint.active && player.x >= this.checkpoint.x && player.isGrounded && player.y === 480) {
      this.checkpoint.active = true;
      this.addPopup(this.checkpoint.x, 370, 'CHECKPOINT!', '#15803D');
      events.emit('checkpoint', {});
    }
    const hitbox = player.getHitbox();
    const body = { x: player.x - hitbox.halfW, y: player.y - hitbox.height, w: hitbox.width, h: hitbox.height };
    const insideWall = this.obstacles.some(o => o.isPhaseable && overlaps(body, o));
    if (!insideWall) this.lastSafePosition = { x: player.x, y: player.y };
    else if (!player.isPhasing) {
      // A power expiring inside a barrier must not trap the player in solid tiles.
      player.x = this.lastSafePosition.x; player.y = this.lastSafePosition.y;
      player.vx = 0; player.vy = 0;
      body.x = player.x - hitbox.halfW; body.y = player.y - hitbox.height;
    }
    if (this.isStomping && player.vy > 0) {
      for (const enemy of this.enemies) {
        if (enemy.isAlive && overlaps(body, enemy) && body.y < enemy.y) {
          enemy.isAlive = false;
          events.emit('enemyDefeated', { enemy, points: 150, pos: { x: enemy.x, y: enemy.y } });
        }
      }
    }
    if (player.y > this.height + 100) this.hurt(player, true);
    else if (!player.isPhasing && (this.hazards.some(h => overlaps(body, h)) ||
        this.enemies.some(e => e.isAlive && overlaps(body, e)))) this.hurt(player);
    if (this.status !== 'lost' && overlaps(body, this.goal)) {
      this.status = 'won';
      events.emit('levelCompleted', { bonus: Math.ceil(this.timeLeft) * 10 });
    }
    this.cameraX = Math.max(0, Math.min(this.width - 960, player.x - 320));
  }

  hurt(player, fell = false) {
    if (this.status === 'lost' || (!fell && this.invulnerable > 0)) return;
    this.health--;
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
    events.emit('gameOver', { reason });
  }

  render(ctx) {
    // Background stays in screen space; distant hills move slower than the stage.
    this._renderBackground(ctx);
    ctx.save();
    ctx.translate(-this.cameraX, 0);
    this._renderObstacles(ctx);
    this._renderOneWayPlatforms(ctx);
    for (const h of this.hazards) {
      ctx.fillStyle = '#9F1239';
      for (let x = h.x; x < h.x + h.w; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, h.y + h.h); ctx.lineTo(x + 8, h.y);
        ctx.lineTo(x + 16, h.y + h.h); ctx.fill();
      }
    }
    for (const [x, y, title, detail] of this.signs) {
      ctx.textAlign = 'left'; ctx.fillStyle = '#4C1D95';
      ctx.font = 'bold 16px sans-serif'; ctx.fillText(title, x, y);
      ctx.font = '12px sans-serif'; ctx.fillText(detail, x, y + 20);
    }
    this.drawFlag(ctx, this.checkpoint.x, 480, this.checkpoint.active ? '#16A34A' : '#64748B', 'SAVE');
    this.drawFlag(ctx, this.goal.x, 480, '#DB2777', 'FINISH');
    for (const food of this.foodItems) food.render(ctx);
    for (const enemy of this.enemies) enemy.render(ctx);
    this._renderPopups(ctx);
    ctx.restore();
  }

  _renderBackground(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, '#FEF3C7'); sky.addColorStop(1, '#EDE9FE');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 7; i++) this._drawCloud(ctx, i * 240 - (this.cameraX * 0.2) % 240, 80 + (i % 3) * 25, 30);
    ctx.fillStyle = '#C4B5FD';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(i * 320 - (this.cameraX * 0.35) % 320, 485, 200, 120, 0, Math.PI, 0); ctx.fill();
    }
  }

  drawFlag(ctx, x, floor, color, text) {
    ctx.fillStyle = '#78350F'; ctx.fillRect(x, floor - 180, 5, 180);
    ctx.fillStyle = color; ctx.fillRect(x + 5, floor - 180, 85, 34);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(text, x + 47, floor - 158);
  }

  _drawCloud(ctx, x, y, radius) {
    for (const [dx, dy, scale] of [[0, 0, 1], [-0.6, 0.3, 0.7], [0.7, 0.3, 0.65]]) {
      ctx.beginPath(); ctx.arc(x + dx * radius, y + dy * radius, radius * scale, 0, Math.PI * 2); ctx.fill();
    }
  }
}
