// --- START OF FILE main.js ---
console.log("--- main.js evaluating ---");

// --- Module Imports ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import { clamp, _isInputFocused } from './utils.js';
import * as keyboardShortcuts from './keyboardShortcuts.js';
import { initReferencePanel } from './referenceDisplay.js';

// --- DOM Element References ---
const mainImage = document.getElementById('main-image');
const playOnceBtn = document.getElementById('play-once-btn');
const loopToggleBtn = document.getElementById('loop-toggle-btn');
const reverseToggleBtn = document.getElementById('reverse-toggle-btn');
const tempoSlider = document.getElementById('tempo-slider');
const pitchSlider = document.getElementById('pitch-slider');
const volumeSlider = document.getElementById('volume-slider');
// --- >>> Multiplier Slider Ref <<< ---
const multiplierSlider = document.getElementById('multiplier-slider');
// --- >>> END <<< ---
const controlsContainer = document.getElementById('controls-container');
const infoToggleBtn = document.getElementById('info-toggle-btn');
const referencePanel = document.getElementById('reference-panel');
// Get references needed for UI initialization
const tempoValueSpan = document.getElementById('tempo-value');
const pitchValueSpan = document.getElementById('pitch-value');
const volumeValueSpan = document.getElementById('volume-value');
// --- >>> Multiplier Span Ref <<< ---
const multiplierValueSpan = document.getElementById('multiplier-value');
// --- >>> END <<< ---
const errorMessageDiv = document.getElementById('error-message');
// Column References
const controlsColumn = document.querySelector('.controls-column');
const referenceColumn = document.querySelector('.reference-column');


// --- Early Check for Column Elements ---
if (!controlsColumn) console.error("CRITICAL: Controls column element missing!");
if (!referenceColumn) console.warn("Reference column element missing.");
// --- >>> Check for new slider <<< ---
if (!multiplierSlider) console.warn("Multiplier slider element (#multiplier-slider) not found!");
// --- >>> END <<< ---


// --- Helper Function for Data Validation/Formatting ---
function validateAndFormatDataSource(base64Data, dataUrlPrefix, variableName) {
    // Ensure global variables (imageBase64, audioBase64_Opus) are defined or passed in
    if (typeof base64Data === 'undefined' || !base64Data || (typeof base64Data === 'string' && base64Data.startsWith("/*"))) {
        // Throw specific error if data var itself is undefined vs. invalid content
        if (typeof base64Data === 'undefined') {
             throw new Error(`${variableName} variable is not defined.`);
        }
        throw new Error(`${variableName} data is missing or invalid.`);
    }
    return (typeof base64Data === 'string' && base64Data.startsWith('data:'))
           ? base64Data
           : `${dataUrlPrefix}${base64Data}`;
}

// --- Helper Function for Slider Input ---
function handleSliderInput(event, audioSetter, uiUpdater, parser = parseFloat) {
    const slider = event.target;
    // Check slider exists and has necessary properties
    if (!slider || typeof slider.value === 'undefined' || typeof slider.min === 'undefined' || typeof slider.max === 'undefined') {
        console.error(`Slider element or its properties missing for event target:`, event.target);
        return;
    }
    const rawValue = parser(slider.value);
    const min = parser(slider.min);
    const max = parser(slider.max);
    // Ensure min/max parsing didn't result in NaN
    if (isNaN(rawValue) || isNaN(min) || isNaN(max)) {
        console.error(`Failed to parse value/min/max for slider #${slider.id}. Value: ${slider.value}, Min: ${slider.min}, Max: ${slider.max}`);
        return;
    }

    const clampedValue = clamp(rawValue, min, max);

    // Check functions exist before calling
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
}

