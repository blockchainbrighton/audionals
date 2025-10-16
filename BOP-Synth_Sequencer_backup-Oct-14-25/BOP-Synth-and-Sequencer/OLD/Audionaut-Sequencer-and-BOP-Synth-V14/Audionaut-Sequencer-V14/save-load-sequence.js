/**
 * Module: BOP-Sequencer-V10-Modular/save-load-sequence.js
 * Purpose: save-load-sequence module
 * Exports: saveProject
 * Depends on: instrument.js, state.js
 */

// save-load-sequence.js (Enhanced Debug/Diagnostic Version)

import { projectState, runtimeState, initializeProject, syncNextInstrumentIdAfterLoad } from './state.js';
import { createInstrumentForChannel } from './instrument.js';

// === Optional: Track and clean up ALL Tone.js audio nodes for debug ===
if (!window._debugAudioNodes) window._debugAudioNodes = [];
function trackAudioNode(node) {
    window._debugAudioNodes.push(node);
    return node;
}
function disposeAllTrackedAudioNodes() {
    window._debugAudioNodes.forEach(node => {
        try { node.dispose?.(); } catch (e) { console.warn('[AUDIO-NODE] Failed dispose', node, e); }
    });
    window._debugAudioNodes.length = 0;
    console.info('[AUDIO-NODE] All tracked audio nodes disposed.');
}

// ========== PROJECT SAVE ==========
export function saveProject() {
    console.groupCollapsed('%c[SAVE] Starting Project Save Process', 'color: #0000FF; font-weight: bold;');
    try {
        console.log('[SAVE] Gathering data from projectState and runtimeState...');
        const dataToSave = {
            bpm: projectState.bpm,
            currentSequenceIndex: projectState.currentSequenceIndex,
            sequences: projectState.sequences.map((seq, seqIndex) => {
                console.log(`[SAVE] Processing sequence ${seqIndex}...`);
                return {
                    channels: seq.channels.map((chan, chanIndex) => {
                        const newChan = { type: chan.type, steps: [...chan.steps] };
                        if (chan.type === 'sampler') {
                            newChan.selectedSampleIndex = chan.selectedSampleIndex;
                        } else if (chan.type === 'instrument' && chan.instrumentId) {
                            console.log(`[SAVE]  -> Found instrument channel ${chanIndex} with ID: ${chan.instrumentId}.`);
                            const instrument = runtimeState.instrumentRack[chan.instrumentId];
                            if (instrument) {
                                try {
                                    newChan.patch = instrument.getAllParameters();
                                    console.log(`%c[SAVE]  -> Captured patch for ${chan.instrumentId}:`, 'color: blue;', JSON.stringify(newChan.patch));
                                } catch (error) {
                                    console.error(`[SAVE]  -> FAILED to get patch for ${chan.instrumentId}`, error);
                                    newChan.patch = chan.patch || null;
                                }
                            } else {
                                console.warn(`[SAVE]  -> Instrument ${chan.instrumentId} not found, saving last patch (if any).`);
                                newChan.patch = chan.patch || null;
                            }
                        }
                        return newChan;
                    })
                };
            })
        };
        // Deep compare (if running in debug mode)
        if (window._lastSave) {
            const diff = JSON.stringify(window._lastSave) !== JSON.stringify(dataToSave);
            console[diff ? 'warn' : 'log'](`[SAVE] Patch changed since last save? ${diff}`);
        }
        window._lastSave = dataToSave;
        console.log('%c[SAVE] Final data object:', 'font-weight: bold;', dataToSave);
        const jsonString = JSON.stringify(dataToSave);
        console.log('[SAVE] Process complete. Returning JSON string.');
        return jsonString;
    } catch (error) {
        console.error("CRITICAL FAILURE during saveProject:", error);
        throw new Error(`Save failed: ${error.message}`);
    } finally {
        console.groupEnd();
    }
}

