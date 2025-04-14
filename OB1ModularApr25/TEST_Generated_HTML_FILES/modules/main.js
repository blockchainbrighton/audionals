// --- START OF FILE main.js ---
console.log("--- main.js evaluating ---");

// --- Module Imports ---
import * as audio from './audioProcessor.js';        // Handles audio logic
import * as ui from './uiUpdater.js';                // Updates UI elements
import * as midiHandler from './midiHandler.js';     // Handles MIDI input
import * as keyboardShortcuts from './keyboardShortcuts.js'; // Handles keyboard commands
import { initReferencePanel } from './referenceDisplay.js'; // Populates the info panel
import { clamp, _isInputFocused, addListener, createElement } from './utils.js'; // Utility functions

// --- Constants ---
const DEFAULT_TEMPO = 78; // Default tempo if slider value is invalid

// --- DOM Element References ---
// Use querySelector for robustness if IDs might change, but getElementById is faster
const appContainer = document.getElementById('app'); // Main container (needed for fallback errors)
const mainImage = document.getElementById('main-image');
const playOnceBtn = document.getElementById('play-once-btn');
const loopToggleBtn = document.getElementById('loop-toggle-btn');
const reverseToggleBtn = document.getElementById('reverse-toggle-btn');
const tempoSlider = document.getElementById('tempo-slider');
const pitchSlider = document.getElementById('pitch-slider'); // Controls GLOBAL pitch
const volumeSlider = document.getElementById('volume-slider');
const multiplierSlider = document.getElementById('multiplier-slider');
const controlsContainer = document.getElementById('controls-container'); // For enabling/disabling group
const infoToggleBtn = document.getElementById('info-toggle-btn');
const referencePanel = document.getElementById('reference-panel');
const errorMessageDiv = document.getElementById('error-message');
const midiDeviceSelect = document.getElementById('midi-device-select');
const midiStatusSpan = document.getElementById('midi-status');
// Column References (Used for toggling visibility)
const controlsColumn = document.querySelector('.controls-column');
const referenceColumn = document.querySelector('.reference-column');

// --- Early DOM Element Checks ---
// Check critical elements required for core functionality or layout
const criticalElements = {
    appContainer, controlsContainer, errorMessageDiv, mainImage,
    controlsColumn, // Needed for layout toggling
    // Sliders/buttons are important, but init handles their absence somewhat
};
for (const [name, element] of Object.entries(criticalElements)) {
    if (!element) {
        console.error(`CRITICAL Error: UI element "${name}" not found. Application cannot initialize correctly.`);
        // Display a fatal error message if possible
        const fallbackContainer = document.getElementById('app') || document.body;
        fallbackContainer.innerHTML = `<p style="color:red; padding:20px;">Fatal Error: Required UI element "${name}" missing.</p>`;
        // Prevent further execution by throwing an error
        throw new Error(`Missing critical UI element: ${name}`);
    }
}
// Warn about non-critical missing elements
if (!referenceColumn) console.warn("Reference column element missing (Info panel might not work).");
if (!referencePanel) console.warn("Reference panel content area missing.");
if (!midiDeviceSelect || !midiStatusSpan) console.warn("MIDI UI elements missing (MIDI controls unavailable).");


// --- Helper Function for Data Validation/Formatting (Simplified) ---
function validateAndFormatDataSource(data, prefix, name) {
    if (typeof data === 'undefined' || !data || (typeof data === 'string' && data.startsWith("/*"))) {
        throw new Error(`Required data variable "${name}" is missing or invalid.`);
    }
    // Assume data URI prefix is needed if not already present
    return (typeof data === 'string' && data.startsWith('data:')) ? data : `${prefix}${data}`;
}

