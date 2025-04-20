// --- START OF FILE main.js ---
// main.js
// import * as audio from "/content/086f00286fa2c0afc4bf66b9853ccf5bcf0a5f79d517f7e7a0d62150459b50e1i0"; // audioProcessor.js
// import * as ui from "/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0"; // uiUpdater.js
// import * as midiHandler from "/content/0f41339bffd53a3a48ce7d08c786e8764ac091afc21d8b640ef03aae0aeed3c9i0"; // midiHandler.js
// import * as keyboardShortcuts from "/content/665bc1893dea0d8a83d029f120902c2b4fb242b582b44e6f14703c49ec4978f1i0"; // keyboardShortcuts.js
// import { initReferencePanel } from "/content/0753fec2800a46bd1e06ad3f2bdd3d35a5febeb2976d607c64a8d9326ab74e5fi0"; // referenceDisplay.js
// import { clamp, _isInputFocused, addListener, createElement } from "/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0"; // utils.js
// import * as midiRecorder from "/content/e9c3f4bb40fdb85218c94964f1c92bc76293b1ac5bfb92d88ace78a807d9e445i0"; // midiRecorder.js

// console.log("--- main.js evaluating ---");


// --- Module Imports ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import * as midiHandler from './midiHandler.js';
import * as keyboardShortcuts from './keyboardShortcuts.js';
import { initReferencePanel } from './referenceDisplay.js';
import { clamp, _isInputFocused, addListener, createElement } from './utils.js';
import * as midiRecorder from './midiRecorder.js';
import * as waveformDisplay from './waveformDisplay.js'; // Import the new module
import * as waveformTrimmer from './waveformTrimmer.js';


// --- Constants ---
const DEFAULTS = {
    TEMPO: 78, PITCH: 1, VOLUME: 1, MULTIPLIER: 1,
    DELAY_TIME: 0, DELAY_FEEDBACK: 0, FILTER_TYPE: 'lowpass',
    FILTER_FREQ: 20000, FILTER_Q: 1, FILTER_GAIN: 0
};
const LIMITS = {
    TEMPO: { min: 1, max: 400 },
    PITCH: { min: 0.01, max: 10 },
    VOLUME: { min: 0, max: 1.5 },
    MULTIPLIER: { min: 1, max: 8 },
    DELAY_TIME: { min: 0, max: 1.0 },
    DELAY_FEEDBACK: { min: 0, max: 0.9 },
    FILTER_FREQ: { min: 10, max: 22000 }, // Approximate
    FILTER_Q: { min: 0.0001, max: 100 },
    FILTER_GAIN: { min: -40, max: 40 } // dB
};
const IMAGE_PREFIX_IF_BASE64 = "data:image/jpeg;base64,";
const AUDIO_PREFIX = "data:audio/opus;base64,";

// --- Module Globals (DOM Elements) ---
let appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
    tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
    controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
    midiDeviceSelect, midiStatusSpan, controlsColumn, referenceColumn,
    touchInfoBtn = null, touchMidiBtn = null,
    // New Effect Elements
    delayTimeSlider, delayFeedbackSlider, filterTypeSelect,
    filterFrequencySlider, filterQSlider, filterGainSlider;


