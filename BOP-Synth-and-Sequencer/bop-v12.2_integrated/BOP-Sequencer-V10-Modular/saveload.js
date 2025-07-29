// saveload.js
import { projectState, runtimeState, initializeProject } from './state.js';
// --- MODIFIED IMPORT ---
// We now import the correctly named function from our updated instrument manager.
import { createInstrumentForChannel } from './instrument.js';

export function saveProject() {
    try {
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
                        try {
                            // Use the instrument's getPatch() method which calls the logic controller's getFullState
                            newChan.patch = instrument ? instrument.getPatch() : chan.patch;
                        } catch (error) {
                            console.warn(`Failed to save patch for instrument ${chan.instrumentId}:`, error);
                            // Keep existing patch data if save fails
                            newChan.patch = chan.patch;
                        }
                    }
                    return newChan;
                })
            }))
        };
        return JSON.stringify(dataToSave);
    } catch (error) {
        console.error("Failed to save project:", error);
        throw new Error(`Save failed: ${error.message}`);
    }
}

export async function loadProject(jsonString) {
    if (!jsonString) return;
    try {
        const loadedData = JSON.parse(jsonString);

        // Validate basic structure
        if (!loadedData.sequences || !Array.isArray(loadedData.sequences)) {
            throw new Error("Invalid project format: missing or invalid sequences");
        }

        projectState.bpm = loadedData.bpm || 120;
        projectState.currentSequenceIndex = loadedData.currentSequenceIndex || 0;
        projectState.sequences = loadedData.sequences;
        
        runtimeState.instrumentRack = {}; // Clear old instruments

        const loadPromises = [];
        projectState.sequences.forEach((seq, seqIndex) => {
            if (!seq.channels || !Array.isArray(seq.channels)) {
                console.warn(`Sequence ${seqIndex} has invalid channels, skipping`);
                return;
            }
            
            seq.channels.forEach((chan, chanIndex) => {
                if (chan.type === 'instrument') { 
                    // Create an instrument regardless of patch to maintain channel integrity
                    try {
                        // Call the function to create the instrument instance.
                        // The create function itself handles applying the patch if it exists.
                        loadPromises.push(Promise.resolve(createInstrumentForChannel(seqIndex, chanIndex)));
                    } catch (error) {
                        console.error(`Failed to create instrument for channel ${chanIndex} in sequence ${seqIndex}:`, error);
                        // Continue with other instruments even if one fails
                    }
                }
            });
        });

        await Promise.all(loadPromises);
        console.log("Project loaded successfully with", loadPromises.length, "instruments");
        
    } catch (e) {
        console.error("Failed to load project:", e);
        // Optionally, reset to a clean state or show user-friendly error
        throw new Error(`Load failed: ${e.message}`);
    }
}