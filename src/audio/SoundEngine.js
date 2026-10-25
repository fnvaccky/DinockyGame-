import { events } from '../core/Events.js';

/** Small, asset-free chiptune synthesizer. Audio is created only after a gesture. */
export class SoundEngine {
  constructor(target = globalThis.window) {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.7;
    this.target = target;
    this.voices = new Set();
    this.unlock = () => { void this.resume(); };
    target?.addEventListener('pointerdown', this.unlock);
    target?.addEventListener('keydown', this.unlock);
    this.unsubscribers = Object.entries({
      jump: () => this.sweep(180, 680, 0.13),
      chomp: () => this.sweep(190, 55, 0.12, 'sawtooth'),
      enemyEaten: () => this.sequence([330, 440, 660], 0.055),
      enemyDefeated: () => this.sweep(140, 45, 0.17, 'triangle'),
      powerupActivated: p => this.playFanfare(p.type),
      powerupExpired: () => this.sequence([440, 330, 220], 0.09),
      bonusEnergy: () => this.tone(880, 0.06, 'triangle', 0.03),
      playerHurt: () => this.sweep(320, 70, 0.22, 'sawtooth'),
      stomp: () => this.sweep(110, 28, 0.25, 'triangle'),
      checkpoint: () => this.sequence([392, 523, 784], 0.1),
      levelCompleted: () => this.sequence([262, 330, 392, 523, 392, 523, 784], 0.12),
      gameOver: () => this.sequence([330, 294, 262, 196, 131], 0.18)
    }).map(([name, callback]) => events.on(name, callback));
  }

  async resume() {
    try {
      if (!this.context) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return;
        this.context = new Audio();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume * 0.17;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      // Audio support or device access must never interrupt the game.
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master) this.master.gain.setValueAtTime(this.muted ? 0 : this.volume * 0.17, this.context.currentTime);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    this.setMuted(this.muted);
  }

  tone(frequency, duration = 0.1, type = 'square', delay = 0, endFrequency = frequency) {
    if (!this.context || this.context.state !== 'running' || this.muted || this.voices.size >= 24) return;
    const start = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const envelope = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.001, start);
    envelope.gain.linearRampToValueAtTime(0.6, start + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(envelope); envelope.connect(this.master);
    this.voices.add(osc);
    osc.onended = () => { osc.disconnect(); envelope.disconnect(); this.voices.delete(osc); };
    osc.start(start); osc.stop(start + duration + 0.01);
  }

  sweep(from, to, duration, type = 'square') { this.tone(from, duration, type, 0, to); }
  sequence(notes, step) { notes.forEach((note, i) => this.tone(note, step * 0.85, 'square', i * step)); }
  playFanfare(type) {
    const notes = { PIZZA: [262, 330, 392, 523], DONUT: [523, 659, 784, 1047], BURGER: [131, 196, 262, 392] };
    this.sequence(notes[type] || notes.PIZZA, 0.09);
  }

  stop() {
    for (const voice of this.voices) voice.stop();
    this.voices.clear();
  }

  dispose() {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.target?.removeEventListener('pointerdown', this.unlock);
    this.target?.removeEventListener('keydown', this.unlock);
    this.stop();
    void this.context?.close();
  }
}
