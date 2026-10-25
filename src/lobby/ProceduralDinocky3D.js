import * as THREE from 'three';
import { palette, normalizeCosmetics } from '../cosmetics.js';

export class ProceduralDinocky3D extends THREE.Group {
  constructor() {
    super();
    this.skin = new THREE.MeshStandardMaterial({ color: '#F48B96', roughness: 1 });
    this.cream = new THREE.MeshStandardMaterial({ color: '#FFF5DE', roughness: 0.85 });
    this.gold = new THREE.MeshStandardMaterial({ color: '#F6BE48', roughness: 0.65 });
    this.dark = new THREE.MeshStandardMaterial({ color: '#171113', roughness: 0.85 });
    this.rose = new THREE.MeshStandardMaterial({ color: '#CF5874', roughness: 0.8 });
    this.white = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.4 });
    this.rig = new THREE.Group(); this.add(this.rig);
    this.ellipsoid(this.rig, this.skin, [0, 1.3, -0.06], [0.65, 1.17, 0.55]);
    this.ellipsoid(this.rig, this.skin, [0, 2.18, 0], [0.66, 0.72, 0.56]);
    this.ellipsoid(this.rig, this.cream, [0, 1.04, 0.459], [0.48, 0.68, 0.095]);
    // A broad rounded muzzle, little lower jaw, and scalloped teeth.
    this.ellipsoid(this.rig, this.rose, [0, 1.94, 0.65], [0.55, 0.135, 0.34]);
    this.ellipsoid(this.rig, this.skin, [0, 1.83, 0.57], [0.54, 0.18, 0.35]);
    this.ellipsoid(this.rig, this.skin, [0, 2.16, 0.53], [0.66, 0.37, 0.48]);
    for (const x of [-0.43, -0.26, -0.09, 0.09, 0.26, 0.43]) {
      const shape = new THREE.Shape(); shape.moveTo(-0.095, 0.06); shape.lineTo(0.095, 0.06); shape.quadraticCurveTo(0.04, -0.08, 0, -0.12); shape.quadraticCurveTo(-0.04, -0.08, -0.095, 0.06);
      const tooth = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.015, bevelSegments: 3, steps: 1 }), this.cream);
      tooth.position.set(x, 1.98, 1.025 - Math.abs(x) * 0.2); this.rig.add(tooth);
    }
    this.eyes = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.Group(); eye.position.set(side * 0.29, 2.56, 0.449); this.rig.add(eye);
      this.ellipsoid(eye, this.dark, [0, 0, 0], [0.075, 0.085, 0.042]);
      this.eyes.push(eye);
      this.ellipsoid(this.rig, this.skin, [side * 0.7, 1.5, 0.12], [0.29, 0.21, 0.23], [0, 0, side * 0.3]);
      this.ellipsoid(this.rig, this.skin, [side * 0.43, 0.4, 0.04], [0.27, 0.42, 0.31], [0, 0, side * 0.18]);
      const spiral = [];
      for (let t = 0; t < Math.PI * 3.8; t += 0.15) {
        const r = 0.009 * t;
        spiral.push(new THREE.Vector3(side * 0.53 + Math.cos(t) * r * 0.65, 2.26 + Math.sin(t) * r * 0.65, 0.815));
      }
      this.tube(this.rig, spiral, 0.012, this.rose);
    }
    // Tapered tail is curved outward so the silhouette reads from every angle.
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.59, -0.35), new THREE.Vector3(0, 0.34, -1.05), new THREE.Vector3(0, 0.35, -1.85)]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.23, 12, false), this.skin);
    const p = tail.geometry.attributes.position;
    // Shrink each tube ring toward the tail tip.
    for (let i = 0; i <= 24; i++) {
      const center = curve.getPointAt(i / 24), factor = 1 - 0.94 * i / 24;
      for (let j = 0; j <= 12; j++) {
        const n = i * 13 + j;
        p.setXYZ(n, center.x + (p.getX(n) - center.x) * factor, center.y + (p.getY(n) - center.y) * factor, center.z + (p.getZ(n) - center.z) * factor);
      }
    }
    tail.geometry.computeVertexNormals(); tail.castShadow = true; this.rig.add(tail);
    for (const [y, z, s] of [[2.88, -0.18, 0.21], [2.61, -0.48, 0.23], [2.22, -0.57, 0.23], [1.81, -0.59, 0.23], [1.38, -0.59, 0.21], [0.94, -0.62, 0.19], [0.58, -1.02, 0.17], [0.48, -1.45, 0.12]]) {
      this.ellipsoid(this.rig, this.gold, [0, y, z], [0.13, s, s]);
    }
    this.cap = new THREE.Group(); this.rig.add(this.cap);
    const capMat = new THREE.MeshStandardMaterial({ color: '#D8AE69', roughness: 0.9 });
    this.ellipsoid(this.cap, capMat, [0, 2.71, 0.1], [0.66, 0.27, 0.6]);
    this.ellipsoid(this.cap, capMat, [0, 2.62, 0.53], [0.76, 0.065, 0.54]);
    this.ellipsoid(this.cap, this.gold, [0, 2.75, 0.64], [0.085, 0.085, 0.025]);
    this.scarf = new THREE.Group(); this.rig.add(this.scarf);
    const scarfMat = new THREE.MeshStandardMaterial({ color: '#BD4262', roughness: 0.9 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.12, 12, 40), scarfMat);
    collar.rotation.x = Math.PI / 2; collar.position.y = 1.54; this.scarf.add(collar);
    this.ellipsoid(this.scarf, scarfMat, [0.33, 1.15, 0.71], [0.14, 0.45, 0.075], [0, 0, -0.2]);
    this.setCosmetics({});
  }


  ellipsoid(parent, material, position, scale, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material);
    mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.set(...rotation);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  tube(parent, points, radius, material) {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 60, radius, 6, false), material);
    parent.add(mesh); return mesh;
  }
  setCosmetics(value) {
    const cosmetics = normalizeCosmetics(value);
    this.skin.color.set(palette(cosmetics.color).color);
    this.cap.visible = cosmetics.accessory === 'cap'; this.scarf.visible = cosmetics.accessory === 'scarf';
  }
  animate(time, reducedMotion) {
    this.rig.scale.y = reducedMotion ? 1 : 1 + Math.sin(time * 2.6) * 0.012;
    const blink = !reducedMotion && time % 4.2 > 4.05;
    this.eyes.forEach(eye => { eye.scale.y = blink ? 0.09 : 1; });
  }
}

