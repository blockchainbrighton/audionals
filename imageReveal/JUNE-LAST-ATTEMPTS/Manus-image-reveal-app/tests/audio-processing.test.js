/**
 * Audio Processing Tests
 * Tests for audio analysis, beat detection, and timing systems
 */

import { AudioProcessor, BeatDetector, BeatScheduler } from '../main.js';

describe('AudioProcessor', () => {
  let audioProcessor;
  let mockAudioContext;
  let mockAnalyser;

  beforeEach(() => {
    mockAnalyser = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn(),
      getByteTimeDomainData: jest.fn()
    };

    mockAudioContext = {
      createAnalyser: jest.fn(() => mockAnalyser),
      createGain: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        gain: { value: 1 }
      })),
      createMediaElementSource: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn()
      })),
      destination: {},
      sampleRate: 44100,
      currentTime: 0
    };

    audioProcessor = new AudioProcessor(mockAudioContext);
  });

  test('should initialize with audio context', () => {
    expect(audioProcessor.audioContext).toBe(mockAudioContext);
    expect(audioProcessor.analyser).toBe(mockAnalyser);
    expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
  });

  test('should connect audio source', () => {
    const mockAudioElement = { play: jest.fn(), pause: jest.fn() };
    const mockSource = { connect: jest.fn(), disconnect: jest.fn() };
    mockAudioContext.createMediaElementSource.mockReturnValue(mockSource);

    audioProcessor.connectAudioSource(mockAudioElement);

    expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledWith(mockAudioElement);
    expect(mockSource.connect).toHaveBeenCalledWith(mockAnalyser);
    expect(mockAnalyser.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });

  test('should get frequency data', () => {
    const mockFrequencyData = new Uint8Array(1024);
    mockFrequencyData.fill(128);
    mockAnalyser.getByteFrequencyData.mockImplementation((array) => {
      array.set(mockFrequencyData);
    });

    const frequencyData = audioProcessor.getFrequencyData();

    expect(mockAnalyser.getByteFrequencyData).toHaveBeenCalled();
    expect(frequencyData).toBeInstanceOf(Uint8Array);
    expect(frequencyData.length).toBe(1024);
  });

  test('should get time domain data', () => {
    const mockTimeData = new Uint8Array(2048);
    mockTimeData.fill(128);
    mockAnalyser.getByteTimeDomainData.mockImplementation((array) => {
      array.set(mockTimeData);
    });

    const timeData = audioProcessor.getTimeDomainData();

    expect(mockAnalyser.getByteTimeDomainData).toHaveBeenCalled();
    expect(timeData).toBeInstanceOf(Uint8Array);
    expect(timeData.length).toBe(2048);
  });

  test('should calculate RMS energy', () => {
    const testData = new Uint8Array([100, 150, 200, 50, 75]);
    const rms = audioProcessor.calculateRMS(testData);

    expect(rms).toBeGreaterThan(0);
    expect(rms).toBeLessThanOrEqual(1);
    expect(typeof rms).toBe('number');
  });

  test('should calculate spectral centroid', () => {
    const testData = new Uint8Array(512);
    // Create a peak in the middle frequencies
    for (let i = 200; i < 300; i++) {
      testData[i] = 200;
    }

    const centroid = audioProcessor.calculateSpectralCentroid(testData);

    expect(centroid).toBeGreaterThan(0);
    expect(centroid).toBeLessThan(1);
    expect(typeof centroid).toBe('number');
  });

  test('should handle empty frequency data', () => {
    const emptyData = new Uint8Array(512);
    emptyData.fill(0);

    const rms = audioProcessor.calculateRMS(emptyData);
    const centroid = audioProcessor.calculateSpectralCentroid(emptyData);

    expect(rms).toBe(0);
    expect(centroid).toBe(0);
  });

  test('should calculate frequency bands', () => {
    const testData = new Uint8Array(1024);
    testData.fill(100);

    const bands = audioProcessor.getFrequencyBands(testData);

    expect(bands).toHaveProperty('bass');
    expect(bands).toHaveProperty('mid');
    expect(bands).toHaveProperty('treble');
    expect(bands).toHaveProperty('presence');

    Object.values(bands).forEach(value => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });
  });

  test('should disconnect audio source', () => {
    const mockSource = { connect: jest.fn(), disconnect: jest.fn() };
    audioProcessor.audioSource = mockSource;

    audioProcessor.disconnect();

    expect(mockSource.disconnect).toHaveBeenCalled();
    expect(audioProcessor.audioSource).toBeNull();
  });
});

