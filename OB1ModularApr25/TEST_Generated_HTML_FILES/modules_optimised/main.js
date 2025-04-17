// --- START OF FILE main.js ---
console.log("--- main.js evaluating ---");

// --- Module Imports ---
import * as audio from '/content/086f00286fa2c0afc4bf66b9853ccf5bcf0a5f79d517f7e7a0d62150459b50e1i0'; // audioProcessor.js ID
import * as ui from '/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0'; // uiUpdater.js ID
import * as midiHandler from '/content/0f41339bffd53a3a48ce7d08c786e8764ac091afc21d8b640ef03aae0aeed3c9i0'; // midiHandler.js ID
import * as keyboardShortcuts from '/content/665bc1893dea0d8a83d029f120902c2b4fb242b582b44e6f14703c49ec4978f1i0'; // keyboardShortcuts.js ID
import { initReferencePanel } from '/content/0753fec2800a46bd1e06ad3f2bdd3d35a5febeb2976d607c64a8d9326ab74e5fi0'; // referenceDisplay.js ID
import { clamp, _isInputFocused, addListener, createElement } from '/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0'; // utils.js ID
import * as midiRecorder from '/content/e9c3f4bb40fdb85218c94964f1c92bc76293b1ac5bfb92d88ace78a807d9e445i0'; // midiRecorder.js ID

// --- Constants ---
const DEFAULTS = {
    TEMPO: 78,
    PITCH: 1.0,
    VOLUME: 1.0,
    MULTIPLIER: 1
};
const LIMITS = {
    TEMPO: { min: 1, max: 400 },
    PITCH: { min: 0.01, max: 10.0 },
    VOLUME: { min: 0.0, max: 1.5 },
    MULTIPLIER: { min: 1, max: 8 }
};
// Define default prefix only if needed (when using base64)
const IMAGE_PREFIX_IF_BASE64 = 'data:image/jpeg;base64,';
const AUDIO_PREFIX = 'data:audio/opus;base64,';

// --- DOM Element References ---
let appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
    tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
    controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
    midiDeviceSelect, midiStatusSpan, controlsColumn, referenceColumn;


    // Add refs for the new touch buttons if needed elsewhere, though likely not
let touchInfoBtn = null;
let touchMidiBtn = null;


/**
 * Finds and assigns essential DOM elements.
 * Returns false if any critical element is missing.
 */
function findElements() {
    // (findElement code remains the same)
    [
        appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
        tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
        controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
        midiDeviceSelect, midiStatusSpan
    ] = ['app', 'main-image', 'play-once-btn', 'loop-toggle-btn', 'reverse-toggle-btn',
        'tempo-slider', 'pitch-slider', 'volume-slider', 'multiplier-slider',
        'controls-container', 'info-toggle-btn', 'reference-panel', 'error-message',
        'midi-device-select', 'midi-status'
    ].map(id => document.getElementById(id));

    controlsColumn = document.querySelector('.controls-column');
    referenceColumn = document.querySelector('.reference-column');

    // Check required critical elements
    const critical = { appContainer, controlsContainer, errorMessageDiv, mainImage, controlsColumn };
    for (const [name, el] of Object.entries(critical)) {
        if (!el) {
            console.error(`CRITICAL Error: UI element "${name}" not found. Application cannot initialize correctly.`);
            (document.getElementById('app') || document.body).innerHTML =
                `<p style="color:red; padding:20px;">Fatal Error: Required UI element "${name}" missing.</p>`;
            return false;
        }
    }
    // Warn for non-critical elements
    if (!referenceColumn) console.warn("Reference column element missing.");
    if (!midiDeviceSelect || !midiStatusSpan) console.warn("MIDI UI elements missing.");
    if (!tempoSlider || !pitchSlider || !volumeSlider || !multiplierSlider) console.warn("One or more sliders not found.");
    return true;
}


/**
 * Validates a data source, checking it's a non-empty string.
 * @param {string|null|undefined} data - The input data string.
 * @param {string} name - The name of the data source for error messages.
 * @returns {string} The validated data string.
 * @throws {Error} If the data is missing or invalid.
 */
