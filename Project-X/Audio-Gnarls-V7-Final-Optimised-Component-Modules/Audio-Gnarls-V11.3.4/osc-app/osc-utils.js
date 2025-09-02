/**
 * ============================================================================
 * osc-utils.js — Utility Helpers (Drop-in Replacement, click-hardened)
 * ============================================================================
 *
 * What’s improved (vs your last version):
 * - _disposeChain(): ramps the chain to 0 and delays the actual stop/dispose
 *   until the ramp completes (default ~12 ms). This avoids mid-cycle pops when
 *   tearing down or rebuffering.
 * - Adds small, generic helpers you can optionally use elsewhere:
 *     • _timeNow(Tone) → current audio time
 *     • _rampLinear(param, target, seconds, Tone) → safe linear ramp
 *     • _silenceAllChains(fadeSec=0.012) → quick global fade (does not dispose)
 * - All existing behaviors and names are preserved.
 * ============================================================================
 */

export function Utils(app) {
  // --- Internal helpers (also exposed on return object) --------------------
  function _timeNow(Tone) {
    return Tone?.now?.() ?? 0;
  }

  function _rampLinear(param, target, seconds, Tone) {
    if (!param || !Tone) return;
    const now = _timeNow(Tone);
    try {
      if (typeof param.cancelScheduledValues === 'function') {
        param.cancelScheduledValues(now);
      }
      const cur = typeof param.value === 'number' ? param.value : param.value?.value;
      if (typeof param.setValueAtTime === 'function') {
        param.setValueAtTime(cur ?? 0, now);
      }
      if (typeof param.linearRampToValueAtTime === 'function') {
        param.linearRampToValueAtTime(target, now + Math.max(0.001, seconds || 0.012));
      }
    } catch (_) { /* no-op */ }
  }

  async function _silenceAllChains(fadeSec = 0.012) {
    const Tone = app.state?.Tone;
    if (!Tone) return;
    const now = _timeNow(Tone);
    app._eachChain(chain => {
      const g = chain?.out?.gain ?? chain?.volume?.volume;
      if (g?.linearRampToValueAtTime) {
        try {
          g.cancelScheduledValues?.(now);
          g.setValueAtTime?.(g.value, now);
          g.linearRampToValueAtTime(0, now + fadeSec);
        } catch {}
      }
      // Softly park reverb wet (optional, harmless if absent)
      const wet = chain?.reverb?.wet;
      if (wet?.rampTo) {
        try { wet.rampTo(0, fadeSec); } catch {}
      }
    });
    // Let fade finish
    await app._sleep(Math.ceil((fadeSec + 0.002) * 1000));
  }

  return {
    // DOM helper
    _el(tag, opts) { return Object.assign(document.createElement(tag), opts); },

    // Iterate chains
    _eachChain(fn) { for (const k in app.state.chains) fn(app.state.chains[k], k); },

    /**
     * Dispose a single chain defensively, with a micro-fade first,
     * and only stop/dispose after the fade completes.
     */
    async _disposeChain(chain) {
      const Tone = app.state?.Tone;
      const fadeSec = 0.012; // 12 ms: inaudible yet effective
      try {
        if (Tone && chain) {
          const now = _timeNow(Tone);
          // Prefer per-chain output gain (from updated Audio), fall back to Volume->volume
          const g = chain?.out?.gain ?? chain?.volume?.volume;
          if (g?.linearRampToValueAtTime && g?.setValueAtTime) {
            // Smooth amplitude to zero
            g.cancelScheduledValues?.(now);
            g.setValueAtTime(g.value, now);
            g.linearRampToValueAtTime(0, now + fadeSec);
          }
          // Also relax reverb wet to zero to avoid tail discontinuity
          const wet = chain?.reverb?.wet;
          if (wet?.rampTo) {
            try { wet.rampTo(0, fadeSec); } catch {}
          }
          // Give the ramp a moment to finish before hard teardown
          await app._sleep(Math.ceil((fadeSec + 0.002) * 1000));
        }
      } catch { /* proceed to teardown regardless */ }

      // Defensive teardown
      for (const n of Object.values(chain || {})) {
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
      if (analyser) {
        analyser.fftSize = 2048;
        // Small smoothing helps visuals without affecting audio
        try { analyser.smoothingTimeConstant = 0.06; } catch {}
      }
      return analyser || null;
    },

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

    // --- Expose helpers (optional use elsewhere) ---------------------------
    _timeNow,
    _rampLinear,
    _silenceAllChains,
  };
}
