module.exports = async function ({ assert }) {
  const EventScheduler = require('../src/sequencing/EventScheduler');
  const Tone = require('../src/tone');
  const scheduler = new EventScheduler();
  scheduler.setLookahead(10);
  scheduler.setScheduleAheadTime(0.05);
  let fired = 0;
  const now = Tone.Transport.now();
  const events = [
    { time: now + 0.01, callback: () => fired++ },
    { time: now + 0.02, callback: () => fired++ },
  ];
  scheduler.start(events);
  // Wait enough time for events to fire
  await new Promise((res) => setTimeout(res, 100));
  assert(fired >= 2, 'EventScheduler should fire all events within the window');
  scheduler.stop();
};