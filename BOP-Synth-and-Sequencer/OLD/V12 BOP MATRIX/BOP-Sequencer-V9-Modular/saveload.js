// saveload.js
import { projectState, runtimeState, initializeProject } from './state.js';
// --- MODIFIED IMPORT ---
// We now import the correctly named function from our updated instrument manager.
import { createInstrumentForChannel } from './instrument.js';

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
                    // Use the logic controller's save/load module to get the patch data
                    newChan.patch = instrument ? instrument.logic.modules.saveLoad.getFullState() : chan.patch;
                }
                return newChan;
            })
        }))
    };
    return JSON.stringify(dataToSave);
}

export async function loadProject(jsonString) {
    if (!jsonString) return;
    try {
        const loadedData = JSON.parse(jsonString);

        projectState.bpm = loadedData.bpm;
        projectState.currentSequenceIndex = loadedData.currentSequenceIndex;
        projectState.sequences = loadedData.sequences;
        
        runtimeState.instrumentRack = {}; // Clear old instruments

        const loadPromises = [];
        projectState.sequences.forEach((seq, seqIndex) => {
            seq.channels.forEach((chan, chanIndex) => {
                if (chan.type === 'instrument') { // Create an instrument regardless of patch to maintain channel integrity
                    // --- MODIFIED FUNCTION CALL ---
                    // Call the new function to create the instrument instance.
                    // The create function itself handles applying the patch if it exists.
                    loadPromises.push(Promise.resolve(createInstrumentForChannel(seqIndex, chanIndex)));
                }
            });
        });

        await Promise.all(loadPromises);
    } catch (e) {
        console.error("Failed to load project:", e);
        // Optionally, reset to a clean state
        // initializeProject();
    }
}