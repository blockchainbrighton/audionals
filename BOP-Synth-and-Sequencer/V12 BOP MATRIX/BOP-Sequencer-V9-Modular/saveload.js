// saveload.js
import { projectState, runtimeState, initializeProject } from './state.js';
import { loadInstrument } from './instrument.js';

export function saveProject() {
    const dataToSave = {
        bpm: projectState.bpm,
        currentSequenceIndex: projectState.currentSequenceIndex,
        sequences: projectState.sequences.map(seq => ({
            channels: seq.channels.map(chan => {
                const newChan = { type: chan.type, steps: chan.steps };
                if (chan.type === 'sampler') {
                    newChan.selectedSampleIndex = chan.selectedSampleIndex;
                } else if (chan.type === 'instrument' && chan.instrumentId) {
                    const instrument = runtimeState.instrumentRack[chan.instrumentId];
                    newChan.patch = instrument ? instrument.getPatch() : chan.patch;
                }
                return newChan;
            })
        }))
    };
    return JSON.stringify(dataToSave);
}

export async function loadProject(jsonString) {
    if (!jsonString) return;
    const loadedData = JSON.parse(jsonString);

    projectState.bpm = loadedData.bpm;
    projectState.currentSequenceIndex = loadedData.currentSequenceIndex;
    projectState.sequences = loadedData.sequences;
    
    runtimeState.instrumentRack = {}; // Clear old instruments

    const loadPromises = [];
    projectState.sequences.forEach((seq, seqIndex) => {
        seq.channels.forEach((chan, chanIndex) => {
            if (chan.type === 'instrument' && chan.patch) {
                loadPromises.push(loadInstrument(seqIndex, chanIndex));
            }
        });
    });

    await Promise.all(loadPromises);
}