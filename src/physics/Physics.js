/**
 * Physics.js - Platformer Kinematics & Collision Engine.
 * 
 * Features:
 * - Responsive platformer physics with coyote time and jump buffering
 * - Solid obstacle collision resolution (walls, floors, ceilings)
 * - Semi-solid one-way platforms (jump through from below, drop through with Down + Jump)
 * - Donut Phase-Jump mode (phasing through solid obstacle blocks)
 */
export class Physics {
  constructor(options = {}) {
    this.gravity = options.gravity ?? 1400;       // pixels / s^2
    this.maxFallSpeed = options.maxFallSpeed ?? 650;
    this.moveSpeed = options.moveSpeed ?? 260;
    this.phaseSpeedMultiplier = 1.6;
    this.jumpForce = options.jumpForce ?? -560;
    this.minJumpForce = options.minJumpForce ?? -240;

    // Forgiving jump timers (in seconds)
    this.coyoteTimeMax = 0.12;   // ~7 frames
    this.jumpBufferMax = 0.10;   // ~6 frames
  }

  /**
   * Update player velocity and position against platformer environment.
   * 
   * @param {Object} player Player state
   * @param {Object} input Input state
   * @param {Array} obstacles Array of solid bounding boxes {x, y, w, h, isPhaseable}
   * @param {Array} oneWayPlatforms Array of one-way platforms {x, y, w, h}
   * @param {number} dt Delta time in seconds
   */
  update(player, input, obstacles = [], oneWayPlatforms = [], dt) {
    // 1. Horizontal Movement & Acceleration
    let targetSpeed = 0;
    if (input.left) targetSpeed -= this.moveSpeed;
    if (input.right) targetSpeed += this.moveSpeed;

    // Apply speed boost if Donut Sugar Rush is active
    if (player.activePower === 'DONUT') {
      targetSpeed *= this.phaseSpeedMultiplier;
    }

    // Acceleration & friction
    const accel = player.isGrounded ? 18 : 10;
    player.vx += (targetSpeed - player.vx) * Math.min(1, dt * accel);

    if (Math.abs(player.vx) > 5) {
      player.facing = player.vx > 0 ? 1 : -1;
    }

    // 2. Coyote Time & Jump Buffering
    if (player.isGrounded) {
      player.coyoteTimer = this.coyoteTimeMax;
    } else {
      player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
    }

    if (input.jumpJustPressed) {
      player.jumpBufferTimer = this.jumpBufferMax;
    } else {
      player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
    }

    // Check if player wants to drop through a semi-solid platform
    if (input.dropThrough && player.isGrounded) {
      player.isDroppingThrough = true;
      player.dropThroughTimer = 0.22;
      player.isGrounded = false;
      player.vy = 80; // slight push down
    }

    if (player.dropThroughTimer > 0) {
      player.dropThroughTimer -= dt;
      if (player.dropThroughTimer <= 0) {
        player.isDroppingThrough = false;
      }
    }

    // 3. Jump Execution
    if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0 && !player.isDroppingThrough) {
      player.vy = this.jumpForce;
      player.isGrounded = false;
      player.coyoteTimer = 0;
      player.jumpBufferTimer = 0;
      player.isJumping = true;
    }

    // Variable jump height: release jump button early to cut jump short
    if (!input.jump && player.vy < this.minJumpForce) {
      player.vy = this.minJumpForce;
    }

    // 4. Gravity
    player.vy += this.gravity * dt;
    if (player.vy > this.maxFallSpeed) {
      player.vy = this.maxFallSpeed;
    }

    // 5. Integrate & Resolve Collisions
    this._integrateAndCollide(player, obstacles, oneWayPlatforms, dt);

    // 6. Set ground/air states
    if (player.isGrounded) {
      player.isJumping = false;
    }
  }

  _integrateAndCollide(player, obstacles, oneWayPlatforms, dt) {
    const hitbox = player.getHitbox();

    // --- HORIZONTAL PASS ---
    const nextX = player.x + player.vx * dt;
    const testBoxH = {
      x: nextX - hitbox.halfW,
      y: player.y - hitbox.height,
      w: hitbox.width,
      h: hitbox.height
    };

    // Check solid obstacles horizontally
    let hitWall = false;
    for (const obs of obstacles) {
      // If Donut phase mode is active, pass right through phaseable obstacles!
      if (player.isPhasing && obs.isPhaseable !== false) {
        continue;
      }

      if (this.checkAABB(testBoxH, obs)) {
        if (player.vx > 0) {
          player.x = obs.x - hitbox.halfW;
        } else if (player.vx < 0) {
          player.x = obs.x + obs.w + hitbox.halfW;
        }
        player.vx = 0;
        hitWall = true;
        break;
      }
    }

    if (!hitWall) {
      player.x = nextX;
    }

    // --- VERTICAL PASS ---
    const prevBottom = player.y;
    const nextY = player.y + player.vy * dt;
    const testBoxV = {
      x: player.x - hitbox.halfW,
      y: nextY - hitbox.height,
      w: hitbox.width,
      h: hitbox.height
    };

    let hitFloorOrCeiling = false;

    // Check solid obstacles vertically
    for (const obs of obstacles) {
      // If Donut phase mode is active and player is moving up/through obstacles
      if (player.isPhasing && obs.isPhaseable !== false) {
        continue;
      }

      if (this.checkAABB(testBoxV, obs)) {
        if (player.vy > 0) {
          // Landing on floor
          player.y = obs.y;
          player.vy = 0;
          player.isGrounded = true;
          hitFloorOrCeiling = true;
        } else if (player.vy < 0) {
          // Bonking ceiling
          player.y = obs.y + obs.h + hitbox.height;
          player.vy = 0;
          hitFloorOrCeiling = true;
        }
        break;
      }
    }

    // Check Semi-Solid One-Way Platforms
    if (!hitFloorOrCeiling && !player.isDroppingThrough) {
      for (const plat of oneWayPlatforms) {
        // Can only land when falling downwards (vy >= 0)
        // and player's feet were at or above the platform in previous frame
        if (player.vy >= 0 && prevBottom <= plat.y + 6) {
          const feetX = player.x;
          const feetNextY = nextY;

          if (feetX + hitbox.halfW > plat.x &&
              feetX - hitbox.halfW < plat.x + plat.w &&
              feetNextY >= plat.y &&
              prevBottom <= plat.y + 12) {
            player.y = plat.y;
            player.vy = 0;
            player.isGrounded = true;
            hitFloorOrCeiling = true;
            break;
          }
        }
      }
    }

    if (!hitFloorOrCeiling) {
      player.y = nextY;
      player.isGrounded = false;
    }
  }

  checkAABB(b1, b2) {
    return (
      b1.x < b2.x + b2.w &&
      b1.x + b1.w > b2.x &&
      b1.y < b2.y + b2.h &&
      b1.y + b1.h > b2.y
    );
  }
}
