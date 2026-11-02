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
    // Flyers patrol the air above solid ground instead of standing on a surface.
    if (enemy.isFlying) {
      assert.ok(level.obstacles.some(o => o.type === 'ground' && o.x <= enemy.patrolLeft && o.x + o.w >= enemy.patrolRight));
      continue;
    }
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

test('Level 2 and Level 3 provide rich worlds, new enemies, jelly pads and star treats', async () => {
  const { Level2 } = await import('../src/levels/Level2.js');
  const { Level3 } = await import('../src/levels/Level3.js');
  const { BerryBouncer, ChocoCritter, setPatrol } = await import('../src/enemies/VeggieEnemies.js');

  const l2 = new Level2();
  assert.equal(l2.name, 'World 1-2');
  assert.equal(l2.width, 4640);
  assert.ok(l2.bouncePads.length >= 3);
  assert.ok(l2.treats.length >= 6);
  assert.ok(l2.enemies.some(e => e instanceof BerryBouncer));

  const l3 = new Level3();
  assert.equal(l3.name, 'World 1-3');
  assert.equal(l3.width, 4800);
  assert.ok(l3.treats.length >= 8);
  assert.ok(l3.enemies.some(e => e instanceof ChocoCritter));

  // Verify new enemies
  for (const EnemyType of [BerryBouncer, ChocoCritter]) {
    const enemy = setPatrol(new EnemyType(100, 100), 80, 220);
    assert.equal(enemy.isEdible, true);
    for (let i = 0; i < 300; i++) {
      enemy.update(dt);
      assert.ok(enemy.x >= 80 && enemy.x + enemy.w <= 220);
    }
  }

  // Verify jelly pad bounce
  const pad = l2.bouncePads[0];
  const player = new Player(pad.x + 10, pad.y);
  player.vy = 200;
  l2.update(dt, player);
  assert.ok(player.vy < -600, 'Jelly pad should launch player upward');
});

test('thrill enemies charge, lob and swoop at Dinocky', async () => {
  const { ChargerCarrot, BroccoliLobber, SwoopBee } = await import('../src/enemies/ThrillEnemies.js');
  const level = { popups: [], projectiles: [], addPopup() {}, spawnProjectile(p) { this.projectiles.push(p); } };
  const charger = setPatrol(new ChargerCarrot(400, 444), 200, 700);
  const player = new Player(250, 480);
  let fastest = 0;
  for (let i = 0; i < 180; i++) {
    charger.think(dt, player, level); charger.update(dt);
    fastest = Math.max(fastest, Math.abs(charger.vx));
    assert.ok(charger.x >= 200 && charger.x + charger.w <= 700);
  }
  assert.ok(fastest >= 300, 'charger dashes once it spots Dinocky ahead');

  const lobber = new BroccoliLobber(600, 442);
  for (let i = 0; i < 200; i++) lobber.think(dt, player, level);
  assert.ok(level.projectiles.length >= 1);
  const shot = level.projectiles[0];
  // Following the arc for one second lands the floret on Dinocky.
  assert.ok(Math.abs(shot.x + shot.vx - player.x) < 1 && Math.abs(shot.y + shot.vy + shot.gravity / 2 - (player.y - 24)) < 1);

  const bee = setPatrol(new SwoopBee(240, 250), 150, 400);
  let lowest = bee.y;
  for (let i = 0; i < 300; i++) { bee.think(dt, player); bee.update(dt); lowest = Math.max(lowest, bee.y); }
  assert.ok(lowest > 400, 'bee dives toward Dinocky');
  assert.ok(bee.isFlying && bee.isEdible);
});