function findElements() {
    const elementIds = [
        "app", "main-image", "play-once-btn", "loop-toggle-btn", "reverse-toggle-btn",
        "tempo-slider", "pitch-slider", "volume-slider", "multiplier-slider",
        "controls-container", "info-toggle-btn", "reference-panel",
        "error-message", "midi-device-select", "midi-status",
        // Add new effect element IDs
        "delay-time-slider", "delay-feedback-slider", "filter-type-select",
        "filter-freq-slider", "filter-q-slider", "filter-gain-slider"
    ];

    const elements = elementIds.map(id => document.getElementById(id));

    // Assign to module globals (consider using an object map instead for cleaner access)
    [
        appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
        tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
        controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
        midiDeviceSelect, midiStatusSpan,
        // New elements
        delayTimeSlider, delayFeedbackSlider, filterTypeSelect,
        filterFrequencySlider, filterQSlider, filterGainSlider
    ] = elements;

    // Find column elements separately
    controlsColumn = document.querySelector(".controls-column");
    referenceColumn = document.querySelector(".reference-column");

    // --- Critical Element Check ---
    const criticalElements = { appContainer, controlsContainer, errorMessageDiv, mainImage, controlsColumn };
    for (const [name, el] of Object.entries(criticalElements)) {
        if (!el) {
            console.error(`CRITICAL Error: UI element "${name}" not found. Application cannot initialize correctly.`);
            (document.getElementById("app") || document.body).innerHTML = `<p style="color:red; padding:20px;">Fatal Error: Required UI element "${name}" missing.</p>`;
            return false; // Initialization cannot proceed
        }
    }

    // --- Warnings for non-critical elements ---
    if (!referenceColumn) console.warn("Reference column element missing.");
    if (!midiDeviceSelect || !midiStatusSpan) console.warn("MIDI UI elements missing.");
    if (!tempoSlider || !pitchSlider || !volumeSlider || !multiplierSlider) console.warn("One or more core sliders not found.");
    if (!delayTimeSlider || !delayFeedbackSlider || !filterTypeSelect || !filterFrequencySlider || !filterQSlider || !filterGainSlider) console.warn("One or more effect control elements not found.");

    console.log("findElement completed.");
    return true; // All critical elements found
}

const validateDataSourcePresence = (dataVar, varName) => {
    if (!dataVar || typeof dataVar !== 'string' || (typeof dataVar === 'string' && dataVar.trim() === '') || (typeof dataVar === 'string' && dataVar.startsWith("/*"))) {
        throw new Error(`Required data variable "${varName}" is missing or invalid (must be a non-empty string).`);
    }
    return dataVar; // Return validated data
};

const formatDataSource = (source, prefix, sourceType) => {
    if (source.startsWith('http://') || source.startsWith('https://')) {
        console.log(`[formatDataSource] Using direct URL for ${sourceType}.`);
        return source;
    } else if (source.startsWith('data:')) {
         console.log(`[formatDataSource] Using existing Data URI for ${sourceType}.`);
         return source;
    } else if (prefix) {
        console.log(`[formatDataSource] Applying prefix to ${sourceType}. Assuming base64 or similar.`);
        return `${prefix}${source}`;
    } else {
        console.log(`[formatDataSource] No prefix needed or provided for ${sourceType}. Using as is.`);
        return source;
    }
};

// Generic slider handler
const handleSliderInput = (event, audioSetter, uiUpdater, parser = parseFloat) => {
    const { value, min, max, id } = event.target;
    if (value !== undefined && min !== undefined && max !== undefined) {
        try {
            const rawValue = parser(value); // Parse first
            const numMin = parser(min);
            const numMax = parser(max);
            const clampedValue = clamp(rawValue, numMin, numMax); // Clamp to numeric min/max

            if (isNaN(clampedValue)) {
                throw new Error("Parsed value is NaN");
            }

            if (typeof audioSetter === 'function') {
                audioSetter(clampedValue); // Call audio module
            } else {
                 console.error(`Invalid audioSetter for slider #${id}`);
            }
            if (typeof uiUpdater === 'function') {
                 uiUpdater(clampedValue); // Call UI updater
            } else {
                console.error(`Invalid uiUpdater for slider #${id}`);
            }
        } catch (err) {
            console.error(`Error handling slider input for #${id} (value: ${value}):`, err);
            ui.showError("Error processing control input.");
        }
    } else {
        console.warn(`Slider #${id} missing value, min, or max attribute.`);
    }
};