// --- Helper Function for Slider Input Handling ---
function handleSliderInput(event, audioSetter, uiUpdater, parser = parseFloat) {
    const slider = event.target;
    // Defensive check for slider properties
    if (!slider?.value || slider.min === undefined || slider.max === undefined) {
        console.error(`Slider element or its properties missing for event target:`, slider);
        return;
    }
    try {
        const rawValue = parser(slider.value);
        const min = parser(slider.min);
        const max = parser(slider.max);
        // Ensure parsing was successful before clamping/using
        if (isNaN(rawValue) || isNaN(min) || isNaN(max)) {
            console.error(`Failed to parse value/min/max for slider #${slider.id}. Value: ${slider.value}, Min: ${slider.min}, Max: ${slider.max}`);
            return;
        }

        const clampedValue = clamp(rawValue, min, max);

        // Call audio and UI updates if functions are valid
        if (typeof audioSetter === 'function') {
            audioSetter(clampedValue);
        } else {
            console.error(`Invalid audioSetter provided for slider #${slider.id}`);
        }
        if (typeof uiUpdater === 'function') {
            uiUpdater(clampedValue);
        } else {
            console.error(`Invalid uiUpdater provided for slider #${slider.id}`);
        }
    } catch (error) {
        console.error(`Error handling slider input for #${slider.id}:`, error);
        ui.showError("Error processing control input.");
    }
}

// --- Shared Async Helper for Loop Toggle ---
async function handleLoopToggle() {
    const wasLooping = audio.getLoopingState();
    console.log(`Main: Toggling loop. Current state: ${wasLooping ? 'On' : 'Off'}`);
    let success = false;
    try {
        // Ensure context is active before attempting start/stop
        await audio.resumeContext(); // Returns promise, throws on failure to resume

        if (wasLooping) {
            audio.stopLoop();
        } else {
            await audio.startLoop(); // startLoop internally calls resumeContext too, but explicit call is fine
        }
        success = true;
    } catch (err) {
        const errorMessage = err?.message || "Unknown error during loop toggle";
        ui.showError(`Could not toggle loop: ${errorMessage}`);
        console.error("Main: Error toggling loop:", err);
    } finally {
        // Always update UI based on the *actual* state after attempt
        const newState = audio.getLoopingState();
        ui.updateLoopButton(newState);
         console.log(`Main: Loop toggle finished. New state: ${newState ? 'On' : 'Off'}`);
    }
}

// --- Toggle Function for Side Columns (Controls/Reference) ---
function toggleSideColumns() {
    // Assumes controlsColumn and referenceColumn are valid due to initial checks
    controlsColumn.classList.toggle('hidden');
    // Only toggle reference if it exists
    if (referenceColumn) {
        referenceColumn.classList.toggle('hidden');
    }
    const areHidden = controlsColumn.classList.contains('hidden');
    console.log(`Side columns toggled via function. Now hidden: ${areHidden}`);
}

// --- MIDI Callback Functions ---

function handleNoteOn(noteNumber, velocity) {
    // console.log(`Main: Received Note On - Note=${noteNumber}, Vel=${velocity}`);
    const playbackRate = audio.getPlaybackRateForNote(noteNumber);
    if (playbackRate !== undefined) {
        audio.playSampleAtRate(playbackRate, velocity)
            .catch(err => console.error("Main: Error playing sample via MIDI", err));
    }
}

function handleNoteOff(noteNumber, velocity) {
    // console.log(`Main: Received Note Off - Note=${noteNumber}, Vel=${velocity}`);
    // Placeholder: audio.stopNote(noteNumber);
}

function handleMidiStateChange(state) {
    console.log("Main: MIDI State Change Received:", state);
    if (!midiDeviceSelect || !midiStatusSpan) {
        console.error("Main: Cannot update MIDI UI, elements missing.");
        return;
    }

    // Update Status Span
    midiStatusSpan.textContent = state.message || state.status;
    midiStatusSpan.style.color = (state.status === 'error' || state.status === 'unsupported') ? 'var(--error-color)' : '';

    // Update Select Dropdown
    midiDeviceSelect.innerHTML = ''; // Clear previous options
    let placeholderText = '-- MIDI Unavailable --'; // Default placeholder

    // --- Create and Append Placeholder FIRST ---
    const placeholderOption = createElement('option', { value: '', textContent: placeholderText });
    midiDeviceSelect.appendChild(placeholderOption); // Append it

    if (state.status === 'ready') {
        if (state.devices.length > 0) {
            midiDeviceSelect.disabled = false;
            placeholderOption.textContent = '-- Select MIDI Device --'; // Update placeholder text

            // --- Add device options AFTER placeholder ---
            state.devices.forEach(device => {
                // Create the option element
                const option = createElement('option', { value: device.id, textContent: device.name });
                // Append it to the select element
                midiDeviceSelect.appendChild(option);
            });
        } else {
            midiDeviceSelect.disabled = true;
            placeholderOption.textContent = '-- No MIDI Inputs --';
        }
    } else { // Error, unsupported, unavailable etc.
        midiDeviceSelect.disabled = true;
        placeholderOption.textContent = state.message || `-- ${state.status} --`; // More specific message if available
    }

    // Ensure placeholder is selected initially (or the first device if preferred)
    midiDeviceSelect.value = '';
}

