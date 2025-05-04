// main.js
console.log("--- main.js evaluating ---");

// --- Module Imports ---
// Import core functionalities
import * as audio from "/content/086f00286fa2c0afc4bf66b9853ccf5bcf0a5f79d517f7e7a0d62150459b50e1i0"; // Audio processing
import * as ui from "/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0"; // UI updates and interactions
import * as midiHandler from "/content/0f41339bffd53a3a48ce7d08c786e8764ac091afc21d8b640ef03aae0aeed3c9i0"; // MIDI device handling
import * as keyboardShortcuts from "/content/665bc1893dea0d8a83d029f120902c2b4fb242b582b44e6f14703c49ec4978f1i0"; // Keyboard shortcut handling
import * as midiRecorder from "/content/e9c3f4bb40fdb85218c94964f1c92bc76293b1ac5bfb92d88ace78a807d9e445i0"; // MIDI recording functionality

// Import specific utilities and components
import { initReferencePanel } from "/content/0753fec2800a46bd1e06ad3f2bdd3d35a5febeb2976d607c64a8d9326ab74e5fi0"; // Function to initialize the reference panel
import { clamp, _isInputFocused, addListener, createElement } from "/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0"; // Utility functions

// --- Constants ---
const DEFAULTS = {
    TEMPO: 78,
    PITCH: 1,
    VOLUME: 1,
    MULTIPLIER: 1,
};

const LIMITS = {
    TEMPO: { min: 1, max: 400 },
    PITCH: { min: 0.01, max: 10 },
    VOLUME: { min: 0, max: 1.5 },
    MULTIPLIER: { min: 1, max: 8 },
};

const IMAGE_PREFIX_IF_BASE64 = "data:image/jpeg;base64,";
const AUDIO_PREFIX = "data:audio/opus;base64,";

// --- Global Variables (DOM Elements & State) ---
let appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn;
let tempoSlider, pitchSlider, volumeSlider, multiplierSlider;
let controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv;
let midiDeviceSelect, midiStatusSpan;
let controlsColumn, referenceColumn;
let touchInfoBtn = null; // Touch button for info toggle
let touchMidiBtn = null; // Touch button for MIDI toggle

// --- DOM Element Discovery ---
/**
 * Finds and assigns all necessary DOM elements to global variables.
 * Performs basic validation to ensure critical elements exist.
 * @returns {boolean} - True if critical elements are found, false otherwise.
 */
function findElements() {
    const elementIds = [
        "app", "main-image", "play-once-btn", "loop-toggle-btn",
        "reverse-toggle-btn", "tempo-slider", "pitch-slider", "volume-slider",
        "multiplier-slider", "controls-container", "info-toggle-btn",
        "reference-panel", "error-message", "midi-device-select", "midi-status"
    ];

    // Assign elements by ID
    [
        appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
        tempoSlider, pitchSlider, volumeSlider, multiplierSlider, controlsContainer,
        infoToggleBtn, referencePanel, errorMessageDiv, midiDeviceSelect, midiStatusSpan
    ] = elementIds.map(id => document.getElementById(id));

    // Assign elements by querySelector
    controlsColumn = document.querySelector(".controls-column");
    referenceColumn = document.querySelector(".reference-column");

    // --- Critical Element Validation ---
    const criticalElements = {
        appContainer: appContainer,
        controlsContainer: controlsContainer,
        errorMessageDiv: errorMessageDiv,
        mainImage: mainImage,
        controlsColumn: controlsColumn, // Assuming controls column is critical
    };

    for (const [name, element] of Object.entries(criticalElements)) {
        if (!element) {
            console.error(`CRITICAL Error: UI element "${name}" not found. Application cannot initialize correctly.`);
            // Display error message directly in the app container or body
            const appRoot = document.getElementById("app") || document.body;
            appRoot.innerHTML = `<p style="color:red; padding:20px;">Fatal Error: Required UI element "${name}" missing.</p>`;
            return false; // Prevent further initialization
        }
    }

    // --- Non-Critical Element Warnings ---
    if (!referenceColumn) {
        console.warn("Reference column element missing.");
    }
    if (!midiDeviceSelect || !midiStatusSpan) {
        console.warn("MIDI UI elements missing.");
    }
    if (!tempoSlider || !pitchSlider || !volumeSlider || !multiplierSlider) {
        console.warn("One or more sliders not found.");
    }

    return true; // All critical elements found
}

