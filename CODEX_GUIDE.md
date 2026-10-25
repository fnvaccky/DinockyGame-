# CODEX Integration Guide: Dinocky 2D Platformer

Welcome Codex! This project has been organized into a two-part modular architecture so you and Antigravity can build independently without merge conflicts.

---

## 🌟 Architecture Overview

```
Dinocky/
├── index.html                   # HTML5 Canvas container + Studio Inspector
├── style.css                    # Arcade UI styling
├── CODEX_GUIDE.md               # This specification guide
└── src/
    ├── core/
    │   ├── Engine.js            # [Part 1] 60fps fixed timestep loop
    │   ├── Input.js             # [Part 1] Keyboard & gamepad listener
    │   └── Events.js            # [Shared] Pub/Sub Event Bus
    ├── character/
    │   ├── DinockyModel.js      # [Part 1] Procedural 2D vector model & animations
    │   └── Player.js            # [Part 1] State machine & controller
    ├── physics/
    │   └── Physics.js           # [Part 1] AABB collision & semi-solid one-way platforms
    ├── powerups/
    │   └── FoodPowers.js        # [Part 1] Pizza, Donut, Burger mechanics & chomp hitboxes
    ├── levels/                  # [PART 2 - CODEX SCOPE]
    │   ├── TestArena.js         # Existing playable test arena
    │   ├── Tilemap.js           # << CODEX: Implement level tilemap loader
    │   └── Level1.js            # << CODEX: Implement World 1-1 layout & food placements
    ├── enemies/                 # [PART 2 - CODEX SCOPE]
    │   ├── Enemy.js             # Base Enemy class & sample Broccoli
    │   └── VeggieEnemies.js     # << CODEX: Additional enemy types (Carrots, Candies)
    ├── ui/                      # [PART 2 - CODEX SCOPE]
    │   └── HUD.js               # << CODEX: Advanced HUD (Hearts, Level Timer)
    └── audio/                   # [PART 2 - CODEX SCOPE]
        └── SoundEngine.js       # << CODEX: Web Audio API 8-bit sound effects
```

---

## 🤝 Part 1 (Completed by Antigravity)

1. **`DinockyModel.js`**:
   - High-fidelity procedural 2D vector model based on the plush and 2D artwork.
   - Animations: `idle`, `run` (waddle), `jump`, `fall`, `chomp` (wide-open jaw), `chew` (cheek puffs and crumbs).
   - Superpower visual auras: `PIZZA` (fire/cheese), `DONUT` (sugar glaze, rainbow sprinkles, phase trail), `BURGER` (heavy aura).

2. **`Physics.js`**:
   - Kinematics with variable jump height, coyote time, and jump buffering.
   - Solid obstacles vs. semi-solid jump-through platforms (can jump up through from below, drop through with `Down + Jump`).
   - Obstacle Phasing: when `player.isPhasing === true` (from eating a Donut), Dinocky passes straight through solid obstacles marked `isPhaseable: true`.

3. **`FoodPowers.js` & `Player.js`**:
   - `POWER_TYPES.PIZZA`: Enables Chomp Mode (`player.powerManager.triggerChomp()`), devouring any nearby enemy marked `isEdible: true`.
   - `POWER_TYPES.DONUT`: Activates Sugar Rush & Phase-Jump.
   - `POWER_TYPES.BURGER`: Activates Heavy Stomp.

---

## 🚀 Part 2 (Assigned to Codex)

Codex can now implement the following modules:

### 1. Additional Enemies (`src/enemies/VeggieEnemies.js`)
Extend the `Enemy` base class from `src/enemies/Enemy.js`:
```js
import { Enemy } from './Enemy.js';

export class AngryCarrot extends Enemy {
  constructor(x, y) {
    super(x, y, 28, 36);
    this.name = 'Angry Carrot';
    this.isEdible = true; // Dinocky can eat this enemy!
  }

  render(ctx) {
    // Custom cartoon rendering
  }
}
```

### 2. Level Design & Tilemaps (`src/levels/Level1.js`)
Build World 1-1 with platforms, collectibles, and hazards:
- Solid ground blocks: `{ x, y, w, h, isPhaseable: false }`
- Phase barrier walls: `{ x, y, w, h, isPhaseable: true }`
- Semi-solid jump-through platforms: `{ x, y, w, h }`
- Food collectibles: `new CollectibleFood(x, y, 'PIZZA' | 'DONUT' | 'BURGER')`

### 3. Retro Sound Synthesizer (`src/audio/SoundEngine.js`)
Use the Web Audio API to play procedural retro sounds when events fire:
```js
import { events } from '../core/Events.js';

events.on('enemyEaten', () => playChompSound());
events.on('powerupActivated', (p) => playFanfare(p.type));
```

### 4. Event Bus Contract (`src/core/Events.js`)
- `enemyEaten`: `{ enemy, points, pos }`
- `powerupActivated`: `{ type, name, duration }`
- `powerupExpired`: `{ type }`
- `bonusEnergy`: `{ amount }`
