// --- START OF FILE referenceDisplay.js ---
// --- Imports for Action Functions ---
import {
    adjustTempoSmallUp, adjustTempoSmallDown, adjustTempoLargeUp, adjustTempoLargeDown,
    adjustPitchLinearUp, adjustPitchLinearDown, adjustPitchSemitoneUp, adjustPitchSemitoneDown,
    multiplyPitchUp, multiplyPitchDown, resetPitch,
    adjustVolumeUp, adjustVolumeDown, toggleMute,
    setMultiplier1, setMultiplier2, setMultiplier3, setMultiplier4,
    setMultiplier5, setMultiplier6, setMultiplier7, setMultiplier8,
    // +++ Import setMultiplier9 +++
    setMultiplier9
} from './keyboardShortcuts.js';

// Import specific actions from main.js
import {
    playOnceAction, toggleLoopAction, toggleReverseAction,
    toggleSideColumnsAction, toggleMidiRecorderUIAction
} from './main.js'; // Assuming these are correctly exported from main.js

// --- Map Action Names (used in HTML data-action) to Functions ---
const actionMap = {
    // Volume & Mute
    'adjustVolumeUp': adjustVolumeUp,
    'adjustVolumeDown': adjustVolumeDown,
    'toggleMute': toggleMute,
    // Tempo
    'adjustTempoSmallUp': adjustTempoSmallUp,
    'adjustTempoSmallDown': adjustTempoSmallDown,
    'adjustTempoLargeUp': adjustTempoLargeUp,
    'adjustTempoLargeDown': adjustTempoLargeDown,
    // Pitch
    'adjustPitchLinearUp': adjustPitchLinearUp,
    'adjustPitchLinearDown': adjustPitchLinearDown,
    'adjustPitchSemitoneUp': adjustPitchSemitoneUp,
    'adjustPitchSemitoneDown': adjustPitchSemitoneDown,
    'multiplyPitchUp': multiplyPitchUp,
    'multiplyPitchDown': multiplyPitchDown,
    'resetPitch': resetPitch,
    // Multiplier
    'setMultiplier1': setMultiplier1,
    'setMultiplier2': setMultiplier2,
    'setMultiplier3': setMultiplier3,
    'setMultiplier4': setMultiplier4,
    'setMultiplier5': setMultiplier5,
    'setMultiplier6': setMultiplier6,
    'setMultiplier7': setMultiplier7,
    'setMultiplier8': setMultiplier8,
    // +++ Add mapping for setMultiplier9 +++
    'setMultiplier9': setMultiplier9,
    // Playback & UI
    'playOnce': playOnceAction,
    'toggleLoop': toggleLoopAction,
    'toggleReverse': toggleReverseAction,
    'toggleInfoPanel': toggleSideColumnsAction,
    'toggleMidiPanel': toggleMidiRecorderUIAction,
};