test('moving platforms carry riders, wafers crumble and regrow, pop-up spikes cycle', async () => {
  const { Level2 } = await import('../src/levels/Level2.js');
  const level = new Level2(); level.status = 'playing';
  const mover = level.movers[0], player = new Player(mover.x + 40, mover.y);
  player.isGrounded = true;
  const offset = player.x - mover.x;
  for (let i = 0; i < 60; i++) level.update(dt, player);
  assert.ok(mover.x > mover.baseX + 10 && Math.abs(player.x - mover.x - offset) < 0.01 && player.y === mover.y);

  const wafer = level.crumblers[0], standing = new Player(wafer.x + 50, wafer.y);
  standing.isGrounded = true;
  const fresh = new Level2(); fresh.status = 'playing';
  const freshWafer = fresh.crumblers[0];
  for (let i = 0; i < 50; i++) fresh.update(dt, standing);
  assert.equal(freshWafer.state, 'gone'); assert.ok(!fresh.oneWayPlatforms.includes(freshWafer));
  for (let i = 0; i < 200; i++) fresh.update(dt, new Player(80, 480));
  assert.equal(freshWafer.state, 'solid'); assert.ok(fresh.oneWayPlatforms.includes(freshWafer));

  const spikes = level.hazards.find(h => h.cycle), seen = new Set();
  for (let i = 0; i < 200; i++) { level.update(dt, new Player(80, 480)); seen.add(`${spikes.active}/${spikes.warning}`); }
  assert.ok(seen.has('true/false') && seen.has('false/true') && seen.has('false/false'));
  assert.equal(wafer.x, 920);
});

test('Hard Mode: one heart, no checkpoint, faster enemies', async () => {
  const { createLevel } = await import('../src/levels/LevelRegistry.js');
  const normal = createLevel('1-1'), hard = createLevel('1-1', { hard: true });
  assert.deepEqual([normal.health, hard.health, hard.maxHealth], [3, 1, 1]);
  assert.ok(hard.checkpoint.disabled && !normal.checkpoint.disabled);
  hard.enemies.forEach((enemy, i) => assert.ok(Math.abs(enemy.vx) > Math.abs(normal.enemies[i].vx)));
  const player = new Player(80, 480); hard.status = 'playing'; hard.hurt(player);
  assert.equal(hard.status, 'lost');
  player.x = 2500; player.y = 480; player.isGrounded = true; hard.status = 'playing';
  hard.update(dt, player); assert.equal(hard.checkpoint.active, false);
});

test('Sir Oinksalot charges, gets dizzy, can only be chomped while dizzy, and leaves the flag behind', async () => {
  const { createLevel } = await import('../src/levels/LevelRegistry.js');
  for (const hard of [false, true]) {
    const level = createLevel('1-4', { hard }), boss = level.boss, physics = new Physics();
    const player = new Player(1300, 480); player.isGrounded = true; level.status = 'playing';
    assert.equal(boss.maxHp, hard ? 4 : 3);
    const states = new Set();
    let chompedTooEarly = false;
    for (let frame = 0; frame < 60 * 120 && level.status === 'playing'; frame++) {
      if (boss.state === 'dizzy') {
        // Stand next to the dizzy pig, facing it, and chomp.
        const right = boss.x + boss.w / 2 < 1680;
        player.x = right ? boss.x + boss.w + 30 : boss.x - 30; player.y = 480; player.facing = right ? -1 : 1;
        player.powerManager.chompCooldown = 0; player.powerManager.triggerChomp(player, level.enemies);
      } else if (boss.state !== 'defeated' && boss.isAlive) {
        // Wait on the ledge away from the pig; chomping now must not hurt him.
        player.x = boss.x + boss.w / 2 > 1680 ? 1290 : 2070; player.y = 360;
        if (boss.state === 'windup') {
          const hp = boss.hp; player.powerManager.chompCooldown = 0; player.powerManager.triggerChomp(player, level.enemies);
          chompedTooEarly ||= boss.hp !== hp;
        }
      } else if (level.goal.w) { player.x = level.goal.x + 10; player.y = 480; }
      player.vy = 0; player.isGrounded = true;
      level.beforeUpdate(player, noInput);
      physics.update(player, noInput, level.obstacles, level.oneWayPlatforms, dt);
      player.update(dt, noInput, level.enemies);
      level.update(dt, player);
      states.add(boss.state);
      if (level.arenaLocked) assert.equal(level.cameraX, 1200);
    }
    assert.equal(level.status, 'won', `boss fight ended in ${level.status}`);
    assert.equal(chompedTooEarly, false);
    for (const state of ['intro', 'windup', 'charge', 'dizzy', 'hurt', 'leap', 'defeated']) assert.ok(states.has(state), state);
    assert.ok(level.obstacles.includes(level.gate), 'the arena gate closes');
  }
});
