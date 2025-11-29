# FM KEYS | DX Poly

## Overview
A polyphonic Frequency Modulation (FM) synthesizer inspired by the DX series. It simplifies FM synthesis into accessible controls like Harmonicity (Ratio) and Modulation Index, making it easy to create glass bells, electric pianos, and metallic textures.

## Unique Features
- **Accessible FM:** Simplified FM engine focusing on the relationship between Carrier and Modulator.
- **Polyphonic:** Supports chords and complex harmonies.
- **Post-FX:** Includes Tremolo, Chorus, Delay, and Reverb to warm up the cold digital FM sound.
- **Visualizer:** 3D-style line visualizer reacting to the frequency spectrum.
- **Macros:** "Timbre" controls via Ratio and Index knobs.

## Architecture
- **Engine:** PolySynth using Tone.FMSynth.
- **Operators:** Sine carrier + Sine modulator (configurable).
- **Envelopes:** Shared ADSR for Amplitude and Modulation depth.
- **Filter:** Post-FM Lowpass filter to tame brightness.
