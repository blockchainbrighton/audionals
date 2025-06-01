import { BeatScheduler } from '../utils/scheduler.js';

describe('BeatScheduler', () => {
  test('calculates correct beat info for simple case', () => {
    const bpm = 120;
    const scheduler = new BeatScheduler(bpm, 4);
    
    // At 120 BPM, each beat is 0.5 seconds
    const beat1 = scheduler.getBeatInfo(0.5);
    expect(beat1.currentBeat).toBe(1);
    expect(beat1.isBeat).toBe(true);
    expect(beat1.progressInBeat).toBeCloseTo(0);
    
    const beat1_1 = scheduler.getBeatInfo(0.75);
    expect(beat1_1.currentBeat).toBe(1);
    expect(beat1_1.isBeat).toBe(false);
    expect(beat1_1.progressInBeat).toBeCloseTo(0.5);
    
    const beat2 = scheduler.getBeatInfo(1.0);
    expect(beat2.currentBeat).toBe(2);
    expect(beat2.isBeat).toBe(true);
  });
  
  test('handles bar progression correctly', () => {
    const bpm = 60;
    const bars = 4;
    const scheduler = new BeatScheduler(bpm, bars);
    
    // At 60 BPM, each beat is 1 second, 4 beats per bar
    const bar1Beat1 = scheduler.getBeatInfo(1.0);
    expect(bar1Beat1.currentBar).toBe(1);
    expect(bar1Beat1.currentBeatInBar).toBe(1);
    
    const bar1Beat4 = scheduler.getBeatInfo(4.0);
    expect(bar1Beat4.currentBar).toBe(1);
    expect(bar1Beat4.currentBeatInBar).toBe(4);
    
    const bar2Beat1 = scheduler.getBeatInfo(5.0);
    expect(bar2Beat1.currentBar).toBe(2);
    expect(bar2Beat1.currentBeatInBar).toBe(1);
  });
  
  test('adjusts speed correctly', () => {
    const bpm = 60;
    const scheduler = new BeatScheduler(bpm, 4);
    scheduler.speed = 2.0; // Double speed
    
    // At double speed, beats should come twice as fast
    const beat1 = scheduler.getBeatInfo(0.25);
    expect(beat1.currentBeat).toBe(1);
    expect(beat1.isBeat).toBe(true);
    
    const beat2 = scheduler.getBeatInfo(0.5);
    expect(beat2.currentBeat).toBe(2);
  });
});