// --- Application Initialization ---
async function initializeApp() {
    console.log("Initializing application...");
    ui.clearError(); // Clear errors from previous load attempts

    // 1. Pass Controls Container Reference to UI Updater
    if (ui.setControlsContainer) {
        ui.setControlsContainer(controlsContainer);
    } else {
        console.warn("ui.setControlsContainer function not found.");
    }

    // 2. Validate Input Data & Set Image Source
    let imageSrc, audioSource;
    try {
        const imageData = typeof imageBase64 !== 'undefined' ? imageBase64 : undefined;
        const audioData = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : undefined;
        imageSrc = validateAndFormatDataSource(imageData, 'data:image/jpeg;base64,', 'imageBase64');
        audioSource = validateAndFormatDataSource(audioData, 'data:audio/opus;base64,', 'audioBase64_Opus');
        ui.setImageSource(imageSrc); // Set image early
    } catch (error) {
        ui.showError(`Initialization failed: ${error.message}`);
        console.error("Data validation error:", error);
        ui.disableControls(); // Keep controls disabled
        return; // Stop initialization
    }

    // 3. Get Initial Tempo/Pitch from Sliders (with Defaults)
    let initialTempo = DEFAULT_TEMPO;
    let initialGlobalPitch = 1.0;
    try {
        if (tempoSlider) initialTempo = clamp(parseInt(tempoSlider.value, 10) || DEFAULT_TEMPO, parseInt(tempoSlider.min, 10) || 1, parseInt(tempoSlider.max, 10) || MAX_TEMPO);
        if (pitchSlider) initialGlobalPitch = clamp(parseFloat(pitchSlider.value) || 1.0, parseFloat(pitchSlider.min) || MIN_PITCH, parseFloat(pitchSlider.max) || MAX_PITCH);
        // Correct slider visuals if clamping occurred
        if (tempoSlider) tempoSlider.value = initialTempo;
        if (pitchSlider) pitchSlider.value = initialGlobalPitch;
    } catch (e) {
        console.warn("Error reading initial slider values:", e);
        // Proceed with defaults
    }
    console.log(`Using initial Tempo: ${initialTempo}, Global Pitch: ${initialGlobalPitch.toFixed(2)}`);

    // 4. Initialize MIDI System
    console.log("Initializing MIDI Handler...");
    midiHandler.init(handleNoteOn, handleNoteOff, handleMidiStateChange); // Setup callbacks

    // 5. Initialize Audio Processor
    console.log("Initializing Audio Processor...");
    const audioReady = await audio.init(audioSource, initialTempo, initialGlobalPitch);

    if (!audioReady) {
        // Error should have been shown by audio.init()
        console.error("Audio initialization failed. Controls remain disabled.");
        ui.disableControls(); // Ensure controls stay disabled
        return; // Stop initialization
    }

    // 6. Setup Post-Audio Initialization Steps
    console.log("Audio ready. Finalizing setup...");
    setupEventListeners(); // Attach listeners to controls

    // Initialize Reference Panel Content (Best effort)
    if (referencePanel && initReferencePanel) {
        initReferencePanel(referencePanel);
        console.log("Reference panel content initialized.");
    } else {
        console.warn("Reference panel or init function missing.");
    }

    // Initialize Keyboard Shortcuts (Requires sliders)
    if (keyboardShortcuts.init && tempoSlider && pitchSlider && volumeSlider && multiplierSlider) {
        keyboardShortcuts.init({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider });
    } else {
        console.error("Cannot initialize keyboard shortcuts: Function or slider elements missing.");
    }

    // 7. Set Initial UI Values based on actual state
    console.groupCollapsed("Setting Initial UI Values");
    try {
        ui.updateTempoDisplay(initialTempo);
        ui.updatePitchDisplay(initialGlobalPitch); // Reflects global pitch
        if (volumeSlider) ui.updateVolumeDisplay(parseFloat(volumeSlider.value) || 1.0); // Use actual slider value

        const initialMultiplier = audio.getScheduleMultiplier();
        if (multiplierSlider) multiplierSlider.value = clamp(initialMultiplier, parseInt(multiplierSlider.min, 10) || 1, parseInt(multiplierSlider.max, 10) || MAX_MULTIPLIER);
        ui.updateScheduleMultiplierDisplay(initialMultiplier);

        ui.updateLoopButton(audio.getLoopingState());
        ui.updateReverseButton(audio.getReverseState());
        ui.enableControls(); // Enable UI now that everything is ready
    } catch (error) {
        console.error("Error setting initial UI values:", error);
        ui.showError("Problem setting initial control values.");
        ui.disableControls(); // Disable if UI update fails critically
    }
    console.groupEnd();

    console.log("Application initialized successfully.");
} // End of initializeApp

