// src/audio/index.js

import AudioManager from './AudioManager.js';
import SyncManager from './SyncManager.js';

/**
 * Audio Module Exports
 * Central export point for all audio-related modules
 */

export { AudioManager, default as DefaultAudioManager } from './AudioManager.js';
export { SyncManager, default as DefaultSyncManager } from './SyncManager.js';

// Combined audio object for convenience
export const Audio = {
  Manager: AudioManager,
  SyncManager: SyncManager
};

// Legacy compatibility - create a simple playback object similar to original
export const playback = {
  _audioManager: null,
  
  init(audioManager) {
    this._audioManager = audioManager;
  },
  
  play() {
    if (this._audioManager) {
      return this._audioManager.play();
    }
  },
  
  stop() {
    if (this._audioManager) {
      this._audioManager.stop();
    }
  }
};

export default Audio;

