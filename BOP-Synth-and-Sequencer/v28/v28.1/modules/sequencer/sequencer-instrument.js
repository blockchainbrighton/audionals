/**
 * Module: BOP-Sequencer-V10-Modular/instrument.js
 * Purpose: Instrument creation and management
 * Exports: createInstrumentForChannel
 * Depends on: BOP-SYNTH-V14/BopSynthLogic.js, ui.js, sequencer-state.js
 */

// instrument.js (Refactored for clarity and correct UI state management)

import { projectState, runtimeState, getCurrentSequence, ensureChannelInsertSettings } from './sequencer-state.js';
import { setLoaderStatus } from './sequencer-ui.js';
import { BopSynthLogic } from '../synth/synth-logic.js';
import '../components/synth-ui-components.js'; // This registers the <bop-synth-ui> element
import { ensureChannelGain, updateChannelGain, updateAllChannelGains } from './sequencer-channel-mixer.js';
import { ensureChannelInsertChain, attachSourceToChannelInserts, resetChannelInsertSources, applyChannelInsertState } from './plugins/channel-insert-manager.js';
import { detachInstrumentEditor } from './sequencer-instrument-piano-roll.js';

/**
 * Disconnects and disposes an audio node safely.
 * @param {object} node - The Tone.js node to dispose.
 * @param {string} instrumentId - The ID for logging purposes.
 */
function disconnectAndDisposeOutput(node, instrumentId) {
    if (node && typeof node.disconnect === 'function') {
        try {
            node.disconnect();
        } catch (e) { /* Already disconnected */ }
    }
    if (node && typeof node.dispose === 'function') {
        try {
            node.dispose();
        } catch (e) { /* Already disposed */ }
    }
}

/**
 * Creates a new BopSynth instance and assigns it to a channel.
 * @param {number} seqIndex - The index of the sequence.
 * @param {number} chanIndex - The index of the channel.
 * @returns {string|null} The new instrument ID or null on failure.
 */
