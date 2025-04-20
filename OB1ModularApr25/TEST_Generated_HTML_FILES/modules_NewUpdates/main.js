// --- START OF FILE main.js ---
// main.js - Refactored for Minimum Lines & Modern JS (v2 - Fix appContainer lookup)

// --- Module Imports ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import * as midiHandler from './midiHandler.js';
import * as keyboardShortcuts from './keyboardShortcuts.js';
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

function findElements() {
    const ids = ["app", "main-image", "play-once-btn", "loop-toggle-btn", "reverse-toggle-btn", "tempo-slider", "pitch-slider", "volume-slider", "multiplier-slider", "controls-container", "info-toggle-btn", "reference-panel", "error-message", "midi-device-select", "midi-status", "delay-time-slider", "delay-feedback-slider", "filter-type-select", "filter-freq-slider", "filter-q-slider", "filter-gain-slider"];
    // Populate els object: key is camelCase version of ID, value is the element
    ids.forEach(id => {
        // Simple camelCase: only converts hyphens, doesn't add "Container" etc.
        const key = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        els[key] = document.getElementById(id);
    });

    els.controlsColumn = document.querySelector(".controls-column");
    els.referenceColumn = document.querySelector(".reference-column");

    // Critical Element Check - Use the keys generated above (e.g., 'app' for ID 'app')
    const critical = {
        appContainer: els.app, // Use 'app' key for ID 'app'
        controlsContainer: els.controlsContainer,
        errorMessageDiv: els.errorMessage,
        mainImage: els.mainImage,
        controlsColumn: els.controlsColumn
    };
    for (const [name, el] of Object.entries(critical)) {
        if (!el) {
            const idName = Object.keys(els).find(key => els[key] === el) ?? name; // Attempt to get original ID/key
            console.error(`CRITICAL Error: UI element "${idName}" (expected by variable '${name}') not found.`);
            // Provide more specific feedback in the fatal error message
            const friendlyName = name === 'appContainer' ? 'app' : name.replace(/([A-Z])/g, '-$1').toLowerCase(); // Convert camelCase back to kebab-case approx
            (document.getElementById("app") || document.body).innerHTML = `<p style="color:red; padding:20px;">Fatal Error: Required UI element with ID likely "${friendlyName}" missing.</p>`;
            return false;
        }
    }
    // Warnings for non-critical elements (condensed)
    if (!els.referenceColumn) console.warn("Reference column element missing.");
    if (!els.midiDeviceSelect || !els.midiStatus) console.warn("MIDI UI elements missing.");
    const coreSliders = [els.tempoSlider, els.pitchSlider, els.volumeSlider, els.multiplierSlider];
    const effectControls = [els.delayTimeSlider, els.delayFeedbackSlider, els.filterTypeSelect, els.filterFreqSlider, els.filterQSlider, els.filterGainSlider];
    if (coreSliders.some(el => !el)) console.warn("One or more core sliders not found.");
    if (effectControls.some(el => !el)) console.warn("One or more effect control elements not found.");

    console.log("findElement completed.");
    return true;
}

// Inlined validation & combined formatting
const formatDataSource = (source, prefix, sourceType, isRequired = false) => {
    if (isRequired && (!source || typeof source !== 'string' || source.trim() === '' || source.startsWith("/*"))) {
        throw new Error(`Required data variable "${sourceType}" is missing or invalid.`);
    }
    if (!source || typeof source !== 'string') return source; // Allow null/undefined if not required

    source = source.trim();
    console.log(`[formatDataSource] Processing ${sourceType}...`);
    if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('data:')) {
        console.log(`[formatDataSource] Using direct URL or existing Data URI for ${sourceType}.`);
        return source;
    }
    if (prefix) {
        console.log(`[formatDataSource] Applying prefix to ${sourceType}.`);
        return `${prefix}${source}`;
    }
    console.log(`[formatDataSource] No prefix needed for ${sourceType}. Using as is.`);
    return source;
};

