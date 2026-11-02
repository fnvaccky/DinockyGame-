import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/core/Input.js';
import { RewardQueue } from '../src/services/RewardQueue.js';
import { Dinocky3D } from '../src/lobby/Dinocky3D.js';
import { DinockyModel } from '../src/character/DinockyModel.js';
import { GameSession } from '../src/game/GameSession.js';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { CATALOG, HATS, normalizeCosmetics } from '../src/cosmetics.js';

const ACCESSORIES = CATALOG.filter(item => item.kind === 'accessory').map(item => item.id);

// Resolves the app's /models/... URLs against public/, like the dev server does.
async function loadModel(url) {
  const data = await readFile(new URL(`../public${url}`, import.meta.url));
  return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
}
const loadPlush = () => loadModel('/models/dinocky-plush.glb');

function assertWearing(model, ids) {
  for (const key of ACCESSORIES) assert.equal(model.accessories[key].visible, ids.includes(key), `${key} visible with ${ids}`);
  assert.equal(model.headSpikes.visible, !ids.some(id => HATS.includes(id)), `head spikes with ${ids}`);
}
const assertOnlyAccessory = (model, id) => assertWearing(model, id ? [id] : []);

test('approved GLB replaces fallback, retains pending cosmetics and blinks in place', async () => {
  const model = new Dinocky3D(); model.setCosmetics({ color: 'mint', accessory: 'cap' });
  assert.equal(await model.load({ loadAsync: loadModel }), true);
  assert.equal(model.skin.color.getHexString(), '8fcda8');
  assert.deepEqual((await model.accessoriesReady).sort(), [...ACCESSORIES].sort());
  // Only the plush asset remains; the procedural cap and scarf overlays are gone.
  assert.equal(model.rig.children.length, 1); assert.equal(model.eyes.length, 2);
  for (const id of ACCESSORIES) {
    assert.equal(model.accessories[id].parent, model.model);
    assert.equal(model.getObjectByName(`ProceduralAccessory_${id}`), undefined);
  }
  assert.ok(model.cap.visible && !model.headSpikes.visible);
  const positions = model.eyes.map(eye => eye.position.clone());
  model.animate(4.1, false);
  model.eyes.forEach((eye, i) => { assert.equal(eye.scale.y, .09); assert.ok(eye.position.equals(positions[i])); });
  model.animate(4.1, true); model.eyes.forEach(eye => assert.equal(eye.scale.y, 1));
  model.setCosmetics({ color: 'pink', accessory: 'scarf' });
  assert.ok(model.skin.color.equals(model.originalPink)); assert.ok(model.scarf.visible && !model.cap.visible);
  assert.equal(model.getObjectByName('Dinocky_Smile_Game'), undefined);
});

test('failed and late GLB loads leave a safe lifecycle', async () => {
  const failed = new Dinocky3D();
  assert.equal(await failed.load({ loadAsync: async () => { throw new Error('offline'); } }), false);
  assert.ok(failed.rig.children.length > 3);
  assert.deepEqual(await failed.accessoriesReady, []);
  const late = new Dinocky3D(); late.dispose();
  assert.equal(await late.load({ loadAsync: loadModel }), false);
  assert.equal(late.asset, undefined); assert.deepEqual(await late.accessoriesReady, []);
});

test('normalizeCosmetics accepts every catalog accessory and nothing else', () => {
  for (const id of ACCESSORIES) {
    assert.deepEqual(normalizeCosmetics({ accessory: id }).accessories, [id]);
    assert.deepEqual(normalizeCosmetics({ accessories: [id] }).accessories, [id]);
  }
  assert.deepEqual(ACCESSORIES, ['cap', 'scarf', 'bee_hat', 'frog_hat', 'glasses']);
  for (const accessory of ['mint', 'pink', 'crown', '', null, undefined, 42]) {
    assert.deepEqual(normalizeCosmetics({ accessory }).accessories, []);
    assert.deepEqual(normalizeCosmetics({ accessories: [accessory] }).accessories, []);
  }
  assert.deepEqual(normalizeCosmetics({ color: 'nope', accessory: 'glasses' }), { color: 'pink', accessories: ['glasses'] });
  assert.deepEqual(normalizeCosmetics(), { color: 'pink', accessories: [] });
  // One per slot, in drawing order; a later hat replaces an earlier one.
  assert.deepEqual(normalizeCosmetics({ accessories: ['frog_hat', 'glasses', 'scarf', 'cap'] }).accessories, ['scarf', 'glasses', 'cap']);
  assert.deepEqual(normalizeCosmetics({ accessory: 'cap', accessories: ['bee_hat', 'glasses'] }).accessories, ['glasses', 'bee_hat']);
  assert.equal(CATALOG.find(item => item.id === 'scarf').color, '#C62828');
});

test('every accessory toggles alone and head spikes hide only under hats', async () => {
  const fallback = new Dinocky3D();
  const model = new Dinocky3D(); await model.load({ loadAsync: loadModel }); await model.accessoriesReady;
  assert.equal(model.headSpikes.name, 'Dinocky_HeadSpikes_Game');
  for (const target of [fallback, model]) {
    for (const id of [...ACCESSORIES, null]) { target.setCosmetics({ color: 'sky', accessory: id }); assertOnlyAccessory(target, id); }
  }
});

