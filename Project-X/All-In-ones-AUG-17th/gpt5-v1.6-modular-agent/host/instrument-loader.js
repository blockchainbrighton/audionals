/*
 * host/instrument-loader.js
 *
 * Responsible for loading and instantiating headless instrument modules
 * on demand.  Instruments are loaded via dynamic import.  Built‑in
 * modules live in the `modules/` folder and may be referenced by
 * well‑known identifiers (e.g. `@core/sampler-1`).  If no URL/ID is
 * provided the loader falls back to a very simple built‑in saw wave
 * synth.  All instruments returned from this module conform to the
 * HeadlessInstrument interface described in the user spec.  The
 * returned object exposes an `output` AudioNode which should be
 * connected to the master bus by the host.
 */

/**
 * Convert a MIDI note number to frequency in hertz.  This helper is
 * defined here because the fallback demo synth needs to compute
 * oscillator frequencies but we do not want to depend on any other
 * modules.
 * @param {number} n MIDI note number
 * @returns {number} frequency in Hz
 */
function midiToHz(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

/**
 * Create a minimal sawtooth synthesizer to be used when no module
 * identifier or URL is provided or when module loading fails.  The
 * returned instrument conforms to the HeadlessInstrument interface
 * although it exposes no adjustable parameters.
 * @param {AudioContext} ctx Web Audio context
 * @param {object} [opts] optional creation options including a seed
 */
function createDemoInstrument(ctx, opts = {}) {
  const seed = opts.seed;
  // Gain node used as the instrument's output.  This allows the host
  // to insert further processing (e.g. per‑channel volume/panning) if
  // desired.  Without this node there would be no easy way to
  // disconnect the instrument.
  const output = ctx.createGain();
  output.gain.value = 0.9;

  /**
   * Play a single sawtooth note.  This helper implements a simple
   * ADSR envelope reminiscent of the original demoSynth supplied in
   * the pre‑refactor code.  The envelope timing constants are
   * intentionally kept short so that notes remain percussive unless
   * explicitly extended by the host.
   * @param {number} note MIDI note number
   * @param {number} time absolute context time for note on
   * @param {number} length nominal length of the note in seconds
   * @param {number} velocity linear amplitude scalar (0–1)
   */
  function playNote(note, time, length, velocity) {
    // compute fundamental
    const freq = midiToHz(note);
    // create nodes
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    // set cutoff relative to note; ensures brighter timbre for high notes
    filter.frequency.setValueAtTime(Math.min(12000, freq * 3), time);
    const envGain = ctx.createGain();
    // envelope times
    const a = 0.005;
    const d = 0.06;
    const s = 0.2;
    const r = 0.1;
    const p = Math.max(0.05, velocity);
    const hold = Math.max(length, a + d);
    // build envelope
    envGain.gain.setValueAtTime(0, time);
    envGain.gain.linearRampToValueAtTime(p, time + a);
    envGain.gain.linearRampToValueAtTime(s * p, time + a + d);
    envGain.gain.setValueAtTime(s * p, time + hold);
    envGain.gain.linearRampToValueAtTime(0, time + hold + r);
    // wire up nodes
    osc.connect(filter).connect(envGain).connect(output);
    osc.start(time);
    osc.stop(time + hold + r + 0.01);
  }

  return {
    /**
     * Demo instrument exposes no external input.
     */
    input: undefined,
    /**
     * Audio node carrying the synth’s output.  The host should
     * connect this to its master bus or per‑track gain node.
     */
    output,
    /**
     * No parameters are offered by the demo instrument.
     * @returns {Array<ParamMeta>}
     */
    getParams() { return []; },
    /**
     * Retrieve the current value of a parameter.  Always undefined
     * because there are no parameters on the demo instrument.
     */
    getParam(id) { return undefined; },
    /**
     * Set a parameter.  This is a no‑op for the demo instrument.
     */
    setParam(id, value, atTime) { },
    /**
     * Always report polyphonic operation.  The host may choose to
     * restrict polyphony itself but the demo synth is capable of
     * overlapping notes.
     */
    getVoiceMode() { return 'poly'; },
    /**
     * Respond to note events.  The interface supports both note on
     * and note off but the demo instrument only acts on note on.  If
     * a length is supplied with the event it is used to shape the
     * envelope; otherwise a default length of 0.22 seconds is used.
     * @param {NoteEvent} ev note event
     */
    note(ev) {
      if (!ev || ev.type === 'noteoff') return;
      const note = ev.note != null ? ev.note : 60;
      const vel = typeof ev.velocity === 'number' ? ev.velocity : 1;
      const length = typeof ev.length === 'number' ? ev.length : 0.22;
      const when = typeof ev.time === 'number' ? ev.time : ctx.currentTime;
      playNote(note, when, length, vel);
    },
    /**
     * Helper to process a batch of note events in order.  Simply
     * iterates over the provided events and calls `note` on each.
     */
    processEvents(events) {
      if (!Array.isArray(events)) return;
      for (const ev of events) this.note(ev);
    },
    /**
     * Return the persistent state of the demo instrument.  Aside
     * from a module identifier and version there are no other
     * parameters to persist.
     */
    getState() {
      return {
        moduleId: '@core/demo-saw',
        version: '1.0.0',
        seed,
        params: {},
        custom: {}
      };
    },
    /**
     * Accept a persisted state.  Nothing to restore for the demo
     * instrument.
     */
    setState(state) { },
    /**
     * Disconnect any ongoing audio and free resources.  There are no
     * long‑lived sources in the demo instrument so this is a no‑op.
     */
    dispose() { output.disconnect(); }
  };
}

/**
 * Attempt to dynamically import an instrument module identified by
 * `urlOrId`.  For built‑in modules the import path is resolved
 * relative to this loader.  If the import fails a demo instrument
 * will be created instead.  When the returned promise resolves the
 * instrument has been created and its output is ready for
 * connection.
 * @param {AudioContext} ctx web audio context used to construct the instrument
 * @param {string|null|undefined} urlOrId module URL or well known identifier
 * @param {number} seed deterministic seed passed into the instrument factory
 * @returns {Promise<HeadlessInstrument>}
 */
export async function loadInstrument(ctx, urlOrId, seed) {
  // If no id/url provided then return the demo instrument.
  if (!urlOrId) {
    return createDemoInstrument(ctx, { seed });
  }
  let mod;
  try {
    // Recognise built‑in identifiers and import the corresponding
    // module relative to this file.  All custom URLs are resolved
    // exactly as provided and may point to remote or local ES modules.
    if (urlOrId === '@core/sampler-1') {
      mod = await import('../modules/sampler.js');
    } else if (urlOrId === '@core/subtr-saw-1') {
      mod = await import('../modules/subtractive.js');
    } else {
      // For arbitrary module URLs we rely on the native dynamic import.
      // Note: do not include special bundler hints here as comments can
      // break parsing in a file:// context.
      mod = await import(urlOrId);
    }
    const factory = mod.default || mod.createInstrument || mod;
    if (typeof factory !== 'function') {
      console.warn(`[instrument-loader] Module ${urlOrId} does not export a factory; falling back to demo synth.`);
      return createDemoInstrument(ctx, { seed });
    }
    const inst = await factory(ctx, { seed });
    // Ensure mandatory properties exist.
    if (!inst || typeof inst.output === 'undefined' || typeof inst.note !== 'function') {
      console.warn(`[instrument-loader] Module ${urlOrId} did not return a valid instrument; falling back to demo synth.`);
      return createDemoInstrument(ctx, { seed });
    }
    return inst;
  } catch (err) {
    console.error(`[instrument-loader] Failed to load instrument ${urlOrId}`, err);
    return createDemoInstrument(ctx, { seed });
  }
}