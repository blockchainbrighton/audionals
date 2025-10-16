// sequencer-instrument.js  (drop-in)
import { projectState, runtimeState, getCurrentSequence } from './sequencer-state.js';
import { setLoaderStatus } from './sequencer-ui.js';
import { BopSynthLogic } from './synth-logic.js';
import './synth-ui-components.js';

function disconnectAndDisposeOutput(node, instrumentId) {
    if (node && typeof node.disconnect === 'function') try { node.disconnect(); } catch {}
    if (node && typeof node.dispose === 'function') try { node.dispose(); } catch {}
}

export function createInstrumentForChannel(seqIndex, chanIndex) {
    console.log(`[INSTRUMENT] create for seq:${seqIndex} chan:${chanIndex}`);
    try {
        setLoaderStatus('Loading Instrument...');
        const channel = projectState.sequences[seqIndex].channels[chanIndex];

        if (channel.instrumentId && runtimeState.instrumentRack[channel.instrumentId]) {
            const old = runtimeState.instrumentRack[channel.instrumentId];
            old.logic?.modules?.synthEngine?.destroy?.();
            delete runtimeState.instrumentRack[channel.instrumentId];
        }

        // Use the singleton Tone instance
        const logic = new BopSynthLogic(window.BOP_TONE);
        const synthOut = logic.modules.synthEngine.getOutputNode();
        synthOut.connect(runtimeState.Tone.getDestination());

        const instrumentId = `inst-${projectState.nextInstrumentId++}`;
        runtimeState.instrumentRack[instrumentId] = {
            id: instrumentId,
            logic,
            playInternalSequence: (startTime) =>
                logic.eventBus.dispatchEvent(new CustomEvent('transport-play', { detail: { startTime } })),
            stopInternalSequence: () =>
                logic.eventBus.dispatchEvent(new CustomEvent('transport-stop')),
            getPatch: () => logic.getFullState()
        };
        channel.instrumentId = instrumentId;

        if (channel.patch) logic.loadFullState(channel.patch);

        setLoaderStatus('Instrument Loaded.', false);
        return instrumentId;
    } catch (e) {
        setLoaderStatus('Failed to load instrument.', true);
        console.error(e);
        return null;
    }
}

export async function openSynthUI(chanIndex) {
    const channel = getCurrentSequence().channels[chanIndex];
    if (!channel?.instrumentId) return;
    const instrument = runtimeState.instrumentRack[channel.instrumentId];
    if (!instrument) return;

    const modalContainer = document.getElementById('synth-modal-container');
    modalContainer.innerHTML = '';
    const synthElement = document.createElement('bop-synth-ui');
    synthElement.connect(instrument.logic);
    instrument.logic.connectUI(synthElement.uiController);
    if (channel.patch) instrument.logic.loadFullState(channel.patch);

    const modalContent = document.createElement('div');
    modalContent.className = 'synth-modal-content';
    modalContent.appendChild(synthElement);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close & Save Patch';
    closeBtn.className = 'close-button';
    closeBtn.onclick = () => {
        channel.patch = instrument.getPatch();
        instrument.logic.disconnectUI();
        modalContainer.style.display = 'none';
        modalContainer.innerHTML = '';
    };
    modalContent.appendChild(closeBtn);
    modalContainer.appendChild(modalContent);
    modalContainer.style.display = 'flex';
}