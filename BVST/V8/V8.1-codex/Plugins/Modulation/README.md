# Modulation

This category contains **Time/Amplitude Modulation Effects** (Chorus, Flanger, Phaser, Tremolo, Vibrato).

## Reference Implementation: `UniversalMod`
A versatile modulation unit demonstrating:
*   **Dual LFOs:** Independent modulation sources.
*   **Stereo Width:** Offsetting LFO phase for wide stereo images.
*   **Chorus/Flanger:** Modulated Delay Lines.
*   **Tremolo:** Amplitude Modulation.

## How to Create a New Mod Plugin
1.  Copy `UniversalMod`.
2.  Adjust `lib.rs` to implement Phaser (All-pass filters) or Rotary Speaker simulation.

## Key Considerations
*   **Interpolation:** `bvst_lib`'s `Delay` uses Linear Interpolation (`lerp`), which is essential for smooth Chorus/Flanger sounds. Without it, you get "zipper noise".
*   **LFO Shapes:** `bvst_lib` supports Sin, Tri, Saw, Square.
