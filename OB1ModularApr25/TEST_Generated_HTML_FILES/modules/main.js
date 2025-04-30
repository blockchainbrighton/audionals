// --- START OF FILE main.js ---
console.log("--- main.js evaluating ---");

// --- Module Imports ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import * as midiHandler from './midiHandler.js'; // Enhanced version
import * as keyboardShortcuts from './keyboardShortcuts.js';
import { initReferencePanel } from './referenceDisplay.js';
import { clamp, _isInputFocused, addListener, createElement } from './utils.js';

// --- Constants ---
// ... (keep existing constants)
const DEFAULT_TEMPO = 78;
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
// ... (keep existing references)
let appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
    tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
    controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
    midiDeviceSelect, midiStatusSpan, controlsColumn, referenceColumn;

// ... (keep findElements function as is)
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

    const critical = { appContainer, controlsContainer, errorMessageDiv, mainImage, controlsColumn };
    for (const [name, element] of Object.entries(critical)) {
        if (!element) {
            console.error(`CRITICAL Error: UI element "${name}" not found. Application cannot initialize correctly.`);
            const fallbackContainer = document.getElementById('app') || document.body;
            fallbackContainer.innerHTML = `<p style="color:red; padding:20px;">Fatal Error: Required UI element "${name}" missing.</p>`;
            return false;
        }
    }
    if (!referenceColumn) console.warn("Reference column element missing.");
    if (!midiDeviceSelect || !midiStatusSpan) console.warn("MIDI UI elements missing.");
    if (!tempoSlider || !pitchSlider || !volumeSlider || !multiplierSlider) console.warn("One or more sliders not found.");

    return true;
}


// --- Helper Functions (keep validateAndFormatDataSource, handleSliderInput, handleLoopToggle, toggleSideColumns as is) ---
// ...
function validateAndFormatDataSource(data, prefix, name) {
    if (typeof data === 'undefined' || !data || (typeof data === 'string' && data.startsWith("/*"))) {
        throw new Error(`Required data variable "${name}" is missing or invalid.`);
    }
    return (typeof data === 'string' && data.startsWith('data:')) ? data : `${prefix}${data}`;
}

function handleSliderInput(event, audioSetter, uiUpdater, parser = parseFloat) {
    const slider = event.target;
    if (!slider?.value || slider.min === undefined || slider.max === undefined) return;

    try {
        const rawValue = parser(slider.value);
        const min = parser(slider.min);
        const max = parser(slider.max);
        if (isNaN(rawValue) || isNaN(min) || isNaN(max)) {
             console.error(`Failed to parse value/min/max for slider #${slider.id}.`);
             return;
        }
        const clampedValue = clamp(rawValue, min, max);
        if (typeof audioSetter === 'function') audioSetter(clampedValue);
        else console.error(`Invalid audioSetter for slider #${slider.id}`);
        if (typeof uiUpdater === 'function') uiUpdater(clampedValue);
        else console.error(`Invalid uiUpdater for slider #${slider.id}`);
    } catch (error) {
        console.error(`Error handling slider input for #${slider.id}:`, error);
        ui.showError("Error processing control input.");
    }
}

async function handleLoopToggle() {
    const wasLooping = audio.getLoopingState();
    console.log(`Main: Toggling loop. Current state: ${wasLooping ? 'On' : 'Off'}`);
    try {
        await audio.resumeContext();
        if (wasLooping) audio.stopLoop();
        else await audio.startLoop();
    } catch (err) {
        ui.showError(`Could not toggle loop: ${err?.message || 'Unknown error'}`);
        console.error("Main: Error toggling loop:", err);
    } finally {
        ui.updateLoopButton(audio.getLoopingState());
        console.log(`Main: Loop toggle finished. New state: ${audio.getLoopingState() ? 'On' : 'Off'}`);
    }
}

function toggleSideColumns() {
    if (!controlsColumn) return;
    controlsColumn.classList.toggle('hidden');
    if (referenceColumn) referenceColumn.classList.toggle('hidden');
    console.log(`Side columns toggled. Controls hidden: ${controlsColumn.classList.contains('hidden')}`);
}


// --- MIDI Callback Functions ---
function handleNoteOn(noteNumber, velocity) {
    const playbackRate = audio.getPlaybackRateForNote(noteNumber);
    if (playbackRate !== undefined) {
        audio.playSampleAtRate(playbackRate, velocity).catch(err => console.error("Error in playSampleAtRate:", err));
    }
}

function handleNoteOff(noteNumber, velocity) { /* Placeholder */ }

// --- MODIFIED MIDI State Change Handler ---
/**
 * Updates the MIDI status display and device selection dropdown based on MIDI handler state.
 * @param {object} state - The state object from midiHandler.
 * @param {string} state.status - 'ready', 'error', 'unsupported', 'unavailable'.
 * @param {string} state.message - A descriptive message.
 * @param {Array<object>} state.devices - List of available input devices [{id, name}].
 * @param {string | null} state.selectedDeviceId - The ID of the currently selected device, or null.
 */
