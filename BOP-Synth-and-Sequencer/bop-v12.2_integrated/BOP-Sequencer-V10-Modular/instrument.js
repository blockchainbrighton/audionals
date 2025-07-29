// instrument.js (Current Version: With Logging and Patch State Verification)

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

        // ---- INSTANTIATE LOGIC ----
        const logic = new BopSynthLogic(runtimeState.Tone);

        // ---- ROUTE OUTPUT ----
        const synthOutputNode = logic.modules.synthEngine.getOutputNode();
        if (synthOutputNode && typeof synthOutputNode.connect === 'function') {
            synthOutputNode.connect(runtimeState.Tone.getDestination());
        }

        const instrumentId = `inst-${projectState.nextInstrumentId++}`;
        
        // ---- REGISTER INSTRUMENT ----
        runtimeState.instrumentRack[instrumentId] = {
            id: instrumentId,
            logic: logic,
            playInternalSequence: (startTime) => logic.eventBus.dispatchEvent(new CustomEvent('transport-play', { detail: { startTime } })),
            stopInternalSequence: () => logic.eventBus.dispatchEvent(new CustomEvent('transport-stop')),
            getPatch: () => {
                const patch = logic.getFullState();
                console.log("[INSTRUMENT] getPatch():", patch);
                return patch;
            }
        };

        const channel = projectState.sequences[seqIndex].channels[chanIndex];
        channel.instrumentId = instrumentId;

        // ---- PATCH LOADING ----
        if (channel.patch) {
            console.log("[INSTRUMENT] Loading patch for channel:", channel.patch);
            logic.loadFullState(channel.patch);
            // DEBUG: Immediately log the state after load
            setTimeout(() => {
                const afterLoadPatch = logic.getFullState();
                console.log("[INSTRUMENT] State after loadFullState():", afterLoadPatch);

                // UI SYNC HOOK (insert UI update trigger here)
                // If you have a UI sync event or method, call it here:
                // e.g., logic.eventBus.dispatchEvent(new CustomEvent('synth-state-loaded', { detail: afterLoadPatch }));
                // or call logic.syncUI?.(); if you have such a method.
                console.log("[INSTRUMENT] (Optional) Dispatched synth-state-loaded event for UI sync");
            }, 0);
        } else {
            console.log("[INSTRUMENT] No patch found for channel, using default state.");
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
    if (!instrument) return;
    
    activeInstrumentLogic = instrument.logic; 

    const modalContainer = document.getElementById('synth-modal-container');
    
    const synthElement = document.createElement('bop-synth-ui');
    synthElement.connect(instrument.logic);
    reWireSynthControls(synthElement.shadowRoot, instrument.logic.eventBus);
    
    // After connecting, command the logic core to re-broadcast its state for the new UI to sync up.
    instrument.logic.modules.recorder.updateState();

    // DEBUG: Log patch before modal opens
    console.log("[INSTRUMENT] Patch before opening UI:", instrument.getPatch());

    const modalContent = document.createElement('div');
    modalContent.className = 'synth-modal-content';
    modalContent.appendChild(synthElement);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close & Save Patch';
    closeButton.className = 'close-button';
    closeButton.onclick = () => {
        // --- THE "SAVE" FIX ---
        // The instrument's getPatch() method already returns the full state object.
        channel.patch = instrument.getPatch();
        console.log("[INSTRUMENT] Saved full state to channel:", channel.patch);

        modalContainer.style.display = 'none';
        modalContainer.innerHTML = '';
        activeInstrumentLogic = null;
    };
    modalContent.appendChild(closeButton);

    modalContainer.innerHTML = '';
    modalContainer.appendChild(modalContent);
    modalContainer.style.display = 'flex';
}

// No changes are needed in this function.
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
