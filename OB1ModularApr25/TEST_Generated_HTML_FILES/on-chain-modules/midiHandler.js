// midiHandler.js
// Module to handle Web MIDI API interactions for input devices.

// --- Module State ---
let midiAccess = null; // Stores the MIDIAccess object provided by the browser
let selectedInputDevice = null; // Stores the currently selected MIDIInput device object
let onNoteOnCallback = null; // User-provided callback for NOTE_ON messages
let onNoteOffCallback = null; // User-provided callback for NOTE_OFF messages
let onStateChangeCallback = null; // User-provided callback for state changes (connection, errors, etc.)

// --- MIDI Constants ---
const NOTE_ON = 0x90;  // 144 in decimal - Status byte for Note On messages (Channel 1)
const NOTE_OFF = 0x80; // 128 in decimal - Status byte for Note Off messages (Channel 1)
// Note: The handler masks the channel nibble, so it works for channels 1-16.

// --- Private Helper Functions ---

/**
 * Callback executed when navigator.requestMIDIAccess successfully grants access.
 * @param {MIDIAccess} midiAccessObject - The MIDIAccess object.
 */
const _onSuccess = (midiAccessObject) => {
    console.log("MIDI Handler: Successfully obtained MIDI access.");
    midiAccess = midiAccessObject;
    // Listen for connection/disconnection events
    midiAccess.onstatechange = _onStateChange;
    // Initial listing of devices
    _listInputsAndNotify();
};

/**
 * Callback executed when navigator.requestMIDIAccess fails.
 * @param {Error} error - The error object.
 */
const _onFailure = (error) => {
    console.error("MIDI Handler: Failed to get MIDI access.", error);
    midiAccess = null; // Ensure access object is cleared
    // Notify the user/application about the failure
    if (onStateChangeCallback) {
        onStateChangeCallback({
            status: "error",
            message: `Failed to access MIDI devices: ${error.message}`,
            devices: []
        });
    }
};

/**
 * Callback executed when a MIDI device connects or disconnects.
 * @param {MIDIConnectionEvent} event - The state change event object.
 */
const _onStateChange = (event) => {
    const port = event.port;
    console.log(`MIDI Handler: State change for ${port.type} device "${port.name}". State: ${port.state}, Connection: ${port.connection}`);

    // If the currently selected device is the one that disconnected, clean up.
    if (selectedInputDevice && selectedInputDevice.id === port.id && port.state === "disconnected") {
        console.log(`MIDI Handler: Selected device "${selectedInputDevice.name}" disconnected.`);
        // Remove the message listener and clear the selection
        selectedInputDevice.onmidimessage = null;
        selectedInputDevice = null;
        // Note: _listInputsAndNotify will be called next, updating the user state.
    }

    // Update the list of available devices and notify the application
    _listInputsAndNotify();
};

/**
 * Enumerates available MIDI input devices and notifies the application via onStateChangeCallback.
 */
const _listInputsAndNotify = () => {
    if (!midiAccess) {
        // This can happen if access failed or hasn't been granted yet.
        console.warn("MIDI Handler: Cannot list inputs, MIDI access not available.");
        if (onStateChangeCallback) {
            onStateChangeCallback({
                status: "unavailable",
                message: "MIDI Access not granted or unavailable.",
                devices: []
            });
        }
        return; // Exit early
    }

    // Get all available input devices
    const inputDevices = Array.from(midiAccess.inputs.values()).map(device => ({
        id: device.id,
        name: device.name
    }));

    console.log(`MIDI Handler: Found ${inputDevices.length} MIDI input(s):`, inputDevices.map(d => d.name));

    // Notify the application about the current status and list of devices
    if (onStateChangeCallback) {
        onStateChangeCallback({
            status: "ready",
            message: inputDevices.length
                ? "MIDI devices available."
                : "MIDI access ready, but no input devices found.",
            devices: inputDevices // Provide the list of {id, name} objects
        });
    }
};

/**
 * Handles incoming MIDI messages from the selected input device.
 * @param {MIDIMessageEvent} midiMessageEvent - The MIDI message event object.
 */
