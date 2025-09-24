
# Audionaut Sequencer V14 (BOP Matrix)

![Project Status](https://img.shields.io/badge/status-stable-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Tech Stack](https://img.shields.io/badge/tech-Vanilla%20JS%20&%20Web%20Audio%20API-yellow)

Audionaut Sequencer is a browser-based step sequencer and Digital Audio Workstation (DAW) built with modern, dependency-free JavaScript and the powerful Web Audio API. It features a modular channel-based architecture, a 64-step pattern editor, and a fully integrated polyphonic synthesizer, the "BOP Synth".

The project is designed with a "Web3 DAW" concept in mind, aiming for future integrations with decentralized technologies.

**(placeholder for a screenshot or GIF of the sequencer in action)**
`[sequencer_screenshot.png]`

## Core Features

- **64-Step Sequencer**: Create complex patterns with a responsive grid interface.
- **Multi-channel Architecture**: Add unlimited sampler or instrument channels.
- **Sampler Channels**: Load and sequence pre-defined audio samples.
- **Instrument Channels**: Features the fully integrated **BOP Polyphonic Synthesizer** with a dedicated modal editor.
- **Comprehensive State Management**: Save and load entire projects, including all synth patches, sequences, and settings, via a single data string.
- **Real-time Playback Controls**: Control BPM, play/stop individual sequences, or play all sequences together.
- **Modular & Modern Codebase**: Built with ES Modules for clean, maintainable, and scalable code.

## Technical Architecture & Specifications

The sequencer is built from the ground up using vanilla web technologies, avoiding heavy frameworks to ensure maximum performance and control over the audio context.

### 1. Framework & Core Logic

- **Language**: Modern JavaScript (ES6+), utilizing **ES Modules** (`<script type="module">`). This enforces a modular structure where components (e.g., `instrument.js`, `saveload.js`, `ui.js`) manage their own logic and expose a clear API.
- **Rendering**: Direct DOM manipulation. The UI is dynamically generated and managed by JavaScript, providing a snappy, responsive user experience.
- **Styling**: Modern CSS3 using Flexbox and CSS Grid for layout. Key layout properties (like step count and control widths) are managed with CSS Variables (`:root`) for easy theming and responsive adjustments.

### 2. Audio Engine

The entire audio system is powered by the **Web Audio API**.

- **AudioContext**: A single, global `AudioContext` is used as the foundation for all audio processing.
- **Timing & Scheduling**: The sequencer does not rely on `setInterval` or `setTimeout` for musical timing, which are prone to jitter. Instead, it likely uses a look-ahead scheduling approach tied to the `AudioContext.currentTime` for sample-accurate note scheduling, ensuring tight and stable playback.
- **Channel Types**:
    - **Sampler Channels**: Use `AudioBufferSourceNode` to play back decoded audio files. Each sample is loaded into an `AudioBuffer` for low-latency triggering.
    - **Instrument Channels**: Each instrument channel instantiates its own instance of the **BOP Synth**. The synth generates audio in real-time using `OscillatorNode`, `GainNode`, `BiquadFilterNode`, and other processing nodes.

### 3. BOP Synth Integration & Specifications

The BOP Synth is a complete synthesizer engine integrated into the sequencer. It is not just a preset player; its entire state is editable, savable, and fully restored with the project.

- **Synth Architecture**: Polyphonic, with a rich feature set including:
    - **Oscillators**: Multiple oscillator types with detune and portamento.
    - **Envelope**: Full ADSR (Attack, Decay, Sustain, Release) envelope for amplitude.
    - **Filters**: Versatile filters (e.g., low-pass, high-pass) with resonance and envelope modulation.
    - **LFOs**: Low-Frequency Oscillators for modulating various parameters.
    - **Effects Rack**: A comprehensive suite of built-in effects, each with its own state (on/off, wet/dry, parameters):
        - Reverb, Delay, Chorus, Distortion, Phaser, Tremolo, Vibrato, Compressor, Bit Crusher.
- **UI**: The synth has a dedicated UI that opens in a modal window (`#synth-modal-container`), allowing for detailed patch editing without cluttering the main sequencer view.
- **State Persistence**: All synth parameters are captured when the editor is closed. See *State Management* below.

### 4. State Management & Data Persistence

One of the project's core strengths is its robust state management, which allows for entire sessions to be portable.

- **Save/Load Mechanism**: The project can be serialized into a single Base64 encoded JSON string. This string can be copied to the clipboard and pasted back to load the project.
- **State Object Structure**: The saved data follows a versioned JSON schema. Version "2.1" captures:
  ```json
  {
      "version": "2.1",
      "bpm": 120,
      "channels": [
          {
              "type": "instrument",
              "id": "...",
              "state": { /* BOP Synth State Object */ }
          },
          {
              "type": "sampler",
              "id": "...",
              "state": { "sampleUrl": "...", "steps": [...] }
          }
      ],
      "sequences": { /* Sequence pattern data */ }
  }
  ```
- **Synth State Detail**: The `state` object for an instrument channel is particularly comprehensive, capturing everything required to perfectly rebuild the sound:
    - `synthEngine`: All patch parameters (oscillators, envelopes, filters, effects).
    - `recorder`: Any MIDI sequences recorded within the synth itself.
    - `ui`: UI settings like the current octave.
    - `loopManager`: Internal loop settings for the synth.
- **Backward Compatibility**: The loading mechanism is designed to handle older state versions (e.g., v2.0) and gracefully upgrade them to the current format.

## Project Structure

The project is organized into two main parts, reflecting its modular design:

- `Audionaut-Sequencer-V14/`: The main sequencer application.
  - `main.js`: The entry point of the application. Initializes the audio engine, UI, and event listeners.
  - `instrument.js` / `sampler.js`: Class definitions for the different channel types.
  - `saveload.js`: Handles the serialization and deserialization of the project state.
  - `style.css`: Main stylesheet for the sequencer interface.
  - `index.html`: The main HTML document.

- `BOP-SYNTH-V14/`: The integrated synthesizer component.
  - `BopSynthLogic.js`: The core logic for the synthesizer engine.
  - `SaveLoad.js`: Handles the specific state management for the synth patch.
  - `style.css`: Styles for the synth's modal UI.

## How to Run Locally

Because the project uses ES Modules, you must run it from a local web server. You cannot simply open the `index.html` file in your browser from the file system.

1.  **Clone the repository.**
2.  **Navigate to the project's root directory** in your terminal.
3.  **Start a simple local server.** If you have Python 3 installed, you can run:
    ```bash
    python -m http.server
    ```
4.  **Open your web browser** and go to `http://localhost:8000/Audionaut-Sequencer-V14/`.

## Future Development (Roadmap)

The "Web3 DAW" moniker points to several potential future enhancements:

- **Decentralized Storage**: Integrating with Ordinals on the Bitcoin Blockchain to save and share projects in a decentralized manner with a future vision for a fully on-chain, music production, distribution and enormously efficient and transparent rights management system.
- **NFT Patterns & Patches**: The ability to mint unique synth patches or sequences as NFTs on the blockchain.
- **Token-Gated Content**: Unlocking specific sample packs or synth features for holders of a particular token.
- **Real-time Collaboration**: Using WebRTC or other peer-to-peer technologies to enable multiple users to collaborate on a sequence in real-time.