describe('BeatDetector', () => {
  let beatDetector;
  let mockAudioProcessor;

  beforeEach(() => {
    mockAudioProcessor = {
      getFrequencyData: jest.fn(() => new Uint8Array(1024)),
      getTimeDomainData: jest.fn(() => new Uint8Array(2048)),
      calculateRMS: jest.fn(() => 0.5),
      getFrequencyBands: jest.fn(() => ({
        bass: 0.6,
        mid: 0.4,
        treble: 0.3,
        presence: 0.2
      }))
    };

    beatDetector = new BeatDetector(mockAudioProcessor);
  });

  test('should initialize with audio processor', () => {
    expect(beatDetector.audioProcessor).toBe(mockAudioProcessor);
    expect(beatDetector.isDetecting).toBe(false);
    expect(beatDetector.bpm).toBe(120); // Default BPM
  });

  test('should start and stop detection', () => {
    beatDetector.startDetection();
    expect(beatDetector.isDetecting).toBe(true);

    beatDetector.stopDetection();
    expect(beatDetector.isDetecting).toBe(false);
  });

  test('should detect beats from audio data', () => {
    beatDetector.startDetection();

    // Simulate strong bass signal (potential beat)
    mockAudioProcessor.getFrequencyBands.mockReturnValue({
      bass: 0.9,
      mid: 0.3,
      treble: 0.2,
      presence: 0.1
    });

    const currentTime = performance.now() / 1000;
    const beatDetected = beatDetector.detectBeat(currentTime);

    expect(typeof beatDetected).toBe('boolean');
  });

  test('should calculate BPM from beat intervals', () => {
    const beatTimes = [0, 0.5, 1.0, 1.5, 2.0]; // 120 BPM
    beatDetector.beatTimes = beatTimes;

    beatDetector.calculateBPM();

    expect(beatDetector.bpm).toBeCloseTo(120, 0);
  });

  test('should handle insufficient beat data for BPM calculation', () => {
    beatDetector.beatTimes = [0]; // Only one beat
    const originalBPM = beatDetector.bpm;

    beatDetector.calculateBPM();

    expect(beatDetector.bpm).toBe(originalBPM); // Should not change
  });

  test('should maintain beat history within limits', () => {
    beatDetector.startDetection();

    // Add many beats
    for (let i = 0; i < 150; i++) {
      beatDetector.beatTimes.push(i * 0.5);
    }

    beatDetector.calculateBPM();

    expect(beatDetector.beatTimes.length).toBeLessThanOrEqual(100); // Should be limited
  });

  test('should reset detection state', () => {
    beatDetector.beatTimes = [1, 2, 3];
    beatDetector.bpm = 140;
    beatDetector.isDetecting = true;

    beatDetector.reset();

    expect(beatDetector.beatTimes).toHaveLength(0);
    expect(beatDetector.bpm).toBe(120);
    expect(beatDetector.isDetecting).toBe(false);
  });

  test('should get current beat timing info', () => {
    beatDetector.bpm = 120;
    beatDetector.beatTimes = [0, 0.5, 1.0, 1.5];

    const timingInfo = beatDetector.getTimingInfo(2.25);

    expect(timingInfo).toHaveProperty('currentTime');
    expect(timingInfo).toHaveProperty('currentBeat');
    expect(timingInfo).toHaveProperty('bpm');
    expect(timingInfo).toHaveProperty('beatInterval');
    expect(timingInfo).toHaveProperty('lastBeatTime');

    expect(timingInfo.currentTime).toBe(2.25);
    expect(timingInfo.bpm).toBe(120);
    expect(timingInfo.beatInterval).toBeCloseTo(0.5, 2);
  });

  test('should handle adaptive threshold adjustment', () => {
    beatDetector.startDetection();
    const initialThreshold = beatDetector.threshold;

    // Simulate high energy environment
    for (let i = 0; i < 10; i++) {
      mockAudioProcessor.getFrequencyBands.mockReturnValue({
        bass: 0.9,
        mid: 0.8,
        treble: 0.7,
        presence: 0.6
      });
      beatDetector.detectBeat(i * 0.1);
    }

    // Threshold should adapt to high energy
    expect(beatDetector.threshold).not.toBe(initialThreshold);
  });
});

