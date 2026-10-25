/**
 * Player.js - Dinocky Player Entity & Controller.
 * 
 * Orchestrates:
 * - Movement and kinematic state
 * - Action determination (idle, run, jump, fall, chomp, chew)
 * - FoodPowerManager interactions (pizza eating, donut phasing, burger stomp)
 * - Rendering via DinockyModel
 */
import { DinockyModel } from './DinockyModel.js';
import { FoodPowerManager } from '../powerups/FoodPowers.js';

export class Player {
  constructor(x = 100, y = 300) {
    this.x = x;
    this.y = y; // y represents the ground/feet position
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1 = right, -1 = left
    this.scale = 1.0;

    // Platformer State flags
    this.isGrounded = false;
    this.isJumping = false;
    this.isChomping = false;
    this.isChewing = false;
    this.isPhasing = false;
    this.isDroppingThrough = false;

    // Timers
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.dropThroughTimer = 0;

    // Active power-up
    this.activePower = null;

    // Visual model & power manager
    this.model = new DinockyModel();
    this.powerManager = new FoodPowerManager();

    // Hitbox dimensions
    this.hitbox = {
      width: 36,
      height: 52,
      halfW: 18
    };
  }

  getHitbox() {
    return this.hitbox;
  }

  update(dt, input, enemies = []) {
    // 1. Update power manager and food timers
    this.powerManager.update(dt, this, enemies);

    // 2. Handle Action (Chomp / Eat Enemy) button
    if (input.actionJustPressed) {
      this.powerManager.triggerChomp(this, enemies);
    }

    // 3. Determine current visual action state
    let action = 'idle';
    if (this.isChomping) {
      action = 'chomp';
    } else if (this.isChewing) {
      action = 'chew';
    } else if (!this.isGrounded) {
      action = this.vy < 0 ? 'jump' : 'fall';
    } else if (Math.abs(this.vx) > 15) {
      action = 'run';
    }

    this.currentAction = action;

    // 4. Update the character model rig
    this.model.update(dt, {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      facing: this.facing,
      action: this.currentAction,
      isChomping: this.isChomping,
      isChewing: this.isChewing,
      activePower: this.activePower,
      isPhasing: this.isPhasing
    });
  }

  render(ctx) {
    this.model.render(ctx, {
      x: this.x,
      y: this.y,
      scale: this.scale,
      facing: this.facing,
      action: this.currentAction,
      activePower: this.activePower,
      isPhasing: this.isPhasing,
      vx: this.vx,
      vy: this.vy
    });
  }
}
