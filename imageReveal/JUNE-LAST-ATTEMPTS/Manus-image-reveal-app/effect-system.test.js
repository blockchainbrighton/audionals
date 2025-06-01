/**
 * Effect System Tests
 * Tests for EffectBase class and effect management
 */

import { EffectBase } from '../effects/EffectBase.js';
import { EffectManager } from '../main.js';

// Mock effect class for testing
class MockEffect extends EffectBase {
  constructor(name = 'MockEffect', options = {}) {
    super(name, options);
    this.renderCallCount = 0;
    this.startCallCount = 0;
    this.stopCallCount = 0;
  }

  initializeParameters() {
    this.parameters = {
      testParam: this.options.testParam || 1.0,
      ...this.parameters
    };
  }

  render(progress, timingInfo) {
    this.renderCallCount++;
    this.lastProgress = progress;
    this.lastTimingInfo = timingInfo;
    
    // Simple test effect: copy original to output
    this.copyImageData(this.originalImageData, this.outputImageData);
  }

  onStart() {
    this.startCallCount++;
  }

  onStop() {
    this.stopCallCount++;
  }
}

describe('EffectBase', () => {
  let effect;
  let mockImageData;

  beforeEach(() => {
    effect = new MockEffect('TestEffect', { testParam: 2.0 });
    mockImageData = createMockImageData(100, 100);
  });

  test('should initialize with name and options', () => {
    expect(effect.name).toBe('TestEffect');
    expect(effect.options.testParam).toBe(2.0);
    expect(effect.parameters.testParam).toBe(2.0);
  });

  test('should have default parameters', () => {
    expect(effect.parameters).toHaveProperty('intensity');
    expect(effect.parameters).toHaveProperty('duration');
    expect(effect.parameters).toHaveProperty('easing');
    expect(effect.parameters).toHaveProperty('seed');
  });

  test('should initialize with image data', () => {
    effect.initialize(mockImageData);

    expect(effect.originalImageData).toBe(mockImageData);
    expect(effect.workingImageData).toBeDefined();
    expect(effect.outputImageData).toBeDefined();
    expect(effect.isInitialized).toBe(true);
  });

  test('should create PRNG with seed', () => {
    effect.initialize(mockImageData);
    expect(effect.random).toBeDefined();
    expect(effect.random.seed).toBe(effect.parameters.seed);
  });

  test('should start and stop effect', () => {
    effect.initialize(mockImageData);

    effect.start();
    expect(effect.isActive).toBe(true);
    expect(effect.startCallCount).toBe(1);

    effect.stop();
    expect(effect.isActive).toBe(false);
    expect(effect.stopCallCount).toBe(1);
  });

  test('should not start without initialization', () => {
    expect(() => effect.start()).toThrow();
  });

  test('should render with progress and timing', () => {
    effect.initialize(mockImageData);
    effect.start();

    const timingInfo = createMockTimingInfo(1.0, 2.0, 120);
    effect.render(0.5, timingInfo);

    expect(effect.renderCallCount).toBe(1);
    expect(effect.lastProgress).toBe(0.5);
    expect(effect.lastTimingInfo).toBe(timingInfo);
  });

  test('should apply easing to progress', () => {
    effect.parameters.easing = 'easeInQuad';
    effect.initialize(mockImageData);

    const easedProgress = effect.applyEasing(0.5);
    expect(easedProgress).not.toBe(0.5); // Should be different due to easing
    expect(easedProgress).toBeGreaterThan(0);
    expect(easedProgress).toBeLessThan(1);
  });

  test('should handle invalid easing function', () => {
    effect.parameters.easing = 'invalidEasing';
    effect.initialize(mockImageData);

    const easedProgress = effect.applyEasing(0.5);
    expect(easedProgress).toBe(0.5); // Should fallback to linear
  });

  test('should calculate intensity correctly', () => {
    effect.parameters.intensity = 0.8;
    effect.initialize(mockImageData);

    const intensity = effect.getIntensity();
    expect(intensity).toBe(0.8);
  });

  test('should copy image data correctly', () => {
    const source = createMockImageData(50, 50);
    const destination = createMockImageData(50, 50);
    
    // Fill source with specific pattern
    for (let i = 0; i < source.data.length; i += 4) {
      source.data[i] = 255;     // Red
      source.data[i + 1] = 0;   // Green
      source.data[i + 2] = 0;   // Blue
      source.data[i + 3] = 255; // Alpha
    }

    effect.copyImageData(source, destination);

    expect(destination.data).toEqual(source.data);
  });

  test('should handle mismatched image data sizes', () => {
    const source = createMockImageData(50, 50);
    const destination = createMockImageData(100, 100);

    expect(() => {
      effect.copyImageData(source, destination);
    }).toThrow();
  });

  test('should blend colors correctly', () => {
    const color1 = [255, 0, 0, 255]; // Red
    const color2 = [0, 255, 0, 255]; // Green
    const blended = effect.blendColors(color1, color2, 0.5);

    expect(blended[0]).toBeCloseTo(127, 0); // Half red
    expect(blended[1]).toBeCloseTo(127, 0); // Half green
    expect(blended[2]).toBe(0);             // No blue
    expect(blended[3]).toBe(255);           // Full alpha
  });

  test('should clamp values correctly', () => {
    expect(effect.clamp(-10, 0, 100)).toBe(0);
    expect(effect.clamp(50, 0, 100)).toBe(50);
    expect(effect.clamp(150, 0, 100)).toBe(100);
  });

  test('should interpolate values correctly', () => {
    expect(effect.lerp(0, 100, 0)).toBe(0);
    expect(effect.lerp(0, 100, 0.5)).toBe(50);
    expect(effect.lerp(0, 100, 1)).toBe(100);
  });

  test('should reset effect state', () => {
    effect.initialize(mockImageData);
    effect.start();
    effect.render(0.5, createMockTimingInfo());

    effect.reset();

    expect(effect.isActive).toBe(false);
    expect(effect.renderCallCount).toBe(1); // Should not reset call count
  });

  test('should dispose resources', () => {
    effect.initialize(mockImageData);
    effect.start();

    effect.dispose();

    expect(effect.isActive).toBe(false);
    expect(effect.isInitialized).toBe(false);
    expect(effect.originalImageData).toBeNull();
    expect(effect.workingImageData).toBeNull();
    expect(effect.outputImageData).toBeNull();
  });

  test('should handle parameter updates', () => {
    effect.initialize(mockImageData);
    
    effect.updateParameters({ testParam: 3.0, intensity: 0.5 });

    expect(effect.parameters.testParam).toBe(3.0);
    expect(effect.parameters.intensity).toBe(0.5);
  });

  test('should validate parameter types', () => {
    effect.initialize(mockImageData);

    // Should handle valid parameters
    expect(() => {
      effect.updateParameters({ intensity: 0.8 });
    }).not.toThrow();

    // Should handle invalid parameters gracefully
    expect(() => {
      effect.updateParameters({ intensity: 'invalid' });
    }).not.toThrow();
  });
});