// Specific handler for Filter Type Select
const handleFilterTypeChange = (event) => {
    const selectedType = event.target.value;
    if (typeof audio.setFilterType === 'function') {
        audio.setFilterType(selectedType);
        // Maybe disable/enable Filter Gain slider based on type here?
        // e.g., gain is only relevant for peaking, lowshelf, highshelf
        const gainRelevant = ['peaking', 'lowshelf', 'highshelf'].includes(selectedType);
        if (filterGainSlider) {
            filterGainSlider.disabled = !gainRelevant || controlsContainer.classList.contains('disabled'); // Keep disabled state sync
            filterGainSlider.style.opacity = gainRelevant ? '1' : '0.5'; // Visual cue
        }
    } else {
        console.error("audio.setFilterType function not found!");
    }
};


const handleLoopToggle = async () => {
    const isLooping = audio.getLoopingState();
    console.log(`Main: Toggling loop. Current state: ${isLooping ? "On" : "Off"}`);
    try {
        await audio.resumeContext(); // Ensure context is running before action
        if (isLooping) {
            audio.stopLoop();
        } else {
            await audio.startLoop();
        }
    } catch (err) {
        const message = `Could not toggle loop: ${err?.message || "Unknown error"}`;
        ui.showError(message);
        console.error("Main: Error toggling loop:", err);
    } finally {
        // Always update UI button state after attempt
        ui.updateLoopButton(audio.getLoopingState());
        console.log(`Main: Loop toggle finished. New state: ${audio.getLoopingState() ? "On" : "Off"}`);
    }
};

const toggleSideColumns = () => {
    if (controlsColumn) {
        const controlsHidden = controlsColumn.classList.toggle("hidden");
        referenceColumn?.classList.toggle("hidden", controlsHidden); // Keep reference column in sync
        console.log(`Side columns toggled. Controls hidden: ${controlsHidden}`);
    } else {
         console.warn("Cannot toggle side columns: Controls column not found.");
    }
};

// --- MIDI Handling ---
const handleMidiEvent = (type, note, velocity) => {
    // Pass to MIDI recorder if it exists and is initialized
    midiRecorder.handleMidiEvent(type, note, velocity, Date.now());
};

const handleNoteOn = (note, velocity) => {
    const rate = audio.getPlaybackRateForNote(note);
    if (rate !== undefined) {
        // console.log(`MIDI Note On: ${note}, Vel: ${velocity}, Rate: ${rate.toFixed(4)}`);
        audio.playSampleAtRate(rate, velocity).catch(err => console.error("Error in playSampleAtRate:", err));
    } else {
        // console.log(`MIDI Note On: ${note}, Vel: ${velocity} - No playback rate found.`);
    }
    handleMidiEvent('noteon', note, velocity); // Record event
};

const handleNoteOff = (note, velocity) => {
    // Currently, Note Off doesn't stop playback (sample plays fully)
    // console.log(`MIDI Note Off: ${note}, Vel: ${velocity}`);
    handleMidiEvent('noteoff', note, velocity); // Record event
};

const handleMidiStateChange = (state) => {
    if (!midiDeviceSelect || !midiStatusSpan) return; // Skip if UI elements missing

    midiStatusSpan.textContent = state.message || state.status;
    midiStatusSpan.style.color = (state.status === 'error' || state.status === 'unsupported') ? 'var(--error-color)' : ''; // Use CSS var

    // Populate dropdown
    midiDeviceSelect.innerHTML = ""; // Clear existing options
    let defaultOptionText = "";
    if (state.status === 'ready') {
        defaultOptionText = state.devices.length > 0 ? "-- Select MIDI Device --" : "-- No MIDI Inputs --";
    } else {
        defaultOptionText = state.message || `-- ${state.status} --`;
    }
    const defaultOption = createElement('option', { value: "", textContent: defaultOptionText });
    midiDeviceSelect.appendChild(defaultOption);

    midiDeviceSelect.disabled = !(state.status === 'ready' && state.devices.length > 0);

    state.devices?.forEach(device => {
        midiDeviceSelect.appendChild(createElement('option', { value: device.id, textContent: device.name }));
    });

    midiDeviceSelect.value = ""; // Ensure default option is selected
};


