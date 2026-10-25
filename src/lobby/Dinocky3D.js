import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ProceduralDinocky3D } from './ProceduralDinocky3D.js';
import { normalizeCosmetics, palette } from '../cosmetics.js';

function releaseTree(root, retainedMaterials = new Set()) {
  const geometries = new Set(), materials = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [].concat(object.material || [])) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => { if (!retainedMaterials.has(material)) material.dispose(); });
}

export class Dinocky3D extends ProceduralDinocky3D {
  // Keep a usable character while the file loads, or if the network is unavailable.
  load(loader = new GLTFLoader()) {
    if (this.loading) return this.loading;
    this.loading = loader.loadAsync(`${import.meta.env?.BASE_URL || '/'}models/dinocky-plush.glb`)
      .then(({ scene }) => {
        if (this.disposed) { releaseTree(scene); return false; }
        const bounds = new THREE.Box3().setFromObject(scene);
        const scale = 3.08 / (bounds.max.y - bounds.min.y);
        const asset = new THREE.Group(); asset.name = 'DinockyPlushAsset';
        asset.scale.setScalar(scale); scene.position.y = -bounds.min.y;
        asset.add(scene);
        const skins = new Set(), eyes = [];
        scene.traverse(object => {
          if (!object.isMesh) return;
          // Preserve the soft plush shading without shadow-map acne on close surfaces.
          object.castShadow = true; object.receiveShadow = false;
          if (/Dinocky_Eye_[LR]_Game/.test(object.name)) eyes.push(object);
          for (const material of [].concat(object.material)) {
            if (material.name.startsWith('Dinocky_Skin')) skins.add(material);
          }
        });
        if (!skins.size || eyes.length !== 2) { releaseTree(asset); throw new Error('Invalid Dinocky model'); }
        const retained = new Set();
        for (const accessory of [this.cap, this.scarf]) accessory.traverse(o => {
          for (const material of [].concat(o.material || [])) retained.add(material);
        });
        for (const child of [...this.rig.children]) {
          if (child === this.cap || child === this.scarf) continue;
          this.rig.remove(child); releaseTree(child, retained);
        }
        this.rig.add(asset); this.asset = asset; this.eyes = eyes;
        this.skinMaterials = [...skins]; this.skin = this.skinMaterials[0];
        this.originalPink = this.skin.color.clone();
        this.cap.position.set(0, 0.12, -0.04);
        this.cap.scale.z = 1.16;
        this.setCosmetics(this.cosmetics);
        this.loaded = true;
        return true;
      }).catch(error => { this.loadError = error; return false; });
    return this.loading;
  }

  setCosmetics(value = {}) {
    this.cosmetics = normalizeCosmetics(value);
    if (!this.skinMaterials) { super.setCosmetics(this.cosmetics); return; }
    for (const material of this.skinMaterials) {
      if (this.cosmetics.color === 'pink') material.color.copy(this.originalPink);
      else material.color.set(palette(this.cosmetics.color).color);
    }
    this.cap.visible = this.cosmetics.accessory === 'cap';
    this.scarf.visible = this.cosmetics.accessory === 'scarf';
  }

  // MeadowScene owns disposal of the attached geometry. This also guards late loads.
  dispose() { this.disposed = true; }
}
