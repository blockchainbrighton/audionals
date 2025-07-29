// saveload.js (Rewritten with extensive, structured logging)

import { projectState, runtimeState, initializeProject } from './state.js';
import { createInstrumentForChannel } from './instrument.js';

/**
 * Gathers the current project state and returns it as a JSON string.
 * This function DOES NOT save to localStorage; it only prepares the data.
 * Another function must call this and handle the actual storage.
 * @returns {string} A JSON string representing the entire project.
 */
export function saveProject() {
    // Use groupCollapsed so the save process doesn't clutter the console unless inspected.
    console.groupCollapsed('%c[SAVE] Starting Project Save Process', 'color: #0000FF; font-weight: bold;');
    try {
        console.log('[SAVE] Gathering data from projectState and runtimeState...');
        const dataToSave = {
            bpm: projectState.bpm,
            currentSequenceIndex: projectState.currentSequenceIndex,
            // Map over sequences to create a clean, serializable version.
            sequences: projectState.sequences.map((seq, seqIndex) => {
                console.log(`[SAVE] Processing sequence ${seqIndex}...`);
                return {
                    channels: seq.channels.map((chan, chanIndex) => {
                        const newChan = { type: chan.type, steps: [...chan.steps] }; // Create a fresh object
                        
                        if (chan.type === 'sampler') {
                            newChan.selectedSampleIndex = chan.selectedSampleIndex;
                        } else if (chan.type === 'instrument' && chan.instrumentId) {
                            console.log(`[SAVE]  -> Found instrument channel ${chanIndex} with ID: ${chan.instrumentId}.`);
                            const instrument = runtimeState.instrumentRack[chan.instrumentId];
                            
                            if (instrument) {
                                try {
                                    // CRITICAL: Get the live state from the instrument's logic core.
                                    newChan.patch = instrument.getPatch(); // This will trigger the log in instrument.js
                                    console.log(`%c[SAVE]  -> Successfully captured patch for ${chan.instrumentId}.`, 'color: blue;', newChan.patch);
                                } catch (error) {
                                    console.error(`[SAVE]  -> FAILED to get patch for instrument ${chan.instrumentId}. Reverting to old patch data if available.`, error);
                                    newChan.patch = chan.patch || null; // Fallback
                                }
                            } else {
                                console.warn(`[SAVE]  -> Instrument ${chan.instrumentId} not found in rack. Saving existing patch data.`);
                                newChan.patch = chan.patch || null;
                            }
                        }
                        return newChan;
                    })
                };
            })
        };

        console.log('%c[SAVE] Final data object prepared for stringification:', 'font-weight: bold;', dataToSave);
        const jsonString = JSON.stringify(dataToSave);
        console.log('[SAVE] Process complete. Returning JSON string.');
        return jsonString;

    } catch (error) {
        console.error("CRITICAL FAILURE during saveProject:", error);
        throw new Error(`Save failed: ${error.message}`);
    } finally {
        console.groupEnd(); // Always close the log group
    }
}

/**
 * Loads a project from a JSON string, populating projectState and re-creating instruments.
 * @param {string} jsonString - The project data to load.
 */
export async function loadProject(jsonString) {
    // Use a non-collapsed group for loading as it's a more active debugging event.
    console.group('%c[LOAD] Starting Project Load Process', 'color: #008000; font-weight: bold;');
    try {
        if (!jsonString) {
            console.warn('[LOAD] Load aborted: Provided JSON string is empty.');
            return;
        }
        console.log('[LOAD] Received JSON string, attempting to parse...');
        const loadedData = JSON.parse(jsonString);
        console.log('[LOAD] JSON parsed successfully. Loaded data:', loadedData);

        // Validate basic structure
        if (!loadedData.sequences || !Array.isArray(loadedData.sequences)) {
            throw new Error("Invalid project format: 'sequences' array is missing or invalid.");
        }

        // --- STATE RESET & POPULATION ---
        console.log('[LOAD] Clearing old instrument rack...');
        runtimeState.instrumentRack = {}; // Clear old instrument instances

        console.log('[LOAD] Applying loaded data to projectState...');
        projectState.bpm = loadedData.bpm || 120;
        projectState.currentSequenceIndex = loadedData.currentSequenceIndex || 0;
        projectState.sequences = loadedData.sequences; // This is the key step!
        
        console.log('[LOAD] Iterating through sequences and channels to re-create instruments...');
        const loadPromises = [];
        projectState.sequences.forEach((seq, seqIndex) => {
            if (!seq.channels || !Array.isArray(seq.channels)) {
                console.warn(`[LOAD] Sequence ${seqIndex} has invalid channels, skipping.`);
                return;
            }
            
            seq.channels.forEach((chan, chanIndex) => {
                if (chan.type === 'instrument') {
                    console.log(`[LOAD] -> Found instrument channel at [seq:${seqIndex}, chan:${chanIndex}].`);
                    // The `createInstrumentForChannel` function will read `chan.patch` from the
                    // `projectState` we just populated. This is where the magic happens.
                    if (chan.patch) {
                        console.log(`%c[LOAD] -> Patch data found for this channel. It will be applied during creation.`, 'color: green;');
                    } else {
                        console.warn(`[LOAD] -> No patch data found for this channel. It will be created with default settings.`);
                    }
                    
                    try {
                        // The creation function itself is now the load mechanism.
                        loadPromises.push(Promise.resolve(createInstrumentForChannel(seqIndex, chanIndex)));
                    } catch (error) {
                        console.error(`[LOAD] -> FAILED to create instrument for channel [${seqIndex}, ${chanIndex}].`, error);
                    }
                }
            });
        });

        await Promise.all(loadPromises);
        console.log(`%c[LOAD] Project loaded successfully. Re-created ${loadPromises.length} instrument(s).`, 'color: #008000; font-weight: bold;');
        
    } catch (e) {
        console.error("CRITICAL FAILURE during loadProject:", e);
        // Resetting to a clean state might be a good idea here to prevent corruption.
        initializeProject(); 
        throw new Error(`Load failed: ${e.message}`);
    } finally {
        console.groupEnd(); // Always close the log group
    }
}