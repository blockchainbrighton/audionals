// --- START OF FILE main.js ---
console.log("--- main.js evaluating ---");
// alert("MAIN.JS EXECUTED");

// --- Module Imports ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
// Import clamp for slider logic and _isInputFocused for keydown checks
import { clamp, _isInputFocused } from './utils.js';
import * as keyboardShortcuts from './keyboardShortcuts.js';
// Assuming initReferencePanel doesn't need toggleReferencePanel directly here
import { initReferencePanel } from './referenceDisplay.js';

// --- DOM Element References ---
const mainImage = document.getElementById('main-image');
const playOnceBtn = document.getElementById('play-once-btn');
const loopToggleBtn = document.getElementById('loop-toggle-btn');
const reverseToggleBtn = document.getElementById('reverse-toggle-btn');
const tempoSlider = document.getElementById('tempo-slider');
const pitchSlider = document.getElementById('pitch-slider');
const volumeSlider = document.getElementById('volume-slider');
const controlsContainer = document.getElementById('controls-container');
const infoToggleBtn = document.getElementById('info-toggle-btn');
const referencePanel = document.getElementById('reference-panel');
// Get references needed for UI initialization (if uiUpdater is refactored later)
const tempoValueSpan = document.getElementById('tempo-value');
const pitchValueSpan = document.getElementById('pitch-value');
const volumeValueSpan = document.getElementById('volume-value');
const errorMessageDiv = document.getElementById('error-message');
// --- Column References ---
const controlsColumn = document.querySelector('.controls-column');
const referenceColumn = document.querySelector('.reference-column');


// --- Early Check for Column Elements ---
if (!controlsColumn) console.error("CRITICAL: Controls column element missing!");
if (!referenceColumn) console.warn("Reference column element missing.");


// --- Helper Function for Data Validation/Formatting ---
/** (Unchanged) */
function validateAndFormatDataSource(base64Data, dataUrlPrefix, variableName) {
    if (typeof base64Data === 'undefined' || !base64Data || (typeof base64Data === 'string' && base64Data.startsWith("/*"))) {
        throw new Error(`${variableName} data is missing or invalid.`);
    }
    return (typeof base64Data === 'string' && base64Data.startsWith('data:'))
           ? base64Data
           : `${dataUrlPrefix}${base64Data}`;
}

// --- Helper Function for Slider Input ---
/** (Unchanged) */
function handleSliderInput(event, audioSetter, uiUpdater, parser = parseFloat) {
    const slider = event.target;
    if (!slider || typeof slider.value === 'undefined' || typeof slider.min === 'undefined' || typeof slider.max === 'undefined') {
        console.error(`Slider element or its properties (value, min, max) missing for ${slider?.id || 'unknown slider'}.`);
        return;
    }
    const rawValue = parser(slider.value);
    const min = parser(slider.min);
    const max = parser(slider.max);
    const clampedValue = clamp(rawValue, min, max);

    if (typeof audioSetter === 'function') {
        audioSetter(clampedValue);
    } else {
        console.error(`Invalid audioSetter provided for ${slider.id}`);
    }

    if (typeof uiUpdater === 'function') {
        uiUpdater(clampedValue);
    } else {
        console.error(`Invalid uiUpdater provided for ${slider.id}`);
    }
}

// --- Shared Async Helper for Loop Toggle ---
/** (Unchanged - Relies on updated audioProcessor API) */
async function handleLoopToggle() {
    const wasLooping = audio.getLoopingState();
    let newState = wasLooping;
    console.log(`Main: Toggling loop. Was looping: ${wasLooping}`);
    try {
        // No need to explicitly resume here if start/stop handle it
        // await audio.resumeContext(); // audioProcessor methods now handle resume

        if (wasLooping) {
            audio.stopLoop();
            // No need to await stopLoop, it's synchronous now
            newState = audio.getLoopingState(); // Should be false
        } else {
            await audio.startLoop(); // startLoop remains async due to potential resume
            newState = audio.getLoopingState(); // Should be true if successful
        }
         console.log(`Main: Loop toggle complete. Now looping: ${newState}`);

    } catch (err) {
        ui.showError(`Could not toggle loop: ${err.message}`);
        console.error("Main: Error toggling loop:", err);
        newState = audio.getLoopingState(); // Re-check state after error
    } finally {
         ui.updateLoopButton(newState);
    }
}

// --- Toggle Function for Side Columns (Using Simplified CSS Approach) ---
/** (Unchanged) */
function toggleSideColumns() {
    if (!controlsColumn || !referenceColumn) {
        console.error("Cannot toggle columns: one or both column elements missing.");
        return;
    }
    // Toggle the 'hidden' class on BOTH columns
    controlsColumn.classList.toggle('hidden');
    referenceColumn.classList.toggle('hidden');

    const areNowHidden = controlsColumn.classList.contains('hidden');
    console.log(`Side columns toggled via function. Now hidden: ${areNowHidden}`);
    // No need to manage .show on referencePanel anymore
}


