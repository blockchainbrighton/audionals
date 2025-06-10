/**
 * Handles harmony/dissonance, effect triggers, and musical controls.
 */
export class MusicLogic {
    constructor(audio) {
      this.audio = audio;
      this.consonanceTable = [
        0, 1, 1.12, 1.19, 1.26, 1.33, 1.41, 1.5, 1.59, 1.68, 1.78, 1.89, 2
      ]; // rough ratios for 12-TET
    }
  
    update(harmonoids, abilities, dt) {
      // Scan for harmony
      let freqs = harmonoids.map(h => h.freq);
      let harmonyScore = this.harmonyScore(freqs);
      // Use score for SFX/mix
      // Optionally boost background pad based on harmonyScore
    }
  
    harmonyScore(freqs) {
      if (freqs.length < 2) return 1.0;
      let score = 0;
      for (let i = 0; i < freqs.length; ++i)
        for (let j = i+1; j < freqs.length; ++j)
          score += this.consonance(freqs[i], freqs[j]);
      return score / (freqs.length * (freqs.length-1) / 2);
    }
  
    consonance(a, b) {
      let r = a > b ? a/b : b/a;
      let best = Math.min(...this.consonanceTable.map(v => Math.abs(v - r)));
      return 1 - best/2;
    }
  }
  