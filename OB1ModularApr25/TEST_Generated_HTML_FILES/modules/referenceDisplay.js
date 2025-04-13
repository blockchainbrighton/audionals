// --- START OF FILE referenceDisplay.js ---

// --- Reference Content (Formatted as HTML) ---
const referenceContentHTML = `
    <h2>Keyboard Shortcuts</h2>

    <h3>Volume & Mute</h3>
    <ul>
        <li><code>Arrow Up</code>: Increase Volume</li>
        <li><code>Arrow Down</code>: Decrease Volume</li>
        <li><code>M</code>: Toggle Mute/Unmute</li>
    </ul>

    <h3>Tempo (BPM)</h3>
    <ul>
        <li><code>Shift + = / +</code>: Increase Tempo (+1 BPM)</li>
        <li><code>Shift + - / _</code>: Decrease Tempo (-1 BPM)</li>
        <li><code>Ctrl + Shift + = / +</code>: Increase Tempo (+10 BPM)</li>
        <li><code>Ctrl + Shift + - / _</code>: Decrease Tempo (-10 BPM)</li>
    </ul>

    <h3>Pitch / Playback Rate</h3>
    <ul>
        <li><code>Shift + ] / }</code>: Increase Pitch slightly</li>
        <li><code>Shift + [ / {</code>: Decrease Pitch slightly</li>
        <li><code>Ctrl + Shift + ] / }</code>: Increase Pitch significantly</li>
        <li><code>Ctrl + Shift + [ / {</code>: Decrease Pitch significantly</li>
        <li><code>=</code> (equals key): Double Current Pitch (x2)</li>
        <li><code>-</code> (minus key): Halve Current Pitch (x0.5)</li>
        <li><code>0</code> (zero key): Reset Pitch to 1.0x</li>
     </ul>
     <p><em>(Note: <code>Ctrl</code> can be <code>Cmd</code> on macOS for Tempo/Pitch shortcuts)</em></p>

    <h3>Playback</h3>
     <ul>
         <li><code>Spacebar</code>: Play sample once</li>
         <li><code>Click Image</code>: Toggle Loop</li>
         <li><code>R</code>: Toggle Reverse Playback</li>
    </ul>
`;


/**
 * Injects the reference HTML content into the panel ONCE.
 * Uses a data attribute to prevent re-injection.
 * @param {HTMLElement} panelElement - The container element (e.g., #reference-panel).
 */
function initReferencePanel(panelElement) {
    if (!panelElement) {
        console.error("Reference panel element not provided for init.");
        return;
    }
    // Check if the panel has already been initialized using a data attribute
    if (!panelElement.dataset.initialized) {
        console.log("Initializing and injecting reference HTML content...");
        panelElement.innerHTML = referenceContentHTML;
        panelElement.dataset.initialized = 'true'; // Mark as initialized
    } else {
        // console.log("Reference panel already initialized."); // Optional log
    }
}

// --- REMOVED toggleReferencePanel function ---

// --- Export ONLY the needed function ---
export { initReferencePanel };

// --- END OF FILE referenceDisplay.js ---