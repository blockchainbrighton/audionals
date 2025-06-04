/**
 * Sync Manager
 * Handles synchronization between audio and visual effects
 */

import { AppConfig } from '../config/index.js';

export class SyncManager {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.bpm = AppConfig.timeline.defaultBPM;
    this.beatsPerBar = AppConfig.timeline.defaultBeatsPerBar;
    this.startTime = null;
    this.isPlaying = false;
    this.syncCallbacks = [];
  }

  /**
   * Initialize sync manager
   * @param {Object} config - Sync configuration
   */
  initialize(config = {}) {
    this.bpm = config.bpm || window.fxInitialBPM || AppConfig.timeline.defaultBPM;
    this.beatsPerBar = config.beatsPerBar || window.fxInitialBeatsPerBar || AppConfig.timeline.defaultBeatsPerBar;
  }

  /**
   * Start synchronization
   */
  start() {
    this.startTime = performance.now() / 1000;
    this.isPlaying = true;
    this.notifySyncCallbacks();
  }

  /**
   * Stop synchronization
   */
  stop() {
    this.isPlaying = false;
    this.startTime = null;
    this.notifySyncCallbacks();
  }

  /**
   * Reset synchronization
   */
  reset() {
    this.startTime = null;
    this.isPlaying = false;
  }

  /**
   * Set BPM (beats per minute)
   * @param {number} bpm - Beats per minute
   */
  setBPM(bpm) {
    this.bpm = Math.max(1, bpm);
  }

  /**
   * Set beats per bar
   * @param {number} beatsPerBar - Beats per bar
   */
  setBeatsPerBar(beatsPerBar) {
    this.beatsPerBar = Math.max(1, beatsPerBar);
  }

  /**
   * Convert beats to seconds
   * @param {number} beats - Number of beats
   * @returns {number} Time in seconds
   */
  beatsToSeconds(beats) {
    return (60 / this.bpm) * beats;
  }

  /**
   * Convert bars to seconds
   * @param {number} bars - Number of bars
   * @returns {number} Time in seconds
   */
  barsToSeconds(bars) {
    return this.beatsToSeconds(bars * this.beatsPerBar);
  }

  /**
   * Convert seconds to beats
   * @param {number} seconds - Time in seconds
   * @returns {number} Number of beats
   */
  secondsToBeats(seconds) {
    return seconds * this.bpm / 60;
  }

  /**
   * Convert seconds to bars
   * @param {number} seconds - Time in seconds
   * @returns {number} Number of bars
   */
  secondsToBars(seconds) {
    return this.secondsToBeats(seconds) / this.beatsPerBar;
  }

  /**
   * Get current elapsed time information
   * @returns {Object} Elapsed time data
   */
  getElapsed() {
    const now = performance.now() / 1000;
    const seconds = this.startTime ? now - this.startTime : 0;
    const beat = this.secondsToBeats(seconds);
    const bar = Math.floor(beat / this.beatsPerBar);
    
    return {
      seconds,
      beat,
      bar,
      beatInBar: beat % this.beatsPerBar,
      progress: (beat % this.beatsPerBar) / this.beatsPerBar
    };
  }

  /**
   * Get current audio time if available
   * @returns {number} Audio time in seconds
   */
  getAudioTime() {
    return this.audioManager ? this.audioManager.getCurrentTime() : 0;
  }

  /**
   * Check if audio and visual are in sync
   * @param {number} tolerance - Tolerance in seconds
   * @returns {boolean} True if in sync
   */
  isInSync(tolerance = 0.1) {
    if (!this.audioManager || !this.audioManager.isPlaying()) {
      return true;
    }

    const audioTime = this.getAudioTime();
    const visualTime = this.getElapsed().seconds;
    return Math.abs(audioTime - visualTime) <= tolerance;
  }

  /**
   * Sync visual to audio time
   */
  syncToAudio() {
    if (this.audioManager && this.audioManager.isPlaying()) {
      const audioTime = this.getAudioTime();
      this.startTime = (performance.now() / 1000) - audioTime;
    }
  }

  /**
   * Get beat phase (0-1 within current beat)
   * @returns {number} Beat phase
   */
  getBeatPhase() {
    const elapsed = this.getElapsed();
    return elapsed.beat % 1;
  }

  /**
   * Get bar phase (0-1 within current bar)
   * @returns {number} Bar phase
   */
  getBarPhase() {
    const elapsed = this.getElapsed();
    return (elapsed.beat % this.beatsPerBar) / this.beatsPerBar;
  }

  /**
   * Check if currently on a beat
   * @param {number} tolerance - Tolerance for beat detection
   * @returns {boolean} True if on beat
   */
  isOnBeat(tolerance = 0.1) {
    const phase = this.getBeatPhase();
    return phase <= tolerance || phase >= (1 - tolerance);
  }

  /**
   * Check if currently on a bar
   * @param {number} tolerance - Tolerance for bar detection
   * @returns {boolean} True if on bar
   */
  isOnBar(tolerance = 0.1) {
    const phase = this.getBarPhase();
    return phase <= tolerance || phase >= (1 - tolerance);
  }

  /**
   * Get next beat time
   * @returns {number} Time until next beat in seconds
   */
  getTimeToNextBeat() {
    const phase = this.getBeatPhase();
    const beatDuration = this.beatsToSeconds(1);
    return beatDuration * (1 - phase);
  }

  /**
   * Get next bar time
   * @returns {number} Time until next bar in seconds
   */
  getTimeToNextBar() {
    const phase = this.getBarPhase();
    const barDuration = this.barsToSeconds(1);
    return barDuration * (1 - phase);
  }

  /**
   * Add sync callback
   * @param {Function} callback - Callback function
   */
  onSync(callback) {
    this.syncCallbacks.push(callback);
  }

  /**
   * Remove sync callback
   * @param {Function} callback - Callback function
   */
  removeSync(callback) {
    const index = this.syncCallbacks.indexOf(callback);
    if (index !== -1) {
      this.syncCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all sync callbacks
   * @private
   */
  notifySyncCallbacks() {
    const elapsed = this.getElapsed();
    this.syncCallbacks.forEach(callback => {
      try {
        callback(elapsed, this.isPlaying);
      } catch (error) {
        console.error('[SyncManager] Callback error:', error);
      }
    });
  }

  /**
   * Get sync information for debugging
   * @returns {Object} Sync information
   */
  getSyncInfo() {
    const elapsed = this.getElapsed();
    const audioTime = this.getAudioTime();
    
    return {
      bpm: this.bpm,
      beatsPerBar: this.beatsPerBar,
      isPlaying: this.isPlaying,
      elapsed,
      audioTime,
      syncDrift: audioTime - elapsed.seconds,
      beatPhase: this.getBeatPhase(),
      barPhase: this.getBarPhase(),
      isOnBeat: this.isOnBeat(),
      isOnBar: this.isOnBar()
    };
  }
}

export default SyncManager;

