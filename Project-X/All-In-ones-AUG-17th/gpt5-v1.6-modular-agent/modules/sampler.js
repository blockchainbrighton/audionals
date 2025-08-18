/*
 * modules/sampler.js
 *
 * A simple mono sampler instrument.  This instrument plays back
 * arbitrary audio buffers loaded from URLs or data URIs.  The host
 * interacts with the sampler exclusively through the HeadlessInstrument
 * interface.  All parameters exposed via getParams() are automatable
 * and persist across sessions.  If no buffer has been loaded then
 * triggering a note will result in silence.
 */

/**
 * Definition of the parameter metadata returned by getParams().  Each
 * entry describes a single adjustable control exposed to the user.
 * @type {Array<ParamMeta>}
 */
const PARAMS = [
  {
    id: 'gain', name: 'Gain', type: 'float', min: 0, max: 2, step: 0.01,
    default: 1.0, smoothing: 0.001, unit: '', automatable: true
  },
  {
    id: 'detune', name: 'Detune', type: 'float', min: -1200, max: 1200, step: 1,
    default: 0, unit: 'cent', automatable: true
  },
  {
    id: 'start', name: 'Start', type: 'float', min: 0, max: 1, step: 0.001,
    default: 0, unit: '', automatable: true
  },
  {
    id: 'end', name: 'End', type: 'float', min: 0, max: 1, step: 0.001,
    default: 1, unit: '', automatable: true
  }
];

/**
 * Factory function creating a new sampler instrument.  The sampler is
 * monophonic—multiple triggers will cut each other off.  An internal
 * AudioBuffer is used for playback; if none is loaded then calls to
 * note() will do nothing.
 *
 * The sampler exposes a helper method `setBufferFromSource` via
 * setState().  Host code can persist the source description under
 * `custom.source` in the instrument state and pass it back in
 * setState() to reload the sample when restoring a session.
 *
 * @param {AudioContext} ctx audio context used to create nodes
 * @param {{seed?:number, sampleRate?:number}} [opts] optional creation opts
 * @returns {Promise<HeadlessInstrument>}
 */
