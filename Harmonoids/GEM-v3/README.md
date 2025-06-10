# Harmonoids: Symphony of Survival

Harmonoids is a 2-D browser puzzle-platformer where you guide a procession of musical creatures (Harmonoids) to safety. Your actions are musical: change pitch, tempo, waveform, and manipulate the environment through sound-based mechanics.

This is a client-side only game built with Vanilla HTML/CSS/JavaScript (ES Modules), PixiJS for rendering, and Matter.js for physics.

## Features Demoed

This version aims to showcase all core mechanics in a single demo level:

*   **Harmonoids (4 types + Standard):**
    *   **Standard:** Basic sine-wave tone.
    *   **Bassoids:** Low octave tone, can vibrate low-frequency plates.
    *   **Glissoids:** Portamento glide, can slip through 1-tile gaps and accelerate on slopes.
    *   **Percussoids:** Percussive pop on landing, triggers rhythm pads with a shockwave.
    *   **Droneoids:** Sustained organ-like tone, can hover and become a temporary platform when solo-muted.
*   **Player Musical Actions:**
    *   Pitch Shift (selected Harmonoids ± semitones) - Keys `A` (down) / `S` (up) or UI
    *   Tempo Change (global game speed ±)
    *   Create Resonance Field (click to place, limited quantity) - Key `R` or UI
    *   Mute / Solo (selected Harmonoids) - Keys `M` (mute) / `O` (solo) or UI
    *   Arpeggiator Sweep (selected Harmonoids, temporary pitch offset via slider)
    *   Rhythm Quantize toggle (conceptual, UI toggle present)
    *   Waveform Morph (selected Harmonoids: sine, square, sawtooth)
    *   One-shot Global Key Change (shifts all active notes and musical context)
*   **Game Modes:**
    *   **Procession Mode:** Harmonoids auto-spawn based on level data.
    *   **Manual Drop Mode:** Player spawns Harmonoids via a button.
*   **Environmental "Toys":**
    *   **Harmonic Gate:** Opens if Harmonoids on/in it form a specific chord.
    *   **Dissonance Zone:** Area where conflicting Harmonoid frequencies create visual chaos and can affect Harmonoid behavior. Score based on dissonance.
    *   **Frequency Bridge:** Becomes solid if Harmonoids on it sustain a specific triad.
    *   **Amplitude Fan:** Lifts Harmonoids based on the collective volume of those above it.
    *   **Phase-Shift Portals:** Teleports Harmonoids if their frequency matches a target (simplified from true phase).
    *   **Echo Chamber:** Captures sounds and re-emits them with a delay.
*   **Meta System Stubs:**
    *   Harmonics currency: Tracked via "Saved" count, no actual upgrade store yet.
    *   Boss arenas: Conceptual, level might contain a "gate" that represents a harmony challenge.
    *   Shareable puzzles via URL Hash: Level can be loaded from a base64 encoded JSON in the URL hash (`#BASE64_JSON_LEVEL_DATA`).

## How to Run

1.  Ensure you have a modern web browser (Chrome, Firefox, Edge, Safari).
2.  You need a simple HTTP server to serve the files correctly due to ES Module security restrictions (CORS). `npx http-server` is a good choice.
    *   If you don't have Node.js/npm, you can install it from [nodejs.org](https://nodejs.org/).
    *   Once Node.js is installed, open a terminal or command prompt in the root directory of this game.
    *   Run the command: `npx http-server .`
3.  Open your browser and navigate to the address provided by `http-server` (usually `http://localhost:8080` or similar).

## Controls

*   **Mouse Click:** Select Harmonoid / Place Resonance Field (when active).
*   **Shift + Mouse Click:** Add/Remove Harmonoid from multi-selection.
*   **P:** Toggle Pause/Resume game.
*   **R:** Activate "Place Resonance Field" mode (then click on map).
*   **A:** Pitch Shift selected Harmonoid(s) DOWN by 1 semitone.
*   **S:** Pitch Shift selected Harmonoid(s) UP by 1 semitone.
*   **M:** Toggle Mute for selected Harmonoid(s).
*   **O:** Toggle Solo for selected Harmonoid(s). (Note: 'O' often used for Solo in DAWs).
*   **UI Buttons:** Most actions are also available through the on-screen UI panels.

## Level JSON Schema (`/levels/level01.json`)

The level file is a JSON object with the following main properties:

*   `levelName`: (string) Display name of the level.
*   `key`: (string) Musical key of the level (e.g., "C", "G#", "Bb").
*   `mode`: (string) Musical mode (e.g., "major", "minor"). Affects harmony calculations.
*   `rescueTargetPercentage`: (number, 0.0-1.0) Fraction of spawned Harmonoids needed to win.
*   `processionSpawns`: (array of objects) Defines auto-spawning Harmonoids.
    *   `time`: (number) Game time (seconds) to spawn.
    *   `type`: (string) Type of Harmonoid (e.g., "standard", "bassoid").
    *   `x`, `y`: (number, optional) Spawn coordinates. Defaults to StartZone or fixed point.
*   `startZone`: (object) Defines the Harmonoid spawn area.
    *   `x`, `y`, `width`, `height`: (number) Dimensions and position.