// --- Updated Reference Content (Formatted as HTML) ---
const referenceContentHTML = `
    <h2>Controls & Shortcuts</h2>
    <p>Use the sliders and buttons in the left panel, or the keyboard shortcuts below. Click/Tap shortcut links to trigger them.</p>

    <!-- Waveform Trimming -->
    <h3 class="topic-waveform">Waveform Trimmer</h3>
    <ul>
        <li>Drag the <span style="color:#ff6b6b;">red handles</span> on the waveform display to select a portion of the audio.</li>
        <li>Playback (looping or once) will only use the trimmed section.</li>
        <li>The handles adjust automatically when 'Reverse' is toggled.</li>
    </ul>

    <h3 class="topic-volume">Volume & Mute</h3>
    <ul>
        <li><span class="shortcut-link" data-action="adjustVolumeUp" role="button" tabindex="0"><code>Arrow Up</code></span>: Increase Volume</li>
        <li><span class="shortcut-link" data-action="adjustVolumeDown" role="button" tabindex="0"><code>Arrow Down</code></span>: Decrease Volume</li>
        <li><span class="shortcut-link" data-action="toggleMute" role="button" tabindex="0"><code>M</code></span>: Toggle Mute/Unmute</li>
    </ul>

    <h3 class="topic-tempo">Tempo (BPM)</h3>
    <ul>
        <li><span class="shortcut-link" data-action="adjustTempoSmallUp" role="button" tabindex="0"><code>Shift + = / +</code></span>: Increase Tempo (+1 BPM)</li>
        <li><span class="shortcut-link" data-action="adjustTempoSmallDown" role="button" tabindex="0"><code>Shift + - / _</code></span>: Decrease Tempo (-1 BPM)</li>
        <li><span class="shortcut-link" data-action="adjustTempoLargeUp" role="button" tabindex="0"><code>Ctrl/Cmd + Shift + = / +</code></span>: Increase Tempo (+10 BPM)</li>
        <li><span class="shortcut-link" data-action="adjustTempoLargeDown" role="button" tabindex="0"><code>Ctrl/Cmd + Shift + - / _</code></span>: Decrease Tempo (-10 BPM)</li>
    </ul>

    <h3 class="topic-pitch">Pitch / Playback Rate</h3>
    <ul>
        <li><span class="shortcut-link" data-action="adjustPitchLinearUp" role="button" tabindex="0"><code>Shift + ] / }</code></span>: Increase Pitch slightly (Linear)</li>
        <li><span class="shortcut-link" data-action="adjustPitchLinearDown" role="button" tabindex="0"><code>Shift + [ / {</code></span>: Decrease Pitch slightly (Linear)</li>
        <li><span class="shortcut-link" data-action="adjustPitchSemitoneUp" role="button" tabindex="0"><code>Ctrl/Cmd + Shift + ] / }</code></span>: Increase Pitch (Semitone Up)</li>
        <li><span class="shortcut-link" data-action="adjustPitchSemitoneDown" role="button" tabindex="0"><code>Ctrl/Cmd + Shift + [ / {</code></span>: Decrease Pitch (Semitone Down)</li>
        <li><span class="shortcut-link" data-action="multiplyPitchUp" role="button" tabindex="0"><code>=</code> (equals)</span>: Double Current Pitch (x2)</li>
        <li><span class="shortcut-link" data-action="multiplyPitchDown" role="button" tabindex="0"><code>-</code> (minus)</span>: Halve Current Pitch (x0.5)</li>
        <li><span class="shortcut-link" data-action="resetPitch" role="button" tabindex="0"><code>0</code> (zero)</span>: Reset Pitch to 1.0x</li>
     </ul>

     <h3 class="topic-multiplier">Loop Schedule Multiplier</h3>
     <ul>
        <li>Determines how many times the sample triggers per metronome beat when looping.</li>
        <!-- +++ Clarify Mapping +++ -->
        <li>Common values: 1=Quarter Notes, 2=Eighths, 4=Sixteenths.</li>
        <li><span class="shortcut-link" data-action="setMultiplier1" role="button" tabindex="0"><code>1</code></span>: Set to 1x</li>
        <li><span class="shortcut-link" data-action="setMultiplier2" role="button" tabindex="0"><code>2</code></span>: Set to 2x</li>
        <li><span class="shortcut-link" data-action="setMultiplier3" role="button" tabindex="0"><code>3</code></span>: Set to 3x</li>
        <li><span class="shortcut-link" data-action="setMultiplier4" role="button" tabindex="0"><code>4</code></span>: Set to 4x</li>
        <li><span class="shortcut-link" data-action="setMultiplier5" role="button" tabindex="0"><code>5</code></span>: Set to 5x</li>
        <li><span class="shortcut-link" data-action="setMultiplier6" role="button" tabindex="0"><code>6</code></span>: Set to 6x</li>
        <li><span class="shortcut-link" data-action="setMultiplier7" role="button" tabindex="0"><code>7</code></span>: Set to 7x</li>
        <li><span class="shortcut-link" data-action="setMultiplier8" role="button" tabindex="0"><code>8</code></span>: Set to 8x</li>
        <!-- +++ Add description for 9 key +++ -->
        <li><span class="shortcut-link" data-action="setMultiplier9" role="button" tabindex="0"><code>9</code></span>: Set to 4x (16ths)</li>
     </ul>

    <!-- Effects Section -->
    <h3 class="topic-effects">Effects (Delay)</h3>
     <ul>
         <li><strong>Delay Time:</strong> Controls the time (in seconds) between the original sound and its echo. Use the 'Delay Time' slider.</li>
         <li><strong>Delay Feedback:</strong> Controls how much of the echo feeds back into the delay line, creating repeating echoes. Higher values mean more repeats. Use the 'Delay Fbk' slider.</li>
         <li><em>No specific keyboard shortcuts for Delay parameters.</em></li>
    </ul>

    <!-- Filter Section -->
    <h3 class="topic-filter">Filter</h3>
     <ul>
         <li><strong>Filter Type:</strong> Select the type of filter (e.g., Lowpass removes high frequencies, Highpass removes low frequencies). Use the 'Filter Type' dropdown.</li>
         <li><strong>Filter Freq:</strong> Sets the cutoff frequency for the filter (in Hz). Use the 'Filter Freq' slider.</li>
         <li><strong>Filter Q:</strong> Controls the resonance or sharpness of the filter effect around the cutoff frequency. Use the 'Filter Q' slider.</li>
         <li><strong>Filter Gain:</strong> (Only applies to 'Peaking', 'Lowshelf', 'Highshelf' types). Boosts or cuts frequencies around the cutoff (in dB). Use the 'Filter Gain' slider.</li>
          <li><em>No specific keyboard shortcuts for Filter parameters.</em></li>
    </ul>

    <h3 class="topic-playback">Playback & UI</h3>
     <ul>
         <li><span class="shortcut-link" data-action="playOnce" role="button" tabindex="0"><code>Spacebar</code></span>: Play sample once (respects trim)</li>
         <li><span class="shortcut-link" data-action="toggleLoop" role="button" tabindex="0"><code>Click Image</code></span>: Toggle Loop playback (respects trim)</li>
         <li><span class="shortcut-link" data-action="toggleReverse" role="button" tabindex="0"><code>R</code></span>: Toggle Reverse Playback</li>
         <li><span class="shortcut-link" data-action="toggleInfoPanel" role="button" tabindex="0"><code>I</code></span>: Show/Hide this Info panel & Controls</li>
         <li><span class="shortcut-link" data-action="toggleMidiPanel" role="button" tabindex="0"><code>K</code></span>: Show/Hide MIDI Recording panel (if available)</li>
    </ul>
     <p><em>(Note: <code>Ctrl</code> can be <code>Cmd</code> on macOS for some shortcuts)</em></p>
`;

