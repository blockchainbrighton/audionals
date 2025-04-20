// --- START OF FILE main.js ---
// main.js - Refactored for Minimum Lines & Modern JS (v3 - Exported Actions)

// --- Module Imports ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import * as midiHandler from './midiHandler.js';
import * as keyboardShortcuts from './keyboardShortcuts.js'; // Keep this import
import { initReferencePanel } from './referenceDisplay.js';
import { clamp, _isInputFocused, addListener, createElement } from './utils.js';
import * as midiRecorder from './midiRecorder.js';
import * as waveformDisplay from './waveformDisplay.js';
import * as waveformTrimmer from './waveformTrimmer.js';

// --- Constants ---
const DEFAULTS = { TEMPO: 78, PITCH: 1, VOLUME: 1, MULTIPLIER: 1, DELAY_TIME: 0, DELAY_FEEDBACK: 0, FILTER_TYPE: 'lowpass', FILTER_FREQ: 20000, FILTER_Q: 1, FILTER_GAIN: 0 };
const LIMITS = { TEMPO: { min: 1, max: 400 }, PITCH: { min: 0.01, max: 10 }, VOLUME: { min: 0, max: 1.5 }, MULTIPLIER: { min: 1, max: 8 }, DELAY_TIME: { min: 0, max: 1.0 }, DELAY_FEEDBACK: { min: 0, max: 0.9 }, FILTER_FREQ: { min: 10, max: 22000 }, FILTER_Q: { min: 0.0001, max: 100 }, FILTER_GAIN: { min: -40, max: 40 } };
const IMAGE_PREFIX_IF_BASE64 = "data:image/jpeg;base64,";
const AUDIO_PREFIX = "data:audio/opus;base64,";

// --- Module Globals (DOM Elements Mapped) ---
const els = {}; // Store elements in an object

// --- Exported Action Functions for UI/Playback ---

/** Plays the sample once, ensuring audio context is resumed. */
export async function playOnceAction() {
    console.log("[Action] Triggered Play Once");
    try {
        await audio.resumeContext();
        audio.playOnce();
    } catch (err) {
         ui.showError(`Could not play sample: ${err?.message ?? "Unknown error"}`);
         console.error("Error during playOnceAction:", err);
    }
}

/** Toggles the reverse playback state. */
export async function toggleReverseAction() {
    console.log("[Action] Triggered Toggle Reverse");
    try {
        await audio.resumeContext();
        // Call audio processor's toggle, which returns the new state
        const newState = await audio.toggleReverse();
        ui.updateReverseButton(newState); // Update UI based on the returned state
    } catch (err) {
        ui.showError(`Could not toggle reverse: ${err?.message ?? "Unknown error"}`);
        console.error("Error during toggleReverseAction:", err);
        // Ensure button reflects actual state if error occurs during toggle attempt
        // Fetch the potentially unchanged state and update UI
        ui.updateReverseButton(audio.getReverseState());
    }
}

/** Toggles the audio loop on or off. */
export async function toggleLoopAction() {
    const wasLooping = audio.getLoopingState();
    console.log(`[Action] Triggered Toggle Loop. Current state: ${wasLooping ? "On" : "Off"}`);
    try {
        await audio.resumeContext();
        // Choose action based on current state BEFORE awaiting
        const action = wasLooping ? audio.stopLoop : audio.startLoop;
        await action(); // Call stop or start
    } catch (err) {
        ui.showError(`Could not toggle loop: ${err?.message ?? "Unknown error"}`);
        console.error("Main: Error toggling loop:", err);
    } finally {
        // Always update UI based on the *actual* state *after* the attempt
        ui.updateLoopButton(audio.getLoopingState());
    }
}

/** Toggles the visibility of the controls and reference side columns. */
export function toggleSideColumnsAction() {
    console.log("[Action] Triggered Toggle Side Columns");
    if (els.controlsColumn) {
        // Toggle hidden class on controls column
        const controlsHidden = els.controlsColumn.classList.toggle("hidden");
        // Sync reference column's hidden state with controls column
        // If referenceColumn exists, toggle its 'hidden' class BASED ON controlsHidden value
        els.referenceColumn?.classList.toggle("hidden", controlsHidden);
         console.log(`Toggled side columns. Controls hidden: ${controlsHidden}`);
    } else {
        console.warn("Cannot toggle side columns: Controls column element not found.");
        // Optionally provide user feedback if element is missing
        // ui.showError("UI layout error: Control panel missing.");
    }
}