const _handleMidiMessage = (midiMessageEvent) => {
    const data = midiMessageEvent.data;

    // Basic validation: Ensure data exists and has expected length for note messages
    if (!data || data.length < 3) {
        // You might want to log this for debugging, but it can be noisy
        // console.warn("MIDI Handler: Received incomplete or invalid MIDI message.", midiMessageEvent);
        return;
    }

    // Destructure the MIDI message bytes
    // data[0]: Status byte (includes command and channel)
    // data[1]: Note number (0-127)
    // data[2]: Velocity (0-127)
    const [statusByte, note, velocity] = data;

    // Extract the command type by masking out the channel nibble (lower 4 bits)
    // 0xF0 is 11110000 in binary
    const command = statusByte & 0xF0;

    // Log received message for debugging (optional)
    // console.log(`MIDI Debug: Command=${command.toString(16)}, Note=${note}, Velocity=${velocity}`);

    // Check if it's a Note On message (status 0x90)
    if (command === NOTE_ON) {
        if (velocity > 0) {
            // Standard Note On message
            if (onNoteOnCallback) {
                onNoteOnCallback(note, velocity);
            }
        } else {
            // Note On with velocity 0 is often treated as Note Off
            if (onNoteOffCallback) {
                onNoteOffCallback(note, velocity); // Pass velocity 0
            }
        }
    }
    // Check if it's a Note Off message (status 0x80)
    else if (command === NOTE_OFF) {
        // Standard Note Off message
        if (onNoteOffCallback) {
            onNoteOffCallback(note, velocity); // Velocity might be non-zero here
        }
    }
    // Other MIDI messages (Pitch Bend, CC, etc.) are ignored by this handler.
};

// --- Public API ---

/**
 * Initializes the MIDI Handler. Requests MIDI access and sets up callbacks.
 * Must be called before any other functions.
 * @param {function(number, number)} noteOnCb - Callback for Note On messages (receives note, velocity).
 * @param {function(number, number)} noteOffCb - Callback for Note Off messages (receives note, velocity).
 * @param {function(object)} stateChangeCb - Callback for state changes (receives {status, message, devices}).
 */
export const init = (noteOnCb, noteOffCb, stateChangeCb) => {
    // Store the provided callback functions
    onNoteOnCallback = noteOnCb;
    onNoteOffCallback = noteOffCb;
    onStateChangeCallback = stateChangeCb;

    // Check if the Web MIDI API is supported by the browser
    if (navigator.requestMIDIAccess) {
        console.log("MIDI Handler: Requesting MIDI access...");
        // Request access (disable SysEx messages for security/simplicity)
        navigator.requestMIDIAccess({ sysex: false })
            .then(_onSuccess) // Handle successful access
            .catch(_onFailure); // Handle failed access
    } else {
        // Web MIDI API not supported
        console.warn("MIDI Handler: Web MIDI API not supported in this browser.");
        if (onStateChangeCallback) {
            onStateChangeCallback({
                status: "unsupported",
                message: "Web MIDI API is not supported in this browser.",
                devices: []
            });
        }
    }
};

/**
 * Selects a MIDI input device by its ID.
 * Passing null or undefined deselects the current device.
 * @param {string | null | undefined} deviceId - The ID of the MIDIInput device to select.
 */
export const selectDevice = (deviceId) => {
    if (!midiAccess) {
        console.error("MIDI Handler: Cannot select device, MIDI access not available. Call init() first.");
        return;
    }

    // 1. Deselect any currently selected device
    if (selectedInputDevice) {
        console.log(`MIDI Handler: Deselecting previous device "${selectedInputDevice.name}" (id: ${selectedInputDevice.id}).`);
        selectedInputDevice.onmidimessage = null; // Remove the message listener
        selectedInputDevice = null;
    }

    // 2. If no new deviceId is provided, we are done (just deselected).
    if (!deviceId) {
        console.log("MIDI Handler: No device selected (deselected).");
        return;
    }

    // 3. Attempt to find and select the new device
    const deviceToSelect = midiAccess.inputs.get(deviceId);

    if (deviceToSelect) {
        // Device found - select it and attach the message handler
        selectedInputDevice = deviceToSelect;
        selectedInputDevice.onmidimessage = _handleMidiMessage;
        console.log(`MIDI Handler: Selected device "${selectedInputDevice.name}" (id: ${selectedInputDevice.id}). Listening for messages...`);
    } else {
        // Device not found
        console.error(`MIDI Handler: Could not find MIDI input device with ID "${deviceId}". No device is selected.`);
        // selectedInputDevice remains null from step 1 or initial state
    }
};