// --- Data Handling Utilities ---

/**
 * Validates that a data source variable exists and is a non-empty string.
 * @param {string | null | undefined} dataSource - The data source variable to check.
 * @param {string} variableName - The name of the variable for error messages.
 * @returns {string} - The validated data source string.
 * @throws {Error} - If the data source is missing or invalid.
 */
const validateDataSourcePresence = (dataSource, variableName) => {
    if (!dataSource || typeof dataSource !== 'string' || dataSource.trim() === '' || dataSource.startsWith("/*")) {
        throw new Error(`Required data variable "${variableName}" is missing or invalid (must be a non-empty string).`);
    }
    return dataSource;
};

/**
 * Formats a data source string, adding a prefix if necessary (e.g., for Base64).
 * @param {string} source - The raw data source string (URL or Base64).
 * @param {string | null} prefix - The prefix to add (e.g., "data:audio/opus;base64,"), or null if no prefix needed.
 * @param {string} sourceName - A descriptive name for the source (for logging).
 * @returns {string} - The formatted data source string.
 */
const formatDataSource = (source, prefix, sourceName) => {
    if (source.startsWith("http://") || source.startsWith("https://")) {
        console.log(`[formatDataSource] Using direct URL for ${sourceName}.`);
        return source; // It's already a full URL
    } else if (source.startsWith("data:")) {
        console.log(`[formatDataSource] Using existing Data URI for ${sourceName}.`);
        return source; // It's already a Data URI
    } else if (prefix) {
        console.log(`[formatDataSource] Applying prefix to ${sourceName}. Assuming base64 or similar.`);
        return `${prefix}${source}`; // Add the prefix
    } else {
        console.log(`[formatDataSource] No prefix needed or provided for ${sourceName}. Using as is.`);
        return source; // Use as-is (e.g., potentially relative path, though less likely with this setup)
    }
};


// --- Event Handlers ---

/**
 * Handles input events from slider controls.
 * Parses, clamps, updates audio state, and updates UI display.
 * @param {Event} event - The input event object.
 * @param {Function} audioSetter - Function to call to update the audio module's state.
 * @param {Function} uiUpdater - Function to call to update the UI display.
 * @param {Function} [parser=parseFloat] - Function to parse the slider value (e.g., parseInt, parseFloat).
 */
const handleSliderInput = (event, audioSetter, uiUpdater, parser = parseFloat) => {
    const { value: valueStr, min: minStr, max: maxStr, id } = event.target;

    if (valueStr !== undefined && minStr !== undefined && maxStr !== undefined) {
        try {
            const rawValue = parser(valueStr);
            const clampedValue = clamp(rawValue, parser(minStr), parser(maxStr));

            if (isNaN(clampedValue)) {
                throw new Error("Parsed value is NaN");
            }

            // Update audio state
            if (typeof audioSetter === 'function') {
                audioSetter(clampedValue);
            } else {
                console.error(`Invalid audioSetter for slider #${id}`);
            }

            // Update UI display
            if (typeof uiUpdater === 'function') {
                uiUpdater(clampedValue);
            } else {
                console.error(`Invalid uiUpdater for slider #${id}`);
            }

        } catch (error) {
            console.error(`Error handling slider input for #${id} (value: ${valueStr}):`, error);
            ui.showError("Error processing control input.");
        }
    } else {
        console.warn(`Slider #${id} missing value, min, or max attribute.`);
    }
};

/**
 * Toggles the audio loop state.
 */
