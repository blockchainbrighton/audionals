# Resonator | Physical Modeling Synth

## Overview
Resonator utilizes Karplus-Strong string synthesis to simulate plucked string instruments. It goes beyond standard subtractive synthesis to create realistic or otherworldly acoustic textures like guitars, sitars, and bells.

## Unique Features
- **Physical Modeling:** Controls for Damping, Resonance, and Pluck Force (Attack Noise).
- **Body Tone:** Simulates the resonant body of the instrument using a filter.
- **3D Visualizer:** A 3D string simulation that vibrates based on note activity.
- **Presets:** Includes Nylon, Steel, Kalimba, and Glass presets.

## Architecture
- **Engine:** Tone.PluckSynth (Karplus-Strong algorithm).
- **Polyphony:** Manual round-robin voice allocation (12 voices) to allow ringing tails.
- **FX:** Feedback Delay and Large Room Reverb.
