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


## For Developers

BOP has been architected not just as a standalone application, but as a modular **Web Audio Module (WAM)**. This makes it a reusable instrument that can be loaded into any WAM-compatible host, such as a web-based Digital Audio Workstation (DAW).

### Technology Stack & Architecture

*   **Plugin Standard:** The synth now adheres to the **Web Audio Modules 2 (WAM 2)** specification. This decouples the audio processing from the user interface, allowing for true modularity.
*   **Audio Processor:** The core synthesis logic resides in a headless `AudioWorkletProcessor` (`bop-wam-processor.js`), ensuring that all audio processing runs in a dedicated, high-priority thread, separate from the main UI thread.
*   **User Interface:** The GUI is a self-contained **Web Component** (`<bop-wam-gui>`) that can be dropped into any host application. It uses a Shadow DOM to prevent any style conflicts.
*   **Audio Library:** The underlying sound generation is powered by **Tone.js**, which is dynamically loaded within the audio worklet.

---

### Codebase Structure

The project is now split between the standalone application shell and the reusable WAM components.

*   **`app.js`**: The main script for the **standalone application**. It acts as a *host* environment that loads and controls the BOP synth module, and also manages non-synth components like the piano roll, transport, and recording logic.
*   **`bop-wam-processor.js`**: **The core audio engine.** This is a headless `AudioWorkletProcessor` that contains all the Tone.js logic. It exposes a standardized API for parameter control, state management, and MIDI handling. **This is the "backend" of the synth.**
*   **`bop-wam-gui.js`**: **The user interface module.** This script defines the `<bop-wam-gui>` custom HTML element. It renders all the knobs and sliders for the synth and communicates with its corresponding processor node. **This is the "frontend" of the synth.**
*   **Utility Modules (`piano-roll.js`, `transport.js`, etc.)**: These are components used by the standalone `app.js` host to provide a complete music-making experience. They are not part of the core WAM plugin itself.
*   **`BOP-V6.html` & `style.css`**: The HTML and CSS for the standalone application host.

---

### Integration Guide for 3rd-Party Apps (DAWs)

To load the BOP Synth into your own web application or on-chain DAW, you will interact with the WAM components. Here is how the API works.

#### 1. Loading the Synth

Your host application must first load the processor and then instantiate the synth node.

```javascript
// In your host application (e.g., your on-chain DAW)

// 1. Get the AudioContext
const audioContext = new AudioContext();

// 2. Add the BOP processor module to the audio worklet
// The WAM SDK you use might abstract this.
await audioContext.audioWorklet.addModule('./bop-wam-processor.js');

// 3. Create an instance of the BOP Synth WAM node
// A WAM SDK provides a helper function like `createWam`.
const bopSynthNode = await createWam(audioContext, 'BopSynthV6');

// 4. Connect the synth's output to your DAW's mixer or destination
bopSynthNode.connect(audioContext.destination);
```

#### 2. The Comprehensive Control API

The `bopSynthNode` instance exposes a rich, standardized API for control and automation.

*   **Parameter Discovery (`getParameterInfo`)**: Your host can query the synth for all its available parameters. This is perfect for dynamically building UIs or automation lanes.
    ```javascript
    const params = await bopSynthNode.getParameterInfo();
    console.log(params.voiceAttack); 
    //-> { defaultValue: 0.01, minValue: 0.001, maxValue: 2, type: 'float' }
    ```

*   **Real-time Parameter Control (`setParamValue`)**: Change any parameter in real-time. This is what you would call from a UI slider or an automation track.
    ```javascript
    // Set reverb wetness to 50%
    bopSynthNode.setParamValue('reverbWet', 0.5);
    ```

*   **MIDI Events (`scheduleEvents`)**: Send standard MIDI messages to the synth to play notes.
    ```javascript
    // Play Middle C (MIDI note 60) with velocity 100
    const noteOnMessage = { type: 'midi', data: { bytes: [144, 60, 100] } };
    bopSynthNode.scheduleEvents(noteOnMessage);
    ```

*   **State Management (`getState` / `setState`)**: Save and load the entire synth patch as a JSON object. This is essential for saving and loading projects in your DAW.
    ```javascript
    // Save the current sound as a patch
    const myPatch = await bopSynthNode.getState();

    // Later, load the patch back into the synth
    await bopSynthNode.setState(myPatch);
    ```

#### 3. Displaying the GUI

The synth's GUI is a self-contained Web Component.

```javascript
// In your host application...

// 1. Import the GUI script
import './bop-wam-gui.js';

// 2. Create the GUI element
const bopGui = document.createElement('bop-wam-gui');

// 3. CRITICAL: Link the GUI to its audio processor node
bopGui.wamNode = bopSynthNode;

// 4. Append the GUI to your application's DOM
document.querySelector('#daw-plugin-window').appendChild(bopGui);
```

Once linked, the GUI will automatically update its controls when you call `setState` on the node, and moving a slider on the GUI will automatically call `setParamValue` on the node. The two are kept in perfect sync.

---

### Contributing

Contributions are welcome! Whether you want to fix a bug, add a new feature to the synth engine, or improve the UI, please feel free to:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/my-new-feature`).
3.  Commit your changes (`git commit -am 'Add some feature'`).
4.  Push to the branch (`git push origin feature/my-new-feature`).
5.  Create a new Pull Request.

### License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.