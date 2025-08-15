module.exports = async function ({ assert, assertEqual, spy }) {
  const SamplerChannel = require('../src/channel/SamplerChannel');
  const Tone = require('../src/tone');
  const channel = new SamplerChannel();
  // Stub fetch to return dummy data
  channel.sampleLoader.fetchFn = async () => 'sample-data';
  const player = await channel.loadSample('url');
  assert(player instanceof Tone.Player, 'loadSample should return a Player');
  // Spy on player.start
  const sp = spy(player, 'start');
  channel.trigger(0);
  assertEqual(sp.calls.length, 1, 'trigger() should call player.start when unmuted');
  // Mute channel and ensure start is not called again
  channel.mute = true;
  channel.trigger(1);
  assertEqual(sp.calls.length, 1, 'Muted channel should not trigger playback');
  sp.restore();
  // Test gain update is reflected
  channel.setGain(0.5);
  assertEqual(channel.gain, 0.5, 'Gain should update');
};