// --- Shared Async Helper for Loop Toggle ---
async function handleLoopToggle() {
    const wasLooping = audio.getLoopingState();
    let newState = wasLooping;
    console.log(`Main: Toggling loop. Was looping: ${wasLooping}`);
    try {
        // Ensure context is ready before starting/stopping loop
        await audio.resumeContext(); // Good practice even if internal methods handle it

        if (wasLooping) {
            audio.stopLoop();
            newState = audio.getLoopingState(); // Verify state change
        } else {
            await audio.startLoop(); // Needs await for potential context resume
            newState = audio.getLoopingState(); // Verify state change
        }
         console.log(`Main: Loop toggle complete. Now looping: ${newState}`);

    } catch (err) {
        // Use optional chaining and fallback for error message
        const errorMessage = err?.message || "Unknown error during loop toggle";
        ui.showError(`Could not toggle loop: ${errorMessage}`);
        console.error("Main: Error toggling loop:", err); // Log full error
        newState = audio.getLoopingState(); // Re-check state after error
    } finally {
         // Update UI regardless of success/failure
         ui.updateLoopButton(newState);
    }
}

// --- Toggle Function for Side Columns ---
function toggleSideColumns() {
    if (!controlsColumn || !referenceColumn) {
        console.error("Cannot toggle columns: one or both column elements missing.");
        return;
    }
    controlsColumn.classList.toggle('hidden');
    referenceColumn.classList.toggle('hidden');
    const areNowHidden = controlsColumn.classList.contains('hidden');
    console.log(`Side columns toggled via function. Now hidden: ${areNowHidden}`);
}