test('a hat, scarf and glasses stack; hats replace each other; glasses drop under the cap', async () => {
  const fallback = new Dinocky3D();
  const model = new Dinocky3D(); await model.load({ loadAsync: loadModel }); await model.accessoriesReady;
  for (const target of [fallback, model]) {
    target.setCosmetics({ accessories: ['bee_hat', 'scarf', 'glasses'] }); assertWearing(target, ['bee_hat', 'scarf', 'glasses']);
    target.setCosmetics({ accessories: ['bee_hat', 'scarf', 'glasses', 'frog_hat'] }); assertWearing(target, ['frog_hat', 'scarf', 'glasses']);
    target.setCosmetics({ accessories: ['scarf', 'glasses'] }); assertWearing(target, ['scarf', 'glasses']);
  }
  model.setCosmetics({ accessories: ['cap', 'glasses'] });
  assert.ok(model.accessories.glasses.position.y < 0 && model.accessories.glasses.position.z > 0);
  model.setCosmetics({ accessories: ['frog_hat', 'glasses'] });
  assert.equal(model.accessories.glasses.position.lengthSq(), 0);
});

test('accessory GLBs sit on the character: hats above the eyes, glasses over them, scarf at the neck', async () => {
  const model = new Dinocky3D(); await model.load({ loadAsync: loadModel }); await model.accessoriesReady;
  model.updateMatrixWorld(true);
  const center = object => new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
  const eyes = model.eyes.map(center), eyeY = (eyes[0].y + eyes[1].y) / 2, eyeZ = (eyes[0].z + eyes[1].z) / 2;
  for (const id of HATS) {
    const hat = new THREE.Box3().setFromObject(model.accessories[id]);
    assert.ok(hat.max.y > eyeY + 0.3 && hat.min.y > 1.8 && Math.abs(center(model.accessories[id]).x) < 0.01, `${id} on the head`);
  }
  const glasses = center(model.accessories.glasses);
  assert.ok(Math.abs(glasses.y - eyeY) < 0.25 && Math.abs(glasses.x) < 0.01, 'glasses level with the eyes');
  const lens = model.accessories.glasses.getObjectsByProperty('isMesh', true).find(mesh => mesh.material.transparent);
  assert.ok(lens && lens.material.opacity < 0.5, 'lenses alpha blend');
  assert.ok(new THREE.Box3().setFromObject(model.accessories.glasses).max.z > eyeZ, 'glasses in front of the eyes');
  const scarf = center(model.accessories.scarf);
  assert.ok(scarf.y < eyeY - 0.5 && scarf.y > 0.8, 'scarf at the neck');
});

test('one failed accessory keeps its fallback; late accessory loads after dispose are released', async () => {
  const partial = new Dinocky3D();
  await partial.load({ loadAsync: url => url.includes('glasses') ? Promise.reject(new Error('offline')) : loadModel(url) });
  assert.deepEqual((await partial.accessoriesReady).sort(), ACCESSORIES.filter(id => id !== 'glasses').sort());
  assert.equal(partial.accessories.glasses.name, 'ProceduralAccessory_glasses');
  partial.setCosmetics({ accessory: 'glasses' }); assertOnlyAccessory(partial, 'glasses');

  let release; const gate = new Promise(resolve => { release = resolve; });
  const late = new Dinocky3D(), lateScenes = []; let disposed = 0, geometries = 0;
  await late.load({ loadAsync: async url => {
    if (url.endsWith('dinocky-plush.glb')) return loadModel(url);
    const gltf = await loadModel(url);
    gltf.scene.traverse(object => { if (object.geometry) { geometries++; object.geometry.addEventListener('dispose', () => disposed++); } });
    await gate; lateScenes.push(gltf.scene); return gltf;
  } });
  late.dispose(); release();
  assert.deepEqual(await late.accessoriesReady, []);
  assert.equal(lateScenes.length, ACCESSORIES.length);
  for (const scene of lateScenes) assert.equal(scene.parent, null);
  assert.ok(geometries > 0); assert.equal(disposed, geometries);
  for (const id of ACCESSORIES) assert.equal(late.accessories[id].name, `ProceduralAccessory_${id}`);
});

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
  for (const accessory of ACCESSORIES) {
    const flat = new DinockyModel(); flat.cosmetics = { color: 'pink', accessory };
    const calls = []; const ctx = new Proxy({}, { get: (target, key) => key in target ? target[key] : (...args) => { calls.push(key); return { addColorStop() {} }; }, set: (target, key, value) => { target[key] = value; return true; } });
    globalThis.Path2D ??= class { moveTo() {} lineTo() {} quadraticCurveTo() {} closePath() {} };
    flat.render(ctx, { x: 0, y: 0, scale: 1, facing: 1, action: 'idle' });
    assert.ok(calls.length > 20, `${accessory} draws`);
  }
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
