import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, asUser, rpc, ageRun, USER_A, USER_B } from './database-fixture.js';
import { CATALOG } from '../src/cosmetics.js';

test('database account isolation, reward integrity, and atomic inventory operations', async t => {
  const db = await createDatabase();
  try {
    await asUser(db, USER_A);
    await t.test('signup trigger creates a zero-coin profile and default outfit', async () => {
      const snapshot = await rpc(db, 'game_snapshot');
      assert.equal(snapshot.profile.coins, 0); assert.equal(snapshot.profile.display_name, 'Snack Explorer');
      assert.deepEqual(snapshot.owned, ['pink']);
    });
    await t.test('users cannot read other profiles or directly write balances', async () => {
      assert.equal((await db.query('select * from public.profiles')).rows.length, 1);
      assert.equal((await db.query('select * from public.profiles where user_id=$1', [USER_B])).rows.length, 0);
      await assert.rejects(db.exec('update public.profiles set coins=9999'), /permission denied/);
      await assert.rejects(db.exec(`insert into public.owned_cosmetics values ('${USER_A}','cap',now())`), /permission denied/);
    });
    await t.test('insufficient coins, unowned equipment, and invalid items are rejected', async () => {
      await assert.rejects(rpc(db, 'purchase_cosmetic', ['mint']), /Not enough coins/);
      await assert.rejects(rpc(db, 'equip_cosmetic', ['cap']), /Buy this item/);
      await assert.rejects(rpc(db, 'purchase_cosmetic', ['made-up']), /Item not found/);
    });
    const runId = await rpc(db, 'start_run');
    await t.test('other accounts cannot submit a run they do not own', async () => {
      await asUser(db, USER_B);
      await assert.rejects(rpc(db, 'finish_run', [runId, 2000, 40, true]), /Run not found/);
      await asUser(db, USER_A);
    });
    await t.test('impossible elapsed times and scores are rejected', async () => {
      await assert.rejects(rpc(db, 'finish_run', [runId, 2000, 2, true]), /Invalid completion time/);
      await assert.rejects(rpc(db, 'finish_run', [runId, 25000, 40, true]), /Invalid run result/);
    });
    await ageRun(db, runId);
    await t.test('first clear gives 100 once, retries return the same receipt', async () => {
      const first = await rpc(db, 'finish_run', [runId, 2000, 40, true]);
      const retry = await rpc(db, 'finish_run', [runId, 2000, 40, true]);
      assert.equal(first.reward, 100); assert.equal(retry.reward, 100);
      assert.equal(retry.snapshot.profile.coins, 100);
      assert.equal(retry.snapshot.progress[0].clears, 1);
    });
    await t.test('duplicate purchases deduct once; owned cosmetics equip independently', async () => {
      await Promise.all([rpc(db, 'purchase_cosmetic', ['mint']), rpc(db, 'purchase_cosmetic', ['mint'])]);
      const snapshot = await rpc(db, 'equip_cosmetic', ['mint']);
      assert.equal(snapshot.profile.coins, 25); assert.equal(snapshot.profile.equipped_color, 'mint');
      assert.equal(snapshot.owned.filter(id => id === 'mint').length, 1);
    });
    await t.test('replay gives 25; loss gives zero; progress keeps personal best', async () => {
      const replay = await rpc(db, 'start_run'); await ageRun(db, replay);
      const receipt = await rpc(db, 'finish_run', [replay, 1500, 35, true]);
      assert.equal(receipt.reward, 25); assert.equal(receipt.snapshot.profile.coins, 50);
      assert.equal(receipt.snapshot.progress[0].best_score, 2000); assert.equal(Number(receipt.snapshot.progress[0].best_time), 35);
      const loss = await rpc(db, 'start_run');
      assert.equal((await rpc(db, 'finish_run', [loss, 0, 5, false])).reward, 0);
    });
    await t.test('second account stays independent and anonymous API calls are denied', async () => {
      await asUser(db, USER_B); assert.equal((await rpc(db, 'game_snapshot')).profile.coins, 0);
      await db.exec('reset role; set role anon');
      await assert.rejects(rpc(db, 'game_snapshot'), /permission denied/);
      await assert.rejects(rpc(db, 'start_run'), /permission denied/);
    });
  } finally { await db.close(); }
});

test('each level is recorded on its own; the boss pays double and Hard Mode doubles again', async () => {
  const db = await createDatabase();
  try {
    await asUser(db, USER_A);
    const clear = async (level, hard, score = 3000) => {
      const id = await rpc(db, 'start_run', [level, hard]); await ageRun(db, id);
      return rpc(db, 'finish_run', [id, score, 60, true]);
    };
    assert.equal((await clear('1-2', false)).reward, 100);
    assert.equal((await clear('1-2', false)).reward, 25);
    assert.equal((await clear('1-3', true)).reward, 200);
    assert.equal((await clear('1-4', false)).reward, 200);
    let receipt = await clear('1-4', true, 12000);
    assert.equal(receipt.reward, 100);
    const boss = receipt.snapshot.progress.find(p => p.level_id === '1-4');
    assert.deepEqual([boss.clears, boss.hard_clears, boss.best_score], [2, 1, 12000]);
    assert.equal(receipt.snapshot.progress.find(p => p.level_id === '1-1'), undefined);
    assert.equal(receipt.snapshot.profile.coins, 625);
    await assert.rejects(rpc(db, 'start_run', ['9-9', false]), /Level not found/);
    // Older clients still start a normal 1-1 run without arguments.
    const legacy = await rpc(db, 'start_run'); await ageRun(db, legacy);
    receipt = await rpc(db, 'finish_run', [legacy, 1000, 50, true]);
    assert.equal(receipt.reward, 100); assert.ok(receipt.snapshot.progress.some(p => p.level_id === '1-1'));
  } finally { await db.close(); }
});

