import { BaseLevel } from './BaseLevel.js';
import { Tilemap } from './Tilemap.js';
import { CollectibleFood } from '../powerups/FoodPowers.js';
import { StarTreat, JellyBouncePad } from './Collectibles.js';
import { BroccoliEnemy } from '../enemies/Enemy.js';
import { AngryCarrot, CandyEnemy, BerryBouncer, ChocoCritter, setPatrol } from '../enemies/VeggieEnemies.js';
import { ChargerCarrot, BroccoliLobber, SwoopBee } from '../enemies/ThrillEnemies.js';
import { MovingPlatform, CrumblePlatform, popSpikes } from './Hazards.js';

export class Level3 extends BaseLevel {
  constructor() {
    super();
    this.name = 'World 1-3';
    this.title = 'Cookie Crumble Cove';
    this.theme = 'cove';

    // 120 tiles: 4800px wide by 560px high
    const rows = Array.from({ length: 14 }, () => Array(120).fill('.'));
    const run = (row, start, end, symbol) => rows[row].fill(symbol, start, end);

    // Ground floor with three chocolate gulfs
    for (const row of [12, 13]) {
      run(row, 0, 26, '#');
      run(row, 30, 60, '#');
      run(row, 64, 92, '#');
      run(row, 96, 120, '#');
    }

    // Stepping blocks
    run(10, 12, 14, 'X'); run(11, 12, 14, 'X');
    run(10, 32, 34, 'X'); run(11, 32, 34, 'X');
    run(10, 71, 73, 'X'); run(11, 71, 73, 'X');
    run(10, 101, 103, 'X'); run(11, 101, 103, 'X');

    // Wafer step platforms
    run(10, 16, 20, '=');
    run(7, 27, 31, '=');
    run(9, 36, 41, '=');
    run(5, 51, 57, '=');
    run(8, 59, 64, '=');
    run(7, 66, 71, '=');
    run(10, 74, 79, '=');
    run(6, 88, 94, '=');
    run(9, 97, 102, '=');
    run(7, 105, 111, '=');

    // Donut phase barriers
    for (let r = 7; r < 12; r++) run(r, 49, 50, 'B');
    for (let r = 7; r < 12; r++) run(r, 87, 88, 'B');

    // Spikes hazards
    run(11, 36, 38, '^');
    run(11, 65, 67, '^');
    run(11, 98, 100, '^');

    this.tilemap = new Tilemap({ rows: rows.map(row => row.join('')) });
    this.width = this.tilemap.width;
    this.height = this.tilemap.height;

    this.obstacles = [
      ...this.tilemap.obstacles,
      { x: -40, y: -200, w: 40, h: 900, type: 'boundary', isPhaseable: false },
      { x: this.width, y: -200, w: 40, h: 900, type: 'boundary', isPhaseable: false }
    ];
    this.crumblers = [new CrumblePlatform(840, 320, 200), new CrumblePlatform(1720, 280, 240), new CrumblePlatform(3240, 320, 200)];
    this.movers = [
      new MovingPlatform({ x: 2460, y: 440, w: 80, dy: -100, period: 3.6 }),
      new MovingPlatform({ x: 3660, y: 400, w: 90, dx: 110, period: 3, phase: 0.5 })
    ];
    this.oneWayPlatforms = [...this.tilemap.oneWayPlatforms, ...this.crumblers, ...this.movers];
    this.hazards = [...this.tilemap.hazards,
      popSpikes(1640, 480, 64, { period: 2.2, up: 1.0 }),
      popSpikes(3000, 480, 64, { period: 2.2, up: 1.0, offset: 1.1 }),
      popSpikes(4300, 480, 96, { period: 2.6, up: 1.3 })];

    // Jelly bounce pads for leaping over the chocolate coves
    this.bouncePads = [
      new JellyBouncePad(1020, 462, 52, 18),
      new JellyBouncePad(2500, 462, 52, 18),
      new JellyBouncePad(3780, 462, 52, 18)
    ];

    // Collectible Foods
    this.foodItems = [
      new CollectibleFood(260, 448, 'PIZZA'),
      new CollectibleFood(920, 288, 'DONUT'),
      new CollectibleFood(1460, 448, 'BURGER'),
      new CollectibleFood(2120, 248, 'DONUT'),
      new CollectibleFood(2680, 448, 'PIZZA'),
      new CollectibleFood(3320, 288, 'BURGER'),
      new CollectibleFood(3680, 208, 'DONUT'),
      new CollectibleFood(4120, 448, 'PIZZA'),
      new CollectibleFood(4380, 248, 'BURGER')
    ];

    // Star treats scattered on high wafer steps
    this.treats = [
      new StarTreat(680, 440),
      new StarTreat(1100, 240),
      new StarTreat(1680, 440),
      new StarTreat(2200, 160),
      new StarTreat(2840, 440),
      new StarTreat(3200, 240),
      new StarTreat(3620, 160),
      new StarTreat(4180, 440),
      new StarTreat(4420, 200),
      new StarTreat(4560, 440)
    ];

    // Enemies
    this.enemies = [
      setPatrol(new ChocoCritter(520, 444), 440, 680),
      setPatrol(new ChargerCarrot(840, 444), 760, 1000),
      setPatrol(new SwoopBee(1420, 200), 1300, 1560),
      setPatrol(new CandyEnemy(1380, 450), 1300, 1560),
      setPatrol(new BerryBouncer(1840, 444), 1740, 2000),
      setPatrol(new ChocoCritter(2220, 444), 2140, 2360),
      setPatrol(new BroccoliLobber(2740, 442), 2660, 2920),
      setPatrol(new ChocoCritter(3160, 444), 3080, 3340),
      setPatrol(new SwoopBee(3480, 180), 3400, 3560),
      setPatrol(new BerryBouncer(3940, 444), 3860, 4120),
      setPatrol(new ChocoCritter(4260, 444), 4180, 4400),
      setPatrol(new ChargerCarrot(4460, 444), 4380, 4580),
      setPatrol(new BroccoliLobber(4040, 442), 3960, 4120)
    ];

    this.spawn = { x: 80, y: 480 };
    this.lastSafePosition = { ...this.spawn };
    this.checkpoint = { x: 2380, y: 480, active: false };
    this.goal = { x: 4640, y: 280, w: 45, h: 200 };

    this.signs = [
      [80, 365, 'WORLD 1-3', 'Cookie Crumble Cove'],
      [320, 365, 'CRUMBLE CLIFFS', 'Careful on the wafer steps!'],
      [1040, 180, 'WAFER BRIDGE', 'High routes keep you above danger'],
      [1800, 360, 'CHOCO VAULT', 'Donut power slips through dark chocolate gates'],
      [2400, 340, 'COVE CROSSING', 'Final stretch of World 1!'],
      [3600, 220, 'COOKIE PINNACLE', 'Golden Cookie Trophy straight ahead!']
    ];
  }

