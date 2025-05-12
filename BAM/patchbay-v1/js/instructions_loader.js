// js/instructions_loader.js
document.addEventListener('DOMContentLoaded', () => {
    const instructionsPanel = document.getElementById('instructions-panel');

    if (instructionsPanel) {
        const instructionsHTML = `
            <h3><span class="instr-icon">💡</span>How to Use</h3>

            <h4><span class="instr-icon">🎹</span> Welcome!</h4>
            <p>This is a visual modular synthesizer. Create sound by dragging modules from the Palette and connecting them on the Canvas.</p>

            <h4><span class="instr-icon">📋</span> Palette (Left Panel)</h4>
            <p>Drag modules from the Palette onto the main Canvas area in the center to get started.</p>
            <p>Use the <strong>Canvas Actions</strong> buttons to manage your workspace: Zoom, Tidy modules, or Clear everything.</p>

            <h4><span class="instr-icon">🎛️</span> Modules on Canvas (Center)</h4>
            <ul>
                <li><strong>Move:</strong> Click and drag a module's header (the top bar with its name) to reposition it on the canvas.</li>
                <li><strong>Interact:</strong> Use sliders, knobs, or buttons within each module to change its sound parameters (e.g., an oscillator's frequency, a filter's cutoff, or a gain module's volume).</li>
            </ul>

            <h4><span class="instr-icon">🔗</span> Making Connections</h4>
            <p>Modules typically have colored circular connectors at their bottom:</p>
            <ul>
                <li><span class="instr-icon" style="color:#a07070;">🔴</span> <strong>Output (Reddish):</strong> Sends audio or control signals OUT of the module.</li>
                <li><span class="instr-icon" style="color:#70a070;">🟢</span> <strong>Input (Greenish):</strong> Receives audio or control signals INTO the module.</li>
            </ul>
            <p><strong>To make a connection:</strong></p>
            <ol>
                <li>Click an <strong>output</strong> connector on one module. It will be highlighted with a yellow border, indicating it's selected.</li>
                <li>Then, click an <strong>input</strong> connector on another module. A line will appear, visually representing the connection.</li>
            </ol>
            <p><strong>Connection Types & Logic:</strong></p>
            <ul>
                <li><strong>Audio Signals:</strong> Connect audio outputs (e.g., from Oscillator, LFO, Sample Player) to audio inputs (e.g., on Filter, Gain, or the main Output module). This is how sound flows.</li>
                <li><strong>Modulation:</strong> LFO (Low-Frequency Oscillator) outputs are often used to modulate parameters of other modules. For example, connect an LFO output to an Oscillator's frequency input (this often happens automatically if you connect LFO out to Oscillator in) or a Filter's cutoff frequency input to create sweeping or pulsing effects.</li>
                <li><strong>Trigger Signals:</strong> Sequencer modules typically output trigger signals. Connect a Sequencer's trigger output to a Sample Player's trigger input to make the Sample Player play its sound in time with the sequence.</li>
            </ul>
            <p><strong>Disconnecting:</strong> To remove connections, <strong>right-click</strong> on any connector (input or output). This will remove all connection lines linked to that specific connector.</p>

            <h4><span class="instr-icon">🎧</span> Hearing Sound</h4>
            <p>To actually hear any sound you create, your audio signal chain must eventually be connected to the <strong><code>Output</code></strong> module. This module represents your computer's speakers or headphones.</p>

            <h4><span class="instr-icon">✨</span> Example Signal Chains</h4>
            <p>A basic sound path:</p>
            <p><code>Oscillator (Audio Out)</code> → <code>Filter (Audio In)</code></p>
            <p><code>Filter (Audio Out)</code> → <code>Gain (Audio In)</code></p>
            <p><code>Gain (Audio Out)</code> → <code>Output (Audio In)</code></p>
            <br/>
            <p>Adding modulation:</p>
            <p><code>LFO (Audio Out)</code> → <code>Oscillator (Audio In for Frequency Modulation)</code></p>
            <p><code>LFO (Audio Out)</code> → <code>Filter (Audio In for Cutoff Modulation)</code></p>
            <br/>
            <p>Using a sequencer:</p>
            <p><code>Sequencer (Trigger Out)</code> → <code>Sample Player (Trigger In)</code></p>
            <p><code>Sample Player (Audio Out)</code> → <code>Gain (Audio In)</code> → <code>Output (Audio In)</code></p>

            <p style="margin-top: 30px; font-style: italic;">Experiment with different modules and connections to discover new sounds. Have fun!</p>
        `;
        instructionsPanel.innerHTML = instructionsHTML;
    } else {
        console.error('Instructions panel element not found!');
    }
});