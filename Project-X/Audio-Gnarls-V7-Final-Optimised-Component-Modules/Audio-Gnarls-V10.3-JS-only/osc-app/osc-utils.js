// osc-utils.js
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
