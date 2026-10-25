/**
 * Development-only character studio and unranked arena.
 * 
 * Provides:
 * 1. Playable Platformer Mode (Movement, Jump-Through Platforms, Donut Phase-Jump, Pizza Enemy Chomping)
 * 2. Character Model Studio Mode (Direct inspection of Dinocky's procedural vector model & animations)
 */
import { Engine } from './core/Engine.js';
import { Input } from './core/Input.js';
import { events } from './core/Events.js';
import { Player } from './character/Player.js';
import { Physics } from './physics/Physics.js';
import { TestArena } from './levels/TestArena.js';
import { Level1 } from './levels/Level1.js';
import { HUD } from './ui/HUD.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { DinockyModel } from './character/DinockyModel.js';

// Setup Canvas
const gameCanvas = document.getElementById('gameCanvas');
const studioCanvas = document.getElementById('studioCanvas');

const input = new Input();
const physics = new Physics();
let player = new Player(80, 480);
let arena = new Level1();
const hud = new HUD();
const sound = new SoundEngine();
let selectedLevel = 'world';
let activeTab = 'game';
let paused = false;

let score = 0;
let enemiesEatenCount = 0;

// Listen to events
events.on('enemyEaten', (data) => {
  score += data.points;
  enemiesEatenCount++;
  arena.addPopup(data.pos.x, data.pos.y, `CHOMP! +${data.points}`, '#FB7185');
  updateHUD();
});

events.on('powerupActivated', (power) => {
  arena.addPopup(player.x, player.y - 70, `${power.name.toUpperCase()}!`, '#B45309');
  updateHUD();
});

events.on('powerupExpired', () => {
  updateHUD();
});

events.on('enemyDefeated', data => {
  score += data.points;
  arena.addPopup(data.pos.x, data.pos.y, `STOMP! +${data.points}`, '#B45309');
});
events.on('levelCompleted', data => { score += data.bonus; });
events.on('bonusEnergy', data => {
  if (player.powerManager.activePower === 'PIZZA') {
    player.powerManager.powerTimer = Math.min(15, player.powerManager.powerTimer + data.amount / 10);
  }
});

// Update HUD elements in the DOM
function updateHUD() {
  hud.update({ score, eaten: enemiesEatenCount, player, level: arena,
    paused: paused || activeTab !== 'game' || document.hidden });
}

// Fixed timestep Game Loop
function gameUpdate(dt) {
  if (input.justPressed.has('KeyR') && activeTab === 'game') window.resetGame();
  if (input.justPressed.has('KeyP') && activeTab === 'game') window.togglePause();
  if (paused || activeTab !== 'game' || document.hidden || arena.status === 'won' || arena.status === 'lost') {
    input.update();
    updateHUD();
    return;
  }
  arena.beforeUpdate?.(player, input);
  const wasGrounded = player.isGrounded;
  const wasChomping = player.isChomping;
  // Update Physics
  physics.update(player, input, arena.obstacles, arena.oneWayPlatforms, dt);

  // Update Player Controller & Model
  player.update(dt, input, arena.enemies);
  if (wasGrounded && !player.isGrounded && player.vy < 0) events.emit('jump', {});
  if (!wasChomping && player.isChomping) events.emit('chomp', {});

  // Update Arena & Collectibles
  arena.update(dt, player);

  // Clear input justPressed buffers
  input.update();

  updateHUD();
}

function gameRender(ctx) {
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  // Render Arena (Background, Platforms, Obstacles, Food, Enemies)
  arena.render(ctx);

  // Render Dinocky
  ctx.save();
  ctx.translate(-(arena.cameraX || 0), 0);
  if (!arena.invulnerable || Math.floor(arena.invulnerable * 12) % 2 === 0) player.render(ctx);
  ctx.restore();
  hud.renderResult(ctx, arena);
}

const gameEngine = new Engine(gameCanvas, gameUpdate, gameRender);
gameEngine.start();

// -------------------------------------------------------------
// Character Model Studio Mode (Inspection & Animation Controls)
// -------------------------------------------------------------
const studioCtx = studioCanvas ? studioCanvas.getContext('2d') : null;
const studioModel = new DinockyModel();

let studioState = {
  action: 'idle',
  activePower: null,
  isChomping: false,
  isChewing: false,
  isPhasing: false,
  facing: 1,
  scale: 2.2
};

let lastStudioTime = performance.now();

