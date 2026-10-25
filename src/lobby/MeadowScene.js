import * as THREE from 'three';
import { Dinocky3D } from './Dinocky3D.js';
import { DinockyModel } from '../character/DinockyModel.js';

export class MeadowScene {
  constructor(host, { forceFallback = false } = {}) {
    this.host = host; this.time = 0; this.running = false; this.reducedMotion = false;
    this.dragUntil = 0; this.angle = -0.25; this.ambient = []; this.abort = new AbortController();
    this.scene = new THREE.Scene();
    try {
      if (forceFallback) throw new Error('Fallback requested');
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
      this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
      this.canvas = this.renderer.domElement; host.append(this.canvas);
      this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
      this.scene.add(new THREE.HemisphereLight('#FFF8E7', '#A0BD86', 2.7));
      const sun = new THREE.DirectionalLight('#FFF2D2', 3.7); sun.position.set(-4, 8, 6);
      sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); sun.shadow.bias = -0.001;
      this.scene.add(sun);
      this.model = new Dinocky3D(); this.model.position.y = 0.15; this.scene.add(this.model);
      this.buildMeadow();
      this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.showFallback(); }, { signal: this.abort.signal });
    } catch { this.showFallback(); }
    this.canvas.setAttribute('aria-label', this.renderer ? 'Dinocky in Snack Meadow. Drag to turn him around.' : 'Dinocky in Snack Meadow, 2D preview.');
    this.canvas.setAttribute('role', 'img');
    this.canvas.addEventListener('pointerdown', e => {
      this.pointer = { id: e.pointerId, x: e.clientX }; this.canvas.setPointerCapture(e.pointerId); this.dragUntil = Infinity;
    }, { signal: this.abort.signal });
    this.canvas.addEventListener('pointermove', e => {
      if (this.pointer?.id !== e.pointerId) return;
      this.angle += (e.clientX - this.pointer.x) * 0.009; this.pointer.x = e.clientX;
    }, { signal: this.abort.signal });
    const release = () => { this.pointer = null; this.dragUntil = this.time + 3; };
    this.canvas.addEventListener('pointerup', release, { signal: this.abort.signal });
    this.canvas.addEventListener('pointercancel', release, { signal: this.abort.signal });
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
  }
  material(color) { return new THREE.MeshStandardMaterial({ color, roughness: 0.9 }); }
  mesh(geometry, color, position, parent = this.scene) {
    const mesh = new THREE.Mesh(geometry, this.material(color)); mesh.position.set(...position);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  ball(color, position, scale, parent = this.scene) {
    const mesh = this.mesh(new THREE.SphereGeometry(1, 16, 12), color, position, parent); mesh.scale.set(...scale); return mesh;
  }
  buildMeadow() {
    this.mesh(new THREE.CylinderGeometry(2.48, 2.1, 0.65, 64), '#B9804D', [0, -0.36, 0]);
    this.mesh(new THREE.CylinderGeometry(2.55, 2.48, 0.22, 64), '#96BB65', [0, 0.04, 0]);
    this.mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.025, 48), '#B2CD80', [0, 0.165, 0.2]);
    for (let i = 0; i < 30; i++) {
      const a = i * Math.PI * 2 / 30;
      this.ball(i % 3 ? '#CE9A66' : '#A66B42', [Math.cos(a) * 2.31, -0.33, Math.sin(a) * 2.31], [0.11, 0.16, 0.08]);
    }
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4, r = 1.7 + (i % 3) * 0.18, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (z > 0.4 && Math.abs(x) < 0.8) continue;
      const flower = new THREE.Group(); flower.position.set(x, 0.17, z); this.scene.add(flower);
      this.mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.28, 6), '#64874B', [0, 0.14, 0], flower);
      const color = i % 2 ? '#FFF4CB' : '#F2A7B5';
      for (let j = 0; j < 5; j++) this.ball(color, [Math.cos(j * 1.257) * 0.085, 0.3 + Math.sin(j * 1.257) * 0.085, 0], [0.065, 0.065, 0.045], flower);
      this.ball('#E6B74F', [0, 0.3, 0.04], [0.045, 0.045, 0.04], flower);
      this.ambient.push({ object: flower, kind: 'flower', offset: i });
    }
    for (const [x, y, z, size] of [[-3.8, 3.3, -2, 0.6], [3.5, 3.6, -3, 0.8], [-1.8, 4.2, -4, 0.45]]) {
      const cloud = new THREE.Group(); cloud.position.set(x, y, z); this.scene.add(cloud);
      for (const [dx, dy, s] of [[0, 0, 1], [-0.7, -0.15, 0.75], [0.7, -0.15, 0.7]]) this.ball('#FFF9EE', [dx * size, dy * size, 0], [size * s, size * s * 0.65, size * s * 0.5], cloud);
      this.ambient.push({ object: cloud, kind: 'cloud', x, offset: y });
    }
    for (const [x, y, z, food] of [[-2.8, 1.1, -0.4, 'donut'], [2.7, 1.65, -1.2, 'pizza']]) {
      const island = new THREE.Group(); island.position.set(x, y, z); this.scene.add(island);
      this.mesh(new THREE.CylinderGeometry(0.54, 0.45, 0.18, 32), '#E5B57E', [0, 0, 0], island);
      this.mesh(new THREE.CylinderGeometry(0.55, 0.54, 0.08, 32), '#EEA2B3', [0, 0.12, 0], island);
      if (food === 'donut') {
        this.mesh(new THREE.TorusGeometry(0.21, 0.095, 16, 32), '#EAB87D', [0, 0.47, 0], island);
        this.mesh(new THREE.TorusGeometry(0.21, 0.072, 16, 32), '#E588AA', [0, 0.47, 0.06], island);
        for (let j = 0; j < 8; j++) this.ball(j % 2 ? '#FFF1B6' : '#9ED6CE', [Math.cos(j) * 0.21, 0.47 + Math.sin(j) * 0.21, 0.13], [0.025, 0.012, 0.01], island);
      } else {
        const shape = new THREE.Shape(); shape.moveTo(0, -0.2); shape.lineTo(-0.27, 0.27); shape.quadraticCurveTo(0, 0.4, 0.27, 0.27); shape.closePath();
        this.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, steps: 1 }), '#F1C351', [0, 0.48, 0], island);
        for (const [px, py] of [[0, 0.44], [-0.13, 0.63], [0.1, 0.66]]) this.ball('#BC5C48', [px, py, 0.09], [0.055, 0.055, 0.015], island);
      }
      this.ambient.push({ object: island, kind: 'float', y, offset: x });
    }
    const butterfly = new THREE.Group(); this.scene.add(butterfly);
    for (const side of [-1, 1]) this.ball('#F5CE6F', [side * 0.09, 0, 0], [0.09, 0.13, 0.025], butterfly);
    this.ambient.push({ object: butterfly, kind: 'butterfly', offset: 0 });
  }
  showFallback() {
    this.renderer?.dispose(); this.renderer = null;
    if (this.canvas) this.canvas.remove();
    this.canvas = document.createElement('canvas'); this.host.append(this.canvas);
    this.fallback = new DinockyModel(); this.fallback.cosmetics = this.cosmetics || {};
    this.host.dataset.renderer = 'canvas';
    const hint = this.host.parentElement.querySelector('.drag-hint');
    if (hint) hint.hidden = true;
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Dinocky in Snack Meadow, 2D preview.');
  }
  resize() {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    for (const item of this.ambient) if (item.kind === 'cloud') item.object.position.x = innerWidth < 650 && item.x > 0 ? 1.5 : item.x;
    if (this.renderer) {
      this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
      this.camera.position.set(3.5, 3.4, 11.3);
      if (w / h < 1) this.camera.position.multiplyScalar(1.12);
      this.camera.lookAt(0, 1.65, 0); this.camera.updateProjectionMatrix();
      this.host.dataset.renderer = 'webgl';
    } else { this.canvas.width = w * 1.5; this.canvas.height = h * 1.5; }
    this.draw();
  }
  setCosmetics(value) { this.cosmetics = value; this.model?.setCosmetics(value); if (this.fallback) this.fallback.cosmetics = value; }
  setReducedMotion(value) { this.reducedMotion = value; }
  draw() {
    if (this.renderer) {
      this.model.rotation.y = this.angle; this.model.animate(this.time, this.reducedMotion);
      if (!this.reducedMotion) for (const item of this.ambient) {
        const t = this.time + item.offset;
        if (item.kind === 'cloud') item.object.position.x = (innerWidth < 650 && item.x > 0 ? 1.5 : item.x) + Math.sin(t * 0.18) * 0.25;
        if (item.kind === 'flower') item.object.rotation.z = Math.sin(t * 1.7) * 0.08;
        if (item.kind === 'float') item.object.position.y = item.y + Math.sin(t * 1.1) * 0.09;
        if (item.kind === 'butterfly') { item.object.position.set(Math.cos(t * 0.4) * 2.3, 1.2 + Math.sin(t) * 0.3, 1); item.object.scale.x = 0.4 + Math.abs(Math.sin(t * 8)) * 0.6; }
      }
      this.renderer.render(this.scene, this.camera);
    } else if (this.fallback) {
      const ctx = this.canvas.getContext('2d'), w = this.canvas.width, h = this.canvas.height;
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#B2CD80'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.77, w * 0.28, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      this.fallback.render(ctx, { x: w / 2, y: h * 0.75, scale: Math.min(w / 150, h / 110), action: 'idle', facing: 1 });
    }
  }
  start() {
    if (this.running) return; this.running = true; this.previous = performance.now();
    const frame = now => {
      if (!this.running) return;
      const dt = Math.min((now - this.previous) / 1000, 0.05); this.previous = now; this.time += dt;
      if (!this.reducedMotion && this.time > this.dragUntil) this.angle += dt * Math.PI / 10;
      if (this.fallback && !this.reducedMotion) this.fallback.update(dt, {});
      this.draw(); this.raf = requestAnimationFrame(frame);
    }; this.raf = requestAnimationFrame(frame);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  dispose() {
    this.stop(); this.abort.abort(); this.observer.disconnect();
    const geometries = new Set(), materials = new Set();
    this.scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    this.renderer?.dispose(); this.canvas.remove();
  }
}
