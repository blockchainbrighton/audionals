/**
 * Module: sequencer/instrument.js
 * Purpose: Instrument creation and management
 * Exports: createInstrumentForChannel
 */

import { projectState, runtimeState, getCurrentSequence, ensureInstrumentChannelDefaults } from './sequencer-state.js';
import { setLoaderStatus } from './sequencer-ui.js';
import { getInstrumentDefinition } from './instrument-registry.js';
import { ensureChannelGain, updateChannelGain, updateAllChannelGains } from './sequencer-channel-mixer.js';
import { detachInstrumentEditor } from './sequencer-instrument-piano-roll.js';
import { registerInstrumentLiveSession, unregisterInstrumentLiveSession, activateInstrumentChannel } from './instrument-live-controller.js';

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

function tryWarmupInstrument(logic, instrumentId) {
    if (!logic) return;
    const warmupFn = typeof logic.warmupAudioEngine === 'function'
        ? () => logic.warmupAudioEngine()
        : (typeof logic.modules?.synthEngine?.warmup === 'function'
            ? () => logic.modules.synthEngine.warmup()
            : null);
    if (!warmupFn) return;
    try {
        warmupFn();
        console.log(`[INSTRUMENT] Warmed up audio engine for ${instrumentId}`);
    } catch (err) {
        console.warn(`[INSTRUMENT] Warmup failed for ${instrumentId}:`, err);
    }
}

/**
 * Creates a new instrument instance and assigns it to a channel.
 * @param {number} seqIndex - The index of the sequence.
 * @param {number} chanIndex - The index of the channel.
 * @returns {string|null} The new instrument ID or null on failure.
 */
