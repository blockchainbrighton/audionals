// midiInput.js

/**
 * @file WebMIDI input handler that maps MIDI events to grid interactions.
 * Detects MIDI devices and translates note events to grid toggles.
 */

import { emit } from './eventBus.js';

// Module-level variables to maintain MIDI state
let midiAccess = null;
let isMidiEnabled = false;

/**
 * Initializes MIDI input support.
 * Requests MIDI access and sets up event listeners.
 * @returns {Promise<boolean>} Resolves to true if MIDI is successfully initialized.
 */
export async function initMidi() {
  if (isMidiEnabled) return true;

  if (!navigator.requestMIDIAccess) {
    console.warn('WebMIDI is not supported in this browser');
    return false;
  }

  try {
    midiAccess = await navigator.requestMIDIAccess();
    setupMidiListeners(midiAccess);
    isMidiEnabled = true;
    return true;
  } catch (error) {
    console.error('Failed to access MIDI devices:', error);
    return false;
  }
}

/**
 * Cleans up MIDI resources and removes event listeners.
 */
export function disposeMidi() {
  if (midiAccess) {
    midiAccess.removeEventListener('statechange', handleStateChange);
    midiAccess.inputs.forEach(input => {
      input.removeEventListener('midimessage', handleMidiMessage);
    });
  }
  midiAccess = null;
  isMidiEnabled = false;
}

/**
 * Sets up listeners for MIDI devices and messages.
 * @param {MIDIAccess} midiAccess - The MIDI access object.
 */
function setupMidiListeners(midiAccess) {
  // Listen for new MIDI devices
  midiAccess.addEventListener('statechange', handleStateChange);
  
  // Set up listeners for existing inputs
  midiAccess.inputs.forEach(input => {
    input.addEventListener('midimessage', handleMidiMessage);
  });
}

/**
 * Handles MIDI device connection/disconnection.
 * @param {MIDIConnectionEvent} event - The connection event.
 */
function handleStateChange(event) {
  if (event.port.type === 'input') {
    if (event.port.state === 'connected') {
      event.port.addEventListener('midimessage', handleMidiMessage);
    } else if (event.port.state === 'disconnected') {
      event.port.removeEventListener('midimessage', handleMidiMessage);
    }
  }
}

/**
 * Handles incoming MIDI messages and maps them to grid events.
 * @param {MIDIMessageEvent} event - The MIDI message event.
 */
function handleMidiMessage(event) {
  const [status, note, velocity] = event.data;
  const command = status & 0xf0;
  
  // Only handle Note On/Off events
  if (command === 0x90 || command === 0x80) {
    const isNoteOn = (command === 0x90 && velocity > 0);
    
    // Map MIDI note to grid position
    const mapping = mapMidiNoteToGrid(note);
    if (mapping) {
      const { track, step } = mapping;
      
      // Emit grid toggle event
      emit('GRID/STEP_TOGGLED', {
        track,
        step,
        isActive: isNoteOn
      });
    }
  }
}

/**
 * Maps a MIDI note number to a grid track and step.
 * @param {number} note - The MIDI note number (0-127).
 * @returns {Object|null} Object with track and step, or null if unmapped.
 */
function mapMidiNoteToGrid(note) {
  // Simple mapping: 
  // - Notes 36-51 (C2 to D3) map to track 0, steps 0-15
  // - Notes 52-67 (E3 to F#4) map to track 1, steps 0-15
  // - And so on...
  
  if (note >= 36 && note <= 99) {
    const track = Math.floor((note - 36) / 16);
    const step = (note - 36) % 16;
    
    // Only map to valid tracks (0-7)
    if (track < 8) {
      return { track, step };
    }
  }
  
  return null;
}

/**
 * Gets the current MIDI status.
 * @returns {Object} Status object with enabled flag and device info.
 */
export function getMidiStatus() {
  if (!midiAccess) {
    return { enabled: false, devices: [] };
  }
  
  const devices = [];
  midiAccess.inputs.forEach(input => {
    devices.push({
      id: input.id,
      name: input.name || 'Unknown Device',
      state: input.state
    });
  });
  
  return { enabled: isMidiEnabled, devices };
}