const handleLoopToggle = async () => {
    const isCurrentlyLooping = audio.getLoopingState();
    console.log(`Main: Toggling loop. Current state: ${isCurrentlyLooping ? "On" : "Off"}`);
    try {
        await audio.resumeContext(); // Ensure audio context is active
        if (isCurrentlyLooping) {
            audio.stopLoop();
        } else {
            await audio.startLoop(); // Start might involve async loading/prep
        }
    } catch (error) {
        ui.showError(`Could not toggle loop: ${error?.message || "Unknown error"}`);
        console.error("Main: Error toggling loop:", error);
    } finally {
        // Always update the button to reflect the final state
        ui.updateLoopButton(audio.getLoopingState());
        console.log(`Main: Loop toggle finished. New state: ${audio.getLoopingState() ? "On" : "Off"}`);
    }
};

/**
 * Toggles the visibility of the side columns (controls and reference).
 */
const toggleSideColumns = () => {
    if (controlsColumn) {
        controlsColumn.classList.toggle("hidden");
        referenceColumn?.classList.toggle("hidden"); // Toggle reference only if it exists
        console.log(`Side columns toggled. Controls hidden: ${controlsColumn.classList.contains("hidden")}`);
    }
};

/**
 * Records a MIDI event.
 * @param {string} type - 'noteon' or 'noteoff'.
 * @param {number} note - MIDI note number.
 * @param {number} velocity - MIDI velocity (0-127).
 */
const handleMidiEvent = (type, note, velocity) => {
    midiRecorder.handleMidiEvent(type, note, velocity, Date.now());
};

/**
 * Handles MIDI Note On messages.
 * Plays the sample at the corresponding rate and records the event.
 * @param {number} note - MIDI note number.
 * @param {number} velocity - MIDI velocity (0-127).
 */
const handleNoteOn = (note, velocity) => {
    const playbackRate = audio.getPlaybackRateForNote(note);
    if (playbackRate !== undefined) {
        audio.playSampleAtRate(playbackRate, velocity)
            .catch(error => console.error("Error in playSampleAtRate:", error));
    }
    handleMidiEvent("noteon", note, velocity);
};

/**
 * Handles MIDI Note Off messages.
 * Records the event. (Actual sound stop might be handled by the audio module's note management).
 * @param {number} note - MIDI note number.
 * @param {number} velocity - MIDI velocity (0-127).
 */
const handleNoteOff = (note, velocity) => {
    handleMidiEvent("noteoff", note, velocity);
};

/**
 * Updates the MIDI device selection UI based on the current MIDI state.
 * @param {object} state - The MIDI state object { status: string, message?: string, devices?: MIDIInput[] }.
 */
const handleMidiStateChange = (state) => {
    if (!midiDeviceSelect || !midiStatusSpan) return; // Exit if elements are missing

    // Update status message and style
    midiStatusSpan.textContent = state.message || state.status;
    midiStatusSpan.style.color = (state.status === 'error' || state.status === 'unsupported')
        ? 'var(--error-color)'
        : ''; // Reset color otherwise

    // Clear existing options
    midiDeviceSelect.innerHTML = "";

    // Determine placeholder text based on status and device availability
    let placeholderText;
    if (state.status === 'ready') {
        placeholderText = state.devices.length > 0 ? "-- Select MIDI Device --" : "-- No MIDI Inputs --";
    } else {
        placeholderText = state.message || `-- ${state.status} --`; // Use message or status
    }

    // Create and append the placeholder/default option
    const placeholderOption = createElement('option', { value: "", textContent: placeholderText });
    midiDeviceSelect.appendChild(placeholderOption);

    // Enable/disable dropdown based on device availability
    midiDeviceSelect.disabled = !(state.status === 'ready' && state.devices.length > 0);

    // Add options for available devices
    if (state.devices) {
        state.devices.forEach(device => {
            const option = createElement('option', {
                value: device.id,
                textContent: device.name
            });
            midiDeviceSelect.appendChild(option);
        });
    }

    // Reset selection
    midiDeviceSelect.value = "";
};

/**
 * Gets the initial value for a slider, respecting default, limits, and existing value.
 * @param {HTMLInputElement | null} sliderElement - The slider input element.
 * @param {number} defaultValue - The default value if the element has no value or is invalid.
 * @param {object} limits - An object { min: number, max: number }.
 * @param {Function} [parser=parseFloat] - Function to parse the slider value.
 * @returns {number} - The clamped initial value.
 */
