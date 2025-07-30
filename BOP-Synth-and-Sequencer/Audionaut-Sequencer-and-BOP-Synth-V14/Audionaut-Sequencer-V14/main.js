/**
 * Module: BOP-Sequencer-V10-Modular/main.js
 * Purpose: Main module entry point and bootstrapping
 * Exports: boot
 * Depends on: audional-base64-sample-loader.js, state.js, config.js, stateProbe.js, ui.js
 */

// main.js
import { TONE_ORDINALS_URL } from './config.js';
import { runtimeState, initializeProject, defaultSampleOrder } from './state.js';
import { render, bindEventListeners, setLoaderStatus, updateStepRows } from './ui.js';
import { SimpleSampleLoader } from './audional-base64-sample-loader.js';
import { installStateProbeButton } from './stateProbe.js';
installStateProbeButton();

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

// --- Dynamic Tone.js Loader ---
setLoaderStatus('Loading Audio Engine...');
import(TONE_ORDINALS_URL)
    .then(module => {
        runtimeState.Tone = window.Tone;
        console.log('[BOP Matrix] Tone.js loaded:', runtimeState.Tone?.version ?? 'Unknown');
        boot();
    })
    .catch(err => {
        setLoader-status('Failed to load Tone.js. App cannot start.', true);
        console.error('[BOP Matrix] Critical Tone.js load error:', err);
    });