// ========== PROJECT LOAD ==========
export async function loadProject(jsonString) {
    console.group('%c[LOAD] Starting Project Load Process', 'color: #008000; font-weight: bold;');
    try {
        if (!jsonString) {
            console.warn('[LOAD] Load aborted: Provided JSON string is empty.');
            return;
        }
        console.log('[LOAD] Received JSON string, attempting to parse...');
        const loadedData = JSON.parse(jsonString);
        console.log('[LOAD] JSON parsed successfully. Loaded data:', loadedData);

        if (!loadedData.sequences || !Array.isArray(loadedData.sequences))
            throw new Error("Invalid project format: 'sequences' array is missing or invalid.");

        // === [KEY OVERSIGHT] ===
        // Log all instrument/sampler state BEFORE nuking
        console.groupCollapsed('[LOAD] Instrument rack state BEFORE dispose/reset');
        for (const id in runtimeState.instrumentRack) {
            const inst = runtimeState.instrumentRack[id];
            if (inst?.logic?.modules?.synthEngine) {
                console.info(`[LOAD] Old Synth State:`, inst.logic.modules.synthEngine.getAllParameters());
            }
        }
        console.groupEnd();

        // Discard all audio nodes (optional, but good for “ghost node” bugs)
        disposeAllTrackedAudioNodes();

        // Reset
        console.log('[LOAD] Clearing old instrument rack...');
        runtimeState.instrumentRack = {};

        console.log('[LOAD] Applying loaded data to projectState...');
        projectState.bpm = loadedData.bpm || 120;
        projectState.currentSequenceIndex = loadedData.currentSequenceIndex || 0;
        projectState.sequences = loadedData.sequences;
        syncNextInstrumentIdAfterLoad(); // <-- always after setting projectState.sequences


        // Create a snapshot of the loaded patch for diffing after load
        window._lastLoadedPatch = JSON.parse(JSON.stringify(loadedData));

        // Instrument restore/creation
        console.log('[LOAD] Iterating through sequences and channels to re-create instruments...');
        const loadPromises = [];
        projectState.sequences.forEach((seq, seqIndex) => {
            if (!seq.channels || !Array.isArray(seq.channels)) {
                console.warn(`[LOAD] Sequence ${seqIndex} has invalid channels, skipping.`);
                return;
            }
            seq.channels.forEach((chan, chanIndex) => {
                if (chan.type === 'instrument') {
                    console.log(`[LOAD] -> Found instrument channel at [seq:${seqIndex}, chan:${chanIndex}]`);
                    if (chan.patch) {
                        console.log(`%c[LOAD] -> Patch data found for this channel.`, 'color: green;', chan.patch);
                    } else {
                        console.warn(`[LOAD] -> No patch found. Using default settings.`);
                    }
                    try {
                        loadPromises.push(Promise.resolve(createInstrumentForChannel(seqIndex, chanIndex)));
                    } catch (error) {
                        console.error(`[LOAD] -> FAILED to create instrument for channel [${seqIndex}, ${chanIndex}].`, error);
                    }
                }
            });
        });

        await Promise.all(loadPromises);
        console.log(`%c[LOAD] Project loaded. Instruments restored: ${loadPromises.length}`, 'color: #008000; font-weight: bold;');

        // === [AFTERLOAD OVERSIGHT] ===
        // Dump all new live synth states for comparison
        console.groupCollapsed('[LOAD] Instrument rack state AFTER restore');
        for (const id in runtimeState.instrumentRack) {
            const inst = runtimeState.instrumentRack[id];
            if (inst?.logic?.modules?.synthEngine) {
                const patch = inst.logic.modules.synthEngine.getAllParameters();
                console.info(`[LIVE-SYNTH-STATE:${id}]`, patch);
                // Deep compare to loadedData if patch exists
                const loadedPatch = findLoadedPatchById(id, loadedData);
                if (loadedPatch) {
                    const isEqual = JSON.stringify(patch) === JSON.stringify(loadedPatch);
                    if (!isEqual) {
                        console.warn(`[PATCH-MISMATCH] Live synth state for ${id} does not match loaded patch!`, { live: patch, loaded: loadedPatch });
                    }
                }
            }
        }
        console.groupEnd();

        // Optional: Show how many audio nodes exist after load
        console.info('[AUDIO-NODE] Tracked audio nodes after load:', window._debugAudioNodes.length);

    } catch (e) {
        console.error("CRITICAL FAILURE during loadProject:", e);
        initializeProject();
        throw new Error(`Load failed: ${e.message}`);
    } finally {
        console.groupEnd();
    }
}

// --- Helper to match a loaded patch by instrumentId, if present ---
function findLoadedPatchById(id, loadedData) {
    for (const seq of loadedData.sequences || []) {
        for (const chan of seq.channels || []) {
            if (chan.instrumentId === id && chan.patch) return chan.patch;
        }
    }
    return null;
}
