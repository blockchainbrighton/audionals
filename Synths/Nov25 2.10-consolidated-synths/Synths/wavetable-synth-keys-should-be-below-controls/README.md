# Texture Pads | Wavetable Synth

## Overview
A textural synthesizer that focuses on evolving pads and soundscapes. While technically using FM synthesis to emulate wavetable morphing, it provides controls to "Morph" the timbre, adjust harmonic content, and shaping the sound through a lush FX chain.

## Unique Features
- **Morph Control:** A single knob that drastically changes the timbre by modulating FM index and harmonicity.
- **Macro System:** Brightness, Motion, and Space macros for high-level sound sculpting.
- **3D Visualizer:** An abstract icosahedron that deforms based on the audio waveform.
- **Atmospheric FX:** Heavy use of Reverb and Delay for creating space.

## Architecture
- **Engine:** PolySynth using FMSynth.
- **Morphing:** Modulation Index acts as the "Wavetable Position".
- **Modulation:** LFO synced to transport for rhythmic filter movement.
- **Visuals:** Three.js reactive geometry.
