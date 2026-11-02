import { BaseLevel } from './BaseLevel.js';
import { Tilemap } from './Tilemap.js';
import { CollectibleFood } from '../powerups/FoodPowers.js';
import { StarTreat, JellyBouncePad } from './Collectibles.js';
import { BroccoliEnemy } from '../enemies/Enemy.js';
import { AngryCarrot, CandyEnemy, BerryBouncer, setPatrol } from '../enemies/VeggieEnemies.js';

export class Level2 extends BaseLevel {
  constructor() {
    super();
    this.name = 'World 1-2';
    this.title = 'Sugarberry Grove';
    this.theme = 'grove';

    // 116 tiles: 4640px wide by 560px high
    const rows = Array.from({ length: 14 }, () => Array(116).fill('.'));
    const run = (row, start, end, symbol) => rows[row].fill(symbol, start, end);

    // Ground floor with two pits
    for (const row of [12, 13]) {
      run(row, 0, 30, '#');
      run(row, 34, 64, '#');
      run(row, 68, 116, '#');
    }

    // Stepping blocks
    run(10, 14, 16, 'X'); run(11, 14, 16, 'X');
    run(10, 52, 54, 'X'); run(11, 52, 54, 'X');
    run(10, 80, 82, 'X'); run(11, 80, 82, 'X');

    // Candy branch platforms
    run(10, 18, 22, '=');
    run(8, 23, 28, '=');
    run(6, 29, 34, '=');
    run(9, 38, 43, '=');
    run(7, 46, 51, '=');
    run(10, 55, 60, '=');
    run(8, 63, 68, '=');
    run(6, 72, 78, '=');
    run(9, 83, 88, '=');
    run(7, 91, 96, '=');
    run(10, 100, 105, '=');

    // Donut phase barriers
    for (let r = 8; r < 12; r++) run(r, 44, 45, 'B');
    for (let r = 7; r < 12; r++) run(r, 89, 90, 'B');

    // Crystal bramble hazards
    run(11, 35, 37, '^');
    run(11, 70, 72, '^');
    run(11, 97, 99, '^');

    this.tilemap = new Tilemap({ rows: rows.map(row => row.join('')) });
    this.width = this.tilemap.width;
    this.height = this.tilemap.height;

    this.obstacles = [
      ...this.tilemap.obstacles,
      { x: -40, y: -200, w: 40, h: 900, type: 'boundary', isPhaseable: false },
      { x: this.width, y: -200, w: 40, h: 900, type: 'boundary', isPhaseable: false }
    ];
    this.oneWayPlatforms = this.tilemap.oneWayPlatforms;
    this.hazards = this.tilemap.hazards;

    // Jelly bounce pads for launching Dinocky into the treetops!
    this.bouncePads = [
      new JellyBouncePad(1160, 462, 52, 18),
      new JellyBouncePad(2640, 462, 52, 18),
      new JellyBouncePad(3780, 462, 52, 18)
    ];

    // Collectible Foods
    this.foodItems = [
      new CollectibleFood(280, 448, 'PIZZA'),
      new CollectibleFood(1240, 208, 'DONUT'),
      new CollectibleFood(1760, 448, 'PIZZA'),
      new CollectibleFood(2240, 328, 'BURGER'),
      new CollectibleFood(2920, 448, 'DONUT'),
      new CollectibleFood(3440, 248, 'BURGER'),
      new CollectibleFood(3980, 448, 'PIZZA'),
      new CollectibleFood(4240, 208, 'DONUT')
    ];

    // Star treats scattered on high branches and secrets
    this.treats = [
      new StarTreat(740, 440),
      new StarTreat(1000, 280),
      new StarTreat(1320, 200),
      new StarTreat(1980, 440),
      new StarTreat(2520, 320),
      new StarTreat(2980, 200),
      new StarTreat(3480, 440),
      new StarTreat(4120, 240)
    ];

    // Enemies
    this.enemies = [
      setPatrol(new BerryBouncer(560, 444), 460, 720),
      setPatrol(new AngryCarrot(880, 444), 800, 1060),
      setPatrol(new CandyEnemy(1440, 450), 1380, 1600),
      setPatrol(new BerryBouncer(1920, 444), 1800, 2100),
      setPatrol(new BroccoliEnemy(2440, 442), 2380, 2600),
      setPatrol(new BerryBouncer(2820, 444), 2740, 3020),
      setPatrol(new AngryCarrot(3260, 444), 3160, 3420),
      setPatrol(new CandyEnemy(3540, 250), 3460, 3620),
      setPatrol(new BerryBouncer(4060, 444), 3960, 4220),
      setPatrol(new AngryCarrot(4280, 444), 4200, 4400)
    ];

    this.spawn = { x: 80, y: 480 };
    this.lastSafePosition = { ...this.spawn };
    this.checkpoint = { x: 2260, y: 480, active: false };
    this.goal = { x: 4480, y: 300, w: 45, h: 180 };

    this.signs = [
      [80, 365, 'WORLD 1-2', 'Sugarberry Grove'],
      [340, 365, 'JELLY BOUNCE', 'Spring off berry pads for mega air!'],
      [1040, 180, 'HIGH CANOPY', 'The sweetest snacks hide in the treetops'],
      [1700, 360, 'CRYSTAL BARRIER', 'Donut power slips right through'],
      [2280, 340, 'MID-GROVE REST', 'Take a breath, little explorer'],
      [3300, 220, 'SWEET HARVEST', 'Follow the upper trail to the grove exit!']
    ];
  }

  _renderBackground(ctx) {
    // Dusk rose-to-lavender sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, '#FDE8E8');
    sky.addColorStop(0.45, '#FCE7F3');
    sky.addColorStop(1, '#DDD6FE');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 960, 540);

    // Drifting strawberry clouds
    ctx.fillStyle = '#FFF1F2';
    for (let i = 0; i < 7; i++) {
      this._drawCloud(ctx, i * 250 - (this.cameraX * 0.2) % 250, 75 + (i % 3) * 28, 32);
    }

    // Distant sugarberry hills & lollipop tree silhouettes
    ctx.fillStyle = '#E9D5FF';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 310 - (this.cameraX * 0.35) % 310, 485, 210, 130, 0, Math.PI, 0);
      ctx.fill();
    }

    // Closer dusk berry mounds
    ctx.fillStyle = '#F472B6';
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 260 - (this.cameraX * 0.5) % 260, 500, 160, 90, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}