function handleMidiStateChange(state) {
    // console.log("Main: MIDI State Change received:", state);
    if (!midiDeviceSelect || !midiStatusSpan) {
        console.warn("MIDI UI elements not found, cannot update state.");
        return;
    }

    // 1. Update Status Message
    midiStatusSpan.textContent = state.message || state.status;
    midiStatusSpan.style.color = (state.status === 'error' || state.status === 'unsupported' || state.status === 'unavailable')
        ? 'var(--error-color)'
        : ''; // Reset color otherwise

    // 2. Clear and Prepare Dropdown
    midiDeviceSelect.innerHTML = ''; // Clear existing options
    let placeholderText = '-- MIDI Unavailable --'; // Default placeholder
    const placeholderOption = createElement('option', { value: '', textContent: placeholderText });
    placeholderOption.disabled = true; // Make placeholder unselectable by default
    midiDeviceSelect.appendChild(placeholderOption);

    // 3. Handle different statuses
    if (state.status === 'ready') {
        if (state.devices.length > 0) {
            // Devices available
            midiDeviceSelect.disabled = false;
            placeholderOption.textContent = '-- Select MIDI Device --'; // More appropriate placeholder
             placeholderOption.disabled = false; // Allow selecting the placeholder to deselect

            // Populate with available devices
            state.devices.forEach(device => {
                const option = createElement('option', {
                    value: device.id,
                    textContent: device.name
                });
                midiDeviceSelect.appendChild(option);
            });

             // *** KEY CHANGE: Set the selected value based on the handler's state ***
             midiDeviceSelect.value = state.selectedDeviceId || ''; // Select the active device or the placeholder


             // Update status message if a device is selected
             if(state.selectedDeviceId){
                 const selectedDevice = state.devices.find(d => d.id === state.selectedDeviceId);
                 if(selectedDevice) {
                    midiStatusSpan.textContent = `Connected: ${selectedDevice.name}`;
                 } else {
                     // Should not happen if midiHandler state is consistent, but handle defensively
                     console.warn(`Selected device ID ${state.selectedDeviceId} not found in device list.`);
                     midiStatusSpan.textContent = `Selected device not found?`;
                     midiDeviceSelect.value = ''; // Fallback to placeholder
                 }
             } else {
                 // No device selected, use default ready message
                 midiStatusSpan.textContent = 'MIDI devices available.';
             }

        } else {
            // Ready, but no devices found
            midiDeviceSelect.disabled = true;
            placeholderOption.textContent = '-- No MIDI Inputs Found --';
            midiStatusSpan.textContent = 'MIDI ready, no devices detected.'; // More specific message
            midiDeviceSelect.value = ''; // Ensure placeholder is selected
        }
    } else {
        // Status is 'error', 'unsupported', or 'unavailable'
        midiDeviceSelect.disabled = true;
        // Use the message from the state object for the placeholder if meaningful
        placeholderOption.textContent = state.message || `-- ${state.status} --`;
        midiDeviceSelect.value = ''; // Ensure placeholder is selected
    }
} // --- End of handleMidiStateChange ---


