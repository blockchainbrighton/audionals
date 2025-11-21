import { SimpleSynthLogic } from './simple-synth-logic.js';
import { registerSimpleSynthUI } from './simple-synth-component.js';
import { TONE_ORDINALS_URL } from '../sequencer/sequencer-config.js';

async function loadTone(toneLoader) {
    if (typeof toneLoader === 'function') {
        const tone = await toneLoader();
        if (tone) return tone;
    }
    const mod = await import(/* @vite-ignore */ TONE_ORDINALS_URL);
    return mod?.Tone ?? mod?.default ?? globalThis.Tone;
}

export async function startSimpleSynthApp(options = {}) {
    const doc = options.document ?? (typeof document !== 'undefined' ? document : null);
    if (!doc) throw new Error('startSimpleSynthApp requires a document reference.');

    registerSimpleSynthUI(doc.defaultView ?? globalThis);
    const Tone = await loadTone(options.toneLoader);
    if (!Tone) throw new Error('Unable to resolve Tone.js for the simple synth.');

    const root = doc.getElementById('synth-app-root');
    if (!root) throw new Error('Simple synth host element (#synth-app-root) not found.');

    const synthElement = doc.createElement('simple-synth-ui');
    root.appendChild(synthElement);

    const logic = new SimpleSynthLogic(Tone);
    synthElement.connect(logic);
    logic.connectUI(synthElement.uiController);

    const teardown = () => {
        try { logic.disconnectUI(); } catch {}
        try { logic.destroy(); } catch {}
        try { synthElement.remove(); } catch {}
    };

    const win = options.window ?? doc.defaultView ?? globalThis;
    win?.addEventListener?.('beforeunload', teardown, { once: true });

    return { logic, synthElement, teardown };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    startSimpleSynthApp().catch(err => {
        console.error('[Simple Synth] Failed to boot standalone host:', err);
    });
}
