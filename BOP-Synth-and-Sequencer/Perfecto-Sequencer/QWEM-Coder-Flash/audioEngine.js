/**
 * @typedef {Object} AudioEngine
 * @property {Function} initAudio - Initialize the audio context
 * @property {Function} triggerNote - Play a note at specified time
 * @property {Function} dispose - Clean up audio resources
 */

/**
 * Audio engine module for managing ToneJS synth instances
 * @returns {AudioEngine}
 */
export function audioEngine() {
    let synth = null;
    let isInitialized = false;
  
    /**
     * Initialize the audio context and create synth
     * @returns {Promise<void>}
     */
    async function initAudio() {
      if (isInitialized) return;
      
      try {
        // Ensure Tone is available
        if (typeof window.Tone === 'undefined') {
          throw new Error('ToneJS not loaded');
        }
        
        // Create a simple synth
        synth = new window.Tone.PolySynth(window.Tone.Synth).toDestination();
        
        // Set default parameters
        synth.volume.value = -12; // -12dB volume
        
        isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize audio:', error);
        throw error;
      }
    }
  
    /**
     * Trigger a note playback
     * @param {string} note - MIDI note name (e.g., 'C4', 'G5')
     * @param {number} time - When to play the note (in seconds since start)
     * @param {number} duration - Duration of the note in seconds
     * @returns {void}
     */
    function triggerNote(note, time, duration = 0.1) {
      if (!isInitialized || !synth) {
        console.warn('Audio engine not initialized, cannot play note');
        return;
      }
      
      try {
        synth.triggerAttackRelease(note, duration, time);
      } catch (error) {
        console.error('Failed to play note:', note, error);
      }
    }
  
    /**
     * Clean up audio resources
     * @returns {void}
     */
    function dispose() {
      if (synth) {
        synth.dispose();
        synth = null;
      }
      isInitialized = false;
    }
  
    return {
      initAudio,
      triggerNote,
      dispose
    };
  }
  
  // Export a singleton instance
  export const AudioEngine = audioEngine();