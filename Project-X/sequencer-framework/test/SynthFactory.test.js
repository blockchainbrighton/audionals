module.exports = async function ({ assert, assertEqual, spy }) {
  const SynthFactory = require('../src/audio/SynthFactory');
  const Tone = require('../src/tone');
  const factory = new SynthFactory();
  const types = ['synth', 'fm', 'am', 'poly'];
  types.forEach((type) => {
    const synth = factory.createSynth(type, {});
    assert(synth, `SynthFactory should create a synth for type ${type}`);
    // Determine expected class
    const expectedType =
      type === 'fm'
        ? Tone.FMSynth
        : type === 'am'
        ? Tone.AMSynth
        : type === 'poly'
        ? Tone.PolySynth
        : Tone.Synth;
    assert(synth instanceof expectedType, `Synth of type ${type} should be instance of correct class`);
    const sp = spy(synth, 'triggerAttackRelease');
    synth.triggerAttackRelease('C4', 1, 0, 0.5);
    assertEqual(sp.calls.length, 1, 'triggerAttackRelease should be called once');
    const args = sp.calls[0];
    assertEqual(args[0], 'C4');
    assertEqual(args[1], 1);
    assertEqual(args[2], 0);
    assertEqual(args[3], 0.5);
    sp.restore();
  });
};