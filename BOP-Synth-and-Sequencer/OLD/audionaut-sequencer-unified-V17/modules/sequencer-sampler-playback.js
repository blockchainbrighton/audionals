// sequencer-sampler-playback.js  (drop-in)
import { runtimeState } from './sequencer-state.js';

export function playSamplerChannel(time, channelData) {
    const buffer = runtimeState.allSampleBuffers[channelData.selectedSampleIndex];
    if (!buffer) return;

    const ampEnv = new runtimeState.Tone.AmplitudeEnvelope({
        attack: 0.005,
        decay: 0,
        sustain: 1.0,
        release: 0.05
    });

    const player = new runtimeState.Tone.Player(buffer).chain(
        ampEnv,
        runtimeState.Tone.Destination
    );

    ampEnv.triggerAttackRelease('16n', time);
    player.start(time);

    const disposeAfter = Math.max(100, (buffer.duration + 0.1) * 1000 + 50);
    setTimeout(() => {
        try { player.dispose(); ampEnv.dispose(); } catch {}
    }, disposeAfter);
}