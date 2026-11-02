/**
 * DinockyModel.js - High-fidelity 2D Vector Character Model & Animator for Dinocky.
 * 
 * Accurately models the physical plush and 2D character art:
 * - Soft strawberry pink dinosaur body with chubby pear silhouette
 * - Golden yellow dorsal spikes running down head, spine, and tail
 * - Cream oval tummy patch
 * - Beady espresso eyes with cartoon catchlights
 * - Signature pink spiral swirl cheeks
 * - Scalloped white cartoon teeth
 * - Articulated jaw that opens wide for the CHOMP / Eat-Enemy attack
 * - Power-up visual auras: Pizza (Fire/Cheese), Donut (Sugar/Sprinkles/Phase), Burger (Heavy)
 */
import { palette, normalizeCosmetics, HATS, OUTFITS } from '../cosmetics.js';

export class DinockyModel {
  constructor() {
    // Animation timers
    this.timer = 0;
    this.cosmetics = normalizeCosmetics();
    this.blinkTimer = 0;
    this.blinkDuration = 0;

    // Morph weights (0.0 to 1.0)
    this.chompProgress = 0;  // 0 = mouth closed/smiling, 1 = wide open chomp
    this.chewProgress = 0;   // 0 = normal, 1 = cheek puff chew
    this.waddleAngle = 0;
    this.breathScale = 1;

    // Trail particles for Donut phase-jump
    this.phaseAfterimages = [];
  }

  update(dt, state = {}) {
    this.timer += dt;

    // Blinking logic
    this.blinkTimer += dt;
    if (this.blinkTimer > 3.5) {
      this.blinkDuration = 0.15;
      this.blinkTimer = 0;
    }
    if (this.blinkDuration > 0) {
      this.blinkDuration -= dt;
    }

    // Smooth morph for Chomp attack
    const targetChomp = state.isChomping ? 1.0 : 0.0;
    this.chompProgress += (targetChomp - this.chompProgress) * Math.min(1, dt * 18);

    // Smooth morph for Chewing
    const targetChew = state.isChewing ? 1.0 : 0.0;
    this.chewProgress += (targetChew - this.chewProgress) * Math.min(1, dt * 12);

    // Idle breathing
    this.breathScale = 1 + Math.sin(this.timer * 3) * 0.03;

    // Record afterimages if in Donut Phase mode
    if (state.activePower === 'DONUT' && (Math.abs(state.vx || 0) > 40 || Math.abs(state.vy || 0) > 40)) {
      if (Math.random() < 0.35) {
        this.phaseAfterimages.push({
          x: state.x || 0,
          y: state.y || 0,
          facing: state.facing || 1,
          alpha: 0.6,
          action: state.action || 'idle'
        });
      }
    }

    // Fade afterimages
    for (let i = this.phaseAfterimages.length - 1; i >= 0; i--) {
      this.phaseAfterimages[i].alpha -= dt * 2.5;
      if (this.phaseAfterimages[i].alpha <= 0) {
        this.phaseAfterimages.splice(i, 1);
      }
    }
  }

  /**
   * Render Dinocky onto a 2D Canvas context.
   * 
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Object} options Configuration options
   * @param {number} options.x Center X position
   * @param {number} options.y Center Y position (ground level)
   * @param {number} options.scale Overall scale factor (1 = ~64x64px)
   * @param {number} options.facing 1 = Right, -1 = Left
   * @param {string} options.action 'idle', 'run', 'jump', 'fall', 'chomp', 'chew'
   * @param {string|null} options.activePower null, 'PIZZA', 'DONUT', 'BURGER'
   * @param {boolean} options.isPhasing True when jumping through obstacles
   */
  render(ctx, options = {}) {
    const {
      x = 0,
      y = 0,
      scale = 1,
      facing = 1,
      action = 'idle',
      activePower = null,
      isPhasing = false,
      vx = 0,
      vy = 0
    } = options;

    ctx.save();

    // 1. Render Donut phase ghost trails if active
    if (this.phaseAfterimages.length > 0) {
      for (const ghost of this.phaseAfterimages) {
        ctx.save();
        ctx.globalAlpha = ghost.alpha * 0.45;
        ctx.translate(ghost.x, ghost.y);
        ctx.scale(ghost.facing * scale, scale);
        this._drawDinockyBody(ctx, { ...options, action: ghost.action, isGhost: true });
        ctx.restore();
      }
    }

    ctx.translate(x, y);
    ctx.scale(facing * scale, scale);

    // 2. Power-up Aura Background Glow
    if (activePower) {
      this._drawPowerAura(ctx, activePower, isPhasing);
    }

    // Phasing transparency
    if (isPhasing) {
      ctx.globalAlpha = 0.72;
    }

    // 3. Render Dinocky Character
    this._drawDinockyBody(ctx, { action, activePower, isPhasing, vx, vy });

    ctx.restore();
  }

