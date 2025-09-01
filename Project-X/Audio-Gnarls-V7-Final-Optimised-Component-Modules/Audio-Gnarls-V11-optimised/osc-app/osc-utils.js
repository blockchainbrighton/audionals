// osc-utils.js

/**
 * ============================================================================
 * osc-utils.js — Utility Helpers
 * ============================================================================
 *
 * DEVELOPER NOTES
 * ---------------
 * - Purpose: General helpers for DOM creation, audio chain management,
 *   deterministic RNG, and async control. Provided as a mixin.
 * - Export: Utils(app) returns:
 *   • _el(tag, opts) → concise element factory
 *   • _eachChain(fn) → iterate app.state.chains with fn(chain, key)
 *   • _disposeChain(chain) → safe teardown (stop/dispose/disconnect)
 *   • _rng(seed) → PRNG seeded by string; returns () => float [0,1)
 *   • _setCanvas(props) → push props into app._canvas
 *   • _createAnalyser(Tone) → analyser node with fftSize=2048
 *   • _sleep(ms) → Promise resolved after ms (async yield)
 * - Usage:
 *   • _el → build DOM in osc-app constructor
 *   • _eachChain/_disposeChain → teardown before rebuffer
 *   • _rng → deterministic presets, initial shape choice
 *   • _setCanvas → sync analyser/mode/preset flags
 *   • _createAnalyser → hook scope to audio graphs
 *   • _sleep → async background prebuffering
 *
 * QUICK REFERENCE
 * ---------------
 * - Factory: Utils(app)
 * - API: _el, _eachChain, _disposeChain, _rng, _setCanvas, _createAnalyser, _sleep
 * - Typical patterns:
 *   • const div = _el('div',{id:'main'})
 *   • _eachChain(c => _disposeChain(c))
 *   • const r = _rng('seed_key'); const x = r()
 *   • _setCanvas({ analyser, mode:'live' })
 *   • const analyser = _createAnalyser(Tone)
 *   • await _sleep(50)
 */


export function Utils(app) {
  return {
    // DOM helper
    _el(tag, opts) { return Object.assign(document.createElement(tag), opts); },

    // Iterate chains
    _eachChain(fn) { for (const k in app.state.chains) fn(app.state.chains[k], k); },

    // Dispose a single chain defensively
    _disposeChain(chain) {
      for (const n of Object.values(chain)) {
        try { n.stop?.(); } catch {}
        try { n.dispose?.(); } catch {}
        try { n.disconnect?.(); } catch {}
      }
    },

    // Deterministic RNG from string
    _rng(seed) {
      let a = 0x6d2b79f5 ^ seed.length;
      for (let i = 0; i < seed.length; ++i) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
      return () => (a = Math.imul(a ^ (a >>> 15), 1 | a), ((a >>> 16) & 0xffff) / 0x10000);
    },

    // Canvas prop merge
    _setCanvas(props) { Object.assign(app._canvas, props); },

    // Create analyser if possible
    _createAnalyser(Tone) {
      const analyser = Tone?.context?.createAnalyser?.();
      if (analyser) analyser.fftSize = 2048;
      return analyser || null;
    },

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
  };
}
