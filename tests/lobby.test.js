import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/core/Input.js';
import { RewardQueue } from '../src/services/RewardQueue.js';
import { Dinocky3D } from '../src/lobby/Dinocky3D.js';
import { DinockyModel } from '../src/character/DinockyModel.js';
import { GameSession } from '../src/game/GameSession.js';

test('touch holds combine, release independently, and clear on disabling', () => {
  const input = new Input(null);
  input.pointerDown(1, 'right'); input.pointerDown(2, 'jump');
  assert.ok(input.right && input.jump && input.jumpJustPressed);
  input.update(); assert.equal(input.jumpJustPressed, false);
  input.pointerUp(2); assert.ok(input.right && !input.jump);
  input.pointerDown(3, 'down'); input.pointerDown(4, 'jump'); assert.ok(input.dropThrough);
  input.setEnabled(false); assert.equal(input.keys.size, 0);
  input.pointerDown(5, 'chomp'); assert.equal(input.action, false);
  input.dispose();
});
test('form fields keep their keys and disabled menus ignore gameplay input', () => {
  const target = new EventTarget(), input = new Input(target);
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperties(event, { code: { value: 'Space' }, target: { value: { closest: () => true } } });
  target.dispatchEvent(event); assert.equal(input.jump, false); assert.equal(event.defaultPrevented, false);
  input.setEnabled(false);
  const disabled = new Event('keydown', { cancelable: true }); Object.defineProperty(disabled, 'code', { value: 'KeyX' });
  target.dispatchEvent(disabled); assert.equal(input.action, false); input.dispose();
});
test('pending run results survive failure and remain isolated by account', async () => {
  const map = new Map(), storage = { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) };
  const queue = new RewardQueue(storage), result = { runId: 'run-1', completed: true, elapsed: 40, score: 2000 };
  queue.add('a', result); queue.add('a', result); assert.equal(queue.read('a').length, 1); assert.equal(queue.read('b').length, 0);
  await queue.flush('a', () => { throw new Error('offline'); }); assert.equal(queue.read('a').length, 1);
  const receipts = await new RewardQueue(storage).flush('a', async () => ({ reward: 100 }));
  assert.equal(receipts[0].reward, 100); assert.equal(queue.read('a').length, 0);
});
test('storage-disabled retries still retain a session copy', () => {
  const queue = new RewardQueue({ getItem: () => null, setItem: () => { throw new Error('full'); } });
  queue.add('a', { runId: 'one' }); assert.equal(queue.read('a').length, 1);
});
test('3D and 2D cosmetics share valid identities; mesh remains finite', () => {
  const model = new Dinocky3D(); model.setCosmetics({ color: 'mint', accessory: 'cap' });
  assert.equal(model.skin.color.getHexString(), '8fcda8'); assert.ok(model.cap.visible && !model.scarf.visible);
  model.setCosmetics({ color: 'sky', accessory: 'scarf' }); assert.ok(!model.cap.visible && model.scarf.visible);
  model.animate(3, true); assert.equal(model.rig.scale.y, 1);
  model.traverse(object => { if (object.geometry) assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite)); });
  const flat = new DinockyModel(); flat.cosmetics = { color: 'sky', accessory: 'scarf' }; assert.equal(flat.cosmetics.color, 'sky');
  model.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
});
test('game lifecycle starts one loop, pauses input, restores cosmetics, and disposes listeners', () => {
  const original = { window: globalThis.window, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame };
  const frames = new Set(); let id = 0;
  globalThis.window = new EventTarget(); globalThis.requestAnimationFrame = () => { frames.add(++id); return id; }; globalThis.cancelAnimationFrame = n => frames.delete(n);
  try {
    const game = new GameSession({ getContext: () => ({}) });
    game.start('one', { color: 'mint', accessory: 'cap' }); assert.equal(frames.size, 1);
    game.resume(); assert.equal(frames.size, 1);
    game.pause(); assert.equal(frames.size, 0); assert.equal(game.input.enabled, false);
    game.start('two', { color: 'sky' }); assert.equal(game.player.model.cosmetics.color, 'sky');
    game.dispose(); assert.equal(frames.size, 0);
  } finally { Object.assign(globalThis, original); }
});