// Helper to get initial slider value, clamping and setting the slider
const getInitialSliderValue = (sliderElement, defaultValue, limits, parser = parseFloat) => {
    if (!sliderElement) {
        // console.warn(`Slider element not found for default ${defaultValue}. Using default.`);
        return defaultValue;
    }
    const htmlValue = sliderElement.value;
    const parsedValue = parser(htmlValue);
    // Use default if HTML value is NaN or empty string
    const initialValue = (isNaN(parsedValue) || htmlValue === "") ? defaultValue : parsedValue;
    // Clamp the initial value based on defined limits
    const clampedValue = clamp(initialValue, limits.min, limits.max);
    // Set the slider's value attribute to the clamped value
    sliderElement.value = String(clampedValue);
    // console.log(`Slider ${sliderElement.id}: HTML='${htmlValue}', Parsed=${parsedValue}, Initial=${initialValue}, Clamped=${clampedValue}`);
    return clampedValue;
};


const handleMidiToggleTouch = () => {
    if (midiRecorder && typeof midiRecorder.toggleUI === 'function') {
        console.log("Touch: Toggling MIDI Recorder UI");
        midiRecorder.toggleUI();
    } else {
        console.warn("Touch: midiRecorder.toggleUI function not found.");
        ui.showError("MIDI UI toggle not available.");
    }
}

