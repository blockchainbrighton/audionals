# ZERO-ONE Expressive Lead

## Overview
A performance-oriented lead synthesizer designed for cutting solos and expressive playing. It combines a "fat" main oscillator with a sub-oscillator and a suite of widening effects.

## Unique Features
- **Performance Controls:** On-screen Pitch Bend and Mod Wheel visualization.
- **Stereo Width:** Built-in Stereo Widener and Chorus for massive sound.
- **Sub-Oscillator:** Dedicated sub-bass control for added weight.
- **Ping-Pong Delay:** Rhythmic stereo delay integrated into the patch.
- **Responsive Action:** Keyboard designed for fast, glissando-style playing.

## Architecture
- **Oscillator:** MonoSynth with Saw/Square/Tri + Sub-Oscillator.
- **Filter:** Lowpass with Drive and Envelope modulation.
- **Modulation:** LFO for Vibrato (Pitch).
- **FX Chain:** Chorus -> Widener -> PingPong Delay -> Reverb -> Limiter.
