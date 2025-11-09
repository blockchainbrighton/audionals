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
import { registerBopSynthUI } from '../components/synth-ui-components.js'; // This registers the <bop-synth-ui> element
import { ensureChannelGain, updateChannelGain, updateAllChannelGains } from './sequencer-channel-mixer.js';
import { ensureChannelInsertChain, attachSourceToChannelInserts, resetChannelInsertSources, applyChannelInsertState } from './plugins/channel-insert-manager.js';
import { detachInstrumentEditor } from './sequencer-instrument-piano-roll.js';
import { INSTRUMENT_PLAYBACK_READY_TIMEOUT_MS } from './sequencer-instrument-constants.js';
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

function waitForPlaybackReady(logic) {
    if (!logic?.eventBus) return Promise.resolve();
    if (logic?.state?.isPlaying) return Promise.resolve();
    return new Promise(resolve => {
        let settled = false;
        let timer = null;
        const cleanup = () => {
            if (settled) return;
            settled = true;
            try { logic.eventBus.removeEventListener('playback-started', onReady); } catch { /* noop */ }
            clearTimeout(timer);
            resolve();
        };
        const onReady = () => cleanup();
        logic.eventBus.addEventListener('playback-started', onReady);
        timer = setTimeout(() => {
            console.warn('[INSTRUMENT] Playback ready wait timed out; continuing anyway.');
            cleanup();
        }, INSTRUMENT_PLAYBACK_READY_TIMEOUT_MS);
    });
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
        const previousInstrumentId = channel.instrumentId;
        const wasActiveInstrument = runtimeState.activeInstrumentId === previousInstrumentId;

        // --- 1. CLEANUP OLD INSTRUMENT ---
        if (previousInstrumentId) {
            detachInstrumentEditor(previousInstrumentId);
        }
        if (previousInstrumentId && runtimeState.instrumentRack[previousInstrumentId]) {
            const oldInstrument = runtimeState.instrumentRack[previousInstrumentId];
            try {
                oldInstrument.logic?.modules?.recorder?.destroy?.();
            } catch (err) {
                console.warn('[INSTRUMENT] Failed to destroy recorder for previous instrument:', err);
            }
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
            lastWarmupTime: 0,
            playInternalSequence: (syncPayload) => {
                const detail = (syncPayload && typeof syncPayload === 'object') ? { ...syncPayload } : {};
                if (typeof syncPayload === 'number') {
                    detail.transportTime = syncPayload;
                    detail.startTime = syncPayload;
                } else if (detail.transportTime === undefined && typeof detail.startTime === 'number') {
                    detail.transportTime = detail.startTime;
                }
                const readyPromise = waitForPlaybackReady(logic);
                logic.eventBus.dispatchEvent(new CustomEvent('transport-play', { detail }));
                return readyPromise;
            },
            stopInternalSequence: () => logic.eventBus.dispatchEvent(new CustomEvent('transport-stop')),
            getPatch: () => logic.getFullState() // Simplified to always call the master function
        };
        channel.instrumentId = instrumentId;
        console.log(`[INSTRUMENT] Registered new instrument with ID: ${instrumentId}`);
        registerInstrumentLiveSession({ instrumentId, logic, channel });
        if (wasActiveInstrument) {
            activateInstrumentChannel(seqIndex, chanIndex);
        }
        updateAllChannelGains(projectState.sequences[seqIndex]);
        applyChannelInsertState(channel);
        tryWarmupInstrument(logic, instrumentId);

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
    if (!modalContainer) {
        console.error('[UI] Missing #synth-modal-container; cannot display synth UI.');
        return;
    }
    const modalArtifacts = ensureSynthModalArtifacts(modalContainer);
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
    closeButton: null,
    current: null
};

function ensureSynthModalArtifacts(modalContainer) {
    if (synthModalCache.modalContent && synthModalCache.modalContent.isConnected) {
        return synthModalCache;
    }

    registerBopSynthUI();
    const content = synthModalCache.modalContent || document.createElement('div');
    content.className = 'synth-modal-content';
    let synthElement = synthModalCache.synthElement;
    if (!synthElement) {
        synthElement = document.createElement('bop-synth-ui');
        synthModalCache.synthElement = synthElement;
    } else if (!synthElement.parentNode) {
        synthElement = synthElement; // reuse element
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
    try {
        instrument.logic.disconnectUI();
    } catch (err) {
        console.warn('[INSTRUMENT] Failed to disconnect UI during modal close:', err);
    }
    hideSynthModal(modalContainer);
}