const validateDataSourcePresence = (data, name) => {
     if (!data || typeof data !== 'string' || (typeof data === 'string' && data.trim() === '') || (typeof data === 'string' && data.startsWith("/*"))) {
         throw new Error(`Required data variable "${name}" is missing or invalid (must be a non-empty string).`);
     }
     return data; // Return the valid data string
}

/**
 * Formats a data source string if necessary (applies prefix for non-URL/non-DataURI).
 * @param {string} data - The validated input data string.
 * @param {string} prefix - The prefix to add if needed.
 * @param {string} name - The name of the data source for logging.
 * @returns {string} The potentially formatted data string.
 */
 const formatDataSource = (data, prefix, name) => {
    // Data is assumed to be a valid string here from validateDataSourcePresence
    if (data.startsWith('http://') || data.startsWith('https://')) {
        console.log(`[formatDataSource] Using direct URL for ${name}.`);
        return data;
    }
    if (data.startsWith('data:')) {
        console.log(`[formatDataSource] Using existing Data URI for ${name}.`);
        return data;
    }
    // Apply prefix only if one is provided (handles case where URL doesn't need a prefix)
    if (prefix) {
        console.log(`[formatDataSource] Applying prefix to ${name}. Assuming base64 or similar.`);
        return `${prefix}${data}`;
    } else {
         console.log(`[formatDataSource] No prefix needed or provided for ${name}. Using as is.`);
         return data;
    }
};


// (handleSliderInput, handleLoopToggle, toggleSideColumns, MIDI handlers, getInitialSliderValue remain the same)
// Generic slider handler using shared logic
const handleSliderInput = (e, audioSetter, uiUpdater, parser = parseFloat) => {
    const { value, min, max, id } = e.target;
    if (value === undefined || min === undefined || max === undefined) {
        console.warn(`Slider #${id} missing value, min, or max attribute.`);
        return;
    };
    try {
        const rawVal = parser(value);
        const clamped = clamp(rawVal, parser(min), parser(max));
        if (isNaN(clamped)) throw new Error("Parsed value is NaN");

        typeof audioSetter === 'function' ? audioSetter(clamped) : console.error(`Invalid audioSetter for slider #${id}`);
        typeof uiUpdater === 'function' ? uiUpdater(clamped) : console.error(`Invalid uiUpdater for slider #${id}`);
    } catch (error) {
        console.error(`Error handling slider input for #${id} (value: ${value}):`, error);
        ui.showError("Error processing control input.");
    }
};

const handleLoopToggle = async () => {
    const wasLooping = audio.getLoopingState();
    console.log(`Main: Toggling loop. Current state: ${wasLooping ? 'On' : 'Off'}`);
    try {
        await audio.resumeContext();
        wasLooping ? audio.stopLoop() : await audio.startLoop();
    } catch (err) {
        ui.showError(`Could not toggle loop: ${err?.message || 'Unknown error'}`);
        console.error("Main: Error toggling loop:", err);
    } finally {
        ui.updateLoopButton(audio.getLoopingState());
        console.log(`Main: Loop toggle finished. New state: ${audio.getLoopingState() ? 'On' : 'Off'}`);
    }
};

const toggleSideColumns = () => {
    if (!controlsColumn) return;
    controlsColumn.classList.toggle('hidden');
    referenceColumn?.classList.toggle('hidden'); // Use optional chaining for referenceColumn
    console.log(`Side columns toggled. Controls hidden: ${controlsColumn.classList.contains('hidden')}`);
};

// --- MIDI Callback Functions ---
const handleMidiEvent = (type, noteNumber, velocity) =>
    midiRecorder.handleMidiEvent(type, noteNumber, velocity, Date.now());

const handleNoteOn = (noteNumber, velocity) => {
    const playbackRate = audio.getPlaybackRateForNote(noteNumber);
    if (playbackRate !== undefined) {
        audio.playSampleAtRate(playbackRate, velocity).catch(err => console.error("Error in playSampleAtRate:", err));
    }
    handleMidiEvent('noteon', noteNumber, velocity);
};

