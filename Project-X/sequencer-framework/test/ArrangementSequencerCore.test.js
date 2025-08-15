module.exports = async function ({ assert, assertEqual, spy }) {
  const ArrangementSequencerCore = require('../src/sequencing/ArrangementSequencerCore');
  const Tone = require('../src/tone');
  // Create arrangement and track
  const arr = new ArrangementSequencerCore();
  const trackId = arr.addTrack({ type: 'instrument' });
  assertEqual(trackId, 0, 'First track id should be 0');
  // Prepare a dummy instrument with triggerAttackRelease
  const instrument = {
    triggerAttackRelease: function () {},
  };
  // Define events for the clip
  const events = [
    { time: 0, note: 'C4', duration: 1, velocity: 0.8 },
    { time: 0.5, note: 'D4', duration: 0.5, velocity: 1.0 },
  ];
  const clipId = arr.addClip(trackId, {
    startTime: 2,
    duration: 1,
    events,
    instrument,
  });
  assertEqual(clipId, 0, 'First clip id should be 0');
  // Spy on Transport.schedule to capture scheduled callbacks
  const scheduleSpy = spy(Tone.Transport, 'schedule');
  const triggerSpy = spy(instrument, 'triggerAttackRelease');
  arr.scheduleClips();
  // We expect two calls to schedule for the two events
  assertEqual(scheduleSpy.calls.length, events.length, 'schedule() should be called for each event');
  // The first scheduled time should equal startTime + event time
  const [cb1, time1] = scheduleSpy.calls[0];
  assertEqual(time1, 2 + events[0].time, 'First event scheduled at correct absolute time');
  // Invoke the scheduled callbacks manually to simulate transport
  scheduleSpy.calls.forEach(([cb]) => cb());
  // After invoking callbacks the instrument should have been triggered twice
  assertEqual(triggerSpy.calls.length, events.length, 'Instrument should be triggered for each event');
  scheduleSpy.restore();
  triggerSpy.restore();
};