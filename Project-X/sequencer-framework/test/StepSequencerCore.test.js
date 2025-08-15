module.exports = async function ({ assert, assertEqual }) {
  const StepSequencerCore = require('../src/sequencing/StepSequencerCore');
  // Create a sequencer with one channel and four steps
  const seq = StepSequencerCore.create(1, 4);
  // Toggle the first step on
  seq.toggleStep(0, 0, true);
  assert(seq.patterns[0][0], 'Step should be on after toggle');
  // Register a callback to capture step events
  let called = false;
  seq.onStep(({ channel, step }) => {
    if (channel === 0 && step === 0) {
      called = true;
    }
  });
  // Schedule the sequencer and manually invoke the loop callback
  seq.schedule();
  // Simulate the loop callback invocation; the first call occurs immediately
  seq.loop.callback(0);
  assert(called, 'onStep should have been called for active step');
  // Test serialization round trip
  const data = seq.serialize();
  const seq2 = StepSequencerCore.create(1, 4);
  seq2.deserialize(data);
  assert(seq2.patterns[0][0], 'Deserialized step should remain on');
  // Clear patterns and verify
  seq.clear();
  assert(seq.patterns[0][0] === null, 'clear() should reset the pattern');
  // Stop loop to clean up intervals
  seq.loop.stop();
};