const handleNoteOff = (noteNumber, velocity) => handleMidiEvent('noteoff', noteNumber, velocity);

const handleMidiStateChange = state => {
    if (!midiDeviceSelect || !midiStatusSpan) return;
    midiStatusSpan.textContent = state.message || state.status;
    midiStatusSpan.style.color = (state.status === 'error' || state.status === 'unsupported') ? 'var(--error-color)' : '';
    midiDeviceSelect.innerHTML = ''; // Clear previous options

    const placeholderText = state.status === 'ready' && state.devices.length > 0
        ? '-- Select MIDI Device --'
        : (state.status === 'ready' ? '-- No MIDI Inputs --' : state.message || `-- ${state.status} --`);
    const placeholderOption = createElement('option', { value: '', textContent: placeholderText });
    midiDeviceSelect.appendChild(placeholderOption);

    midiDeviceSelect.disabled = !(state.status === 'ready' && state.devices.length > 0);

    state.devices?.forEach(device => {
        midiDeviceSelect.appendChild(createElement('option', { value: device.id, textContent: device.name }));
    });
    midiDeviceSelect.value = ''; // Ensure placeholder is selected
};

// Helper to get initial slider value, applying defaults and limits
const getInitialSliderValue = (slider, defaultValue, { min, max }, parser = parseFloat) => {
    if (!slider) return defaultValue; // Return default if slider doesn't exist
    const rawValue = slider.value; // Get current value from HTML
    const parsedValue = parser(rawValue);
    // Use default if parsing fails or value is empty, otherwise use parsed value
    const valueToClamp = (!isNaN(parsedValue) && rawValue !== '') ? parsedValue : defaultValue;
    const clamped = clamp(valueToClamp, min, max);
    slider.value = clamped; // Update slider element to reflect clamped value
    return clamped;
};

// --- Touch Button Callback ---
// We need a wrapper for the midiRecorder function to check existence
const handleMidiToggleTouch = () => {
  if (midiRecorder && typeof midiRecorder.toggleUI === 'function') {
      console.log("Touch: Toggling MIDI Recorder UI");
      midiRecorder.toggleUI();
  } else {
      console.warn("Touch: midiRecorder.toggleUI function not found.");
      ui.showError("MIDI UI toggle not available."); // Inform user
  }
};



