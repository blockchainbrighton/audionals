# Modular Thinking for Music Apps — A Plain‑English Cheat Sheet

*A framework you can think with, not code. Use it to design DAWs, synths, sequencers like LEGO.*

---

## 1) The Core Metaphor: **Pedalboard + Patchbay**
**Blocks** are pedals/modules. **Jacks** are the holes on the faceplate. **Cables** connect jacks. **Knobs/Switches** are the ways to control a block. **Power** keeps it alive. Design by asking: *What is the block? Where are the jacks? What cables can it accept? What do the knobs do?*

> Keep every block swappable. If you can unplug it and drop a different block in, you’re modular.

---

## 2) Label Any Block in 60 Seconds (no code)
Fill these blanks on a sticky note before you build:

- **Name:** (e.g., “Oscillator”, “Step Sequencer”, “Scope”)
- **Purpose (one sentence):** “Turns pitch into a raw tone.”
- **Inputs (jacks in):** “Pitch, Gate, Mod.”
- **Outputs (jacks out):** “Audio, Meter Data, Events.”
- **Controls (front panel):** “Wave, Freq, Detune, Level.”
- **States (what it remembers):** “Current preset, step values.”
- **Power/Lifecycle:** “Create → Active → Bypassed → Disposed.”

If you can’t fill this in 60s, the block is fuzzy. Split it in two.

---

## 3) The Six Rules of Modularity (in maker language)
1. **One job per block.** If the faceplate needs two names, it’s two blocks.
2. **No soldered cables.** Never glue one block permanently to another; always go through jacks.
3. **Clear labels, no telepathy.** Everything a block needs must arrive through jacks or knobs—no hidden side-channels.
4. **Swap test.** You should be able to replace the block with a dummy and the rest still runs.
5. **Skin vs. guts.** The *guts* do the sound/logic; the *skin* is the panel/UI. You can reskin without touching guts.
6. **Snapshot-friendly.** You can photograph (save) the faceplate and cables and rebuild later (presets/projects).

---

## 4) The Design Loop (paper-first, 10 minutes)
1. **Sketch boxes and jacks.** Draw blocks; mark inputs/outputs with arrows.
2. **Name the knobs.** Write the panel labels you want to see.
3. **Walk the signal.** “A note comes in → oscillators → filter → gain → output.”
4. **Run the swap test.** Replace any block with a fake one—does the rest still make sense?
5. **Freeze the *guts* names.** Decide the jack names and knob labels. These are the only promises blocks make.
6. **Build one vertical slice.** One tiny path from input to sound with real controls.

Repeat.

---

## 5) Escape Hatches (when you feel a dead end coming)
- **Too big?** Cut along the panel: knobs that move together belong together; knobs that don’t → separate blocks.
- **Too tangled?** Insert a “utility” block (mixer, splitter, clock, router) instead of direct spaghetti lines.
- **Too slow to change?** Make an **adapter** block that translates between two styles (e.g., MIDI ↔ notes, events ↔ audio).
- **Too opinionated UI?** Keep the guts and build a new skin (panel) that talks to the same jacks.

---

## 6) A Worked Example (musical, not technical)
**Goal:** Single voice you can reuse everywhere.

- **Blocks:** Note In → Osc → Filter → Amp → Out
- **Jacks:**
  - *Note In:* (Pitch, Gate)
  - *Osc:* in: Pitch, Mod; out: Raw Audio
  - *Filter:* in: Audio, Cutoff CV; out: Audio
  - *Amp:* in: Audio, Level CV; out: Audio
  - *Out:* in: Audio; out: Speakers + “Meter Data”
- **Controls:** Osc(Wave, Detune), Filter(Cutoff, Resonance), Amp(Level)
- **Snapshot:** A photo of all knobs + a list of connections = a preset. You can recall it anywhere.

To expand to polyphony, multiply the *voice* block N times and sum with a **Mixer** block—don’t mutate the voice.

---

## 7) Presets You Can Trust (random without roulette)
- **Preset = Photo:** All knob positions + cable list.
- **Seeded Random:** Keep a seed number. “Random #42” gives the same results tomorrow.
- **Compatibility:** Don’t store device quirks inside the preset. It should plug into any rig with the same jack names.

---

## 8) Naming Guide (keep it musical)
- Prefer **musician words** on the panel: *Pitch, Gate, Level, Cutoff, Rate, Depth.*
- Use **short, durable jack names** you won’t regret. Once named, treat them like the print on a hardware panel.
- Add **units** where helpful: Hz, dB, %, ms, steps.

---

## 9) Library Cards for Blocks (so you can reuse them)
For each block, keep a one-page card:
- **Front:** Picture of the faceplate with jacks and knobs labeled.
- **Back:**
  - Purpose (one job)
  - Inputs/Outputs list
  - Panel controls
  - “Works well with…” (e.g., Envelope → Amp Level)
  - Limits (e.g., accepts mono only)

When a new product needs a feature, browse your cards before inventing a new block.

---

## 10) Red Flags (smell these early)
- **God Block:** “Editor” that records, mixes, and exports—split it.
- **Secret Cables:** Something works only if another part exists → add a visible jack.
- **Leaky Guts:** UI needs to know internal tricks → move those into visible knobs or additional jacks.
- **Preset Drift:** Saving twice gives different results → stop and fix your snapshot rules.

---

## 11) Translation Table (coder → maker)
- Component → **Block**
- Interface/Contract → **Jack labels**
- Event → **Signal/Message**
- Adapter → **Converter block**
- State → **Settings the block remembers**
- Module boundary → **Faceplate**

---

## 12) Your 5‑Minute Daily Habit
1. Pick one new **block** idea.
2. Fill the 60‑second label.
3. Draw jacks/knobs.
4. Do swap test with a dummy block.
5. File a **library card**.

That’s it. Build the product by snapping blocks from your library and adding only what’s missing.

---

### Bonus: Starter Block List for Music Apps
- Note In, Clock, Transport
- Oscillator, Noise, Sampler
- Filter, Waveshaper, Distortion
- Envelope, LFO, Random
- Mixer, Splitter, Router, Crossfader
- Delay, Reverb, Chorus
- Meter, Scope, Tuner
- Recorder, Exporter

> If you can put it on a pedalboard, it’s a block. If it needs two faceplates, it’s two blocks.