export default async function createInstrument(ctx, opts = {}) {
  const seed = opts.seed;
  // Persistent parameter values.  These defaults will be overridden
  // when setState() is called with a saved state.
  const params = {
    gain: 1.0,
    detune: 0,
    start: 0,
    end: 1
  };
  // Audio node for instrument output.  Host is responsible for
  // connecting this node to the master bus.  We use a gain node so
  // that the global gain parameter can be automated.
  const output = ctx.createGain();
  output.gain.setValueAtTime(1, ctx.currentTime);
  // Internal state: decoded buffer and last playing source
  let buffer = null;
  let currentSource = null;
  // Persisted custom info (e.g. data URL or remote URL).  This
  // information is stored inside state.custom.source on getState().
  let storedSource = null;

  /**
   * Load and decode an audio buffer from a data URL or remote URL.  The
   * passed source object must include a `type` field which is either
   * `'url'` or `'data'`.  When type is `'url'` the URL will be
   * fetched directly; when type is `'data'` the `dataUrl` field must
   * contain a base64 encoded data URI.  Once decoded the resulting
   * AudioBuffer is assigned to the instrument and future notes will
   * play the newly loaded sample.
   * @param {object} source sample source description
   */
  async function setBufferFromSource(source) {
    if (!source || !source.type) return;
    storedSource = null;
    try {
      let arrayBuffer;
      if (source.type === 'url' && source.url) {
        const res = await fetch(source.url);
        arrayBuffer = await res.arrayBuffer();
      } else if (source.type === 'data' && source.dataUrl) {
        const res = await fetch(source.dataUrl);
        arrayBuffer = await res.arrayBuffer();
      } else {
        return;
      }
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      buffer = decoded;
      // Remember where we got the sample from so it can be persisted
      storedSource = { ...source };
    } catch (err) {
      console.error('[sampler] Failed to load sample', err);
      buffer = null;
      storedSource = null;
    }
  }

  /**
   * Trigger playback of the current buffer.  Only note on events are
   * acted upon by the sampler; note off events simply stop the
   * currently playing source.  Velocity scales the gain while the
   * length parameter limits playback to a shorter duration than the
   * configured end point if necessary.
   * @param {NoteEvent} ev note event
   */
  function note(ev) {
    if (!ev) return;
    const when = typeof ev.time === 'number' ? ev.time : ctx.currentTime;
    if (ev.type === 'noteoff') {
      // On note off simply stop the current source if one is playing
      if (currentSource) {
        try { currentSource.stop(when); } catch {} // ignore if already stopped
        currentSource = null;
      }
      return;
    }
    // Ignore note on if no buffer loaded
    if (!buffer) return;
    // Compute start/end positions in seconds within the sample
    const dur = buffer.duration;
    const segStart = Math.max(0, Math.min(params.start, params.end)) * dur;
    const segEnd = Math.max(0, Math.min(params.end, 1)) * dur;
    const segLen = Math.max(0, segEnd - segStart);
    if (segLen <= 0) return;
    // Determine how long to play: either the requested length or the
    // remaining segment.  If length is undefined then play the whole
    // segment.  Negative lengths are ignored.
    let playLen;
    if (typeof ev.length === 'number' && ev.length >= 0) {
      playLen = Math.min(ev.length, segLen);
    } else {
      playLen = segLen;
    }
    // Stop any existing source to enforce monophony
    if (currentSource) {
      try { currentSource.stop(when); } catch {};
      currentSource = null;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.detune.setValueAtTime(params.detune, when);
    // Gain per note combines global gain, velocity and instrument gain
    const gainNode = ctx.createGain();
    const vel = typeof ev.velocity === 'number' ? ev.velocity : 1;
    gainNode.gain.setValueAtTime(params.gain * vel, when);
    src.connect(gainNode).connect(output);
    // Start and stop
    src.start(when, segStart, playLen);
    // Always schedule a stop slightly after the intended end to ensure
    // the node is cleaned up.  The specification requires we emit a
    // note off but because this sampler stops itself on note off and
    // note length we call stop here.
    src.stop(when + playLen + 0.02);
    currentSource = src;
  }

  /**
   * Batch process note events by calling note() on each.
   * @param {Array<NoteEvent>} events list of note events
   */
  function processEvents(events) {
    if (!Array.isArray(events)) return;
    for (const ev of events) note(ev);
  }

  /**
   * Update an instrument parameter.  Some parameters act on future
   * notes only (start/end/detune) while others can be automated in
   * real time (gain).  When an `atTime` argument is provided the
   * underlying AudioParam automation is scheduled accordingly.
   *
   * @param {string} id parameter identifier
   * @param {any} value new value
   * @param {number} [atTime] absolute audio context time for automation
   */
  function setParam(id, value, atTime) {
    if (!(id in params)) return;
    params[id] = value;
    const t = typeof atTime === 'number' ? atTime : ctx.currentTime;
    // For gain we can automate the output node directly
    if (id === 'gain') {
      output.gain.setValueAtTime(value, t);
    }
    // detune, start and end influence future notes only
  }

  /**
   * Return the current value of a parameter.
   * @param {string} id parameter identifier
   * @returns {any}
   */
  function getParam(id) {
    return params[id];
  }

  /**
   * Provide the instrument's persistent state.  The `params` object
   * reflects the current parameter values while `custom.source` stores
   * the source description used to load the sample.  Consumers are
   * free to store arbitrary data under the `custom` key.
   * @returns {InstrumentState}
   */
  function getState() {
    return {
      moduleId: '@core/sampler-1',
      version: '1.0.0',
      seed,
      params: { ...params },
      custom: storedSource ? { source: { ...storedSource } } : {}
    };
  }

  /**
   * Restore a previously captured instrument state.  Parameter values
   * are copied into the local `params` object and automation is
   * applied immediately.  When a saved custom source exists the
   * sampler attempts to reload the buffer.
   * @param {Partial<InstrumentState>} state persisted state
   */
  async function setState(state) {
    if (state && state.params) {
      Object.keys(state.params).forEach(key => {
        if (key in params) {
          params[key] = state.params[key];
        }
      });
      // apply gain immediately
      output.gain.setValueAtTime(params.gain, ctx.currentTime);
    }
    if (state && state.custom && state.custom.source) {
      await setBufferFromSource(state.custom.source);
    }
  }

  /**
   * Clean up resources held by the sampler.  Stops any playing source
   * and disconnects the output from the audio graph.
   */
  function dispose() {
    if (currentSource) {
      try { currentSource.stop(); } catch { }
      currentSource = null;
    }
    output.disconnect();
  }

  return {
    input: undefined,
    output,
    getParams() { return PARAMS.map(p => ({ ...p })); },
    getParam,
    setParam,
    getVoiceMode() { return 'mono'; },
    note,
    processEvents,
    getState,
    setState,
    dispose,
    // expose helper for host convenience
    setBufferFromSource
  };
}