// --- Application Initialization ---
async function initializeApp() {
    console.log("Initializing application...");
    if (!findElements()) return; // Stop if critical elements are missing

    ui.init ? ui.init() : console.error("CRITICAL: ui.init not found!");
    ui.clearError();

    let rawImageDataSource = null;
    let imageSourceType = ''; // 'url' or 'base64'
    let imagePrefixToUse = ''; // Prefix only needed for base64
    let finalImageSrc = '';
    let audioSource = '';

    try {
        // --- Step 1: Determine Image Source ---
        console.log("Checking for image source in HTML...");
        // Check if 'imageUrl' is defined, is a string, and is not empty
        const hasValidImageUrl = typeof imageUrl !== 'undefined'
                              && typeof imageUrl === 'string'
                              && imageUrl.trim() !== '';
        // Check if 'imageBase64' is defined, is a string, and is not empty
        const hasValidImageBase64 = typeof imageBase64 !== 'undefined'
                                 && typeof imageBase64 === 'string'
                                 && imageBase64.trim() !== '';

        if (hasValidImageUrl) {
            rawImageDataSource = imageUrl;
            imageSourceType = 'url';
            imagePrefixToUse = ''; // URLs don't need a prefix
            console.log("Found valid 'imageUrl'. Prioritizing URL.");
        } else if (hasValidImageBase64) {
            rawImageDataSource = imageBase64;
            imageSourceType = 'base64';
            imagePrefixToUse = IMAGE_PREFIX_IF_BASE64; // Base64 might need prefix
            console.log("Found valid 'imageBase64'. Using Base64.");
        } else {
            // Neither is defined or valid
            throw new Error("No valid image source found. Define 'imageUrl' (string URL) or 'imageBase64' (non-empty string) in the HTML script tag.");
        }

        // --- Step 2: Validate the selected image source (already done by checks above) ---
        // validateDataSourcePresence(rawImageDataSource, `selected image source (${imageSourceType})`); // Redundant now

        // --- Step 3: Format the selected image source ---
        console.log(`Formatting ${imageSourceType} image source...`);
        finalImageSrc = formatDataSource(rawImageDataSource, imagePrefixToUse, `image (${imageSourceType})`);

        // --- Step 4: Validate and Format Audio Source ---
        console.log("Validating audio source presence...");
        const rawAudioData = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : null;
        const validAudioData = validateDataSourcePresence(rawAudioData, 'audioBase64_Opus');
        console.log("Formatting audio source...");
        audioSource = formatDataSource(validAudioData, AUDIO_PREFIX, 'audio');

        // --- Step 5: Set Image in UI ---
        console.log("Setting image source in UI.");
        ui.setImageSource(finalImageSrc); // Pass the validated and formatted source

    } catch (error) {
        console.error("Data validation or processing error during initialization:", error);
        ui.showError(`Initialization failed: ${error.message}`);
        ui.disableControls(); // Disable controls on init failure
        return; // Stop initialization
    }

    // --- Initialize Sliders (remains the same) ---
    const initialTempo = getInitialSliderValue(tempoSlider, DEFAULTS.TEMPO, LIMITS.TEMPO, parseInt);
    const initialGlobalPitch = getInitialSliderValue(pitchSlider, DEFAULTS.PITCH, LIMITS.PITCH);
    const initialVolume = getInitialSliderValue(volumeSlider, DEFAULTS.VOLUME, LIMITS.VOLUME);
    const initialMultiplier = getInitialSliderValue(multiplierSlider, DEFAULTS.MULTIPLIER, LIMITS.MULTIPLIER, parseInt);
    console.log(`Initial values - Tempo: ${initialTempo}, Pitch: ${initialGlobalPitch.toFixed(2)}, Volume: ${initialVolume.toFixed(2)}, Multiplier: ${initialMultiplier}`);


    // --- Create Touch Controls ---
    console.log("Creating touch controls...");
    const touchControlsContainer = createElement('div', { className: 'touch-controls' });
    touchInfoBtn = createElement('div', { // Use div, style as button
        id: 'touch-info-btn',
        className: 'touch-button',
        textContent: 'i',
        title: 'Toggle Info Panel (i)' // Tooltip for non-touch?
    });
    touchMidiBtn = createElement('div', {
        id: 'touch-midi-btn',
        className: 'touch-button',
        textContent: 'k',
        title: 'Toggle MIDI UI (k)'
    });

    // Add buttons to container
    touchControlsContainer.appendChild(touchInfoBtn);
    // Only add 'k' button if the function likely exists
    if (midiRecorder && typeof midiRecorder.toggleUI === 'function') {
          touchControlsContainer.appendChild(touchMidiBtn);
    } else {
        console.warn("midiRecorder.toggleUI not found, 'k' touch button will not be added.");
    }


    // Add container to the main app container (or document.body)
    if(appContainer) {
        appContainer.appendChild(touchControlsContainer);
        console.log("Touch controls added to app container.");
    } else {
        document.body.appendChild(touchControlsContainer); // Fallback
        console.warn("App container not found, appending touch controls to body.");
    }


    // --- Initialize MIDI (remains the same) ---
    console.log("Initializing MIDI Handler...");
    midiHandler.init(handleNoteOn, handleNoteOff, handleMidiStateChange);

    // --- Initialize Audio Processor (remains the same) ---
    console.log("Initializing Audio Processor...");
    const audioReady = await audio.init(audioSource, initialTempo, initialGlobalPitch);
    if (!audioReady) {
        console.error("Audio Processor failed to initialize.");
        ui.showError("Failed to initialize audio processor. Please check console.");
        ui.disableControls();
        return;
    }
    audio.setVolume(initialVolume);

    // --- Initialize MIDI Recorder (remains the same) ---
    console.log("Initializing MIDI Recorder...");
    midiRecorder.init(audio);

    // --- Initialize Reference Panel (remains the same) ---
    if (referencePanel && initReferencePanel) {
        initReferencePanel(referencePanel);
        console.log("Reference panel content initialized.");
    } else if (!referencePanel) {
        console.warn("Reference panel element not found, skipping initialization.");
    } else {
         console.warn("initReferencePanel function not found, skipping initialization.");
    }

    // --- Initialize Keyboard Shortcuts (remains the same) ---
    if (keyboardShortcuts.init && tempoSlider && pitchSlider && volumeSlider && multiplierSlider) {
        keyboardShortcuts.init({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider });
         console.log("Keyboard shortcuts initialized.");
    } else {
        console.warn("Cannot initialize keyboard shortcuts: Function or slider elements missing.");
    }

    // --- Setup Event Listeners (remains the same) ---
    setupEventListeners();

    // --- Update UI with Initial Values (remains the same) ---
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
}