describe('EffectManager', () => {
  let effectManager;
  let mockCanvasManager;

  beforeEach(() => {
    mockCanvasManager = {
      getImageData: jest.fn(() => createMockImageData(100, 100)),
      putImageData: jest.fn(),
      clear: jest.fn()
    };

    effectManager = new EffectManager(mockCanvasManager);
  });

  test('should initialize with canvas manager', () => {
    expect(effectManager.canvasManager).toBe(mockCanvasManager);
    expect(effectManager.effects).toEqual([]);
    expect(effectManager.isRunning).toBe(false);
  });

  test('should register effects', () => {
    const effect1 = new MockEffect('Effect1');
    const effect2 = new MockEffect('Effect2');

    effectManager.registerEffect(effect1);
    effectManager.registerEffect(effect2);

    expect(effectManager.effects).toHaveLength(2);
    expect(effectManager.effects[0]).toBe(effect1);
    expect(effectManager.effects[1]).toBe(effect2);
  });

  test('should not register duplicate effects', () => {
    const effect = new MockEffect('Effect1');

    effectManager.registerEffect(effect);
    effectManager.registerEffect(effect);

    expect(effectManager.effects).toHaveLength(1);
  });

  test('should unregister effects', () => {
    const effect1 = new MockEffect('Effect1');
    const effect2 = new MockEffect('Effect2');

    effectManager.registerEffect(effect1);
    effectManager.registerEffect(effect2);

    effectManager.unregisterEffect(effect1);

    expect(effectManager.effects).toHaveLength(1);
    expect(effectManager.effects[0]).toBe(effect2);
  });

  test('should find effects by name', () => {
    const effect1 = new MockEffect('Effect1');
    const effect2 = new MockEffect('Effect2');

    effectManager.registerEffect(effect1);
    effectManager.registerEffect(effect2);

    const found = effectManager.getEffectByName('Effect1');
    expect(found).toBe(effect1);

    const notFound = effectManager.getEffectByName('NonExistent');
    expect(notFound).toBeNull();
  });

  test('should start and stop effects', () => {
    const effect = new MockEffect('TestEffect');
    effectManager.registerEffect(effect);

    const mockImageData = createMockImageData(100, 100);
    effectManager.startEffect('TestEffect', mockImageData);

    expect(effect.isActive).toBe(true);
    expect(effect.startCallCount).toBe(1);

    effectManager.stopEffect('TestEffect');

    expect(effect.isActive).toBe(false);
    expect(effect.stopCallCount).toBe(1);
  });

  test('should handle starting non-existent effect', () => {
    const mockImageData = createMockImageData(100, 100);

    expect(() => {
      effectManager.startEffect('NonExistent', mockImageData);
    }).not.toThrow();
  });

  test('should render active effects', () => {
    const effect1 = new MockEffect('Effect1');
    const effect2 = new MockEffect('Effect2');

    effectManager.registerEffect(effect1);
    effectManager.registerEffect(effect2);

    const mockImageData = createMockImageData(100, 100);
    effectManager.startEffect('Effect1', mockImageData);
    effectManager.startEffect('Effect2', mockImageData);

    const timingInfo = createMockTimingInfo(1.0, 2.0, 120);
    effectManager.renderEffects(0.5, timingInfo);

    expect(effect1.renderCallCount).toBe(1);
    expect(effect2.renderCallCount).toBe(1);
  });

  test('should not render inactive effects', () => {
    const effect = new MockEffect('TestEffect');
    effectManager.registerEffect(effect);

    const timingInfo = createMockTimingInfo();
    effectManager.renderEffects(0.5, timingInfo);

    expect(effect.renderCallCount).toBe(0);
  });

  test('should get active effects list', () => {
    const effect1 = new MockEffect('Effect1');
    const effect2 = new MockEffect('Effect2');
    const effect3 = new MockEffect('Effect3');

    effectManager.registerEffect(effect1);
    effectManager.registerEffect(effect2);
    effectManager.registerEffect(effect3);

    const mockImageData = createMockImageData(100, 100);
    effectManager.startEffect('Effect1', mockImageData);
    effectManager.startEffect('Effect3', mockImageData);

    const activeEffects = effectManager.getActiveEffects();

    expect(activeEffects).toHaveLength(2);
    expect(activeEffects).toContain(effect1);
    expect(activeEffects).toContain(effect3);
    expect(activeEffects).not.toContain(effect2);
  });

  test('should stop all effects', () => {
    const effect1 = new MockEffect('Effect1');
    const effect2 = new MockEffect('Effect2');

    effectManager.registerEffect(effect1);
    effectManager.registerEffect(effect2);

    const mockImageData = createMockImageData(100, 100);
    effectManager.startEffect('Effect1', mockImageData);
    effectManager.startEffect('Effect2', mockImageData);

    effectManager.stopAllEffects();

    expect(effect1.isActive).toBe(false);
    expect(effect2.isActive).toBe(false);
  });

  test('should update effect parameters', () => {
    const effect = new MockEffect('TestEffect');
    effectManager.registerEffect(effect);

    effectManager.updateEffectParameters('TestEffect', { testParam: 5.0 });

    expect(effect.parameters.testParam).toBe(5.0);
  });

  test('should handle parameter updates for non-existent effect', () => {
    expect(() => {
      effectManager.updateEffectParameters('NonExistent', { param: 1 });
    }).not.toThrow();
  });

  test('should dispose all effects', () => {
    const effect1 = new MockEffect('Effect1');
    const effect2 = new MockEffect('Effect2');

    effectManager.registerEffect(effect1);
    effectManager.registerEffect(effect2);

    effectManager.dispose();

    expect(effect1.isInitialized).toBe(false);
    expect(effect2.isInitialized).toBe(false);
    expect(effectManager.effects).toHaveLength(0);
  });

  test('should provide effect statistics', () => {
    const effect1 = new MockEffect('Effect1');
    const effect2 = new MockEffect('Effect2');

    effectManager.registerEffect(effect1);
    effectManager.registerEffect(effect2);

    const mockImageData = createMockImageData(100, 100);
    effectManager.startEffect('Effect1', mockImageData);

    const stats = effectManager.getStatistics();

    expect(stats).toHaveProperty('totalEffects');
    expect(stats).toHaveProperty('activeEffects');
    expect(stats).toHaveProperty('registeredEffects');

    expect(stats.totalEffects).toBe(2);
    expect(stats.activeEffects).toBe(1);
    expect(stats.registeredEffects).toHaveLength(2);
  });
});