/** Toggles the visibility of the MIDI Recorder UI panel. */
export function toggleMidiRecorderUIAction() {
    console.log("[Action] Triggered Toggle MIDI Recorder UI");
    if (midiRecorder?.toggleUI) {
        midiRecorder.toggleUI();
    } else {
        console.warn("MIDI Recorder UI toggle action called, but function not available.");
        ui.showError("MIDI recording feature not currently available."); // Inform user
    }
}

// --- Internal Helper Functions ---

function findElements() {
    const ids = ["app", "main-image", "play-once-btn", "loop-toggle-btn", "reverse-toggle-btn", "tempo-slider", "pitch-slider", "volume-slider", "multiplier-slider", "controls-container", "info-toggle-btn", "reference-panel", "error-message", "midi-device-select", "midi-status", "delay-time-slider", "delay-feedback-slider", "filter-type-select", "filter-freq-slider", "filter-q-slider", "filter-gain-slider"];
    ids.forEach(id => {
        const key = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        els[key] = document.getElementById(id);
    });
    els.controlsColumn = document.querySelector(".controls-column");
    els.referenceColumn = document.querySelector(".reference-column");
    els.touchControlsDiv = document.querySelector('.touch-controls'); // Try to find touch controls

    // Critical Element Check
    const critical = { appContainer: els.app, controlsContainer: els.controlsContainer, errorMessageDiv: els.errorMessage, mainImage: els.mainImage, controlsColumn: els.controlsColumn };
    for (const [name, el] of Object.entries(critical)) {
        if (!el) {
            const idName = Object.keys(els).find(key => els[key] === el) ?? name;
            console.error(`CRITICAL Error: UI element "${idName}" (expected by variable '${name}') not found.`);
            const friendlyName = name === 'appContainer' ? 'app' : name.replace(/([A-Z])/g, '-$1').toLowerCase();
            (document.getElementById("app") || document.body).innerHTML = `<p style="color:red; padding:20px;">Fatal Error: Required UI element with ID likely "${friendlyName}" missing.</p>`;
            return false;
        }
    }
    // Warnings for non-critical elements
    if (!els.referenceColumn) console.warn("Reference column element missing.");
    if (!els.midiDeviceSelect || !els.midiStatus) console.warn("MIDI UI elements missing.");
    if (!els.touchControlsDiv) console.warn("Touch controls container element missing.");
    const coreSliders = [els.tempoSlider, els.pitchSlider, els.volumeSlider, els.multiplierSlider];
    const effectControls = [els.delayTimeSlider, els.delayFeedbackSlider, els.filterTypeSelect, els.filterFreqSlider, els.filterQSlider, els.filterGainSlider];
    if (coreSliders.some(el => !el)) console.warn("One or more core sliders not found.");
    if (effectControls.some(el => !el)) console.warn("One or more effect control elements not found.");

    console.log("findElement completed.");
    return true;
}

const formatDataSource = (source, prefix, sourceType, isRequired = false) => {
    // ... (implementation unchanged) ...
    if (isRequired && (!source || typeof source !== 'string' || source.trim() === '' || source.startsWith("/*"))) {
        throw new Error(`Required data variable "${sourceType}" is missing or invalid.`);
    }
    if (!source || typeof source !== 'string') return source; // Allow null/undefined if not required
    source = source.trim();
    if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('data:')) return source;
    return prefix ? `${prefix}${source}` : source;
};

const handleControlInput = (event, audioSetter, uiUpdater, parser = parseFloat) => {
    // ... (implementation unchanged) ...
    const { target } = event;
    const { value, min, max, id, type } = target;
    const val = type === 'select-one' ? value : parser(value);
    const numMin = parser(min ?? -Infinity);
    const numMax = parser(max ?? Infinity);

    if (value === undefined || (type !== 'select-one' && (min === undefined || max === undefined))) {
        console.warn(`Control #${id} missing value/min/max attribute.`); return;
    }
    try {
        const clampedValue = (type === 'select-one' || min === undefined || max === undefined) ? val : clamp(val, numMin, numMax);
        if (type !== 'select-one' && isNaN(clampedValue)) throw new Error("Parsed value is NaN");
        if (typeof audioSetter === 'function') audioSetter(clampedValue);
        if (typeof uiUpdater === 'function') uiUpdater(clampedValue);
        if (id === 'filter-type-select' && els.filterGainSlider) {
            const gainRelevant = ['peaking', 'lowshelf', 'highshelf'].includes(clampedValue);
            els.filterGainSlider.disabled = !gainRelevant || els.controlsContainer?.classList.contains('disabled');
            els.filterGainSlider.style.opacity = gainRelevant ? '1' : '0.5';
        }
    } catch (err) { console.error(`Error handling control input for #${id}:`, err); ui.showError("Error processing control."); }
};

