/**
 * @typedef {Object} PlaybackScheduler
 * @property {Function} startScheduler - Start the playback scheduler
 * @property {Function} stopScheduler - Stop the playback scheduler
 */

/**
 * Playback scheduler module that converts AppState.grid into timed ToneJS calls
 * @param {Function} getState - Function to get current app state
 * @param {Function} dispatch - Function to dispatch actions
 * @param {Function} emit - Function to emit events
 * @returns {PlaybackScheduler}
 */
export function playbackScheduler(getState, dispatch, emit) {
    let schedulerInterval = null;
    let lastPosition = 0;
    let isRunning = false;
  
    /**
     * Calculate the time in seconds for a given position (quarter notes)
     * @param {number} position - Position in quarter notes
     * @returns {number} Time in seconds
     */
    function positionToSeconds(position) {
      const bpm = getState().transport.bpm;
      // 1 quarter note = 60/bpm seconds
      return position * (60 / bpm);
    }
  
    /**
     * Schedule notes for the next step
     * @param {number} position - Current position in quarter notes
     * @returns {void}
     */
    function scheduleStep(position) {
      const state = getState();
      const { grid, transport } = state;
      
      // Only process if we're playing
      if (!transport.isPlaying) return;
      
      // Process each track
      for (let track = 0; track < grid.tracks; track++) {
        const step = Math.floor(position) % grid.stepsPerTrack;
        
        // Check if this step is active for this track
        if (grid.patternData[track] && grid.patternData[track][step]) {
          // Emit event for UI updates
          emit('PLAYBACK/NOTE_TRIGGERED', {
            track,
            step,
            position
          });
          
          // Trigger note (using a simple note mapping)
          const note = `C${4 + Math.floor(track / 2)}`;
          const time = positionToSeconds(position);
          emit('AUDIO/TRIGGER_NOTE', { note, time });
        }
      }
    }
  
    /**
     * Main scheduler loop
     * @returns {void}
     */
    function schedulerLoop() {
      const state = getState();
      const { transport } = state;
      
      if (!transport.isPlaying) {
        stopScheduler();
        return;
      }
      
      const newPosition = transport.position + 0.25; // Advance by 1/4 note
      
      // Schedule notes for the current step
      scheduleStep(newPosition);
      
      // Update position
      dispatch({
        type: 'TRANSPORT/UPDATE_POSITION',
        payload: { position: newPosition }
      });
      
      // Continue scheduling
      lastPosition = newPosition;
    }
  
    /**
     * Start the playback scheduler
     * @returns {void}
     */
    function startScheduler() {
      if (isRunning) return;
      
      isRunning = true;
      lastPosition = getState().transport.position;
      
      // Schedule first step immediately
      schedulerLoop();
      
      // Set up interval to run every 125ms (for 120 BPM, 1/4 note = 0.5s)
      const intervalTime = 500 / (getState().transport.bpm / 60); // ms per quarter note
      schedulerInterval = setInterval(schedulerLoop, intervalTime);
    }
  
    /**
     * Stop the playback scheduler
     * @returns {void}
     */
    function stopScheduler() {
      if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
      }
      isRunning = false;
    }
  
    return {
      startScheduler,
      stopScheduler
    };
  }