const Tone = require('../tone');

/**
 * SynthFactory instantiates various Tone.js synthesizers and
 * connects them to the default destination. Supported types are:
 * 'synth' (default), 'fm', 'am' and 'poly'. Each synth exposes
 * triggerAttack, triggerRelease and triggerAttackRelease methods.
 */
class SynthFactory {
  /**
   * Create a synthesizer of the specified type with the given
   * options. Unknown types default to a basic Synth.
   *
   * @param {string} type
   * @param {Object} options
   */
  createSynth(type = 'synth', options = {}) {
    let synth;
    switch (type) {
      case 'fm':
        synth = new Tone.FMSynth(options);
        break;
      case 'am':
        synth = new Tone.AMSynth(options);
        break;
      case 'poly':
        synth = new Tone.PolySynth(options);
        break;
      default:
        synth = new Tone.Synth(options);
        break;
    }
    synth.connect(Tone.destination);
    return synth;
  }
}

module.exports = SynthFactory;