const getInitialSliderValue = (sliderElement, defaultValue, limits, parser = parseFloat) => {
    if (!sliderElement) {
        return defaultValue; // Return default if slider element doesn't exist
    }

    const valueStr = sliderElement.value;
    const rawValue = parser(valueStr);

    // Use default value if current value is empty or NaN
    const parsedValue = (isNaN(rawValue) || valueStr === "") ? defaultValue : rawValue;

    // Clamp the value within the defined limits
    const clampedValue = clamp(parsedValue, limits.min, limits.max);

    // Update the slider's value attribute to reflect the clamped value
    sliderElement.value = clampedValue;

    return clampedValue;
};

/**
 * Handles the touch event for toggling the MIDI Recorder UI.
 */
const handleMidiToggleTouch = () => {
    if (midiRecorder && typeof midiRecorder.toggleUI === 'function') {
        console.log("Touch: Toggling MIDI Recorder UI");
        midiRecorder.toggleUI();
    } else {
        console.warn("Touch: midiRecorder.toggleUI function not found.");
        ui.showError("MIDI UI toggle not available.");
    }
};


// --- Application Initialization ---
/**
 * Initializes the entire application.
 * Finds elements, loads data, initializes modules, sets up listeners.
 */
async function initializeApp() {
    console.log("Initializing application...");

    if (!findElements()) {
        // Critical elements missing, findElements already showed error.
        return;
    }

    // Initialize UI module (e.g., setting up error display areas)
    if (ui.init) {
        ui.init();
    } else {
        console.error("CRITICAL: ui.init not found!");
        // Attempt to show error even if ui.init failed
        ui.showError?.("UI Initialization failed.");
        return;
    }
    ui.clearError(); // Start with a clean slate

    let imageSource = null;
    let formattedImageSource = "";
    let audioSourceRaw = null;
    let formattedAudioSource = "";

    // --- Load and Validate Data Sources (Image & Audio) ---
    try {
        console.log("Checking for image source in HTML...");
        // Check for global variables defined in HTML (imageUrl or imageBase64)
        const hasImageUrl = typeof imageUrl === 'string' && imageUrl.trim() !== '';
        const hasImageBase64 = typeof imageBase64 === 'string' && imageBase64.trim() !== '';
        let imageSourceType = "";
        let imagePrefix = "";

        if (hasImageUrl) {
            imageSource = imageUrl;
            imageSourceType = "url";
            imagePrefix = null; // URLs don't need a prefix here
            console.log("Found valid 'imageUrl'. Prioritizing URL.");
        } else if (hasImageBase64) {
            imageSource = imageBase64;
            imageSourceType = "base64";
            imagePrefix = IMAGE_PREFIX_IF_BASE64;
            console.log("Found valid 'imageBase64'. Using Base64.");
        } else {
            // No valid image source found at all
            throw new Error("No valid image source found. Define 'imageUrl' (string URL) or 'imageBase64' (non-empty string) in the HTML script tag.");
        }

        console.log(`Formatting ${imageSourceType} image source...`);
        formattedImageSource = formatDataSource(imageSource, imagePrefix, `image (${imageSourceType})`);

        // Validate and format audio source (expects audioBase64_Opus in HTML)
        console.log("Validating audio source presence...");
        audioSourceRaw = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : null;
        const validatedAudioSource = validateDataSourcePresence(audioSourceRaw, "audioBase64_Opus");

        console.log("Formatting audio source...");
        formattedAudioSource = formatDataSource(validatedAudioSource, AUDIO_PREFIX, "audio");

        // Set the image in the UI early if possible
        console.log("Setting image source in UI.");
        ui.setImageSource(formattedImageSource);

    } catch (error) {
        console.error("Data validation or processing error during initialization:", error);
        ui.showError(`Initialization failed: ${error.message}`);
        ui.disableControls(); // Prevent interaction if data is missing
        return; // Stop initialization
    }

    // --- Initialize Control Values ---
    const initialTempo = getInitialSliderValue(tempoSlider, DEFAULTS.TEMPO, LIMITS.TEMPO, parseInt);
    const initialPitch = getInitialSliderValue(pitchSlider, DEFAULTS.PITCH, LIMITS.PITCH);
    const initialVolume = getInitialSliderValue(volumeSlider, DEFAULTS.VOLUME, LIMITS.VOLUME);
    const initialMultiplier = getInitialSliderValue(multiplierSlider, DEFAULTS.MULTIPLIER, LIMITS.MULTIPLIER, parseInt);

    console.log(`Initial values - Tempo: ${initialTempo}, Pitch: ${initialPitch.toFixed(2)}, Volume: ${initialVolume.toFixed(2)}, Multiplier: ${initialMultiplier}`);

    // --- Create Touch Controls ---
    console.log("Creating touch controls...");
    const touchControlsDiv = createElement('div', { className: 'touch-controls' });

    // Info Toggle Button (i)
    touchInfoBtn = createElement('div', {
        id: 'touch-info-btn',
        className: 'touch-button',
        textContent: 'i',
        title: 'Toggle Info Panel (i)' // Tooltip for accessibility/hover
    });
    touchControlsDiv.appendChild(touchInfoBtn);

    // MIDI Toggle Button (k) - Only add if MIDI Recorder UI toggle is available
    if (midiRecorder && typeof midiRecorder.toggleUI === 'function') {
        touchMidiBtn = createElement('div', {
            id: 'touch-midi-btn',
            className: 'touch-button',
            textContent: 'k',
            title: 'Toggle MIDI UI (k)'
        });
        touchControlsDiv.appendChild(touchMidiBtn);
    } else {
        console.warn("midiRecorder.toggleUI not found, 'k' touch button will not be added.");
    }

    // Append touch controls to the app container or body
    if (appContainer) {
        appContainer.appendChild(touchControlsDiv);
        console.log("Touch controls added to app container.");
    } else {
        // Fallback if appContainer wasn't found (shouldn't happen due to findElements check)
        document.body.appendChild(touchControlsDiv);
        console.warn("App container not found, appending touch controls to body.");
    }

    // --- Initialize Core Modules ---
    console.log("Initializing MIDI Handler...");
    midiHandler.init(handleNoteOn, handleNoteOff, handleMidiStateChange);

    console.log("Initializing Audio Processor...");
    const audioReady = await audio.init(formattedAudioSource, initialTempo, initialPitch);
    if (!audioReady) {
        console.error("Audio Processor failed to initialize.");
        ui.showError("Failed to initialize audio processor. Please check console.");
        ui.disableControls();
        return; // Stop initialization
    }
    // Set initial volume after audio is ready
    audio.setVolume(initialVolume);
    // Set initial multiplier
    audio.setScheduleMultiplier(initialMultiplier);


    console.log("Initializing MIDI Recorder...");
    if (midiRecorder.init) {
        midiRecorder.init(audio); // Pass audio module reference if needed
    } else {
        console.warn("midiRecorder.init not found, skipping initialization.");
    }


    // --- Initialize Optional Components ---
    // Reference Panel
    if (referencePanel && initReferencePanel) {
        initReferencePanel(referencePanel);
        console.log("Reference panel content initialized.");
    } else if (referencePanel) {
        console.warn("initReferencePanel function not found, skipping initialization.");
    } else {
        console.warn("Reference panel element not found, skipping initialization.");
    }

    // Keyboard Shortcuts
    if (keyboardShortcuts.init && tempoSlider && pitchSlider && volumeSlider && multiplierSlider) {
        keyboardShortcuts.init({
            tempoSlider: tempoSlider,
            pitchSlider: pitchSlider,
            volumeSlider: volumeSlider,
            multiplierSlider: multiplierSlider
        });
        console.log("Keyboard shortcuts initialized.");
    } else {
        console.warn("Cannot initialize keyboard shortcuts: Function or slider elements missing.");
    }

    // --- Setup Event Listeners ---
    setupEventListeners();

    // --- Set Initial UI State ---
    console.groupCollapsed("Setting Initial UI Values");
    try {
        ui.updateTempoDisplay(initialTempo);
        ui.updatePitchDisplay(initialPitch);
        ui.updateVolumeDisplay(initialVolume);
        ui.updateScheduleMultiplierDisplay(initialMultiplier);
        ui.updateLoopButton(audio.getLoopingState());
        ui.updateReverseButton(audio.getReverseState());
        ui.enableControls(); // Enable UI controls now that everything is set up
    } catch (error) {
        console.error("Error setting initial UI values:", error);
        ui.showError("Problem setting initial control values.");
        ui.disableControls(); // Disable if UI update fails
    }
    console.groupEnd();

    console.log("Application initialized successfully.");
}

