import { BaseLevel } from './BaseLevel.js';
import { Tilemap } from './Tilemap.js';
import { CollectibleFood } from '../powerups/FoodPowers.js';
import { StarTreat } from './Collectibles.js';
import { BroccoliEnemy } from '../enemies/Enemy.js';
import { AngryCarrot, CandyEnemy, setPatrol } from '../enemies/VeggieEnemies.js';
import { ChargerCarrot, BroccoliLobber, SwoopBee } from '../enemies/ThrillEnemies.js';
import { MovingPlatform, CrumblePlatform, popSpikes } from './Hazards.js';

export class Level1 extends BaseLevel {
  constructor() {
    super();
    this.name = 'World 1-1';
    this.title = 'Snack Meadow';
    this.theme = 'meadow';
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
    this.hazards = [...this.tilemap.hazards, popSpikes(3640, 480, 64, { period: 2.6, up: 1.1 })];
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
    this.treats = [
      new StarTreat(680, 260),
      new StarTreat(1120, 440),
      new StarTreat(1880, 440),
      new StarTreat(2560, 260),
      new StarTreat(3120, 440),
      new StarTreat(3760, 160)
    ];
    this.enemies = [
      setPatrol(new BroccoliEnemy(440, 442), 360, 560),
      setPatrol(new ChargerCarrot(820, 444), 720, 980),
      setPatrol(new CandyEnemy(1720, 450), 1680, 1930),
      setPatrol(new AngryCarrot(2240, 444), 2200, 2360),
      setPatrol(new BroccoliLobber(2820, 442), 2780, 2960),
      setPatrol(new AngryCarrot(2900, 444), 2780, 2960),
      setPatrol(new CandyEnemy(3500, 290), 3400, 3520),
      setPatrol(new SwoopBee(3860, 250), 3780, 3960),
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
}
