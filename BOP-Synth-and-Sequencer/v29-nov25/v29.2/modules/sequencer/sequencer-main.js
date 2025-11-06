/**
 * Module: BOP-Sequencer-V10-Modular/main.js
 * Purpose: Main module entry point and bootstrapping
 * Exports: boot
 * Depends on: audional-base64-sample-loader.js, sequencer-state.js, config.js, ui.js
 */

// main.js
import { TONE_ORDINALS_URL } from './sequencer-config.js';
import { runtimeState, initializeProject, defaultSampleOrder } from './sequencer-state.js';
import { initSequencerUI, render, bindEventListeners, setLoaderStatus, updateStepRows } from './sequencer-ui.js';
import { SimpleSampleLoader } from './sequencer-sample-loader.js';

async function boot() {
    try {
        setLoaderStatus('Loading Samples...');
        const urls = SimpleSampleLoader.ogSampleUrls;
        urls.forEach((item, i) => {
            runtimeState.sampleMetadata.names[i] = item.text || `Sample ${i}`;
            runtimeState.sampleMetadata.isLoop[i] = item.isLoop ?? false;
            runtimeState.sampleMetadata.bpms[i] = item.bpm ?? null;
        });

        // Use the imported array to load all samples needed for the default channels.
        const initialSampleIndices = defaultSampleOrder; 
        await Promise.all(initialSampleIndices.map(async idx => {
            if (!runtimeState.allSampleBuffers[idx]) {
                runtimeState.allSampleBuffers[idx] = await SimpleSampleLoader.getSampleByIndex(idx);
            }
        }));


        initializeProject();
        bindEventListeners();
        updateStepRows();
        render();

        setLoaderStatus('Ready!', false);

    } catch (err) {
        setLoaderStatus('Initialization failed: ' + err.message, true);
        console.error(err);
    }
}

async function loadTone(globalWindow, toneLoader) {
    const loaderFn = typeof toneLoader === 'function'
        ? toneLoader
        : () => import(TONE_ORDINALS_URL);
    const result = await loaderFn();
    const toneCandidate =
        globalWindow?.Tone
        ?? globalThis.Tone
        ?? result?.Tone
        ?? result?.default
        ?? null;
    if (!toneCandidate) {
        throw new Error('Tone.js module did not provide a Tone export.');
    }
    runtimeState.Tone = toneCandidate;
    console.log('[BOP Matrix] Tone.js loaded:', runtimeState.Tone?.version ?? 'Unknown');
    return runtimeState.Tone;
}

export async function startSequencerApp(options = {}) {
    const doc = options.document ?? (typeof document !== 'undefined' ? document : null);
    const win = options.window ?? doc?.defaultView ?? (typeof window !== 'undefined' ? window : null);
    if (!doc) {
        throw new Error('startSequencerApp requires a document reference.');
    }

    initSequencerUI({ document: doc, window: win });
    setLoaderStatus('Loading Audio Engine...');

    try {
        await loadTone(win, options.toneLoader);
    } catch (err) {
        setLoaderStatus('Failed to load Tone.js. App cannot start.', true);
        console.error('[BOP Matrix] Critical Tone.js load error:', err);
        throw err;
    }

    await boot();
}
