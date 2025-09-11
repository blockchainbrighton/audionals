// js/worklet/aw-bridge.js
// Replaces Tone.Oscillator with an AudioWorklet-backed oscillator for off-main-thread DSP.
// The rest of the app continues to use Tone nodes for filtering, envelopes, and effects.
const ensureModule = async (ctx) => {
  if (!ctx.audioWorklet) throw new Error('AudioWorklet not supported');
  // idempotent add
  if (!ensureModule._added) {
    ensureModule._added = ctx.audioWorklet.addModule('./js/worklet/dsp-processor.js');
  }
  return ensureModule._added;
};

const noteToHz = (ToneNS, n) => {
  if (typeof n === 'number') return n;
  try {
    return ToneNS.Frequency(n).toFrequency();
  } catch {
    // Fallback for basic A4-like strings: use 440 as default
    return 440;
  }
};

class AWOscillator {
  constructor(frequency = 440, type = 'sine') {
    // These mirror the Tone.Oscillator signature (frequency, type)
    const ToneNS = window.Tone;
    const ctx = ToneNS?.getContext?.()?.rawContext || ToneNS?.context?._context || ToneNS?.context?._nativeAudioContext || ToneNS?.context?.rawContext || ToneNS?.context || new (window.AudioContext || window.webkitAudioContext)();
    this._ctx = ctx;
    this._type = type || 'sine';
    this._frequency = noteToHz(ToneNS, frequency);
    this._node = null;
    this._started = false;
    this._ready = ensureModule(ctx).then(() => {
      this._node = new AudioWorkletNode(ctx, 'dsp-processor', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        parameterData: { frequency: this._frequency }
      });
      // Initialize params
      this._node.port.postMessage({ type: this._type, detune: 0, gain: 1, seed: 123456 });
    });
    // Minimal API surface to look like Tone.Signal
    this.frequency = { 
      get value(){ return this._owner._frequency; },
      set value(v){ 
        const hz = typeof v === 'number' ? v : noteToHz(window.Tone, v);
        this._owner._frequency = hz;
        if (this._owner._node) {
          const p = this._owner._node.parameters.get('frequency');
          if (p) p.setValueAtTime(hz, this._owner._ctx.currentTime);
        }
      }
    };
    this.frequency._owner = this;
    this.type = this._type;
  }
  start() { this._started = true; return this; }
  stop() { /* audio worklet runs continuously; rely on downstream gain for gating */ return this; }
  set(type) {
    if (type && this._node) { this._type = type; this._node.port.postMessage({ type }); }
    return this;
  }
  // Connect to either a native AudioNode or a Tone node
  connect(dest) {
    return this._ready.then(() => {
      const node = this._node;
      const target = dest?.input || dest?._input?.[0] || dest?.context?.rawContext ? dest : dest;
      node.connect(target);
      return dest;
    });
  }
  disconnect() {
    if (this._node) try { this._node.disconnect(); } catch {}
    return this;
  }
  get context() { return this._ctx; }
}

const patchTone = () => {
  const W = window;
  const ToneNS = W.Tone;
  if (!ToneNS || !('Oscillator' in ToneNS)) return false;

  const ctx = ToneNS?.getContext?.()?.rawContext
           || ToneNS?.context?._context
           || ToneNS?.context?._nativeAudioContext
           || ToneNS?.context?.rawContext
           || ToneNS?.context
           || null;

  if (!ctx?.audioWorklet) {
    console.info('[AW Bridge] AudioWorklet not supported; keeping original Tone.Oscillator.');
    return false;
  }

  try {
    // Keep original for escape hatch
    W.Tone = new Proxy(ToneNS, {
      get(target, prop, receiver) {
        if (prop === 'Oscillator') return AWOscillator;
        return Reflect.get(target, prop, receiver);
      }
    });
    W.Tone.__OrigOscillator = ToneNS.Oscillator;
    console.info('[AW Bridge] Patched Tone via Proxy -> Oscillator routed to AudioWorklet');
    return true;
  } catch (e) {
    console.warn('[AW Bridge] Failed to install Proxy; falling back to shadow object', e);
    // Fall back to Option B
    try {
      const shadow = Object.create(ToneNS);
      Object.defineProperty(shadow, 'Oscillator', {
        configurable: true,
        enumerable: true,
        get: () => AWOscillator
      });
      shadow.__OrigOscillator = ToneNS.Oscillator;
      W.Tone = shadow;
      console.info('[AW Bridge] Patched Tone via shadow object -> Oscillator routed to AudioWorklet');
      return true;
    } catch (e2) {
      console.warn('[AW Bridge] Failed to patch Tone.', e2);
      return false;
    }
  }
};

// If Tone is already present, patch immediately; otherwise, wait for the custom event fired by engine's <tone-loader>
if (window.Tone) {
  patchTone();
} else {
  window.addEventListener('tone-ready', () => patchTone(), { once: true });
}