  _renderBackground(ctx) {
    // Rich golden amber sunset to twilight purple gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, '#FEF3C7');
    sky.addColorStop(0.35, '#FDE68A');
    sky.addColorStop(0.7, '#FDBA74');
    sky.addColorStop(1, '#A78BFA');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 960, 540);

    // Twinkling cookie stars in upper sky
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 18; i++) {
      const sx = (i * 163 - (this.cameraX * 0.08)) % 960;
      const sy = 25 + ((i * 37) % 110);
      const twinkle = 0.5 + 0.5 * Math.sin(this.ambientTimer * 4 + i);
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc((sx + 960) % 960, sy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Golden sunset clouds
    ctx.fillStyle = '#FFFBEB';
    for (let i = 0; i < 7; i++) {
      this._drawCloud(ctx, i * 260 - (this.cameraX * 0.2) % 260, 85 + (i % 3) * 22, 34);
    }

    // Distant waffle mountain silhouettes
    ctx.fillStyle = '#C084FC';
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 320 - (this.cameraX * 0.35) % 320, 485, 220, 140, 0, Math.PI, 0);
      ctx.fill();
    }

    // Closer chocolate cookie cliffs
    ctx.fillStyle = '#78350F';
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 280 - (this.cameraX * 0.55) % 280, 510, 180, 100, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}

