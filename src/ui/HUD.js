/** Render existing HUD fields and level state without rebuilding DOM every frame. */
export class HUD {
  constructor(root = document) {
    this.fields = Object.fromEntries(['Score', 'Eaten', 'Power', 'PowerTime', 'Hearts', 'Timer', 'Level', 'Status']
      .map(name => [name, root.getElementById(`hud${name}`)]));
  }

  update({ score, eaten, player, level, paused = false }) {
    const text = (name, value) => {
      const element = this.fields[name];
      if (element && element.textContent !== String(value)) element.textContent = value;
    };
    text('Score', score); text('Eaten', eaten);
    const power = player.powerManager.activePower;
    text('Power', power || 'None');
    if (this.fields.Power) this.fields.Power.className = `power-badge ${(power || 'none').toLowerCase()}`;
    text('PowerTime', power ? `${Math.ceil(player.powerManager.powerTimer)}s` : '--');
    text('Level', level.name || 'Test Arena');
    const hearts = level.health ?? 3;
    text('Hearts', '♥'.repeat(hearts) + '♡'.repeat(3 - hearts));
    this.fields.Hearts?.setAttribute('aria-label', `${hearts} of 3 hearts`);
    text('Timer', level.timeLeft === undefined ? '--' : Math.ceil(level.timeLeft));
    if (this.fields.Timer) this.fields.Timer.dataset.urgent = String(level.timeLeft <= 30);
    text('Status', level.status === 'won' ? 'World clear! Play again with Reset.' :
      level.status === 'lost' ? `${level.resultMessage} Try again with Reset.` :
      paused ? 'Paused' : level.status === 'ready' ? 'Move or jump to begin.' :
      level.checkpoint?.active ? 'Checkpoint saved — reach the finish flag!' : 'Reach the finish flag!');
  }

  renderResult(ctx, level) {
    if (level.status !== 'won' && level.status !== 'lost') return;
    ctx.save(); ctx.fillStyle = 'rgba(15,23,42,0.86)'; ctx.fillRect(0, 175, 960, 175);
    ctx.textAlign = 'center'; ctx.fillStyle = '#FBBF24'; ctx.font = 'bold 36px sans-serif';
    ctx.fillText(level.status === 'won' ? 'WORLD 1-1 CLEAR!' : level.resultMessage, 480, 245);
    ctx.fillStyle = '#F8FAFC'; ctx.font = '18px sans-serif';
    ctx.fillText('Press R or select Reset to play again', 480, 295); ctx.restore();
  }
}
