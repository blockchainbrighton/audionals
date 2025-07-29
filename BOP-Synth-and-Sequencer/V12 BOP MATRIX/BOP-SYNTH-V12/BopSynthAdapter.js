/**
 * @file BopSynthAdapter.js
 * @description Provides a clean, high-level interface for a host application (e.g., a sequencer)
 * to control the BOP Synthesizer. It encapsulates the creation and management of the
 * BopSynthLogic and BopSynthUI controllers.
 */

import { BopSynthLogic } from './BopSynthLogic.js';
import { BopSynthUI } from './BopSynthUI.js';

export class BopSynthAdapter {
    /**
     * Creates a new, self-contained BOP Synth instance.
     * @param {object} Tone - The host's instance of the Tone.js library.
     */
    constructor(Tone) {
        if (!Tone) {
            throw new Error('[BopSynthAdapter] A valid Tone.js instance must be provided.');
        }

        // 1. Immediately create the headless logic core.
        // This holds the synth's state and audio engine.
        this.logicController = new BopSynthLogic(Tone);
        this.Tone = Tone;

        // 2. The UI controller is null by default. It will be created on demand.
        this.uiController = null;
        this.uiContainer = null;

        console.log('[BopSynthAdapter] Instance created. Logic core is running.');
    }

    // --- Audio & Connection ---

    /**
     * Connects the synth's master output to a destination AudioNode.
     * @param {AudioNode} destinationNode - The node to connect to (e.g., host's mixer channel).
     */
    connect(destinationNode) {
        const outputNode = this.logicController.modules.synthEngine.getOutputNode();
        outputNode.connect(destinationNode);
        console.log('[BopSynthAdapter] Audio output connected to host destination.');
    }

    // --- Real-time Playback API ---

    /**
     * Triggers a note attack.
     * @param {string|string[]} notes - The note(s) to play (e.g., "C4").
     * @param {number} [velocity=1.0] - The note velocity (0-1).
     * @param {number} [time=now] - The Tone.js time to trigger the attack.
     */
    noteOn(notes, velocity = 1.0, time = this.Tone.now()) {
        this.logicController.modules.synthEngine.noteOn(notes, velocity, time);
    }

    /**
     * Triggers a note release.
     * @param {string|string[]} notes - The note(s) to release.
     * @param {number} [time=now] - The Tone.js time to trigger the release.
     */
    noteOff(notes, time = this.Tone.now()) {
        this.logicController.modules.synthEngine.noteOff(notes, time);
    }

    /**
     * Sets the value of a synth parameter. This is used for automation.
     * @param {string} path - The parameter path (e.g., "filter.frequency").
     * @param {number|string} value - The new value.
     */
    setParameter(path, value) {
        this.logicController.modules.synthEngine.setParameter(path, value);
    }

    /**
     * [NEW METHOD] Triggers the synth's internal sequencer to play its recorded sequence.
     * This is the method called by the host (the BOP Matrix Sequencer).
     */
    playInternalSequence(startTime) { // Receive the time
        this.logicController.eventBus.dispatchEvent(new CustomEvent('transport-play', {
            detail: { startTime } // Pass it in the event detail
        }));
    }

    /**
     * [NEW METHOD] Stops the synth's internal sequencer and releases all sounding notes.
     * This is called by the host when a trigger step is passed or the host stops.
     */
    stopInternalSequence() {
        // The logic controller is listening for this event to stop its recorder's playback.
        this.logicController.eventBus.dispatchEvent(new CustomEvent('transport-stop'));
    }


    // --- UI Management ---

    /**
     * Creates and attaches the synth's UI to a DOM element provided by the host.
     * @param {HTMLElement} containerElement - The element to render the UI into.
     */
    attachUI(containerElement) {
        if (this.uiController) {
            console.warn('[BopSynthAdapter] UI is already attached.');
            return;
        }
        if (!containerElement) {
            throw new Error('[BopSynthAdapter] A valid container element must be provided to attachUI.');
        }

        this.uiContainer = containerElement;

        // --- FIX: Add the complete HTML structure including loop-controls ---
        this.uiContainer.innerHTML = `
            <div class="tabs">
                <button class="tab-button active" data-tab="synth-view">Synthesizer</button>
                <button class="tab-button" data-tab="midi-view">MIDI Editor</button>
            </div>

            <div id="synth-view" class="tab-content active">
                <div id="control-panel"></div>
                <div id="transport-controls"></div>
                
                <!-- NEW: Added loop-controls container -->
                <div id="loop-controls"></div> 
                
                <div class="keyboard-container">
                    <div class="octave-controls">
                        <button id="octaveDown" class="octave-button">Octave -</button>
                        <span id="octaveLabel">Octave: 4</span>
                        <button id="octaveUp" class="octave-button">Octave +</button>
                    </div>
                    <div class="keyboard" id="keyboard"></div>
                </div>
                <div class="status-bar">
                    <div><span class="status-indicator" id="midiInd"></span> <span id="midiStat">MIDI: Not supported</span></div>
                    <div><span class="status-indicator" id="recInd"></span> <span id="recStat">Status: Inactive</span></div>
                </div>
            </div>

            <div id="midi-view" class="tab-content">
                <h3>Piano Roll Editor</h3>
                <div class="piano-roll"><div class="roll-grid" id="rollGrid"></div></div>
            </div>
        `;

        // --- Now all querySelectors will succeed ---
        const uiElements = {
            keyboard: this.uiContainer.querySelector('.keyboard-container'),
            transport: this.uiContainer.querySelector('#transport-controls'),
            controls: this.uiContainer.querySelector('#control-panel'),
            pianoRoll: this.uiContainer.querySelector('#rollGrid'),
            loopControls: this.uiContainer.querySelector('#loop-controls') // Add this line
        };

        this.uiController = new BopSynthUI(this.logicController, uiElements);
        console.log('[BopSynthAdapter] UI attached and rendered.');
        
        // Tab switching logic (unchanged)
        this.uiContainer.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.uiContainer.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.uiContainer.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const tabId = btn.dataset.tab;
                const tabContent = this.uiContainer.querySelector(`#${tabId}`);
                if (tabContent) tabContent.classList.add('active');
            });
        });
    }

    /**
     * Destroys and detaches the synth's UI, freeing up DOM resources.
     * Audio processing continues unaffected.
     */
    detachUI() {
        if (this.uiController) {
            this.uiController.destroy();
            this.uiController = null;
        }
        if (this.uiContainer) {
            this.uiContainer.innerHTML = '';
            this.uiContainer = null;
        }
        console.log('[BopSynthAdapter] UI detached.');
    }

    // --- Preset (Patch) Management ---

    /**
     * Gets the entire current state of the synth as a JSON-serializable object.
     * @returns {object} The synth's patch/preset data.
     */
    getPatch() {
        return this.logicController.modules.saveLoad.getFullState();
    }

    /**
     * Sets the entire state of the synth from a patch object.
     * @param {object} patchData - The patch data object obtained from getPatch().
     */
    setPatch(patchData) {
        this.logicController.modules.saveLoad.loadState(patchData);
        console.log('[BopSynthAdapter] Patch loaded.');
    }

    // --- Lifecycle ---

    /**
     * Completely destroys the synth instance, including UI and audio engine.
     * This should be called when the synth is removed from the host project.
     */
    destroy() {
        this.detachUI();
        if (this.logicController) {
            this.logicController.destroy();
        }
        console.log('[BopSynthAdapter] Instance destroyed.');
    }
}