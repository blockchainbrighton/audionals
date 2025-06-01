/**
 * Core Utilities Tests
 * Tests for PRNG, easing functions, and utility classes
 */

import { PRNG, EasingFunctions, CanvasManager, ImageProcessor } from '../main.js';

describe('PRNG (Pseudo-Random Number Generator)', () => {
  let prng;

  beforeEach(() => {
    prng = new PRNG(12345); // Fixed seed for reproducible tests
  });

  test('should create PRNG with seed', () => {
    expect(prng).toBeInstanceOf(PRNG);
    expect(prng.seed).toBe(12345);
  });

  test('should generate consistent random numbers with same seed', () => {
    const prng1 = new PRNG(42);
    const prng2 = new PRNG(42);
    
    const values1 = Array.from({ length: 10 }, () => prng1.next());
    const values2 = Array.from({ length: 10 }, () => prng2.next());
    
    expect(values1).toEqual(values2);
  });

  test('should generate numbers between 0 and 1', () => {
    for (let i = 0; i < 100; i++) {
      const value = prng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test('should generate integers in specified range', () => {
    for (let i = 0; i < 100; i++) {
      const value = prng.nextInt(5, 15);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(15);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  test('should generate floats in specified range', () => {
    for (let i = 0; i < 100; i++) {
      const value = prng.nextFloat(2.5, 7.8);
      expect(value).toBeGreaterThanOrEqual(2.5);
      expect(value).toBeLessThanOrEqual(7.8);
    }
  });

  test('should handle edge cases for integer range', () => {
    expect(prng.nextInt(5, 5)).toBe(5);
    expect(prng.nextInt(0, 0)).toBe(0);
    expect(prng.nextInt(-5, -5)).toBe(-5);
  });

  test('should reset to initial state when reseeded', () => {
    const initialValues = Array.from({ length: 5 }, () => prng.next());
    
    // Generate more values
    Array.from({ length: 10 }, () => prng.next());
    
    // Reset with same seed
    prng.seed = 12345;
    const resetValues = Array.from({ length: 5 }, () => prng.next());
    
    expect(resetValues).toEqual(initialValues);
  });
});

describe('EasingFunctions', () => {
  test('should have all required easing functions', () => {
    const requiredFunctions = [
      'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
      'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
      'easeInQuart', 'easeOutQuart', 'easeInOutQuart',
      'easeInSine', 'easeOutSine', 'easeInOutSine',
      'easeInExpo', 'easeOutExpo', 'easeInOutExpo',
      'easeInCirc', 'easeOutCirc', 'easeInOutCirc',
      'easeInBack', 'easeOutBack', 'easeInOutBack',
      'easeInElastic', 'easeOutElastic', 'easeInOutElastic',
      'easeInBounce', 'easeOutBounce', 'easeInOutBounce'
    ];

    requiredFunctions.forEach(funcName => {
      expect(EasingFunctions[funcName]).toBeDefined();
      expect(typeof EasingFunctions[funcName]).toBe('function');
    });
  });

  test('should return 0 for t=0 and 1 for t=1 (except elastic/bounce)', () => {
    const testFunctions = [
      'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
      'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
      'easeInSine', 'easeOutSine', 'easeInOutSine'
    ];

    testFunctions.forEach(funcName => {
      const func = EasingFunctions[funcName];
      expect(func(0)).toBeCloseTo(0, 5);
      expect(func(1)).toBeCloseTo(1, 5);
    });
  });

  test('should handle values between 0 and 1', () => {
    const testValues = [0, 0.25, 0.5, 0.75, 1];
    
    Object.keys(EasingFunctions).forEach(funcName => {
      const func = EasingFunctions[funcName];
      testValues.forEach(t => {
        const result = func(t);
        expect(typeof result).toBe('number');
        expect(isNaN(result)).toBe(false);
        expect(isFinite(result)).toBe(true);
      });
    });
  });

  test('linear function should return input value', () => {
    expect(EasingFunctions.linear(0)).toBe(0);
    expect(EasingFunctions.linear(0.5)).toBe(0.5);
    expect(EasingFunctions.linear(1)).toBe(1);
  });

  test('easeInQuad should be slower at start', () => {
    const linear = EasingFunctions.linear(0.5);
    const easeIn = EasingFunctions.easeInQuad(0.5);
    expect(easeIn).toBeLessThan(linear);
  });

  test('easeOutQuad should be faster at start', () => {
    const linear = EasingFunctions.linear(0.5);
    const easeOut = EasingFunctions.easeOutQuad(0.5);
    expect(easeOut).toBeGreaterThan(linear);
  });
});

describe('CanvasManager', () => {
  let canvasManager;
  let mockCanvas;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    canvasManager = new CanvasManager(mockCanvas);
  });

  test('should initialize with canvas element', () => {
    expect(canvasManager.canvas).toBe(mockCanvas);
    expect(canvasManager.context).toBeDefined();
    expect(canvasManager.width).toBe(800);
    expect(canvasManager.height).toBe(600);
  });

  test('should resize canvas', () => {
    canvasManager.resize(1024, 768);
    expect(canvasManager.width).toBe(1024);
    expect(canvasManager.height).toBe(768);
    expect(mockCanvas.width).toBe(1024);
    expect(mockCanvas.height).toBe(768);
  });

  test('should clear canvas', () => {
    const clearRectSpy = jest.spyOn(canvasManager.context, 'clearRect');
    canvasManager.clear();
    expect(clearRectSpy).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  test('should create image data', () => {
    const imageData = canvasManager.createImageData(100, 100);
    expect(imageData).toBeDefined();
    expect(imageData.width).toBe(100);
    expect(imageData.height).toBe(100);
  });

  test('should get image data from canvas', () => {
    const getImageDataSpy = jest.spyOn(canvasManager.context, 'getImageData');
    canvasManager.getImageData();
    expect(getImageDataSpy).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  test('should put image data to canvas', () => {
    const mockImageData = createMockImageData(100, 100);
    const putImageDataSpy = jest.spyOn(canvasManager.context, 'putImageData');
    canvasManager.putImageData(mockImageData);
    expect(putImageDataSpy).toHaveBeenCalledWith(mockImageData, 0, 0);
  });

  test('should handle coordinate transformations', () => {
    const scaleSpy = jest.spyOn(canvasManager.context, 'scale');
    const translateSpy = jest.spyOn(canvasManager.context, 'translate');
    const rotateSpy = jest.spyOn(canvasManager.context, 'rotate');

    canvasManager.scale(2, 2);
    canvasManager.translate(100, 50);
    canvasManager.rotate(Math.PI / 4);

    expect(scaleSpy).toHaveBeenCalledWith(2, 2);
    expect(translateSpy).toHaveBeenCalledWith(100, 50);
    expect(rotateSpy).toHaveBeenCalledWith(Math.PI / 4);
  });

  test('should save and restore context state', () => {
    const saveSpy = jest.spyOn(canvasManager.context, 'save');
    const restoreSpy = jest.spyOn(canvasManager.context, 'restore');

    canvasManager.save();
    canvasManager.restore();

    expect(saveSpy).toHaveBeenCalled();
    expect(restoreSpy).toHaveBeenCalled();
  });
});

describe('ImageProcessor', () => {
  let imageProcessor;
  let mockImageData;

  beforeEach(() => {
    imageProcessor = new ImageProcessor();
    mockImageData = createMockImageData(100, 100);
  });

  test('should copy image data', () => {
    const source = createMockImageData(50, 50);
    const destination = imageProcessor.createImageData(50, 50);
    
    imageProcessor.copyImageData(source, destination);
    
    expect(destination.data).toEqual(source.data);
  });

  test('should calculate brightness correctly', () => {
    // Test with known RGB values
    const brightness1 = imageProcessor.calculateBrightness(255, 0, 0); // Red
    const brightness2 = imageProcessor.calculateBrightness(0, 255, 0); // Green
    const brightness3 = imageProcessor.calculateBrightness(0, 0, 255); // Blue
    const brightness4 = imageProcessor.calculateBrightness(255, 255, 255); // White
    const brightness5 = imageProcessor.calculateBrightness(0, 0, 0); // Black

    expect(brightness1).toBeCloseTo(0.299, 2);
    expect(brightness2).toBeCloseTo(0.587, 2);
    expect(brightness3).toBeCloseTo(0.114, 2);
    expect(brightness4).toBeCloseTo(1, 2);
    expect(brightness5).toBeCloseTo(0, 2);
  });

  test('should apply gaussian blur', () => {
    const originalData = new Uint8ClampedArray(mockImageData.data);
    imageProcessor.applyGaussianBlur(mockImageData, 2);
    
    // Data should be modified (blurred)
    expect(mockImageData.data).not.toEqual(originalData);
  });

  test('should handle edge cases for blur radius', () => {
    const originalData = new Uint8ClampedArray(mockImageData.data);
    
    // Zero radius should not change image
    imageProcessor.applyGaussianBlur(mockImageData, 0);
    expect(mockImageData.data).toEqual(originalData);
    
    // Negative radius should not crash
    expect(() => {
      imageProcessor.applyGaussianBlur(mockImageData, -1);
    }).not.toThrow();
  });

  test('should create proper gaussian kernel', () => {
    const kernel = imageProcessor.createGaussianKernel(3);
    
    expect(kernel).toHaveLength(7); // 2*3+1
    expect(kernel.every(val => val >= 0)).toBe(true);
    
    // Kernel should be normalized (sum ≈ 1)
    const sum = kernel.reduce((acc, val) => acc + val, 0);
    expect(sum).toBeCloseTo(1, 5);
    
    // Kernel should be symmetric
    expect(kernel[0]).toBeCloseTo(kernel[6], 5);
    expect(kernel[1]).toBeCloseTo(kernel[5], 5);
    expect(kernel[2]).toBeCloseTo(kernel[4], 5);
  });

  test('should handle bilinear sampling', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,    // Red pixel at (0,0)
      0, 255, 0, 255,    // Green pixel at (1,0)
      0, 0, 255, 255,    // Blue pixel at (0,1)
      255, 255, 255, 255 // White pixel at (1,1)
    ]);
    
    // Sample at center should be blend of all four colors
    const sample = imageProcessor.bilinearSample(data, 2, 2, 0.5, 0.5);
    
    expect(sample).toHaveLength(4);
    expect(sample[0]).toBeGreaterThan(0); // Some red
    expect(sample[1]).toBeGreaterThan(0); // Some green
    expect(sample[2]).toBeGreaterThan(0); // Some blue
    expect(sample[3]).toBe(255); // Full alpha
  });

  test('should clamp coordinates in bilinear sampling', () => {
    const data = new Uint8ClampedArray(400); // 100 pixels
    
    // Should not throw for out-of-bounds coordinates
    expect(() => {
      imageProcessor.bilinearSample(data, 10, 10, -1, -1);
      imageProcessor.bilinearSample(data, 10, 10, 15, 15);
    }).not.toThrow();
  });
});