// --- Main Application Initialization ---
async function initializeApp() {
    console.log("Initializing application...");
    // NOTE: findElements() should be called *after* buildLayout() in the calling code (which it is, implicitly via DOMContentLoaded).
    // If findElements was called *before* layoutBuilder, the canvas wouldn't exist yet.
    if (!findElements()) return; // Stop if critical elements missing

    // Initialize UI module first
    if (ui.init) {
        ui.init();
    } else {
         console.error("CRITICAL: ui.init not found!");
         (document.getElementById("app") || document.body).innerHTML = `<p style="color:red; padding:20px;">Fatal Error: UI Updater module failed to load.</p>`;
         return;
    }
    ui.clearError(); // Clear any previous errors

    // +++ NEW CODE: Initialize Waveform Display +++
    // Init waveform display AFTER the layout is built and elements can be found.
    // Pass the ID of the canvas we created in layoutBuilder.
    if (!waveformDisplay.init('waveform-canvas')) {
        console.warn("Waveform display failed to initialize. Proceeding without it.");
        // Optionally show a less severe UI warning if desired
    }

    // +++ Init Waveform Trimmer +++
    // Pass the ID of the *container* holding the canvas
    if (!waveformTrimmer.init('waveform-container')) {
        console.warn("Waveform trimmer failed to initialize.");
    }

    let imageUrlData = null;
    let imageSourceType = '';
    let imagePrefix = '';
    let finalImageUrl = '';
    let audioData = '';

    // --- Load and Validate Data Sources ---
    try {
        console.log("Checking for image source in HTML...");
        const hasImageUrl = typeof imageUrl === 'string' && imageUrl.trim() !== '';
        const hasImageBase64 = typeof imageBase64 === 'string' && imageBase64.trim() !== '';

        if (hasImageUrl) {
            imageUrlData = imageUrl;
            imageSourceType = 'url';
            imagePrefix = ''; // No prefix for URL
            console.log("Found valid 'imageUrl'. Prioritizing URL.");
        } else if (hasImageBase64) {
            imageUrlData = imageBase64;
            imageSourceType = 'base64';
            imagePrefix = IMAGE_PREFIX_IF_BASE64;
            console.log("Found valid 'imageBase64'. Using Base64.");
        } else {
            throw new Error("No valid image source found. Define 'imageUrl' (string URL) or 'imageBase64' (non-empty string) in the HTML script tag.");
        }

        console.log(`Formatting ${imageSourceType} image source...`);
        finalImageUrl = formatDataSource(imageUrlData, imagePrefix, `image (${imageSourceType})`);

        console.log("Validating audio source presence...");
        const rawAudioData = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : null;
        const validatedAudioData = validateDataSourcePresence(rawAudioData, "audioBase64_Opus");

        console.log("Formatting audio source...");
        audioData = formatDataSource(validatedAudioData, AUDIO_PREFIX, "audio");

        console.log("Setting image source in UI.");
        ui.setImageSource(finalImageUrl); // Set image in UI

    } catch (err) {
        console.error("Data validation or processing error during initialization:", err);
        ui.showError(`Initialization failed: ${err.message}`);
        ui.disableControls(); // Disable controls on data error
        return; // Stop initialization
    }


    // --- Get Initial Control Values ---
    const initialTempo = getInitialSliderValue(tempoSlider, DEFAULTS.TEMPO, LIMITS.TEMPO, parseInt);
    const initialPitch = getInitialSliderValue(pitchSlider, DEFAULTS.PITCH, LIMITS.PITCH);
    const initialVolume = getInitialSliderValue(volumeSlider, DEFAULTS.VOLUME, LIMITS.VOLUME);
    const initialMultiplier = getInitialSliderValue(multiplierSlider, DEFAULTS.MULTIPLIER, LIMITS.MULTIPLIER, parseInt);
    // Effects
    const initialDelayTime = getInitialSliderValue(delayTimeSlider, DEFAULTS.DELAY_TIME, LIMITS.DELAY_TIME);
    const initialDelayFeedback = getInitialSliderValue(delayFeedbackSlider, DEFAULTS.DELAY_FEEDBACK, LIMITS.DELAY_FEEDBACK);
    const initialFilterFreq = getInitialSliderValue(filterFrequencySlider, DEFAULTS.FILTER_FREQ, LIMITS.FILTER_FREQ);
    const initialFilterQ = getInitialSliderValue(filterQSlider, DEFAULTS.FILTER_Q, LIMITS.FILTER_Q);
    const initialFilterGain = getInitialSliderValue(filterGainSlider, DEFAULTS.FILTER_GAIN, LIMITS.FILTER_GAIN);
    // Filter Type (Select) - Get value directly
    const initialFilterType = filterTypeSelect ? filterTypeSelect.value : DEFAULTS.FILTER_TYPE;


    console.log(`Initial values - Tempo: ${initialTempo}, Pitch: ${initialPitch.toFixed(2)}, Volume: ${initialVolume.toFixed(2)}, Multiplier: ${initialMultiplier}`);
    console.log(`Initial FX - Delay Time: ${initialDelayTime.toFixed(2)}, Delay Fbk: ${initialDelayFeedback.toFixed(2)}, Filter Type: ${initialFilterType}, Filter Freq: ${initialFilterFreq.toFixed(0)}, Filter Q: ${initialFilterQ.toFixed(2)}, Filter Gain: ${initialFilterGain.toFixed(1)}`);

    // --- Create Touch Controls ---
    console.log("Creating touch controls...");
    const touchControlsDiv = createElement('div', { className: 'touch-controls' });
    touchInfoBtn = createElement('div', { id: 'touch-info-btn', className: 'touch-button', textContent: 'i', title: 'Toggle Info Panel (i)' });
    touchMidiBtn = createElement('div', { id: 'touch-midi-btn', className: 'touch-button', textContent: 'k', title: 'Toggle MIDI UI (k)' });

    touchControlsDiv.appendChild(touchInfoBtn);
    if (midiRecorder && typeof midiRecorder.toggleUI === 'function') {
        touchControlsDiv.appendChild(touchMidiBtn);
    } else {
        console.warn("midiRecorder.toggleUI not found, 'k' touch button will not be added.");
    }

    if (appContainer) {
        appContainer.appendChild(touchControlsDiv);
         console.log("Touch controls added to app container.");
    } else {
        // Fallback, should not happen if findElements worked
        document.body.appendChild(touchControlsDiv);
        console.warn("App container not found, appending touch controls to body.");
    }


    // --- Initialize Core Modules ---
    console.log("Initializing MIDI Handler...");
    midiHandler.init(handleNoteOn, handleNoteOff, handleMidiStateChange);

    console.log("Initializing Audio Processor...");
    // Pass initial volume to audio init
    if (!await audio.init(audioData, initialTempo, initialPitch, initialVolume)) {
        console.error("Audio Processor failed to initialize.");
        ui.showError("Failed to initialize audio processor. Please check console.");
        ui.disableControls();
        return; // Stop initialization
    }
    // Now set the initial effect parameters AFTER successful init
    audio.setDelayTime(initialDelayTime);
    audio.setDelayFeedback(initialDelayFeedback);
    audio.setFilterType(initialFilterType);
    audio.setFilterFrequency(initialFilterFreq);
    audio.setFilterQ(initialFilterQ);
    audio.setFilterGain(initialFilterGain);
    // Volume was set during audio.init based on initialVolume

    console.log("Initializing MIDI Recorder...");
    if (midiRecorder.init) {
        midiRecorder.init(audio); // Pass audio processor reference
    } else {
        console.warn("MIDI Recorder init function not found.");
    }

    // --- Initialize Optional Modules ---
    if (referencePanel && initReferencePanel) {
        initReferencePanel(referencePanel);
        console.log("Reference panel content initialized.");
    } else if (referencePanel) {
         console.warn("initReferencePanel function not found, skipping initialization.");
    } else {
         console.warn("Reference panel element not found, skipping initialization.");
    }

    // --- Initialize Keyboard Shortcuts ---
    if (keyboardShortcuts.init && tempoSlider && pitchSlider && volumeSlider && multiplierSlider) {
        // Pass only core sliders for now. Effects could be added later.
        keyboardShortcuts.init({
            tempoSlider: tempoSlider,
            pitchSlider: pitchSlider,
            volumeSlider: volumeSlider,
            multiplierSlider: multiplierSlider
            // Could add effect sliders here if shortcuts are desired
        });
        console.log("Keyboard shortcuts initialized.");
    } else {
        console.warn("Cannot initialize keyboard shortcuts: Function or core slider elements missing.");
    }


    // --- Setup Event Listeners ---
    setupEventListeners(); // Setup listeners AFTER modules are initialized

    // --- Set Initial UI State ---
    console.groupCollapsed("Setting Initial UI Values");
    try {
        // Core Params
        ui.updateTempoDisplay(initialTempo);
        ui.updatePitchDisplay(initialPitch);
        ui.updateVolumeDisplay(initialVolume);
        ui.updateScheduleMultiplierDisplay(initialMultiplier);
        // Effects
        ui.updateDelayTimeDisplay(initialDelayTime);
        ui.updateDelayFeedbackDisplay(initialDelayFeedback);
        // No UI update for filter type (select element handles it)
        ui.updateFilterFrequencyDisplay(initialFilterFreq);
        ui.updateFilterQDisplay(initialFilterQ);
        ui.updateFilterGainDisplay(initialFilterGain);
        // Buttons/Toggles
        ui.updateLoopButton(audio.getLoopingState()); // Should be false initially
        ui.updateReverseButton(audio.getReverseState()); // Should be false initially

        // Enable controls now that everything is set up
        ui.enableControls();
        // Re-apply filter gain disabled state if necessary
        handleFilterTypeChange({ target: filterTypeSelect });


    } catch (err) {
        console.error("Error setting initial UI values:", err);
        ui.showError("Problem setting initial control values.");
        ui.disableControls(); // Keep controls disabled if UI update fails
    }
    console.groupEnd();

    console.log("Application initialized successfully.");
}


