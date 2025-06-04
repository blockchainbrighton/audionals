/**
 * Application Configuration
 * Central configuration for the Audional FX Playground
 */

export const AppConfig = {
  // Canvas settings
  canvas: {
    defaultSize: 0.8, // 80% of viewport
    maxSize: '80vh',
    backgroundColor: '#000000',
    borderColor: '#000000',
    borderWidth: 2,
    borderRadius: 4
  },

  // Performance settings
  performance: {
    targetFPS: 60,
    autoThrottle: true,
    maxFrameSkip: 2,
    performanceWarningThreshold: 30, // FPS
    bufferOptimization: true
  },

  // Timeline settings
  timeline: {
    defaultBPM: 120,
    defaultBeatsPerBar: 4,
    barLogInterval: 4,
    maxTimelineLength: 1000, // Maximum timeline entries
    defaultEasing: 'linear'
  },

  // Audio settings
  audio: {
    defaultVolume: 0.8,
    crossOrigin: 'anonymous',
    preload: 'auto',
    defaultSongUrl: 'opus.webm'
  },

  // UI settings
  ui: {
    timelineMaxHeight: '36vh',
    timelineCollapsedHeight: '48px',
    buttonTransitionDuration: '0.2s',
    loadingIndicatorDelay: 100 // ms
  },

  // Development settings
  development: {
    enableLogging: true,
    logPrefix: '[FXDEMO]',
    enablePerformanceMonitoring: true,
    enableDebugMode: false
  },

  // Default images and assets
  assets: {
    defaultImages: [
      "https://ordinals.com/content/01c48d3cceb02215bc3d44f9a2dc7fba63ea63719a2ef1c35d3f0c4db93ab8d5i0"
    ],
    defaultBadgeImages: [
      "https://ordinals.com/content/fba6c1abe4c6d7e8f654da1fe6550e4110c6c3b5c4899cb91ad9ef88dbed96eci0"
    ],
    badgePosition: {
      x: 0.42,
      y: 0.18,
      w: 0.17,
      h: 0.17
    }
  }
};

export default AppConfig;

