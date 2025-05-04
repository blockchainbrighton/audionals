// --- START OF FILE midiHandler.js ---

/**
 * Handles Web MIDI API access, device selection (including auto-connect),
 * and message parsing.
 */

// --- Module State ---
let midiAccess = null;          // The MIDIAccess object from the browser
let selectedInputDevice = null; // The currently selected MIDIInput device
let onNoteOnCallback = null;    // Function to call on Note On message
let onNoteOffCallback = null;   // Function to call on Note Off message
let onStateChangeCallback = null; // Function to call when devices change or access status changes
let enableAutoConnect = true; // Flag to control auto-connection behavior

// --- Constants ---
const NOTE_ON_COMMAND = 0x90;  // 144
const NOTE_OFF_COMMAND = 0x80; // 128

// --- Private Helper Functions ---

/**
 * Attempts to automatically connect to the first available MIDI input device.
 * Only connects if enableAutoConnect is true and no device is currently selected.
 * @returns {boolean} True if a connection was attempted, false otherwise.
 */
function _attemptAutoConnect() {
    if (!enableAutoConnect || !midiAccess || selectedInputDevice) {
        // Don't auto-connect if disabled, MIDI not ready, or already connected
        return false;
    }

    let firstInput = null;
    // Map iterators are insertion-ordered, so the first one found is consistent
    for (const input of midiAccess.inputs.values()) {
        firstInput = input;
        break; // Found the first one
    }

    if (firstInput) {
        console.log(`MIDI Handler: Auto-connecting to first available device: "${firstInput.name}"`);
        // Use the public selectDevice function to handle connection logic
        selectDevice(firstInput.id);
        return true;
    } else {
        console.log("MIDI Handler: Auto-connect enabled, but no input devices found.");
        return false;
    }
}


/**
 * Handles successful MIDI access request.
 * @param {MIDIAccess} access - The MIDIAccess object provided by the browser.
 */
function _onSuccess(access) {
    console.log("MIDI Handler: Successfully obtained MIDI access.");
    midiAccess = access;

    // Listen for future device connections/disconnections
    midiAccess.onstatechange = _onStateChange;

    // Initial listing of devices and notify UI
    _listInputsAndNotify();

    // Attempt initial auto-connection
    _attemptAutoConnect();
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
            devices: [],
            selectedDeviceId: null // Ensure selected ID is null on error
        });
    }
    midiAccess = null;
    selectedInputDevice = null; // Clear selection
}

/**
 * Handles MIDI device state changes (connect/disconnect).
 * @param {MIDIConnectionEvent} event - The state change event.
 */
function _onStateChange(event) {
    if (!midiAccess) return;

    const port = event.port;
    const isInput = port.type === 'input';
    const isSelectedDevice = selectedInputDevice && selectedInputDevice.id === port.id;

    console.log(`MIDI Handler: State change detected for ${port.type} device "${port.name}". State: ${port.state}, Connection: ${port.connection}`);

    // --- Handle Disconnection ---
    if (isSelectedDevice && port.state === 'disconnected') {
        console.log(`MIDI Handler: Selected device "${selectedInputDevice.name}" disconnected.`);
        // No need to manually detach listener, port becomes unusable.
        // selectDevice(null) will clear the state correctly.
        selectDevice(null); // Deselect the disconnected device

        // After deselecting, try to auto-connect to another available device
        console.log("MIDI Handler: Attempting to auto-connect to another device after disconnection...");
        _attemptAutoConnect(); // Try to find a replacement
    }
    // --- Handle Connection (for Auto-Connect) ---
    else if (isInput && port.state === 'connected' && enableAutoConnect && !selectedInputDevice) {
        console.log(`MIDI Handler: New input device "${port.name}" connected. Attempting auto-connect.`);
        // Use selectDevice to connect to the newly added device if nothing else is selected
        selectDevice(port.id);
    }

    // Refresh the list and notify the main application regardless of auto-connect actions
    // This ensures the UI always has the latest list and selection status
    _listInputsAndNotify();
}


/**
 * Lists available MIDI input devices and notifies the main application via callback.
 * Includes the currently selected device ID in the notification.
 */
function _listInputsAndNotify() {
    if (!midiAccess) {
         console.warn("MIDI Handler: Cannot list inputs, MIDI access not available.");
         if (onStateChangeCallback) {
            onStateChangeCallback({
                status: 'unavailable',
                message: 'MIDI Access not granted or unavailable.',
                devices: [],
                selectedDeviceId: null
            });
         }
        return;
    }

    const inputs = [];
    midiAccess.inputs.forEach((input) => {
        // Ensure device is actually connected before listing
        // Note: Sometimes 'pending' might appear briefly, but usually 'connected' is what we want
        if (input.connection === 'open' || input.state === 'connected') {
            inputs.push({ id: input.id, name: input.name });
        }
    });

    console.log(`MIDI Handler: Found ${inputs.length} connected MIDI input(s):`, inputs.map(i => i.name));

    const currentSelectedId = selectedInputDevice ? selectedInputDevice.id : null;

    if (onStateChangeCallback) {
        const status = midiAccess ? 'ready' : 'unavailable'; // Status based on access, not device count
        const message = inputs.length > 0
            ? (currentSelectedId ? `Selected: ${selectedInputDevice.name}` : 'MIDI devices available.')
            : 'MIDI access ready, but no connected input devices found.';

        onStateChangeCallback({
            status: status,
            message: message,
            devices: inputs,
            selectedDeviceId: currentSelectedId // Pass the ID of the selected device
        });
    }
}