*   `exitZone`: (object) Defines the goal area.
    *   `x`, `y`, `width`, `height`: (number) Dimensions and position.
*   `platforms`: (array of objects) Static or dynamic platforms.
    *   `x`, `y`, `width`, `height`: (number) Dimensions and position.
    *   `options`: (object, optional) Matter.js body options (e.g., `isStatic`, `angle`, `friction`).
*   `harmonicGates`: (array of objects)
    *   `x`, `y`, `width`, `height`: (number)
    *   `requiredChordNotes`: (array of numbers) MIDI note intervals (if `isRelativeChord` true) or absolute MIDI notes.
    *   `isRelativeChord`: (boolean, optional, default true) Whether `requiredChordNotes` are relative to level key root.
    *   `options`: (object, optional) Matter.js options.
*   `dissonanceZones`: (array of objects)
    *   `x`, `y`, `width`, `height`: (number)
    *   `options`: (object, optional)
*   `frequencyBridges`: (array of objects)
    *   `x`, `y`, `width`, `height`: (number)
    *   `requiredTriad`: (array of numbers) MIDI notes for activation (see `HarmonicGate`).
    *   `isRelativeChord`: (boolean, optional, default true)
    *   `options`: (object, optional)
*   `amplitudeFans`: (array of objects)
    *   `x`, `y`, `width`, `height`: (number)
    *   `liftForce`: (number) Max upward force.
    *   `options`: (object, optional)
*   `phaseShiftPortals`: (array of objects) Defines a pair of portals.
    *   `id`: (string) A unique group ID for this pair of portals.
    *   `teleportTargetFrequency`: (number) The frequency (in Hz) that a Harmonoid must emit to use the portal.
    *   `portalA`: (object) `x, y, width, height, options` for the first portal.
    *   `portalB`: (object) `x, y, width, height, options` for the second portal.
*   `echoChambers`: (array of objects)
    *   `x`, `y`, `width`, `height`: (number)
    *   `delayTime`: (number) Echo delay in seconds.
    *   `feedback`: (number, 0-1) Echo feedback gain.
    *   `options`: (object, optional)
*   `obstacles`: (array of objects) General interactive physics objects.
    *   `x`, `y`, `width`, `height`: (number)
    *   `type`: (string) e.g., "lowFreqPlate", "rhythmPad", "breakable".
    *   `options`: (object, optional) (e.g. `isStatic`, `mass`, `customId`).

## Development & Quality

*   **Code Style:** Adheres to ES2023, TypeScript-like JSDoc, DRY, KISS, single-responsibility principles.
*   **Testing:** Jest tests are provided for some core logic in the `/tests/` directory. To run tests:
    1.  `npm install --save-dev jest jest-environment-jsdom` (if not already present and you want to modify/run tests via npm)
    2.  Configure `package.json` (not included in this deliverable) or run Jest directly: `npx jest`
*   **Linting (Recommended):**
    Use ESLint with a configuration like `airbnb-base`. Example `.eslintrc.json`:
    ```json
    {
        "env": { "browser": true, "es2021": true, "jest": true },
        "extends": "airbnb-base",
        "parserOptions": { "ecmaVersion": "latest", "sourceType": "module" },
        "rules": {
            "import/extensions": ["error", "always"], // for ES Modules with full paths
            "no-console": "warn", // Allow console for demo purposes
            "class-methods-use-this": "off" // Can be verbose for simple classes
        }
    }
    ```
*   **Git Hooks Sample (for `.git/hooks/pre-commit`):**
    Make this file executable (`chmod +x .git/hooks/pre-commit`).
    ```sh
    #!/bin/sh
    # Example: Lint staged JavaScript files before commit
    # npx eslint --fix $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx)$')
    # For this project specifically:
    npx eslint src/**/*.js tests/**/*.test.js
    
    # To run tests before commit (optional):
    # npx jest
    # if [ $? -ne 0 ]; then
    #  echo "Jest tests failed. Commit aborted."
    #  exit 1
    # fi
    exit 0 
    ```

## Future Extensibility Notes

*   **Audio:** The `AudioEngine` can be expanded with more complex synthesis, effects (filters, distortion), and more robust oscillator pooling/voice management. Using `AudioBufferSourceNode` for complex/sampled sounds.
*   **Visuals:** `Renderer` can incorporate shaders, particle systems, and more detailed sprites.
*   **Physics:** More complex physics interactions, custom collision filtering, soft bodies.
*   **AI:** More sophisticated Harmonoid behaviors, pathfinding.
*   **Meta-Systems:**
    *   **Worlds & Progression:** Implement a system for multiple levels grouped by musical keys/modes, unlocking new abilities or Harmonoid types.
    *   **Bosses:** Design "Cacophony Beast" or "Drone Golem" with unique mechanics requiring specific harmonic solutions.
    *   **Upgrades:** Integrate "Harmonics" currency with a system to purchase upgrades (e.g., more Resonance Fields, ability enhancements).
    *   **WebRTC Co-op:** Split-screen or networked co-op could be added, where players control different aspects of the musical manipulation or groups of Harmonoids. Audio synchronization would be a challenge.

This codebase provides a strong foundation for further development of "Harmonoids: Symphony of Survival."