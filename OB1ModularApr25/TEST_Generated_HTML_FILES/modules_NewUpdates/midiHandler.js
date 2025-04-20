/**
 * Handles Web MIDI API access, device selection, and message parsing.
 * Refactored for minimal lines while preserving behavior and API.
 */

// --- Module State ---
let midiAccess = null;
let selectedInputDevice = null;
let onNoteOnCallback = null;
let onNoteOffCallback = null;
let onStateChangeCallback = null;

// --- Constants ---
const NOTE_ON_COMMAND = 0x90;  // 144
const NOTE_OFF_COMMAND = 0x80; // 128

// --- Private Helper Functions ---

/** Helper to notify state changes consistently */
const _notifyStateChange = (status, message, devices = []) => {
    console.log(`MIDI Handler State: ${status} - ${message}`); // Centralized logging for state
    onStateChangeCallback?.({ status, message, devices });
};

/** Handles successful MIDI access request. */
const _onSuccess = (access) => {
    console.log("MIDI Handler: Access obtained.");
    midiAccess = access;
    midiAccess.onstatechange = _onStateChange;
    _listInputsAndNotify(); // Initial list and notify
};

/** Handles failed MIDI access request. */
const _onFailure = (error) => {
    console.error("MIDI Handler: Failed to get access.", error);
    _notifyStateChange('error', `Failed to access MIDI devices: ${error.message}`);
    midiAccess = null;
};

/** Lists available MIDI inputs and notifies via callback. */
const _listInputsAndNotify = () => {
    if (!midiAccess) {
        _notifyStateChange('unavailable', 'MIDI Access not granted or unavailable.');
        return;
    }
    // Use Array.from with mapping for conciseness
    const devices = Array.from(midiAccess.inputs.values(), ({ id, name }) => ({ id, name }));
    const message = devices.length > 0 ? `${devices.length} input(s) available.` : 'Access ready, no input devices found.';
    _notifyStateChange('ready', message, devices);
};

/** Handles MIDI device state changes (connect/disconnect). */
const _onStateChange = ({ port }) => {
    if (!midiAccess) return; // Should have access if this is called
    console.log(`MIDI Handler: Device "${port.name}" ${port.state}.`);
    // If the currently selected device is affected, clear selection state
    if (selectedInputDevice?.id === port.id && port.state !== 'connected') {
        console.log(`MIDI Handler: Selected device "${selectedInputDevice.name}" disconnected/changed.`);
        selectedInputDevice.onmidimessage = null; // Remove listener immediately
        selectedInputDevice = null;
    }
    _listInputsAndNotify(); // Always refresh list and notify after any change
};

/** Handles incoming MIDI messages from the selected device. */
const _handleMidiMessage = ({ data }) => {
    if (!data || data.length < 3) return; // Ignore incomplete messages
    const [status, note, velocity] = data;
    const command = status & 0xf0; // Mask channel

    // Use optional chaining ?.() for callbacks
    if (command === NOTE_ON_COMMAND && velocity > 0) {
        onNoteOnCallback?.(note, velocity);
    } else if (command === NOTE_OFF_COMMAND || (command === NOTE_ON_COMMAND && velocity === 0)) {
        onNoteOffCallback?.(note, velocity); // Handle Note On w/ vel 0 as Note Off
    }
    // Silently ignore other commands (like timing clocks, active sensing, etc.)
};

// --- Public API ---

/**
 * Initializes the MIDI handler. Requests access and sets up callbacks.
 * @param {function} noteOnCb - Callback for Note On messages (receives noteNumber, velocity).
 * @param {function} noteOffCb - Callback for Note Off messages (receives noteNumber, velocity).
 * @param {function} stateChangeCb - Callback for state changes (receives {status, message, devices}).
 */
export function init(noteOnCb, noteOffCb, stateChangeCb) {
    ({ onNoteOnCallback, onNoteOffCallback, onStateChangeCallback } = { // Concise assignment
        onNoteOnCallback: noteOnCb,
        onNoteOffCallback: noteOffCb,
        onStateChangeCallback: stateChangeCb
    });

    if (!navigator.requestMIDIAccess) {
        return _notifyStateChange('unsupported', 'Web MIDI API not supported.');
    }
    console.log("MIDI Handler: Requesting access...");
    navigator.requestMIDIAccess({ sysex: false }) // sysex: false is generally safer
        .then(_onSuccess, _onFailure); // Use concise promise handling
}

/**
 * Selects a specific MIDI input device to listen to.
 * @param {string | null} deviceId - The ID of the device to select, or null to deselect.
 */
export function selectDevice(deviceId) {
    if (!midiAccess) return console.error("MIDI Handler: Cannot select, access unavailable.");

    // Always clear previous listener if a device was selected
    if (selectedInputDevice) {
        console.log(`MIDI Handler: Deselecting "${selectedInputDevice.name}".`);
        selectedInputDevice.onmidimessage = null;
        selectedInputDevice = null;
    }

    // Find and assign the new device if an ID is provided
    const newDevice = deviceId ? midiAccess.inputs.get(deviceId) : null;
    if (newDevice) {
        selectedInputDevice = newDevice;
        selectedInputDevice.onmidimessage = _handleMidiMessage; // Assign message handler
        console.log(`MIDI Handler: Selected "${selectedInputDevice.name}". Listening...`);
    } else if (deviceId) { // Only log error if an ID was given but not found
        console.error(`MIDI Handler: Input device ID "${deviceId}" not found.`);
    } else {
        console.log("MIDI Handler: Device deselected.");
    }
}