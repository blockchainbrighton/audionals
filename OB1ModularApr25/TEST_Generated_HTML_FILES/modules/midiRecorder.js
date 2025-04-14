// --- START OF FILE midiRecorder.js ---

import { createElement } from './utils.js'; // Assuming utils.js is accessible

// --- Module State ---
let audioProcRef = null; // Reference to the main audioProcessor module
let isArmedForRecording = false; // NEW: Flag for standby state
let isRecording = false;         // Flag for active recording (after first note)
let isPlaying = false;
let recordedEvents = [];
let recordingStartTime = 0;      // Timestamp of the *first* recorded note
let playbackTimeoutIds = []; // To store setTimeout IDs for cancellation
let uiPanel = null;       // Reference to the main UI panel element
let recordButton, playButton, stopButton, saveButton, loadButton, statusIndicator; // UI Elements
let isUIVisible = false;

// --- Constants ---
const FORMAT_VERSION = "1.0";
const PANEL_ID = 'midi-recorder-panel';

// --- UI Creation & Management ---

/** Creates the recorder UI panel and its elements */
function _createUIPanel() {
    // Panel Styling (simple example)
    const panelStyle = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(40, 40, 40, 0.9);
        border: 1px solid #555;
        border-radius: 5px;
        padding: 10px 15px; /* Adjusted padding */
        z-index: 1000;
        /* Use flex column for layout */
        display: flex;
        flex-direction: column; /* Stack elements vertically */
        align-items: center;    /* Center items horizontally */
        gap: 8px;              /* Space between rows */
        visibility: hidden; /* Start hidden */
        opacity: 0;
        transition: visibility 0s 0.2s, opacity 0.2s ease-in-out;
        color: #ccc;
        font-size: 0.9em;
    `;
     const buttonRowStyle = `
        display: flex;
        gap: 10px;
        width: 100%; /* Make button row take full width */
        justify-content: center; /* Center buttons within the row */
    `;
    const buttonStyle = `
        padding: 5px 10px;
        cursor: pointer;
        min-width: 70px; /* Give buttons some minimum width */
        text-align: center;
        background-color: #333;
        border: 1px solid #555;
        color: #ddd;
        border-radius: 3px;
    `;
     const statusStyle = `
        min-height: 1.2em; /* Prevent layout shift */
        font-style: italic;
        color: #aaa;
        text-align: center;
        width: 100%;
     `;

    uiPanel = createElement('div', { id: PANEL_ID, style: panelStyle });

    // Create elements
    statusIndicator = createElement('span', { style: statusStyle, textContent: 'Idle' });
    const buttonRow = createElement('div', { style: buttonRowStyle }); // Container for buttons

    recordButton = createElement('button', { style: buttonStyle, textContent: 'Record' });
    playButton = createElement('button', { style: buttonStyle, textContent: 'Play' });
    stopButton = createElement('button', { style: buttonStyle, textContent: 'Stop', disabled: true }); // Initially disabled
    saveButton = createElement('button', { style: buttonStyle, textContent: 'Save' }); // Shortened text
    loadButton = createElement('button', { style: buttonStyle, textContent: 'Load' }); // Shortened text

    // Add Listeners
    recordButton.addEventListener('click', () => {
        if (!isArmedForRecording && !isRecording) {
            armRecording(); // Arm instead of starting directly
        } else {
            stopRecording(); // Stop recording (or cancel arming) uses the same button
        }
    });

    playButton.addEventListener('click', () => {
        if (!isPlaying) {
            startPlayback();
        }
        _updateUIState(); // startPlayback calls _updateUIState, redundant here? Kept for safety.
    });

    stopButton.addEventListener('click', () => {
        // Stop cancels arming, stops recording, or stops playback
        if (isArmedForRecording) cancelArming();
        if (isRecording) stopRecording();
        if (isPlaying) stopPlayback();
        // _updateUIState() is called within the specific stop functions
    });

    saveButton.addEventListener('click', saveRecording);
    loadButton.addEventListener('click', loadRecording);

    // Append elements
    buttonRow.append(recordButton, playButton, stopButton, saveButton, loadButton);
    uiPanel.append(statusIndicator, buttonRow); // Status first, then button row
    document.body.appendChild(uiPanel);

    _updateUIState(); // Set initial button states/status
}

/** Updates button text, disabled states, and status indicator based on current module state */
function _updateUIState() {
    if (!uiPanel) return;

    let statusText = 'Idle';
    let recButtonText = 'Record';
    let recButtonColor = ''; // Default background
    let stopEnabled = false;
    let playSaveEnabled = recordedEvents.length > 0; // Can only play/save if there are events
    let loadEnabled = true;

    if (isArmedForRecording) {
        statusText = 'Armed (Waiting for first note...)';
        recButtonText = 'Cancel Arm';
        recButtonColor = '#d08770'; // Orange-ish color for armed state
        stopEnabled = true; // Stop button cancels arming
        playSaveEnabled = false; // Cannot play/save while armed
        loadEnabled = false; // Cannot load while armed
    } else if (isRecording) {
        statusText = 'Recording...';
        recButtonText = 'Stop';
        recButtonColor = '#bf616a'; // Red-ish color for recording state
        stopEnabled = true; // Stop button stops recording
        playSaveEnabled = false; // Cannot play/save while recording
        loadEnabled = false; // Cannot load while recording
    } else if (isPlaying) {
        statusText = 'Playing...';
        recButtonText = 'Record'; // Can't record while playing
        stopEnabled = true; // Stop button stops playback
        playSaveEnabled = false; // Can't play/save again while playing
        loadEnabled = false; // Can't load while playing
    } else {
         // Idle state
         statusText = recordedEvents.length > 0 ? `Ready (${recordedEvents.length} events)` : 'Idle';
         // playSaveEnabled determined above based on recordedEvents.length
    }


    statusIndicator.textContent = statusText;
    recordButton.textContent = recButtonText;
    recordButton.style.backgroundColor = recButtonColor; // Apply specific color or default
    recordButton.disabled = isPlaying; // Can't press Record/Cancel/Stop while playing

    stopButton.disabled = !stopEnabled;
    playButton.disabled = !playSaveEnabled || isArmedForRecording || isRecording || isPlaying;
    saveButton.disabled = !playSaveEnabled || isArmedForRecording || isRecording || isPlaying;
    loadButton.disabled = !loadEnabled || isArmedForRecording || isRecording || isPlaying;

    // Reset record button color if not armed/recording
    if (!isArmedForRecording && !isRecording) {
         recordButton.style.backgroundColor = ''; // Revert to default CSS background
    }
}


/** Toggles the visibility of the UI panel */
function toggleUI() {
    if (!uiPanel) _createUIPanel(); // Create if it doesn't exist yet

    isUIVisible = !isUIVisible;
    if (isUIVisible) {
        uiPanel.style.visibility = 'visible';
        uiPanel.style.opacity = '1';
        uiPanel.style.transitionDelay = '0s'; // Show immediately
    } else {
        uiPanel.style.opacity = '0';
        uiPanel.style.visibility = 'hidden';
        uiPanel.style.transitionDelay = '0s, 0.2s'; // Hide visibility after opacity transition
    }
     console.log(`MIDI Recorder UI ${isUIVisible ? 'shown' : 'hidden'}.`);
}


// --- Recording Logic ---

/** Puts the recorder into standby mode, waiting for the first note. */
function armRecording() {
    if (isArmedForRecording || isRecording || isPlaying) return;

    isArmedForRecording = true;
    isRecording = false;       // Ensure not actively recording yet
    recordedEvents = [];       // Clear previous recording
    recordingStartTime = 0;    // Reset start time, will be set on first note
    console.log("MIDI Recorder: Armed for recording. Waiting for first note...");
    _updateUIState();
}

/** Cancels the armed state without recording anything. */
function cancelArming() {
     if (!isArmedForRecording) return;
     isArmedForRecording = false;
     console.log("MIDI Recorder: Recording arm cancelled.");
     _updateUIState();
}

/** Stops the current MIDI recording */
function stopRecording() {
    // This function now stops EITHER active recording OR cancels arming
    if (!isRecording && !isArmedForRecording) return;

    const wasRecording = isRecording; // Check if we actually recorded anything
    const wasArmed = isArmedForRecording;

    isRecording = false;
    isArmedForRecording = false;

    if (wasRecording) {
        // Calculate duration based on the time since the *first* note
        const duration = (recordedEvents.length > 0)
             ? (recordedEvents[recordedEvents.length - 1].time / 1000) // Time of last event
             : 0;
        console.log(`MIDI Recorder: Recording stopped. Recorded ${recordedEvents.length} events over ~${duration.toFixed(2)}s.`);
    } else if (wasArmed) {
         console.log("MIDI Recorder: Recording arm cancelled via Stop button.");
    }
     recordingStartTime = 0; // Reset start time
    _updateUIState();
}

/** Handles an incoming MIDI event (called externally by main.js) */
export function handleMidiEvent(type, note, velocity, timestamp) {
    // Ignore if not armed or already recording
    if (!isArmedForRecording && !isRecording) return;

    // --- Start recording on the first valid note event when armed ---
    if (isArmedForRecording && type === 'noteon' && velocity > 0) {
        isArmedForRecording = false; // No longer just armed
        isRecording = true;          // Now actively recording
        recordingStartTime = timestamp; // Set the start time to this event's timestamp
        console.log("MIDI Recorder: First note received. Recording active.");

        // Record the first event with time = 0
        recordedEvents.push({ type, time: 0, note, velocity });
        _updateUIState(); // Update UI to "Recording..." state
        return; // Don't process further in this call for the first note
    }

    // --- Record subsequent events if already recording ---
    if (isRecording) {
        // Calculate time relative to the *first* note's timestamp
        const relativeTime = Math.max(0, timestamp - recordingStartTime); // Ensure non-negative time
        recordedEvents.push({ type, time: relativeTime, note, velocity });
        // Optional: Log subsequent events
        // console.log('Rec:', { type, time: relativeTime, note, velocity });
    }
}

// --- Playback Logic --- (Remains the same as before)

/** Starts playback of the recorded events */
function startPlayback() {
    if (isPlaying || isRecording || isArmedForRecording || recordedEvents.length === 0) return; // Added check for armed state
    if (!audioProcRef || typeof audioProcRef.playSampleAtRate !== 'function' || typeof audioProcRef.getPlaybackRateForNote !== 'function') { // Added check for getPlaybackRateForNote
        console.error("MIDI Recorder: Cannot play, audioProcessor reference or required methods are invalid.");
        return;
    }

    stopPlayback(); // Clear any previous playback timeouts just in case
    isPlaying = true;
    // const playbackStartTime = Date.now(); // Not strictly needed for scheduling logic
    console.log(`MIDI Recorder: Starting playback of ${recordedEvents.length} events.`);

    let eventsPlayed = 0;
    // let lastTimeoutId = null; // Not currently used

    recordedEvents.forEach(event => {
        const scheduledPlayTime = event.time; // Time offset from start of *recording* (first note)

        const timeoutId = setTimeout(() => { // Removed async as playSampleAtRate is not awaited
            try {
                // We only directly trigger 'noteon' events for playback in this simple model
                if (event.type === 'noteon' && event.velocity > 0) {
                     // Use the audio processor's ability to play a note at a specific *rate*
                     // derived from the MIDI note number.
                     const rate = audioProcRef.getPlaybackRateForNote(event.note);
                     if (rate !== undefined) {
                         // We don't await this, playback should trigger sounds immediately
                         audioProcRef.playSampleAtRate(rate, event.velocity);
                     } else {
                         console.warn(`MIDI Recorder Playback: No playback rate found for note ${event.note}`);
                     }
                }
                // Note Off events are currently ignored in playback, the sample plays fully.

                // Remove the timeout ID from the list once it has executed
                const index = playbackTimeoutIds.indexOf(timeoutId);
                if (index > -1) {
                    playbackTimeoutIds.splice(index, 1);
                }

                eventsPlayed++;
                // Check if this is the last event *and* all timeouts have been cleared/fired
                if (eventsPlayed === recordedEvents.length && playbackTimeoutIds.length === 0) {
                    console.log("MIDI Recorder: Playback finished.");
                    // Automatically stop playback state after the last event has fired
                    // Ensure isPlaying is still true before calling stopPlayback,
                    // in case the user manually stopped it mid-playback.
                    if (isPlaying) {
                        stopPlayback(); // Cleans up state and UI
                    }
                }

            } catch (err) {
                console.error("MIDI Recorder: Error during scheduled playback:", err);
                 // Ensure state is cleaned up even if an error occurs mid-playback
                 if (isPlaying) {
                     stopPlayback(); // Stop if errors occur
                 }
            }
        }, scheduledPlayTime); // Schedule based on the event's relative time

        playbackTimeoutIds.push(timeoutId);
        // lastTimeoutId = timeoutId; // Keep track of the last scheduled event's ID (still not used)
    });

    _updateUIState();
}


/** Stops the current playback */
function stopPlayback() {
    if (!isPlaying && playbackTimeoutIds.length === 0) return; // Only act if playing or timeouts exist

    console.log("MIDI Recorder: Stopping playback.");
    isPlaying = false; // Set state immediately
    playbackTimeoutIds.forEach(clearTimeout); // Clear all scheduled timeouts
    playbackTimeoutIds = []; // Reset the array
    _updateUIState(); // Update UI immediately after stopping
}

// --- File Handling --- (Remains the same as before)

/** Saves the current recording as a JSON file */
function saveRecording() {
    if (recordedEvents.length === 0) {
        alert("No MIDI data recorded to save.");
        return;
    }
     if (isArmedForRecording || isRecording || isPlaying) { // Prevent saving while busy
         alert("Cannot save while recording, armed, or playing.");
         return;
     }

    const recordingData = {
        formatVersion: FORMAT_VERSION,
        events: recordedEvents
    };

    const jsonData = JSON.stringify(recordingData, null, 2); // Pretty print JSON
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = createElement('a', {
        href: url,
        download: `midi_recording_${Date.now()}.json` // Generate filename
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up

    console.log("MIDI Recorder: Recording saved to JSON.");
}

/** Loads a recording from a user-selected JSON file */
function loadRecording() {
     if (isArmedForRecording || isRecording || isPlaying) { // Prevent loading while busy
         alert("Cannot load while recording, armed, or playing.");
         return;
     }
    const input = createElement('input', { type: 'file', accept: '.json,application/json' });

    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const loadedData = JSON.parse(content);

                // --- Basic Validation ---
                if (!loadedData || typeof loadedData !== 'object') {
                    throw new Error("Invalid file content: Not a JSON object.");
                }
                if (loadedData.formatVersion !== FORMAT_VERSION) {
                     // Allow loading older versions with a warning, or reject
                     console.warn(`Warning: Loading recording with format version ${loadedData.formatVersion}, expected ${FORMAT_VERSION}. Compatibility not guaranteed.`);
                     // Or: throw new Error(`Incompatible format version: ${loadedData.formatVersion}`);
                }
                 if (!Array.isArray(loadedData.events)) {
                     throw new Error("Invalid format: Missing or non-array 'events' property.");
                 }
                 // Optional: Further validation - check if first event has time 0? Check event types?

                 // --- Normalize Timestamps (Ensure first event is at time 0) ---
                 if (loadedData.events.length > 0) {
                     const firstEventTime = loadedData.events[0].time || 0;
                     if (firstEventTime !== 0) {
                         console.warn(`MIDI Recorder: First event in loaded file has non-zero time (${firstEventTime}ms). Normalizing.`);
                         for (let i = 0; i < loadedData.events.length; i++) {
                             loadedData.events[i].time = Math.max(0, loadedData.events[i].time - firstEventTime);
                         }
                     }
                 }
                 // --------------------------------------------------------------


                recordedEvents = loadedData.events;
                console.log(`MIDI Recorder: Successfully loaded ${recordedEvents.length} events from ${file.name}.`);
                alert(`Loaded ${recordedEvents.length} events.`);
                // No need to call stopRecording/stopPlayback as we already checked we are idle
                _updateUIState(); // Update UI to enable Play/Save

            } catch (error) {
                console.error("MIDI Recorder: Error loading or parsing JSON file:", error);
                alert(`Error loading file: ${error.message}`);
                 recordedEvents = []; // Clear potentially corrupt data
                 _updateUIState();
            }
        };
        reader.onerror = (e) => {
             console.error("MIDI Recorder: Error reading file:", e);
             alert("Error reading file.");
        };
        reader.readAsText(file); // Read file as text
    };

    input.click(); // Trigger the file selection dialog
}


// --- Public API ---

/**
 * Initializes the MIDI Recorder module.
 * @param {object} audioProcessorReference - A reference to the initialized audioProcessor module.
 */
export function init(audioProcessorReference) {
    // Check for necessary methods on the audio processor reference
    if (!audioProcessorReference ||
        typeof audioProcessorReference.playSampleAtRate !== 'function' ||
        typeof audioProcessorReference.getPlaybackRateForNote !== 'function') {
        console.error("MIDI Recorder Init Error: Invalid audioProcessor reference or missing required methods (playSampleAtRate, getPlaybackRateForNote).");
        return;
    }
    audioProcRef = audioProcessorReference;
    _createUIPanel(); // Create the UI elements
    console.log("MIDI Recorder Initialized.");
}

// Export toggleUI for external triggering (e.g., by 'K' key in main.js)
export { toggleUI };

// --- END OF FILE midiRecorder.js ---