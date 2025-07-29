// instrument.js (Rewritten with extensive logging)

import { projectState, runtimeState, getCurrentSequence } from './state.js';
import { setLoaderStatus } from './ui.js';
import { BopSynthLogic } from '../BOP-SYNTH-V12/BopSynthLogic.js';
import '../BOP-SYNTH-V12/BopSynthUIComponent.js';

let activeInstrumentLogic = null;

/**
 * Creates a new BopSynth instance and assigns it to a channel.
 * @param {number} seqIndex - The index of the sequence.
 * @param {number} chanIndex - The index of the channel.
 */
export function createInstrumentForChannel(seqIndex, chanIndex) {
    console.log(`%c[INSTRUMENT] createInstrumentForChannel called for seq: ${seqIndex}, chan: ${chanIndex}`, 'font-weight: bold; background: #222; color: #bada55');
    try {
        setLoaderStatus('Loading Instrument...');
        const channel = projectState.sequences[seqIndex].channels[chanIndex];
        
        // ---- INSTANTIATE LOGIC ----
        const logic = new BopSynthLogic(runtimeState.Tone);
        console.log('[INSTRUMENT] New BopSynthLogic instance created.');

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
                // This function is now the single source of truth for an instrument's state.
                const patch = logic.getFullState();
                // We log this every time it's called to see who is asking for the state.
                console.log(`[INSTRUMENT] getPatch() called for inst: ${instrumentId}`, patch);
                return patch;
            }
        };

        channel.instrumentId = instrumentId;
        console.log(`[INSTRUMENT] Registered new instrument with ID: ${instrumentId}`);

        // ---- PATCH LOADING LOGIC ----
        // This is the critical "load" step.
        if (channel.patch) {
            console.log('%c[DEBUG-LOAD] Found existing patch on channel. Attempting to load.', 'color: green; font-weight: bold;');
            console.log('[DEBUG-LOAD] Patch data to be loaded:', JSON.parse(JSON.stringify(channel.patch)));
            logic.loadFullState(channel.patch);
            
            // VERIFY THE LOAD: Check the state immediately after loading to confirm it was applied.
            // Using setTimeout to ensure this log appears after any async operations within loadFullState.
            setTimeout(() => {
                const stateAfterLoad = logic.getFullState();
                console.log('%c[DEBUG-LOAD-VERIFY] State inside synth logic AFTER loading:', 'color: darkorange; font-weight: bold;', stateAfterLoad);
                if (JSON.stringify(stateAfterLoad) !== JSON.stringify(channel.patch)) {
                    console.error('[DEBUG-LOAD-VERIFY] MISMATCH! The state after loading does not match the source patch. Check the loadFullState() method.');
                }
            }, 0);

        } else {
            console.warn('[DEBUG-LOAD] No patch found on channel object. Instrument will use its default state.');
            const defaultState = logic.getFullState();
            console.log('[DEBUG-LOAD] Current default state is:', defaultState);
        }

        setLoaderStatus('Instrument Loaded.', false);
        return instrumentId;

    } catch (e) {
        setLoaderStatus('Failed to load instrument.', true);
        console.error('[INSTRUMENT] CRITICAL FAILURE in createInstrumentForChannel:', e);
        return null;
    }
}

/**
 * Opens the synth UI modal for a specific instrument on a channel.
 * @param {number} chanIndex - The index of the channel whose synth UI should be opened.
 */
export async function openSynthUI(chanIndex) {
    console.log(`[UI] openSynthUI called for channel index: ${chanIndex}`);
    const channel = getCurrentSequence().channels[chanIndex];
    if (!channel || !channel.instrumentId) {
        console.error('[UI] Aborting open: Channel or instrumentId not found.');
        return;
    }

    const instrument = runtimeState.instrumentRack[channel.instrumentId];
    if (!instrument) {
        console.error(`[UI] Aborting open: Instrument with ID ${channel.instrumentId} not found in runtime rack.`);
        return;
    }
    
    activeInstrumentLogic = instrument.logic;

    const modalContainer = document.getElementById('synth-modal-container');
    const synthElement = document.createElement('bop-synth-ui');
    
    // DEBUG: Log the patch state right before the UI is built and connected.
    const patchBeforeUI = instrument.getPatch();
    console.log('%c[UI] Patch state BEFORE opening UI:', 'color: #888; font-weight: bold;', patchBeforeUI);

    synthElement.connect(instrument.logic);
    reWireSynthControls(synthElement.shadowRoot, instrument.logic.eventBus);
    
    // Command the logic core to re-broadcast its state for the new UI to sync up.
    instrument.logic.modules.recorder.updateState();

    const modalContent = document.createElement('div');
    modalContent.className = 'synth-modal-content';
    modalContent.appendChild(synthElement);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close & Save Patch';
    closeButton.className = 'close-button';
    closeButton.onclick = () => {
        // --- THIS IS THE CRITICAL "SAVE" STEP ---
        console.log('%c[DEBUG-SAVE] Close button clicked. Capturing state from synth logic core...', 'color: blue; font-weight: bold;');
        
        // 1. Get the full, current state from the instrument's logic core.
        const currentState = instrument.getPatch(); 
        console.log('[DEBUG-SAVE] State captured is:', JSON.parse(JSON.stringify(currentState)));

        // 2. Assign this state object to the channel's `patch` property.
        channel.patch = currentState;
        console.log('[DEBUG-SAVE] Assigned captured state to channel.patch.');
        
        // 3. Log the entire project state to verify the patch is now part of the persistent data model.
        console.log('[DEBUG-SAVE] projectState.sequences is now:', JSON.parse(JSON.stringify(projectState.sequences)));
        
        modalContainer.style.display = 'none';
        modalContainer.innerHTML = '';
        activeInstrumentLogic = null;
    };
    modalContent.appendChild(closeButton);

    modalContainer.innerHTML = '';
    modalContainer.appendChild(modalContent);
    modalContainer.style.display = 'flex';
}

// No changes needed in this function, it's for UI event handling.
function reWireSynthControls(shadowRoot, eventBus) {
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