# Dinocky

Dinocky is a friendly, food-themed browser platformer. Players meet their little dinosaur in Snack Meadow, play short adventures, earn coins, and personalize their companion.

## Product commitments

- Real Supabase accounts are required; there is no guest mode. Account progress, coin rewards, ownership, and equipped cosmetics persist in the cloud.
- The lobby offers Start adventure, Levels, and Shop. Profile, coin balance, and settings belong in the top bar.
- Level 1–1 is the existing Canvas platformer with keyboard and simultaneous touch controls. Future levels must remain visibly unavailable until implemented.
- Cosmetic purchases use earned coins. Preview, purchase, ownership, and equipped state must be distinguishable.
- Auth includes sign in, account creation, and password recovery. SMTP provider configuration remains an operational dependency; do not describe delivery as verified until it is tested.
- No public deployment is authorized by this product brief.

## Identity

Snack Meadow is a gentle, playful world of grassy biscuit islands, snack platforms, plants, and clouds. Dinocky's recognizable default identity is pink with cream and gold details. The character is real procedural Three.js geometry in the lobby, with a Canvas fallback when WebGL is unavailable.

## Experience and usability

The lobby is an Experience surface: the companion and meadow create the reason to stay. Accounts, settings, level selection, and shop are Operate surfaces: clear controls and state feedback support the task. Auth sits beside the scene on desktop and below it on mobile. Motion preferences, visible keyboard focus, and accessible control labels must continue to work.

## Design decision record

The user approved the Snack Meadow direction and requested implementation. The build uses a code-led approach to realize that plan. DESIGN.md records implemented tokens; `.impeccable/lobby-brief.md` records this surface's composition and behavior.
