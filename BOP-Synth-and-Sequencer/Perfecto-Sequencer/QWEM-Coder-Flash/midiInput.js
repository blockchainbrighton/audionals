/**
 * @typedef {Object} MidiInput
 * @property {Function} initMidi - Initialize MIDI input
 * @property {Function} disposeMidi - Clean up MIDI resources
 */

/**
 * MIDI input module for detecting and mapping WebMIDI to grid events
 * @param {Function} getState - Function to get current app state
 * @param {Function} dispatch - Function to dispatch actions
 * @param {Function} emit - Function to emit events
 * @returns {MidiInput}
 */
export function midiInput(getState, dispatch, emit) {
    let midiAccess = null;
    let midiInputs = new Map();
    let isInitialized = false;
  
    /**
     * Initialize MIDI input support
     * @returns {Promise<boolean>} Promise resolving to whether MIDI was successfully initialized
     */
    async function initMidi() {
      if (isInitialized) return true;
      
      try {
        // Check if Web MIDI API is supported
        if (!navigator.requestMIDIAccess) {
          console.warn('Web MIDI API is not supported in this browser');
          return false;
        }
        
        // Request MIDI access
        midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        
        // Set up MIDI input listeners
        midiAccess.inputs.forEach(input => {
          setupMidiInput(input);
        });
        
        // Listen for new MIDI devices
        midiAccess.onstatechange = (event) => {
          const device = event.port;
          if (device.connection === 'open' && device.type === 'input') {
            setupMidiInput(device);
          } else if (device.connection === 'close') {
            midiInputs.delete(device.id);
          }
        };
        
        // Update state with available devices
        const devices = Array.from(midiAccess.inputs.values()).map(input => ({
          id: input.id,
          name: input.name,
          manufacturer: input.manufacturer
        }));
        
        dispatch({
          type: 'MIDI/DEVICES_UPDATED',
          payload: { devices }
        });
        
        isInitialized = true;
        return true;
      } catch (error) {
        console.error('Failed to initialize MIDI:', error);
        return false;
      }
    }
  
    /**
     * Set up event listeners for a MIDI input device
     * @param {MIDIInput} input - MIDI input device
     * @returns {void}
     */
    function setupMidiInput(input) {
      // Store input reference
      midiInputs.set(input.id, input);
      
      // Handle incoming MIDI messages
      input.onmidimessage = (message) => {
        const [command, note, velocity] = message.data;
        
        // Only process note on/off messages
        if ((command === 144 && velocity > 0) || command === 128) {
          // Convert MIDI note to grid coordinates
          const gridCoordinates = midiNoteToGridCoordinates(note);
          
          if (gridCoordinates) {
            const { track, step } = gridCoordinates;
            const isActive = command === 144; // Note on = active
            
            // Dispatch action to update grid state
            dispatch({
              type: 'GRID/STEP_TOGGLED',
              payload: { track, step, isActive }
            });
            
            // Emit event for UI updates
            emit('MIDI/NOTE_RECEIVED', { track, step, isActive, note });
          }
        }
      };
    }
  
    /**
     * Convert MIDI note number to grid coordinates
     * @param {number} note - MIDI note number (0-127)
     * @returns {Object|null} Grid coordinates or null if invalid
     */
    function midiNoteToGridCoordinates(note) {
      // Simple mapping: notes 0-127 mapped to 8 tracks × 16 steps
      // For demonstration, we'll map to a simple pattern:
      // - Tracks 0-7 correspond to notes 36-43 (C2-G2) 
      // - Steps 0-15 correspond to notes 36-51 (C2-G2) in order
      
      if (note < 36 || note > 51) {
        return null; // Not in our valid range
      }
      
      // Map to track and step
      const track = note - 36; // 0-7
      const step = note - 36;  // 0-15 (for simplicity)
      
      return { track, step };
    }
  
    /**
     * Clean up MIDI resources
     * @returns {void}
     */
    function disposeMidi() {
      if (midiAccess) {
        // Remove all listeners
        midiInputs.forEach(input => {
          input.onmidimessage = null;
        });
        
        midiInputs.clear();
        midiAccess = null;
      }
      isInitialized = false;
    }
  
    return {
      initMidi,
      disposeMidi
    };
  }