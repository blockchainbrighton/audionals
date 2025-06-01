/**
 * Visual Effects Tests
 * Tests for specific visual effects implementations
 */

import { VShift } from '../effects/VShift.js';
import { GaussianBlur } from '../effects/GaussianBlur.js';
import { AlphaFade } from '../effects/AlphaFade.js';
import { Pixelation } from '../effects/Pixelation.js';

describe('VShift Effect', () => {
  let vshift;
  let mockImageData;

  beforeEach(() => {
    vshift = new VShift('VShift', { maxShift: 10, sliceHeight: 5 });
    mockImageData = createMockImageData(100, 100);
  });

  test('should initialize with correct parameters', () => {
    expect(vshift.name).toBe('VShift');
    expect(vshift.parameters.maxShift).toBe(10);
    expect(vshift.parameters.sliceHeight).toBe(5);
  });

  test('should initialize properly', () => {
    vshift.initialize(mockImageData);
    
    expect(vshift.isInitialized).toBe(true);
    expect(vshift.originalImageData).toBe(mockImageData);
    expect(vshift.sliceOffsets).toBeDefined();
    expect(vshift.sliceOffsets.length).toBeGreaterThan(0);
  });

  test('should generate slice offsets', () => {
    vshift.initialize(mockImageData);
    
    const sliceCount = Math.ceil(mockImageData.height / vshift.parameters.sliceHeight);
    expect(vshift.sliceOffsets).toHaveLength(sliceCount);
    
    // All offsets should be within max shift range
    vshift.sliceOffsets.forEach(offset => {
      expect(Math.abs(offset)).toBeLessThanOrEqual(vshift.parameters.maxShift);
    });
  });

  test('should render without errors', () => {
    vshift.initialize(mockImageData);
    vshift.start();
    
    const timingInfo = createMockTimingInfo(1.0, 2.0, 120);
    
    expect(() => {
      vshift.render(0.5, timingInfo);
    }).not.toThrow();
    
    expect(vshift.outputImageData).toBeDefined();
    expect(vshift.outputImageData.data.length).toBe(mockImageData.data.length);
  });

  test('should apply different shifts at different progress levels', () => {
    vshift.initialize(mockImageData);
    vshift.start();
    
    const timingInfo = createMockTimingInfo();
    
    // Render at different progress levels
    vshift.render(0.0, timingInfo);
    const output1 = new Uint8ClampedArray(vshift.outputImageData.data);
    
    vshift.render(1.0, timingInfo);
    const output2 = new Uint8ClampedArray(vshift.outputImageData.data);
    
    // Outputs should be different
    expect(output1).not.toEqual(output2);
  });

  test('should handle beat synchronization', () => {
    vshift.parameters.beatSync = true;
    vshift.initialize(mockImageData);
    vshift.start();
    
    const timingInfo1 = createMockTimingInfo(1.0, 2.0, 120);
    const timingInfo2 = createMockTimingInfo(1.1, 2.2, 120);
    
    vshift.render(0.5, timingInfo1);
    const output1 = new Uint8ClampedArray(vshift.outputImageData.data);
    
    vshift.render(0.5, timingInfo2);
    const output2 = new Uint8ClampedArray(vshift.outputImageData.data);
    
    // Beat sync should cause different outputs even with same progress
    expect(output1).not.toEqual(output2);
  });
});

describe('GaussianBlur Effect', () => {
  let blur;
  let mockImageData;

  beforeEach(() => {
    blur = new GaussianBlur('GaussianBlur', { radius: 5, quality: 'medium' });
    mockImageData = createMockImageData(50, 50); // Smaller for faster tests
  });

  test('should initialize with correct parameters', () => {
    expect(blur.name).toBe('GaussianBlur');
    expect(blur.parameters.maxRadius).toBe(5);
    expect(blur.parameters.quality).toBe('medium');
  });

  test('should create gaussian kernel', () => {
    const kernel = blur.createGaussianKernel(3);
    
    expect(kernel).toHaveLength(7); // 2*3+1
    expect(kernel.every(val => val >= 0)).toBe(true);
    
    // Kernel should be normalized
    const sum = kernel.reduce((acc, val) => acc + val, 0);
    expect(sum).toBeCloseTo(1, 5);
    
    // Kernel should be symmetric
    expect(kernel[0]).toBeCloseTo(kernel[6], 5);
    expect(kernel[1]).toBeCloseTo(kernel[5], 5);
    expect(kernel[2]).toBeCloseTo(kernel[4], 5);
  });

  test('should render blur effect', () => {
    blur.initialize(mockImageData);
    blur.start();
    
    const timingInfo = createMockTimingInfo();
    
    expect(() => {
      blur.render(0.5, timingInfo);
    }).not.toThrow();
    
    expect(blur.outputImageData).toBeDefined();
  });

  test('should apply different blur amounts based on progress', () => {
    blur.initialize(mockImageData);
    blur.start();
    
    const timingInfo = createMockTimingInfo();
    
    // No blur at full progress
    blur.render(1.0, timingInfo);
    const output1 = new Uint8ClampedArray(blur.outputImageData.data);
    
    // Maximum blur at zero progress
    blur.render(0.0, timingInfo);
    const output2 = new Uint8ClampedArray(blur.outputImageData.data);
    
    // Outputs should be different
    expect(output1).not.toEqual(output2);
  });

  test('should handle different quality settings', () => {
    const qualities = ['low', 'medium', 'high'];
    
    qualities.forEach(quality => {
      const testBlur = new GaussianBlur('TestBlur', { radius: 3, quality });
      testBlur.initialize(mockImageData);
      testBlur.start();
      
      expect(() => {
        testBlur.render(0.5, createMockTimingInfo());
      }).not.toThrow();
    });
  });

  test('should handle zero radius gracefully', () => {
    blur.initialize(mockImageData);
    blur.start();
    
    // Mock zero radius by setting progress to 1
    const timingInfo = createMockTimingInfo();
    
    expect(() => {
      blur.render(1.0, timingInfo);
    }).not.toThrow();
  });
});

