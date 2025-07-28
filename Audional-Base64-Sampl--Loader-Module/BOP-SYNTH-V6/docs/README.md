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
    *   A fully-featured polyphonic synthesizer to play multiple notes at once.
    *   Detailed control over sound-shaping parameters, likely including Oscillators (Waveform), Filters (Cutoff/Resonance), Envelopes (ADSR), and LFOs.
    *   Modular effects sections that can be toggled on or off.

*   **Composition & Performance:**
    *   **Virtual Keyboard:** Play melodies directly in your browser using an on-screen piano with octave controls.
    *   **Computer Keyboard Support:** Use your QWERTY keyboard as a musical instrument.
    *   **MIDI Controller Integration:** Connect your favorite MIDI keyboard for a professional and tactile experience (MIDI support is built-in).

*   **Recording & Sequencing:**
    *   **Transport Controls:** Easily record, play, and stop your compositions.
    *   **Looping Functionality:** Set loop start/end points, define loop length, and toggle looping on the fly.
    *   **Tempo & Quantization:** Lock your recordings to a specific BPM and automatically align notes to a grid for perfect timing.

*   **Integrated Piano Roll Editor:**
    *   Switch to the "MIDI Editor" tab to view and edit your recorded notes.
    *   Manually add, delete, or adjust the pitch and timing of every note in your composition with precision.

*   **Blockchain-Ready Export:**
    *   Save your synth patches and MIDI compositions.
    *   The core function is to prepare your musical creation for inscription on The Bitcoin Audional Matrix, turning your music into a permanent digital artifact.

### How to Use BOP

1.  **Design Your Sound:** On the **Synthesizer** tab, use the knobs and sliders in the control panel to create your unique sound. Experiment with different settings until you find something you like.
2.  **Compose a Melody:** Play notes using the on-screen piano, your computer keyboard, or a connected MIDI controller.
3.  **Record Your Performance:**
    *   Arm the recording by pressing the **Record** button.
    *   Press the **Play** button to start recording.
    *   Press **Stop** when you're finished.
4.  **Edit and Refine:**
    *   Click on the **MIDI Editor** tab.
    *   Here you will see your recording in the piano roll. You can drag notes to change their pitch or timing, adjust their length, or draw in new notes.
5.  **Export for the Blockchain:**
    *   Once you are happy with your composition, use the **Save/Export** functionality to generate the file needed for on-chain inscription.

---

## For Developers

BOP is a modern, client-side web application built with a focus on performance and simplicity, avoiding heavy frameworks to ensure a fast and responsive user experience.

### Project Goal

The project aims to be the reference implementation for a "Foundational Tooling" for "The Bitcoin Audional Matrix". Its primary technical challenge is to provide a robust audio digital workstation (DAW) experience in the browser and serialize the user's creation (both synth patch data and note data) into a format suitable for Bitcoin inscription.

### Technology Stack

*   **Frontend:** Vanilla HTML5, CSS3, and JavaScript (ES Modules).
    *   **No Frameworks:** The project intentionally avoids frameworks like React, Vue, or Angular to maintain a minimal footprint and direct DOM control.
*   **Audio Engine:** The **Web Audio API** is used for all synthesis, sequencing, and audio processing tasks. The architecture involves creating and connecting various `AudioNode`s (e.g., `OscillatorNode`, `BiquadFilterNode`, `GainNode`) to form the synthesizer's signal path.
*   **Styling:** Modern CSS with custom properties (variables) for easy theming, Flexbox/Grid for layout, and thoughtful use of transitions and animations. It includes considerations for accessibility (`prefers-reduced-motion`, `prefers-contrast`).

### Getting Started (Local Development)

Because this project uses ES Modules, it must be served from a web server. You cannot run it by opening the `index.html` file directly from your filesystem.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/BOP-SYNTH-V6.git
    cd BOP-SYNTH-V6
    ```

2.  **Serve the directory:**
    The easiest way is to use a simple local server. If you have Node.js installed, you can use `live-server`:
    ```bash
    # Install live-server globally (if you haven't already)
    npm install -g live-server

    # Run the server
    live-server
    ```
    Alternatively, if you have Python 3 installed:
    ```bash
    python -m http.server
    ```

3.  **Open in browser:**
    Navigate to the local address provided by your server (e.g., `http://127.0.0.1:8080` or `http://localhost:8000`).

### Codebase Structure

*   `BOP-V6.html`: The single HTML file containing the entire DOM structure for the application, including the synth panel, MIDI editor, keyboard, and all controls.
*   `style.css`: A comprehensive stylesheet that defines the application's visual identity, layout, responsiveness, and component styles. It is well-organized into logical sections (Global, Tabs, Controls, Keyboard, etc.).
*   `app.js` *(inferred)*: This is the heart of the application. It contains all the JavaScript logic for:
    *   **Audio Context:** Initializing and managing the Web Audio API.
    *   **Synth Engine:** A class or set of functions to create and control the audio nodes.
    *   **UI Binding:** Event listeners for all sliders, buttons, and keyboard interactions.
    *   **State Management:** Handling the current state of synth parameters, recorded notes, loop settings, and tempo.
    *   **Sequencer/Transport:** Logic for recording, playback timing (`setInterval` or `requestAnimationFrame`), and looping.
    *   **Piano Roll:** Rendering the note grid and handling user interactions for editing MIDI data.
    *   **MIDI API:** Handling input from connected MIDI devices.
    *   **Serialization:** Functions to save/load project state, likely converting the composition and patch to a JSON or other portable format.

### Contributing

Contributions are welcome! Whether you want to fix a bug, add a new feature, or improve the UI, please feel free to:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/my-new-feature`).
3.  Commit your changes (`git commit -am 'Add some feature'`).
4.  Push to the branch (`git push origin feature/my-new-feature`).
5.  Create a new Pull Request.

### License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.