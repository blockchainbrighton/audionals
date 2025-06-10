You are an expert front-end game engineer.

**Goal** – Generate a COMPLETE, self-contained codebase (no external build tools) for the 2-D browser puzzle-platformer **“Harmonoids: Symphony of Survival.”**

---

## 0. Tech Stack Constraints
1. **No backend** – everything runs client-side.
2. **Framework choice:**  
   *Use a minimal bundle size path:*  
   - Bare-metal ES Modules + Canvas 2D + Web Audio API **OR**  
   - [PixiJS v8] for rendering + [Matter.js] for physics (preferred for clarity).  
   Pick whichever yields the smallest total JS payload while keeping code readable.
3. **Tooling:** vanilla HTML & CSS, ES Modules only. No Babel/Webpack—keep it copy-paste friendly.


4. **File layout**


| Path                       | Description                                |
|----------------------------|--------------------------------------------|
| `/index.html`              | Main HTML entry point                       |
| `/style.css`               | Global stylesheet                          |
| `/src/core/Engine.js`      | Main loop, state manager                   |
| `/src/core/Input.js`       | Mouse and keyboard input handling          |
| `/src/core/Renderer.js`    | PixiJS or Canvas wrapper                   |
| `/src/core/Physics.js`     | Thin Matter.js adaptor or custom physics  |
| `/src/audio/AudioEngine.js`| Oscillator pooling, gain routing           |
| `/src/audio/MusicLogic.js` | Harmony and dissonance calculations        |
| `/src/entities/Harmonoid.js`| Base Harmonoid class                      |
| `/src/entities/Bassoids.js`| Bassoids subclass                          |
| `/src/entities/Glissoids.js`| Glissoids subclass                        |
| `/src/entities/Percussoids.js`| Percussoids subclass                   |
| `/src/entities/Droneoids.js`| Droneoids subclass                        |
| `/src/mechanics/Gates.js`  | Harmonic gates                            |
| `/src/mechanics/DissonanceZone.js`| Dissonance scoring zone             |
| `/src/mechanics/ResonanceField.js`| Resonance field mechanics           |
| `/src/mechanics/EnvObjects.js`| Environmental objects (bridge, fan, portal, echo) |
| `/src/ui/HUD.js`           | UI panels, stats, buttons                  |
| `/src/ui/Panels.css`       | Styles for UI panels                       |
| `/levels/level01.json`     | Demo level data                           |
| `/tests/`                  | Jest tests with jsdom                     |
| `/README.md`               | Instructions and documentation            |



5. **Coding style** – ES2023, TypeScript-like JSDoc, DRY, KISS, single-responsibility classes.

---

## 1. Core Game Concept (include ALL)
### Objective  
Guide a procession of creatures (Harmonoids) from start to exit, rescuing ≥ X %.

### Harmonoids (base class + four subclasses)  
| Type | Passive Tone | Special Ability |
|------|--------------|-----------------|
| **Standard** | sine-wave note | – |
| **Bassoids** | 1 oct below | Vibrate low-freq plates to topple obstacles. |
| **Glissoids** | portamento glide | Slip through 1-tile gaps, accelerate on slopes. |
| **Percussoids** | percussive pop | Shockwave on landing triggers rhythm pads. |
| **Droneoids** | sustained organ | Hover when solo-muted → temporary platform. |

### Player Musical Actions  
1. Pitch Shift ± semitones  
2. Tempo Change (speed ±)  
3. **Create Resonance Field** (click-place, limited)  
4. Mute / Solo  
5. **Arpeggiator Sweep** (drag slider)  
6. Rhythm Quantize toggle  
7. Waveform Morph (sine⇄square⇄saw)  
8. One-shot Global Key Change (all notes ±N semitones)

### Game Modes  
*Procession* (auto-spawn) & *Manual Drop* (button-spawn).  

### Environmental Toys  
- Harmonic Gate (chord check)  
- Dissonance Zone (chaos area)  
- **Frequency Bridge** (sustained triad holds)  
- **Amplitude Fan** (volume-driven lift)  
- **Phase-Shift Portals** (in-phase notes teleport)  
- **Echo Chamber** (delayed reflections hit remote gates)

### Meta Systems  
- Worlds grouped by musical key/mode, each with unique ambience.  
- Boss arenas (Cacophony Beast, Drone Golem) with endless Harmonoids until harmony achieved.  
- Currency “Harmonics” for upgrades.  
- Weekly shareable puzzles via URL hash (JSON level).  
- Optional split-screen WebRTC co-op.

---

## 2. UI / UX Specs
*Main HUD* – Start/Pause, Mode toggle, Manual Drop button.  
*Abilities Panel* – context-enabled buttons for musical actions.  
*Environment Panel* – Resonance Field placer.  
*Stats* – total, saved, lost, selected counts; gate chord display.  
*Visual feedback* – Harmonoid color = frequency, selection halos, solo icon, muted grey, ability flashes.  
*Accessibility toggles* – Assist Mode (slower), Color-blind palette, Audio-only high contrast.

---

## 3. Audio Engine Requirements
* Use Web Audio API OscillatorNodes pooled per Harmonoid.  
* Keep node count ≤ 128; detune groups with `AudioBufferSourceNode` where possible.  
* Real-time harmony detection: compare active frequencies, calculate consonance/dissonance score (simple 12-TET ratio table).  
* Dynamic mix: positive harmony boosts background pads; strong dissonance darkens reverb.

---

## 4. TDD & Quality
* Provide Jest tests for:  
- HarmonicGate chord matcher  
- DissonanceZone score algorithm  
- Physics class “fall through” regression  
* Property-based fuzz tests generate random frequency clusters.  
* Lint with ESLint (airbnb-base).  
* Git hooks sample in README.

---

## 5. Deliverables
1. **Fully working demo level** showcasing ALL mechanics.  
2. **README.md** – how to run (`npx http-server .`), JSON level schema, control list.  
3. **Zip-ready folder** (no external CDN except Pixi/Matter if chosen via ES Module import).  
4. All code commented and easily extensible.

---

## 6. Output Format
Return **one combined response** in this exact order:

1. `/index.html`  
2. `/style.css`  
3. every `/src/**/*.js` file (one after another)  
4. `/levels/level01.json`  
5. `/tests/*.test.js`  
6. `/README.md`

Wrap each file in triple-backtick fences labelled with its path, e.g.:

```html
<!-- /index.html -->
<!DOCTYPE html>...
