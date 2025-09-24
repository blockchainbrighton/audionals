// BOP-Sequencer-V10-Modular/main.js  (drop-in)
import { TONE_ORDINALS_URL } from './sequencer-config.js';
import { runtimeState, initializeProject, defaultSampleOrder } from './sequencer-state.js';
import { render, bindEventListeners, setLoaderStatus, updateStepRows } from './sequencer-ui.js';
import { SimpleSampleLoader } from './sequencer-sample-loader.js';
import { installStateProbeButton } from './sequencer-state-probe.js';
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

// --- SINGLE TONE LOADER & GLOBAL EXPORT ---
setLoaderStatus('Loading Audio Engine...');
import(TONE_ORDINALS_URL)
    .then(() => {
        runtimeState.Tone = window.Tone;
        // Ensure globally reachable so synth-logic.js can import it
        window.BOP_TONE = runtimeState.Tone;
        console.log('[BOP Matrix] Tone.js loaded:', runtimeState.Tone?.version ?? 'Unknown');
        boot();
    })
    .catch(err => {
        setLoaderStatus('Failed to load Tone.js. App cannot start.', true);
        console.error('[BOP Matrix] Critical Tone.js load error:', err);
    });