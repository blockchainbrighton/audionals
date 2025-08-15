const SynthFactory = require('../audio/SynthFactory');

/**
 * InstrumentChannel represents a track that plays synthesizer
 * notes. It holds a synth instance, channel settings like gain
 * and pan, and a list of note events. During playback it
 * schedules triggerAttackRelease calls on the synth relative to
 * the provided time.
 */
class InstrumentChannel {
  constructor(type = 'synth', options = {}) {
    this.synthFactory = new SynthFactory();
    this.synth = this.synthFactory.createSynth(type, options);
    this.notes = [];
    this.gain = 1;
    this.pan = 0;
    this.nextNoteId = 0;
  }

  /**
   * Add a note event to the channel. Returns an identifier for
   * later removal.
   */
  addNote(note, startTime, duration, velocity = 1) {
    const id = this.nextNoteId++;
    this.notes.push({ id, note, startTime, duration, velocity });
    return id;
  }

  /**
   * Remove a previously added note event.
   */
  removeNote(noteId) {
    this.notes = this.notes.filter((n) => n.id !== noteId);
  }

  /**
   * Update synthesizer parameters. Parameters are shallowly
   * assigned onto the synth's options object.
   */
  setSynthParams(params) {
    if (!params) return;
    for (const key of Object.keys(params)) {
      this.synth.options[key] = params[key];
    }
  }

  /**
   * Trigger all notes in this channel relative to a given
   * transport time. For each note the synth's triggerAttackRelease
   * method is invoked.
   */
  trigger(time) {
    this.notes.forEach((evt) => {
      const when = time + (evt.startTime || 0);
      const duration = evt.duration || 0;
      const velocity = evt.velocity === undefined ? 1 : evt.velocity;
      this.synth.triggerAttackRelease(evt.note, duration, when, velocity);
    });
  }

  /**
   * Serialize the channel settings and note events. The synth
   * instance itself is not serialized.
   */
  serialize() {
    return JSON.stringify({
      gain: this.gain,
      pan: this.pan,
      notes: this.notes,
    });
  }

  /**
   * Restore the channel from a serialized state. A new synth is
   * created since the original instance cannot be serialized.
   */
  deserialize(data) {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;
    this.gain = obj.gain;
    this.pan = obj.pan;
    this.notes = obj.notes || [];
  }
}

module.exports = InstrumentChannel;