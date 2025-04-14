// --- START OF FILE midiHandler.js ---

/**
 * Handles Web MIDI API access, device selection, and message parsing.
 */

// --- Module State ---
let midiAccess = null;          // The MIDIAccess object from the browser
let selectedInputDevice = null; // The currently selected MIDIInput device
let onNoteOnCallback = null;    // Function to call on Note On message
let onNoteOffCallback = null;   // Function to call on Note Off message
let onStateChangeCallback = null; // Function to call when devices change or access status changes

// --- Constants ---
const NOTE_ON_COMMAND = 0x90;  // 144
const NOTE_OFF_COMMAND = 0x80; // 128

// --- Private Helper Functions ---

/**
 * Handles successful MIDI access request.
 * @param {MIDIAccess} access - The MIDIAccess object provided by the browser.
 */
function _onSuccess(access) {
    console.log("MIDI Handler: Successfully obtained MIDI access.");
    midiAccess = access;

    // Listen for future device connections/disconnections
    midiAccess.onstatechange = _onStateChange;

    // Initial listing of devices
    _listInputsAndNotify();
}

/**
 * Handles failed MIDI access request.
 * @param {Error} error - The error object.
 */
function _onFailure(error) {
    console.error("MIDI Handler: Failed to get MIDI access.", error);
    if (onStateChangeCallback) {
        onStateChangeCallback({
            status: 'error',
            message: `Failed to access MIDI devices: ${error.message}`,
            devices: []
        });
    }
    midiAccess = null; // Ensure state is clear
}

/**
 * Handles MIDI device state changes (connect/disconnect).
 * @param {MIDIConnectionEvent} event - The state change event.
 */
function _onStateChange(event) {
    if (!midiAccess) return; // Should not happen if initialized

    const port = event.port;
    console.log(`MIDI Handler: State change detected for ${port.type} device "${port.name}". State: ${port.state}, Connection: ${port.connection}`);

    // If the currently selected device is disconnected, clear the selection
    if (selectedInputDevice && selectedInputDevice.id === port.id && port.state === 'disconnected') {
        console.log(`MIDI Handler: Selected device "${selectedInputDevice.name}" disconnected.`);
        selectedInputDevice.onmidimessage = null; // Remove listener
        selectedInputDevice = null;
        // Notify main app that selection is now null
        // (The state change callback below will handle refreshing the list)
    }

    // Refresh the list and notify the main application
    _listInputsAndNotify();
}

/**
 * Lists available MIDI input devices and notifies the main application via callback.
 */
function _listInputsAndNotify() {
    if (!midiAccess) {
         console.warn("MIDI Handler: Cannot list inputs, MIDI access not available.");
         if (onStateChangeCallback) {
            onStateChangeCallback({ status: 'unavailable', message: 'MIDI Access not granted or unavailable.', devices: [] });
         }
        return;
    }

    const inputs = [];
    midiAccess.inputs.forEach((input) => {
        inputs.push({ id: input.id, name: input.name });
    });

    console.log(`MIDI Handler: Found ${inputs.length} MIDI input(s):`, inputs.map(i => i.name));

    if (onStateChangeCallback) {
        onStateChangeCallback({
            status: 'ready', // Or 'disconnected' if inputs.length is 0? Let's stick to 'ready' if access exists.
            message: inputs.length > 0 ? 'MIDI devices available.' : 'MIDI access ready, but no input devices found.',
            devices: inputs
        });
    }
}

/**
 * Handles incoming MIDI messages from the selected device.
 * @param {MIDIMessageEvent} event - The MIDI message event.
 */
function _handleMidiMessage(event) {
    if (!event.data || event.data.length < 3) {
        // console.warn("MIDI Handler: Received incomplete MIDI message.", event.data);
        return; // Ignore incomplete messages
    }

    const command = event.data[0] & 0xf0; // Mask channel nibble (first 4 bits)
    const note = event.data[1];
    const velocity = event.data[2];

    // Log the raw message for debugging
    // console.log(`MIDI MSG: Cmd=${command.toString(16)}, Note=${note}, Vel=${velocity}`);

    switch (command) {
        case NOTE_ON_COMMAND:
            if (velocity > 0) {
                // True Note On
                // console.log(`MIDI Handler: Note On - Note=${note}, Velocity=${velocity}`);
                if (onNoteOnCallback) {
                    onNoteOnCallback(note, velocity);
                }
            } else {
                // Note On with velocity 0 is often treated as Note Off
                // console.log(`MIDI Handler: Note Off (Vel 0) - Note=${note}`);
                if (onNoteOffCallback) {
                    onNoteOffCallback(note, velocity); // Pass velocity 0
                }
            }
            break;

        case NOTE_OFF_COMMAND:
            // True Note Off
            // console.log(`MIDI Handler: Note Off - Note=${note}, Velocity=${velocity}`);
            if (onNoteOffCallback) {
                onNoteOffCallback(note, velocity);
            }
            break;

        // Add cases for other commands (Pitch Bend, CC, etc.) if needed later
        default:
            // console.log(`MIDI Handler: Ignored command ${command.toString(16)}`);
            break;
    }
}

// --- Public API ---

/**
 * Initializes the MIDI handler. Requests access and sets up callbacks.
 * @param {function} noteOnCb - Callback for Note On messages (receives noteNumber, velocity).
 * @param {function} noteOffCb - Callback for Note Off messages (receives noteNumber, velocity).
 * @param {function} stateChangeCb - Callback for state changes (receives {status, message, devices}).
 */
export function init(noteOnCb, noteOffCb, stateChangeCb) {
    onNoteOnCallback = noteOnCb;
    onNoteOffCallback = noteOffCb;
    onStateChangeCallback = stateChangeCb;

    if (navigator.requestMIDIAccess) {
        console.log("MIDI Handler: Requesting MIDI access...");
        navigator.requestMIDIAccess({ sysex: false }) // sysex: false is safer
            .then(_onSuccess, _onFailure); // Use internal handlers
    } else {
        console.warn("MIDI Handler: Web MIDI API not supported in this browser.");
        if (onStateChangeCallback) {
            onStateChangeCallback({
                status: 'unsupported',
                message: 'Web MIDI API is not supported in this browser.',
                devices: []
            });
        }
    }
}

/**
 * Selects a specific MIDI input device to listen to.
 * @param {string | null} deviceId - The ID of the device to select, or null to deselect.
 */
export function selectDevice(deviceId) {
    if (!midiAccess) {
        console.error("MIDI Handler: Cannot select device, MIDI access not available.");
        return;
    }

    // Deselect previous device if any
    if (selectedInputDevice) {
        console.log(`MIDI Handler: Deselecting previous device "${selectedInputDevice.name}" (id: ${selectedInputDevice.id}).`);
        selectedInputDevice.onmidimessage = null; // IMPORTANT: Remove listener
        selectedInputDevice = null;
    }

    if (!deviceId) {
        console.log("MIDI Handler: No device selected (deselected).");
        return; // Stop here if deselecting
    }

    // Find and select the new device
    const newDevice = midiAccess.inputs.get(deviceId);
    if (newDevice) {
        selectedInputDevice = newDevice;
        selectedInputDevice.onmidimessage = _handleMidiMessage; // Attach the handler
        console.log(`MIDI Handler: Selected device "${selectedInputDevice.name}" (id: ${selectedInputDevice.id}). Listening for messages...`);
    } else {
        console.error(`MIDI Handler: Could not find MIDI input device with ID "${deviceId}".`);
    }
}

// --- END OF FILE midiHandler.js ---