  /**
   * Internal drawing routine for Dinocky's body parts
   */
  _drawDinockyBody(ctx, { action, activePower, isPhasing, isGhost = false }) {
    // Animation offsets
    let bodyBobY = 0;
    let bodyAngle = 0;
    let legL_Angle = 0;
    let legR_Angle = 0;
    let armAngle = 0;
    let tailAngle = 0;

    if (action === 'idle') {
      bodyBobY = Math.sin(this.timer * 3) * 2;
      tailAngle = Math.sin(this.timer * 2.5) * 0.08;
      armAngle = Math.sin(this.timer * 3) * 0.05;
    } else if (action === 'run') {
      bodyBobY = Math.abs(Math.sin(this.timer * 12)) * 4;
      bodyAngle = Math.sin(this.timer * 12) * 0.09;
      legL_Angle = Math.sin(this.timer * 12) * 0.45;
      legR_Angle = -Math.sin(this.timer * 12) * 0.45;
      armAngle = -Math.sin(this.timer * 12) * 0.35;
      tailAngle = Math.sin(this.timer * 12) * 0.2;
    } else if (action === 'jump') {
      bodyBobY = -4;
      bodyAngle = -0.06;
      legL_Angle = -0.3;
      legR_Angle = -0.2;
      armAngle = -0.4;
      tailAngle = -0.15;
    } else if (action === 'fall') {
      bodyBobY = 2;
      bodyAngle = 0.05;
      legL_Angle = 0.2;
      legR_Angle = 0.15;
      armAngle = 0.3;
      tailAngle = 0.1;
    }

    // Color Palette
    const colors = isGhost ? {
      body: '#A7F3D0',
      bodyDark: '#6EE7B7',
      belly: '#ECFDF5',
      spikes: '#FDE047',
      cheek: '#34D399',
      eye: '#064E3B'
    } : {
      body: palette(this.cosmetics.color).color,
      bodyDark: palette(this.cosmetics.color).dark,
      bodyLight: palette(this.cosmetics.color).light,
      belly: '#FFFDF5',
      spikes: '#FBBF24',
      spikesDark: '#D97706',
      cheek: '#FB7185',
      eye: '#22181C',
      mouthInside: '#831843',
      tongue: '#FB7185',
      teeth: '#FFFFFF'
    };

    // Shadow on the ground (unless airborne)
    if (action !== 'jump' && action !== 'fall') {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, 22 + bodyBobY * 0.5, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(0, -28 + bodyBobY);
    ctx.rotate(bodyAngle);

    // --- 1. Tail (Behind body) ---
    this._drawTail(ctx, colors, tailAngle);

    // --- 2. Yellow Dorsal Spikes (Behind body & spine) ---
    const { accessories } = normalizeCosmetics(this.cosmetics);
    const hat = !isGhost && accessories.some(id => HATS.includes(id));
    const outfit = isGhost ? null : accessories.find(id => OUTFITS.includes(id));
    this._drawSpikes(ctx, colors, hat);

    // --- 3. Left / Back Leg ---
    this._drawLeg(ctx, colors, -7, 20, legL_Angle, true);

    // --- 4. Main Chubby Dino Body & Head ---
    this._drawTorsoAndHead(ctx, colors);

    // --- 5. Cream Belly Patch ---
    this._drawBelly(ctx, colors);

    // --- 5b. Hoodie hood frames the face; it stays off under a hat ---
    if (outfit === 'hoodie' && !hat) this._drawHood(ctx);

    // --- 6. Cute Face: Eyes, Nostrils, Spiral Cheeks ---
    this._drawFace(ctx, colors);

    // --- 6b. Outfit body sits under the mouth so a chomp stays visible ---
    if (outfit) this._drawOutfitBody(ctx, outfit);

    // --- 7. Mouth & Scalloped Teeth (Chomp / Eat Mechanics) ---
    this._drawMouth(ctx, colors);

    // --- 8. Right / Front Leg ---
    this._drawLeg(ctx, colors, 6, 20, legR_Angle, false);

    // --- 9. Stubby Dinosaur Arm ---
    this._drawArm(ctx, colors, armAngle);
    if (outfit) this._drawOutfitLimbs(ctx, outfit, { armAngle, legL_Angle, legR_Angle });

    // --- 10. Accessories: scarf, then glasses, then hat on top ---
    if (!isGhost) for (const id of accessories) if (id !== outfit) this._drawAccessory(ctx, id);

    ctx.restore();
  }

  /**
   * Shop accessories, drawn in the side-on sprite frame (facing +x, head top near y = -26).
   */
  _drawAccessory(ctx, id) {
    ctx.save();
    if (id === 'cap') this._drawCap(ctx);
    else if (id === 'scarf') this._drawScarf(ctx);
    else if (id === 'bee_hat') this._drawBucketHat(ctx, 'bee');
    else if (id === 'frog_hat') this._drawBucketHat(ctx, 'frog');
    else if (id === 'glasses') this._drawGlasses(ctx);
    ctx.restore();
  }

  /**
   * Outfits: clothing is clipped to the body outline below the jaw.
   */
  _drawOutfitBody(ctx, id) {
    ctx.save();
    ctx.clip(this._bodyPath());
    ctx.fillStyle = { suit: '#1F2A44', explorer: '#C9AE7A', hoodie: '#8ED1BC' }[id];
    ctx.beginPath(); ctx.moveTo(-24, 4); ctx.quadraticCurveTo(4, 1, 24, 3); ctx.lineTo(24, 30); ctx.lineTo(-24, 30); ctx.fill();
    if (id === 'suit') {
      // White shirt front, red tie, satin lapel, buttons and a pocket square
      ctx.fillStyle = '#F4F2EC';
      ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(20, 3); ctx.lineTo(16, 15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#C62828';
      ctx.beginPath(); ctx.moveTo(12.5, 4); ctx.lineTo(15.5, 4); ctx.lineTo(15, 12); ctx.lineTo(13.5, 14); ctx.lineTo(12.5, 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0E1424'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(15.5, 16); ctx.stroke();
      ctx.fillStyle = '#0E1424';
      for (const y of [17, 21]) { ctx.beginPath(); ctx.arc(15, y, 1, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#E53935';
      ctx.beginPath(); ctx.moveTo(1, 9); ctx.lineTo(3, 6.5); ctx.lineTo(5, 9); ctx.closePath(); ctx.fill();
    } else if (id === 'explorer') {
      // Open vest over the cream tummy, pockets with brass snaps, satchel strap
      ctx.fillStyle = '#FFFDF5';
      ctx.beginPath(); ctx.ellipse(13, 10, 5, 11, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8E7343'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(13, 10, 5, 11, 0.15, 0.55 * Math.PI, 1.45 * Math.PI); ctx.stroke();
      for (const [x, y] of [[0, 8], [-1, 16]]) {
        ctx.fillStyle = '#B39760'; ctx.fillRect(x, y, 6, 5);
        ctx.fillStyle = '#8E7343'; ctx.fillRect(x, y, 6, 1.6);
        ctx.fillStyle = '#E0B050'; ctx.beginPath(); ctx.arc(x + 3, y + 1.5, 0.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#5A2E12'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-14, 2); ctx.lineTo(18, 18); ctx.stroke();
    } else {
      // Hoodie: ribbed hem, kangaroo pocket and drawstrings
      ctx.fillStyle = '#6DB9A2'; ctx.fillRect(-24, 20, 48, 4);
      ctx.beginPath(); ctx.roundRect(1, 11, 15, 7, 2); ctx.fill();
      ctx.strokeStyle = '#F4F1E8'; ctx.lineWidth = 1;
      for (const x of [11, 14]) { ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x + 0.5, 9); ctx.stroke(); }
      ctx.fillStyle = '#C49A3A';
      for (const x of [11.5, 14.5]) ctx.fillRect(x - 0.6, 9, 1.2, 1.8);
    }
    ctx.restore();
    if (id === 'explorer') {
      // Binoculars hang on the chest
      ctx.fillStyle = '#26221F';
      for (const x of [11.5, 15]) { ctx.beginPath(); ctx.roundRect(x, 5, 3, 5, 1); ctx.fill(); }
      ctx.fillStyle = '#4D7A99';
      for (const x of [11.5, 15]) ctx.fillRect(x + 0.5, 9.2, 2, 0.8);
    }
  }

  _drawOutfitLimbs(ctx, id, { armAngle, legL_Angle, legR_Angle }) {
    if (id === 'suit') {
      // Polished shoes over both feet
      for (const [x, angle, color] of [[-7, legL_Angle, '#2A2422'], [6, legR_Angle, '#141010']]) {
        ctx.save(); ctx.translate(x, 20); ctx.rotate(angle);
        ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(2, 7, 7.5, 3.6, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; ctx.beginPath(); ctx.ellipse(5, 5.6, 2.2, 0.8, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    if (id === 'explorer') return;
    // Sleeve over the arm with a contrasting cuff
    ctx.save();
    ctx.translate(6, 4); ctx.rotate(armAngle);
    if (this.chompProgress > 0.3) ctx.rotate(-0.5 * this.chompProgress);
    ctx.fillStyle = id === 'suit' ? '#1F2A44' : '#8ED1BC';
    ctx.beginPath(); ctx.ellipse(2, 2.5, 5, 3.8, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = id === 'suit' ? '#F4F2EC' : '#6DB9A2';
    ctx.beginPath(); ctx.ellipse(6, 4.3, 1.4, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawHood(ctx) {
    // The hood wraps the back of the head; its rim curves down behind the cheek.
    ctx.save();
    ctx.clip(this._bodyPath());
    ctx.fillStyle = '#8ED1BC';
    ctx.beginPath(); ctx.moveTo(4, -30); ctx.quadraticCurveTo(-6, -12, -1, 6); ctx.lineTo(-24, 6); ctx.lineTo(-24, -30); ctx.fill();
    ctx.strokeStyle = '#6DB9A2'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(3.5, -27); ctx.quadraticCurveTo(-5, -12, -1, 4); ctx.stroke();
    ctx.restore();
  }

  _drawCap(ctx) {
    // Tilted back so the brim lifts off the brow.
    ctx.translate(1, -27);
    ctx.rotate(-0.32);
    ctx.fillStyle = '#DEB87A';
    ctx.beginPath(); ctx.ellipse(0, -2, 11, 9, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#6A3818'; ctx.fillRect(-11, -4.5, 22, 3);
    ctx.fillStyle = '#E8C489';
    ctx.beginPath(); ctx.ellipse(1, -1, 16, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(106, 56, 24, 0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(1, -1, 16, 3.5, 0, 0.05 * Math.PI, 0.95 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath(); ctx.arc(7, -3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -11.5, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  _drawScarf(ctx) {
    const sway = Math.sin(this.timer * 4) * 1.2;
    // Neck sits just under the jaw.
    ctx.translate(0, 9);
    const tail =(x0, x1, length, width, color) => {
      const y0 = 3, y1 = y0 + length;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x0 - width / 2, y0);
      ctx.lineTo(x0 + width / 2, y0);
      ctx.quadraticCurveTo(x1 + width / 2 + 1, (y0 + y1) / 2, x1 + width / 2, y1);
      ctx.lineTo(x1 - width / 2, y1);
      ctx.quadraticCurveTo(x1 - width / 2 - 1, (y0 + y1) / 2, x0 - width / 2, y0);
      ctx.fill();
      // Knitted fringe
      ctx.strokeStyle = '#E25555'; ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(x1 + i * width / 3, y1); ctx.lineTo(x1 + i * width / 3 + sway * 0.5, y1 + 3); ctx.stroke();
      }
    };
    tail(13, 16 + sway, 9, 4.5, '#9E1B1B');
    ctx.fillStyle = '#C62828';
    ctx.beginPath(); ctx.ellipse(0, 1, 18, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120, 15, 20, 0.45)'; ctx.lineWidth = 1;
    for (const x of [-10, -4, 2, 8]) { ctx.beginPath(); ctx.moveTo(x, -2.5); ctx.lineTo(x + 1, 4.5); ctx.stroke(); }
    tail(10, 11.5 + sway, 11, 5, '#C62828');
    ctx.fillStyle = '#B02020';
    ctx.beginPath(); ctx.arc(11, 2.5, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  _drawBucketHat(ctx, kind) {
    const isBee = kind === 'bee';
    const main = isBee ? '#F4B400' : '#7CC24A', shade = isBee ? '#C98F00' : '#5A9A34';
    ctx.translate(1, -26);
    ctx.rotate(-0.12);
    // Crown: rounded bucket shape
    const crown = new Path2D();
    crown.moveTo(-11, 0);
    crown.lineTo(-9, -10);
    crown.quadraticCurveTo(0, -15, 9, -10);
    crown.lineTo(11, 0);
    crown.closePath();
    ctx.fillStyle = main; ctx.fill(crown);
    if (isBee) {
      ctx.save(); ctx.clip(crown);
      ctx.fillStyle = '#1C1A17';
      ctx.fillRect(-12, -5.5, 24, 2.5);
      ctx.fillRect(-12, -10.5, 24, 2.5);
      ctx.restore();
      // Little white wings on top
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#BDBAB0'; ctx.lineWidth = 1;
      for (const [x, angle] of [[-3.5, -0.55], [1.5, 0.35]]) {
        ctx.beginPath(); ctx.ellipse(x, -14.5, 2.6, 4, angle, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else {
      // Two big froggy eyes
      for (const [x, r] of [[-4, 4.8], [5, 5.4]]) {
        ctx.fillStyle = main;
        ctx.beginPath(); ctx.arc(x, -13, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#171113';
        ctx.beginPath(); ctx.arc(x + 1, -13.5, r * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(x + 2, -15, r * 0.22, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#EE8FB0';
      ctx.beginPath(); ctx.ellipse(8, -4, 2, 1.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Floppy brim
    ctx.fillStyle = main;
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = shade; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 4, 0, 0.05 * Math.PI, 0.95 * Math.PI); ctx.stroke();
  }

  _drawGlasses(ctx) {
    // Side view: one round lens over the eye, the bridge peeking toward the snout.
    ctx.strokeStyle = '#E0708A'; ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(13.3, -15.5); ctx.quadraticCurveTo(15, -17.5, 16.5, -16); ctx.stroke();
    ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.arc(8, -14, 5.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Temple arm back toward the ear
    ctx.strokeStyle = '#D9A877'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(2.6, -14.5); ctx.lineTo(-8, -16); ctx.stroke();
  }

  /**
   * Draw the thick, cute dinosaur tail with yellow dorsal scallop
   */
  _drawTail(ctx, colors, tailAngle) {
    ctx.save();
    ctx.translate(-16, 12);
    ctx.rotate(tailAngle);

    // Yellow spike on tail
    ctx.beginPath();
    ctx.arc(-14, -4, 5, 0, Math.PI * 2);
    ctx.fillStyle = colors.spikes;
    ctx.fill();

    // Tail flesh
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(-12, -4, -18, 0);
    ctx.quadraticCurveTo(-14, 8, 0, 10);
    ctx.closePath();
    ctx.fillStyle = colors.bodyDark;
    ctx.fill();
    ctx.fillStyle = colors.body;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw the yellow dorsal ridges / spikes along the back
   */
  _drawSpikes(ctx, colors, underHat = false) {
    ctx.save();
    ctx.fillStyle = colors.spikes;

    // 4 rounded scallops down back and top of head
    const spikes = [
      { x: -5, y: -26, r: 6.5 },  // Head crown spike
      { x: -14, y: -19, r: 6.0 }, // Neck spike
      { x: -19, y: -8, r: 6.2 },  // Upper back spike
      { x: -19, y: 4, r: 5.5 }    // Lower back spike
    ];

    for (const s of underHat ? spikes.slice(1) : spikes) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Draw Dinocky's pear-shaped body and chubby snout
   */
  _drawTorsoAndHead(ctx, colors) {
    ctx.save();

    // Base body contour
    const body = this._bodyPath();
    ctx.fillStyle = colors.body;
    ctx.fill(body);

    // Subtle 3D shadow gradient on the back
    const grad = ctx.createLinearGradient(-18, 0, 16, 0);
    grad.addColorStop(0, 'rgba(190, 60, 80, 0.25)');
    grad.addColorStop(0.5, 'rgba(190, 60, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fill(body);

    ctx.restore();
  }

  _bodyPath() {
    const path = new Path2D();
    // Top of head
    path.moveTo(2, -26);
    // Forehead curving into friendly chubby snout
    path.bezierCurveTo(14, -26, 20, -18, 20, -8);
    // Lower snout / cheek contour
    path.bezierCurveTo(20, 0, 18, 8, 16, 16);
    // Lower body / bottom curve
    path.bezierCurveTo(14, 24, -10, 25, -16, 16);
    // Back curve up to neck
    path.bezierCurveTo(-20, 6, -18, -12, -14, -20);
    // Crown curve
    path.quadraticCurveTo(-6, -26, 2, -26);
    path.closePath();
    return path;
  }

  /**
   * Draw the soft cream belly patch
   */
  _drawBelly(ctx, colors) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(4, 7, 10, 12, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = colors.belly;
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw eyes with white catchlight, nostrils, and signature swirl cheeks
   */
  _drawFace(ctx, colors) {
    ctx.save();

    // Eyes
    const isBlinking = this.blinkDuration > 0;
    const eyeX = 8;
    const eyeY = -14;

    if (isBlinking) {
      // Blink line
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.eye;
      ctx.stroke();
    } else {
      // Big friendly beady eye
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = colors.eye;
      ctx.fill();

      // Specular highlight dot
      ctx.beginPath();
      ctx.arc(eyeX + 1.2, eyeY - 1.2, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    // Nostril mark (cute little curved arc on snout tip)
    ctx.beginPath();
    ctx.arc(17, -10, 1.6, 0.8 * Math.PI, 1.8 * Math.PI);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(180, 50, 70, 0.55)';
    ctx.stroke();

    // Signature Pink Spiral Cheek (from plush & 2D art!)
    this._drawSpiralCheek(ctx, colors.cheek, 4, -7);

    ctx.restore();
  }

  /**
   * Draw the signature spiral swirl on Dinocky's cheek
   */
  _drawSpiralCheek(ctx, color, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    const turns = 1.9;
    const a = 0.7;
    for (let t = 0; t <= turns * Math.PI * 2; t += 0.2) {
      const r = a * t;
      const px = r * Math.cos(t);
      const py = r * Math.sin(t);
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Mouth, Scalloped Teeth, and Wide Open Chomp Attack!
   */
  _drawMouth(ctx, colors) {
    ctx.save();

    const chomp = this.chompProgress; // 0 = closed smile, 1 = giant chomp
    const chew = this.chewProgress;

    if (chomp < 0.05 && chew < 0.05) {
      // Normal happy resting smile with visible white teeth rim
      ctx.beginPath();
      ctx.arc(12, -4, 6, 0.1 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = colors.bodyDark;
      ctx.stroke();

      // Row of 3 scalloped cartoon teeth along upper lip
      ctx.fillStyle = colors.teeth;
      for (let i = 0; i < 3; i++) {
        const tx = 9 + i * 3.2;
        const ty = -3.5;
        ctx.beginPath();
        ctx.moveTo(tx - 1.5, ty);
        ctx.lineTo(tx, ty + 2.5);
        ctx.lineTo(tx + 1.5, ty);
        ctx.closePath();
        ctx.fill();
      }
    } else if (chew > 0.05) {
      // Chewing animation (puffing cheeks with cute chewing arc)
      const chewBounce = Math.sin(this.timer * 20) * 2 * chew;
      ctx.beginPath();
      ctx.ellipse(14, -3 + chewBounce, 4, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = colors.mouthInside;
      ctx.fill();

      // Chewing crumbs flying out
      ctx.fillStyle = '#F59E0B';
      const c1 = Math.sin(this.timer * 15) * 5;
      ctx.fillRect(19 + c1, -6 + chewBounce, 2, 2);
      ctx.fillRect(21 - c1, -1 + chewBounce, 1.5, 1.5);
    } else {
      // --- WIDE OPEN CHOMP / EAT ENEMY ATTACK ---
      const jawDrop = chomp * 16;

      // Inside of gaping mouth
      ctx.beginPath();
      ctx.moveTo(8, -5);
      ctx.quadraticCurveTo(24 + chomp * 6, -6, 22 + chomp * 4, 4 + jawDrop);
      ctx.quadraticCurveTo(12, 10 + jawDrop, 8, 3);
      ctx.closePath();
      ctx.fillStyle = colors.mouthInside;
      ctx.fill();

      // Big tasty pink tongue inside
      ctx.beginPath();
      ctx.ellipse(13, 2 + jawDrop * 0.7, 5, 3 + chomp * 2, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = colors.tongue;
      ctx.fill();

      // Top row of sharp cartoon teeth
      ctx.fillStyle = colors.teeth;
      for (let i = 0; i < 4; i++) {
        const tx = 9 + i * 3.5;
        const ty = -5;
        ctx.beginPath();
        ctx.moveTo(tx - 1.8, ty);
        ctx.lineTo(tx, ty + 3.8);
        ctx.lineTo(tx + 1.8, ty);
        ctx.closePath();
        ctx.fill();
      }

      // Bottom row of teeth on the dropped lower jaw
      for (let i = 0; i < 3; i++) {
        const bx = 11 + i * 3.5;
        const by = 4 + jawDrop;
        ctx.beginPath();
        ctx.moveTo(bx - 1.6, by);
        ctx.lineTo(bx, by - 3.5);
        ctx.lineTo(bx + 1.6, by);
        ctx.closePath();
        ctx.fill();
      }

      // Appetite suction wind swirls
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      const swirl = (this.timer * 18) % 15;
      ctx.beginPath();
      ctx.arc(28 - swirl, 0 + jawDrop * 0.4, 5, 0.2, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draw cute dinosaur feet
   */
  _drawLeg(ctx, colors, lx, ly, angle, isBack) {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.ellipse(0, 4, 6.5, 5, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = isBack ? colors.bodyDark : colors.body;
    ctx.fill();

    // Little round toes
    ctx.fillStyle = isBack ? colors.bodyDark : colors.bodyLight;
    ctx.beginPath();
    ctx.arc(3, 7, 2, 0, Math.PI * 2);
    ctx.arc(6, 6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw stubby dinosaur arm
   */
  _drawArm(ctx, colors, armAngle) {
    ctx.save();
    ctx.translate(6, 4);
    ctx.rotate(armAngle);

    // If chomping, arms reach out happily!
    if (this.chompProgress > 0.3) {
      ctx.rotate(-0.5 * this.chompProgress);
    }

    ctx.beginPath();
    ctx.ellipse(3, 3, 5, 3.5, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = colors.body;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw dynamic superpower auras
   */
  _drawPowerAura(ctx, power, isPhasing) {
    ctx.save();
    const t = this.timer;

    if (power === 'PIZZA') {
      // Warm golden cheese / fire aura with pizza slice floating icon
      const pulse = 1 + Math.sin(t * 8) * 0.12;
      const grad = ctx.createRadialGradient(0, -25, 10, 0, -25, 42 * pulse);
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
      grad.addColorStop(0.7, 'rgba(239, 68, 68, 0.2)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -25, 44 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Floating pizza slice crown
      ctx.save();
      ctx.translate(0, -62 + Math.sin(t * 5) * 3);
      this._drawMiniPizza(ctx);
      ctx.restore();

    } else if (power === 'DONUT') {
      // Sugar glaze swirl aura with rainbow sprinkles
      const pulse = 1 + Math.sin(t * 10) * 0.15;
      const grad = ctx.createRadialGradient(0, -25, 10, 0, -25, 46 * pulse);
      grad.addColorStop(0, isPhasing ? 'rgba(192, 132, 252, 0.65)' : 'rgba(244, 114, 182, 0.45)');
      grad.addColorStop(0.6, 'rgba(167, 139, 250, 0.25)');
      grad.addColorStop(1, 'rgba(167, 139, 250, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -25, 48 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting rainbow sprinkles
      const sprinkleColors = ['#F43F5E', '#3B82F6', '#10B981', '#FBBF24', '#A855F7'];
      for (let i = 0; i < 6; i++) {
        const angle = t * 3 + (i * Math.PI * 2) / 6;
        const dist = 36 + Math.sin(t * 4 + i) * 6;
        const sx = Math.cos(angle) * dist;
        const sy = -25 + Math.sin(angle) * dist * 0.6;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
        ctx.fillRect(-2, -1, 4, 2);
        ctx.restore();
      }

      // Floating donut icon
      ctx.save();
      ctx.translate(0, -62 + Math.sin(t * 5) * 3);
      this._drawMiniDonut(ctx);
      ctx.restore();

    } else if (power === 'BURGER') {
      // Heavy seismic impact aura
      const pulse = 1 + Math.sin(t * 6) * 0.08;
      const grad = ctx.createRadialGradient(0, -25, 10, 0, -25, 40 * pulse);
      grad.addColorStop(0, 'rgba(217, 119, 6, 0.4)');
      grad.addColorStop(1, 'rgba(180, 83, 9, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -25, 42 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Floating burger icon
      ctx.save();
      ctx.translate(0, -62 + Math.sin(t * 5) * 3);
      this._drawMiniBurger(ctx);
      ctx.restore();
    }

    ctx.restore();
  }

  _drawMiniPizza(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 6);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fillStyle = '#F59E0B';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#D97706';
    ctx.stroke();

    // Pepperonis
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.arc(3, 3, 1.6, 0, Math.PI * 2);
    ctx.arc(-3, 3, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawMiniDonut(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#F472B6';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Sprinkles
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(-5, -3, 2, 1);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(3, 2, 2, 1);
    ctx.fillStyle = '#34D399';
    ctx.fillRect(0, -6, 1, 2);
  }

  _drawMiniBurger(ctx) {
    // Bun top
    ctx.beginPath();
    ctx.arc(0, -2, 7, Math.PI, 0);
    ctx.fillStyle = '#D97706';
    ctx.fill();
    // Patty
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-7, -1, 14, 2.5);
    // Cheese
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(-7, 1.5, 14, 1.5);
    // Bottom bun
    ctx.fillStyle = '#D97706';
    ctx.fillRect(-6.5, 3, 13, 2.5);
  }
}
