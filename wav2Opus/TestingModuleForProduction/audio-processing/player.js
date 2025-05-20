// audio-processing/player.js
import { showError, triggerAnimation } from '../uiUpdater.js'; // Adjust path as needed

export function playBufferSource(audioCtx, destinationNode, buffer, time, rate, loop = false, onEndedCallback = null, offset = 0) {
    if (!audioCtx || !destinationNode || !buffer || rate <= 0) {
        console.warn("playBufferSource: Invalid parameters, buffer, or rate.", { audioCtxExists: !!audioCtx, destinationExists: !!destinationNode, bufferExists: !!buffer, rate });
        if (rate <= 0) showError("Playback rate must be positive.");
        return null;
    }
    try {
        const source = audioCtx.createBufferSource();
        Object.assign(source, { buffer, loop });
        source.playbackRate.value = rate;
        source.connect(destinationNode);
        source.start(time, offset);

        if (onEndedCallback && typeof onEndedCallback === 'function') {
            source.onended = onEndedCallback;
        }
        triggerAnimation(); // As per original _play behavior
        return source;
    } catch (e) {
        showError('Failed to play audio source.');
        console.error('Failed to play audio source:', e);
        return null;
    }
}
