# Snack Meadow lobby surface brief

## Direction contract

User-approved Snack Meadow; code-led implementation, with no additional comps or seed stage. The visual anchor is procedural Three.js Dinocky on a grassy biscuit island, with pink/cream/gold identity, animated plants, clouds, and snack platforms.

## Modes and composition

- Experience: the lobby gives the character the largest visual role, followed by Start adventure, Levels, and Shop.
- Operate: account, shop, settings, and level panels prioritize clear controls, feedback, and persistent state.
- Desktop: account panel beside the world; mobile: account panel below. Profile, coins, and settings stay in the top bar.

## Interaction contract

Rotate once every 20 seconds; drag to inspect; resume three seconds after interaction. Respect reduced motion. Retain Level 1–1 Canvas gameplay with keyboard and multitouch. Use real account, cloud progression, coin rewards, and cosmetic ownership; no guest mode. Maintain explicit unavailable future-level states. SMTP provider setup remains pending, and public deployment is outside the authorized scope.

## Evidence

Implementation sources: `style.css`, `index.html`, `src/lobby/MeadowScene.js`, `src/lobby/Dinocky3D.js`. Token values and visual rules live in root DESIGN.md; extension metadata lives in design.json. This brief describes intended and implemented surface structure, not independent runtime verification of account delivery or persistence.
