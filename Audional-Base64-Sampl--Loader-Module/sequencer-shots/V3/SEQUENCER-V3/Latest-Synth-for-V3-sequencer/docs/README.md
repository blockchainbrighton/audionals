# Blockchain-Orchestrated Polyphonic Synthesiser (BOP)
**Foundational Tooling for The Bitcoin Audional Matrix**

*(Suggestion: Replace this with an actual screenshot of your application.)*

## Table of Contents

- [Introduction](#introduction)
- [Core Features](#core-features)
- [Getting Started](#getting-started)
- [Detailed Feature Guide](#detailed-feature-guide)
  - [Main Interface & Tabs](#main-interface--tabs)
  - [Synthesizer Engine](#synthesizer-engine)
  - [MIDI Editor (Piano Roll)](#midi-editor-piano-roll)
  - [Effects Suite](#effects-suite)
  - [Advanced Looping System](#advanced-looping-system)
  - [Recording and Transport](#recording-and-transport)
  - [Save & Load State](#save--load-state)
  - [External MIDI Control](#external-midi-control)
  - [Audio Safety](#audio-safety)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Technical Details](#technical-details)
  - [API for External Control](#api-for-external-control)
  - [Project Context: Audionals & The Audional Matrix](#project-context-audionals--the-audional-matrix)
  - [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Introduction

BOP is a powerful, self-contained, browser-based polyphonic synthesizer. It combines intuitive sound design tools with a built-in MIDI sequencer (piano roll), advanced looping capabilities, a comprehensive effects rack, and robust state management. Designed as a single HTML file, BOP offers a rich creative environment for crafting musical ideas directly in your browser.

Its description as "Foundational Tooling for The Bitcoin Audional Matrix" situates it within the **Audionals** protocol—a revolutionary approach to on-chain music production leveraging Bitcoin's unparalleled security.

## Core Features

- **Polyphonic Synthesizer:** Create sounds using a versatile oscillator and ADSR envelope.
- **Built-in MIDI Sequencer:** Record and edit your musical ideas using the integrated piano roll editor.
- **Comprehensive Effects Rack:** Add depth and character with Reverb, Delay, Distortion, Phaser, Chorus, Tremolo, Vibrato, Compressor, and Bit Crusher.
- **Advanced Looping:** Record, overdub, quantize, and loop sections of your sequence with precise control.
- **Transport Controls:** Standard Play, Stop, Record, and Clear functions.
- **Save & Load:** Preserve your entire project (sequence, patch, effects) in compact `.synthstate-v2.json` files.
- **External MIDI Support:** Connect physical MIDI controllers and keyboards.
- **Audio Safety:** Built-in polyphony limiting and master volume/limiter controls to prevent audio overload.
- **Single-File Application:** Entire application contained within `index.html` for easy distribution and offline use.
- **Responsive Design:** Adapts to different screen sizes for flexible use.

## Getting Started

1.  **Download:** Obtain the `index.html` file.
2.  **Open:** Open the `index.html` file in a modern web browser (e.g., Chrome, Firefox, Edge).
3.  **Activate Audio:** Most browsers require user interaction to start audio. **Click anywhere on the page** to activate the Web Audio Context.
4.  **Explore:** Start playing the on-screen keyboard, tweaking knobs in the control panel, and recording your ideas.

## Detailed Feature Guide

### Main Interface & Tabs

The interface is organized into two main sections via tabs:
- **Synthesizer Tab:** Houses all controls for sound design, effects, looping, and performance.
- **MIDI Editor Tab:** Provides a piano roll view for visualizing and editing your recorded sequence.

### Synthesizer Engine

Located in the main control panel within collapsible sections:
- **Oscillator:**
  - **Waveform:** Choose the fundamental shape (`sine`, `square`, `triangle`, `sawtooth`).
  - **Detune:** Apply fine pitch adjustments.
- **Filter:**
  - **Type:** Select filter type (`lowpass`, `highpass`, `bandpass`, etc.).
  - **Frequency:** Set the cutoff frequency.
  - **Resonance (Q):** Control the emphasis around the cutoff frequency.
- **Envelope (ADSR):**
  - **Attack, Decay, Sustain, Release:** Shape the volume contour of notes over time.
  - **Presets:** Quick-start envelopes for `piano`, `brass`, `pad`, `pluck`, `bass`.
- **LFOs (Low-Frequency Oscillators):**
  - **Filter LFO:** Modulate the filter cutoff.
  - **Tremolo LFO:** Modulate the output volume.
  - **Vibrato LFO:** Modulate the pitch.
  - **Phaser LFO:** Modulate the phaser effect (if enabled).
  - **Controls:** Rate and Depth for each LFO.

### MIDI Editor (Piano Roll)

- **Visualization:** Displays the recorded sequence as notes on a grid.
- **Editing:** Click and drag notes to adjust their start time and pitch. Adjust duration by dragging note edges.
- **Navigation:** Horizontal scrollbar for time, vertical scrollbar for pitch range.
- **Zoom:** Adjust horizontal (time) and vertical (pitch) zoom levels.
- **Quantization:** Notes can be quantized to the grid during editing or playback based on the Loop Manager's quantization settings.

### Effects Suite

A powerful effects rack with independent Wet/Dry mix controls:
- **Reverb:** Simulate acoustic spaces (Decay, Room Size).
- **Delay:** Echo effect (Time, Feedback).
- **Distortion:** Add harmonic saturation (Drive).
- **Phaser:** Sweep notches through the frequency spectrum (Rate).
- **Chorus:** Thicken the sound by adding slight pitch/volume variations (Rate).
- **Tremolo:** Modulate amplitude (Rate).
- **Vibrato:** Modulate pitch (Rate).
- **Compressor:** Control dynamics (Threshold, Ratio).
- **Bit Crusher:** Reduce audio fidelity for a lo-fi effect (Bits).
- **Presets:** Save and recall complete effects configurations.
- **Toggle:** Enable or disable individual effects.

### Advanced Looping System

Found within the Loop Manager section:
- **Enable/Disable Loop:** Toggle the looping functionality.
- **Record Loop:** Start recording the next pass of the loop.
- **Overdub:** Layer new recordings over the existing loop.
- **Quantize:** Align loop points and playback to a grid (e.g., 1/8th note).
- **Swing:** Add groove by delaying off-beat notes.
- **Tempo Adjustment:** Change playback speed (affects pitch).
- **Crossfade:** Smooth transitions when loop points change.
- **Loop Range:** Set precise start and end times for the loop.
- **Max Duration:** Limit the maximum loop length.
- **Fade Durations:** Control fade-in and fade-out times for loops.

### Recording and Transport

Standard transport controls:
- **Record:** Arms the sequencer for recording. Playback starts automatically after a short count-in.
- **Play:** Starts playback of the sequence.
- **Stop:** Halts playback and recording.
- **Clear:** Erases the current sequence.
- **Status Indicators:** Visual feedback for recording, playback, and MIDI connection status.

### Save & Load State

Preserve your entire work:
- **Save State (`Ctrl+S`):** Click the "Save State" button to download a compact `.synthstate-v2.json` file. This file contains your MIDI sequence, all synth settings, effects, and loop parameters.
- **Load State (`Ctrl+O`):** Click the "Load State" button, select a previously saved `.synthstate` file, and the application will restore your entire session. Backwards compatibility with older `.synthstate` files is maintained.

### External MIDI Control

BOP automatically detects connected MIDI devices.
- **Status:** The status bar at the bottom indicates if a MIDI device is connected and the number of inputs.
- **Control:** Play notes using your connected MIDI keyboard/controller. The application responds to Note On and Note Off messages.

### Audio Safety

Features to prevent audio overload and manage output levels:
- **Master Volume:** Overall output level control.
- **Limiter Threshold:** Sets the level at which a built-in limiter engages to prevent clipping/distortion.
- **Polyphony Limiting:** Restricts the maximum number of simultaneous voices to prevent performance issues or audio dropouts.
- **Emergency Stop:** An immediate, hard stop for all audio and voices.

## Keyboard Shortcuts

- `Space`: Play/Pause
- `Ctrl+S`: Save State
- `Ctrl+O`: Load State
- `Delete` (in Piano Roll): Delete selected note
- `Shift+Click` (in Piano Roll): Delete note under cursor

## Technical Details

### API for External Control

This application exposes a global API, making it scriptable for integration with other tools (e.g., running in an iframe).

**Core Objects & Methods:**

- **`window.synthApp`**: Central application object.
  - `synthApp.seq`: (Array) The main sequence array. Manipulate this directly (e.g., `synthApp.seq = [/* new notes */]`) and call `PianoRoll.draw()` to update the UI.
  - `synthApp.synth.set(options)`: (Method) Change synth core properties (oscillator, envelope). Example: `synthApp.synth.set({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, release: 1.5 } })`.
- **`window.PianoRoll`**: Controls the piano roll editor.
  - `PianoRoll.draw()`: (Method) Redraws the piano roll to reflect changes in `synthApp.seq` or zoom settings.
- **`window.EnhancedEffects`**: Manages the effects rack.
  - `EnhancedEffects.savePreset()`: (Method) Returns an object representing the current full effects state.
  - `EnhancedEffects.loadPreset(presetObject)`: (Method) Loads a full effects state from an object.
  - `EnhancedEffects.toggleEffect(effectName, isEnabled)`: (Method) Enables/disables a specific effect (e.g., `toggleEffect('reverb', true)`).
  - `EnhancedEffects.setEffectParameters(effectName, paramsObject)`: (Method) Updates parameters for a specific effect (e.g., `setEffectParameters('reverb', { decay: 8.5, wet: 0.6 })`).
- **`window.LoopManager`**: Controls the looping system.
  - Properties like `isLoopEnabled`, `loopStart`, `loopEnd`, `quantizeEnabled`, `quantizeGrid`, `swingAmount`, etc., can be read and modified.
  - Methods like `startLoop()`, `stopLoop()`, `recordLoop()`, `overdubLoop()` can be called.
- **`window.SaveLoad`**: Handles state persistence.
  - `SaveLoad.saveState()`: (Method) Triggers the UI save process (downloads the file).
  - `SaveLoad.loadState(jsonString)`: (Method) Loads a full state from a JSON string (the content of a `.synthstate-v2.json` file). This is the most robust way to programmatically load a complete session.
- **`window.EnhancedRecorder`**: Manages transport and recording.
  - `EnhancedRecorder.playSeq()`: (Method) Starts playback.
  - `EnhancedRecorder.stop()`: (Method) Stops playback/recording.
  - `EnhancedRecorder.clear()`: (Method) Clears the sequence.

**Example Integration:**
A parent application could embed BOP in an iframe, wait for it to load, access `iframe.contentWindow`, and then use the API above to load sequences, change sounds, or control playback.

### Project Context: Audionals & The Audional Matrix

BOP is not just a synthesizer; it is a critical tool within the **Audionals** protocol. Audionals represents a paradigm shift in music creation and rights management by leveraging the immutable and transparent nature of the Bitcoin blockchain.

**The Core Concept:**

*   **Beyond "Saving":** In the traditional web2 world, you "save" a file locally or to a cloud service. In the Audionals ecosystem, you **inscribe** your musical creations directly onto the Bitcoin blockchain.
*   **Efficient Representation:** Instead of inscribing large, costly audio files, BOP (and similar tools) generate compact `.synthstate` files. These files are tiny text-based instructions that describe how to recreate the musical piece using an on-chain synthesizer.
*   **Permanence & Security:** Once inscribed, this musical data becomes a permanent part of the Bitcoin ledger, inheriting its robust security and immutability. This creates an unchangeable, verifiable record of the musical work.

**Revolutionary Implications for the Music Industry:**

1.  **Guaranteed Attribution:** The blockchain provides an indisputable, public record of who created a specific piece of music and when. This solves the age-old problem of misattribution.
2.  **Transparent Rights Management:** Ownership and licensing terms can potentially be embedded directly into the inscription or managed via associated smart contracts (on layers compatible with Bitcoin), making rights information clear and accessible to all.
3.  **Fair & Streamlined Royalty Distribution:** By creating a single, global source of truth for musical works, the need for complex, fragmented, and often inefficient royalty collection societies could be dramatically reduced. Payments could be tied directly to the on-chain record, enabling more direct and automated distribution to rights holders based on provable usage or ownership.
4.  **New Creative Economies:** Programmable music on the blockchain opens doors for novel monetization models, NFTs linked to generative music, interactive on-chain compositions, and community-driven music projects.

BOP, therefore, serves as a **creation tool** that outputs content specifically designed for this new on-chain ecosystem. It empowers musicians to not just create music, but to **mint** it as a permanent, verifiable digital asset with the potential for transparent and efficient rights management and royalty distribution.

### Architecture

- **Core Engine:** Built upon the [Tone.js](https://tonejs.github.io/) library, loaded dynamically from an Ordinals inscription.
- **UI:** Implemented with standard HTML, CSS (including variables, flexbox, grid), and JavaScript.
- **State Management:** Internal JavaScript objects manage the synth state, sequence, UI settings, and effects. The Save/Load system serializes/deserializes this state.
- **Single File:** All HTML, CSS, and JavaScript are contained within one `index.html` file for portability.

## Contributing

While this project is presented as a single file, future development or community contributions could include:

- Adding more synthesizer types (FM, AM, Wavetable).
- Expanding the effects suite (e.g., Flanger, Pitch Shifter).
- Implementing direct integration with wallets for inscribing Audinals.
- Adding audio export functionality (e.g., WAV, MP3) (Note: This would require capturing the audio output, which is possible but not implemented in the base script).
- Refactoring the code into separate JS/CSS files for easier development and maintenance.
- Improving the internal code documentation.

## License

This project is not explicitly licensed in the provided materials. If you wish to open-source it, consider choosing a permissive license like [MIT](https://opensource.org/licenses/MIT) or [Apache 2.0](https://opensource.org/licenses/Apache-2.0). Specifying a license is important for clarifying how others can use, modify, and distribute the code.