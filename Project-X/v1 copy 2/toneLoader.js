export function loadToneJSAndBoot({
    toneUrl = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0',
    setLoaderStatus = () => {},
    runtimeState = {},
    boot = () => {}
} = {}) {
    setLoaderStatus('Loading Audio Engine...');
    import(/* @vite-ignore */ toneUrl)
        .then(mod => {
            runtimeState.Tone = window.Tone ?? mod?.default ?? mod;
            setLoaderStatus(`Tone.js v${runtimeState.Tone?.version ?? '?' } ready.`);
            boot();
        })
        .catch(err => {
            setLoaderStatus('Failed to load Tone.js. App cannot start.', true);
            console.error(err);
        });
}