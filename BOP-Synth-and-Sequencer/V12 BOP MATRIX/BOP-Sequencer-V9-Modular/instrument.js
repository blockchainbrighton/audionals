// BOP-Sequencer-V9-Modular/instrument.js

import { projectState, runtimeState, getCurrentSequence } from './state.js';
import * as config from './config.js';
import { setLoaderStatus } from './ui.js';

// --- NEW, FUTURE-PROOF IMPORTS ---
import { BopSynthLogic } from '../BOP-SYNTH-V12/BopSynthLogic.js';
// We import the component definition, which automatically registers <bop-synth-ui>
import '../BOP-SYNTH-V12/BopSynthUIComponent.js';

let activeInstrumentLogic = null; 

export function createInstrumentForChannel(seqIndex, chanIndex) {
    try {
        setLoaderStatus('Loading Instrument...');

        const logic = new BopSynthLogic(runtimeState.Tone);
        
        const synthOutputNode = logic.modules.synthEngine.getOutputNode();
        if(synthOutputNode && typeof synthOutputNode.connect === 'function') {
            synthOutputNode.connect(runtimeState.Tone.getDestination());
        }

        const instrumentId = `inst-${projectState.nextInstrumentId++}`;
        runtimeState.instrumentRack[instrumentId] = {
            id: instrumentId,
            logic: logic,
            // The UI is no longer stored here; it's managed by the DOM element
        };
        
        const channel = projectState.sequences[seqIndex].channels[chanIndex];
        channel.instrumentId = instrumentId;

        if (channel.patch) {
            logic.modules.saveLoad.loadState(channel.patch);
        }

        setLoaderStatus('Instrument Loaded.', false);
        return instrumentId;

    } catch (e) {
        setLoaderStatus('Failed to load instrument.', true);
        console.error(e);
        return null;
    }
}

export function openSynthUI(chanIndex) {
    const channel = getCurrentSequence().channels[chanIndex];
    if (!channel || !channel.instrumentId) return;

    const instrument = runtimeState.instrumentRack[channel.instrumentId];
    if (!instrument) {
        console.error(`Cannot open modal: Instrument ${channel.instrumentId} not found.`);
        return;
    }
    activeInstrumentLogic = instrument.logic; 

    const modalContainer = document.getElementById('synth-modal-container');
    
    // --- THIS IS THE NEW, SIMPLIFIED LOGIC ---
    // 1. Create an instance of our new custom element.
    const synthElement = document.createElement('bop-synth-ui');

    // 2. Connect the UI element to the instrument's logic core.
    synthElement.connect(instrument.logic);

    // 3. Re-wire its controls for sequencer integration.
    // We pass the element's shadowRoot so the function can find the buttons inside it.
    reWireSynthControls(synthElement.shadowRoot, instrument.logic.eventBus);
    
    // 4. Build the modal content around our self-contained component.
    const modalContent = document.createElement('div');
    modalContent.className = 'synth-modal-content';
    modalContent.appendChild(synthElement);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close & Save Patch';
    closeButton.className = 'close-button';
    closeButton.onclick = () => {
        channel.patch = instrument.logic.modules.saveLoad.getFullState();
        modalContainer.style.display = 'none';
        modalContainer.innerHTML = ''; // This automatically triggers disconnectedCallback in the component for cleanup.
        activeInstrumentLogic = null;
    };
    modalContent.appendChild(closeButton);

    // 5. Display the modal.
    modalContainer.innerHTML = '';
    modalContainer.appendChild(modalContent);
    modalContainer.style.display = 'flex';
}

function reWireSynthControls(shadowRoot, eventBus) {
    // This function now queries for elements inside the component's Shadow DOM
    const recordBtn = shadowRoot.querySelector('.record-btn');
    const playBtn = shadowRoot.querySelector('.play-btn');
    const stopBtn = shadowRoot.querySelector('.stop-btn');
    const clearBtn = shadowRoot.querySelector('.clear-btn');

    if (!recordBtn) {
        console.error("Could not find transport buttons inside synth component's shadow DOM.");
        return;
    }

    recordBtn.onclick = e => {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('bop:request-record-toggle'));
    };
    playBtn.onclick = e => {
        e.preventDefault();
        document.getElementById('playSequenceBtn').click();
    };
    stopBtn.onclick = e => {
        e.preventDefault();
        document.getElementById('stopBtn').click();
    };
    clearBtn.onclick = e => {
        e.preventDefault();
        if (confirm('Clear all steps for this instrument track?')) {
            document.dispatchEvent(new CustomEvent('bop:request-clear', { 
                detail: { instrumentId: activeInstrumentLogic.id } 
            }));
        }
    };

    eventBus.addEventListener('keyboard-note-on', e => {
        if (activeInstrumentLogic) {
            const { note, velocity } = e.detail;
            activeInstrumentLogic.modules.synthEngine.noteOn(note, velocity);
            
            if (projectState.isRecording) {
                const stepIndex = runtimeState.currentStepIndex;
                const sequence = getCurrentSequence();
                const channel = sequence.channels.find(c => c.instrumentId === activeInstrumentLogic.id);
                if (channel && stepIndex >= 0 && stepIndex < config.TOTAL_STEPS) {
                    channel.steps[stepIndex] = true;
                    // ... (logic to visually update the step in the main sequencer UI)
                }
            }
        }
    });

    eventBus.addEventListener('keyboard-note-off', e => {
        if (activeInstrumentLogic) {
            activeInstrumentLogic.modules.synthEngine.noteOff(e.detail.note);
        }
    });

    document.addEventListener('sequencer:status-update', e => {
        if (recordBtn) recordBtn.classList.toggle('armed', e.detail.isRecording);
    });

    if (recordBtn) recordBtn.classList.toggle('armed', projectState.isRecording);
}