/**
 * Handles incoming MIDI messages from the selected device.
 * @param {MIDIMessageEvent} event - The MIDI message event.
 */
function _handleMidiMessage(event) {
    // ... (keep the existing implementation of _handleMidiMessage)
    if (!event.data || event.data.length < 3) {
        // console.warn("MIDI Handler: Received incomplete MIDI message.", event.data);
        return; // Ignore incomplete messages
    }

    const command = event.data[0] & 0xf0; // Mask channel nibble (first 4 bits)
    const note = event.data[1];
    const velocity = event.data[2];

    switch (command) {
        case NOTE_ON_COMMAND:
            if (velocity > 0) {
                if (onNoteOnCallback) onNoteOnCallback(note, velocity);
            } else {
                if (onNoteOffCallback) onNoteOffCallback(note, velocity); // Note Off via Vel 0
            }
            break;
        case NOTE_OFF_COMMAND:
            if (onNoteOffCallback) onNoteOffCallback(note, velocity);
            break;
        default:
            break;
    }
}

// --- Public API ---

/**
 * Initializes the MIDI handler. Requests access and sets up callbacks.
 * @param {function} noteOnCb - Callback for Note On messages (receives noteNumber, velocity).
 * @param {function} noteOffCb - Callback for Note Off messages (receives noteNumber, velocity).
 * @param {function} stateChangeCb - Callback for state changes (receives {status, message, devices, selectedDeviceId}).
 * @param {object} [options] - Optional configuration.
 * @param {boolean} [options.autoConnect=true] - Whether to enable auto-connection.
 */
export function init(noteOnCb, noteOffCb, stateChangeCb, options = {}) {
    onNoteOnCallback = noteOnCb;
    onNoteOffCallback = noteOffCb;
    onStateChangeCallback = stateChangeCb;

    // Set auto-connect preference (defaults to true if not provided)
    enableAutoConnect = options.autoConnect !== undefined ? options.autoConnect : true;
    console.log(`MIDI Handler: Auto-connect ${enableAutoConnect ? 'enabled' : 'disabled'}.`);


    // Clear previous state if re-initializing (optional, but good practice)
    if (selectedInputDevice) {
        selectedInputDevice.onmidimessage = null;
        selectedInputDevice = null;
    }
    midiAccess = null;


    if (navigator.requestMIDIAccess) {
        console.log("MIDI Handler: Requesting MIDI access...");
        navigator.requestMIDIAccess({ sysex: false })
            .then(_onSuccess, _onFailure);
    } else {
        console.warn("MIDI Handler: Web MIDI API not supported in this browser.");
        if (onStateChangeCallback) {
            onStateChangeCallback({
                status: 'unsupported',
                message: 'Web MIDI API is not supported in this browser.',
                devices: [],
                selectedDeviceId: null
            });
        }
    }
}

/**
 * Selects a specific MIDI input device to listen to.
 * Can be called manually to override auto-selection.
 * @param {string | null} deviceId - The ID of the device to select, or null to deselect.
 */
export function selectDevice(deviceId) {
    if (!midiAccess) {
        console.error("MIDI Handler: Cannot select device, MIDI access not available.");
        return;
    }

    // Deselect previous device if any
    if (selectedInputDevice && selectedInputDevice.id !== deviceId) { // Avoid detaching if re-selecting same device
        console.log(`MIDI Handler: Deselecting previous device "${selectedInputDevice.name}" (id: ${selectedInputDevice.id}).`);
        selectedInputDevice.onmidimessage = null; // IMPORTANT: Remove listener
        selectedInputDevice = null;
    }

    // If null is passed or the device is already deselected, just ensure state is clean and notify
    if (!deviceId) {
        if (selectedInputDevice) { // If it wasn't null before
             selectedInputDevice.onmidimessage = null;
             selectedInputDevice = null;
             console.log("MIDI Handler: Device deselected.");
        }
       // Notify UI about the change in selection
        _listInputsAndNotify();
        return;
    }

    // Avoid re-attaching listener if the device is already selected
    if (selectedInputDevice && selectedInputDevice.id === deviceId) {
        console.log(`MIDI Handler: Device "${selectedInputDevice.name}" is already selected.`);
         _listInputsAndNotify(); // Still notify to update potential message changes
        return;
    }

    // Find and select the new device
    const newDevice = midiAccess.inputs.get(deviceId);
    if (newDevice && (newDevice.connection === 'open' || newDevice.state === 'connected')) {
        selectedInputDevice = newDevice;
        selectedInputDevice.onmidimessage = _handleMidiMessage; // Attach the handler
        console.log(`MIDI Handler: Selected device "${selectedInputDevice.name}" (id: ${selectedInputDevice.id}). Listening for messages...`);
    } else {
         selectedInputDevice = null; // Ensure selection is cleared if device not found/valid
        console.error(`MIDI Handler: Could not find or connect to MIDI input device with ID "${deviceId}". It might be disconnected or in a pending state.`);
    }

    // Notify UI about the (potentially changed) selection state
    _listInputsAndNotify();
}

/**
 * Gets the ID of the currently selected device.
 * @returns {string | null} The ID of the selected device, or null if none selected.
 */
export function getSelectedDeviceId() {
    return selectedInputDevice ? selectedInputDevice.id : null;
}

/**
 * Checks if auto-connect is currently enabled.
 * @returns {boolean}
 */
export function isAutoConnectEnabled() {
    return enableAutoConnect;
}


// --- END OF FILE midiHandler.js ---