describe('AlphaFade Effect', () => {
  let alphaFade;
  let mockImageData;

  beforeEach(() => {
    alphaFade = new AlphaFade('AlphaFade', { 
      fadeDirection: 'in', 
      pattern: 'uniform' 
    });
    mockImageData = createMockImageData(50, 50);
  });

  test('should initialize with correct parameters', () => {
    expect(alphaFade.name).toBe('AlphaFade');
    expect(alphaFade.parameters.fadeDirection).toBe('in');
    expect(alphaFade.parameters.pattern).toBe('uniform');
  });

  test('should calculate base alpha correctly', () => {
    alphaFade.initialize(mockImageData);
    
    const timingInfo = createMockTimingInfo();
    
    // Fade in: alpha should increase with progress
    alphaFade.parameters.fadeDirection = 'in';
    const alpha1 = alphaFade.calculateBaseAlpha(0.0, timingInfo);
    const alpha2 = alphaFade.calculateBaseAlpha(1.0, timingInfo);
    expect(alpha1).toBeLessThan(alpha2);
    
    // Fade out: alpha should decrease with progress
    alphaFade.parameters.fadeDirection = 'out';
    const alpha3 = alphaFade.calculateBaseAlpha(0.0, timingInfo);
    const alpha4 = alphaFade.calculateBaseAlpha(1.0, timingInfo);
    expect(alpha3).toBeGreaterThan(alpha4);
  });

  test('should generate different alpha masks for different patterns', () => {
    const patterns = ['uniform', 'radial', 'linear', 'noise'];
    const masks = {};
    
    patterns.forEach(pattern => {
      alphaFade.parameters.pattern = pattern;
      alphaFade.initialize(mockImageData);
      
      const mask = alphaFade.generateAlphaMask(50, 50, 0.5, createMockTimingInfo());
      masks[pattern] = Array.from(mask);
    });
    
    // Different patterns should produce different masks
    expect(masks.uniform).not.toEqual(masks.radial);
    expect(masks.radial).not.toEqual(masks.linear);
    expect(masks.linear).not.toEqual(masks.noise);
  });

  test('should render fade effect', () => {
    alphaFade.initialize(mockImageData);
    alphaFade.start();
    
    const timingInfo = createMockTimingInfo();
    
    expect(() => {
      alphaFade.render(0.5, timingInfo);
    }).not.toThrow();
    
    expect(alphaFade.outputImageData).toBeDefined();
  });

  test('should modify alpha channel', () => {
    alphaFade.initialize(mockImageData);
    alphaFade.start();
    
    // Set all alpha values to 255 initially
    for (let i = 3; i < mockImageData.data.length; i += 4) {
      mockImageData.data[i] = 255;
    }
    
    const timingInfo = createMockTimingInfo();
    alphaFade.render(0.0, timingInfo); // Should fade to transparent
    
    // Check that some alpha values have been modified
    let hasModifiedAlpha = false;
    for (let i = 3; i < alphaFade.outputImageData.data.length; i += 4) {
      if (alphaFade.outputImageData.data[i] < 255) {
        hasModifiedAlpha = true;
        break;
      }
    }
    
    expect(hasModifiedAlpha).toBe(true);
  });
});