// ... (handleClickableShortcut, handleKeypressOnShortcut, initReferencePanel functions remain the same) ...
/**
 * Handles clicks on elements within the reference panel, specifically targeting shortcut links.
 * @param {Event} event - The click event.
 */
function handleClickableShortcut(event) {
    const link = event.target.closest('.shortcut-link');
    if (!link) return; // Exit if click wasn't on a shortcut link or its child

    const actionName = link.dataset.action;
    const actionFunction = actionMap[actionName];

    if (actionFunction) {
        console.log(`Reference Panel: Triggering action "${actionName}" via click.`);
        try {
            actionFunction(); // Call the mapped function
             // Optional: Provide visual feedback
             link.style.transform = 'scale(0.95)';
             link.style.transition = 'transform 0.1s ease-out';
             setTimeout(() => {
                 link.style.transform = '';
                 link.style.transition = '';
             }, 100);

        } catch (error) {
            console.error(`Error executing action "${actionName}" from reference panel:`, error);
            // Optionally show user error via ui.showError
        }
        event.preventDefault(); // Prevent default link behavior if it were an anchor
        event.stopPropagation(); // Stop click from bubbling further if needed
    } else {
        console.warn(`Reference Panel: No action mapped for "${actionName}".`);
    }
}

/**
 * Handles Enter/Space key presses on focused shortcut links for accessibility.
 * @param {KeyboardEvent} event - The keydown event.
 */
function handleKeypressOnShortcut(event) {
     const link = event.target.closest('.shortcut-link');
     // Trigger only if Enter or Space is pressed on a focused shortcut link
     if (link && (event.key === 'Enter' || event.key === ' ')) {
         // Re-use the click handler logic
         handleClickableShortcut(event);
         event.preventDefault(); // Prevent default space scroll or enter form submit
     }
}


/**
 * Injects the reference HTML content and sets up click listeners.
 * @param {HTMLElement} panelElement - The container element (#reference-panel).
 */
function initReferencePanel(panelElement) {
    if (!panelElement) {
        console.error("Reference panel element not provided for init.");
        return;
    }
    // Check if the panel has already been initialized to avoid duplicating listeners
    if (!panelElement.dataset.initialized) {
        console.log("Initializing reference panel content and listeners...");
        panelElement.innerHTML = referenceContentHTML; // Inject content

        // Add event listeners using event delegation on the panel itself
        panelElement.addEventListener('click', handleClickableShortcut);
        panelElement.addEventListener('keydown', handleKeypressOnShortcut); // For keyboard activation

        panelElement.dataset.initialized = 'true'; // Mark as initialized
    } else {
         console.log("Reference panel already initialized.");
    }
}


// --- Export ONLY the init function ---
export { initReferencePanel };

// --- END OF FILE referenceDisplay.js ---