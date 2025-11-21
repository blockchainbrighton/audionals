// Shared helpers for working with Tone.js audio context timing.

export function resolveAudioContext(Tone) {
    if (!Tone) return null;
    try {
        const candidate = typeof Tone.getContext === 'function' ? Tone.getContext() : Tone.context;
        return (
            candidate?.rawContext ||
            candidate?.context ||
            candidate?._context ||
            candidate?._nativeAudioContext ||
            candidate?.audioContext ||
            Tone.context?.rawContext ||
            Tone.context?.context ||
            Tone.context?._context ||
            Tone.context?._nativeAudioContext ||
            Tone.context?.audioContext ||
            null
        );
    } catch (err) {
        console.warn('[AudioUtils] Failed to resolve audio context:', err);
        return null;
    }
}

export function getAudioContextCurrentTime(Tone) {
    const ctx = resolveAudioContext(Tone);
    if (ctx && typeof ctx.currentTime === 'number') return ctx.currentTime;
    if (Tone && typeof Tone.now === 'function') {
        try {
            return Tone.now();
        } catch (err) {
            console.warn('[AudioUtils] Tone.now() call failed:', err);
        }
    }
    return null;
}