// Generic slider/select handler
const handleControlInput = (event, audioSetter, uiUpdater, parser = parseFloat) => {
    const { target } = event;
    const { value, min, max, id, type } = target; // Include type for select differentiation
    const val = type === 'select-one' ? value : parser(value); // Parse non-select values
    const numMin = parser(min ?? -Infinity); // Use loose defaults for select/non-range inputs
    const numMax = parser(max ?? Infinity);

    if (value === undefined || (type !== 'select-one' && (min === undefined || max === undefined))) {
        console.warn(`Control #${id} missing value/min/max attribute.`);
        return;
    }

    try {
        // Clamp only non-select values that have min/max defined
        const clampedValue = (type === 'select-one' || min === undefined || max === undefined) ? val : clamp(val, numMin, numMax);
        if (type !== 'select-one' && isNaN(clampedValue)) throw new Error("Parsed value is NaN");

        if (typeof audioSetter === 'function') audioSetter(clampedValue);
        else if (audioSetter) console.error(`Invalid audioSetter provided for control #${id}`); // Only error if it was expected

        if (typeof uiUpdater === 'function') uiUpdater(clampedValue);
        // No error log for missing uiUpdater, might be intentional (e.g., filter type select)

        // Special handling for filter type affecting gain slider
        if (id === 'filter-type-select' && els.filterGainSlider) {
            const gainRelevant = ['peaking', 'lowshelf', 'highshelf'].includes(clampedValue);
            els.filterGainSlider.disabled = !gainRelevant || els.controlsContainer?.classList.contains('disabled');
            els.filterGainSlider.style.opacity = gainRelevant ? '1' : '0.5';
        }
    } catch (err) {
        console.error(`Error handling control input for #${id} (value: ${value}):`, err);
        ui.showError("Error processing control input.");
    }
};


const toggleReverse = async () => {
    try {
        await audio.resumeContext();
        ui.updateReverseButton(audio.toggleReverse()); // Update UI after toggle attempt
    } catch (err) {
        ui.showError(`Could not toggle reverse: ${err?.message ?? "Unknown error"}`);
    }
};

const handleLoopToggle = async () => {
    const wasLooping = audio.getLoopingState();
    console.log(`Main: Toggling loop. Current state: ${wasLooping ? "On" : "Off"}`);
    try {
        await audio.resumeContext();
        await (wasLooping ? audio.stopLoop() : audio.startLoop());
    } catch (err) {
        ui.showError(`Could not toggle loop: ${err?.message ?? "Unknown error"}`);
        console.error("Main: Error toggling loop:", err);
    } finally {
        ui.updateLoopButton(audio.getLoopingState()); // Always update UI
    }
};

const toggleSideColumns = () => {
    if (els.controlsColumn) {
        const controlsHidden = els.controlsColumn.classList.toggle("hidden");
        els.referenceColumn?.classList.toggle("hidden", controlsHidden); // Sync reference column
    } else console.warn("Cannot toggle side columns: Controls column not found.");
};

const handleMidiToggleTouch = () => midiRecorder?.toggleUI?.() ?? console.warn("Touch: midiRecorder.toggleUI not available.");

// --- MIDI Handling ---
const handleMidiEvent = (type, note, velocity) => midiRecorder.handleMidiEvent?.(type, note, velocity, Date.now());
const handleNoteOn = (note, velocity) => {
    const rate = audio.getPlaybackRateForNote(note);
    if (rate !== undefined) audio.playSampleAtRate(rate, velocity).catch(err => console.error("Error in playSampleAtRate:", err));
    handleMidiEvent('noteon', note, velocity);
};
const handleNoteOff = (note, velocity) => handleMidiEvent('noteoff', note, velocity);

