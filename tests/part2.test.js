import test from 'node:test';
import assert from 'node:assert/strict';
import { Tilemap } from '../src/levels/Tilemap.js';
import { Level1 } from '../src/levels/Level1.js';
import { AngryCarrot, CandyEnemy, setPatrol } from '../src/enemies/VeggieEnemies.js';
import { Player } from '../src/character/Player.js';
import { Physics } from '../src/physics/Physics.js';
import { FoodPowerManager } from '../src/powerups/FoodPowers.js';
import { SoundEngine } from '../src/audio/SoundEngine.js';
import { events } from '../src/core/Events.js';

const dt = 1 / 60;
const noInput = { left: false, right: false, jump: false, jumpJustPressed: false,
  down: false, dropThrough: false, actionJustPressed: false };

test('tilemap loads collision categories, merges runs, rejects malformed data', () => {
  const map = new Tilemap({ rows: ['##B.', '==^^'] });
  assert.equal(map.width, 160);
  assert.equal(map.obstacles.length, 2);
  assert.equal(map.obstacles[0].w, 80);
  assert.equal(map.obstacles[0].isPhaseable, false);
  assert.equal(map.obstacles[1].isPhaseable, true);
  assert.equal(map.oneWayPlatforms[0].h, 14);
  assert.equal(map.hazards[0].h, 16);
  const ground = new Tilemap({ rows: ['##', '##'] });
  assert.equal(ground.obstacles.length, 1);
  assert.equal(ground.obstacles[0].h, 80);
  assert.throws(() => new Tilemap({ rows: ['##', '#'] }));
  assert.throws(() => new Tilemap({ rows: ['#'], tileSize: 0 }));
});

test('new enemies patrol within platform bounds and candy hops within reach', () => {
  for (const EnemyType of [AngryCarrot, CandyEnemy]) {
    const enemy = setPatrol(new EnemyType(100, 100), 80, 220);
    for (let i = 0; i < 3600; i++) {
      enemy.update(dt);
      assert.ok(enemy.x >= 80 && enemy.x + enemy.w <= 220);
      assert.ok(enemy.y >= 52 && enemy.y <= 100);
    }
    enemy.isAlive = false;
    const x = enemy.x;
    enemy.update(1);
    assert.equal(enemy.x, x);
    assert.equal(enemy.isEdible, true);
  }
});

test('chomp honors edible flag, emits the contract, restores pizza energy, and pauses with simulation', () => {
  const player = new Player(100, 480);
  const edible = new AngryCarrot(125, 444);
  const protectedEnemy = new AngryCarrot(128, 444);
  protectedEnemy.isEdible = false;
  const seen = [];
  const energy = [];
  const off = events.on('enemyEaten', event => seen.push(event));
  const offEnergy = events.on('bonusEnergy', event => energy.push(event));
  try {
    player.powerManager.applyPower('PIZZA');
    player.powerManager.triggerChomp(player, [edible, protectedEnemy]);
    assert.equal(edible.isAlive, false);
    assert.equal(protectedEnemy.isAlive, true);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].points, 250);
    assert.ok(Number.isFinite(seen[0].pos.x));
    assert.equal(energy[0].amount, 20);
    player.powerManager.update(0.1, player, []);
    assert.equal(player.isChomping, true);
    player.powerManager.update(0.2, player, []);
    assert.equal(player.isChomping, false);
    assert.equal(player.powerManager.triggerChomp(player, []), false);
  } finally { off(); offEnergy(); }
});

test('world includes all foods and enemies supported by safe patrol surfaces', () => {
  const level = new Level1();
  assert.equal(level.width, 4480);
  assert.deepEqual(new Set(level.foodItems.map(f => f.type)), new Set(['PIZZA', 'DONUT', 'BURGER']));
  assert.equal(level.enemies.length, 9);
  assert.ok(level.hazards.length >= 2);
  for (const enemy of level.enemies) {
    const floor = (enemy.baseY ?? enemy.y) + enemy.h;
    assert.ok([...level.obstacles, ...level.oneWayPlatforms].some(surface =>
      surface.y === floor && surface.x <= enemy.patrolLeft && surface.x + surface.w >= enemy.patrolRight));
  }
});

test('phase walls block normal players, admit Donut, and safely eject on expiry', () => {
  const level = new Level1();
  const physics = new Physics();
  const player = new Player(1560, 480);
  player.isGrounded = true;
  for (let i = 0; i < 30; i++) physics.update(player, { ...noInput, right: true }, level.obstacles, level.oneWayPlatforms, dt);
  assert.ok(player.x <= 1582);
  player.powerManager.applyPower('DONUT');
  player.powerManager.update(0, player);
  for (let i = 0; i < 30; i++) physics.update(player, { ...noInput, right: true }, level.obstacles, level.oneWayPlatforms, dt);
  assert.ok(player.x > 1640);
  level.lastSafePosition = { x: 1560, y: 480 };
  player.x = 1620; player.isPhasing = false;
  level.update(dt, player);
  assert.equal(player.x, 1560);
});

