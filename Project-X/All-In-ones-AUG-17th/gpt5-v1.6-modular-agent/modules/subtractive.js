/*
 * modules/subtractive.js
 *
 * A simple subtractive synthesiser built from Web Audio primitives.
 * Each note triggers one or more saw oscillators mixed through a
 * resonant lowpass filter and shaped by an ADSR envelope.  Voice
 * stacking is supported via the `voices` parameter which controls the
 * number of oscillators per note.  All parameters are exposed to the
 * host via the HeadlessInstrument interface and can be automated.
 */

/**
 * Parameter metadata for the subtractive instrument.  These describe
 * the controls displayed to the user and how values should be clamped.
 * @type {Array<ParamMeta>}
 */
const PARAMS = [
  { id: 'attack', name: 'Attack', type: 'float', min: 0.001, max: 2.0, step: 0.001, default: 0.01, unit: 's', automatable: true },
  { id: 'decay',  name: 'Decay',  type: 'float', min: 0.001, max: 2.0, step: 0.001, default: 0.1, unit: 's', automatable: true },
  { id: 'sustain',name: 'Sustain',type: 'float', min: 0.0,   max: 1.0, step: 0.01,  default: 0.7, unit: '', automatable: true },
  { id: 'release',name: 'Release',type: 'float', min: 0.001, max: 4.0, step: 0.001, default: 0.4, unit: 's', automatable: true },
  { id: 'cutoff', name: 'Cutoff', type: 'float', min: 20,    max: 20000, step: 1,   default: 8000, unit: 'Hz', automatable: true },
  { id: 'reso',   name: 'Reso',   type: 'float', min: 0.1,  max: 20.0, step: 0.1,  default: 0.0, unit: '', automatable: true },
  { id: 'detune', name: 'Detune', type: 'float', min: 0.0,  max: 50.0, step: 0.1,  default: 0.0, unit: 'cent', automatable: true },
  { id: 'voices', name: 'Unison', type: 'int',   min: 1,    max: 8,    step: 1,    default: 1, unit: '', automatable: false },
  { id: 'gain',   name: 'Gain',   type: 'float', min: 0.0,  max: 2.0,  step: 0.01, default: 0.8, unit: '', automatable: true }
];

/**
 * Convert MIDI note number to hertz.
 * @param {number} n
 * @returns {number}
 */
