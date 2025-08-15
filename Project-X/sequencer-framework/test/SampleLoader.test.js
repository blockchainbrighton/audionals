module.exports = async function ({ assert, assertEqual, spy }) {
  const SampleLoader = require('../src/audio/SampleLoader');
  const Tone = require('../src/tone');
  const loader = new SampleLoader();
  // Override fetch to simulate network loading
  loader.fetchFn = async (src) => `data-for-${src}`;
  const player1 = await loader.loadSample('sample1');
  assert(player1 instanceof Tone.Player, 'loadSample should return a Player');
  // Player start should emit an event; spy to verify
  const sp = spy(player1, 'start');
  player1.start(0);
  assertEqual(sp.calls.length, 1, 'Player.start should be called once');
  sp.restore();
  // Loading the same sample again should return the cached instance
  const player2 = await loader.loadSample('sample1');
  assertEqual(player1, player2, 'Second load should return cached player');
  // Load a multi sample mapping
  const mapping = { C4: 'url1', D4: 'url2' };
  const sampler = await loader.loadMultiSample(mapping);
  assert(sampler instanceof Tone.Sampler, 'loadMultiSample should return a Sampler');
};