// --- Initialization ---
async function initializeApp() {
    console.log("Initializing application...");

    // Ensure crucial DOM elements exist before proceeding far
    if (!controlsContainer || !errorMessageDiv /* || !mainImage etc. */) {
         console.error("Fatal Error: Core UI elements missing. Aborting initialization.");
         // Maybe display a message in the body itself
         document.body.innerHTML = '<p style="color:red; padding:20px;">Application failed to initialize: Core UI elements not found.</p>';
         return;
    }

    // Pass controls container ref
    if (ui.setControlsContainer) {
        ui.setControlsContainer(controlsContainer);
    } else {
        console.warn("ui.setControlsContainer function not found...");
    }

    ui.clearError(); // Clear errors from previous attempts if any

    // 1. Validate Input Data
    let imageSrc;
    let audioSource;
    try {
        // Explicitly check global scope or ensure data is passed correctly
        const imageData = typeof imageBase64 !== 'undefined' ? imageBase64 : undefined;
        imageSrc = validateAndFormatDataSource(imageData, 'data:image/jpeg;base64,', 'Image');
        ui.setImageSource(imageSrc); // Set image source early
    } catch (e) {
        const errorMessage = e?.message || "Unknown image loading error";
        ui.showError(`Failed to load image: ${errorMessage}`);
        console.error("Image loading error details:", e);
        ui.disableControls(); // Disable controls on failure
        return; // Stop initialization
    }

    try {
        const audioData = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : undefined;
        audioSource = validateAndFormatDataSource(audioData, 'data:audio/opus;base64,', 'Audio');
    } catch (e) {
        const errorMessage = e?.message || "Unknown audio data error";
        ui.showError(`Invalid audio data provided: ${errorMessage}`);
        console.error("Audio data error details:", e);
        ui.disableControls(); // Disable controls on failure
        return; // Stop initialization
     }

   // Define the single default tempo constant
   const DEFAULT_TEMPO = 78;

   // 2. Get Initial Tempo/Pitch
   console.log("Reading initial slider values for audio init...");
   let initialTempo = DEFAULT_TEMPO;
   let initialPitch = 1.0;

   if (tempoSlider) {
       const sliderValue = parseInt(tempoSlider.value, 10);
       if (!isNaN(sliderValue) && sliderValue >= parseInt(tempoSlider.min, 10) && sliderValue <= parseInt(tempoSlider.max, 10)) {
           initialTempo = sliderValue;
           console.log(`Using initial tempo from slider: ${initialTempo}`);
       } else {
           console.warn(`Invalid initial tempo on slider (${tempoSlider.value}), using default ${DEFAULT_TEMPO}. Clamping.`);
           initialTempo = clamp(sliderValue, parseInt(tempoSlider.min, 10) || 1, parseInt(tempoSlider.max, 10) || 400);
           tempoSlider.value = initialTempo; // Correct slider if invalid
       }
   } else {
       console.warn(`Tempo slider not found, using default initial tempo ${DEFAULT_TEMPO}.`);
   }

   if (pitchSlider) {
       const sliderValue = parseFloat(pitchSlider.value);
       if (!isNaN(sliderValue) && sliderValue >= parseFloat(pitchSlider.min) && sliderValue <= parseFloat(pitchSlider.max)) {
           initialPitch = sliderValue;
            console.log(`Using initial pitch from slider: ${initialPitch}`);
       } else {
           console.warn(`Invalid initial pitch on slider (${pitchSlider.value}), using default 1.0. Clamping.`);
           initialPitch = clamp(sliderValue, parseFloat(pitchSlider.min) || 0.01, parseFloat(pitchSlider.max) || 10.0);
           pitchSlider.value = initialPitch; // Correct slider if invalid
       }
   } else {
       console.warn("Pitch slider not found, using default initial pitch 1.0.");
   }


   // 3. Initialize Audio Processor
   console.log(`Initializing audio with Tempo: ${initialTempo}, Pitch: ${initialPitch}`);
   const audioReady = await audio.init(audioSource, initialTempo, initialPitch);

    if (!audioReady) {
        console.error("Audio initialization failed. Controls remain disabled.");
        ui.showError("Audio engine failed to initialize."); // Specific error message
        ui.disableControls();
        return; // Stop initialization
    }

    // 4. Setup Post-Audio Initialization
    console.log("Audio ready. Setting up UI and listeners.");
    ui.enableControls(); // Enable controls NOW that audio is ready
    setupEventListeners();

    // Initialize Reference Panel Content
    if (referencePanel) {
        initReferencePanel(referencePanel); // Assumes referencePanel is the correct element
        console.log("Reference panel content initialized.");
    } else {
        console.warn("Reference panel element not found during init, content may be missing.");
    }

    // 5. Initialize Keyboard Shortcuts <<< FIX IS HERE >>>
    // Ensure all slider references are valid before initializing
    if (tempoSlider && pitchSlider && volumeSlider && multiplierSlider) {
        keyboardShortcuts.init({
            tempoSlider: tempoSlider,
            pitchSlider: pitchSlider,
            volumeSlider: volumeSlider,
            multiplierSlider: multiplierSlider, // <<< ADDED multiplierSlider HERE
        });
    } else {
        console.error("Cannot initialize keyboard shortcuts: One or more slider elements are missing.");
        // Optionally disable relevant features or show an error
    }

    // 6. Set Initial UI Values
    console.groupCollapsed("Setting Initial UI Values");
    try {
        // Update displays based on initial audio state (which should match initialTempo/Pitch now)
        ui.updateTempoDisplay(initialTempo);
        ui.updatePitchDisplay(initialPitch);
        // Update volume display based on slider's actual initial value
        if (volumeSlider) ui.updateVolumeDisplay(parseFloat(volumeSlider.value));

        // Initialize Multiplier Slider and Display
        const initialMultiplier = audio.getScheduleMultiplier(); // Get from audio module
        if (multiplierSlider) {
            // Ensure initial value is within slider bounds
             const minMult = parseInt(multiplierSlider.min, 10);
             const maxMult = parseInt(multiplierSlider.max, 10);
             multiplierSlider.value = clamp(initialMultiplier, minMult, maxMult);
        }
        ui.updateScheduleMultiplierDisplay(initialMultiplier); // Update text display

        // Update button states based on audio module state
        ui.updateLoopButton(audio.getLoopingState());
        ui.updateReverseButton(audio.getReverseState());

    } catch (error) {
         console.error("Error setting initial UI values:", error);
         ui.showError("Problem setting initial control values.");
    }
    console.groupEnd();

    console.log("Application initialized successfully.");
} // End of initializeApp

// --- Helper for Adding Event Listeners ---
function addListener(element, eventName, handler, elementNameForWarn) {
    if (element) {
        element.addEventListener(eventName, handler);
    } else {
        // Only warn for critical elements, not optional ones
        const criticalElements = ['mainImage', 'playOnceBtn', 'loopToggleBtn', 'reverseToggleBtn', 'tempoSlider', 'pitchSlider', 'volumeSlider', 'multiplierSlider'];
        if (criticalElements.includes(elementNameForWarn)) {
            console.warn(`[setupEventListeners] CRITICAL Element "${elementNameForWarn}" not found. Listener not attached.`);
        } else {
            // console.log(`[setupEventListeners] Optional element "${elementNameForWarn}" not found.`); // Less noisy
        }
    }
}

