module.exports = async function ({ assert, assertEqual, spy }) {
  const AudioContextManager = require('../src/audio/AudioContextManager');
  const StepSequencerCore = require('../src/sequencing/StepSequencerCore');
  const SamplerChannel = require('../src/channel/SamplerChannel');
  const InstrumentChannel = require('../src/channel/InstrumentChannel');
  const ArrangementSequencerCore = require('../src/sequencing/ArrangementSequencerCore');
  const Tone = require('../src/tone');
  // Initialise audio engine
  await AudioContextManager.init();
  await AudioContextManager.start();
  // Step sequencer + sampler channel integration
  const stepSeq = StepSequencerCore.create(1, 4);
  const samplerCh = new SamplerChannel();
  samplerCh.sampleLoader.fetchFn = async () => 'dummy';
  const player = await samplerCh.loadSample('sample');
  const playerSpy = spy(player, 'start');
  // Activate first step
  stepSeq.toggleStep(0, 0, true);
  // Connect step sequencer to sampler channel
  stepSeq.onStep(({ time }) => samplerCh.trigger(time));
  stepSeq.schedule();
  // Simulate one iteration of the loop
  stepSeq.loop.callback(0);
  assertEqual(playerSpy.calls.length, 1, 'Sampler should be triggered for active step');
  playerSpy.restore();
  stepSeq.loop.stop();
  // Arrangement sequencer + instrument channel integration
  const instCh = new InstrumentChannel('synth', {});
  const arrangement = new ArrangementSequencerCore();
  const trackId = arrangement.addTrack({ type: 'instrument' });
  const events = [ { time: 0, note: 'C4', duration: 1, velocity: 0.9 } ];
  arrangement.addClip(trackId, { startTime: 1, duration: 1, events, instrument: instCh.synth });
  const scheduleSpy = spy(Tone.Transport, 'schedule');
  arrangement.scheduleClips();
  assertEqual(scheduleSpy.calls.length, 1, 'One event should be scheduled');
  const [cb, when] = scheduleSpy.calls[0];
  assertEqual(when, 1, 'Event scheduled at correct absolute time');
  const trigSpy = spy(instCh.synth, 'triggerAttackRelease');
  // Trigger scheduled callback
  cb();
  assertEqual(trigSpy.calls.length, 1, 'Instrument should be triggered for scheduled clip');
  scheduleSpy.restore();
  trigSpy.restore();
  // Stop audio engine to clean up timers
  AudioContextManager.stop();
};