function runStudioLoop(currentTime) {
  const dt = Math.min(0.1, (currentTime - lastStudioTime) / 1000);
  lastStudioTime = currentTime;

  studioModel.update(dt, {
    action: studioState.action,
    isChomping: studioState.isChomping,
    isChewing: studioState.isChewing,
    activePower: studioState.activePower,
    isPhasing: studioState.isPhasing,
    facing: studioState.facing
  });

  if (studioCtx) {
    studioCtx.clearRect(0, 0, studioCanvas.width, studioCanvas.height);

    // Subtle pedestal gradient
    const ped = studioCtx.createRadialGradient(
      studioCanvas.width / 2, 280, 10,
      studioCanvas.width / 2, 280, 120
    );
    ped.addColorStop(0, 'rgba(251, 113, 133, 0.2)');
    ped.addColorStop(1, 'rgba(255, 255, 255, 0)');
    studioCtx.fillStyle = ped;
    studioCtx.beginPath();
    studioCtx.arc(studioCanvas.width / 2, 280, 120, 0, Math.PI * 2);
    studioCtx.fill();

    studioModel.render(studioCtx, {
      x: studioCanvas.width / 2,
      y: 280,
      scale: studioState.scale,
      facing: studioState.facing,
      action: studioState.action,
      activePower: studioState.activePower,
      isPhasing: studioState.isPhasing
    });
  }

  requestAnimationFrame(runStudioLoop);
}

if (studioCanvas) {
  requestAnimationFrame(runStudioLoop);
}

// Studio UI Bindings
window.setStudioAction = function(action) {
  studioState.action = action;
  studioState.isChomping = (action === 'chomp');
  studioState.isChewing = (action === 'chew');
  updateStudioButtons();
};

window.setStudioPower = function(power) {
  studioState.activePower = power === 'NONE' ? null : power;
  studioState.isPhasing = (power === 'DONUT');
  updateStudioButtons();
};

window.toggleStudioFacing = function() {
  studioState.facing *= -1;
};

// Quick in-game powerup trigger buttons for quick testing
window.giveGamePower = function(power) {
  if (arena.status === 'won' || arena.status === 'lost') return;
  player.powerManager.applyPower(power);
  player.activePower = player.powerManager.activePower;
  player.isPhasing = player.activePower === 'DONUT';
  updateHUD();
};

window.resetGame = function() {
  sound.stop();
  arena = selectedLevel === 'arena' ? new TestArena() : new Level1();
  player = new Player(80, 480);
  paused = false;
  document.getElementById('pauseButton').textContent = 'Pause (P)';
  score = 0;
  enemiesEatenCount = 0;
  updateHUD();
};

window.changeLevel = function(value) {
  selectedLevel = value === 'arena' ? 'arena' : 'world';
  window.resetGame();
};

window.togglePause = function() {
  paused = !paused;
  document.getElementById('pauseButton').textContent = paused ? 'Resume (P)' : 'Pause (P)';
  if (paused) sound.stop();
  updateHUD();
};

window.toggleSound = function() {
  sound.setMuted(!sound.muted);
  const button = document.getElementById('soundButton');
  button.textContent = sound.muted ? 'Sound: Off' : 'Sound: On';
  button.setAttribute('aria-pressed', String(!sound.muted));
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) sound.stop();
});
window.addEventListener('blur', () => {
  if (!paused && activeTab === 'game') window.togglePause();
});

function updateStudioButtons() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-action') === studioState.action);
  });
  document.querySelectorAll('[data-power]').forEach(btn => {
    const p = btn.getAttribute('data-power');
    const isAct = (p === 'NONE' && !studioState.activePower) || (p === studioState.activePower);
    btn.classList.toggle('active', isAct);
  });
}

// Tab Switching
window.switchTab = function(tabName) {
  activeTab = tabName === 'game' ? 'game' : 'studio';
  if (activeTab !== 'game') sound.stop();
  const gameTab = document.getElementById('gameTab');
  const studioTab = document.getElementById('studioTab');
  const tabBtnGame = document.getElementById('tabBtnGame');
  const tabBtnStudio = document.getElementById('tabBtnStudio');

  if (tabName === 'game') {
    gameTab.style.display = 'block';
    studioTab.style.display = 'none';
    tabBtnGame.classList.add('active');
    tabBtnStudio.classList.remove('active');
  } else {
    gameTab.style.display = 'none';
    studioTab.style.display = 'block';
    tabBtnGame.classList.remove('active');
    tabBtnStudio.classList.add('active');
  }
  updateHUD();
};

updateHUD();
