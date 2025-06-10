# Harmonoids: **Symphony of Survival**  
A browser-only 2-D puzzle-platformer where music **is** the physics.

---

## 1 · Game Loop at a Glance
| Phase | What Happens |
|-------|--------------|
| **Spawn** | Harmonoids stream from the entry trumpet (auto-spawn) or drop when you press **Drop**. |
| **Procession** | Creatures march, bounce, glide, or hover through the level, colliding with tiles driven by simple AABB physics. |
| **Interact** | You shape the soundtrack (and hence the world) with musical actions—shift pitch, mute, solo, create resonance fields, etc. |
| **Score** | Rescue the target percentage by guiding enough Harmonoids through the exit gate without losing them to pitfalls or dissonance. |

The happier the harmony, the easier the path; heavy dissonance darkens the mix and disables certain gadgets.

---

## 2 · Controls & UI

| UI Area / Hotkey | Action | Notes |
|------------------|--------|-------|
| **⏵ / ⏸ buttons (HUD)** | **Start / Pause** | Freezes physics & audio. |
| **Drop** button (HUD) | **Manual Drop** | Spawns one Standard Harmonoid from the sky. |
| **Click** on world | Place **Resonance Field** (when Environment Panel is open). |
| **Abilities Panel buttons** | Musical powers (see below). | Context-enabled; greyed when unavailable. |
| `←  →` or `A  D` | **Pitch Shift** ± 1 semitone | Affects ALL un-muted Harmonoids. |
| `↑  ↓` or `W  S` | **Tempo Change** ± 10 % | Speeds or slows entity velocities. |
| `M` | **Mute selected** Harmonoids | Selected = click/tap a Harmonoid. |
| `S` | **Solo selected** | Others mute; solo Droneoids hover. |
| `R` | **Rhythm Quantize** toggle | Snaps Percussoid shockwaves to the beat. |
| `Q` | **Waveform Morph** | Cycles sine → square → saw. |
| <kbd>Space</kbd> | **Global Key Change** | Jumps all pitches by ± N semitones (set with slider). |
| **Assist Mode** (checkbox) | 50 % slower time | Great for practising puzzles. |
| **Color-Blind Palette** (checkbox) | Alternate hues / patterns | Swaps hue mapping & adds textures. |
| **Audio-Only Contrast** (checkbox) | Dark screen / bright audio | For visually impaired players. |

### Mouse interactions
* **Left-click** a Harmonoid: selects it (halo outline).
* **Left-click empty + Environment Panel active**: deploys a Resonance Field at cursor (limited stock shown on button).
* **Right-click** anywhere: cancels current placement / selection.

---

## 3 · Harmonoid Types & Abilities
| Class | Passive Tone | Special |
|-------|--------------|---------|
| **Standard** | Pure sine note | — |
| **Bassoids** | 1 octave below | Vibrate bass plates; topple obstacles on landing. |
| **Glissoids** | Portamento glide | Slide through 1-tile gaps; accelerate on slopes. |
| **Percussoids** | Percussive pop | Landing shockwave hits rhythm pads & triggers gates. |
| **Droneoids** | Sustained organ | When **solo-muted**: hover for ≈ 2 s creating temporary platforms. |

---

## 4 · Environmental Objects
| Gadget | How to Use |
|--------|------------|
| **Harmonic Gate** | Opens when notes sounding inside match its chord (displayed above gate). |
| **Dissonance Zone** | Passing creatures add chaos—too high a score may close nearby gates. |
| **Frequency Bridge** | Stays solid only while a triad is held below it. |
| **Amplitude Fan** | Volume-driven draft lifts lightweight Harmonoids. |
| **Phase-Shift Portal** | Teleports in-phase notes; off-phase get reflected. |
| **Echo Chamber** | Sends delayed copies of notes—use to hit remote gates. |

---

## 5 · Winning & Losing
* **Goal:** reach the exit portal with at least the level’s **Target % Saved** (shown top-right).
* **Failures:** falling off map, crushed by obstacles, or annihilated in a Dissonance Zone count as **Lost**.
* HUD stats always show **Total / Saved / Lost / Selected**.

---

## 6 · Running the Game Locally
```bash
npx http-server .
# → open http://127.0.0.1:8080
