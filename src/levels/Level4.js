import { BaseLevel } from './BaseLevel.js';
import { Tilemap } from './Tilemap.js';
import { CollectibleFood } from '../powerups/FoodPowers.js';
import { StarTreat } from './Collectibles.js';
import { popSpikes } from './Hazards.js';
import { setPatrol } from '../enemies/VeggieEnemies.js';
import { ChargerCarrot, SwoopBee } from '../enemies/ThrillEnemies.js';
import { PigBoss } from '../enemies/PigBoss.js';
import { events } from '../core/Events.js';

const ARENA_LEFT = 1200;

export class Level4 extends BaseLevel {
  constructor() {
    super();
    this.name = 'World 1-4';
    this.title = 'Hog Hollow';
    this.theme = 'meadow';

    // 54 tiles: a short warm-up path, then a one-screen arena from x = 1200 to the end.
    const rows = Array.from({ length: 14 }, () => Array(54).fill('.'));
    const run = (row, start, end, symbol) => rows[row].fill(symbol, start, end);
    for (const row of [12, 13]) { run(row, 0, 14, '#'); run(row, 17, 54, '#'); }
    run(10, 10, 14, '='); run(8, 15, 19, '=');
    // Arena ledges are one easy jump up (80px) and sit just above the charging pig.
    run(10, 31, 34, '='); run(10, 40, 44, '='); run(10, 50, 53, '=');

    this.tilemap = new Tilemap({ rows: rows.map(row => row.join('')) });
    this.width = this.tilemap.width;
    this.height = this.tilemap.height;
    this.gate = { x: ARENA_LEFT - 40, y: -200, w: 40, h: 680, type: 'block', isPhaseable: false };
    this.obstacles = [...this.tilemap.obstacles,
      { x: -40, y: -200, w: 40, h: 900, type: 'boundary', isPhaseable: false },
      { x: this.width, y: -200, w: 40, h: 900, type: 'boundary', isPhaseable: false }];
    this.oneWayPlatforms = this.tilemap.oneWayPlatforms;
    this.hazards = [...this.tilemap.hazards,
      popSpikes(360, 480, 64, { period: 2.4, up: 1.0 }),
      popSpikes(880, 480, 64, { period: 2.4, up: 1.0, offset: 1.2 })];

    this.foodItems = [
      new CollectibleFood(200, 448, 'PIZZA'),
      new CollectibleFood(1060, 448, 'BURGER'),
      new CollectibleFood(1680, 368, 'PIZZA')
    ];
    this.treats = [new StarTreat(460, 360), new StarTreat(700, 280), new StarTreat(1280, 340), new StarTreat(2080, 340)];

    this.boss = new PigBoss({ left: ARENA_LEFT, right: this.width });
    this.enemies = [
      setPatrol(new ChargerCarrot(760, 444), 700, 1100),
      setPatrol(new SwoopBee(840, 220), 700, 1100),
      this.boss
    ];

    this.spawn = { x: 80, y: 480 };
    this.lastSafePosition = { ...this.spawn };
    this.checkpoint = { x: 1000, y: 480, active: false };
    // The finish flag only appears once the boss is beaten.
    this.goal = { x: -9999, y: 0, w: 0, h: 0 };
    this.signs = [
      [80, 365, 'WORLD 1-4', 'Hog Hollow'],
      [300, 330, 'POP-UP SPIKES', 'Watch them flicker, then jump!'],
      [700, 330, 'BOSS AHEAD', 'Hop on a ledge, then chomp him when dizzy!']
    ];
  }

  setHardMode(hard) {
    super.setHardMode(hard);
    if (this.hard) {
      this.boss.maxHp = this.boss.hp = 4;
      this.boss.speedScale = 1.2;
    }
    return this;
  }

  update(dt, player) {
    // Close the gate behind Dinocky and wake the pig.
    if (!this.arenaLocked && player.x > ARENA_LEFT + 80 && this.status === 'playing') {
      this.arenaLocked = true;
      this.obstacles.push(this.gate);
      this.boss.wake(this);
    }
    super.update(dt, player);
    if (this.arenaLocked) this.cameraX = ARENA_LEFT;
  }

  onBossDefeated() {
    this.projectiles = [];
    this.goal = { x: 1860, y: 300, w: 45, h: 180 };
    this.addPopup(1880, 260, 'THE FLAG IS YOURS!', '#15803D');
    this.addBurst(this.boss.x + this.boss.w / 2, 400, 30, ['#EC4899', '#FBBF24', '#34D399', '#60A5FA'], 'sparkle');
    events.emit('bossDefeated', {});
  }

  render(ctx) {
    super.render(ctx);
    if (!this.arenaLocked || !this.boss.isAlive) return;
    // Boss health bar, fixed to the top of the screen.
    const { hp, maxHp } = this.boss, w = 320, x = 480 - w / 2, y = 22;
    ctx.save();
    ctx.fillStyle = 'rgba(30, 10, 20, 0.6)'; ctx.fillRect(x - 6, y - 6, w + 12, 34);
    ctx.fillStyle = '#FCE7F3'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SIR OINKSALOT', 480, y + 8);
    for (let i = 0; i < maxHp; i++) {
      const segment = (w - (maxHp - 1) * 6) / maxHp;
      ctx.fillStyle = i < hp ? '#EC4899' : 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x + i * (segment + 6), y + 14, segment, 9);
    }
    ctx.restore();
  }

  _renderBackground(ctx) {
    // Warm farm sunset with a red barn and fence behind the arena.
    const sky = ctx.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, '#FDE68A'); sky.addColorStop(0.55, '#FDBA74'); sky.addColorStop(1, '#FCA5A5');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = '#FFFBEB';
    for (let i = 0; i < 5; i++) this._drawCloud(ctx, i * 260 - (this.cameraX * 0.2) % 260, 80 + (i % 2) * 30, 32);
    ctx.fillStyle = 'rgba(132, 204, 22, 0.45)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(i * 300 - (this.cameraX * 0.3) % 300, 490, 220, 120, 0, Math.PI, 0); ctx.fill();
    }
    const barnX = 1300 - this.cameraX * 0.6;
    ctx.fillStyle = '#B91C1C'; ctx.fillRect(barnX, 300, 200, 180);
    ctx.fillStyle = '#7F1D1D';
    ctx.beginPath(); ctx.moveTo(barnX - 20, 300); ctx.lineTo(barnX + 100, 220); ctx.lineTo(barnX + 220, 300); ctx.fill();
    ctx.strokeStyle = '#FEF3C7'; ctx.lineWidth = 5;
    ctx.strokeRect(barnX + 60, 380, 80, 100);
    ctx.beginPath(); ctx.moveTo(barnX + 60, 380); ctx.lineTo(barnX + 140, 480); ctx.moveTo(barnX + 140, 380); ctx.lineTo(barnX + 60, 480); ctx.stroke();
    ctx.fillStyle = 'rgba(254, 243, 199, 0.8)';
    for (let x = -(this.cameraX * 0.8) % 60; x < 960; x += 60) { ctx.fillRect(x, 430, 8, 50); }
    ctx.fillRect(0, 445, 960, 6); ctx.fillRect(0, 465, 960, 6);
  }
}
