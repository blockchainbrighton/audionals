/**
 * Integration Tests
 * Tests for complete application workflow and integration
 */

import { MusicSyncedImageReveal } from '../main.js';

// Mock DOM elements
const createMockDOM = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  
  const audioElement = document.createElement('audio');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  
  const controls = {
    playButton: document.createElement('button'),
    pauseButton: document.createElement('button'),
    stopButton: document.createElement('button'),
    volumeSlider: document.createElement('input'),
    effectSelect: document.createElement('select'),
    intensitySlider: document.createElement('input')
  };
  
  return { canvas, audioElement, fileInput, controls };
};

describe('MusicSyncedImageReveal Integration', () => {
  let app;
  let mockDOM;

  beforeEach(() => {
    mockDOM = createMockDOM();
    app = new MusicSyncedImageReveal(mockDOM.canvas, mockDOM.audioElement);
  });

  afterEach(() => {
    if (app) {
      app.dispose();
    }
  });

  test('should initialize application', () => {
    expect(app).toBeDefined();
    expect(app.canvas).toBe(mockDOM.canvas);
    expect(app.audioElement).toBe(mockDOM.audioElement);
    expect(app.isInitialized).toBe(true);
  });

  test('should load image successfully', async () => {
    const mockImageData = createMockImageData(400, 300);
    
    // Mock image loading
    const originalCreateImageData = app.canvasManager.createImageData;
    app.canvasManager.createImageData = jest.fn(() => mockImageData);
    
    await app.loadImage('data:image/png;base64,mock-data');
    
    expect(app.currentImage).toBeDefined();
    expect(app.isImageLoaded).toBe(true);
    
    // Restore original method
    app.canvasManager.createImageData = originalCreateImageData;
  });

  test('should handle image loading errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock failed image load
    global.Image.mockImplementationOnce(() => ({
      addEventListener: jest.fn((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Failed to load')), 0);
        }
      }),
      removeEventListener: jest.fn(),
      src: '',
      width: 0,
      height: 0
    }));
    
    await expect(app.loadImage('invalid-url')).rejects.toThrow();
    
    consoleSpy.mockRestore();
  });

  test('should start and stop audio playback', () => {
    const playSpy = jest.spyOn(mockDOM.audioElement, 'play').mockResolvedValue();
    const pauseSpy = jest.spyOn(mockDOM.audioElement, 'pause').mockImplementation();
    
    app.startAudio();
    expect(playSpy).toHaveBeenCalled();
    
    app.stopAudio();
    expect(pauseSpy).toHaveBeenCalled();
  });

  test('should handle audio loading', async () => {
    const mockAudioFile = new Blob(['mock audio data'], { type: 'audio/mp3' });
    
    // Mock URL.createObjectURL
    const mockURL = 'blob:mock-audio-url';
    global.URL.createObjectURL.mockReturnValue(mockURL);
    
    await app.loadAudio(mockAudioFile);
    
    expect(mockDOM.audioElement.src).toBe(mockURL);
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockAudioFile);
  });

  test('should register and activate effects', async () => {
    // Load a mock image first
    const mockImageData = createMockImageData(100, 100);
    app.currentImage = mockImageData;
    app.isImageLoaded = true;
    
    // Test effect activation
    app.activateEffect('VShift', { maxShift: 15 });
    
    const activeEffects = app.effectManager.getActiveEffects();
    expect(activeEffects.length).toBeGreaterThan(0);
    
    const vshiftEffect = app.effectManager.getEffectByName('VShift');
    expect(vshiftEffect).toBeDefined();
    expect(vshiftEffect.isActive).toBe(true);
  });

  test('should handle effect parameters update', async () => {
    const mockImageData = createMockImageData(100, 100);
    app.currentImage = mockImageData;
    app.isImageLoaded = true;
    
    app.activateEffect('GaussianBlur', { radius: 5 });
    
    const effect = app.effectManager.getEffectByName('GaussianBlur');
    expect(effect.parameters.maxRadius).toBe(5);
    
    app.updateEffectParameters('GaussianBlur', { radius: 10 });
    expect(effect.parameters.maxRadius).toBe(10);
  });

  test('should handle animation loop', () => {
    const renderSpy = jest.spyOn(app, 'render');
    
    app.startAnimation();
    expect(app.isAnimating).toBe(true);
    
    // Trigger animation frame
    const animationCallback = global.requestAnimationFrame.mock.calls[0][0];
    animationCallback(performance.now());
    
    expect(renderSpy).toHaveBeenCalled();
    
    app.stopAnimation();
    expect(app.isAnimating).toBe(false);
  });

  test('should render frame correctly', () => {
    const mockImageData = createMockImageData(100, 100);
    app.currentImage = mockImageData;
    app.isImageLoaded = true;
    
    app.activateEffect('AlphaFade');
    
    const putImageDataSpy = jest.spyOn(app.canvasManager, 'putImageData');
    
    app.render(performance.now());
    
    expect(putImageDataSpy).toHaveBeenCalled();
  });

  test('should handle beat detection events', () => {
    const beatCallback = jest.fn();
    app.beatScheduler.onBeat(beatCallback);
    
    // Simulate beat detection
    const timingInfo = createMockTimingInfo(1.0, 2.0, 120);
    app.beatScheduler.processBeat(timingInfo);
    
    expect(beatCallback).toHaveBeenCalledWith(timingInfo);
  });

  test('should handle window resize', () => {
    const resizeSpy = jest.spyOn(app.canvasManager, 'resize');
    
    app.handleResize(1024, 768);
    
    expect(resizeSpy).toHaveBeenCalledWith(1024, 768);
  });

  test('should export current frame', () => {
    const mockImageData = createMockImageData(100, 100);
    app.currentImage = mockImageData;
    app.isImageLoaded = true;
    
    // Mock canvas toDataURL
    const mockDataURL = 'data:image/png;base64,mock-export-data';
    app.canvas.toDataURL = jest.fn(() => mockDataURL);
    
    const exportedData = app.exportFrame();
    
    expect(exportedData).toBe(mockDataURL);
    expect(app.canvas.toDataURL).toHaveBeenCalledWith('image/png');
  });

  test('should handle multiple effects simultaneously', async () => {
    const mockImageData = createMockImageData(100, 100);
    app.currentImage = mockImageData;
    app.isImageLoaded = true;
    
    // Activate multiple effects
    app.activateEffect('VShift');
    app.activateEffect('AlphaFade');
    app.activateEffect('GaussianBlur');
    
    const activeEffects = app.effectManager.getActiveEffects();
    expect(activeEffects.length).toBe(3);
    
    // Render frame with multiple effects
    expect(() => {
      app.render(performance.now());
    }).not.toThrow();
  });

  test('should handle effect transitions', async () => {
    const mockImageData = createMockImageData(100, 100);
    app.currentImage = mockImageData;
    app.isImageLoaded = true;
    
    // Start with one effect
    app.activateEffect('VShift');
    expect(app.effectManager.getActiveEffects().length).toBe(1);
    
    // Transition to another effect
    app.deactivateEffect('VShift');
    app.activateEffect('Pixelation');
    
    const activeEffects = app.effectManager.getActiveEffects();
    expect(activeEffects.length).toBe(1);
    expect(activeEffects[0].name).toBe('Pixelation');
  });

  test('should handle performance monitoring', () => {
    app.startPerformanceMonitoring();
    
    // Simulate some rendering
    for (let i = 0; i < 10; i++) {
      app.render(performance.now() + i * 16);
    }
    
    const stats = app.getPerformanceStats();
    
    expect(stats).toHaveProperty('fps');
    expect(stats).toHaveProperty('frameTime');
    expect(stats).toHaveProperty('renderTime');
    expect(stats.fps).toBeGreaterThan(0);
  });

  test('should handle error recovery', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Simulate an error in effect rendering
    const mockEffect = {
      name: 'ErrorEffect',
      isActive: true,
      render: jest.fn(() => {
        throw new Error('Render error');
      })
    };
    
    app.effectManager.effects.push(mockEffect);
    
    // Should not crash the application
    expect(() => {
      app.render(performance.now());
    }).not.toThrow();
    
    consoleSpy.mockRestore();
  });

  test('should cleanup resources on dispose', () => {
    const mockImageData = createMockImageData(100, 100);
    app.currentImage = mockImageData;
    app.isImageLoaded = true;
    
    app.activateEffect('VShift');
    app.startAnimation();
    
    const stopAnimationSpy = jest.spyOn(app, 'stopAnimation');
    const effectDisposeSpy = jest.spyOn(app.effectManager, 'dispose');
    
    app.dispose();
    
    expect(stopAnimationSpy).toHaveBeenCalled();
    expect(effectDisposeSpy).toHaveBeenCalled();
    expect(app.isInitialized).toBe(false);
  });

  test('should handle configuration presets', () => {
    const preset = {
      effects: [
        { name: 'VShift', parameters: { maxShift: 20 } },
        { name: 'AlphaFade', parameters: { fadeDirection: 'out' } }
      ],
      audio: {
        volume: 0.8,
        beatSensitivity: 0.7
      }
    };
    
    app.loadPreset(preset);
    
    // Check that effects were configured
    const vshift = app.effectManager.getEffectByName('VShift');
    const fade = app.effectManager.getEffectByName('AlphaFade');
    
    expect(vshift.parameters.maxShift).toBe(20);
    expect(fade.parameters.fadeDirection).toBe('out');
  });

  test('should handle real-time parameter adjustments', () => {
    const mockImageData = createMockImageData(100, 100);
    app.currentImage = mockImageData;
    app.isImageLoaded = true;
    
    app.activateEffect('GaussianBlur');
    
    // Simulate real-time parameter changes
    for (let i = 0; i < 10; i++) {
      app.updateEffectParameters('GaussianBlur', { 
        radius: i * 2,
        intensity: i * 0.1 
      });
      
      expect(() => {
        app.render(performance.now() + i * 16);
      }).not.toThrow();
    }
  });
});