test('semi-solid shelves permit ascent, landing, and dropping', () => {
  const physics = new Physics();
  const player = new Player(120, 400);
  const platforms = [{ x: 60, y: 320, w: 160, h: 14 }];
  player.vy = -560;
  let roseAbove = false;
  for (let i = 0; i < 70; i++) {
    physics.update(player, { ...noInput, jump: true }, [], platforms, dt);
    if (player.y < 320) roseAbove = true;
  }
  assert.ok(roseAbove);
  assert.equal(player.y, 320);
  assert.equal(player.isGrounded, true);
  physics.update(player, { ...noInput, dropThrough: true, jumpJustPressed: true }, [], platforms, dt);
  assert.ok(player.y > 320);
});

test('damage has a grace period; pits respawn at checkpoint; death and timeout stop play', () => {
  const level = new Level1();
  const player = new Player(80, 480);
  level.hurt(player); level.hurt(player);
  assert.equal(level.health, 2);
  level.checkpoint.active = true;
  player.x = 2500; player.y = 700;
  level.update(dt, player);
  assert.equal(player.x, level.checkpoint.x);
  assert.equal(player.y, 480);
  assert.equal(level.health, 1);
  level.hurt(player, true);
  assert.equal(level.status, 'lost');
  const timeout = new Level1(); timeout.status = 'playing'; timeout.timeLeft = 0.01;
  timeout.update(dt, new Player(80, 480));
  assert.equal(timeout.status, 'lost');
});

test('Burger defeats enemies during descent and on impact without repeated score', () => {
  const level = new Level1();
  const player = new Player(2830, 460);
  player.activePower = 'BURGER';
  player.vy = 600;
  level.status = 'playing';
  level.beforeUpdate(player, { ...noInput, down: true });
  const defeated = [];
  const off = events.on('enemyDefeated', data => defeated.push(data));
  try {
    level.update(dt, player);
    assert.equal(level.health, 3);
    assert.ok(defeated.length >= 1);
    player.y = 480; player.vy = 0; player.isGrounded = true;
    level.update(dt, player);
    assert.equal(level.isStomping, false);
    const count = defeated.length;
    level.update(dt, player);
    assert.equal(defeated.length, count);
  } finally { off(); }
});

test('finish awards one time bonus and freezes the level', () => {
  const level = new Level1();
  const seen = [];
  const off = events.on('levelCompleted', event => seen.push(event));
  try {
    level.status = 'playing';
    const player = new Player(4330, 480);
    level.update(dt, player); level.update(dt, player);
    assert.equal(level.status, 'won');
    assert.equal(seen.length, 1);
    assert.ok(seen[0].bonus > 0);
    assert.equal(level.cameraX, level.width - 960);
  } finally { off(); }
});

test('the main route is traversable with real physics and its placed food', () => {
  const level = new Level1();
  // Isolate route geometry; enemy encounters are covered separately above.
  level.enemies = [];
  const player = new Player(80, 480);
  player.isGrounded = true;
  const physics = new Physics();
  const jumps = [520, 1020, 1945, 2380, 2940];
  let nextJump = 0;
  for (let frame = 0; frame < 2400 && level.status !== 'won' && level.status !== 'lost'; frame++) {
    const startJump = nextJump < jumps.length && player.x >= jumps[nextJump] && player.isGrounded;
    if (startJump) nextJump++;
    const input = { ...noInput, right: true, jump: true, jumpJustPressed: startJump };
    level.beforeUpdate(player, input);
    physics.update(player, input, level.obstacles, level.oneWayPlatforms, dt);
    player.update(dt, input, level.enemies);
    level.update(dt, player);
  }
  assert.equal(level.status, 'won', `route stopped at ${player.x}, ${player.y}`);
  assert.equal(level.health, 3, 'main route needs no damage or pit respawns');
  assert.equal(level.checkpoint.active, true);
});

test('power expiry emits the documented payload and clears phasing', () => {
  const manager = new FoodPowerManager();
  const player = new Player();
  const seen = [];
  const off = events.on('powerupExpired', data => seen.push(data));
  try {
    manager.applyPower('DONUT'); manager.update(16, player);
    assert.deepEqual(seen, [{ type: 'DONUT' }]);
    assert.equal(player.isPhasing, false);
    assert.equal(player.activePower, null);
  } finally { off(); }
});

test('audio gracefully works without browser AudioContext and cleans up subscriptions', async () => {
  const sound = new SoundEngine(null);
  await sound.resume();
  events.emit('enemyEaten', {});
  sound.setMuted(true);
  assert.equal(sound.muted, true);
  sound.dispose();
});