const handleMidiStateChange = (state) => {
    if (!els.midiDeviceSelect || !els.midiStatus) return;
    const { status, message, devices = [] } = state;
    els.midiStatus.textContent = message || status;
    els.midiStatus.style.color = ['error', 'unsupported'].includes(status) ? 'var(--error-color)' : '';
    els.midiDeviceSelect.replaceChildren(); // Clear existing options (modern way)

    let defaultText = status === 'ready'
        ? (devices.length > 0 ? "-- Select MIDI Device --" : "-- No MIDI Inputs --")
        : (message || `-- ${status} --`);

    els.midiDeviceSelect.append(createElement('option', { value: "", textContent: defaultText }));
    devices.forEach(d => els.midiDeviceSelect.append(createElement('option', { value: d.id, textContent: d.name })));
    els.midiDeviceSelect.disabled = !(status === 'ready' && devices.length > 0);
    els.midiDeviceSelect.value = ""; // Ensure default is selected
};

// Helper to get initial control value, clamping and setting the control
const getInitialControlValue = (element, key, parser = parseFloat) => {
    const defaultValue = DEFAULTS[key];
    const limits = LIMITS[key];
    if (!element) return defaultValue;

    const isSelect = element.type === 'select-one';
    const htmlValue = element.value;
    const parsedValue = isSelect ? htmlValue : parser(htmlValue); // Don't parse select value initially

    // Use default if HTML value is unsuitable (NaN, empty for non-select)
    const initialValue = (isSelect || (!isNaN(parsedValue) && htmlValue !== "")) ? parsedValue : defaultValue;

    // Clamp numeric values if limits exist
    const clampedValue = (isSelect || !limits) ? initialValue : clamp(initialValue, limits.min, limits.max);

    element.value = String(clampedValue); // Set element's value to the final clamped/initial value
    // console.log(`Control ${element.id}: HTML='${htmlValue}', Initial=${initialValue}, Clamped=${clampedValue}`);
    return clampedValue;
};