function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- Buttons & Image ---
    addListener(mainImage, 'click', handleLoopToggle, 'mainImage');
    addListener(playOnceBtn, 'click', () => audio.playOnce(), 'playOnceBtn');
    addListener(loopToggleBtn, 'click', handleLoopToggle, 'loopToggleBtn');
    addListener(reverseToggleBtn, 'click', () => {
        audio.resumeContext()
            .then(() => ui.updateReverseButton(audio.toggleReverse())) // Update UI after toggle attempt
            .catch(err => ui.showError(`Could not toggle reverse: ${err?.message || "Unknown error"}`))
    }, 'reverseToggleBtn');

    // --- Core Sliders ---
    addListener(tempoSlider, 'input', e => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt), 'tempoSlider');
    addListener(pitchSlider, 'input', e => handleSliderInput(e, audio.setGlobalPitch, ui.updatePitchDisplay), 'pitchSlider');
    addListener(volumeSlider, 'input', e => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay), 'volumeSlider');
    addListener(multiplierSlider, 'input', e => handleSliderInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt), 'multiplierSlider');

    // --- Effect Sliders & Select ---
    addListener(delayTimeSlider, 'input', e => handleSliderInput(e, audio.setDelayTime, ui.updateDelayTimeDisplay), 'delayTimeSlider');
    addListener(delayFeedbackSlider, 'input', e => handleSliderInput(e, audio.setDelayFeedback, ui.updateDelayFeedbackDisplay), 'delayFeedbackSlider');
    addListener(filterTypeSelect, 'change', handleFilterTypeChange, 'filterTypeSelect'); // Use 'change' for select
    addListener(filterFrequencySlider, 'input', e => handleSliderInput(e, audio.setFilterFrequency, ui.updateFilterFrequencyDisplay), 'filterFrequencySlider');
    addListener(filterQSlider, 'input', e => handleSliderInput(e, audio.setFilterQ, ui.updateFilterQDisplay), 'filterQSlider');
    addListener(filterGainSlider, 'input', e => handleSliderInput(e, audio.setFilterGain, ui.updateFilterGainDisplay), 'filterGainSlider');


    // --- MIDI Device Selection ---
    addListener(midiDeviceSelect, 'change', (event) => midiHandler.selectDevice(event.target.value), 'midiDeviceSelect');

    // --- UI Toggles ---
    addListener(infoToggleBtn, 'click', toggleSideColumns, 'infoToggleBtn');

    // --- Touch Controls ---
    if (touchInfoBtn) {
        addListener(touchInfoBtn, 'click', toggleSideColumns, 'touchInfoBtn');
        console.log("Added listener for touch 'i' button.");
    }
    if (touchMidiBtn) {
         addListener(touchMidiBtn, 'click', handleMidiToggleTouch, 'touchMidiBtn');
         console.log("Added listener for touch 'k' button.");
    }


    // --- Keyboard Shortcuts (Simple ones handled here) ---
    window.addEventListener('keydown', (event) => {
        // Ignore if modifier keys are pressed, or if typing in an input
        if (event.repeat || _isInputFocused(event.target) || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
            return;
        }

        const keyActions = {
            ' ': () => audio.playOnce(), // Spacebar
            'i': toggleSideColumns,
            'r': () => audio.resumeContext()
                        .then(() => ui.updateReverseButton(audio.toggleReverse()))
                        .catch(err => ui.showError(`Could not toggle reverse: ${err?.message || "Unknown error"}`)),
            'k': () => { // Toggle MIDI Recorder UI
                     if (midiRecorder && typeof midiRecorder.toggleUI === 'function') {
                         midiRecorder.toggleUI();
                     } else {
                         console.warn("MIDI Recorder UI toggle key pressed, but function not available.");
                     }
                 }
        };

        const actionKey = event.code === 'Space' ? ' ' : event.key.toLowerCase();

        if (keyActions[actionKey]) {
            keyActions[actionKey]();
            event.preventDefault(); // Prevent default browser action (e.g., space scrolling)
        }
        // More complex shortcuts are handled by keyboardShortcuts.js
    });

    console.log("Event listeners setup complete.");
}

// --- Start the application ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp(); // DOMContentLoaded has already fired
}
// --- END OF FILE main.js ---