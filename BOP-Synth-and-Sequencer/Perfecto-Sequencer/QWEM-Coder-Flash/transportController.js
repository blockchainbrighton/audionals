/**
 * @typedef {Object} TransportController
 * @property {Function} attachControls - Attach transport controls to DOM elements
 */

/**
 * Transport controller module - UI-agnostic transport controls
 * @param {Function} getState - Function to get current app state
 * @param {Function} dispatch - Function to dispatch actions
 * @param {Function} emit - Function to emit events
 * @returns {TransportController}
 */
export function transportController(getState, dispatch, emit) {
    let playButton = null;
    let pauseButton = null;
    let stopButton = null;
    let bpmInput = null;
    let positionIndicator = null;
  
    /**
     * Attach transport controls to DOM elements
     * @param {Object} elements - DOM elements for transport controls
     * @param {HTMLElement} elements.playButton - Play button element
     * @param {HTMLElement} elements.pauseButton - Pause button element
     * @param {HTMLElement} elements.stopButton - Stop button element
     * @param {HTMLElement} elements.bpmInput - BPM input element
     * @param {HTMLElement} elements.positionIndicator - Position indicator element
     * @returns {void}
     */
    function attachControls(elements) {
      playButton = elements.playButton;
      pauseButton = elements.pauseButton;
      stopButton = elements.stopButton;
      bpmInput = elements.bpmInput;
      positionIndicator = elements.positionIndicator;
  
      // Set initial state
      updateDisplay();
  
      // Attach event listeners
      if (playButton) {
        playButton.addEventListener('click', () => {
          dispatch({ type: 'TRANSPORT/PLAY' });
          emit('TRANSPORT/PLAY');
        });
      }
  
      if (pauseButton) {
        pauseButton.addEventListener('click', () => {
          dispatch({ type: 'TRANSPORT/PAUSE' });
          emit('TRANSPORT/PAUSE');
        });
      }
  
      if (stopButton) {
        stopButton.addEventListener('click', () => {
          dispatch({ type: 'TRANSPORT/STOP' });
          emit('TRANSPORT/STOP');
        });
      }
  
      if (bpmInput) {
        bpmInput.addEventListener('change', (e) => {
          const bpm = parseInt(e.target.value);
          if (!isNaN(bpm) && bpm > 0) {
            dispatch({ type: 'TRANSPORT/SET_BPM', payload: { bpm } });
            emit('TRANSPORT/BPM_CHANGED', { bpm });
          }
        });
      }
    }
  
    /**
     * Update the display based on current state
     * @returns {void}
     */
    function updateDisplay() {
      const state = getState();
      const { isPlaying, bpm, position } = state.transport;
  
      // Update button states
      if (playButton) {
        playButton.disabled = isPlaying;
      }
      if (pauseButton) {
        pauseButton.disabled = !isPlaying;
      }
      if (stopButton) {
        stopButton.disabled = !isPlaying;
      }
  
      // Update BPM input
      if (bpmInput) {
        bpmInput.value = bpm;
      }
  
      // Update position indicator
      if (positionIndicator) {
        positionIndicator.textContent = `Position: ${position.toFixed(2)} quarter notes`;
      }
    }
  
    /**
     * Subscribe to state changes to update display
     * @returns {Function} Unsubscribe function
     */
    function subscribeToStateChanges() {
      // We'll rely on the parent module to handle subscription
      // This function is kept for consistency with other modules
      return () => {}; // Empty unsubscribe function
    }
  
    return {
      attachControls,
      updateDisplay,
      subscribeToStateChanges
    };
  }