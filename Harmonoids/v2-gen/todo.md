- [x] Define core game mechanics (e.g., character abilities, level objectives)
- [x] Outline how musical elements will influence gameplay
- [x] Sketch out a high-level architecture for the game (e.g., frontend/backend, audio engine)
- [x] Define the scope of the initial prototype

- [x] Research Web Audio API capabilities for sound synthesis and manipulation.
- [x] Investigate methods for generating specific frequencies and harmonic series.
- [x] Explore techniques for real-time audio processing (e.g., pitch shifting, tempo changes).
- [x] Look into examples or libraries that handle musical scales, chords, and intervals.

- [x] Set up the basic HTML/CSS/JavaScript structure for the game.
- [x] Implement basic Harmonoid movement (left-to-right with collision detection, basic physics).
- [x] Create a simple level layout with start and end points, platforms.
- [x] Implement basic game loop (update, render).
- [x] Add basic player interaction (clicking and drag-box to select Harmonoids).

- [x] Implement Web Audio API context and basic oscillator nodes.
- [x] Create audio manager class to handle multiple harmonoid sounds.
- [x] Generate distinct frequencies for each harmonoid based on their base frequency.
- [x] Implement real-time audio synthesis that responds to harmonoid states.
- [x] Add audio feedback for game events (spawning, selection, gate interactions, resonance fields).

GAMEPLAY MECHANICS DEVELOPMENT:
- [x] Implement 'Pitch Shift' player ability.
- [x] Implement 'Tempo Change' player ability.
- [x] Implement 'Mute/Solo' player ability.
  - [x] UI buttons for Mute/Solo.
  - [x] AudioManager support for individual gain control, tracking soloed state.
  - [x] Visual feedback for muted/soloed Harmonoids.
- [x] Implement 'Create Resonance Field' player ability.
  - [x] UI button to activate placement mode.
  - [x] Canvas click to place field.
  - [x] Field has duration, visual representation.
  - [x] Field amplifies sound of Harmonoids with matching frequencies.
- [x] Enhance harmonic gate mechanics to require more complex chord progressions (3-note chord).
  - [x] Add visual/audio cues for gate requirements and correct note interactions (note indicators on gate).
- [x] Implement static resonance fields in the level that affect harmonoid behavior based on frequency (speed boost, jump boost).
- [x] Add dissonance detection that creates hazards or obstacles.
  - [x] Define dissonance calculation logic in AudioManager.
  - [x] Implement effects of dissonance (e.g., disorientation, speed reduction).
- [ ] Create more complex musical puzzles that require specific harmonic combinations or sequences.
- [ ] Implement dynamic background music that changes based on harmonoid harmony/dissonance.

MANUAL DROP MODE:
- [x] Implement UI toggle for Procession/Manual Drop mode.
- [x] Implement "Drop Harmonoid" button and functionality.
- [ ] (Optional) Implement pre-drop frequency selection for Harmonoids.
- [ ] Design and implement "Chord Constructor" puzzle type/levels.
- [ ] Design and implement "Rhythmic Harmony" puzzle type/levels.
- [ ] Design and implement "Dissonance Sculpting" puzzle type/levels.
- [ ] Develop "Soundscape Canvas" (Sandbox Mode) with experimental audio objects.

VISUALS & UI:
- [x] Enhance visual design with better graphics and animations (basic improvements).
- [ ] Create additional levels with increasing complexity.
  - [ ] Design levels specifically for Manual Drop Mode mechanics.
- [ ] Add more particle effects for musical interactions (e.g., resonance field activation, successful harmony).
- [x] Improve UI design with better styling and layout (button groups, responsive UI elements).
  - [x] Add UI elements for new abilities and game mode controls.
- [x] Add visual indicators for harmonoid frequencies (color), effects (flashing), and states (muted/soloed).

TESTING & DEPLOYMENT:
- [ ] Test all game mechanics thoroughly (movement, selection, all player abilities).
- [ ] Test audio functionality extensively (harmonoid sounds, gate sounds, all feedback, mute/solo, amplification).
- [ ] Test musical elements (resonance fields, dissonance zones, complex harmonic gates).
- [ ] Test Manual Drop Mode and its specific puzzle types.
- [ ] Verify cross-browser compatibility and performance (especially audio context handling).
- [ ] Deploy the game to a public URL for sharing.