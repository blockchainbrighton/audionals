// src/audio/AudioManager.js

/**
 * Audio Manager
 * Handles audio playback and synchronization
 */

import { AppConfig } from '../config/index.js';

export class AudioManager {
  constructor() {
    this.audio = null;
    this.loaded = false;
    this.loading = false;
    this.songUrl = null;
    this.volume = AppConfig.audio.defaultVolume;
    this.onLoadCallbacks = [];
    this.onPlayCallbacks = [];
    this.onStopCallbacks = [];
    this.onErrorCallbacks = [];
  }

  /**
   * Initialize audio manager with configuration
   * @param {Object} config - Audio configuration
   */
  initialize(config = {}) {
    this.songUrl = config.songUrl || window.fxSongUrl || AppConfig.audio.defaultSongUrl;
    this.volume = config.volume ?? AppConfig.audio.defaultVolume;
    
    // Auto-load audio on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.loadAudio());
    } else {
      this.loadAudio();
    }
  }

  /**
   * Load audio file
   * @returns {Promise<void>} Promise that resolves when audio is loaded
   */
  loadAudio() {
    if (this.audio || this.loading) {
      return Promise.resolve();
    }

    this.loading = true;

    return new Promise((resolve, reject) => {
      this.audio = new Audio(this.songUrl);
      this.audio.preload = AppConfig.audio.preload;
      this.audio.crossOrigin = AppConfig.audio.crossOrigin;
      this.audio.volume = this.volume;

      const onCanPlayThrough = () => {
        this.loaded = true;
        this.loading = false;
        this.onLoadCallbacks.forEach(callback => callback());
        resolve();
      };

      const onError = (error) => {
        this.loading = false;
        this.onErrorCallbacks.forEach(callback => callback(error));
        reject(error);
      };

      this.audio.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
      this.audio.addEventListener('error', onError, { once: true });
      this.audio.load();
    });
  }

  /**
   * Play audio from the beginning
   * @returns {Promise<void>} Promise that resolves when playback starts
   */
  async play() {
    if (!this.audio) {
      await this.loadAudio();
    }

    if (!this.loaded) {
      return new Promise((resolve) => {
        this.audio.addEventListener('canplaythrough', async () => {
          await this.startPlayback();
          resolve();
        }, { once: true });
      });
    }

    return this.startPlayback();
  }

  /**
   * Start audio playback
   * @private
   */
  async startPlayback() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      
      try {
        await this.audio.play();
        this.onPlayCallbacks.forEach(callback => callback());
      } catch (error) {
        console.error('[AudioManager] Playback failed:', error);
        this.onErrorCallbacks.forEach(callback => callback(error));
      }
    }
  }

  /**
   * Stop audio playback
   */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.onStopCallbacks.forEach(callback => callback());
    }
  }

  /**
   * Pause audio playback
   */
  pause() {
    if (this.audio) {
      this.audio.pause();
    }
  }

  /**
   * Resume audio playback
   */
  resume() {
    if (this.audio && this.loaded) {
      this.audio.play().catch(error => {
        console.error('[AudioManager] Resume failed:', error);
        this.onErrorCallbacks.forEach(callback => callback(error));
      });
    }
  }

  /**
   * Set audio volume
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Get current playback time
   * @returns {number} Current time in seconds
   */
  getCurrentTime() {
    return this.audio ? this.audio.currentTime : 0;
  }

  /**
   * Get audio duration
   * @returns {number} Duration in seconds
   */
  getDuration() {
    return this.audio ? this.audio.duration : 0;
  }

  /**
   * Check if audio is playing
   * @returns {boolean} True if playing
   */
  isPlaying() {
    return this.audio && !this.audio.paused && !this.audio.ended;
  }

  /**
   * Check if audio is loaded
   * @returns {boolean} True if loaded
   */
  isLoaded() {
    return this.loaded;
  }

  /**
   * Set audio source URL
   * @param {string} url - Audio file URL
   */
  setSongUrl(url) {
    this.songUrl = url;
    this.loaded = false;
    this.loading = false;
    
    if (this.audio) {
      this.audio.src = url;
      this.audio.load();
    }
  }

  /**
   * Add event listener for audio load
   * @param {Function} callback - Callback function
   */
  onLoad(callback) {
    this.onLoadCallbacks.push(callback);
    if (this.loaded) {
      callback();
    }
  }

  /**
   * Add event listener for audio play
   * @param {Function} callback - Callback function
   */
  onPlay(callback) {
    this.onPlayCallbacks.push(callback);
  }

  /**
   * Add event listener for audio stop
   * @param {Function} callback - Callback function
   */
  onStop(callback) {
    this.onStopCallbacks.push(callback);
  }

  /**
   * Add event listener for audio errors
   * @param {Function} callback - Callback function
   */
  onError(callback) {
    this.onErrorCallbacks.push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event type ('load', 'play', 'stop', 'error')
   * @param {Function} callback - Callback function to remove
   */
  removeListener(event, callback) {
    const callbacks = {
      load: this.onLoadCallbacks,
      play: this.onPlayCallbacks,
      stop: this.onStopCallbacks,
      error: this.onErrorCallbacks
    };

    const callbackArray = callbacks[event];
    if (callbackArray) {
      const index = callbackArray.indexOf(callback);
      if (index !== -1) {
        callbackArray.splice(index, 1);
      }
    }
  }

  /**
   * Cleanup audio resources
   */
  destroy() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    
    this.loaded = false;
    this.loading = false;
    this.onLoadCallbacks.length = 0;
    this.onPlayCallbacks.length = 0;
    this.onStopCallbacks.length = 0;
    this.onErrorCallbacks.length = 0;
  }
}

export default AudioManager;

