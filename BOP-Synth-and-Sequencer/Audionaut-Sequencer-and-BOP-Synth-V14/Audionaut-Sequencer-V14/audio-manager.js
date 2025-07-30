/**
 * Module: audio-manager.js
 * Purpose: Audio engine core, BPM, transport, instrument node management, global audio resets.
 * Exports: setBPM, stopPlayback, resetAudioEnvironment
 */

import { projectState, runtimeState } from './state.js';

export function setBPM(newBpm) {
    projectState.bpm = newBpm;
    if (runtimeState.Tone?.Transport) runtimeState.Tone.Transport.bpm.value = newBpm;
}

function disposeAllInstrumentNodes() {
    if (!runtimeState.instrumentRack) return;
    for (const id in runtimeState.instrumentRack) {
        const logic = runtimeState.instrumentRack[id]?.logic;
        if (logic?.modules?.synthEngine?.dispose) {
            try {
                logic.modules.synthEngine.dispose();
                console.log(`[AUDIO][DEBUG] Disposed synthEngine for instrument ${id}`);
            } catch (e) {
                console.warn(`[AUDIO][DEBUG] Could not dispose synthEngine for instrument ${id}:`, e);
            }
        }
    }
    runtimeState.instrumentRack = {};
}



export function resetAudioEnvironment() {
    disposeAllInstrumentNodes();
    // Add further resets if needed
}