export function createInstrumentForChannel(seqIndex, chanIndex) {
    console.log(`%c[INSTRUMENT] createInstrumentForChannel called for seq: ${seqIndex}, chan: ${chanIndex}`, 'font-weight: bold; background: #222; color: #bada55');
    try {
        setLoaderStatus('Loading Instrument...');
        const channel = projectState.sequences[seqIndex].channels[chanIndex];
        ensureInstrumentChannelDefaults(channel);
        const previousInstrumentId = channel.instrumentId;
        const pendingType = channel.pendingInstrumentType || channel.instrumentType;
        const instrumentDefinition = getInstrumentDefinition(pendingType);
        if (!instrumentDefinition) {
            throw new Error(`Unknown instrument type "${pendingType}"`);
        }
        const instrumentType = instrumentDefinition.id;
        const wasActiveInstrument = runtimeState.activeInstrumentId === previousInstrumentId;

        // --- 1. CLEANUP OLD INSTRUMENT ---
        if (previousInstrumentId) {
            detachInstrumentEditor(previousInstrumentId);
        }
        if (previousInstrumentId && runtimeState.instrumentRack[previousInstrumentId]) {
            const oldInstrument = runtimeState.instrumentRack[previousInstrumentId];
            if (oldInstrument.logic?.destroy) {
                try {
                    oldInstrument.logic.destroy();
                } catch (err) {
                    console.warn('[INSTRUMENT] Failed to destroy previous instrument logic:', err);
                }
            } else if (oldInstrument.logic?.modules?.synthEngine) {
                try {
                    oldInstrument.logic.modules.synthEngine.destroy();
                } catch (err) {
                    console.warn('[INSTRUMENT] Failed to destroy synth engine for previous instrument:', err);
                }
            }
            delete runtimeState.instrumentRack[previousInstrumentId];
            console.log(`[INSTRUMENT] Cleaned up old instrument ${previousInstrumentId}`);
        }
        unregisterInstrumentLiveSession(previousInstrumentId);

        // --- 2. INSTANTIATE NEW LOGIC CORE ---
        const logic = instrumentDefinition.createLogic(runtimeState.Tone);
        console.log(`[INSTRUMENT] New ${instrumentDefinition.label} logic instance created.`);

        // --- 3. ROUTE & REGISTER ---
        const synthOutputNode = logic.modules.synthEngine.getOutputNode();
        try { synthOutputNode.disconnect(); } catch (err) { /* already disconnected */ }
        const channelGain = ensureChannelGain(channel);
        if (channelGain) {
            synthOutputNode.connect(channelGain);
            updateChannelGain(channel, projectState.sequences[seqIndex]);
        } else if (runtimeState.Tone) {
            synthOutputNode.connect(runtimeState.Tone.getDestination());
        }
        const instrumentId = `inst-${projectState.nextInstrumentId++}`;

        runtimeState.instrumentRack[instrumentId] = {
            id: instrumentId,
            type: instrumentType,
            logic: logic,
            lastWarmupTime: 0,
            getPatch: () => logic.getFullState() // Simplified to always call the master function
        };
        channel.instrumentId = instrumentId;
        channel.instrumentType = instrumentType;
        channel.pendingInstrumentType = instrumentType;
        channel.patchInstrumentType = instrumentType;
        console.log(`[INSTRUMENT] Registered new instrument with ID: ${instrumentId}`);
        registerInstrumentLiveSession({ instrumentId, logic, channel });
        if (wasActiveInstrument) {
            activateInstrumentChannel(seqIndex, chanIndex);
        }
        updateAllChannelGains(projectState.sequences[seqIndex]);
        tryWarmupInstrument(logic, instrumentId);

        // --- 4. LOAD PATCH IF IT EXISTS ---
        const canApplyStoredPatch = channel.patch
            && (!channel.patchInstrumentType || channel.patchInstrumentType === instrumentType);
        if (canApplyStoredPatch) {
            console.log('%c[DEBUG-LOAD] Found existing patch on channel. Attempting to load.', 'color: green; font-weight: bold;');
            // IMPORTANT: loadFullState is called here, BEFORE any UI exists.
            // This correctly loads all LOGIC state. The UI state will be applied when the UI is opened.
            logic.loadFullState(channel.patch);
        } else if (channel.patch && !canApplyStoredPatch) {
            console.warn(`[DEBUG-LOAD] Skipping patch load because stored patch type (${channel.patchInstrumentType}) does not match ${instrumentType}.`);
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
    ensureInstrumentChannelDefaults(channel);
    const instrument = runtimeState.instrumentRack[channel.instrumentId];
    if (!instrument) {
        return console.error(`[UI] Aborting open: Instrument with ID ${channel.instrumentId} not found.`);
    }
    const definition = getInstrumentDefinition(channel.instrumentType || instrument.type);
    if (!definition) {
        return console.error(`[UI] Aborting open: No definition for instrument type ${channel.instrumentType}`);
    }

    const sequenceIndex = projectState.currentSequenceIndex ?? 0;
    activateInstrumentChannel(sequenceIndex, chanIndex);

    const modalContainer = document.getElementById('synth-modal-container');
    if (!modalContainer) {
        console.error('[UI] Missing #synth-modal-container; cannot display synth UI.');
        return;
    }
    const modalArtifacts = ensureSynthModalArtifacts(modalContainer, definition);
    if (!modalArtifacts.closeButton._synthCloseBound) {
        modalArtifacts.closeButton.addEventListener('click', handleSynthModalClose);
        modalArtifacts.closeButton._synthCloseBound = true;
    }

    modalArtifacts.synthElement.connect(instrument.logic);
    instrument.logic.connectUI(modalArtifacts.synthElement.uiController);

    if (channel.patch) {
        console.log('[UI] Re-applying full state to connected UI...');
        instrument.logic.loadFullState(channel.patch);
    }

    modalArtifacts.current = {
        instrument,
        channel,
        modalContainer
    };
    modalContainer.style.display = 'flex';
}
const synthModalCache = {
    modalContent: null,
    synthElement: null,
    synthElementType: null,
    closeButton: null,
    current: null
};

function ensureSynthModalArtifacts(modalContainer, definition) {
    if (!definition) throw new Error('Instrument definition is required to render the modal.');
    definition.ensureUI?.();

    if (synthModalCache.modalContent && synthModalCache.modalContent.isConnected) {
        if (synthModalCache.synthElementType !== definition.id) {
            synthModalCache.synthElement?.remove?.();
            synthModalCache.synthElement = null;
        } else {
            return synthModalCache;
        }
    }

    const content = synthModalCache.modalContent || document.createElement('div');
    content.className = 'synth-modal-content';
    let synthElement = synthModalCache.synthElement;
    if (!synthElement) {
        synthElement = document.createElement(definition.tagName);
        synthModalCache.synthElement = synthElement;
        synthModalCache.synthElementType = definition.id;
    }

    if (!synthElement.isConnected) {
        content.insertBefore(synthElement, content.firstChild);
    }
    let closeButton = synthModalCache.closeButton;
    if (!closeButton) {
        closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.textContent = 'Close & Save Patch';
        synthModalCache.closeButton = closeButton;
    }
    if (!closeButton.isConnected) {
        content.appendChild(closeButton);
    }
    if (!content.parentNode) {
        modalContainer.appendChild(content);
    }
    return synthModalCache;
}

function hideSynthModal(modalContainer) {
    modalContainer.style.display = 'none';
    synthModalCache.current = null;
}

function handleSynthModalClose() {
    const session = synthModalCache.current;
    if (!session) return;
    const { channel, instrument, modalContainer } = session;
    console.log('%c[DEBUG-SAVE] Close button clicked. Capturing state...', 'color: darkred; font-weight: bold;');
    channel.patch = instrument.getPatch();
    channel.patchInstrumentType = channel.instrumentType;
    try {
        instrument.logic.disconnectUI();
    } catch (err) {
        console.warn('[INSTRUMENT] Failed to disconnect UI during modal close:', err);
    }
    hideSynthModal(modalContainer);
}