// --- Event Listener Setup ---
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // Playback Controls
    addListener(mainImage, 'click', handleLoopToggle, 'mainImage');
    addListener(playOnceBtn, 'click', () => audio.playOnce(), 'playOnceBtn');
    addListener(loopToggleBtn, 'click', handleLoopToggle, 'loopToggleBtn');
    addListener(reverseToggleBtn, 'click', () => {
        audio.resumeContext().then(() => { // Ensure context active before toggle
            const newState = audio.toggleReverse();
            ui.updateReverseButton(newState);
        }).catch(err => ui.showError(`Could not toggle reverse: ${err?.message || 'Unknown error'}`));
    }, 'reverseToggleBtn');

    // Slider Controls
    addListener(tempoSlider, 'input', (e) => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt), 'tempoSlider');
    // Ensure pitch slider controls the GLOBAL pitch
    addListener(pitchSlider, 'input', (e) => handleSliderInput(e, audio.setGlobalPitch, ui.updatePitchDisplay), 'pitchSlider');
    addListener(volumeSlider, 'input', (e) => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay), 'volumeSlider');
    addListener(multiplierSlider, 'input', (e) => handleSliderInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt), 'multiplierSlider');

    // MIDI Device Selection
    addListener(midiDeviceSelect, 'change', (event) => {
        midiHandler.selectDevice(event.target.value);
    }, 'midiDeviceSelect');

    // Info Panel Toggle Button
    addListener(infoToggleBtn, 'click', toggleSideColumns, 'infoToggleBtn');

    // Global Keydown Listener (Specific actions not covered by keyboardShortcuts module)
    window.addEventListener('keydown', (e) => {
        if (e.repeat || _isInputFocused(e.target)) return; // Ignore repeats and input focus

        const noModifiers = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;

        if (noModifiers) {
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    audio.playOnce();
                    break;
            }
             switch (e.key.toLowerCase()){
                 case 'i':
                    e.preventDefault();
                    toggleSideColumns();
                    break;
                 case 'r':
                    e.preventDefault();
                    console.log("Reverse toggle requested via 'r' key");
                    audio.resumeContext().then(() => {
                        const newState = audio.toggleReverse();
                        ui.updateReverseButton(newState);
                    }).catch(err => ui.showError(`Could not toggle reverse: ${err?.message || 'Unknown error'}`));
                    break;
             }
        }
        // Other shortcuts are handled by keyboardShortcuts.js
    });

    console.log("Event listeners setup complete.");
}

// --- Start the Application ---
// Wait for the DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp(); // DOM already loaded
}

// --- END OF FILE main.js ---