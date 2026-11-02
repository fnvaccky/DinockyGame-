import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ProceduralDinocky3D } from './ProceduralDinocky3D.js';
import { CATALOG, normalizeCosmetics, palette } from '../cosmetics.js';

const ACCESSORY_IDS = CATALOG.filter(item => item.kind === 'accessory').map(item => item.id);
// Measured in Blender: drops the glasses just below the tilted cap brim (glTF units, front +Z).
const GLASSES_UNDER_CAP = new THREE.Vector3(0, -0.02, 0.06);
const modelUrl = path => `${import.meta.env?.BASE_URL || '/'}models/${path}`;

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
  // Accessory files download alongside the character; `accessoriesReady` settles once they are attached.
  load(loader = new GLTFLoader()) {
    if (this.loading) return this.loading;
    const accessories = ACCESSORY_IDS.map(id => loader.loadAsync(modelUrl(`accessories/${id}.glb`))
      .then(({ scene }) => ({ id, scene }), error => ({ id, error })));
    this.loading = loader.loadAsync(modelUrl('dinocky-plush.glb'))
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
        const fallbackAccessories = new Set(Object.values(this.accessories));
        const retained = new Set();
        for (const accessory of fallbackAccessories) accessory.traverse(o => {
          for (const material of [].concat(o.material || [])) retained.add(material);
        });
        for (const child of [...this.rig.children]) {
          if (fallbackAccessories.has(child)) continue;
          this.rig.remove(child); releaseTree(child, retained);
        }
        this.rig.add(asset); this.asset = asset; this.model = scene; this.eyes = eyes;
        this.headSpikes = scene.getObjectByName('Dinocky_HeadSpikes_Game') || null;
        this.skinMaterials = [...skins]; this.skin = this.skinMaterials[0];
        this.originalPink = this.skin.color.clone();
        // Procedural overlays only remain for accessory files that fail to load.
        this.cap.position.set(0, 0.05, -0.02);
        this.cap.scale.set(1.0, 1.0, 1.0);
        this.scarf.position.set(0, 0.04, 0.02);
        this.scarf.scale.set(1.0, 1.0, 1.0);
        this.setCosmetics(this.cosmetics);
        this.loaded = true;
        return true;
      }).catch(error => { this.loadError = error; return false; });
    this.accessoriesReady = Promise.all([this.loading, ...accessories]).then(([loaded, ...results]) => {
      const attached = [];
      for (const { id, scene, error } of results) {
        if (error) { (this.accessoryErrors ||= {})[id] = error; continue; }
        if (this.disposed || !loaded) { releaseTree(scene); continue; }
        this.attachAccessory(id, scene); attached.push(id);
      }
      if (attached.length) this.setCosmetics(this.cosmetics);
      return attached;
    });
    return this.loading;
  }

  // Accessory files share the character's Blender frame, so they sit directly under its scene.
  attachAccessory(id, scene) {
    scene.name = `DinockyAccessory_${id}`;
    scene.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = false; } });
    const fallback = this.accessories[id];
    this.model.add(scene); this.accessories[id] = scene; (this.loadedAccessories ||= new Set()).add(id);
    // The hoodie's hood is exported as its own node so hats can replace it.
    if (id === 'hoodie') this.hood = scene.getObjectByName('Accessory_hoodie_hood') || null;
    if (fallback) {
      const retained = new Set();
      for (const other of Object.values(this.accessories)) other.traverse(o => {
        for (const material of [].concat(o.material || [])) retained.add(material);
      });
      fallback.removeFromParent(); releaseTree(fallback, retained);
    }
  }

  setCosmetics(value = {}) {
    this.cosmetics = normalizeCosmetics(value);
    if (!this.skinMaterials) { super.setCosmetics(this.cosmetics); return; }
    for (const material of this.skinMaterials) {
      if (this.cosmetics.color === 'pink') material.color.copy(this.originalPink);
      else material.color.set(palette(this.cosmetics.color).color);
    }
    this.showAccessories(this.cosmetics.accessories);
  }

  showAccessories(ids) {
    super.showAccessories(ids);
    if (this.loadedAccessories?.has('glasses')) {
      this.accessories.glasses.position.copy(ids.includes('cap') ? GLASSES_UNDER_CAP : new THREE.Vector3());
    }
  }

  // MeadowScene owns disposal of the attached geometry. This also guards late loads.
  dispose() { this.disposed = true; }
}
