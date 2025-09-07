/*
 * Audio helper utilities for the oscilloscope app.
 *
 * This module centralises a handful of low‑level audio operations that were
 * previously duplicated in `engine.js`. Consolidating these helpers makes
 * it easier to reason about chain management and reduces copy‑and‑paste
 * code across the codebase. Each function accepts the minimal state it
 * needs (for example a Tone.js instance or an individual audio chain)
 * which improves testability and reuse.
 */

// Create and configure a Tone.js analyser node. When available the
// returned analyser has its `fftSize` and `smoothingTimeConstant` set
// to sensible defaults. Passing an undefined or null Tone instance
// simply yields null rather than throwing.
export function createAnalyser(Tone) {
  const analyser = Tone?.context?.createAnalyser?.();
  if (!analyser) return null;
  analyser.fftSize = 2048;
  try {
    analyser.smoothingTimeConstant = 0.06;
  } catch {
    // Some environments disallow setting smoothingTimeConstant on
    // analyser nodes – silently ignore in that case.
  }
  return analyser;
}

// Convert a linear amplitude value in the range [0, 1] to a decibel value.
// Values outside the range clamp to avoid infinity and negative values
// below the floor of ‑60 dB. A value of 0 returns ‑60 dB which matches
// the behaviour used throughout the application.
export function linToDb(value) {
  const v = typeof value === 'number' ? value : 0;
  if (v <= 0) return -60;
  const clamped = Math.min(1, Math.max(1e-4, v));
  return Math.max(-60, Math.min(0, 20 * Math.log10(clamped)));
}

// Linearly ramp a Tone.js `AudioParam` from its current value to a
// target over a given duration in seconds. If either the parameter or
// context is missing the function is a no‑op. The current time is
// determined from `Tone.now()` if provided or from the AudioContext on
// the parameter. A small epsilon is used to avoid scheduling ramps of
// zero duration which can throw.
export function rampParamLinear(param, target, duration, Tone) {
  if (!param || !Tone) return;
  const now = Tone.now?.() ?? param.context?.currentTime ?? 0;
  try {
    if (typeof param.cancelScheduledValues === 'function') {
      param.cancelScheduledValues(now);
    }
    const current = typeof param.value === 'number' ? param.value : param.value?.value;
    if (typeof param.setValueAtTime === 'function') {
      param.setValueAtTime(current ?? 0, now);
    }
    if (typeof param.linearRampToValueAtTime === 'function') {
      const dt = Math.max(0.001, duration || 0.012);
      param.linearRampToValueAtTime(target, now + dt);
    }
  } catch {
    // Ignore failures (e.g. due to disconnected params) – callers
    // typically fall back to immediate assignment if ramps are
    // unsupported.
  }
}

// Fade out the gain and reverb wet parameters on a single chain over
// `fadeTime` seconds. Chains produced by the oscilloscope app follow a
// loose convention whereby either `out.gain` or `volume.volume` holds
// the master level and `reverb.wet` controls the wet/dry mix. If those
// properties are missing the operation silently succeeds. Returns a
// Promise that resolves after the fade completes to aid sequencing.
export async function fadeOutChain(chain, Tone, fadeTime = 0.012) {
  if (!chain || !Tone) return;
  const now = Tone.now?.() ?? 0;
  const gain = chain?.out?.gain ?? chain?.volume?.volume;
  if (gain) {
    rampParamLinear(gain, 0, fadeTime, Tone);
  }
  const wet = chain?.reverb?.wet;
  // Some Tone.js versions expose rampTo directly on wet objects
  if (wet?.rampTo) {
    try {
      wet.rampTo(0, fadeTime);
    } catch {
      // ignore
    }
  }
  // Allow the audio tail to finish before resolving
  const millis = Math.ceil((fadeTime + 0.002) * 1000);
  return new Promise((resolve) => setTimeout(resolve, millis));
}

// Fully dispose an audio chain. This includes fading the chain out
// using `fadeOutChain` and then stopping, disposing and disconnecting
// every property on the chain. It is designed to be safe even if
// individual nodes throw on stop/dispose/disconnect. An empty or
// undefined chain causes the function to resolve immediately.
export async function disposeChain(chain, Tone, fadeTime = 0.012) {
  if (!chain || !Tone) return;
  try {
    // fade out to avoid clicks/pops on abrupt stops
    await fadeOutChain(chain, Tone, fadeTime);
  } catch {
    // ignore fade errors and still attempt cleanup
  }
  for (const node of Object.values(chain || {})) {
    try { node.stop?.(); } catch {}
    try { node.dispose?.(); } catch {}
    try { node.disconnect?.(); } catch {}
  }
}