/**
 * Sets up all necessary event listeners for UI elements and window events.
 */
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- Button Click Listeners ---
    const buttonListeners = [
        [mainImage, 'click', handleLoopToggle, "mainImage"], // Click image toggles loop
        [playOnceBtn, 'click', () => audio.playOnce(), "playOnceBtn"],
        [loopToggleBtn, 'click', handleLoopToggle, "loopToggleBtn"],
        [reverseToggleBtn, 'click', () => {
            audio.resumeContext().then(() => {
                const newState = audio.toggleReverse();
                ui.updateReverseButton(newState);
            }).catch(error => {
                ui.showError(`Could not toggle reverse: ${error?.message || "Unknown error"}`);
                console.error("Error toggling reverse:", error);
            });
        }, "reverseToggleBtn"],
        [infoToggleBtn, 'click', toggleSideColumns, "infoToggleBtn"],
    ];
    buttonListeners.forEach(listenerArgs => addListener(...listenerArgs));

    // --- Slider Input Listeners ---
    const sliderListeners = [
        [tempoSlider, 'input', event => handleSliderInput(event, audio.setTempo, ui.updateTempoDisplay, parseInt), "tempoSlider"],
        [pitchSlider, 'input', event => handleSliderInput(event, audio.setGlobalPitch, ui.updatePitchDisplay), "pitchSlider"],
        [volumeSlider, 'input', event => handleSliderInput(event, audio.setVolume, ui.updateVolumeDisplay), "volumeSlider"],
        [multiplierSlider, 'input', event => handleSliderInput(event, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt), "multiplierSlider"],
    ];
    sliderListeners.forEach(listenerArgs => addListener(...listenerArgs));

    // --- MIDI Device Selection Listener ---
    addListener(midiDeviceSelect, 'change', event => midiHandler.selectDevice(event.target.value), "midiDeviceSelect");

    // --- Touch Button Listeners ---
    if (touchInfoBtn) {
        addListener(touchInfoBtn, 'click', toggleSideColumns, "touchInfoBtn");
        console.log("Added listener for touch 'i' button.");
    }
    if (touchMidiBtn) {
        addListener(touchMidiBtn, 'click', handleMidiToggleTouch, "touchMidiBtn");
        console.log("Added listener for touch 'k' button.");
    }

    // --- Global Keyboard Listener ---
    window.addEventListener('keydown', (event) => {
        // Ignore if repeating, input focused, or modifier keys are pressed
        if (event.repeat || _isInputFocused(event.target) || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
            return;
        }

        // Define actions for specific keys
        const keyActions = {
            ' ': () => audio.playOnce(), // Use spacebar for playOnce
            'i': toggleSideColumns,
            'r': () => { // Reverse toggle
                 audio.resumeContext().then(() => {
                     const newState = audio.toggleReverse();
                     ui.updateReverseButton(newState);
                 }).catch(error => {
                     ui.showError(`Could not toggle reverse: ${error?.message || "Unknown error"}`);
                     console.error("Error toggling reverse via key:", error);
                 });
            },
            'k': () => midiRecorder.toggleUI ? midiRecorder.toggleUI() : console.warn("MIDI UI toggle (k) pressed, but function not available."), // MIDI UI toggle
        };

        // Determine the key pressed (use event.code for layout-independent keys like Space)
        const key = event.code === 'Space' ? ' ' : event.key.toLowerCase();

        // Execute the action if defined
        if (keyActions[key]) {
            keyActions[key]();
            event.preventDefault(); // Prevent default browser action (e.g., space scrolling)
        }
    });

    console.log("Event listeners setup complete.");
}

// --- Start the Application ---
// Wait for the DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already ready
    initializeApp();
}