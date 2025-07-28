/**
 * @file bop-wam-gui.js
 * @description The WAM-compliant Graphical User Interface for the BOP Synth.
 * This file defines a WebComponent (<bop-wam-gui>) that can be loaded by a WAM host.
 * It's responsible for rendering controls and communicating parameter changes
 * to its corresponding BopWamProcessor node.
 */

// In a real WAM environment, a base class like WamGui might be provided by the SDK.
// For clarity, we will extend the standard HTMLElement.
class BopWamGui extends HTMLElement {

    /**
     * This static getter is how the host knows what HTML tag to create for this GUI.
     */
    static get is() { return 'bop-wam-gui'; }

    constructor() {
        super();
        // Create a Shadow DOM to encapsulate styles and markup, preventing conflicts.
        this.attachShadow({ mode: 'open' });
        this.wamNode = null; // This will be set by the host after creation.
    }

    /**
     * The browser calls this method when the element is added to the DOM.
     * This is where we render the UI and set up event listeners.
     */
    connectedCallback() {
        this.render();
        this.attachEventListeners();
        
        // The host provides the wamNode. We listen for state changes from it.
        if (this.wamNode) {
            this.wamNode.addEventListener('wam-state-change', (ev) => {
                this.updateFromState(ev.detail.state);
            });
            // Immediately request the current state to initialize the GUI.
            this.wamNode.getState().then(state => this.updateFromState(state));
        }
    }
    
