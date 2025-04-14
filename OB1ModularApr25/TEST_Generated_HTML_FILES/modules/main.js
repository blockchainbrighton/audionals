// --- START OF FILE main.js ---
console.log("--- main.js evaluating ---");

// --- Module Imports ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import * as midiHandler from './midiHandler.js';
import * as keyboardShortcuts from './keyboardShortcuts.js';
import { initReferencePanel } from './referenceDisplay.js';
import { clamp, _isInputFocused, addListener, createElement } from './utils.js';
import * as midiRecorder from './midiRecorder.js';

// --- Constants ---
const DEFAULT_TEMPO = 78; // Default tempo if slider value is invalid or missing
const DEFAULT_PITCH = 1.0;
const DEFAULT_VOLUME = 1.0;
const MIN_TEMPO = 1;
const MAX_TEMPO = 400;
const MIN_PITCH = 0.01;
const MAX_PITCH = 10.0;
const MIN_VOLUME = 0.0;
const MAX_VOLUME = 1.5;
const MIN_MULTIPLIER = 1;
const MAX_MULTIPLIER = 8;


// --- DOM Element References (Checked during Initialization) ---
let appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
    tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
    controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
    midiDeviceSelect, midiStatusSpan, controlsColumn, referenceColumn;

/**
 * Finds and stores references to essential DOM elements.
 * @returns {boolean} True if all critical elements are found, false otherwise.
 */
function findElements() {
    appContainer = document.getElementById('app');
    mainImage = document.getElementById('main-image');
    playOnceBtn = document.getElementById('play-once-btn');
    loopToggleBtn = document.getElementById('loop-toggle-btn');
    reverseToggleBtn = document.getElementById('reverse-toggle-btn');
    tempoSlider = document.getElementById('tempo-slider');
    pitchSlider = document.getElementById('pitch-slider');
    volumeSlider = document.getElementById('volume-slider');
    multiplierSlider = document.getElementById('multiplier-slider');
    controlsContainer = document.getElementById('controls-container');
    infoToggleBtn = document.getElementById('info-toggle-btn');
    referencePanel = document.getElementById('reference-panel');
    errorMessageDiv = document.getElementById('error-message');
    midiDeviceSelect = document.getElementById('midi-device-select');
    midiStatusSpan = document.getElementById('midi-status');
    controlsColumn = document.querySelector('.controls-column');
    referenceColumn = document.querySelector('.reference-column');

    // Check critical elements
    const critical = { appContainer, controlsContainer, errorMessageDiv, mainImage, controlsColumn };
    for (const [name, element] of Object.entries(critical)) {
        if (!element) {
            console.error(`CRITICAL Error: UI element "${name}" not found. Application cannot initialize correctly.`);
            const fallbackContainer = document.getElementById('app') || document.body;
            fallbackContainer.innerHTML = `<p style="color:red; padding:20px;">Fatal Error: Required UI element "${name}" missing.</p>`;
            return false; // Indicate critical failure
        }
    }
    // Warn about non-critical
    if (!referenceColumn) console.warn("Reference column element missing.");
    if (!midiDeviceSelect || !midiStatusSpan) console.warn("MIDI UI elements missing.");
    // Add warnings for sliders/buttons if needed for debugging, though init handles nulls
    if (!tempoSlider || !pitchSlider || !volumeSlider || !multiplierSlider) console.warn("One or more sliders not found.");

    return true; // All critical elements found
}


// --- Helper Function for Data Validation ---
function validateAndFormatDataSource(data, prefix, name) {
    if (typeof data === 'undefined' || !data || (typeof data === 'string' && data.startsWith("/*"))) {
        throw new Error(`Required data variable "${name}" is missing or invalid.`);
    }
    return (typeof data === 'string' && data.startsWith('data:')) ? data : `${prefix}${data}`;
}

