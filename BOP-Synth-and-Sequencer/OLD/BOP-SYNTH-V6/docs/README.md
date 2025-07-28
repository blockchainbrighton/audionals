Of course. After reviewing all the provided files, I have removed the inaccurate information about Web Audio Modules (WAM) and updated the README to reflect the project's actual architecture and features.

Here is the fully updated `README.md` file:

---

# Blockchain-Orchestrated Polyphonic Synth (BOP)

**Foundational Tooling for The Bitcoin Audional Matrix**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![made-with-love](https://img.shields.io/badge/Made%20with-❤️-ff69b4.svg)](https://github.com/your-username/BOP-SYNTH-V6)

---

The Blockchain-Orchestrated Polyphonic Synth (BOP) is a powerful, browser-based synthesizer designed for the new era of on-chain music. It provides all the necessary tools to compose, record, and edit musical pieces, with the primary goal of creating audio data ready for inscription onto the Bitcoin blockchain as "Audionals".

## For Users

Welcome to the future of on-chain music creation! BOP is your all-in-one studio for crafting melodies and soundscapes that can be stored forever.

### Key Features

*   **Advanced Synthesis Engine:**
    *   A powerful polyphonic synthesizer (`Tone.PolySynth`) capable of playing multiple notes at once.
    *   Detailed control over sound-shaping parameters, including Oscillators (sine, square, sawtooth, triangle), Detune, and a full ADSR Envelope with presets (Piano, Pad, Pluck, etc.).
    *   A comprehensive and modular effects chain that can be controlled in real-time.

*   **Extensive Effects Suite:**
    *   **Dynamics:** Compressor
    *   **Drive:** Distortion, BitCrusher
    *   **Modulation:** Chorus, Phaser, Tremolo, Vibrato
    *   **Filtering:** A multi-mode Filter (lowpass, highpass, bandpass) with a dedicated LFO for sweeping effects.
    *   **Time-Based:** Reverb and a Feedback Delay.

*   **Composition & Performance:**
    *   **Virtual Keyboard:** Play melodies directly in your browser using a multi-octave on-screen piano.
    *   **MIDI Controller Integration:** Connect your favorite MIDI keyboard for a professional and tactile experience.

*   **Recording & Sequencing:**
    *   **Transport Controls:** Easily record, play, and stop your compositions.
    *   **Advanced Looping:** Set precise loop start/end points, auto-detect loop boundaries, and play sequences in a continuous loop.
    *   **Quantization & Swing:** Automatically align your recorded notes to a grid (from whole notes to 32nd notes) and add human-like "swing" to your rhythm.
    *   **Tempo Control:** Set the project BPM and even perform tempo-stretching on your recorded sequence.

*   **Integrated Piano Roll Editor:**
    *   Switch to the "MIDI Editor" tab to view and edit your recorded notes visually.
    *   Manually add, delete, or adjust the pitch, timing, and duration of every note in your composition with precision.

*   **Project State Management:**
    *   Save your entire synth patch, all effect settings, and your complete MIDI composition into a single, compact JSON file.
    *   Load project files to pick up right where you left off.

### How to Use BOP

1.  **Design Your Sound:** On the **Synthesizer** tab, use the knobs and sliders in the control panel to create your unique sound. Experiment with different oscillator waveforms, envelope settings, and effects until you find something you like.
2.  **Compose a Melody:** Play notes using the on-screen piano or a connected MIDI controller.
3.  **Record Your Performance:**
    *   Arm the recording by pressing the **Record** button (it will start pulsing).
    *   Press the **Play** button or play a note to start recording.
    *   Press **Stop** when you're finished.
4.  **Edit and Refine:**
    *   Click on the **MIDI Editor** tab.
    *   Here you will see your recording in the piano roll. You can drag notes to change their pitch or timing, adjust their length, or even draw in new notes.
    *   Use the Looping and Quantization controls to tighten up your performance.
5.  **Save Your Project:**
    *   Once you are happy with your composition, use the **Save State** functionality (💾 icon or Ctrl+S) to generate a `.json` file containing your entire project. This file can be loaded back into BOP later. The data within this file is what can be prepared for on-chain inscription.

## For Developers

BOP is architected as a modular, standalone web application. It uses modern JavaScript (ES Modules) and is built directly on the powerful **Tone.js** web audio framework.

### Technology Stack & Architecture

*   **Core Library:** The application's audio capabilities are powered by **Tone.js**, which is loaded dynamically at runtime.
*   **Application Host:** `app.js` serves as the main controller. It initializes Tone.js, instantiates all other modules, and manages global state and event handlers.
*   **Architecture:** The application is broken down into single-responsibility modules that handle specific pieces of functionality. This makes the codebase easier to maintain and extend.
    *   The user interface and application logic are intentionally separated. For example, `transport.js` creates the transport buttons, but `enhanced-recorder.js` contains the logic for what happens when they are clicked.

---

### Codebase Structure

The project follows a clear modular pattern. Here are the key components:

*   **`BOP-V6.html` & `style.css`**: The main HTML structure and all styling for the application.
*   **`app.js`**: The primary entry point and application host. It loads and initializes all other modules in the correct order.
*   **Audio Logic & State:**
    *   `enhanced-recorder.js`: The central hub for audio events. It handles recording, playback, and note-on/off triggers from MIDI and the keyboard. It is also responsible for instantiating the main `Tone.PolySynth` object.
    *   `enhanced-effects.js`: Creates and manages the entire audio effects chain.
    *   `audio-safety.js`: Implements the master output stage, including a limiter, voice-count management, and overload protection.
    *   `envelope-manager.js`: Manages the ADSR envelope state.
    *   `loop-manager.js`: Contains all the logic for looping, quantization, swing, and tempo conversion.
*   **UI & Control Modules:**
    *   `enhanced-controls.js`: Dynamically generates and manages the main synth and effects control panel.
    *   `keyboard.js`: Renders and controls the interactive on-screen piano.
    *   `piano-roll.js`: A complete, self-contained module for the MIDI editor UI.
    *   `transport.js`: Renders the transport buttons (Record, Play, Stop, etc.).
    *   `loop-ui.js`: Renders and controls the UI for the looping and quantization system.
*   **Utility Modules:**
    *   `midi.js`: Handles all interactions with the Web MIDI API.
    *   `save-load.js`: Manages the logic for saving and loading the application's entire state to and from a JSON file.

*Note: The file `synth-engine.js` exists in the codebase but is not currently used by the application; the primary synthesis and effects chain is built by `enhanced-recorder.js` and `enhanced-effects.js`.*

---

### Contributing

Contributions are welcome! Whether you want to fix a bug, add a new feature to the synth engine, or improve the UI, please feel free to:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/my-new-feature`).
3.  Commit your changes (`git commit -am 'Add some feature'`).
4.  Push to the branch (`git push origin feature/my-new-feature`).
5.  Create a new Pull Request.

### License

This project is licensed under the MIT License - see the LICENSE file for details.