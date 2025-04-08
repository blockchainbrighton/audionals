import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import { clamp } from './utils.js';

// --- DOM Elements (Direct access needed for listeners) ---
const mainImage = document.getElementById('main-image');
const playOnceBtn = document.getElementById('play-once-btn');
const loopToggleBtn = document.getElementById('loop-toggle-btn');
const reverseToggleBtn = document.getElementById('reverse-toggle-btn');
const tempoSlider = document.getElementById('tempo-slider');
const pitchSlider = document.getElementById('pitch-slider');
const volumeSlider = document.getElementById('volume-slider');

// --- Initialization ---

async function initializeApp() {
    console.log("Initializing application...");
    ui.clearError();

    // 1. Check for provided Base64 data (defined globally in index.html)
    if (typeof imageBase64 === 'undefined' || !imageBase64 || imageBase64.startsWith("/*")) {
        ui.showError("Image data is missing or invalid.");
        ui.disableControls();
        return;
    }
     if (typeof audioBase64_Opus === 'undefined' || !audioBase64_Opus || audioBase64_Opus.startsWith("/*")) {
        ui.showError("Audio data is missing or invalid.");
        ui.disableControls();
        return;
    }

    // 2. Set image source
    try {
        // Basic check if it looks like a data URI, otherwise assume raw base64
        const imageSrc = imageBase64.startsWith('data:image') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
         ui.setImageSource(imageSrc);
    } catch (e) {
         ui.showError("Failed to load image data.");
         console.error("Image loading error:", e);
         ui.disableControls();
         return;
    }


    // 3. Initialize Audio Processor
    const audioReady = await audio.init(audioBase64_Opus);

    if (!audioReady) {
        // Error message should already be shown by audio.init()
        ui.disableControls();
        console.error("Audio initialization failed. Controls remain disabled.");
        return;
    }

    // 4. Audio is ready - Enable controls and set initial UI values
    console.log("Audio ready. Enabling controls.");
    ui.enableControls();
    setupEventListeners();

    // Set initial display values from defaults
    ui.updateTempoDisplay(tempoSlider.value);
    ui.updatePitchDisplay(pitchSlider.value);
    ui.updateVolumeDisplay(volumeSlider.value);
    ui.updateLoopButton(audio.getLoopingState());
    ui.updateReverseButton(audio.getReverseState());

    console.log("Application initialized successfully.");
}

// --- Event Listeners ---

function setupEventListeners() {
    // Image Click -> Toggle Loop
    mainImage.addEventListener('click', () => {
        audio.resumeContext().then(() => { // Ensure context is running
            if (audio.getLoopingState()) {
                audio.stopLoop();
            } else {
                audio.startLoop();
            }
            ui.updateLoopButton(audio.getLoopingState());
        }).catch(err => ui.showError("Could not toggle loop."));
    });

    // Play Once Button
    playOnceBtn.addEventListener('click', () => {
        // audio.playOnce() handles context resume internally now
        audio.playOnce();
    });

    // Loop Toggle Button
    loopToggleBtn.addEventListener('click', () => {
         // audio.start/stopLoop handle context resume internally now
        if (audio.getLoopingState()) {
            audio.stopLoop();
        } else {
            audio.startLoop();
        }
        ui.updateLoopButton(audio.getLoopingState());
    });

    // Reverse Toggle Button
    reverseToggleBtn.addEventListener('click', () => {
        // Ensure context is running before potentially restarting loop
        audio.resumeContext().then(() => {
            const newState = audio.toggleReverse();
            ui.updateReverseButton(newState);
        }).catch(err => ui.showError("Could not toggle reverse."));
    });

    // Tempo Slider
    tempoSlider.addEventListener('input', (e) => {
        const bpm = parseInt(e.target.value, 10);
        const clampedBpm = clamp(bpm, parseInt(tempoSlider.min, 10), parseInt(tempoSlider.max, 10));
        audio.setTempo(clampedBpm);
        ui.updateTempoDisplay(clampedBpm);
    });

    // Pitch Slider
    pitchSlider.addEventListener('input', (e) => {
        const rate = parseFloat(e.target.value);
        const clampedRate = clamp(rate, parseFloat(pitchSlider.min), parseFloat(pitchSlider.max));
        audio.setPitch(clampedRate);
        ui.updatePitchDisplay(clampedRate);
    });

    // Volume Slider
    volumeSlider.addEventListener('input', (e) => {
        const level = parseFloat(e.target.value);
         const clampedLevel = clamp(level, parseFloat(volumeSlider.min), parseFloat(volumeSlider.max));
        audio.setVolume(clampedLevel);
        ui.updateVolumeDisplay(clampedLevel);
    });

    // Spacebar for Play Once
    window.addEventListener('keydown', (e) => {
        // Ignore if focused on an input/button or if modifier keys are pressed
        const targetTagName = e.target.tagName.toLowerCase();
        if (e.code === 'Space' && targetTagName !== 'input' && targetTagName !== 'button' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault(); // Prevent default spacebar action (scrolling)
             // audio.playOnce() handles context resume internally now
            audio.playOnce();
        }
    });

     // Initial interaction resume (fallback / alternative)
     /*
     const initialInteractionHandler = () => {
         if (audio.getAudioContextState() === 'suspended') {
             audio.resumeContext().then(() => {
                 console.log("AudioContext resumed via initial interaction.");
             }).catch(err => console.error("Error resuming context on initial interaction:", err));
         }
         // Remove this listener after first interaction
         document.body.removeEventListener('click', initialInteractionHandler, true);
         document.body.removeEventListener('keydown', initialInteractionHandler, true);
     };
     document.body.addEventListener('click', initialInteractionHandler, { once: true, capture: true });
     document.body.addEventListener('keydown', initialInteractionHandler, { once: true, capture: true });
     */
}

// --- Start the App ---
initializeApp();