/**
 * Jest Setup File
 * Configures the testing environment for the Music-Synced Image-Reveal application
 */

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: jest.fn(),
    getByteTimeDomainData: jest.fn()
  })),
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
}));

// Mock Canvas API
global.HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
  if (type === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      translate: jest.fn(),
      transform: jest.fn(),
      setTransform: jest.fn(),
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      fillText: jest.fn(),
      strokeText: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      arcTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      bezierCurveTo: jest.fn(),
      rect: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      clip: jest.fn(),
      isPointInPath: jest.fn(() => false)
    };
  }
  return null;
});

// Mock Image constructor
global.Image = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  src: '',
  width: 0,
  height: 0,
  onload: null,
  onerror: null
}));

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  result: null,
  onload: null,
  onerror: null
}));

// Console suppression for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep errors visible
};

// Test utilities
global.createMockImageData = (width = 100, height = 100) => {
  const data = new Uint8ClampedArray(width * height * 4);
  // Fill with random colors for testing
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(Math.random() * 256);     // R
    data[i + 1] = Math.floor(Math.random() * 256); // G
    data[i + 2] = Math.floor(Math.random() * 256); // B
    data[i + 3] = 255;                             // A
  }
  return { data, width, height };
};

global.createMockAudioBuffer = (sampleRate = 44100, length = 1024) => {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.sin(i * 0.1) * 0.5; // Simple sine wave
  }
  return buffer;
};

global.createMockTimingInfo = (currentTime = 0, currentBeat = 0, bpm = 120) => {
  return {
    currentTime,
    currentBeat,
    bpm,
    beatInterval: 60 / bpm,
    lastBeatTime: currentTime - (currentBeat % 1) * (60 / bpm)
  };
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