// --- Helper Function for Slider Input ---
// Handles direct user interaction with sliders
function handleSliderInput(event, audioSetter, uiUpdater, parser = parseFloat) {
    const slider = event.target;
    if (!slider?.value || slider.min === undefined || slider.max === undefined) return; // Basic guard

    try {
        const rawValue = parser(slider.value);
        const min = parser(slider.min);
        const max = parser(slider.max);
        if (isNaN(rawValue) || isNaN(min) || isNaN(max)) {
             console.error(`Failed to parse value/min/max for slider #${slider.id}.`);
             return;
        }
        const clampedValue = clamp(rawValue, min, max);

        // Update Audio Engine
        if (typeof audioSetter === 'function') audioSetter(clampedValue);
        else console.error(`Invalid audioSetter for slider #${slider.id}`);

        // Update UI Display Span
        if (typeof uiUpdater === 'function') uiUpdater(clampedValue);
        else console.error(`Invalid uiUpdater for slider #${slider.id}`);

    } catch (error) {
        console.error(`Error handling slider input for #${slider.id}:`, error);
        ui.showError("Error processing control input.");
    }
}

// --- Async Helper for Loop Toggle ---
async function handleLoopToggle() {
    const wasLooping = audio.getLoopingState();
    console.log(`Main: Toggling loop. Current state: ${wasLooping ? 'On' : 'Off'}`);
    try {
        await audio.resumeContext(); // Ensure context active
        if (wasLooping) audio.stopLoop();
        else await audio.startLoop();
    } catch (err) {
        ui.showError(`Could not toggle loop: ${err?.message || 'Unknown error'}`);
        console.error("Main: Error toggling loop:", err);
    } finally {
        ui.updateLoopButton(audio.getLoopingState()); // Update UI based on actual state
        console.log(`Main: Loop toggle finished. New state: ${audio.getLoopingState() ? 'On' : 'Off'}`);
    }
}

// --- Toggle Function for Side Columns ---
function toggleSideColumns() {
    if (!controlsColumn) return; // Guard against missing element
    controlsColumn.classList.toggle('hidden');
    if (referenceColumn) referenceColumn.classList.toggle('hidden');
    console.log(`Side columns toggled. Controls hidden: ${controlsColumn.classList.contains('hidden')}`);
}

// --- MIDI Callback Functions ---
function handleNoteOn(noteNumber, velocity) {
    const timestamp = Date.now(); // Get timestamp
    // Call audio playback as before
    const playbackRate = audio.getPlaybackRateForNote(noteNumber);
    if (playbackRate !== undefined) {
        audio.playSampleAtRate(playbackRate, velocity).catch(err => console.error("Error in playSampleAtRate:", err));
    }
    // Forward to recorder
    midiRecorder.handleMidiEvent('noteon', noteNumber, velocity, timestamp);
}

function handleNoteOff(noteNumber, velocity) {
    const timestamp = Date.now(); // Get timestamp
    // Optional: Add Note Off playback logic in audioProcessor if needed later
    // Forward to recorder
    midiRecorder.handleMidiEvent('noteoff', noteNumber, velocity, timestamp);
}

function handleMidiStateChange(state) {
    // console.log("Main: MIDI State Change:", state);
    if (!midiDeviceSelect || !midiStatusSpan) return;

    midiStatusSpan.textContent = state.message || state.status;
    midiStatusSpan.style.color = (state.status === 'error' || state.status === 'unsupported') ? 'var(--error-color)' : '';
    midiDeviceSelect.innerHTML = ''; // Clear
    let placeholderText = '-- MIDI Unavailable --';
    const placeholderOption = createElement('option', { value: '', textContent: placeholderText });
    midiDeviceSelect.appendChild(placeholderOption); // Add placeholder first

    if (state.status === 'ready' && state.devices.length > 0) {
        midiDeviceSelect.disabled = false;
        placeholderOption.textContent = '-- Select MIDI Device --';
        state.devices.forEach(device => {
            midiDeviceSelect.appendChild(createElement('option', { value: device.id, textContent: device.name }));
        });
    } else {
        midiDeviceSelect.disabled = true;
        if (state.status === 'ready') placeholderOption.textContent = '-- No MIDI Inputs --';
        else placeholderOption.textContent = state.message || `-- ${state.status} --`;
    }
    midiDeviceSelect.value = ''; // Select placeholder
}

