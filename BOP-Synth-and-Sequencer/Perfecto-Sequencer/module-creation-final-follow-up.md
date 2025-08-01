

### 🔑 Prompt ­– Generate `index.html`

> **Project context**
> You have now produced the ten ES-module files listed below for the *Ordinal-Sequencer* app. Each file exports the public API described in the roster.
>
> | File                     | Main export(s)                            |
> | ------------------------ | ----------------------------------------- |
> | stateManager.js          | `getState`, `dispatch`, `subscribe`       |
> | eventBus.js              | `emit`, `on`, `off`                       |
> | audioEngine.js           | `initAudio`, `triggerNote`, `dispose`     |
> | playbackScheduler.js     | `startScheduler`, `stopScheduler`         |
> | sequencerGrid.js         | `createGrid`, `destroyGrid`               |
> | transportController.js   | `attachControls`                          |
> | midiInput.js             | `initMidi`, `disposeMidi`                 |
> | blockchainPersistence.js | `savePattern`, `loadPattern`              |
> | presetManager.js         | `savePreset`, `loadPreset`, `listPresets` |
> | appBootstrap.js          | `bootstrap`                               |
>
> The global stylesheet **styles.css** already exists.
>
> **Task**
> Write a single, self-contained **`index.html`** file that pulls the entire application together.
>
> **Requirements**
>
> 1. Add the usual HTML5 boilerplate (`<!DOCTYPE html>`, UTF-8 meta, viewport meta, descriptive `<title>`).
> 2. Link the global stylesheet:
>
>    ```html
>    <link rel="stylesheet" href="styles.css">
>    ```
> 3. Provide a minimal semantic DOM skeleton:
>
>    ```html
>    <header><h1>Ordinal-Sequencer</h1></header>
>    <main id="app">
>      <!-- transport controls go here -->
>      <section id="sequencer"></section>
>    </main>
>    <footer><!-- optional credits --></footer>
>    ```
> 4. Load **ToneJS** from its Ordinal inscription exactly once and expose it globally:
>
>    ```html
>    <script type="module">
>      import Tone from 'ord://<PLACEHOLDER_LIBRARY_ORDINAL>';
>      window.Tone = Tone;
>    </script>
>    ```
> 5. Import *all* ten ES-modules with `type="module"`—order is irrelevant because each file is side-effect-free except `appBootstrap.js`. Then call `bootstrap()` **after** `DOMContentLoaded`:
>
>    ```html
>    <script type="module">
>      import './stateManager.js';
>      import './eventBus.js';
>      import './audioEngine.js';
>      import './playbackScheduler.js';
>      import './sequencerGrid.js';
>      import './transportController.js';
>      import './midiInput.js';
>      import './blockchainPersistence.js';
>      import './presetManager.js';
>      import { bootstrap } from './appBootstrap.js';
>
>      window.addEventListener('DOMContentLoaded', () => {
>        bootstrap(document.getElementById('app'));
>      });
>    </script>
>    ```
> 6. Include a graceful `<noscript>` fallback that tells users JavaScript is required.
> 7. No inline styles or external frameworks; stick to vanilla JS, valid HTML, and the architecture above.
>
> **Output rules**
>
> * Return **only** the full contents of `index.html` – nothing else.
> * Make sure the file is immediately usable (copy-paste ready).
> * Follow best practices for accessibility (landmark tags, ARIA labels where appropriate).
>
> **When finished,** deliver the single HTML file exactly as specified.

---