function midiToHz(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

/**
 * Create the subtractive instrument.  The instrument is polyphonic and
 * may play multiple notes simultaneously.  Each note spawns one or
 * more oscillators (depending on the `voices` parameter) whose
 * frequencies are detuned relative to one another.  All voices for a
 * note share a filter and envelope.  A note off or the expiry of
 * NoteEvent.length triggers the release stage of the envelope.  Voice
 * resources are cleaned up automatically after the release.
 *
 * @param {AudioContext} ctx
 * @param {{seed?:number}} opts
 * @returns {Promise<HeadlessInstrument>}
 */
export default async function createInstrument(ctx, opts = {}) {
  const seed = opts.seed;
  // Parameter values.  These initial values may be overridden by
  // setState().
  const params = {};
  for (const p of PARAMS) params[p.id] = p.default;

  // Master output gain.  Individual notes route through their own
  // envelopes into this gain node.  Host connects this to the master.
  const output = ctx.createGain();
  output.gain.setValueAtTime(params.gain, ctx.currentTime);

  // Track active voices keyed by an identifier.  Each entry
  // contains oscillators, filter and envelope nodes along with the
  // associated note number.
  const activeVoices = new Set();

  /**
   * Update realtime parameters on active voices.  Changes to cutoff,
   * resonance or gain will be propagated to filters and gains on
   * existing notes.  Voice‑stacking count and detune only affect
   * newly created voices.
   * @param {string} id
   * @param {number} value
   * @param {number} [atTime]
   */
  function setParam(id, value, atTime) {
    if (!(id in params)) return;
    params[id] = value;
    const t = typeof atTime === 'number' ? atTime : ctx.currentTime;
    switch (id) {
      case 'gain':
        output.gain.setValueAtTime(value, t);
        break;
      case 'cutoff':
      case 'reso':
        // Update all filters on active voices
        activeVoices.forEach(v => {
          if (id === 'cutoff') {
            v.filter.frequency.setTargetAtTime(value, t, 0.01);
          } else {
            v.filter.Q.setTargetAtTime(value, t, 0.01);
          }
        });
        break;
      default:
        // other parameters take effect on future notes only
        break;
    }
  }

  /**
   * Retrieve the current value of a parameter.
   * @param {string} id
   * @returns {any}
   */
  function getParam(id) {
    return params[id];
  }

  /**
   * Create and schedule a note on event.  The note event spawns a
   * voice consisting of one or more oscillators mixed into a filter
   * and envelope.  Envelopes are created per note to avoid cross
   * modulation between notes.  When a length is supplied the release
   * stage is automatically scheduled once the sustain period ends.
   * @param {number} note MIDI note number
   * @param {number} velocity linear amplitude 0–1
   * @param {number} when absolute time to trigger
   * @param {number} length length of the sustain portion in seconds
   */
  function spawnVoice(note, velocity, when, length) {
    const freq = midiToHz(note);
    // envelope gain
    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0, when);
    const a = params.attack;
    const d = params.decay;
    const s = params.sustain;
    const r = params.release;
    const amplitude = Math.max(0.05, velocity);
    // Attack and decay
    envGain.gain.linearRampToValueAtTime(amplitude, when + a);
    envGain.gain.linearRampToValueAtTime(amplitude * s, when + a + d);
    // If a length was provided schedule sustain hold and release
    let releaseTime = null;
    if (length != null && !isNaN(length)) {
      const holdEnd = when + Math.max(length, a + d);
      envGain.gain.setValueAtTime(amplitude * s, holdEnd);
      envGain.gain.linearRampToValueAtTime(0, holdEnd + r);
      releaseTime = holdEnd;
    }
    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(params.cutoff, when);
    filter.Q.setValueAtTime(params.reso, when);
    // Unison voices
    const oscList = [];
    const count = Math.max(1, Math.min(8, Math.floor(params.voices)));
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, when);
      // Spread detune symmetrically around zero
      const center = (count - 1) / 2;
      const offset = (i - center) * params.detune;
      osc.detune.setValueAtTime(offset, when);
      osc.connect(filter);
      osc.start(when);
      oscList.push(osc);
    }
    // Connect graph: oscillators -> filter -> envelope -> output
    filter.connect(envGain).connect(output);
    const voice = { note, envGain, filter, oscillators: oscList };
    activeVoices.add(voice);
    // Automatic release if length specified
    if (releaseTime != null) {
      const offTime = releaseTime;
      // schedule stop of oscillators after release
      setTimeout(() => {
        // call noteoff for this voice and remove from set
        offVoice(voice, offTime);
      }, Math.max(0, (offTime - ctx.currentTime) * 1000));
    }
    return voice;
  }

  /**
   * Trigger the release phase for a given voice immediately or at a
   * specified time.  The envelope gain is ramped down to zero
   * according to the current release parameter.  Oscillators are
   * stopped once the release completes.  The voice is removed from
   * the activeVoices set when stopped.
   * @param {object} voice voice object created by spawnVoice()
   * @param {number} when absolute time at which to start release
   */
  function offVoice(voice, when) {
    const r = params.release;
    const t = when || ctx.currentTime;
    const g = voice.envGain.gain;
    // Cancel any scheduled automation after 't' to avoid jumps
    try {
      g.cancelScheduledValues(t);
    } catch {}
    // Current value at time t
    const currentValue = g.value;
    g.setValueAtTime(currentValue, t);
    g.linearRampToValueAtTime(0, t + r);
    // Stop oscillators after release
    voice.oscillators.forEach(osc => {
      try {
        osc.stop(t + r + 0.05);
      } catch {}
    });
    // Remove from active voices after release
    setTimeout(() => {
      activeVoices.delete(voice);
    }, Math.max(0, (t + r - ctx.currentTime) * 1000) + 60);
  }

  /**
   * Handle incoming note events.  For noteon events a new voice is
   * created; for noteoff events any matching active voices are
   * released.  A length provided on the note on event causes an
   * automatic release after the hold period unless an explicit
   * noteoff arrives earlier.
   * @param {NoteEvent} ev
   */
  function note(ev) {
    if (!ev) return;
    const when = typeof ev.time === 'number' ? ev.time : ctx.currentTime;
    if (ev.type === 'noteoff') {
      const targetNote = ev.note;
      // Release all voices associated with the given note
      activeVoices.forEach(v => {
        if (v.note === targetNote) {
          offVoice(v, when);
        }
      });
      return;
    }
    // noteon
    const noteNumber = typeof ev.note === 'number' ? ev.note : 60;
    const velocity = typeof ev.velocity === 'number' ? ev.velocity : 1;
    const length = typeof ev.length === 'number' ? ev.length : null;
    spawnVoice(noteNumber, velocity, when, length);
  }

  /**
   * Process an array of note events sequentially.
   * @param {Array<NoteEvent>} events
   */
  function processEvents(events) {
    if (!Array.isArray(events)) return;
    for (const ev of events) note(ev);
  }

  /**
   * Retrieve parameter metadata.  A shallow copy is returned for
   * safety.
   * @returns {Array<ParamMeta>}
   */
  function getParams() {
    return PARAMS.map(p => ({ ...p }));
  }

  /**
   * Produce a persistent snapshot of the instrument state.  Only
   * parameters are saved; there is no custom state required.
   * @returns {InstrumentState}
   */
  function getState() {
    return {
      moduleId: '@core/subtr-saw-1',
      version: '1.0.0',
      seed,
      params: { ...params },
      custom: {}
    };
  }

  /**
   * Restore a previously captured state.  Parameter values are
   * updated and propagated immediately to any active voices for
   * cutoff, resonance and gain.  Other parameters take effect on
   * subsequent notes only.
   * @param {Partial<InstrumentState>} state
   */
  function setState(state) {
    if (state && state.params) {
      Object.keys(state.params).forEach(key => {
        if (key in params) {
          params[key] = state.params[key];
        }
      });
      // propagate realtime params
      output.gain.setValueAtTime(params.gain, ctx.currentTime);
      activeVoices.forEach(v => {
        v.filter.frequency.setValueAtTime(params.cutoff, ctx.currentTime);
        v.filter.Q.setValueAtTime(params.reso, ctx.currentTime);
      });
    }
  }

  /**
   * Dispose of all resources.  Active voices are released
   * immediately and the output is disconnected.
   */
  function dispose() {
    activeVoices.forEach(v => offVoice(v, ctx.currentTime));
    activeVoices.clear();
    output.disconnect();
  }

  return {
    input: undefined,
    output,
    getParams,
    getParam,
    setParam,
    getVoiceMode() { return 'poly'; },
    note,
    processEvents,
    getState,
    setState,
    dispose
  };
}