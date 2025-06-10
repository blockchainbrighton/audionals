/**
 * Harmony / dissonance metrics.
 * @module audio/MusicLogic
 */
export class MusicLogic {
  /** @param {import('./AudioEngine.js').AudioEngine} audio */
  constructor(audio) {
    this.audio = audio;
    /** Semitone offsets considered consonant */
    this.consonant = new Set([0, 3, 4, 5, 7, 8, 9]);
    this.dissonanceScore = 0;
  }

  /**
   * @param {import('../entities/Harmonoid.js').Harmonoid[]} ents
   */
  update(ents) {
    const active = ents.filter(e => !e.muted);
    if (active.length < 2) return;
    let dis = 0;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const semis = Math.abs(active[i].pitch - active[j].pitch) % 12;
        if (!this.consonant.has(semis)) dis++;
      }
    }
    this.dissonanceScore = dis;
    // Simple mix coloration: lower gain if high dissonance
    this.audio.masterGain.gain.setTargetAtTime(
      1 - Math.min(1, dis / 10),
      this.audio.ctx.currentTime,
      0.1
    );
  }
}
