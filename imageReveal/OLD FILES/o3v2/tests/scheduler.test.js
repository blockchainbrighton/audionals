
import BeatScheduler from '../utils/BeatScheduler.js';
test('Scheduler accuracy', ()=>{
  const sched = new BeatScheduler(0,120,1);
  sched.update(1); // at 1 second
  expect(sched.phase).toBeCloseTo((1)/(2)); // barDur=2s
});
