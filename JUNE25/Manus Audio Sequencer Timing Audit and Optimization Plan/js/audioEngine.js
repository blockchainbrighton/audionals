// audioEngine.js - Facade

// Import from audioCore to ensure it's initialized and to get ctx
// The import itself ensures audioCore.js runs its initAudioEngineStateListener.
import { ctx as coreCtx } from './audioCore.js';

// Import and re-export from playbackEngine
// This makes start, stop, and playStartTime available as if they were defined in this module,
// maintaining the live binding for the exported 'playStartTime' variable.
export { start, stop, playStartTime } from './playbackEngine.js';

// Export ctx, obtained from audioCore
export const ctx = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive', // or 'balanced' or specific numeric value if testing reveals benefit
    // sampleRate: 48000 // Consider if you need a fixed sample rate. Often letting the browser choose is fine unless you have specific assets or DSP that require it.
  });
  
  console.log(`[audioCore] AudioContext initialized. State: ${ctx.state}`);
  console.log(`[audioCore] Base Latency: ${ctx.baseLatency !== undefined ? (ctx.baseLatency * 1000).toFixed(2) + 'ms' : 'N/A (Not supported)'}`);
  console.log(`[audioCore] Output Latency: ${ctx.outputLatency !== undefined ? (ctx.outputLatency * 1000).toFixed(2) + 'ms' : 'N/A (Not supported)'}`);
  console.log(`[audioCore] Sample Rate: ${ctx.sampleRate} Hz`);

  ctx.onstatechange = () => {
    console.log(`[audioCore] AudioContext state changed to: ${ctx.state}`);
    if (State.get().playing && (ctx.state === 'interrupted' || ctx.state === 'suspended')) {
        console.warn('[audioCore] AudioContext interrupted or suspended during playback.');
        // Optionally, you could try to stop playback via State.update({ playing: false });
        // or attempt a resume, though resuming an 'interrupted' context might not always work
        // or be desirable without user interaction.
    }
    // If you want to automatically attempt resume (might need user gesture for 'suspended'):
    // if (ctx.state === 'suspended') {
    //   ctx.resume().then(() => {
    //     console.log('[audioCore] AudioContext resumed via onstatechange listener.');
    //   }).catch(err => {
    //     console.error('[audioCore] Error resuming AudioContext via onstatechange:', err);
    //   });
    // }
};