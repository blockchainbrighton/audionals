## Game Concept and Architecture

### Core Game Mechanics

**Objective:** Guide a procession of creatures (let's call them 'Harmonoids') from a starting point to an exit, through a hazardous environment. The goal is to save a minimum percentage of Harmonoids per level.

**Harmonoids:**
*   Spawned individually by player action (e.g., "Drop Harmonoid" button) from a designated starting point. A short cooldown prevents spamming.
*   Once spawned, move in a continuous line, reacting to gravity and platforms, generally oblivious to complex dangers unless affected by player abilities or environmental hazards.
*   Each Harmonoid emits a base frequency, visualized by its color. When multiple Harmonoids are close, their frequencies combine to create harmonies or dissonances, influencing game elements and the soundscape.

### Game Modes

The core mechanics can be adapted into various game modes by adjusting level design, objectives, and available tools:

*   **Story/Puzzle Mode:** The primary mode, focusing on guiding Harmonoids through levels by solving musical puzzles as originally designed.
*   **Cadence Commander (Rhythm Mode):** Focuses on rhythmic precision using Drop Control and Tempo Change to match beats and activate timed elements.
*   **Harmonic Weaver (Advanced Harmony Mode):** Requires intricate chord building and harmonic progressions using precise Pitch Shift, Mute/Solo.
*   **Resonance Architect (Environmental Mode):** Emphasizes manipulating Resonant Objects and Fields to reshape the level, using Harmonoids as frequency activators.
*   **Sandbox Symphony (Creative Mode):** An open environment for players to freely experiment with all mechanics and create their own sonic interactions without strict objectives.

**Player Abilities (Musical Actions):**
Instead of traditional Lemmings abilities (digging, blocking, building), the player will manipulate the environment through musical actions that affect the Harmonoids' frequencies or the environment's resonance.

1.  **Pitch Shift (Up/Down):** Select a Harmonoid or a group of Harmonoids and shift their individual base frequency up or down by a set interval (e.g., 10 Hz per step, allowing for semi-tone like adjustments). This could be used to:
    *   Create a specific chord or harmony to activate a musical gate.
    *   Change their interaction with resonant environmental elements.

2.  **Tempo Change (Speed Up/Slow Down):** Affect the movement speed of a group of Harmonoids. This could be used to:
    *   Synchronize their arrival at a specific point.
    *   Avoid timed hazards.

3.  **Resonance Field (Implemented in Level Design):** Level-defined temporary fields that resonate at a specific frequency. Harmonoids passing through this field whose frequencies match the field's may have their properties temporarily altered (e.g., speed boost, jump boost). This could be used to:
    *   Bridge gaps (e.g., a resonant bridge appears when a specific frequency is achieved by Harmonoids in a field – Future concept).
    *   Clear obstacles (e.g., a rock shatters when hit by a resonant frequency – Future concept).

4.  **Mute/Solo (Future Concept):** Temporarily mute a Harmonoid's sound or solo a single Harmonoid to isolate its frequency. This could be used for:
    *   Solving puzzles that require specific individual frequencies.
    *   Reducing dissonance in a crowded area.

### Player Feedback and Interface

*   **Visual Cues:**
    *   Selected Harmonoids are clearly highlighted with a yellow outline. Marquee selection uses a dashed yellow box.
    *   Harmonoids display their relative pitch through color (mapped from frequency to HSL hue) and a small numerical frequency display above them.
    *   Harmonic Gates visually indicate their required chord frequencies (approximate) and their current state (OPEN/CLOSED) with color and text.
    *   Resonance Fields show their area of effect, target frequency, and effect type with text and distinct visual styling.
    *   Dissonance Zones are visualized with a distinct, semi-transparent overlay and dashed border. Harmonoids affected by strong dissonance change color (e.g., to crimson) and may exhibit erratic behavior.
*   **Audio Cues:**
    *   Distinct sounds for ability activation (pitch/tempo changes currently rely on the direct change in Harmonoid sound), successful interactions (gate open, resonance effects triggering), Harmonoid spawning (a 'pop' sound), Harmonoid selection, and negative effects (dissonance is primarily the cacophony of clashing frequencies, but Harmonoids audibly react to severe dissonance if effects are tied to their individual sounds in the future).
    *   Dynamic background soundscape reflects the current harmonic state of the game (Future Concept).
*   **Controls:**
    *   Support for both individual (click) and group (drag-select marquee) Harmonoid selection. Shift-click to add/remove from selection.
    *   Clear application flow for abilities (select Harmonoid(s), then click ability button).
    *   Interactive placement for abilities like Resonance Field (Future Concept for player-placed fields). Currently, Resonance Fields are part of the level design.
*   **Learning & Onboarding:**
    *   Integrated tutorial levels introducing mechanics progressively (Future Concept).
    *   Optional hint system for complex puzzles (Future Concept).

**Level Objectives:**
*   Guide X% of Harmonoids to the exit.
*   Achieve specific harmonic progressions at certain points in the level (Implemented via Harmonic Gates).
*   Collect musical notes or instruments scattered throughout the level (Future Concept).

### Musical Elements Influencing Gameplay

*   **Harmonic Gates:** Barriers that only open when a specific chord or harmonic interval (e.g., two specific frequencies within a tolerance) is played by a group of Harmonoids currently within the gate's area.
*   **Dissonance Hazards (Implemented as Dissonance Zones):** Areas where dissonant frequencies (calculated based on clashing Harmonoid frequencies) cause negative effects on Harmonoids within them (e.g., disorientation, reduced speed, random direction changes).
*   **Resonant Objects/Fields:** Environmental objects or defined areas that react to specific frequencies from Harmonoids, altering Harmonoid properties (e.g., speed, jump) or potentially modifying the environment (Future concept for environmental modification).
*   **Soundscapes:** The overall background music of the level changes based on the collective harmony/dissonance of the Harmonoids, providing audio feedback to the player (Future Concept).

### High-Level Architecture

*   **Frontend (Web-based):** HTML5, CSS3, JavaScript.
*   **Game Engine:** Custom lightweight JavaScript engine for 2D physics, rendering, and game logic.
*   **Audio Engine:** Web Audio API for real-time sound generation (OscillatorNodes for Harmonoids and effects), frequency manipulation, and mixing.
*   **No Backend (Current):** The game is entirely client-side. All game logic, assets, and audio generation reside in the browser.

### Scope of Initial Prototype (Achieved/Expanded)

*   **Basic Harmonoid Movement:** Implemented (left-to-right, gravity, platform collision, turning at edges/obstacles).
*   **Harmonoid Spawning:** Manual player-controlled drop implemented.
*   **Player Abilities:** Pitch Shift and Tempo Change implemented.
*   **Musical Hazard/Puzzle:** Harmonic gate requiring specific two-note chord implemented. Resonance Fields and Dissonance Zones also implemented.
*   **Basic Level Design:** A single, demonstrable level with platforms, start/end, gate, resonance fields, and dissonance zones is functional.
*   **Visuals:** Placeholder shapes improved with color-coding for frequency, effect-specific colors, and basic UI.