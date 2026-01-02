# Effects

This category contains **Audio Processors** that transform an input signal (Reverb, Delay, Distortion, Filter).

## Reference Implementation: `UniversalFX`
A multi-effect chain demonstrating:
*   **Stereo Processing:** Independent Left/Right channels.
*   **Modulation:** LFO modulating Filter Cutoff.
*   **Delay:** Stereo delay line.

## How to Create a New Effect
1.  Copy `UniversalFX`.
2.  Update `manifest.json` (`type: "Effect"`, `inputs: 2`).
3.  Implement `process_audio(in_l, in_r, out_l, out_r)`.
    *   Read from `in_l/in_r`.
    *   Apply DSP.
    *   Write to `out_l/out_r`.

## Key Considerations
*   **Latency:** If your effect introduces latency (e.g., Lookahead Limiter), standard Web Audio nodes might need delay compensation (not currently handled automatically by BVST Host).
*   **Tail:** Reverbs/Delays should continue outputting sound even if input goes silent. The Host keeps the Worklet alive.
