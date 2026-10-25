const ACTIONS = { left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', jump: 'Space', chomp: 'KeyX' };
const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyZ', 'KeyX', 'KeyE', 'Enter', 'ShiftLeft', 'ShiftRight', 'KeyC', 'KeyP', 'KeyR']);
export class Input {
  constructor(target = globalThis.window, { enabled = true } = {}) {
    this.keys = new Set(); this.justPressed = new Set(); this.justReleased = new Set();
    this.keyboard = new Set(); this.pointers = new Map(); this.enabled = enabled; this.cleanups = [];
    this.listen(target, 'keydown', e => {
      if (!this.enabled || this.isEditing(e.target) || !GAME_KEYS.has(e.code)) return;
      e.preventDefault(); this.keyboard.add(e.code); this.press(e.code);
    });
    this.listen(target, 'keyup', e => { this.keyboard.delete(e.code); this.releaseIfUnused(e.code); });
    this.listen(target, 'blur', () => this.clear());
  }
  isEditing(target) { return Boolean(target?.closest?.('input, textarea, select, button, [contenteditable="true"]')); }
  listen(target, name, callback, options) {
    target?.addEventListener(name, callback, options);
    this.cleanups.push(() => target?.removeEventListener(name, callback, options));
  }
  press(code) { if (!this.keys.has(code)) this.justPressed.add(code); this.keys.add(code); }
  releaseIfUnused(code) {
    if (this.keyboard.has(code) || [...this.pointers.values()].includes(code)) return;
    if (this.keys.delete(code)) this.justReleased.add(code);
  }
  pointerDown(id, action) {
    if (!this.enabled || !ACTIONS[action]) return;
    this.pointerUp(id); this.pointers.set(id, ACTIONS[action]); this.press(ACTIONS[action]);
  }
  pointerUp(id) { const code = this.pointers.get(id); this.pointers.delete(id); if (code) this.releaseIfUnused(code); }
  bindTouch(root) {
    for (const button of root.querySelectorAll('[data-control]')) {
      this.listen(button, 'pointerdown', e => {
        if (!this.enabled) return;
        e.preventDefault(); button.setPointerCapture(e.pointerId); button.dataset.held = 'true';
        this.pointerDown(e.pointerId, button.dataset.control);
      });
      const release = e => { this.pointerUp(e.pointerId); delete button.dataset.held; };
      this.listen(button, 'pointerup', release); this.listen(button, 'pointercancel', release); this.listen(button, 'lostpointercapture', release);
    }
    this.touchRoot = root;
  }
  setEnabled(value) { this.enabled = value; this.clear(); }
  clear() {
    this.keys.clear(); this.keyboard.clear(); this.pointers.clear(); this.justPressed.clear(); this.justReleased.clear();
    this.touchRoot?.querySelectorAll('[data-held]').forEach(button => delete button.dataset.held);
  }
  update() { this.justPressed.clear(); this.justReleased.clear(); }
  dispose() { this.clear(); this.cleanups.forEach(cleanup => cleanup()); this.cleanups = []; }
  get left() { return this.keys.has('ArrowLeft') || this.keys.has('KeyA'); }
  get right() { return this.keys.has('ArrowRight') || this.keys.has('KeyD'); }
  get up() { return this.keys.has('ArrowUp') || this.keys.has('KeyW'); }
  get down() { return this.keys.has('ArrowDown') || this.keys.has('KeyS'); }
  get jump() { return ['Space', 'ArrowUp', 'KeyW', 'KeyZ'].some(key => this.keys.has(key)); }
  get jumpJustPressed() { return ['Space', 'ArrowUp', 'KeyW', 'KeyZ'].some(key => this.justPressed.has(key)); }
  get action() { return ['KeyX', 'KeyE', 'Enter'].some(key => this.keys.has(key)); }
  get actionJustPressed() { return ['KeyX', 'KeyE', 'Enter'].some(key => this.justPressed.has(key)); }
  get dash() { return ['ShiftLeft', 'ShiftRight', 'KeyC'].some(key => this.keys.has(key)); }
  get dashJustPressed() { return ['ShiftLeft', 'ShiftRight', 'KeyC'].some(key => this.justPressed.has(key)); }
  get dropThrough() { return this.down && this.jumpJustPressed; }
}
