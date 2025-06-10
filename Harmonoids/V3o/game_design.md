# Harmonoids – Game Design Document
*Last updated: 2025-06-10*

---
## 1  High Concept
**Harmonoids** is a 2D “musical Lemmings” puzzler where each creature emits a tone.  
Players manipulate pitch, tempo, and spawn cadence to create pleasing harmonies, unlock
*Harmonic Gates*, and guide a minimum quota of Harmonoids to the level exit.

---
## 2  Game Pillars
| Pillar | Why it matters |
|--------|----------------|
| **Musical Puzzles** | Success is measured by chord progressions and harmonic targets, not raw score. |
| **Emergent Harmony / Dissonance** | Real‑time Web Audio synthesis lets players *hear* the state of the puzzle. |
| **Player Agency** | Manual & automatic spawn modes plus pitch / tempo powers let users craft solutions their own way. |

---
## 3  Core Mechanics
1. **Spawn Modes**  
   * **AUTO** – A new Harmonoid spawns every *N* frames (defaults to 60).  
   * **MANUAL** – Auto‑spawn pauses; player presses **Drop Harmonoid** to create one instantly.
2. **Pitch Shift ±** (½‑step increments, default ±50 Hz) – Alters a selected Harmonoid’s oscillator frequency, changing colour & interaction rules.
3. **Tempo Change ±** (Δ 0.2 speed) – Alters a Harmonoid’s horizontal velocity; crucial for sync moves & hazard timing.
4. **Resonance Fields** – Rectangular zones tuned to a frequency; matching Harmonoids receive *speed* or *jump* boosts.
5. **Dissonance Zones** – Red hatched areas that measure tonal clash; excess dissonance inflicts confusion (random direction flips).
6. **Harmonic Gate** – Door at level midpoint; opens when two required notes are within ±20 Hz of **B♭4 + D5** (default 440 / 550 Hz, configurable).

---
## 4  Game Modes
| Mode | Description | Key Differences |
|------|-------------|-----------------|
| **Classic** | Original auto‑spawn gameplay | Auto spawn *ON*, gate puzzle |
| **Manual Sandbox** | Explore mechanics at your own pace | Auto spawn *OFF,* unlimited drops |
| **Chord Builder** | Gate cycles through chords; build them before timer expires | Dynamic chord list, manual spawn recommended |
| **Rhythm Rush** | Spawn rate locked to metronome BPM | Spawn on beat, resonant zones flash off‑beats |
| **Dissonance Doom** | Dissonance zone expands each minute | Survival focus, pitch control critical |
| **Echo Labs** | Resonance fields duplicate Harmonoids at a perfect fifth | Chain‑reaction puzzle potential |
| **Gravity Band** | Gravity inversely linked to pitch | Vertical platforming twist |

---
## 5  Level Design Guidelines
* Early levels teach one verb at a time (pitch, tempo, spawn toggle).  
* Always offer a *safe sandbox* area before new hazards.  
* Place dissonance zones where overcrowding is likely to teach spacing.  
* Stagger resonance fields so players experiment with timing.

---
## 6  Audio Design
* **Per‑Harmonoid Oscillator** – *Sine* wave for clarity; frequency stored on entity.  
* **Master Gain Node** – Global mute / volume control.  
* **Dynamic Mixing** – Gate open/close triggers swoosh SFX; selection beeps; background pad fades from consonant (major) to dissonant (tritone) mix based on global dissonance metric.

---
## 7  Technical Architecture
```
index.html      – Canvas & UI elements
game.js         – Core loop, entity logic, level data
audio.js        – AudioManager (Web Audio API wrapper)
styles (inline) – Retro‑wave gradient UI
```
* All modules are ES6 classes; no external libs required.  
* FPS‑locked to `requestAnimationFrame` (~60 fps).  
* Input handled via Pointer Events for mouse & future touch support.

---
## 8  Performance & Security
* Object‑pool Harmonoids to reduce GC churn.  
* Clamp oscillator frequencies 100–1000 Hz to prevent damaging audio output.  
* Sanitize any locally‑stored level JSON before parsing.

---
## 9  Testing & QA
* Jest + jsdom unit tests (headless) for logic / audio math.  
* Cypress e2e tests for UI flow & spawn‑toggle edge‑cases.  
* Auditory regression: record reference WAV of level completion, compare RMS/FFT for drift.

---
## 10  Roadmap
| Phase | Deliverables |
|-------|--------------|
| **Alpha 0.2** | Manual Spawn, stats HUD, updated design docs |
| **Beta 0.3** | Chord Builder prototype, settings menu |
| **Beta 0.4** | Mobile touch controls, performance pass |
| **Release 1.0** | 10 curated levels, soundtrack, accessibility options |

---