describe('Application State Management', () => {
  let app;
  let mockDOM;

  beforeEach(() => {
    mockDOM = createMockDOM();
    app = new MusicSyncedImageReveal(mockDOM.canvas, mockDOM.audioElement);
  });

  afterEach(() => {
    if (app) {
      app.dispose();
    }
  });

  test('should save and restore application state', () => {
    const mockImageData = createMockImageData(100, 100);
    app.currentImage = mockImageData;
    app.isImageLoaded = true;
    
    app.activateEffect('VShift', { maxShift: 15 });
    app.activateEffect('AlphaFade', { fadeDirection: 'in' });
    
    const state = app.saveState();
    
    expect(state).toHaveProperty('effects');
    expect(state).toHaveProperty('audio');
    expect(state).toHaveProperty('canvas');
    
    // Clear current state
    app.effectManager.stopAllEffects();
    
    // Restore state
    app.loadState(state);
    
    const activeEffects = app.effectManager.getActiveEffects();
    expect(activeEffects.length).toBe(2);
  });

  test('should handle invalid state data', () => {
    const invalidState = { invalid: 'data' };
    
    expect(() => {
      app.loadState(invalidState);
    }).not.toThrow();
  });

  test('should track application metrics', () => {
    const mockImageData = createMockImageData(100, 100);
    app.currentImage = mockImageData;
    app.isImageLoaded = true;
    
    app.activateEffect('VShift');
    
    // Simulate some activity
    for (let i = 0; i < 20; i++) {
      app.render(performance.now() + i * 16);
    }
    
    const metrics = app.getMetrics();
    
    expect(metrics).toHaveProperty('totalFrames');
    expect(metrics).toHaveProperty('totalEffects');
    expect(metrics).toHaveProperty('averageFPS');
    expect(metrics).toHaveProperty('uptime');
    
    expect(metrics.totalFrames).toBeGreaterThan(0);
    expect(metrics.totalEffects).toBeGreaterThan(0);
  });
});

