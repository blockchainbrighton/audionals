// --- START OF FILE referenceDisplay.js ---

// --- Reference Content (Formatted as HTML) ---
// Storing the HTML structure directly in a template literal.
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
    </ul>
`;

/**
 * Injects the reference HTML content into the panel if it's empty.
 * This should be called before toggling visibility for the first time.
 * @param {HTMLElement} panelElement - The container element (e.g., #reference-panel).
 */
function initReferencePanel(panelElement) {
    if (!panelElement) {
        console.error("Reference panel element not provided.");
        return;
    }
    // Check if the panel is currently empty (trimming whitespace)
    if (!panelElement.innerHTML.trim()) {
        console.log("Injecting reference HTML content...");
        panelElement.innerHTML = referenceContentHTML;
    }
}

/**
 * Toggles the visibility of the reference panel by adding/removing the 'show' class.
 * Assumes the content has been initialized by initReferencePanel.
 * @param {HTMLElement} panelElement - The container element (e.g., #reference-panel).
 */
function toggleReferencePanel(panelElement) {
    if (!panelElement) {
        console.error("Reference panel element not provided for toggling.");
        return;
    }
    panelElement.classList.toggle('show');
    console.log(`Reference panel visibility toggled. Now visible: ${panelElement.classList.contains('show')}`);
}

// --- Export the functions needed by main.js ---
export { initReferencePanel, toggleReferencePanel };

// --- END OF FILE referenceDisplay.js ---