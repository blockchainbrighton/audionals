
## Game Concept and Architecture

### Core Game Mechanics

**Objective:** Guide a procession of creatures (let's call them 'Harmonoids') from a starting point to an exit, through a hazardous environment. The goal is to save a minimum percentage of Harmonoids per level.

**Harmonoids:**
*   Move in a continuous line, oblivious to danger.
*   Each Harmonoid emits a base frequency. When multiple Harmonoids are close, their frequencies combine to create harmonies or dissonances.

**Player Abilities (Musical Actions):**
Instead of traditional Lemmings abilities (digging, blocking, building), the player will manipulate the environment through musical actions that affect the Harmonoids' frequencies or the environment's resonance.

1.  **Pitch Shift (Up/Down):** Select a Harmonoid or a group of Harmonoids and shift their individual base frequency up or down by a set interval (e.g., a semitone). This could be used to:
    *   Create a specific chord or harmony to activate a musical gate.
    *   Change their interaction with resonant environmental elements.

2.  **Tempo Change (Speed Up/Slow Down):** Affect the movement speed of a group of Harmonoids. This could be used to:
    *   Synchronize their arrival at a specific point.
    *   Avoid timed hazards.

3.  **Resonance Field:** Create a temporary field that resonates at a specific frequency. Harmonoids passing through this field will have their frequencies temporarily altered or amplified. This could be used to:
    *   Bridge gaps (e.g., a resonant bridge appears when a specific frequency is achieved).
    *   Clear obstacles (e.g., a rock shatters when hit by a resonant frequency).

4.  **Mute/Solo:** Temporarily mute a Harmonoid's sound or solo a single Harmonoid to isolate its frequency. This could be used for:
    *   Solving puzzles that require specific individual frequencies.
    *   Reducing dissonance in a crowded area.

**Level Objectives:**
*   Guide X% of Harmonoids to the exit.
*   Achieve specific harmonic progressions at certain points in the level.
*   Collect musical notes or instruments scattered throughout the level.

### Musical Elements Influencing Gameplay

*   **Harmonic Gates:** Barriers that only open when a specific chord or harmonic interval is played by a group of Harmonoids passing through.
*   **Dissonance Hazards:** Areas where dissonant frequencies (created by too many clashing Harmonoids) cause damage or negative effects (e.g., a 


Harmonoid gets disoriented and walks into a trap).
*   **Resonant Objects:** Environmental objects that react to specific frequencies, creating pathways or removing obstacles.
*   **Soundscapes:** The overall background music of the level changes based on the collective harmony/dissonance of the Harmonoids, providing audio feedback to the player.

### High-Level Architecture

*   **Frontend (Web-based):** HTML5, CSS3, JavaScript.
*   **Game Engine:** JavaScript (e.g., Phaser.js or a custom lightweight engine for 2D physics and rendering).
*   **Audio Engine:** Web Audio API for real-time sound generation, frequency manipulation, and effects. This will be crucial for generating harmonic frequencies and managing individual Harmonoid sounds.
*   **No Backend (Initial Prototype):** The initial prototype will be entirely client-side. All game logic, assets, and audio generation will reside in the browser.

### Scope of Initial Prototype

*   **Basic Harmonoid Movement:** Simple left-to-right movement with collision detection.
*   **One Player Ability:** Implement only the 


Pitch Shift ability.
*   **One Type of Musical Hazard/Puzzle:** A simple harmonic gate that requires a specific two-note chord to open.
*   **Basic Level Design:** A single, simple level to demonstrate the core mechanics.
*   **Placeholder Visuals:** Simple shapes for Harmonoids and environmental elements.


