import * as THREE from 'three';
import { palette, normalizeCosmetics, HATS } from '../cosmetics.js';

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
    this.accessories = {};
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
    // The top head spikes would poke through hats, so they can be hidden separately.
    this.headSpikes = new THREE.Group(); this.rig.add(this.headSpikes);
    for (const [y, z, s] of [[2.88, -0.18, 0.21], [2.61, -0.48, 0.23], [2.22, -0.57, 0.23], [1.81, -0.59, 0.23], [1.38, -0.59, 0.21], [0.94, -0.62, 0.19], [0.58, -1.02, 0.17], [0.48, -1.45, 0.12]]) {
      this.ellipsoid(y > 2.5 ? this.headSpikes : this.rig, this.gold, [0, y, z], [0.13, s, s]);
    }
    const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options });

    // Explorer cap, tilted back about 20 degrees like the Blender model.
    const cap = this.tiltAbout(this.accessory('cap'), [0, 2.62, -0.02], -0.2);
    const capMat = mat('#DEB87A'), bandMat = mat('#6A3818', { roughness: 0.7 }), capGold = mat('#F6BE48', { roughness: 0.65 });
    // 1. Crown (Safari Explorer Dome)
    this.ellipsoid(cap, capMat, [0, 2.88, 0.02], [0.44, 0.24, 0.46], [-0.14, 0, 0]);
    // 2. Leather hatband
    this.ellipsoid(cap, bandMat, [0, 2.79, 0.03], [0.46, 0.045, 0.48], [-0.14, 0, 0]);
    // 3. Gold adventurer compass badge
    this.ellipsoid(cap, capGold, [0, 2.81, 0.48], [0.065, 0.065, 0.025], [-0.14, 0, 0]);
    // 4. Crown top vent button
    this.ellipsoid(cap, capGold, [0, 3.12, -0.01], [0.04, 0.03, 0.04], [-0.14, 0, 0]);
    // 5. Curved Brim (sculpted visor that arches over the brow)
    this.ellipsoid(cap, capMat, [0, 2.76, 0.08], [0.55, 0.038, 0.58], [-0.20, 0, 0]);
    // 6. Front visor extension
    this.ellipsoid(cap, capMat, [0, 2.72, 0.44], [0.40, 0.03, 0.22], [0.12, 0, 0]);

    // Red knit scarf: collar, knot, and two tails hanging down the chest.
    const scarf = this.accessory('scarf');
    const scarfMat = mat('#C62828', { roughness: 0.9 }), scarfDarkMat = mat('#9E1B1B', { roughness: 0.9 }), fringeMat = mat('#D84343', { roughness: 0.95 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.095, 16, 40), scarfMat);
    collar.rotation.x = Math.PI / 2 - 0.22;
    collar.position.set(0, 1.84, 0.12);
    collar.scale.set(1.08, 0.98, 1.05);
    collar.castShadow = true;
    scarf.add(collar);
    this.ellipsoid(scarf, scarfDarkMat, [0.22, 1.79, 0.52], [0.13, 0.14, 0.10], [0.15, -0.2, 0.05]);
    for (const [x, top, length, z, tilt] of [[0.30, 1.72, 0.62, 0.57, 0.08], [0.14, 1.72, 0.5, 0.6, -0.06]]) {
      this.ellipsoid(scarf, scarfMat, [x, top - length / 2, z], [0.1, length / 2, 0.045], [0.12, 0, tilt]);
      for (const dx of [-0.06, -0.02, 0.02, 0.06]) {
        this.ellipsoid(scarf, fringeMat, [x + dx - tilt * 0.6, top - length - 0.02, z + 0.01], [0.014, 0.06, 0.014]);
      }
    }

    // Crochet bucket hats share a crown and floppy brim that sit just above the eyes.
    const bucket = (id, crownMat, brimMat) => {
      const hat = this.tiltAbout(this.accessory(id), [0, 2.7, 0], -0.12);
      this.ellipsoid(hat, crownMat, [0, 2.74, 0], [0.53, 0.34, 0.51]);
      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.12, 12, 40), brimMat);
      brim.rotation.x = Math.PI / 2; brim.position.set(0, 2.7, 0); brim.scale.set(1, 1, 0.45);
      brim.castShadow = true; hat.add(brim);
      return hat;
    };
    const beeYellow = mat('#F4B400', { roughness: 0.95 }), beeBlack = mat('#1C1A17', { roughness: 0.95 }), wingMat = mat('#F4F3EC', { roughness: 0.9 });
    const bee = bucket('bee_hat', beeYellow, beeYellow);
    for (const [y, radius] of [[2.82, 0.5], [2.96, 0.39]]) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 8, 40), beeBlack);
      stripe.rotation.x = Math.PI / 2; stripe.position.y = y; stripe.scale.set(1, 0.96, 1); bee.add(stripe);
    }
    for (const side of [-1, 1]) this.ellipsoid(bee, wingMat, [side * 0.13, 3.1, -0.2], [0.13, 0.09, 0.03], [0.3, side * 0.5, side * -0.6]);

    const frogGreen = mat('#7CC24A', { roughness: 0.95 }), frogBlack = mat('#171113', { roughness: 0.6 }), shineMat = mat('#FFFFFF', { roughness: 0.2 }), blushMat = mat('#EE8FB0', { roughness: 0.95 });
    const frog = bucket('frog_hat', frogGreen, frogGreen);
    for (const side of [-1, 1]) {
      this.ellipsoid(frog, frogGreen, [side * 0.26, 3.04, 0.08], [0.17, 0.17, 0.16]);
      this.ellipsoid(frog, frogBlack, [side * 0.27, 3.06, 0.21], [0.1, 0.11, 0.05]);
      this.ellipsoid(frog, shineMat, [side * 0.24, 3.1, 0.255], [0.028, 0.028, 0.01]);
      this.ellipsoid(frog, blushMat, [side * 0.12, 3.02, 0.24], [0.05, 0.025, 0.02], [-0.4, 0, 0]);
    }

    // Round rose-gold glasses in front of the eyes, temples running back above the cheeks.
    const glasses = this.accessory('glasses');
    const frameMat = mat('#C98A8F', { roughness: 0.3, metalness: 0.6 }), goldMat = mat('#E8B27A', { roughness: 0.3, metalness: 0.8 });
    const lensMat = mat('#F4F4FF', { roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false });
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 8, 32), frameMat);
      rim.position.set(side * 0.29, 2.55, 0.53); glasses.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.125, 32), lensMat);
      lens.position.set(side * 0.29, 2.55, 0.525); glasses.add(lens);
      this.tube(glasses, [[0.42, 2.6, 0.5], [0.53, 2.61, 0.3], [0.575, 2.6, 0], [0.56, 2.56, -0.15]].map(([x, y, z]) => new THREE.Vector3(side * x, y, z)), 0.012, goldMat);
    }
    this.tube(glasses, [new THREE.Vector3(-0.16, 2.6, 0.535), new THREE.Vector3(0, 2.64, 0.55), new THREE.Vector3(0.16, 2.6, 0.535)], 0.012, goldMat);
    this.setCosmetics({});
  }


  accessory(id) {
    const group = new THREE.Group(); group.name = `ProceduralAccessory_${id}`;
    this.accessories[id] = group; this.rig.add(group); return group;
  }
  // Rotates children about a point instead of the rig origin.
  tiltAbout(parent, point, rotationX) {
    const outer = new THREE.Group(), inner = new THREE.Group();
    outer.position.set(...point); outer.rotation.x = rotationX;
    inner.position.set(-point[0], -point[1], -point[2]);
    outer.add(inner); parent.add(outer); return inner;
  }
  get cap() { return this.accessories.cap; }
  get scarf() { return this.accessories.scarf; }
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
    this.showAccessories(cosmetics.accessories);
  }
  showAccessories(ids) {
    for (const [key, group] of Object.entries(this.accessories)) group.visible = ids.includes(key);
    if (this.headSpikes) this.headSpikes.visible = !ids.some(id => HATS.includes(id));
  }
  animate(time, reducedMotion) {
    this.rig.scale.y = reducedMotion ? 1 : 1 + Math.sin(time * 2.6) * 0.012;
    const blink = !reducedMotion && time % 4.2 > 4.05;
    this.eyes.forEach(eye => { eye.scale.y = blink ? 0.09 : 1; });
  }
}

