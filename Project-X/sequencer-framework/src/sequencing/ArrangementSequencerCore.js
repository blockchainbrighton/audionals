const Tone = require('../tone');

/**
 * ArrangementSequencerCore provides a higher level arrangement
 * abstraction similar to a DAW. Tracks can be added and clips
 * inserted at arbitrary start times. Each clip carries a set of
 * events (note or sample triggers) and a reference to the
 * instrument or sample player responsible for playback. When
 * scheduled, each clip's events are registered with the transport.
 */
class ArrangementSequencerCore {
  constructor() {
    this.tracks = [];
    this.clips = [];
  }

  /**
   * Add a new track with the given configuration and return its
   * identifier.
   */
  addTrack(channelConfig) {
    const id = this.tracks.length;
    this.tracks.push({ id, config: channelConfig });
    return id;
  }

  /**
   * Add a clip to a track. clipData should include startTime,
   * duration, events (array of {time, note, duration, velocity}) and
   * an instrument or sample player. Returns the clip identifier.
   */
  addClip(trackId, clipData) {
    const id = this.clips.length;
    const clip = Object.assign({ id, trackId }, clipData);
    this.clips.push(clip);
    return id;
  }

  /**
   * Move an existing clip to a new start time.
   */
  moveClip(clipId, newStartTime) {
    const clip = this.clips.find((c) => c.id === clipId);
    if (clip) {
      clip.startTime = newStartTime;
    }
  }

  /**
   * Remove a clip from the arrangement.
   */
  removeClip(clipId) {
    const idx = this.clips.findIndex((c) => c.id === clipId);
    if (idx >= 0) {
      this.clips.splice(idx, 1);
    }
  }

  /**
   * Schedule all clips on the transport. Each event inside a clip
   * results in a call to triggerAttackRelease on the associated
   * instrument or start on the player. The callback is scheduled
   * relative to the clip's startTime.
   */
  scheduleClips() {
    this.clips.forEach((clip) => {
      const { startTime = 0, events = [], instrument } = clip;
      events.forEach((evt) => {
        const when = startTime + (evt.time || 0);
        Tone.Transport.schedule(() => {
          // Determine if the instrument is a synth (has triggerAttackRelease)
          // or a sample player (has start). Velocity and duration
          // parameters default if unspecified.
          if (instrument && typeof instrument.triggerAttackRelease === 'function') {
            const duration = evt.duration || 0;
            const velocity = evt.velocity === undefined ? 1 : evt.velocity;
            instrument.triggerAttackRelease(evt.note, duration, when, velocity);
          } else if (instrument && typeof instrument.start === 'function') {
            instrument.start(when);
          }
        }, when);
      });
    });
  }

  /**
   * Serialize the arrangement for persistence.
   */
  serialize() {
    return JSON.stringify({ tracks: this.tracks, clips: this.clips });
  }

  /**
   * Restore the arrangement from a serialized representation.
   */
  deserialize(data) {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;
    this.tracks = obj.tracks || [];
    this.clips = obj.clips || [];
  }
}

module.exports = ArrangementSequencerCore;