// --- Main Application Initialization ---
async function initializeApp() {
    console.log("Initializing application...");
    if (!findElements()) return; // Stop if critical elements missing

    ui.init?.(); // Initialize UI first
    if (!ui.init) {
         console.error("CRITICAL: ui.init not found!");
         (els.app || document.body).innerHTML = `<p style="color:red; padding:20px;">Fatal Error: UI Updater module failed to load.</p>`; // Use els.app here
         return;
    }
    ui.clearError();

    // Init optional visual modules
    if (!waveformDisplay.init?.('waveform-canvas')) console.warn("Waveform display failed to initialize.");
    if (!waveformTrimmer.init?.('waveform-container')) console.warn("Waveform trimmer failed to initialize.");

    let finalImageUrl, audioData;
    try {
        // Determine image source, prioritize URL over base64
        const hasImageUrl = typeof imageUrl === 'string' && imageUrl.trim() !== '';
        const hasImageBase64 = typeof imageBase64 === 'string' && imageBase64.trim() !== '';
        let imageUrlData, imagePrefix, imageSourceType;

        if (hasImageUrl) [imageUrlData, imagePrefix, imageSourceType] = [imageUrl, '', 'url'];
        else if (hasImageBase64) [imageUrlData, imagePrefix, imageSourceType] = [imageBase64, IMAGE_PREFIX_IF_BASE64, 'base64'];
        else throw new Error("No valid image source found ('imageUrl' or 'imageBase64').");

        finalImageUrl = formatDataSource(imageUrlData, imagePrefix, `image (${imageSourceType})`, true);
        // Validate and format audio source
        const rawAudioData = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : null;
        audioData = formatDataSource(rawAudioData, AUDIO_PREFIX, "audioBase64_Opus", true);
        ui.setImageSource(finalImageUrl);

    } catch (err) {
        console.error("Data validation/processing error:", err);
        ui.showError(`Initialization failed: ${err.message}`);
        ui.disableControls();
        return; // Stop initialization
    }

    // --- Get Initial Control Values ---
    const initialValues = {};
    // Map keys to elements and optional parsers
    const controlMap = {
        TEMPO: { el: els.tempoSlider, parser: parseInt }, PITCH: { el: els.pitchSlider }, VOLUME: { el: els.volumeSlider },
        MULTIPLIER: { el: els.multiplierSlider, parser: parseInt }, DELAY_TIME: { el: els.delayTimeSlider }, DELAY_FEEDBACK: { el: els.delayFeedbackSlider },
        FILTER_TYPE: { el: els.filterTypeSelect }, FILTER_FREQ: { el: els.filterFreqSlider }, FILTER_Q: { el: els.filterQSlider }, FILTER_GAIN: { el: els.filterGainSlider }
    };
    for (const key in controlMap) {
        initialValues[key] = getInitialControlValue(controlMap[key].el, key, controlMap[key].parser);
    }
    console.log("Initial Values:", initialValues);


    // --- Create Touch Controls ---
    const touchControlsDiv = createElement('div', { className: 'touch-controls' });
    els.touchInfoBtn = createElement('div', { id: 'touch-info-btn', className: 'touch-button', textContent: 'i', title: 'Toggle Info Panel (i)' });
    touchControlsDiv.appendChild(els.touchInfoBtn);
    if (midiRecorder?.toggleUI) { // Check if function exists before creating button
        els.touchMidiBtn = createElement('div', { id: 'touch-midi-btn', className: 'touch-button', textContent: 'k', title: 'Toggle MIDI UI (k)' });
        touchControlsDiv.appendChild(els.touchMidiBtn);
    } else {
        console.warn("midiRecorder.toggleUI not found, 'k' touch button will not be added.");
    }
    (els.app ?? document.body).appendChild(touchControlsDiv); // Append to app container or body fallback


    // --- Initialize Core Modules ---
    midiHandler.init?.(handleNoteOn, handleNoteOff, handleMidiStateChange);

    // Initialize Audio Processor, passing essential initial values
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

    midiRecorder.init?.(audio); // Init MIDI recorder, pass audio reference

    // Init optional modules
    if (els.referencePanel) initReferencePanel?.(els.referencePanel);
    else console.warn("Reference panel element or init function missing.");

    // Init keyboard shortcuts if function and core sliders exist
    if (keyboardShortcuts.init && els.tempoSlider && els.pitchSlider && els.volumeSlider && els.multiplierSlider) {
        keyboardShortcuts.init({ tempoSlider: els.tempoSlider, pitchSlider: els.pitchSlider, volumeSlider: els.volumeSlider, multiplierSlider: els.multiplierSlider });
    } else {
         console.warn("Cannot initialize keyboard shortcuts: Function or core slider elements missing.");
    }

    // --- Setup Event Listeners & Set Initial UI State ---
    setupEventListeners(); // Add all listeners
    try {
        // Map initial values to UI update functions for cleaner setup
        const uiUpdateMap = {
            TEMPO: ui.updateTempoDisplay, PITCH: ui.updatePitchDisplay, VOLUME: ui.updateVolumeDisplay, MULTIPLIER: ui.updateScheduleMultiplierDisplay,
            DELAY_TIME: ui.updateDelayTimeDisplay, DELAY_FEEDBACK: ui.updateDelayFeedbackDisplay, FILTER_FREQ: ui.updateFilterFrequencyDisplay,
            FILTER_Q: ui.updateFilterQDisplay, FILTER_GAIN: ui.updateFilterGainDisplay
        };
        for (const key in uiUpdateMap) uiUpdateMap[key]?.(initialValues[key]); // Call updater if it exists

        // Set initial button states
        ui.updateLoopButton(audio.getLoopingState()); // Should be false
        ui.updateReverseButton(audio.getReverseState()); // Should be false

        ui.enableControls(); // Enable UI controls now
        // Re-apply filter gain disabled state based on initial filter type
        if (els.filterTypeSelect) { // Ensure select exists before triggering
            handleControlInput({ target: els.filterTypeSelect }, audio.setFilterType); // Trigger initial check/update
        }
    } catch (err) {
        console.error("Error setting initial UI values:", err);
        ui.showError("Problem setting initial control values.");
        ui.disableControls(); // Keep disabled if UI setup fails
    }
    console.log("Application initialized successfully.");
}


