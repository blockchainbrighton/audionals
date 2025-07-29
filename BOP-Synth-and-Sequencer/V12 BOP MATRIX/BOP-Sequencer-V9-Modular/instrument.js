// instrument.js
import { projectState, runtimeState, getCurrentSequence } from './state.js';
import * as config from './config.js';
import { setLoaderStatus } from './ui.js';

export async function loadInstrument(seqIndex, chanIndex) {
    try {
        setLoaderStatus('Loading Instrument...');
        const { BopSynthAdapter } = await import(config.SYNTH_PATH + 'BopSynthAdapter.js');

        const instrument = new BopSynthAdapter(runtimeState.Tone);
        instrument.connect(runtimeState.Tone.getDestination());
        
        const instrumentId = `inst-${projectState.nextInstrumentId++}`;
        runtimeState.instrumentRack[instrumentId] = instrument;
        
        const channel = projectState.sequences[seqIndex].channels[chanIndex];
        channel.instrumentId = instrumentId;

        if (channel.patch) {
            instrument.setPatch(channel.patch);
        }
        
        setLoaderStatus('Instrument Loaded.', false);
        return true; // Success
    } catch (e) {
        setLoaderStatus('Failed to load instrument.', true);
        console.error(e);
        return false;
    }
}

export function openSynthUI(chanIndex) {
    const channel = getCurrentSequence().channels[chanIndex];
    if (!channel || !channel.instrumentId) return;

    const instrument = runtimeState.instrumentRack[channel.instrumentId];
    if (!instrument) return;

    const modalContainer = document.getElementById('synth-modal-container');
    const modalContent = document.createElement('div');
    modalContent.className = 'synth-modal-content';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close & Save Patch';
    closeButton.className = 'close-button';
    closeButton.onclick = () => {
        // Save the synth's state back to the project data before closing
        channel.patch = instrument.getPatch();
        instrument.detachUI();
        modalContainer.style.display = 'none';
        modalContainer.innerHTML = '';
    };

    modalContent.innerHTML = `<div class="container"></div>`; // Container for synth UI
    modalContent.appendChild(closeButton);
    
    modalContainer.innerHTML = '';
    modalContainer.appendChild(modalContent);
    modalContainer.style.display = 'flex';

    instrument.attachUI(modalContent.querySelector('.container'));
}