    /**
     * Creates the synth's HTML structure and styles inside the Shadow DOM.
     */
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: #232323;
                    color: #fff;
                    font-family: 'Segoe UI', sans-serif;
                    padding: 16px;
                    border-radius: 8px;
                    width: 300px;
                }
                .control-group {
                    background: #181818;
                    border: 1px solid #333;
                    border-radius: 8px;
                    padding: 14px;
                    margin-bottom: 12px;
                }
                h3 {
                    color: #03dac6;
                    margin: 0 0 12px 0;
                    font-size: 1.1rem;
                    text-transform: uppercase;
                }
                .control-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 10px;
                    min-height: 28px;
                }
                label {
                    flex: 1;
                    min-width: 80px;
                    font-size: 0.9rem;
                    color: #ccc;
                }
                input[type="range"] {
                    flex: 2;
                    height: 6px;
                    -webkit-appearance: none;
                    background: #333;
                    border-radius: 3px;
                }
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px; height: 18px;
                    border-radius: 50%;
                    background: #bb86fc;
                    cursor: pointer;
                }
                select {
                    flex: 2;
                    background: #333; color: #fff; border: 1px solid #444;
                    border-radius: 4px; padding: 4px;
                }
                .control-value {
                    flex-basis: 45px;
                    text-align: right;
                    font-size: 0.8rem;
                    color: #03dac6;
                    font-family: monospace;
                }
            </style>
            
            <div class="bop-gui-wrapper">
                <div class="control-group">
                    <h3>Synth Envelope</h3>
                    <div class="control-row">
                        <label for="voiceAttack">Attack</label>
                        <input type="range" id="voiceAttack" min="0.001" max="2" step="0.001">
                        <span id="voiceAttack-value" class="control-value"></span>
                    </div>
                    <div class="control-row">
                        <label for="voiceDecay">Decay</label>
                        <input type="range" id="voiceDecay" min="0.01" max="2" step="0.01">
                        <span id="voiceDecay-value" class="control-value"></span>
                    </div>
                    <div class="control-row">
                        <label for="voiceSustain">Sustain</label>
                        <input type="range" id="voiceSustain" min="0" max="1" step="0.01">
                        <span id="voiceSustain-value" class="control-value"></span>
                    </div>
                    <div class="control-row">
                        <label for="voiceRelease">Release</label>
                        <input type="range" id="voiceRelease" min="0.01" max="5" step="0.01">
                        <span id="voiceRelease-value" class="control-value"></span>
                    </div>
                </div>

                <div class="control-group">
                    <h3>Distortion</h3>
                    <div class="control-row">
                        <label for="distortionWet">Wet</label>
                        <input type="range" id="distortionWet" min="0" max="1" step="0.01">
                        <span id="distortionWet-value" class="control-value"></span>
                    </div>
                     <div class="control-row">
                        <label for="distortionAmount">Amount</label>
                        <input type="range" id="distortionAmount" min="0" max="1" step="0.01">
                        <span id="distortionAmount-value" class="control-value"></span>
                    </div>
                </div>

                <div class="control-group">
                    <h3>Delay</h3>
                    <div class="control-row">
                        <label for="delayWet">Wet</label>
                        <input type="range" id="delayWet" min="0" max="1" step="0.01">
                        <span id="delayWet-value" class="control-value"></span>
                    </div>
                    <div class="control-row">
                        <label for="delayTime">Time</label>
                        <select id="delayTime">
                            <option value="16n">16n</option>
                            <option value="8n">8n</option>
                            <option value="8t">8t</option>
                            <option value="4n">4n</option>
                            <option value="4t">4t</option>
                            <option value="2n">2n</option>
                        </select>
                    </div>
                    <div class="control-row">
                        <label for="delayFeedback">Feedback</label>
                        <input type="range" id="delayFeedback" min="0" max="0.95" step="0.01">
                        <span id="delayFeedback-value" class="control-value"></span>
                    </div>
                </div>
                 <div class="control-group">
                    <h3>Reverb</h3>
                    <div class="control-row">
                        <label for="reverbWet">Wet</label>
                        <input type="range" id="reverbWet" min="0" max="1" step="0.01">
                        <span id="reverbWet-value" class="control-value"></span>
                    </div>
                     <div class="control-row">
                        <label for="reverbDecay">Decay</label>
                        <input type="range" id="reverbDecay" min="0.1" max="10" step="0.1">
                        <span id="reverbDecay-value" class="control-value"></span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attaches event listeners to all interactive controls.
     */
    attachEventListeners() {
        this.shadowRoot.querySelectorAll('input, select').forEach(control => {
            control.addEventListener('input', (e) => {
                if (!this.wamNode) return;

                const parameterId = e.target.id;
                let value = e.target.value;

                // For range inputs, convert value to a float
                if (e.target.type === 'range') {
                    value = parseFloat(value);
                }

                // Use the WAM API to send the parameter change to the audio processor.
                this.wamNode.setParamValue(parameterId, value);
                
                // Update the text display for the control
                this.updateValueDisplay(parameterId, value);
            });
        });
    }

    /**
     * Updates the GUI controls to match a given state object.
     * This is called when a preset/patch is loaded.
     * @param {object} state - The state object from the WAM processor's _getState().
     */
    updateFromState(state) {
        if (!state) return;

        // Envelope
        this.setControlValue('voiceAttack', state.polySynth.envelope.attack);
        this.setControlValue('voiceDecay', state.polySynth.envelope.decay);
        this.setControlValue('voiceSustain', state.polySynth.envelope.sustain);
        this.setControlValue('voiceRelease', state.polySynth.envelope.release);
        
        // Distortion
        this.setControlValue('distortionWet', state.distortion.wet);
        this.setControlValue('distortionAmount', state.distortion.distortion);

        // Delay
        this.setControlValue('delayWet', state.delay.wet);
        this.setControlValue('delayTime', state.delay.delayTime);
        this.setControlValue('delayFeedback', state.delay.feedback);

        // Reverb
        this.setControlValue('reverbWet', state.reverb.wet);
        this.setControlValue('reverbDecay', state.reverb.decay);
    }
    
    /**
     * Helper to set a control's value and update its text display.
     * @param {string} id - The ID of the control element.
     * @param {number|string} value - The value to set.
     */
    setControlValue(id, value) {
        const control = this.shadowRoot.querySelector(`#${id}`);
        if (control) {
            control.value = value;
            this.updateValueDisplay(id, value);
        }
    }

    /**
     * Helper to update the text span next to a control.
     * @param {string} id - The ID of the control element.
     * @param {number|string} value - The value to display.
     */
    updateValueDisplay(id, value) {
        const display = this.shadowRoot.querySelector(`#${id}-value`);
        if (display) {
            display.textContent = typeof value === 'number' ? value.toFixed(2) : value;
        }
    }
}

// Register the custom element with the browser so <bop-wam-gui> can be used.
customElements.define(BopWamGui.is, BopWamGui);