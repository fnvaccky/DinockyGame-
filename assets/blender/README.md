# Dinocky plush model

`dinocky-plush.blend` contains the editable plush character, a presentation studio,
the original Blender scene, and a separate simplified game-mesh scene.
`../../public/models/dinocky-plush.glb` contains only the game character; `../../public/models/accessories/<id>.glb` holds one file per shop accessory.

## Asset contract

- 27,098 triangles, 12 meshes, approximately 594 KiB, with embedded materials and no external texture dependencies.
- glTF orientation: Y up, front faces +Z. Height approximately 3.26 units; scale uniformly to match the lobby.
- Mirror symmetry checked against every evaluated vertex: error below 0.00001 Blender units.
- Pink skin, cream belly, ivory teeth, golden dorsal plates, rose embroidery, and charcoal eyes are separate materials. Change the skin material base color for shop recolors.
- Eyes, arms, and jaw have their own centered pivots. They support object-level blinking and simple poses. No skeleton, skinning, gait animation, or animation clips are included.
- The tail and torso share one smooth mesh. Spikes, cheeks, and teeth are grouped to reduce draw calls.
- The top three head spikes are a separate mesh, `Dinocky_HeadSpikes_Game`, which the game hides while any hat is worn.
- No studio floor, lights, camera, default cube, or other scenes are included in the GLB.

## Accessories

The `DINOCKY | Accessories` collections are exported by `export_accessories.py`, one GLB each:

| id | Collection | Triangles | Size |
| --- | --- | --- | --- |
| `cap` | HAT \| Straw cap | 5,996 | 108 KiB |
| `scarf` | SCARF \| Red knit | 5,988 | 107 KiB |
| `bee_hat` | HAT \| Bee bucket (crochet) | 6,608 | 140 KiB |
| `frog_hat` | HAT \| Frog bucket (crochet) | 6,994 | 127 KiB |
| `glasses` | GLASSES \| Round rose-gold | 4,994 | 95 KiB |
| `suit` | SUIT \| Navy tuxedo | 10,983 | 208 KiB |
| `explorer` | EXPLORER \| Safari vest | 9,956 | 247 KiB |
| `hoodie` | HOODIE \| Mint dino | 10,988 | 199 KiB |

- Same frame as the character (Y up, front +Z, world transforms baked), so each file is parented directly under the loaded character scene with no offsets.
- Modifiers are baked, curves become meshes, and each accessory is decimated to stay under 150 KiB (260 KiB for the full-body outfits). Each accessory is one mesh with one primitive per material, except the hoodie, whose hood is a separate `Accessory_hoodie_hood` node, and only positions and normals are exported.
- Procedural crochet/knit bump shading is replaced with plain Principled materials. The bee crown is cut along the original `sin(38·z)` stripe boundaries in its local frame and split into yellow and black materials. Lenses and nose pads use alpha blend.
- Accessories stack one per slot (body, hat, neck, face), except that an outfit and the scarf replace each other. The game hides the hoodie's hood while a hat is worn. Glasses fit under both bucket hats as exported; with the tilted cap the game lowers them 0.02 and moves them forward 0.06 (measured in Blender against the cap brim).
- `OLD | Accessories (pre-fix)` and `WIG | Long golden` are not exported. Run with `ONLY={'suit'}` (for example) in the script's globals to re-export only some accessories. Per-accessory stats are recorded in `model-report.json`.

The exported model is integrated into the login and lobby meadow using Three.js GLTFLoader. Rotation, breathing, blinking, recolors, and all eight accessories are supported; accessory GLBs replace the procedural overlays once loaded. The original procedural model handles loading failures. Automated desktop/mobile browser flows and asset-loading tests pass; physical-device performance has not been benchmarked. The playable level remains the existing 2D Canvas game.

## Rebuilding

In a fresh Blender session, run `build_dinocky.py`, then `refine_dinocky.py`, then `chunky_dinocky.py`, then `balance_dinocky.py`, then `fit_face_dinocky.py`, then `export_dinocky.py`, then `export_accessories.py` (which also re-exports the character and is safe to rerun on its own). The scripts currently use this workspace's absolute path. The initial script creates a new scene and preserves existing scenes. Do not rerun on an existing generated model without first choosing a new output name or clearing only the generated scenes.
