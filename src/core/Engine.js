/**
 * Engine.js - Game Loop & Engine Orchestrator.
 * 
 * Features:
 * - Fixed timestep update (60 updates per second) with delta-time accumulator
 * - Dispatches input updates, physics ticks, state updates, and renders
 */
export class Engine {
  constructor(canvas, updateFn, renderFn) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.updateFn = updateFn;
    this.renderFn = renderFn;

    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedStep = 1 / 60; // 60Hz physics
    this.isRunning = false;
    this.rafId = null;

    this._loop = this._loop.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this._loop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  _loop(currentTime) {
    if (!this.isRunning) return;

    let frameTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp frame time to prevent spiral of death on tab unfocus
    if (frameTime > 0.1) {
      frameTime = 0.1;
    }

    this.accumulator += frameTime;

    while (this.isRunning && this.accumulator >= this.fixedStep) {
      this.updateFn(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }

    this.renderFn(this.ctx);
    if (this.isRunning) this.rafId = requestAnimationFrame(this._loop);
  }
}
