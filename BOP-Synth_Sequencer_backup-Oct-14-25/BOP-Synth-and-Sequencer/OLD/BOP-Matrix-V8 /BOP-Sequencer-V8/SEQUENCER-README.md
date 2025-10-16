Of course! A detailed and well-structured README is crucial for any project, especially one with a unique architecture like this. Here is a complete README file, written in Markdown, that explains the sequencer's architecture, frameworks, data structures, and provides clear guidance for developers looking to contribute or extend its functionality.

---

# Audionaut Sequencer

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript)
![HTML5](https://img.shields.io/badge/HTML-5-orange?style=for-the-badge&logo=html5)
![CSS3](https://img.shields.io/badge/CSS-3-blue?style=for-the-badge&logo=css3)
![Tone.js](https://img.shields.io/badge/Tone.js-Audio-magenta?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

An on-chain, Web3-enabled, browser-based music sequencer and DAW. This project is a self-contained HTML file that uses modern JavaScript (ES Modules), the **Tone.js** framework for robust audio scheduling, and a custom sample loader to create a powerful music production tool right in your browser.

<!--
RECOMMENDED: Add a high-quality screenshot or, even better, a GIF of the sequencer in action here.
![Audionaut Sequencer In Action](link-to-your-screenshot.png)
-->

## ✨ Features

-   **Multi-Sequence Composition:** Create and chain up to 32 sequences to build full songs.
-   **Multi-Channel Tracks:** Each sequence can have up to 32 channels.
-   **Dynamic Sample Loading:** Samples are loaded on-demand from a predefined list.
-   **Robust Audio Engine:** Powered by **Tone.js** for precise, stable scheduling and playback.
-   **BPM Control:** Fine-grained BPM adjustment with a slider and a numerical input.
-   **Responsive Design:** The sequencer grid layout adapts to different screen sizes for a great experience on desktop and mobile.
-   **Compact Save/Load System:** A highly-compressed, URL-friendly string format allows you to save and share your entire project.
-   **Web3 Integration:** Dynamically loads the Tone.js library from an on-chain Ordinal inscription, demonstrating a novel way to handle dependencies.
-   **Zero Dependencies:** Runs entirely from a single HTML file with no build step required.

## 🚀 Getting Started

Because this project uses ES Modules (`import`), you cannot simply open the `index.html` file from your local filesystem. You must serve it from a local web server.

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Serve the directory:**
    If you have Python installed, you can easily start a server:
    ```bash
    # For Python 3
    python -m http.server

    # For Python 2
    python -m SimpleHTTPServer
    ```
    Alternatively, you can use `npx` if you have Node.js:
    ```bash
    npx serve
    ```

3.  **Open in your browser:**
    Navigate to `http://localhost:8000` (or the port specified by your server) in your web browser.

## 👨‍💻 Developer's Guide

This guide details the project's architecture, core components, and provides instructions for integrating new features.

### 1. Project Architecture

The application is built around a **state-driven, declarative UI** pattern, all within a single vanilla JavaScript module.

-   **Single Source of Truth:** A global `projectData` object holds the entire state of the application (BPM, sequences, channels, steps, etc.).
-   **Event-Driven Logic:** User interactions (e.g., clicking a step, changing the BPM) trigger functions that modify the `projectData` object.
-   **Render Functions:** After any state change, a corresponding render function (e.g., `renderSequencer()`, `updateSequenceListUI()`) is called to update the DOM to reflect the new state. This avoids direct, imperative DOM manipulation and keeps the UI consistent with the data.

### 2. Core Data Structures

Understanding the `projectData` object is key to working with this sequencer.

```javascript
let projectData = {
  sequences: [],             // Array of sequence objects
  currentSequenceIndex: 0,   // The index of the sequence currently being edited
  bpm: 120.00,               // The project's BPM
  isPlaying: false,          // Playback status
  playMode: null             // 'sequence' for single, 'all' for chained playback
};
```

A **Sequence** object is structured as follows:

```javascript
{
  channels: [
    // Array of channel objects
    {
      selectedSampleIndex: 0, // Index of the sample used for this channel
      steps: [false, true, false, ...], // Array of 64 booleans representing active steps
    },
    // ... more channels
  ]
}
```

### 3. Key Modules & Frameworks

#### a. Tone.js (Audio Engine)

-   **Role:** Tone.js is the heart of the audio engine. It handles:
    -   **Transport:** `Tone.Transport` manages the master clock, BPM, and play/stop/scheduling logic.
    -   **Scheduling:** `Tone.Sequence` is used to create the main 16th-note loop that drives the sequencer.
    -   **Playback:** `Tone.Player` is instantiated to play an audio buffer at a scheduled time.
-   **Dynamic Loading:** The script uniquely loads Tone.js from a Bitcoin Ordinal inscription URL. The application waits for this module to load before booting the main sequencer logic.
-   **Usage:** All Tone.js functionality is accessed via the global `Tone` object once it's loaded.
-   **Documentation:** For advanced audio features, refer to the [Tone.js API Documentation](https://tonejs.github.io/docs/14.7.77/index.html).

#### b. `audional-base64-sample-loader.js` (Sample Management)

-   **Role:** This local module is responsible for providing audio samples. It contains an array of sample metadata (`ogSampleUrls`) and a function `SimpleSampleLoader.getSampleByIndex(index)` that fetches and decodes the Base64 sample data.
-   **Adding New Samples:** To add a new sample to the sequencer:
    1.  Open `audional-base64-sample-loader.js`.
    2.  Encode your audio file (e.g., a `.wav` or `.mp3`) into Base64.
    3.  Add a new object to the `ogSampleUrls` array with the `text` (sample name), `isLoop` (boolean), `bpm` (if it's a loop), and `data` (the full Base64 string prefixed with the appropriate data URI scheme, e.g., `data:audio/wav;base64,...`).

### 4. The Render & Audio Loops

-   **Render Loop:** There is no automatic "render loop". You must manually call a render function after changing the state.
    -   Change `projectData.sequences` -> Call `renderSequencer()`.
    -   Change `projectData.bpm` -> Call `setBPM(newBpmValue)`.
    -   Add/remove a sequence -> Call `updateSequenceListUI()` and `renderSequencer()`.
-   **Audio Loop:**
    1.  `startSequencerWithTone()` initiates `Tone.Transport.start()`.
    2.  A `Tone.Sequence` is created, which calls the `scheduleStep(time, stepIndex)` function on every 16th note.
    3.  `scheduleStep` reads the `projectData` for the currently playing sequence.
    4.  If a step is active (`projectData.sequences[...].channels[...].steps[stepIndex] === true`), it creates a new `Tone.Player` with the appropriate audio buffer and schedules it to play at the given `time`.

### 5. Save/Load Mechanism

The save/load functionality uses a custom, highly-compressed string format to encode the entire `projectData` state.

-   **Format:** `BPM|CURRENT_SEQ_INDEX:SEQ1_DATA_SEQ2_DATA_...`
-   **Delimiters:**
    -   `:` separates the global settings from the sequence data.
    -   `_` separates individual sequences.
    -   `|` separates channels within a sequence.
    -   `,` separates the sample index from the step data within a channel.
-   **Encoding:**
    -   `BPM` and `CURRENT_SEQ_INDEX` are stored as plain numbers.
    -   `Sample Index` is converted to a Base36 string (`toString(36)`).
    -   **Steps (the clever part):** The 64-step boolean array is treated as a **bitfield**. It's processed in 6-bit chunks, with each chunk converted to a Base36 character. This compresses 64 steps into just 12 characters (`bitfieldToBase36` / `base36ToBitfield`).

**Example String:** `120|0:0,a1b2c3d4e5f6|1c,g1h2i3j4k5l6`
*   **Translation:** BPM is 120, current sequence is 0. Sequence 0 has two channels. Channel 1 uses sample 0 (`'0'`) with step data `a1...f6`. Channel 2 uses sample 44 (`'1c'` in base36) with step data `g1...l6`.

### 6. How to Add New Features

Here are step-by-step guides for extending the sequencer.

#### Example 1: Add a "Mute" Button for Each Channel

1.  **Update Data Structure:** Add a `muted` property to the channel object in `createEmptySequence()`.
    ```javascript
    // in createEmptySequence()
    return { channels: Array(numChannels).fill(null).map(() => ({
        selectedSampleIndex: 0,
        steps: Array(totalSteps).fill(false),
        muted: false // Add this new property
    }))};
    ```

2.  **Update the UI (`renderSequencer`):** Add a mute button in the channel div.
    ```javascript
    // inside the channels.forEach loop in renderSequencer()
    const muteBtn = document.createElement('button');
    muteBtn.textContent = channelData.muted ? 'Unmute' : 'Mute';
    muteBtn.style.backgroundColor = channelData.muted ? '#f00' : '#555'; // Example styling
    channel.insertBefore(muteBtn, select); // Add it before the sample selector

    muteBtn.onclick = () => {
        // Toggle the state
        channelData.muted = !channelData.muted;
        // Re-render this specific channel or the whole sequencer to update the button text/style
        renderSequencer();
    };
    ```

3.  **Update Audio Logic (`scheduleStep`):** Check the `muted` flag before playing a sample.
    ```javascript
    // in scheduleStep()
    seqData.channels.forEach((channel, ch) => {
        // Add this condition
        if (channel.steps[stepIndex] && !channel.muted) {
            const idx = channel.selectedSampleIndex;
            // ... rest of the playback logic
        }
    });
    ```

#### Example 2: Add a Global Reverb Effect

1.  **Create the Effect (in `boot` or `initSequencer`):** Instantiate a `Tone.Reverb` and connect it to the destination.
    ```javascript
    // At the top level of the script module
    let reverb;

    // Inside the boot() function, after Tone.js is confirmed to be loaded
    reverb = new Tone.Reverb({
        decay: 1.5,
        wet: 0.2 // Start with a subtle effect
    }).toDestination();
    ```

2.  **Route Audio Through It:** Change where the `Tone.Player` connects. Instead of `toDestination()`, connect it to the reverb effect.
    ```javascript
    // in scheduleStep()
    const player = new Tone.Player(buffer).connect(reverb); // Change this line
    player.start(time);
    ```

3.  **Add UI Controls:** Add a slider to the main `.controls` div in the HTML to control the `wet` (mix) level of the reverb.
    ```html
    <!-- In index.html, inside the .controls div -->
    <div class="reverb-control">
        <label for="reverbSlider">Reverb:</label>
        <input type="range" id="reverbSlider" min="0" max="1" value="0.2" step="0.01" />
    </div>
    ```

4.  **Wire up the UI Control:** Add an event listener to update the reverb's `wet` value.
    ```javascript
    // in the main script body
    const reverbSlider = document.getElementById('reverbSlider');
    reverbSlider.addEventListener('input', (e) => {
        if (reverb) {
            reverb.wet.value = parseFloat(e.target.value);
        }
    });
    ```

## 📂 File Structure

The project is intentionally simple:

```
.
├── index.html                      # The main application file containing all HTML, CSS, and JS logic.
└── audional-base64-sample-loader.js  # Module for storing and providing audio samples.
└── README.md                       # This file.
```

## 🤝 Contributing

Contributions are welcome! If you have an idea for a new feature or an improvement, please follow these steps:

1.  **Fork** the repository.
2.  Create a new **branch** for your feature (`git checkout -b feature/my-amazing-feature`).
3.  **Commit** your changes (`git commit -m 'Add some amazing feature'`).
4.  **Push** to the branch (`git push origin feature/my-amazing-feature`).
5.  Open a **Pull Request**.

## ⚖️ License

This project is licensed under the MIT License. See the LICENSE file for details.