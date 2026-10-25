# Dinocky plush model

`dinocky-plush.blend` contains the editable plush character, a presentation studio,
the original Blender scene, and a separate simplified game-mesh scene.
`../../public/models/dinocky-plush.glb` contains only the game character.

## Asset contract

- 27,098 triangles, 11 meshes, approximately 593 KiB, with embedded materials and no external texture dependencies.
- glTF orientation: Y up, front faces +Z. Height approximately 3.26 units; scale uniformly to match the lobby.
- Mirror symmetry checked against every evaluated vertex: error below 0.00001 Blender units.
- Pink skin, cream belly, ivory teeth, golden dorsal plates, rose embroidery, and charcoal eyes are separate materials. Change the skin material base color for shop recolors.
- Eyes, arms, and jaw have their own centered pivots. They support object-level blinking and simple poses. No skeleton, skinning, gait animation, or animation clips are included.
- The tail and torso share one smooth mesh. Spikes, cheeks, and teeth are grouped to reduce draw calls.
- No studio floor, lights, camera, default cube, or other scenes are included in the GLB.

The exported model is integrated into the login and lobby meadow using Three.js GLTFLoader. Rotation, breathing, blinking, recolors, cap and scarf are retained. The original procedural model handles loading failures. Automated desktop/mobile browser flows and asset-loading tests pass; physical-device performance has not been benchmarked. The playable level remains the existing 2D Canvas game.

## Rebuilding

In a fresh Blender session, run `build_dinocky.py`, then `refine_dinocky.py`, then `chunky_dinocky.py`, then `balance_dinocky.py`, then `fit_face_dinocky.py`, then `export_dinocky.py`. The scripts currently use this workspace's absolute path. The initial script creates a new scene and preserves existing scenes. Do not rerun on an existing generated model without first choosing a new output name or clearing only the generated scenes.
