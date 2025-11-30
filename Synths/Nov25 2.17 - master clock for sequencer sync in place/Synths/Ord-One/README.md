# Ord-One Synthesizer

A dual-oscillator monophonic synthesizer built with Tone.js, designed for the Ordinals ecosystem. It features Pulse Width Modulation (PWM), 24dB filter, envelopes for amp and filter, LFO, and overdrive/delay FX.

## Features

*   **Dual Oscillators:** 
    *   Osc 1: Pulse/Saw/Square with PWM.
    *   Osc 2: Multi-wave with Detune.
*   **Filter:** 24dB Lowpass with Resonance and Envelope Modulation.
*   **Modulation:** LFO assignable to Pitch, Filter, or PWM.
*   **FX:** Distortion (Drive) and Delay.
*   **Control:** 
    *   Virtual Keyboard (Mouse/Touch).
    *   MIDI Input Support (Note On/Off, CC Mapping).
    *   Shared `KnobControl` for smooth parameter tweaking.

## Architecture

This synth utilizes the shared `Synths/shared/` modules for standardized behavior:
*   `synth-loader.js`: Handles Tone.js loading and boot sequence.
*   `keyboard.js`: Renders the virtual keyboard and handles visual feedback.
*   `midi-manager.js`: Manages Web MIDI API connections and routing.
*   `knob-control.js`: Provides interactive knob UI logic.

## Usage

1.  **Start:** Click "Power On" to initialize the audio engine.
2.  **Play:** Use the on-screen keys or a connected MIDI keyboard.
3.  **Tweak:** Drag knobs to adjust sound parameters.
4.  **Presets:** Select from the dropdown to load predefined patches (e.g., "Warm Lead", "Acidic Bite").

## Technical Details

*   **Engine:** Tone.js `OmniOscillator` allows for flexible waveform switching.
*   **Visuals:** Real-time oscilloscope canvas.
*   **Glissando:** Click and drag across the virtual keys for smooth note transitions.