export function createInstrumentForChannel(seqIndex, chanIndex) {
    console.log(`%c[INSTRUMENT] createInstrumentForChannel called for seq: ${seqIndex}, chan: ${chanIndex}`, 'font-weight: bold; background: #222; color: #bada55');
    try {
        setLoaderStatus('Loading Instrument...');
        const channel = projectState.sequences[seqIndex].channels[chanIndex];
        ensureChannelInsertSettings(channel);

        // --- 1. CLEANUP OLD INSTRUMENT ---
        if (channel.instrumentId) {
            detachInstrumentEditor(channel.instrumentId);
        }
        if (channel.instrumentId && runtimeState.instrumentRack[channel.instrumentId]) {
            const oldInstrument = runtimeState.instrumentRack[channel.instrumentId];
            if (oldInstrument.logic?.modules?.synthEngine) {
                oldInstrument.logic.modules.synthEngine.destroy();
            }
            delete runtimeState.instrumentRack[channel.instrumentId];
            console.log(`[INSTRUMENT] Cleaned up old instrument ${channel.instrumentId}`);
        }
        resetChannelInsertSources(channel);

        // --- 2. INSTANTIATE NEW LOGIC CORE ---
        const logic = new BopSynthLogic(runtimeState.Tone);
        console.log('[INSTRUMENT] New BopSynthLogic instance created.');

        // --- 3. ROUTE & REGISTER ---
        const synthOutputNode = logic.modules.synthEngine.getOutputNode();
        try { synthOutputNode.disconnect(); } catch (err) { /* already disconnected */ }
        const insertChain = ensureChannelInsertChain(channel);
        const channelGain = ensureChannelGain(channel);
        if (insertChain) {
            resetChannelInsertSources(channel);
            attachSourceToChannelInserts(channel, synthOutputNode);
            if (channelGain) {
                updateChannelGain(channel, projectState.sequences[seqIndex]);
            }
        } else if (channelGain) {
            synthOutputNode.connect(channelGain);
            updateChannelGain(channel, projectState.sequences[seqIndex]);
        } else if (runtimeState.Tone) {
            synthOutputNode.connect(runtimeState.Tone.getDestination());
        }
        const instrumentId = `inst-${projectState.nextInstrumentId++}`;

        runtimeState.instrumentRack[instrumentId] = {
            id: instrumentId,
            logic: logic,
            playInternalSequence: (syncPayload) => {
                const detail = (syncPayload && typeof syncPayload === 'object') ? { ...syncPayload } : {};
                if (typeof syncPayload === 'number') {
                    detail.transportTime = syncPayload;
                    detail.startTime = syncPayload;
                } else if (detail.transportTime === undefined && typeof detail.startTime === 'number') {
                    detail.transportTime = detail.startTime;
                }
                logic.eventBus.dispatchEvent(new CustomEvent('transport-play', { detail }));
            },
            stopInternalSequence: () => logic.eventBus.dispatchEvent(new CustomEvent('transport-stop')),
            getPatch: () => logic.getFullState() // Simplified to always call the master function
        };
        channel.instrumentId = instrumentId;
        console.log(`[INSTRUMENT] Registered new instrument with ID: ${instrumentId}`);
        updateAllChannelGains(projectState.sequences[seqIndex]);
        applyChannelInsertState(channel);

        // --- 4. LOAD PATCH IF IT EXISTS ---
        if (channel.patch) {
            console.log('%c[DEBUG-LOAD] Found existing patch on channel. Attempting to load.', 'color: green; font-weight: bold;');
            // IMPORTANT: loadFullState is called here, BEFORE any UI exists.
            // This correctly loads all LOGIC state. The UI state will be applied when the UI is opened.
            logic.loadFullState(channel.patch);
        } else {
            console.warn('[DEBUG-LOAD] No patch found on channel object. Instrument will use its default state.');
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
 * Opens the synth UI modal for a specific instrument channel.
 * @param {number} chanIndex - The index of the channel in the current sequence.
 */
export async function openSynthUI(chanIndex) {
    console.log(`%c[UI] openSynthUI called for channel index: ${chanIndex}`, 'color: blue; font-weight: bold;');
    const channel = getCurrentSequence().channels[chanIndex];
    if (!channel || !channel.instrumentId) {
        return console.error('[UI] Aborting open: Channel or instrumentId not found.');
    }
    const instrument = runtimeState.instrumentRack[channel.instrumentId];
    if (!instrument) {
        return console.error(`[UI] Aborting open: Instrument with ID ${channel.instrumentId} not found.`);
    }

    const modalContainer = document.getElementById('synth-modal-container');
    modalContainer.innerHTML = ''; // Clear previous content

    // --- 1. CREATE THE UI COMPONENT ---
    const synthElement = document.createElement('bop-synth-ui');

    // --- 2. CONNECT LOGIC AND UI ---
    // This is the crucial link. The <bop-synth-ui> element now has access to the logic.
    synthElement.connect(instrument.logic);
    // The logic now has a reference to its UI, allowing it to apply UI state.
    instrument.logic.connectUI(synthElement.uiController);
    
    // --- 3. LOAD THE FULL STATE (INCLUDING UI STATE) ---
    // Now that the UI is connected, we re-run loadFullState.
    // This will apply the logic state again (harmless) AND apply the uiState.
    if (channel.patch) {
        console.log('[UI] Re-applying full state to connected UI...');
        instrument.logic.loadFullState(channel.patch);
    }
    
    // --- 4. BUILD THE MODAL ---
    const modalContent = document.createElement('div');
    modalContent.className = 'synth-modal-content';
    modalContent.appendChild(synthElement);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close & Save Patch';
    closeButton.className = 'close-button';
    closeButton.onclick = () => {
        console.log('%c[DEBUG-SAVE] Close button clicked. Capturing state...', 'color: darkred; font-weight: bold;');
        
        // Get the complete state (logic + UI) from the master function.
        channel.patch = instrument.getPatch();
        
        console.log('[DEBUG-SAVE] Assigned new patch to channel:', JSON.parse(JSON.stringify(channel.patch)));
        
        // Disconnect and clean up
        instrument.logic.disconnectUI();
        modalContainer.style.display = 'none';
        modalContainer.innerHTML = '';
    };
    modalContent.appendChild(closeButton);

    modalContainer.appendChild(modalContent);
    modalContainer.style.display = 'flex';
}