// --- Application Initialization ---
async function initializeApp() {
    console.log("Initializing application...");

    // 0. Find DOM Elements First
    if (!findElements()) return;

    // 1. Initialize UI Updater
    if (ui.init) ui.init();
    else console.error("CRITICAL: ui.init not found!");
    ui.clearError();

    // 2. Validate Input Data & Set Image
    // ... (keep existing data validation and image setting logic)
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

    // 3. Determine Initial Slider Values
    // ... (keep existing slider value reading logic)
    let initialTempo = DEFAULT_TEMPO;
    let initialGlobalPitch = DEFAULT_PITCH;
    let initialVolume = DEFAULT_VOLUME;
    let initialMultiplier = 1;
    try {
        if (tempoSlider) initialTempo = clamp(parseInt(tempoSlider.value, 10) || DEFAULT_TEMPO, MIN_TEMPO, MAX_TEMPO);
        if (pitchSlider) initialGlobalPitch = clamp(parseFloat(pitchSlider.value) || DEFAULT_PITCH, MIN_PITCH, MAX_PITCH);
        if (volumeSlider) initialVolume = clamp(parseFloat(volumeSlider.value) || DEFAULT_VOLUME, MIN_VOLUME, MAX_VOLUME);
        if (multiplierSlider) initialMultiplier = clamp(parseInt(multiplierSlider.value, 10) || 1, MIN_MULTIPLIER, MAX_MULTIPLIER);

        if (tempoSlider) tempoSlider.value = initialTempo;
        if (pitchSlider) pitchSlider.value = initialGlobalPitch;
        if (volumeSlider) volumeSlider.value = initialVolume;
        if (multiplierSlider) multiplierSlider.value = initialMultiplier;
    } catch (e) { console.warn("Error reading initial slider values:", e); }
    console.log(`Initial values - Tempo: ${initialTempo}, Pitch: ${initialGlobalPitch.toFixed(2)}, Volume: ${initialVolume.toFixed(2)}, Multiplier: ${initialMultiplier}`);


    // 4. Initialize MIDI System (Auto-connect is enabled by default in midiHandler)
    console.log("Initializing MIDI Handler (with auto-connect enabled by default)...");
    midiHandler.init(handleNoteOn, handleNoteOff, handleMidiStateChange); // No options needed for default behavior
    // To disable auto-connect:
    // midiHandler.init(handleNoteOn, handleNoteOff, handleMidiStateChange, { autoConnect: false });

    // 5. Initialize Audio Processor
    // ... (keep existing audio initialization)
    console.log("Initializing Audio Processor...");
    const audioReady = await audio.init(audioSource, initialTempo, initialGlobalPitch);
    if (!audioReady) { /* Error already shown by audio.init */ return; }
     audio.setVolume(initialVolume);

    // 6. Initialize Reference Panel Content
    // ... (keep existing reference panel init)
    if (referencePanel && initReferencePanel) {
        initReferencePanel(referencePanel);
        console.log("Reference panel content initialized.");
    }

    // 7. Initialize Keyboard Shortcuts
    // ... (keep existing keyboard shortcut init)
    if (keyboardShortcuts.init && tempoSlider && pitchSlider && volumeSlider && multiplierSlider) {
        keyboardShortcuts.init({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider });
    } else {
        console.error("Cannot initialize keyboard shortcuts: Function or slider elements missing.");
    }

    // 8. Setup Event Listeners for UI Controls
    // ... (keep existing setupEventListeners call)
    setupEventListeners();

    // 9. Set Initial UI Display Values & Enable Controls
    // ... (keep existing initial UI update logic)
    console.groupCollapsed("Setting Initial UI Values");
    try {
        ui.updateTempoDisplay(initialTempo);
        ui.updatePitchDisplay(initialGlobalPitch);
        ui.updateVolumeDisplay(initialVolume);
        ui.updateScheduleMultiplierDisplay(initialMultiplier);
        ui.updateLoopButton(audio.getLoopingState());
        ui.updateReverseButton(audio.getReverseState());
        ui.enableControls();
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
    // ... (keep existing playback control listeners)
    addListener(mainImage, 'click', handleLoopToggle, 'mainImage');
    addListener(playOnceBtn, 'click', () => audio.playOnce(), 'playOnceBtn');
    addListener(loopToggleBtn, 'click', handleLoopToggle, 'loopToggleBtn');
    addListener(reverseToggleBtn, 'click', () => {
        audio.resumeContext()
            .then(() => ui.updateReverseButton(audio.toggleReverse()))
            .catch(err => ui.showError(`Could not toggle reverse: ${err?.message || 'Unknown error'}`));
    }, 'reverseToggleBtn');

    // --- Slider Controls ---
    // ... (keep existing slider listeners)
    addListener(tempoSlider, 'input', (e) => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt), 'tempoSlider');
    addListener(pitchSlider, 'input', (e) => handleSliderInput(e, audio.setGlobalPitch, ui.updatePitchDisplay), 'pitchSlider');
    addListener(volumeSlider, 'input', (e) => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay), 'volumeSlider');
    addListener(multiplierSlider, 'input', (e) => handleSliderInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt), 'multiplierSlider');

    // --- MIDI Device Selection (Manual Override) ---
    // This listener remains the same. When the user manually selects,
    // it tells midiHandler to switch, which will then trigger handleMidiStateChange again.
    addListener(midiDeviceSelect, 'change', (event) => {
        console.log(`Main: User selected MIDI device ID: ${event.target.value || 'None'}`);
        midiHandler.selectDevice(event.target.value); // Pass selected ID (or empty string for placeholder)
    }, 'midiDeviceSelect');

    // --- Info Panel Toggle Button ---
    // ... (keep existing info toggle listener)
    addListener(infoToggleBtn, 'click', toggleSideColumns, 'infoToggleBtn');

    // --- Global Keydown Listener (Main Actions) ---
    // ... (keep existing keydown listener)
     window.addEventListener('keydown', (e) => {
        if (e.repeat || _isInputFocused(e.target)) return;
        const noModifiers = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
        if (noModifiers) {
            let handled = false;
            switch (e.code) {
                case 'Space': audio.playOnce(); handled = true; break;
            }
            switch (e.key.toLowerCase()) {
                case 'i': toggleSideColumns(); handled = true; break;
                case 'r':
                    audio.resumeContext()
                         .then(() => ui.updateReverseButton(audio.toggleReverse()))
                         .catch(err => ui.showError(`Could not toggle reverse: ${err?.message || 'Unknown error'}`));
                    handled = true;
                    break;
            }
            if (handled) e.preventDefault();
        }
    });


    console.log("Event listeners setup complete.");
} // End of setupEventListeners

// --- Start the Application ---
// ... (keep existing startup logic)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// --- END OF FILE main.js ---