describe('BeatScheduler', () => {
  let beatScheduler;
  let mockBeatDetector;

  beforeEach(() => {
    mockBeatDetector = {
      getTimingInfo: jest.fn(() => createMockTimingInfo()),
      isDetecting: true,
      bpm: 120
    };

    beatScheduler = new BeatScheduler(mockBeatDetector);
  });

  test('should initialize with beat detector', () => {
    expect(beatScheduler.beatDetector).toBe(mockBeatDetector);
    expect(beatScheduler.isRunning).toBe(false);
    expect(beatScheduler.callbacks).toEqual([]);
  });

  test('should start and stop scheduling', () => {
    beatScheduler.start();
    expect(beatScheduler.isRunning).toBe(true);

    beatScheduler.stop();
    expect(beatScheduler.isRunning).toBe(false);
  });

  test('should register beat callbacks', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const id1 = beatScheduler.onBeat(callback1);
    const id2 = beatScheduler.onBeat(callback2);

    expect(beatScheduler.callbacks).toHaveLength(2);
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
    expect(id1).not.toBe(id2);
  });

  test('should unregister beat callbacks', () => {
    const callback = jest.fn();
    const id = beatScheduler.onBeat(callback);

    expect(beatScheduler.callbacks).toHaveLength(1);

    beatScheduler.offBeat(id);

    expect(beatScheduler.callbacks).toHaveLength(0);
  });

  test('should call callbacks on beat events', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    beatScheduler.onBeat(callback1);
    beatScheduler.onBeat(callback2);

    const timingInfo = createMockTimingInfo(1.0, 2.0, 120);
    beatScheduler.processBeat(timingInfo);

    expect(callback1).toHaveBeenCalledWith(timingInfo);
    expect(callback2).toHaveBeenCalledWith(timingInfo);
  });

  test('should handle callback errors gracefully', () => {
    const errorCallback = jest.fn(() => {
      throw new Error('Test error');
    });
    const normalCallback = jest.fn();

    beatScheduler.onBeat(errorCallback);
    beatScheduler.onBeat(normalCallback);

    const timingInfo = createMockTimingInfo();

    expect(() => {
      beatScheduler.processBeat(timingInfo);
    }).not.toThrow();

    expect(normalCallback).toHaveBeenCalled();
  });

  test('should schedule callbacks for future beats', () => {
    const callback = jest.fn();
    const currentTime = 1.0;
    const scheduleTime = 2.0;

    beatScheduler.scheduleCallback(callback, scheduleTime);
    
    // Should not call immediately
    beatScheduler.processScheduledCallbacks(currentTime);
    expect(callback).not.toHaveBeenCalled();

    // Should call when time arrives
    beatScheduler.processScheduledCallbacks(scheduleTime + 0.1);
    expect(callback).toHaveBeenCalled();
  });

  test('should clean up expired scheduled callbacks', () => {
    const callback = jest.fn();
    beatScheduler.scheduleCallback(callback, 1.0);

    expect(beatScheduler.scheduledCallbacks).toHaveLength(1);

    // Process past the scheduled time
    beatScheduler.processScheduledCallbacks(2.0);

    expect(beatScheduler.scheduledCallbacks).toHaveLength(0);
  });

  test('should calculate next beat time accurately', () => {
    const timingInfo = createMockTimingInfo(2.25, 4.5, 120);
    mockBeatDetector.getTimingInfo.mockReturnValue(timingInfo);

    const nextBeatTime = beatScheduler.getNextBeatTime();

    expect(nextBeatTime).toBeGreaterThan(timingInfo.currentTime);
    expect(nextBeatTime).toBeCloseTo(2.5, 1); // Next beat at 2.5s
  });

  test('should handle BPM changes', () => {
    mockBeatDetector.bpm = 120;
    const interval1 = beatScheduler.getBeatInterval();

    mockBeatDetector.bpm = 140;
    const interval2 = beatScheduler.getBeatInterval();

    expect(interval1).toBeCloseTo(0.5, 2); // 60/120
    expect(interval2).toBeCloseTo(0.429, 2); // 60/140
    expect(interval2).toBeLessThan(interval1);
  });

  test('should provide accurate timing statistics', () => {
    const stats = beatScheduler.getTimingStats();

    expect(stats).toHaveProperty('averageLatency');
    expect(stats).toHaveProperty('maxLatency');
    expect(stats).toHaveProperty('callbackCount');
    expect(stats).toHaveProperty('missedBeats');

    Object.values(stats).forEach(value => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });
});