function setupEventListeners() {
    console.log("Setting up event listeners...");

    // Use a map for cleaner listener setup
    const listeners = [
        // Buttons & Image
        { el: els.mainImage, ev: 'click', fn: handleLoopToggle },
        { el: els.playOnceBtn, ev: 'click', fn: () => audio.playOnce() },
        { el: els.loopToggleBtn, ev: 'click', fn: handleLoopToggle },
        { el: els.reverseToggleBtn, ev: 'click', fn: toggleReverse }, // Use shared async function
        // Core Sliders
        { el: els.tempoSlider, ev: 'input', fn: e => handleControlInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt) },
        { el: els.pitchSlider, ev: 'input', fn: e => handleControlInput(e, audio.setGlobalPitch, ui.updatePitchDisplay) },
        { el: els.volumeSlider, ev: 'input', fn: e => handleControlInput(e, audio.setVolume, ui.updateVolumeDisplay) },
        { el: els.multiplierSlider, ev: 'input', fn: e => handleControlInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt) },
        // Effect Controls
        { el: els.delayTimeSlider, ev: 'input', fn: e => handleControlInput(e, audio.setDelayTime, ui.updateDelayTimeDisplay) },
        { el: els.delayFeedbackSlider, ev: 'input', fn: e => handleControlInput(e, audio.setDelayFeedback, ui.updateDelayFeedbackDisplay) },
        { el: els.filterTypeSelect, ev: 'change', fn: e => handleControlInput(e, audio.setFilterType, null) }, // No direct UI update needed here, handled internally
        { el: els.filterFreqSlider, ev: 'input', fn: e => handleControlInput(e, audio.setFilterFrequency, ui.updateFilterFrequencyDisplay) },
        { el: els.filterQSlider, ev: 'input', fn: e => handleControlInput(e, audio.setFilterQ, ui.updateFilterQDisplay) },
        { el: els.filterGainSlider, ev: 'input', fn: e => handleControlInput(e, audio.setFilterGain, ui.updateFilterGainDisplay) },
        // MIDI
        { el: els.midiDeviceSelect, ev: 'change', fn: (event) => midiHandler.selectDevice(event.target.value) },
        // UI Toggles
        { el: els.infoToggleBtn, ev: 'click', fn: toggleSideColumns },
        // Touch Controls (check if they exist)
        { el: els.touchInfoBtn, ev: 'click', fn: toggleSideColumns },
        { el: els.touchMidiBtn, ev: 'click', fn: handleMidiToggleTouch }
    ];

    // Add listeners, skipping if element (el) is null/undefined
    listeners.forEach(({ el, ev, fn }) => addListener(el, ev, fn, el?.id));

    // --- Keyboard Shortcuts (Window Level) ---
    window.addEventListener('keydown', (event) => {
        // Ignore if modifier keys pressed, input focused, or repeating
        if (event.repeat || _isInputFocused(event.target) || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

        const keyActions = {
            ' ': () => audio.playOnce(),       // Spacebar: Play Once
            'i': toggleSideColumns,            // 'i': Toggle Info/Controls panels
            'r': toggleReverse,                // 'r': Toggle Reverse playback
            'k': () => midiRecorder?.toggleUI?.() ?? console.warn("MIDI Recorder UI toggle key pressed, but function not available."), // 'k': Toggle MIDI UI
        };
        // Use event.code for spacebar, event.key otherwise (lowercase)
        const actionKey = event.code === 'Space' ? ' ' : event.key.toLowerCase();

        if (keyActions[actionKey]) { // Check if an action exists for this key
            keyActions[actionKey]();  // Execute the action
            event.preventDefault(); // Prevent default browser behavior (e.g., space scrolling)
        }
        // More complex shortcuts (like slider adjustments) are handled by keyboardShortcuts.js
    });
    console.log("Event listeners setup complete.");
}

// --- Start the application ---
// Use requestAnimationFrame for potentially smoother startup if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // Use requestAnimationFrame to ensure layout is likely complete before potentially intensive init tasks
    requestAnimationFrame(initializeApp);
}
// --- END OF FILE main.js ---