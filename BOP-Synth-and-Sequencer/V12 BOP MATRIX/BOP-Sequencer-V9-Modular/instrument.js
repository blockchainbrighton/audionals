// BOP-Sequencer-V9-Modular/instrument.js

import { projectState, runtimeState, getCurrentSequence } from './state.js';
import * as config from './config.js';
import { setLoaderStatus } from './ui.js';

import { BopSynthLogic } from '../BOP-SYNTH-V12/BopSynthLogic.js';
// This import registers the <bop-synth-ui> custom element.
import '../BOP-SYNTH-V12/BopSynthUIComponent.js';

let activeInstrumentLogic = null; 

/**
 * Creates a new BopSynth instance and assigns it to a channel.
 * @param {number} seqIndex - The index of the sequence.
 * @param {number} chanIndex - The index of the channel.
 */
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

            playInternalSequence: (startTime) => {
                logic.eventBus.dispatchEvent(new CustomEvent('transport-play', { detail: { startTime } }));
            },
            stopInternalSequence: () => {
                logic.eventBus.dispatchEvent(new CustomEvent('transport-stop'));
            },
            getPatch: () => {
                const soundPatch = logic.modules.saveLoad.getFullState();
                const sequenceData = logic.modules.recorder.getSequence();
                return { sound: soundPatch, sequence: sequenceData };
            }
        };

        const channel = projectState.sequences[seqIndex].channels[chanIndex];
        channel.instrumentId = instrumentId;

        // "LOAD" LOGIC: Correctly loads sound and sequence when instrument is first created.
        if (channel.patch) {
            if (channel.patch.sound) logic.modules.saveLoad.loadState(channel.patch.sound);
            if (channel.patch.sequence) logic.modules.recorder.setSequence(channel.patch.sequence);
        }

        setLoaderStatus('Instrument Loaded.', false);
        return instrumentId;

    } catch (e) {
        setLoaderStatus('Failed to load instrument.', true);
        console.error(e);
        return null;
    }
}


/**
 * Opens the synth UI modal for a specific instrument on a channel.
 * @param {number} chanIndex - The index of the channel whose synth UI should be opened.
 */
export async function openSynthUI(chanIndex) {
    const channel = getCurrentSequence().channels[chanIndex];
    if (!channel || !channel.instrumentId) return;

    const instrument = runtimeState.instrumentRack[channel.instrumentId];
    if (!instrument) {
        console.error(`Cannot open modal: Instrument ${channel.instrumentId} not found.`);
        return;
    }
    activeInstrumentLogic = instrument.logic; 

    const modalContainer = document.getElementById('synth-modal-container');
    
    const synthElement = document.createElement('bop-synth-ui');
    synthElement.connect(instrument.logic);
    reWireSynthControls(synthElement.shadowRoot, instrument.logic.eventBus);
    
    // --- THE "RE-SYNC" FIX ---
    // The UI has been created, but it's in a default state.
    // We must now command the logic core's recorder to broadcast its current state.
    // The newly created UI will hear this event and update itself accordingly (e.g., enable the Play button).
    instrument.logic.modules.recorder.updateState();
    
    const modalContent = document.createElement('div');
    modalContent.className = 'synth-modal-content';
    modalContent.appendChild(synthElement);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close & Save Patch';
    closeButton.className = 'close-button';
    closeButton.onclick = () => {
        // "SAVE" LOGIC: Correctly gets the full state and saves it to the channel.
        channel.patch = instrument.getPatch();
        console.log("Saved state to channel:", channel.patch);

        modalContainer.style.display = 'none';
        modalContainer.innerHTML = '';
        activeInstrumentLogic = null;
    };
    modalContent.appendChild(closeButton);

    modalContainer.innerHTML = '';
    modalContainer.appendChild(modalContent);
    modalContainer.style.display = 'flex';
}

// No changes needed in this function from the last version.
function reWireSynthControls(shadowRoot, eventBus) {
    // ... (rest of the function is identical to previous correct version)
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
        eventBus.dispatchEvent(new CustomEvent('transport-play')); 
    };
    
    stopBtn.onclick = e => {
        e.preventDefault();
        eventBus.dispatchEvent(new CustomEvent('transport-stop'));
    };

    clearBtn.onclick = e => {
        e.preventDefault();
        if (confirm('Clear the internal recording for this synth?')) {
            eventBus.dispatchEvent(new CustomEvent('transport-clear'));
        }
    };
    
    eventBus.addEventListener('keyboard-note-on', e => {
        if (activeInstrumentLogic) {
            activeInstrumentLogic.modules.synthEngine.noteOn(e.detail.note, e.detail.velocity);
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