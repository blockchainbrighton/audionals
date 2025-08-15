module.exports = async function ({ assert, assertEqual }) {
  const AudioContextManager = require('../src/audio/AudioContextManager');
  const Tone = require('../src/tone');
  // Ensure init can be called multiple times
  await AudioContextManager.init();
  await AudioContextManager.init();
  // Start the context and verify that now() increases
  await AudioContextManager.start();
  const t1 = AudioContextManager.now();
  const t2 = AudioContextManager.now();
  assert(t2 >= t1, 'AudioContextManager.now() should be monotonic');
  // Change BPM and verify transport bpm is updated
  AudioContextManager.setBpm(140);
  assertEqual(Tone.Transport.bpm.value, 140, 'Transport BPM should update');
  // Stop and ensure state resets
  AudioContextManager.stop();
  assertEqual(Tone.Transport.state, 'stopped', 'Transport should be stopped');
};