// --- MIDI Handling ---
const handleMidiEvent = (type, note, velocity) => midiRecorder.handleMidiEvent?.(type, note, velocity, Date.now());
const handleNoteOn = (note, velocity) => {
    const rate = audio.getPlaybackRateForNote(note);
    if (rate !== undefined) audio.playSampleAtRate(rate).catch(err => console.error("Error playing sample via MIDI:", err)); // Velocity ignored here now?
    handleMidiEvent('noteon', note, velocity);
};
const handleNoteOff = (note, velocity) => handleMidiEvent('noteoff', note, velocity);

const handleMidiStateChange = (state) => {
    // ... (implementation unchanged) ...
    if (!els.midiDeviceSelect || !els.midiStatus) return;
    const { status, message, devices = [] } = state;
    els.midiStatus.textContent = message || status;
    els.midiStatus.style.color = ['error', 'unsupported'].includes(status) ? 'var(--error-color)' : '';
    els.midiDeviceSelect.replaceChildren(createElement('option', { value: "", textContent: status === 'ready' ? (devices.length > 0 ? "-- Select MIDI Device --" : "-- No MIDI Inputs --") : (message || `-- ${status} --`) }));
    devices.forEach(d => els.midiDeviceSelect.append(createElement('option', { value: d.id, textContent: d.name })));
    els.midiDeviceSelect.disabled = !(status === 'ready' && devices.length > 0);
    els.midiDeviceSelect.value = "";
};

const getInitialControlValue = (element, key, parser = parseFloat) => {
    // ... (implementation unchanged) ...
    const defaultValue = DEFAULTS[key]; const limits = LIMITS[key];
    if (!element) return defaultValue;
    const isSelect = element.type === 'select-one'; const htmlValue = element.value;
    const parsedValue = isSelect ? htmlValue : parser(htmlValue);
    const initialValue = (isSelect || (!isNaN(parsedValue) && htmlValue !== "")) ? parsedValue : defaultValue;
    const clampedValue = (isSelect || !limits) ? initialValue : clamp(initialValue, limits.min, limits.max);
    element.value = String(clampedValue); return clampedValue;
};


