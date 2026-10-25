import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, asUser, rpc, ageRun, USER_A, USER_B } from './database-fixture.js';

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
      await assert.rejects(rpc(db, 'finish_run', [runId, 9000, 40, true]), /Invalid run result/);
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