// --- Application Initialization ---
async function initializeApp() {
    console.log("Initializing application...");

    // 0. Find DOM Elements First
    if (!findElements()) return; // Stop if critical elements are missing

    // 1. Initialize UI Updater (so it can find its elements)
    if (ui.init) ui.init();
    else console.error("CRITICAL: ui.init not found!");
    ui.clearError();

    // 2. Pass Controls Container Ref (Optional, as ui.init finds it too)
    // if (ui.setControlsContainer) ui.setControlsContainer(controlsContainer);

    // 3. Validate Input Data & Set Image
    let imageSrc, audioSource;
    try {
        const imageData = typeof imageBase64 !== 'undefined' ? imageBase64 : undefined;
        const audioData = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : undefined;
        imageSrc = validateAndFormatDataSource(imageData, 'data:image/jpeg;base64,', 'imageBase64');
        audioSource = validateAndFormatDataSource(audioData, 'data:audio/opus;base64,', 'audioBase64_Opus');
        ui.setImageSource(imageSrc);
    } catch (error) {
        ui.showError(`Initialization failed: ${error.message}`);
        console.error("Data validation error:", error);
        return;
    }

    // 4. Determine Initial Slider Values (with fallbacks)
    let initialTempo = DEFAULT_TEMPO;
    let initialGlobalPitch = DEFAULT_PITCH;
    let initialVolume = DEFAULT_VOLUME;
    let initialMultiplier = 1; // Default from controlsColumn
    try {
        if (tempoSlider) initialTempo = clamp(parseInt(tempoSlider.value, 10) || DEFAULT_TEMPO, MIN_TEMPO, MAX_TEMPO);
        if (pitchSlider) initialGlobalPitch = clamp(parseFloat(pitchSlider.value) || DEFAULT_PITCH, MIN_PITCH, MAX_PITCH);
        if (volumeSlider) initialVolume = clamp(parseFloat(volumeSlider.value) || DEFAULT_VOLUME, MIN_VOLUME, MAX_VOLUME);
        if (multiplierSlider) initialMultiplier = clamp(parseInt(multiplierSlider.value, 10) || 1, MIN_MULTIPLIER, MAX_MULTIPLIER);

        // Visually correct sliders if needed (important if initial HTML value was invalid)
        if (tempoSlider) tempoSlider.value = initialTempo;
        if (pitchSlider) pitchSlider.value = initialGlobalPitch;
        if (volumeSlider) volumeSlider.value = initialVolume;
        if (multiplierSlider) multiplierSlider.value = initialMultiplier;

    } catch (e) { console.warn("Error reading initial slider values:", e); }
    console.log(`Initial values - Tempo: ${initialTempo}, Pitch: ${initialGlobalPitch.toFixed(2)}, Volume: ${initialVolume.toFixed(2)}, Multiplier: ${initialMultiplier}`);

    // 5. Initialize MIDI System
    console.log("Initializing MIDI Handler...");
    midiHandler.init(handleNoteOn, handleNoteOff, handleMidiStateChange);

    // 6. Initialize Audio Processor
    console.log("Initializing Audio Processor...");
    const audioReady = await audio.init(audioSource, initialTempo, initialGlobalPitch);
    if (!audioReady) { /* Error already shown by audio.init */ return; }
     // Set initial volume in audio engine (init only sets tempo/pitch)
     audio.setVolume(initialVolume);

    // 6.5 Initialize MIDI Recorder
     console.log("Initializing MIDI Recorder...");
     midiRecorder.init(audio); // Pass the audio module reference

    // 7. Initialize Reference Panel Content
    if (referencePanel && initReferencePanel) {
        initReferencePanel(referencePanel);
        console.log("Reference panel content initialized.");
    }

    // 8. Initialize Keyboard Shortcuts
    // Must happen *after* audio is ready and sliders exist
    if (keyboardShortcuts.init && tempoSlider && pitchSlider && volumeSlider && multiplierSlider) {
        keyboardShortcuts.init({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider });
    } else {
        console.error("Cannot initialize keyboard shortcuts: Function or slider elements missing.");
    }

    // 9. Setup Event Listeners for UI Controls
    // Must happen *after* audio is ready so handlers can call audio functions
    setupEventListeners();

    // 10. Set Initial UI Display Values & Enable Controls
    // This ensures UI reflects the *actual* initial state after all setup
    console.groupCollapsed("Setting Initial UI Values");
    try {
        ui.updateTempoDisplay(initialTempo);
        ui.updatePitchDisplay(initialGlobalPitch);
        ui.updateVolumeDisplay(initialVolume);
        ui.updateScheduleMultiplierDisplay(initialMultiplier); // Use value read from slider
        ui.updateLoopButton(audio.getLoopingState());
        ui.updateReverseButton(audio.getReverseState());
        ui.enableControls(); // Enable UI now
    } catch (error) {
        console.error("Error setting initial UI values:", error);
        ui.showError("Problem setting initial control values.");
        ui.disableControls();
    }
    console.groupEnd();

    console.log("Application initialized successfully.");
} // End of initializeApp