// --- Event Listener Setup ---
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- Control Listeners ---
    addListener(mainImage, 'click', handleLoopToggle, 'mainImage');
    addListener(playOnceBtn, 'click', () => audio.playOnce(), 'playOnceBtn');
    addListener(loopToggleBtn, 'click', handleLoopToggle, 'loopToggleBtn');
    addListener(reverseToggleBtn, 'click', () => {
        audio.resumeContext().then(() => {
                 const newState = audio.toggleReverse();
                 ui.updateReverseButton(newState);
             }).catch(err => {
                const errorMessage = err?.message || "Unknown error";
                console.error("Main: Error toggling reverse:", err);
                ui.showError(`Could not toggle reverse: ${errorMessage}`);
             });
    }, 'reverseToggleBtn');

    // --- Slider Listeners ---
    addListener(tempoSlider, 'input', (e) => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt), 'tempoSlider');
    addListener(pitchSlider, 'input', (e) => handleSliderInput(e, audio.setPitch, ui.updatePitchDisplay), 'pitchSlider');
    addListener(volumeSlider, 'input', (e) => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay), 'volumeSlider');
    // <<< Listener for Multiplier Slider >>>
    addListener(multiplierSlider, 'input', (e) => handleSliderInput(
        e,
        audio.setScheduleMultiplier,
        ui.updateScheduleMultiplierDisplay,
        parseInt // Use parseInt for integer values
    ), 'multiplierSlider');
    // <<< END >>>

    // --- Global Keydown Listener ---
    // Keep this simple: it handles specific main.js keys (space, i, r)
    // It relies on the separate listener set up inside keyboardShortcuts.js for other keys
    window.addEventListener('keydown', (e) => {
        // Check focus to avoid interfering with inputs/buttons
        const isInputFocused = _isInputFocused(e.target);
        const isButtonFocused = e.target?.tagName?.toLowerCase() === 'button';
        const blockKeyboardControls = isInputFocused || isButtonFocused;

        // Ignore if repeating or blocked
        if (e.repeat || blockKeyboardControls) {
            return;
        }

        // Spacebar for Play Once (No Modifiers)
        if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            audio.playOnce(); // Consider adding resumeContext here if needed
        }

        // Toggle Side Columns ('i' key, No Modifiers)
        else if (e.key.toLowerCase() === 'i' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            toggleSideColumns();
        }

        // Toggle Reverse ('r' key, No Modifiers)
        else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            console.log("Reverse toggle requested via 'r' key");
            audio.resumeContext().then(() => {
                     const newState = audio.toggleReverse();
                     ui.updateReverseButton(newState);
                 }).catch(err => {
                    const errorMessage = err?.message || "Unknown error";
                    console.error("Main: Error toggling reverse via key:", err);
                    ui.showError(`Could not toggle reverse: ${errorMessage}`);
                 });
        }
        // NOTE: Other keys (Tempo, Pitch, Volume, Mute, Multiplier 1-9)
        // are handled by the listener set up inside keyboardShortcuts.js
    });

    // --- Info Button Listener ---
    addListener(infoToggleBtn, 'click', () => {
        console.log("Info button clicked.");
        if (referenceColumn) {
            referenceColumn.classList.toggle('hidden');
            const willBeHidden = referenceColumn.classList.contains('hidden');
            console.log(`Reference column toggled via button. Now hidden: ${willBeHidden}`);
        } else {
            console.warn("Info button clicked, but reference column element is missing.");
        }
    }, 'infoToggleBtn'); // Mark as optional if it might not exist

    console.log("Event listeners setup complete.");
}

// --- Start the Application ---
// Use DOMContentLoaded to ensure layout and elements are ready
if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', initializeApp);
} else {
   // DOM already loaded
   initializeApp();
}

// --- END OF FILE main.js ---