// (setupEventListeners function remains the same)
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // Playback controls
    const playbackListeners = [
        [mainImage, 'click', handleLoopToggle, 'mainImage'],
        [playOnceBtn, 'click', () => audio.playOnce(), 'playOnceBtn'],
        [loopToggleBtn, 'click', handleLoopToggle, 'loopToggleBtn'],
        [reverseToggleBtn, 'click', () => {
            audio.resumeContext()
                .then(() => ui.updateReverseButton(audio.toggleReverse()))
                .catch(err => ui.showError(`Could not toggle reverse: ${err?.message || 'Unknown error'}`));
        }, 'reverseToggleBtn']
    ];
    playbackListeners.forEach(args => addListener(...args)); // addListener handles null elements internally

    // Slider controls
    const sliderListeners = [
        [tempoSlider, 'input', e => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt), 'tempoSlider'],
        [pitchSlider, 'input', e => handleSliderInput(e, audio.setGlobalPitch, ui.updatePitchDisplay), 'pitchSlider'],
        [volumeSlider, 'input', e => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay), 'volumeSlider'],
        [multiplierSlider, 'input', e => handleSliderInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt), 'multiplierSlider'] // parseInt for multiplier
    ];
    sliderListeners.forEach(args => addListener(...args));

    // MIDI device selection & info panel toggle
    addListener(midiDeviceSelect, 'change', e => midiHandler.selectDevice(e.target.value), 'midiDeviceSelect');
    addListener(infoToggleBtn, 'click', toggleSideColumns, 'infoToggleBtn');

    // --- Add Listeners for Touch Buttons ---
    if (touchInfoBtn) {
      addListener(touchInfoBtn, 'click', toggleSideColumns, 'touchInfoBtn');
      console.log("Added listener for touch 'i' button.");
    }
    if (touchMidiBtn) { // Button only exists if function exists
      addListener(touchMidiBtn, 'click', handleMidiToggleTouch, 'touchMidiBtn');
      console.log("Added listener for touch 'k' button.");
    }


    // Global keydown listener for shortcuts
    window.addEventListener('keydown', e => {
        // Ignore if modifier keys are pressed, input is focused, or key is repeating
        if (e.repeat || _isInputFocused(e.target) || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
            return;
        }

        const actions = {
            'Space': () => audio.playOnce(),
            'i': toggleSideColumns,
            'r': () => audio.resumeContext()
                .then(() => ui.updateReverseButton(audio.toggleReverse()))
                .catch(err => ui.showError(`Could not toggle reverse: ${err?.message || 'Unknown error'}`)),
            'k': () => midiRecorder.toggleUI() // Assuming midiRecorder has this function
        };

        const key = e.code === 'Space' ? 'Space' : e.key.toLowerCase();

        if (actions[key]) {
            actions[key]();
            e.preventDefault(); // Prevent default browser action (e.g., space scrolling)
        }
    });

    console.log("Event listeners setup complete.");
}


// --- Start the Application ---
// Use DOMContentLoaded to ensure the DOM is ready before finding elements and reading global vars
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOMContentLoaded has already fired
    initializeApp();
}
// --- END OF FILE main.js ---