// --- Initialization ---
async function initializeApp() {
    console.log("Initializing application...");

     const referencePanel = document.getElementById('reference-panel');

    // Pass controls container ref (unchanged)
    if (ui.setControlsContainer) {
        ui.setControlsContainer(controlsContainer);
    } else {
        console.warn("ui.setControlsContainer function not found...");
    }

    ui.clearError();
    if (!controlsColumn) console.warn("Controls column element not found.");
    if (!referenceColumn) console.warn("Reference column element not found.");

    // 1. Validate Input Data (Unchanged)
    let imageSrc;
    let audioSource;
    try {
        imageSrc = validateAndFormatDataSource(
            typeof imageBase64 !== 'undefined' ? imageBase64 : undefined,
            'data:image/jpeg;base64,', 'Image'
        );
        ui.setImageSource(imageSrc);
    } catch (e) {
        ui.showError(`Failed to load image: ${e.message}`);
        console.error("Image loading error:", e);
        if(controlsContainer) ui.disableControls();
        return;
    }
    try {
         audioSource = validateAndFormatDataSource(
             typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : undefined,
             'data:audio/opus;base64,', 'Audio'
         );
    } catch (e) {
         ui.showError(`Invalid audio data provided: ${e.message}`);
         console.error("Audio data error:", e);
         if(controlsContainer) ui.disableControls();
         return;
     }

   // Define the single default tempo constant
   const DEFAULT_TEMPO = 78;

   // 2. Get Initial Tempo/Pitch and Initialize Audio Processor
   console.log("Reading initial slider values for audio init...");
   let initialTempo = DEFAULT_TEMPO; // Use the constant as the initial fallback
   let initialPitch = 1.0; // Default fallback for pitch

   if (tempoSlider) {
       const sliderValue = parseInt(tempoSlider.value, 10);
       // Validate the value read from the slider
       if (!isNaN(sliderValue) && sliderValue > 0 && sliderValue <= 400) { // Added upper bound check matching HTML
           initialTempo = sliderValue; // Use the valid slider value
           console.log(`Using initial tempo from slider: ${initialTempo}`);
       } else {
           console.warn(`Invalid initial tempo value on slider (${tempoSlider.value}), using default ${DEFAULT_TEMPO}.`);
           initialTempo = DEFAULT_TEMPO; // Fallback to default if slider value is bad
           // Optional: Update the slider's value attribute and display if it was invalid
           // tempoSlider.value = DEFAULT_TEMPO;
           // ui.updateTempoDisplay(DEFAULT_TEMPO);
       }
   } else {
       console.warn(`Tempo slider not found, using default initial tempo ${DEFAULT_TEMPO}.`);
       initialTempo = DEFAULT_TEMPO; // Fallback to default if slider missing
   }

   // initialPitch handling remains the same...
   if (pitchSlider) {
       initialPitch = parseFloat(pitchSlider.value);
        if (isNaN(initialPitch) || initialPitch <= 0) {
           console.warn(`Invalid initial pitch value (${pitchSlider.value}), using default 1.0.`);
           initialPitch = 1.0;
       }
   } else {
       console.warn("Pitch slider not found, using default initial pitch 1.0.");
   }


   console.log(`Initializing audio with Tempo: ${initialTempo}, Pitch: ${initialPitch}`);
   // --- Pass the *validated* initial values to audio.init ---
   // audio.init now trusts that these values are reasonable numbers
   const audioReady = await audio.init(audioSource, initialTempo, initialPitch);

    if (!audioReady) {
        console.error("Audio initialization failed. Controls remain disabled.");
        // uiUpdater should handle disabling controls if needed, or do it here
        if(controlsContainer) ui.disableControls();
        return;
    }

    // 3. Setup Post-Audio Initialization (Unchanged)
    console.log("Audio ready. Setting up UI and listeners.");
    ui.enableControls();
    setupEventListeners();

    // Initialize Reference Panel Content EARLY (Unchanged)
    if (referencePanel) {
        initReferencePanel(referencePanel);
        console.log("Reference panel content initialized.");
    } else {
        console.warn("Reference panel element not found during init, content may be missing.");
    }

    // 4. Initialize Keyboard Shortcuts (Unchanged)
    keyboardShortcuts.init({
        tempoSlider: tempoSlider,
        pitchSlider: pitchSlider,
        volumeSlider: volumeSlider,
    });

    // 5. Set Initial UI Values (Unchanged - reads current audio state)
    console.groupCollapsed("Setting Initial UI Values");
    try {
        // Update displays based on the initial values used by audioProcessor/timingManager
        ui.updateTempoDisplay(initialTempo); // Use the value we just determined
        ui.updatePitchDisplay(initialPitch); // Use the value we just determined
        if (volumeSlider) { // Update volume display too
             ui.updateVolumeDisplay(parseFloat(volumeSlider.value));
        }

        // Update button states based on the now initialized audio module state
        ui.updateLoopButton(audio.getLoopingState()); // Should be false initially
        ui.updateReverseButton(audio.getReverseState()); // Should be false initially

    } catch (error) {
         console.error("Error setting initial UI values:", error);
         ui.showError("Problem setting initial control values.");
    }
    console.groupEnd();

    console.log("Application initialized successfully.");
}