// --- Main Application Initialization ---
async function initializeApp() {
    console.log("Initializing application...");
    if (!findElements()) return; // Stop if critical elements missing

    // Init UI (essential)
    if (!ui.init) {
         console.error("CRITICAL: ui.init function not found!");
         (els.app || document.body).innerHTML = `<p style="color:red; padding:20px;">Fatal Error: UI Updater module failed to load.</p>`;
         return;
    }
    ui.init();
    ui.clearError();

    // Init optional visual modules
    if (!waveformDisplay.init?.('waveform-canvas')) console.warn("Waveform display failed to initialize.");
    if (!waveformTrimmer.init?.('waveform-container')) console.warn("Waveform trimmer failed to initialize.");

    // Load and validate data
    let finalImageUrl, audioData;
    try {
        const hasImageUrl = typeof imageUrl === 'string' && imageUrl.trim() !== '';
        const hasImageBase64 = typeof imageBase64 === 'string' && imageBase64.trim() !== '';
        let imgData, imgPrefix, imgType;
        if (hasImageUrl) [imgData, imgPrefix, imgType] = [imageUrl, '', 'url'];
        else if (hasImageBase64) [imgData, imgPrefix, imgType] = [imageBase64, IMAGE_PREFIX_IF_BASE64, 'base64'];
        else throw new Error("No valid image source found ('imageUrl' or 'imageBase64').");

        finalImageUrl = formatDataSource(imgData, imgPrefix, `image (${imgType})`, true);
        const rawAudioData = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : null;
        audioData = formatDataSource(rawAudioData, AUDIO_PREFIX, "audioBase64_Opus", true);
        ui.setImageSource(finalImageUrl);
    } catch (err) {
        console.error("Data validation/processing error:", err);
        ui.showError(`Initialization failed: ${err.message}`);
        ui.disableControls(); return;
    }

    // Get Initial Control Values
    const initialValues = {};
    const controlMap = {
        TEMPO: { el: els.tempoSlider, parser: parseInt }, PITCH: { el: els.pitchSlider }, VOLUME: { el: els.volumeSlider },
        MULTIPLIER: { el: els.multiplierSlider, parser: parseInt }, DELAY_TIME: { el: els.delayTimeSlider }, DELAY_FEEDBACK: { el: els.delayFeedbackSlider },
        FILTER_TYPE: { el: els.filterTypeSelect }, FILTER_FREQ: { el: els.filterFreqSlider }, FILTER_Q: { el: els.filterQSlider }, FILTER_GAIN: { el: els.filterGainSlider }
    };
    for (const key in controlMap) {
        initialValues[key] = getInitialControlValue(controlMap[key].el, key, controlMap[key].parser);
    }
    console.log("Initial Values:", initialValues);

    // --- Create Touch Controls (If not found by findElements) ---
     if (!els.touchControlsDiv) {
        const touchControlsDiv = createElement('div', { className: 'touch-controls' });
        els.touchInfoBtn = createElement('div', { id: 'touch-info-btn', className: 'touch-button', textContent: 'i', title: 'Toggle Info Panel (I)' });
        touchControlsDiv.appendChild(els.touchInfoBtn);
        if (midiRecorder?.toggleUI) {
            els.touchMidiBtn = createElement('div', { id: 'touch-midi-btn', className: 'touch-button', textContent: 'k', title: 'Toggle MIDI UI (K)' });
            touchControlsDiv.appendChild(els.touchMidiBtn);
        } else {
            console.warn("midiRecorder.toggleUI not found, 'k' touch button will not be added.");
        }
        (els.app ?? document.body).appendChild(touchControlsDiv);
        // Re-query elements that might have been created
        els.touchInfoBtn = document.getElementById('touch-info-btn');
        els.touchMidiBtn = document.getElementById('touch-midi-btn');
        console.log("Created touch control elements.");
    }


    // Initialize Core Modules
    midiHandler.init?.(handleNoteOn, handleNoteOff, handleMidiStateChange);

    if (!await audio.init(audioData, initialValues.TEMPO, initialValues.PITCH, initialValues.VOLUME)) {
        console.error("Audio Processor failed to initialize.");
        ui.showError("Failed to initialize audio processor.");
        ui.disableControls(); return;
    }
    // Set remaining initial parameters AFTER successful audio init
    audio.setScheduleMultiplier(initialValues.MULTIPLIER);
    audio.setDelayTime(initialValues.DELAY_TIME);
    audio.setDelayFeedback(initialValues.DELAY_FEEDBACK);
    audio.setFilterType(initialValues.FILTER_TYPE);
    audio.setFilterFrequency(initialValues.FILTER_FREQ);
    audio.setFilterQ(initialValues.FILTER_Q);
    audio.setFilterGain(initialValues.FILTER_GAIN);

    midiRecorder.init?.(audio);

    // Initialize Reference Panel - Requires action functions to be defined/exported
    if (els.referencePanel) initReferencePanel(els.referencePanel);
    else console.warn("Reference panel element missing, cannot initialize.");

    // Initialize Keyboard Shortcuts - Requires slider elements to be found
    if (keyboardShortcuts.init && els.tempoSlider && els.pitchSlider && els.volumeSlider && els.multiplierSlider) {
        keyboardShortcuts.init({ tempoSlider: els.tempoSlider, pitchSlider: els.pitchSlider, volumeSlider: els.volumeSlider, multiplierSlider: els.multiplierSlider });
    } else {
         console.warn("Cannot initialize keyboard shortcuts: Function or core slider elements missing.");
    }

    // --- Setup Event Listeners & Set Initial UI State ---
    setupEventListeners(); // Add all listeners after elements exist

    try {
        const uiUpdateMap = {
            TEMPO: ui.updateTempoDisplay, PITCH: ui.updatePitchDisplay, VOLUME: ui.updateVolumeDisplay, MULTIPLIER: ui.updateScheduleMultiplierDisplay,
            DELAY_TIME: ui.updateDelayTimeDisplay, DELAY_FEEDBACK: ui.updateDelayFeedbackDisplay, FILTER_FREQ: ui.updateFilterFrequencyDisplay,
            FILTER_Q: ui.updateFilterQDisplay, FILTER_GAIN: ui.updateFilterGainDisplay
        };
        for (const key in uiUpdateMap) uiUpdateMap[key]?.(initialValues[key]);

        ui.updateLoopButton(audio.getLoopingState());
        ui.updateReverseButton(audio.getReverseState());

        ui.enableControls();
        if (els.filterTypeSelect) handleControlInput({ target: els.filterTypeSelect }, audio.setFilterType); // Update gain slider based on initial filter type
    } catch (err) {
        console.error("Error setting initial UI values:", err);
        ui.showError("Problem setting initial control values.");
        ui.disableControls();
    }

    console.log("Application initialized successfully.");
}


