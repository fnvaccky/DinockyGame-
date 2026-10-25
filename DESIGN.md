---
name: Dinocky
description: A hungry little adventure in Snack Meadow
colors:
  ink: "#354d3e"
  muted: "#69745e"
  meadow-background: "#eef3df"
  cream: "#fffdf3"
  green: "#397357"
  green-hover: "#2c6348"
  berry: "#a64160"
  berry-hover: "#8d3650"
  line: "#d8dfca"
  input: "#fbfcf6"
  helper-text: "#626d59"
  available-level: "#527540"
  dino-pink: "#F48B96"
  dino-cream: "#FFF5DE"
  dino-gold: "#F6BE48"
typography:
  display:
    fontFamily: "Fredoka, sans-serif"
    fontSize: "clamp(40px,4.6vw,67px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Fredoka, sans-serif"
    fontSize: "36px"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-.025em"
  body:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  button:
    fontFamily: "Fredoka, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  input: "11px"
  segmented: "12px"
  button: "14px"
  panel: "28px"
  panel-mobile: "23px"
spacing:
  button: "14px 22px"
  panel: "35px 32px"
  panel-mobile: "28px 24px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.cream}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "{spacing.button}"
  button-primary-hover:
    backgroundColor: "{colors.green-hover}"
  panel:
    backgroundColor: "{colors.cream}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
---

# Design System: Dinocky

## Plush reference refinement

The lobby model follows the supplied plush silhouette: taller pink torso, broad projecting muzzle, small matte black eyes, triangular cream teeth, raised stubby arms, plain rounded feet, cream belly and longer tapered tail with yellow back spikes. It remains a procedural 3D interpretation rather than a scanned fabric asset. The meadow canvas extends beyond its layout column to give clouds and floating snack platforms room; the form remains above the scene. Camera framing keeps the character below the heading.

## Overview

**Creative North Star: "Snack Meadow"**

A soft, sunny play world surrounds a warm, readable interface. Rounded character geometry, a grassy biscuit island, and slow ambient movement make Dinocky feel present. Cream panels and berry details carry the same friendly character into practical account and shop tasks.

Key characteristics: rounded forms, generous scene space, soft structural shadows, compact readable controls, and green forward actions. This document is a scan of `style.css`, `index.html`, and `src/lobby`; it records the user-approved code-led direction.

## Colors

### Primary

Meadow green marks forward actions, especially Start adventure. Its darker hover variant preserves the action's identity. Berry gives the wordmark, Shop, text actions, selection, and keyboard focus a consistent accent.

### Secondary

Dinocky pink, cream, and gold are character material colors, distinct from interface action colors. Their warm contrast makes the companion recognizable amid the greens of the environment.

### Neutral

Cream panels sit over the pale meadow background. Green-black ink supports readable text; muted green supports descriptions; the line token separates related operations. Inputs use a subtly cool cream surface. The darker helper-text color supports placeholders and account footnotes; available level numbers use their own deeper green.

**The Forward Action Rule.** Keep the main play or submission action green and the surrounding hierarchy quieter.

## Typography

Fredoka is the rounded display and button voice. Nunito Sans is the implemented body face, including account fields and explanatory text. Fonts are locally bundled through Fontsource.

Display scales fluidly on desktop; panel headlines use the headline role. The lobby overrides its headline size for its composition. Mobile panel headlines shrink to 31px. Body copy uses comfortable line spacing; smaller helper and control labels remain subordinate. Do not treat every small helper size as a new type token.

## Layout

The main container is capped at 1350px, with a two-column scene-and-panel grid (`minmax(0,1.35fr) minmax(340px,.9fr)`) and a 35px gap. Panels cap at 460px. The top bar caps at 1450px. The authenticated lobby uses one large scene row and centered menu actions.

At 900px the grid tightens. At 650px it becomes a vertical composition, placing the scene above the panel. The Start action spans both menu columns. Coarse pointers reveal touch game controls. Short landscape screens prioritize the game viewport and position controls at its sides.

## Elevation & Depth

Depth comes from real Three.js geometry in the scene and soft shadows on interface surfaces. Panel shadow (`0 18px 55px #44583b12`) lightly lifts cream cards; action shadow (`0 5px 12px #345c4218`) supports green buttons. Selected account tabs use a smaller local shadow. Avoid turning these into heavy floating dashboards.

## Shapes

Panels have broad rounded corners; buttons and fields have smaller related radii. Circular wallet coins and settings controls echo the character's rounded geometry. Shop selections use a stronger border while keeping their shape stable. Biscuit and plant forms are procedural geometry, not flat stand-ins for the primary world.

## Components

### Buttons

Green primary actions, cream secondary actions, and berry Shop actions share Fredoka and the button radius. Hover lifts enabled actions by 2px over 150ms. Keyboard focus uses a berry 3px outline with 5px offset. Disabled controls dim and stop advertising pointer interaction.

### Panels and inputs

Cream panels contain compact tasks with clear heading, explanation, controls, and status. Fields use the input radius, a light border, and generous internal padding. Error text and status messages must remain text, not color alone. The password reveal control stays within its field.

### Navigation and selection

The header holds identity, balance, and settings. Authored SVG menu icons accompany text labels. Account tabs visibly identify selection. Shop cards distinguish selection with a berry border and pale pink fill. Level nodes pair a number, name, and availability text; unavailable destinations retain their coming-soon label.

### Dinocky scene

The procedural companion rests on a grassy biscuit island with flowers, drifting clouds, floating snacks, and a butterfly. Automatic rotation takes 20 seconds and resumes three seconds after drag interaction. Reduced motion suspends automatic rotation and ambient animation while preserving manual exploration. A Canvas fallback keeps the preview available without WebGL and hides the drag hint. The app uses clipped overflow to avoid unintended focus scrolling.

## Do's and Don'ts

- **Do** preserve the pink, cream, and gold default character identity.
- **Do** keep keyboard focus, motion preferences, and touch controls visible and usable.
- **Do** use the documented interface roles when extending account and shop screens.
- **Don't** replace the approved procedural lobby with a flat decorative image.
- **Don't** imply unavailable levels, unsaved rewards, or unowned cosmetics are available.
