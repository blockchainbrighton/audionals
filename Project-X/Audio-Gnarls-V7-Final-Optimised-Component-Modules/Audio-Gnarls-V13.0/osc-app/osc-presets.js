// osc-presets.js

/**
 * ============================================================================
 * osc-presets.js — Preset Factory
 * ============================================================================
 *
 * DEVELOPER NOTES
 * ---------------
 * - Purpose: Deterministic preset generator and loader, provided as a mixin.
 * - Export: Presets(app) returns { deterministicPreset, loadPresets }.
 * - deterministicPreset(seed, shape):
 *   • Uses app._rng(`${seed}_${shape}`) for stable randomness.
 *   • Randomizes oscillator configs, LFO params, filter cutoff, ADSR envelope,
 *     reverb wet/room, color/shape drift.
 *   • Returns plain object with fields:
 *     { osc1, osc2, filter, filterQ, lfo:[rate,min,max], envelope,
 *       reverb:{wet,roomSize}, colorSpeed, shapeDrift, seed }
 *   • Mode branching produces different timbral/temporal envelopes.
 * - loadPresets(seed):
 *   • Populates app.state.presets with entries for every app.shapes.
 *   • Call after seed changes or on initialization.
 *
 * QUICK REFERENCE
 * ---------------
 * - Factory: Presets(app)
 * - API:
 *   • deterministicPreset(seed, shape) → stable config object
 *   • loadPresets(seed) → fills app.state.presets for all shapes
 * - Depends on: app._rng, app.shapes, app.state.presets
 * - Use cases: after Tone.js loads; whenever seed changes
 */


export function Presets(app) {
  return {
    deterministicPreset(seed, shape) {
      const rng = app._rng(`${seed}_${shape}`);
      const types = ['sine','triangle','square','sawtooth'];
      const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];

      const modeRoll = rng();
      const mode = modeRoll < .18 ? 0 : modeRoll < .56 ? 1 : modeRoll < .85 ? 2 : 3;
      const oscCount = mode === 3 ? 2 + (rng() > .7 ? 1 : 0) : 1 + (rng() > .6 ? 1 : 0);
      const oscs = Array.from({ length: oscCount }, () => [
        types[(rng() * types.length) | 0],
        notes[(rng() * notes.length) | 0]
      ]);

      let lfoRate, lfoMin, lfoMax, filterBase, env;
      if (mode === 0) {
        lfoRate = .07 + rng() * .3; lfoMin = 400 + rng() * 400; lfoMax = 900 + rng() * 600; filterBase = 700 + rng() * 500;
        env = { attack: .005 + rng() * .03, decay: .04 + rng() * .08, sustain: .1 + rng() * .2, release: .03 + rng() * .1 };
      } else if (mode === 1) {
        lfoRate = .25 + rng() * 8; lfoMin = 120 + rng() * 700; lfoMax = 1200 + rng() * 1400; filterBase = 300 + rng() * 2400;
        env = { attack: .03 + rng() * .4, decay: .1 + rng() * .7, sustain: .2 + rng() * .5, release: .2 + rng() * 3 };
      } else if (mode === 2) {
        lfoRate = 6 + rng() * 20; lfoMin = 80 + rng() * 250; lfoMax = 1500 + rng() * 3500; filterBase = 300 + rng() * 2400;
        env = { attack: .03 + rng() * .4, decay: .1 + rng() * .7, sustain: .2 + rng() * .5, release: .2 + rng() * 3 };
      } else {
        lfoRate = 24 + rng() * 36; lfoMin = 80 + rng() * 250; lfoMax = 1500 + rng() * 3500; filterBase = 300 + rng() * 2400;
        env = { attack: 2 + rng() * 8, decay: 4 + rng() * 20, sustain: .7 + rng() * .2, release: 8 + rng() * 24 };
      }

      return {
        osc1: oscs[0],
        osc2: oscs[1] || null,
        filter: filterBase,
        filterQ: .6 + rng() * .7,
        lfo: [lfoRate, lfoMin, lfoMax],
        envelope: env,
        reverb: { wet: mode === 3 ? .4 + rng() * .5 : .1 + rng() * .5, roomSize: mode === 3 ? .85 + rng() * .12 : .6 + rng() * .38 },
        colorSpeed: .06 + rng() * .22,
        shapeDrift: .0006 + rng() * .0032,
        seed
      };
    },

    loadPresets(seed) {
      app.state.presets = Object.fromEntries(app.shapes.map(k => [k, app.deterministicPreset(seed, k)]));
    },
  };
}