// --- Event Listener Setup ---
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- Playback Controls ---
    addListener(mainImage, 'click', handleLoopToggle, 'mainImage');
    addListener(playOnceBtn, 'click', () => audio.playOnce(), 'playOnceBtn');
    addListener(loopToggleBtn, 'click', handleLoopToggle, 'loopToggleBtn');
    addListener(reverseToggleBtn, 'click', () => {
        audio.resumeContext()
            .then(() => ui.updateReverseButton(audio.toggleReverse())) // Update UI after toggle succeeds
            .catch(err => ui.showError(`Could not toggle reverse: ${err?.message || 'Unknown error'}`));
    }, 'reverseToggleBtn');

    // --- Slider Controls ---
    // Connect sliders directly to their respective audio setters and UI updaters
    addListener(tempoSlider, 'input', (e) => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt), 'tempoSlider');
    addListener(pitchSlider, 'input', (e) => handleSliderInput(e, audio.setGlobalPitch, ui.updatePitchDisplay), 'pitchSlider');
    addListener(volumeSlider, 'input', (e) => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay), 'volumeSlider');
    addListener(multiplierSlider, 'input', (e) => handleSliderInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt), 'multiplierSlider');

    // --- MIDI Device Selection ---
    addListener(midiDeviceSelect, 'change', (event) => {
        midiHandler.selectDevice(event.target.value);
    }, 'midiDeviceSelect');

    // --- Info Panel Toggle Button ---
    addListener(infoToggleBtn, 'click', toggleSideColumns, 'infoToggleBtn');

    // --- Global Keydown Listener (Main Actions) ---
    // Handles actions not covered by keyboardShortcuts module (Space, R, I)
    window.addEventListener('keydown', (e) => {
        if (e.repeat || _isInputFocused(e.target)) return; // Ignore repeats and input focus
    
        const noModifiers = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
    
        if (noModifiers) {
            let handled = false;
            switch (e.code) { // Use e.code for layout independence
                case 'Space': audio.playOnce(); handled = true; break;
            }
            switch (e.key.toLowerCase()) { // Use e.key for character keys
                case 'i': toggleSideColumns(); handled = true; break;
                case 'r':
    
                    audio.resumeContext()
                         .then(() => ui.updateReverseButton(audio.toggleReverse()))
                         .catch(err => ui.showError(`Could not toggle reverse: ${err?.message || 'Unknown error'}`));
                    handled = true;
                    break;
                case 'k': // <--- ADD THIS CASE
                    midiRecorder.toggleUI();
                    handled = true;
                    break;
            }
            if (handled) e.preventDefault();
        }
        // Note: Tempo, Pitch, Volume, Mute, Multiplier shortcuts are handled entirely by keyboardShortcuts.js
    });

    console.log("Event listeners setup complete.");
} // End of setupEventListeners

// --- Start the Application ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp(); // DOM already loaded and ready
}

// --- END OF FILE main.js ---