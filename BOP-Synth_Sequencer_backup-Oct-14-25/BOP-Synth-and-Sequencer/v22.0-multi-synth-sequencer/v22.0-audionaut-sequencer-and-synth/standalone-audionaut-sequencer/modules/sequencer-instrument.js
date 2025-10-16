/**
 * Module: standalone-audionaut-sequencer/instrument.js
 * Purpose: Instrument creation and management with pluggable synth components.
 */

import { projectState, runtimeState, getCurrentSequence } from './sequencer-state.js';
import { setLoaderStatus } from './sequencer-ui.js';
import { getSynthDefinition } from './synth-registry.js';

/**
 * Disconnects and disposes an audio node safely.
 * @param {object} node - The Tone.js node to dispose.
 * @param {string} instrumentId - The ID for logging purposes.
 */
function disconnectAndDisposeOutput(node, instrumentId) {
    if (!node) return;
    if (typeof node.disconnect === 'function') {
        try {
            node.disconnect();
        } catch (error) {
            console.warn(`[INSTRUMENT] Failed to disconnect output for ${instrumentId}`, error);
        }
    }
    if (typeof node.dispose === 'function') {
        try {
            node.dispose();
        } catch (error) {
            console.warn(`[INSTRUMENT] Failed to dispose output for ${instrumentId}`, error);
        }
    }
}

function destroyInstrument(instrumentId) {
    const instrument = runtimeState.instrumentRack[instrumentId];
    if (!instrument) return;

    try {
        instrument.logic?.destroy?.();
    } catch (error) {
        console.warn(`[INSTRUMENT] Error destroying logic for ${instrumentId}`, error);
    }

    disconnectAndDisposeOutput(instrument.outputNode, instrumentId);
    delete runtimeState.instrumentRack[instrumentId];
}

/**
 * Creates or replaces an instrument on the given channel.
 * @param {number} seqIndex - The index of the sequence.
 * @param {number} chanIndex - The index of the channel.
 * @param {string|null} synthId - Optional synth identifier. Falls back to channel.synthId when omitted.
 * @param {object|null} patchOverride - Optional patch to apply immediately after creation.
 * @returns {Promise<string|null>} The instrument ID or null on failure.
 */
export async function createInstrumentForChannel(seqIndex, chanIndex, synthId = null, patchOverride = undefined) {
    console.log(`%c[INSTRUMENT] createInstrumentForChannel seq:${seqIndex} chan:${chanIndex}`, 'font-weight:bold;background:#222;color:#bada55');
    try {
        const sequence = projectState.sequences[seqIndex];
        if (!sequence) {
            throw new Error(`Sequence index ${seqIndex} not found.`);
        }
        const channel = sequence.channels[chanIndex];
        if (!channel) {
            throw new Error(`Channel index ${chanIndex} not found.`);
        }

        const resolvedSynthId = synthId || channel.synthId;
        if (!resolvedSynthId) {
            setLoaderStatus('Select a synth before loading.', true);
            return null;
        }

        setLoaderStatus('Loading Instrument...');

        // Clean up any existing instrument first.
        if (channel.instrumentId && runtimeState.instrumentRack[channel.instrumentId]) {
            destroyInstrument(channel.instrumentId);
        }

        const definition = await getSynthDefinition(resolvedSynthId);
        const logic = await definition.createLogic(runtimeState.Tone);
        const outputNode = definition.getOutputNode(logic);
        if (outputNode && typeof outputNode.connect === 'function') {
            outputNode.connect(runtimeState.Tone.getDestination());
        } else {
            console.warn(`[INSTRUMENT] Synth ${resolvedSynthId} did not return a connectable output node.`);
        }

        const instrumentId = channel.instrumentId ?? `inst-${projectState.nextInstrumentId++}`;
        const rackEntry = {
            id: instrumentId,
            synthId: resolvedSynthId,
            definition,
            logic,
            outputNode,
            playInternalSequence: (syncPayload) => {
                const detail = (syncPayload && typeof syncPayload === 'object') ? { ...syncPayload } : {};
                if (typeof syncPayload === 'number') {
                    detail.transportTime = syncPayload;
                    detail.startTime = syncPayload;
                } else if (detail.transportTime === undefined && typeof detail.startTime === 'number') {
                    detail.transportTime = detail.startTime;
                }
                logic.eventBus?.dispatchEvent(new CustomEvent('transport-play', { detail }));
            },
            stopInternalSequence: () => {
                logic.eventBus?.dispatchEvent(new CustomEvent('transport-stop'));
            },
            capturePatch: () => definition.capturePatch(logic)
        };

        runtimeState.instrumentRack[instrumentId] = rackEntry;
        channel.instrumentId = instrumentId;
        channel.synthId = resolvedSynthId;

        const patchToLoad = patchOverride ?? channel.patch;
        if (patchToLoad) {
            definition.applyPatch(logic, patchToLoad);
            channel.patch = patchToLoad;
        } else {
            channel.patch = null;
        }

        setLoaderStatus('Instrument Loaded.', false);
        console.log(`[INSTRUMENT] Registered new instrument ${instrumentId} using synth ${resolvedSynthId}.`);
        return instrumentId;
    } catch (error) {
        setLoaderStatus('Failed to load instrument.', true);
        console.error('[INSTRUMENT] CRITICAL FAILURE in createInstrumentForChannel:', error);
        return null;
    }
}

/**
 * Opens the synth UI modal for a specific instrument channel.
 * @param {number} chanIndex - The index of the channel in the current sequence.
 */
export async function openSynthUI(chanIndex) {
    console.log(`%c[UI] openSynthUI channel:${chanIndex}`, 'color:blue;font-weight:bold;');
    const channel = getCurrentSequence().channels[chanIndex];
    if (!channel || !channel.instrumentId) {
        console.error('[UI] Aborting open: Channel or instrumentId not found.');
        return;
    }

    const instrument = runtimeState.instrumentRack[channel.instrumentId];
    if (!instrument) {
        console.error(`[UI] Aborting open: Instrument with ID ${channel.instrumentId} not found.`);
        return;
    }

    const modalContainer = document.getElementById('synth-modal-container');
    if (!modalContainer) {
        console.error('[UI] Synth modal container not found.');
        return;
    }

    modalContainer.innerHTML = '';

    try {
        const synthElement = await instrument.definition.createUIElement(instrument.logic);
        if (!synthElement) {
            console.error(`[UI] Synth ${instrument.synthId} does not provide a UI component.`);
            return;
        }

        if (channel.patch) {
            instrument.definition.applyPatch(instrument.logic, channel.patch);
        }

        const modalContent = document.createElement('div');
        modalContent.className = 'synth-modal-content';
        modalContent.appendChild(synthElement);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close & Save Patch';
        closeButton.className = 'close-button';
        closeButton.onclick = () => {
            console.log('%c[DEBUG-SAVE] Close button clicked. Capturing state...', 'color:darkred;font-weight:bold;');
            const patch = instrument.capturePatch();
            channel.patch = patch;
            instrument.logic?.disconnectUI?.();
            modalContainer.style.display = 'none';
            modalContainer.innerHTML = '';
        };
        modalContent.appendChild(closeButton);

        modalContainer.appendChild(modalContent);
        modalContainer.style.display = 'flex';
    } catch (error) {
        console.error('[UI] Failed to open synth UI:', error);
        setLoaderStatus('Failed to open synth UI.', true);
    }
}

export function disposeInstrumentById(instrumentId) {
    destroyInstrument(instrumentId);
}
