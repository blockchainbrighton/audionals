module.exports = async function ({ assert, assertEqual, spy }) {
  const InstrumentChannel = require('../src/channel/InstrumentChannel');
  const Tone = require('../src/tone');
  // Create instrument channel
  const channel = new InstrumentChannel('synth', {});
  // Spy on synth's triggerAttackRelease
  const sp = spy(channel.synth, 'triggerAttackRelease');
  // Add two notes
  const id1 = channel.addNote('C4', 0, 1, 0.5);
  const id2 = channel.addNote('D4', 0.5, 0.5, 0.8);
  assertEqual(id1, 0, 'First note id should be 0');
  assertEqual(id2, 1, 'Second note id should be 1');
  // Trigger the channel at time 0
  channel.trigger(0);
  assertEqual(sp.calls.length, 2, 'Two notes should be triggered');
  // Validate arguments of first note
  const call1 = sp.calls[0];
  assertEqual(call1[0], 'C4');
  assertEqual(call1[1], 1);
  assertEqual(call1[2], 0);
  assertEqual(call1[3], 0.5);
  // Validate arguments of second note
  const call2 = sp.calls[1];
  assertEqual(call2[0], 'D4');
  assertEqual(call2[1], 0.5);
  assertEqual(call2[2], 0.5);
  assertEqual(call2[3], 0.8);
  // Remove first note and trigger again
  channel.removeNote(id1);
  channel.trigger(0);
  assertEqual(sp.calls.length, 3, 'After removal only one additional trigger should occur');
  sp.restore();
};