// --- Helper for Adding Event Listeners ---
/** (Unchanged) */
function addListener(element, eventName, handler, elementNameForWarn) {
    if (element) {
        element.addEventListener(eventName, handler);
    } else {
        const optionalElements = ['infoToggleBtn', 'referencePanel'];
        if (!optionalElements.includes(elementNameForWarn)) {
            console.warn(`[setupEventListeners] Element "${elementNameForWarn}" not found. Listener not attached.`);
        }
    }
}

// --- Event Listener Setup (SIMPLIFIED INFO BUTTON) ---
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- Control Listeners (Unchanged - rely on audioProcessor API) ---
    addListener(mainImage, 'click', handleLoopToggle, 'mainImage');
    addListener(playOnceBtn, 'click', () => audio.playOnce(), 'playOnceBtn');
    addListener(loopToggleBtn, 'click', handleLoopToggle, 'loopToggleBtn');
    addListener(reverseToggleBtn, 'click', () => {
        // resumeContext might not be strictly necessary here if toggleReverse handles it,
        // but it doesn't hurt if audioProcessor's resumeContext is idempotent.
        audio.resumeContext()
             .then(() => {
                 // toggleReverse now directly returns the new state
                 const newState = audio.toggleReverse();
                 ui.updateReverseButton(newState);
             })
             .catch(err => {
                console.error("Main: Error toggling reverse:", err);
                ui.showError(`Could not toggle reverse: ${err.message}`);
             });
    }, 'reverseToggleBtn');

    // --- Slider Listeners (Unchanged - rely on audioProcessor API) ---
    addListener(tempoSlider, 'input', (e) => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt), 'tempoSlider');
    addListener(pitchSlider, 'input', (e) => handleSliderInput(e, audio.setPitch, ui.updatePitchDisplay), 'pitchSlider');
    addListener(volumeSlider, 'input', (e) => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay), 'volumeSlider');

    // --- Global Keydown Listener (Add 'r' key handling) ---
    window.addEventListener('keydown', (e) => {
        const isInputFocused = typeof _isInputFocused === 'function' ? _isInputFocused(e.target) : false;
        const isButtonFocused = e.target?.tagName?.toLowerCase() === 'button';
        // blockKeyboardControls prevents action when typing in inputs or focusing buttons
        const blockKeyboardControls = isInputFocused || isButtonFocused;

        // Spacebar for Play Once (Keep as is)
        if (e.code === 'Space' && !blockKeyboardControls && !e.repeat) {
            if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                e.preventDefault();
                audio.playOnce();
            }
        }

        // Toggle BOTH Columns with 'i' key (Keep as is)
        if (e.key.toLowerCase() === 'i' && !blockKeyboardControls && !e.repeat) {
            e.preventDefault();
            toggleSideColumns(); // Use the dedicated toggle function
        }

        // --- >>> NEW: Toggle Reverse with 'r' key <<< ---
        if (e.key.toLowerCase() === 'r' && !blockKeyboardControls && !e.repeat) {
            e.preventDefault(); // Prevent potential browser default actions if any
            console.log("Reverse toggle requested via 'r' key"); // Optional: for debugging

            // Exactly the same logic as the button click handler:
            audio.resumeContext()
                 .then(() => {
                     const newState = audio.toggleReverse(); // Call the core audio function
                     ui.updateReverseButton(newState);       // Update the UI button state/text
                 })
                 .catch(err => {
                    // Consistent error handling
                    console.error("Main: Error toggling reverse via key:", err);
                    ui.showError(`Could not toggle reverse: ${err.message}`);
                 });
        }
        // --- >>> END NEW <<< ---

        // Integrate other keyboard shortcuts (Unchanged)
        if (keyboardShortcuts && typeof keyboardShortcuts.handleKeydown === 'function') {
             keyboardShortcuts.handleKeydown(e, blockKeyboardControls);
         }
    });
    // --- Info Button Listener (SIMPLIFIED - relies on CSS for panel content visibility) ---
    addListener(infoToggleBtn, 'click', () => {
        console.log("Info button clicked.");
        // Only need the reference COLUMN now
        if (referenceColumn) {
            referenceColumn.classList.toggle('hidden'); // Just toggle column visibility
            const willBeHidden = referenceColumn.classList.contains('hidden');
            console.log(`Reference column toggled via button. Now hidden: ${willBeHidden}`);
            // CSS handles hiding/showing the panel content inside
        } else {
            console.warn("Info button clicked, but reference column element is missing.");
        }
    }, 'infoToggleBtn');

    console.log("Event listeners setup complete.");
}

// --- Start the Application --- (Unchanged)
if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', initializeApp);
} else {
   initializeApp();
}

// --- END OF FILE main.js ---