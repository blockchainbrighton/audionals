/**
 * instrument-lite.js
 * Purpose: minimal channel setup without loading a synth engine or UI
 * Exports: createInstrumentForChannel, openSynthUI (stub)
 */

import { projectState, runtimeState } from './sequencer-state.js';
import { setLoaderStatus } from './sequencer-ui.js';

/**
 * Creates a placeholder instrument and assigns it to a channel.
 * @param {number} seqIndex  Sequence index
 * @param {number} chanIndex Channel index
 * @returns {string|null}    New instrument ID or null on failure
 */
export function createInstrumentForChannel(seqIndex, chanIndex) {
    console.log(`[INSTRUMENT-LITE] createInstrumentForChannel seq=${seqIndex}, chan=${chanIndex}`);
    try {
        setLoaderStatus('Initialising channel…');

        const channel = projectState.sequences[seqIndex].channels[chanIndex];

        /* ---------- 1. Clean up any previous stub ---------- */
        if (channel.instrumentId && runtimeState.instrumentRack[channel.instrumentId]) {
            delete runtimeState.instrumentRack[channel.instrumentId];
        }

        /* ---------- 2. Register a new stub instrument ---------- */
        const instrumentId = `inst-${projectState.nextInstrumentId++}`;

        runtimeState.instrumentRack[instrumentId] = {
            id: instrumentId,
            /* no-op methods keep the rest of the app happy */
            trigger: () => {},
            stop:    () => {},
            getPatch: () => ({})          // always returns an empty patch
        };

        channel.instrumentId = instrumentId;

        console.log(`[INSTRUMENT-LITE] Registered stub instrument ${instrumentId}`);
        setLoaderStatus('Channel ready.', false);
        return instrumentId;
    } catch (err) {
        console.error('[INSTRUMENT-LITE] Failed to initialise channel.', err);
        setLoaderStatus('Failed to initialise channel.', true);
        return null;
    }
}
