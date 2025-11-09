/**
 * Module: BOP-Sequencer-V10-Modular/save-load-sequence.js
 * Purpose: save-load-sequence module
 * Exports: saveProject
 * Depends on: instrument.js, sequencer-state.js
 */

// save-load-sequence.js (Enhanced Debug/Diagnostic Version)

import { projectState, runtimeState, initializeProject, syncNextInstrumentIdAfterLoad, ensureChannelMixDefaults, ensureSamplerChannelDefaults, ensureChannelInsertSettings, createDefaultInsertSettings } from './sequencer-state.js';
import { SimpleSampleLoader } from './sequencer-sample-loader.js';
import { createInstrumentForChannel } from './sequencer-instrument.js';
import { disposeAllChannelGains, updateAllChannelGains } from './sequencer-channel-mixer.js';
import { resetInstrumentLiveState } from './instrument-live-controller.js';

// === Optional: Track and clean up ALL Tone.js audio nodes for debug ===
const globalWindow = (typeof window !== 'undefined') ? window : null;
const debugAudioNodes = globalWindow
    ? (globalWindow._debugAudioNodes ?? (globalWindow._debugAudioNodes = []))
    : [];

function trackAudioNode(node) {
    debugAudioNodes.push(node);
    return node;
}

function disposeAllTrackedAudioNodes() {
    debugAudioNodes.forEach(node => {
        try { node.dispose?.(); } catch (e) { console.warn('[AUDIO-NODE] Failed dispose', node, e); }
    });
    debugAudioNodes.length = 0;
    if (globalWindow) {
        console.info('[AUDIO-NODE] All tracked audio nodes disposed.');
    }
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
                        ensureChannelInsertSettings(chan);
                        const newChan = {
                            type: chan.type,
                            steps: [...chan.steps],
                            muted: !!chan.muted,
                            solo: !!chan.solo,
                            volume: Math.min(1, Math.max(0, (typeof chan.volume === 'number' && !Number.isNaN(chan.volume)) ? chan.volume : 1)),
                            insertSettings: JSON.parse(JSON.stringify(chan.insertSettings || createDefaultInsertSettings()))
                        };
                        if (chan.type === 'sampler') {
                            ensureSamplerChannelDefaults(chan);
                            const {
                                sampleRegion,
                                samplePlaybackRate,
                                sampleFadeIn,
                                sampleFadeOut,
                                sampleFadeInShape,
                                sampleFadeOutShape
                            } = chan;
                            newChan.selectedSampleIndex = chan.selectedSampleIndex;
                            newChan.selectedSampleOrdinal = SimpleSampleLoader.getOrdinalIdByIndex(chan.selectedSampleIndex) ?? null;
                            newChan.sampleDescriptor = chan.sampleDescriptor ? { ...chan.sampleDescriptor } : null;
                            newChan.sampleRegion = { start: sampleRegion.start, end: sampleRegion.end };
                            newChan.samplePlaybackRate = samplePlaybackRate;
                            newChan.sampleFadeIn = sampleFadeIn;
                            newChan.sampleFadeOut = sampleFadeOut;
                            newChan.sampleFadeInShape = sampleFadeInShape;
                            newChan.sampleFadeOutShape = sampleFadeOutShape;
                            newChan.allowOverlap = !!chan.allowOverlap;
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
        dataToSave.dynamicSamples = SimpleSampleLoader.getDynamicSamplesSnapshot();
        // Deep compare (if running in debug mode)
        if (globalWindow?._lastSave) {
            const diff = JSON.stringify(globalWindow._lastSave) !== JSON.stringify(dataToSave);
            console[diff ? 'warn' : 'log'](`[SAVE] Patch changed since last save? ${diff}`);
        }
        if (globalWindow) {
            globalWindow._lastSave = dataToSave;
        }
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
        resetInstrumentLiveState();

        console.log('[LOAD] Applying loaded data to projectState...');
        disposeAllChannelGains();
        runtimeState.channelInsertChains.forEach(chain => {
            try { chain.dispose?.(); } catch (err) { console.warn('[LOAD] Failed to dispose insert chain during project reset:', err); }
        });
        runtimeState.channelInsertChains.clear();

        const baseSampleCount = SimpleSampleLoader.ogSampleUrls.length;
        runtimeState.sampleMetadata.names.length = baseSampleCount;
        runtimeState.sampleMetadata.isLoop.length = baseSampleCount;
        runtimeState.sampleMetadata.bpms.length = baseSampleCount;
        SimpleSampleLoader.ogSampleUrls.forEach((item, i) => {
            runtimeState.sampleMetadata.names[i] = item.text || `Sample ${i + 1}`;
            runtimeState.sampleMetadata.isLoop[i] = item.isLoop ?? false;
            runtimeState.sampleMetadata.bpms[i] = item.bpm ?? null;
        });
        Object.keys(runtimeState.allSampleBuffers).forEach(key => {
            if (Number(key) >= baseSampleCount) delete runtimeState.allSampleBuffers[key];
        });

        const dynamicSnapshot = Array.isArray(loadedData.dynamicSamples) ? loadedData.dynamicSamples : [];
        const restoredDynamic = SimpleSampleLoader.restoreDynamicSamples(dynamicSnapshot);
        restoredDynamic.forEach(({ index, descriptor }) => {
            if (!descriptor) return;
            const tail = typeof descriptor.value === 'string' ? descriptor.value.slice(-12) : String(index);
            runtimeState.sampleMetadata.names[index] = descriptor.text || `Ordinal ${tail}`;
            runtimeState.sampleMetadata.isLoop[index] = descriptor.isLoop ?? false;
            runtimeState.sampleMetadata.bpms[index] = typeof descriptor.bpm === 'number' ? descriptor.bpm : null;
        });

        const ordinalSnapshotLookup = new Map();
        dynamicSnapshot.forEach(entry => {
            if (!entry) return;
            const ordinalId = typeof entry.ordinalId === 'string' ? entry.ordinalId.toLowerCase() : null;
            if (!ordinalId) return;
            ordinalSnapshotLookup.set(ordinalId, entry);
        });

        projectState.bpm = loadedData.bpm || 120;
        projectState.currentSequenceIndex = loadedData.currentSequenceIndex || 0;
        projectState.sequences = loadedData.sequences;
        projectState.sequences.forEach(seq => {
            if (!seq.channels) return;
            seq.channels.forEach(chan => {
                ensureChannelMixDefaults(chan);
                ensureChannelInsertSettings(chan);
                if (chan.type === 'sampler') {
                    if (!Number.isInteger(chan.selectedSampleIndex) || chan.selectedSampleIndex < 0) {
                        chan.selectedSampleIndex = 0;
                    }
                    if (typeof chan.allowOverlap !== 'boolean') {
                        chan.allowOverlap = false;
                    }

                    const savedDescriptor = chan.sampleDescriptor || null;
                    let descriptor = SimpleSampleLoader.getDescriptorForIndex(chan.selectedSampleIndex);
                    let snapshotEntry;

                    const savedOrdinal = typeof chan.selectedSampleOrdinal === 'string'
                        ? chan.selectedSampleOrdinal.toLowerCase()
                        : null;

                    if (savedDescriptor?.sourceType === 'builtin' || (Number.isInteger(savedDescriptor?.index) && savedDescriptor.index < baseSampleCount)) {
                        let targetIndex = -1;
                        if (savedDescriptor?.ordinalId) {
                            targetIndex = SimpleSampleLoader.getIndexForOrdinal(savedDescriptor.ordinalId);
                        }
                        if (targetIndex < 0 && Number.isInteger(savedDescriptor?.index) && savedDescriptor.index < baseSampleCount) {
                            targetIndex = savedDescriptor.index;
                        }
                        if (targetIndex >= 0) {
                            chan.selectedSampleIndex = targetIndex;
                            descriptor = SimpleSampleLoader.getDescriptorForIndex(targetIndex);
                        }
                    }

                    if (!descriptor) {
                        if (savedDescriptor && savedDescriptor.sourceType === 'dynamic') {
                            const source = savedDescriptor.url || savedDescriptor.ordinalId;
                            if (source) {
                                try {
                                    const { index, descriptor: registered } = SimpleSampleLoader.registerDynamicSample({
                                        url: source,
                                        name: savedDescriptor.name,
                                        bpm: savedDescriptor.bpm,
                                        isLoop: savedDescriptor.isLoop
                                    });
                                    if (Number.isInteger(index)) {
                                        chan.selectedSampleIndex = index;
                                        descriptor = registered;
                                    }
                                } catch (err) {
                                    console.warn('[LOAD] Failed to register channel sample descriptor', savedDescriptor, err);
                                }
                            }
                        }

                        if (!descriptor && savedOrdinal) {
                            snapshotEntry = ordinalSnapshotLookup.get(savedOrdinal) || null;
                            const source = snapshotEntry?.url || savedOrdinal;
                            if (source) {
                                try {
                                    const { index, descriptor: registered } = SimpleSampleLoader.registerDynamicSample({
                                        url: source,
                                        name: snapshotEntry?.name,
                                        bpm: snapshotEntry?.bpm,
                                        isLoop: snapshotEntry?.isLoop
                                    });
                                    if (Number.isInteger(index)) {
                                        chan.selectedSampleIndex = index;
                                        descriptor = registered;
                                    }
                                } catch (err) {
                                    console.warn('[LOAD] Failed to register saved ordinal sample', { source, channel: chan }, err);
                                }
                            }
                        }

                        if (!descriptor) {
                            chan.selectedSampleIndex = savedDescriptor?.index ?? 0;
                            descriptor = SimpleSampleLoader.getDescriptorForIndex(chan.selectedSampleIndex) || null;
                            if (!descriptor) {
                                chan.selectedSampleIndex = 0;
                                descriptor = SimpleSampleLoader.getDescriptorForIndex(0);
                            }
                            chan.selectedSampleOrdinal = SimpleSampleLoader.getOrdinalIdByIndex(chan.selectedSampleIndex);
                        }
                    }

                    if (descriptor) {
                        const idx = chan.selectedSampleIndex;
                        const entryTail = typeof descriptor.value === 'string' ? descriptor.value.slice(-12) : String(idx);
                        const fallbackName = savedDescriptor?.name || snapshotEntry?.name || `Ordinal ${entryTail}`;
                        if (idx >= baseSampleCount) {
                            runtimeState.sampleMetadata.names[idx] = descriptor.text || fallbackName;
                            runtimeState.sampleMetadata.isLoop[idx] = descriptor.isLoop
                                ?? savedDescriptor?.isLoop
                                ?? snapshotEntry?.isLoop
                                ?? false;
                            runtimeState.sampleMetadata.bpms[idx] = typeof descriptor.bpm === 'number'
                                ? descriptor.bpm
                                : (typeof savedDescriptor?.bpm === 'number'
                                    ? savedDescriptor.bpm
                                    : (typeof snapshotEntry?.bpm === 'number' ? snapshotEntry.bpm : null));
                        }
                    }

                    ensureSamplerChannelDefaults(chan);
                }
                if (!Array.isArray(chan.steps)) chan.steps = [];
            });
        });
        syncNextInstrumentIdAfterLoad(); // <-- always after setting projectState.sequences


        // Create a snapshot of the loaded patch for diffing after load
        if (globalWindow) {
            globalWindow._lastLoadedPatch = JSON.parse(JSON.stringify(loadedData));
        }

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
        projectState.sequences.forEach(seq => updateAllChannelGains(seq));

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
        if (globalWindow) {
            console.info('[AUDIO-NODE] Tracked audio nodes after load:', debugAudioNodes.length);
        }

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