test('new accessories match the client catalog and stack one per slot', async () => {
  const db = await createDatabase();
  try {
    await asUser(db, USER_A);
    const rows = (await db.query('select id, name, kind, price from public.cosmetics order by id')).rows;
    assert.deepEqual(rows, CATALOG.map(({ id, name, kind, price }) => ({ id, name, kind, price })).sort((a, b) => a.id.localeCompare(b.id)));
    await rpc(db, 'game_snapshot');
    await db.exec('reset role');
    await db.query('update public.profiles set coins = 500 where user_id = $1', [USER_A]);
    await asUser(db, USER_A);
    await assert.rejects(rpc(db, 'equip_cosmetic', ['bee_hat']), /Buy this item/);
    let snapshot = await rpc(db, 'purchase_cosmetic', ['bee_hat']);
    assert.equal(snapshot.profile.coins, 300); assert.ok(snapshot.owned.includes('bee_hat'));
    snapshot = await rpc(db, 'equip_cosmetic', ['bee_hat']);
    assert.equal(snapshot.profile.equipped_hat, 'bee_hat');
    await rpc(db, 'purchase_cosmetic', ['glasses']);
    snapshot = await rpc(db, 'equip_cosmetic', ['glasses']);
    assert.equal(snapshot.profile.coins, 175);
    assert.equal(snapshot.profile.equipped_hat, 'bee_hat'); assert.equal(snapshot.profile.equipped_face, 'glasses');
    await assert.rejects(rpc(db, 'purchase_cosmetic', ['frog_hat']), /Not enough coins/);
    await db.exec('reset role'); await db.query('update public.profiles set coins = 500 where user_id = $1', [USER_A]); await asUser(db, USER_A);
    await rpc(db, 'purchase_cosmetic', ['scarf']); await rpc(db, 'purchase_cosmetic', ['cap']);
    snapshot = await rpc(db, 'equip_cosmetic', ['scarf']);
    assert.deepEqual([snapshot.profile.equipped_hat, snapshot.profile.equipped_neck, snapshot.profile.equipped_face], ['bee_hat', 'scarf', 'glasses']);
    // A second hat replaces the first; the scarf and glasses stay on.
    snapshot = await rpc(db, 'equip_cosmetic', ['cap']);
    assert.deepEqual([snapshot.profile.equipped_hat, snapshot.profile.equipped_neck, snapshot.profile.equipped_face], ['cap', 'scarf', 'glasses']);
    snapshot = await rpc(db, 'unequip_cosmetic', ['glasses']);
    assert.deepEqual([snapshot.profile.equipped_hat, snapshot.profile.equipped_neck, snapshot.profile.equipped_face], ['cap', 'scarf', null]);
    assert.ok(!('equipped_accessory' in snapshot.profile));
    // Outfits take the body slot under everything else; a second outfit replaces the first.
    const slots = (await db.query("select id, slot from public.cosmetics where kind = 'accessory' order by id")).rows;
    assert.deepEqual(slots, CATALOG.filter(item => item.kind === 'accessory').map(({ id, slot }) => ({ id, slot })).sort((a, b) => a.id.localeCompare(b.id)));
    await db.exec('reset role'); await db.query('update public.profiles set coins = 600 where user_id = $1', [USER_A]); await asUser(db, USER_A);
    await rpc(db, 'purchase_cosmetic', ['suit']); snapshot = await rpc(db, 'purchase_cosmetic', ['hoodie']);
    assert.equal(snapshot.profile.coins, 50);
    // An outfit takes the scarf off (and the scarf takes the outfit off); the hat stays on.
    snapshot = await rpc(db, 'equip_cosmetic', ['suit']);
    assert.deepEqual([snapshot.profile.equipped_body, snapshot.profile.equipped_hat, snapshot.profile.equipped_neck], ['suit', 'cap', null]);
    snapshot = await rpc(db, 'equip_cosmetic', ['scarf']);
    assert.deepEqual([snapshot.profile.equipped_body, snapshot.profile.equipped_hat, snapshot.profile.equipped_neck], [null, 'cap', 'scarf']);
    await rpc(db, 'equip_cosmetic', ['suit']);
    snapshot = await rpc(db, 'equip_cosmetic', ['hoodie']);
    assert.equal(snapshot.profile.equipped_body, 'hoodie');
    snapshot = await rpc(db, 'unequip_cosmetic', ['hoodie']);
    assert.deepEqual([snapshot.profile.equipped_body, snapshot.profile.equipped_hat], [null, 'cap']);
    await rpc(db, 'equip_cosmetic', ['suit']);
    snapshot = await rpc(db, 'equip_cosmetic', [null]);
    assert.deepEqual([snapshot.profile.equipped_hat, snapshot.profile.equipped_neck, snapshot.profile.equipped_face, snapshot.profile.equipped_body], [null, null, null, null]);
    await db.exec('reset role; set role anon');
    await assert.rejects(rpc(db, 'unequip_cosmetic', ['cap']), /permission denied/);
  } finally { await db.close(); }
});