describe('Pixelation Effect', () => {
  let pixelation;
  let mockImageData;

  beforeEach(() => {
    pixelation = new Pixelation('Pixelation', { 
      pixelSize: 8, 
      colorMode: 'average' 
    });
    mockImageData = createMockImageData(32, 32); // Small for faster tests
  });

  test('should initialize with correct parameters', () => {
    expect(pixelation.name).toBe('Pixelation');
    expect(pixelation.parameters.maxPixelSize).toBe(8);
    expect(pixelation.parameters.colorMode).toBe('average');
  });

  test('should calculate block colors correctly', () => {
    pixelation.initialize(mockImageData);
    
    const data = mockImageData.data;
    const width = mockImageData.width;
    
    // Test average color calculation
    const avgColor = pixelation.getAverageColor(data, width, 0, 0, 4, 4);
    expect(avgColor).toHaveLength(4);
    expect(avgColor.every(val => val >= 0 && val <= 255)).toBe(true);
  });

  test('should handle different color modes', () => {
    const colorModes = ['average', 'dominant', 'random', 'center'];
    
    colorModes.forEach(mode => {
      pixelation.parameters.colorMode = mode;
      pixelation.initialize(mockImageData);
      
      const data = mockImageData.data;
      const width = mockImageData.width;
      
      expect(() => {
        pixelation.getBlockColor(data, width, 0, 0, 4, 4);
      }).not.toThrow();
    });
  });

  test('should render pixelation effect', () => {
    pixelation.initialize(mockImageData);
    pixelation.start();
    
    const timingInfo = createMockTimingInfo();
    
    expect(() => {
      pixelation.render(0.5, timingInfo);
    }).not.toThrow();
    
    expect(pixelation.outputImageData).toBeDefined();
  });

  test('should apply different pixelation levels based on progress', () => {
    pixelation.initialize(mockImageData);
    pixelation.start();
    
    const timingInfo = createMockTimingInfo();
    
    // High pixelation at low progress
    pixelation.render(0.0, timingInfo);
    const output1 = new Uint8ClampedArray(pixelation.outputImageData.data);
    
    // Low pixelation at high progress
    pixelation.render(1.0, timingInfo);
    const output2 = new Uint8ClampedArray(pixelation.outputImageData.data);
    
    // Outputs should be different
    expect(output1).not.toEqual(output2);
  });

  test('should handle different patterns', () => {
    const patterns = ['square', 'circle', 'diamond'];
    
    patterns.forEach(pattern => {
      pixelation.parameters.pattern = pattern;
      pixelation.initialize(mockImageData);
      
      expect(() => {
        pixelation.isInPattern(0, 0, 8, 8);
      }).not.toThrow();
    });
  });

  test('should apply smoothing when enabled', () => {
    pixelation.parameters.smoothing = 0.5;
    pixelation.initialize(mockImageData);
    pixelation.start();
    
    const timingInfo = createMockTimingInfo();
    
    expect(() => {
      pixelation.render(0.8, timingInfo); // High progress for small pixel size
    }).not.toThrow();
  });

  test('should enhance colors for retro effect', () => {
    pixelation.initialize(mockImageData);
    pixelation.start();
    
    const timingInfo = createMockTimingInfo();
    
    // Low progress should trigger retro enhancement
    expect(() => {
      pixelation.render(0.1, timingInfo);
    }).not.toThrow();
  });
});

describe('Effect Integration', () => {
  test('should handle effect chaining', () => {
    const blur = new GaussianBlur('Blur', { radius: 3 });
    const fade = new AlphaFade('Fade', { fadeDirection: 'in' });
    
    const mockImageData = createMockImageData(50, 50);
    const timingInfo = createMockTimingInfo();
    
    // Initialize both effects
    blur.initialize(mockImageData);
    fade.initialize(mockImageData);
    
    blur.start();
    fade.start();
    
    // Render blur first
    blur.render(0.5, timingInfo);
    
    // Use blur output as fade input
    fade.originalImageData = blur.outputImageData;
    fade.render(0.5, timingInfo);
    
    expect(fade.outputImageData).toBeDefined();
    expect(fade.outputImageData.data.length).toBe(mockImageData.data.length);
  });

  test('should handle rapid parameter changes', () => {
    const vshift = new VShift('VShift');
    const mockImageData = createMockImageData(50, 50);
    
    vshift.initialize(mockImageData);
    vshift.start();
    
    const timingInfo = createMockTimingInfo();
    
    // Rapidly change parameters and render
    for (let i = 0; i < 10; i++) {
      vshift.updateParameters({ 
        maxShift: i * 2,
        intensity: i * 0.1 
      });
      
      expect(() => {
        vshift.render(i * 0.1, timingInfo);
      }).not.toThrow();
    }
  });

  test('should handle edge case image sizes', () => {
    const effects = [
      new VShift('VShift'),
      new GaussianBlur('Blur'),
      new AlphaFade('Fade'),
      new Pixelation('Pixelation')
    ];
    
    const edgeCases = [
      createMockImageData(1, 1),     // Minimum size
      createMockImageData(3, 3),     // Very small
      createMockImageData(1, 100),   // Tall and narrow
      createMockImageData(100, 1)    // Wide and short
    ];
    
    effects.forEach(effect => {
      edgeCases.forEach(imageData => {
        effect.initialize(imageData);
        effect.start();
        
        expect(() => {
          effect.render(0.5, createMockTimingInfo());
        }).not.toThrow();
        
        effect.stop();
        effect.dispose();
      });
    });
  });
});

