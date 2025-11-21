# Audionaut Sequencer V2

**A decentralized, on-chain music sequencer.**

Audionaut is a lightweight, web-based step sequencer that runs entirely on-chain. It pulls its core components, including the `Tone.js` audio library and all audio samples, from Bitcoin ordinal inscriptions. This makes it a truly decentralized application that is not reliant on any single server or provider.

*(A GIF of the sequencer in action would be great here!)*

## Features

-   **Decentralized:** All assets are loaded from on-chain ordinal inscriptions.
-   **Sampler Channels:** Load samples from on-chain sources, with waveform previews, insert effects, and fade/region editing.
-   **Instrument Channels:** Host synthesizers, capture live input, and persist recorded clips.
-   **Insert Effects:** A full suite of effects, including EQ, compressor, gate, chorus, phaser, delay, reverb, and bitcrusher.
-   **Precision Timing:** A sample-accurate scheduler using an `AudioWorklet` to keep everything in sync.
-   **Modern Tooling:** Built with vanilla JavaScript modules, Vite for development, and Vitest for testing.

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Start the Development Server:**
    ```bash
    npm run dev
    ```
3.  **Open in Browser:** Open the URL provided by Vite in your browser.

## How It Works

The Audionaut Sequencer is built with a few key architectural principles in mind:

*   **On-Chain Assets:** All assets, including the `Tone.js` library and all audio samples, are loaded from Bitcoin ordinal inscriptions. This is the core of the application's decentralized design. You can see how this is done in `modules/sequencer/sequencer-config.js` and `modules/sequencer/sequencer-sample-loader.js`.

*   **Vanilla JavaScript Modules:** The application is written in plain JavaScript, using native ES modules. This keeps the codebase lightweight and easy to understand.

*   **State Management:** The application's state is managed in `modules/sequencer/sequencer-state.js`, with a clean separation between `projectState` (data that is saved and loaded) and `runtimeState` (temporary data that is not saved).

*   **AudioWorklet Scheduler:** The sequencer's timing is handled by an `AudioWorklet` in `modules/sequencer/worklet/sequencer-scheduler-processor.js`. This ensures that all audio events are scheduled with sample-accurate precision, which is essential for a reliable music sequencer.

## Development

### Running Tests

To run the test suite, use the following command:

```bash
npm run test
```

You can also run tests on only the files that have changed:

```bash
npm run changed
```

To generate a coverage report, use:

```bash.
npm run cover
```

### Code Structure

```
.
├── index.html / synth.html        # Sequencer shell + standalone synth harness
├── modules/
│   ├── sequencer/                 # State, UI, transport, inserts, audio worklet, loaders
│   ├── simple-synth/              # Logic/engine/UI for the built-in synth
│   └── synth/                     # Shared piano roll, keyboard, MIDI helpers
├── tests/                         # Vitest suites + helpers
├── AGENTS.md                      # Automation/AI runbook
├── README.md                      # User-facing overview (this document)
├── TODO.md                        # Backlog hints for future work
└── package.json                   # Scripts: dev, test, cover, changed
```

### Key Files

*   **`index.html`**: The main entry point for the application.
*   **`modules/app-init.js`**: The first JavaScript file to be executed. It initializes the application.
*   **`modules/sequencer/sequencer-main.js`**: The core of the application, where everything is wired together.
*   **`modules/sequencer/sequencer-state.js`**: Defines the application's state management.
*   **`modules/sequencer/sequencer-config.js`**: Contains the URLs for the on-chain assets.
*   **`modules/sequencer/worklet/sequencer-scheduler-processor.js`**: The `AudioWorklet` that handles the sequencer's timing.

## Contributing

Contributions are welcome! If you have an idea for a new feature or have found a bug, please open an issue on GitHub.