function setupEventListeners() {
    console.log("Setting up event listeners...");

    const listeners = [
        // Buttons & Image - Use EXPORTED ACTION functions
        { el: els.mainImage, ev: 'click', fn: toggleLoopAction },      // Use action
        { el: els.playOnceBtn, ev: 'click', fn: playOnceAction },      // Use action
        { el: els.loopToggleBtn, ev: 'click', fn: toggleLoopAction },   // Use action
        { el: els.reverseToggleBtn, ev: 'click', fn: toggleReverseAction },// Use action

        // Core Sliders & Effects - Use generic handler
        { el: els.tempoSlider, ev: 'input', fn: e => handleControlInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt) },
        { el: els.pitchSlider, ev: 'input', fn: e => handleControlInput(e, audio.setGlobalPitch, ui.updatePitchDisplay) },
        { el: els.volumeSlider, ev: 'input', fn: e => handleControlInput(e, audio.setVolume, ui.updateVolumeDisplay) },
        { el: els.multiplierSlider, ev: 'input', fn: e => handleControlInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt) },
        { el: els.delayTimeSlider, ev: 'input', fn: e => handleControlInput(e, audio.setDelayTime, ui.updateDelayTimeDisplay) },
        { el: els.delayFeedbackSlider, ev: 'input', fn: e => handleControlInput(e, audio.setDelayFeedback, ui.updateDelayFeedbackDisplay) },
        { el: els.filterTypeSelect, ev: 'change', fn: e => handleControlInput(e, audio.setFilterType, null) },
        { el: els.filterFreqSlider, ev: 'input', fn: e => handleControlInput(e, audio.setFilterFrequency, ui.updateFilterFrequencyDisplay) },
        { el: els.filterQSlider, ev: 'input', fn: e => handleControlInput(e, audio.setFilterQ, ui.updateFilterQDisplay) },
        { el: els.filterGainSlider, ev: 'input', fn: e => handleControlInput(e, audio.setFilterGain, ui.updateFilterGainDisplay) },

        // MIDI
        { el: els.midiDeviceSelect, ev: 'change', fn: (event) => midiHandler.selectDevice(event.target.value) },

        // UI Toggles - Use EXPORTED ACTION functions
        { el: els.infoToggleBtn, ev: 'click', fn: toggleSideColumnsAction },

        // Touch Controls (if they exist) - Use EXPORTED ACTION functions
        { el: els.touchInfoBtn, ev: 'click', fn: toggleSideColumnsAction },
        { el: els.touchMidiBtn, ev: 'click', fn: toggleMidiRecorderUIAction } // Use action
    ];

    // Add listeners, warning if element is missing but attaching if found
    listeners.forEach(({ el, ev, fn, elId }) => {
        addListener(el, ev, fn, elId || el?.id); // Pass ID if available for logging
    });


    // --- Keyboard Shortcuts (Window Level - Simple keys without complex modifiers) ---
    window.addEventListener('keydown', (event) => {
        // Ignore if focused on input, or if complex modifiers are pressed (handled by keyboardShortcuts.js)
        if (_isInputFocused(event.target) || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ) return;
        // Ignore repeated events from holding key down
        if (event.repeat) return;

        // Map simple keys (no Shift/Ctrl/Alt/Meta) to EXPORTED ACTION functions
        const keyActions = {
            ' ': playOnceAction,               // Spacebar
            'i': toggleSideColumnsAction,      // 'i'
            'r': toggleReverseAction,          // 'r'
            'k': toggleMidiRecorderUIAction,   // 'k'
        };

        // Determine key identifier
        const actionKey = event.code === 'Space' ? ' ' : event.key.toLowerCase();

        if (keyActions[actionKey]) {
            console.log(`Simple key '${actionKey}' pressed, calling action.`);
            keyActions[actionKey]();  // Execute the corresponding action function
            event.preventDefault();   // Prevent default browser behavior (e.g., space scrolling)
            event.stopPropagation(); // Stop event from bubbling further
        }
        // Note: More complex shortcuts (e.g., Ctrl+Shift+-, Number keys 1-8) are handled in keyboardShortcuts.js
    });
    console.log("Event listeners setup complete.");
}

// --- Start the application ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // If already loaded, use rAF for potential smoother start
    requestAnimationFrame(initializeApp);
}
// --- END OF FILE main.js ---