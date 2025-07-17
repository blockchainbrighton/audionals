# Audio Modular Synthesizer — Concise Feature Rundown

**Audio Modular Synthesizer** is a browser‑based sound‑design sandbox that lets you patch bespoke instruments and effects by wiring together ready‑made building blocks.

---

## Core Building Blocks

| Block             | Purpose                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Oscillator**    | Generates raw waveforms (sine, saw, square, etc.).                                                                                                            |
| **Filter**        | Shapes timbre with low‑/band‑/high‑pass responses.                                                                                                            |
| **Gain**          | Sets level and enables amplitude modulation.                                                                                                                  |
| **LFO**           | Low‑frequency modulator for any knob or parameter.                                                                                                            |
| **Sample Player** | Drag‑and‑drop audio files; waveform view with start/end trim handles.                                                                                         |
| **Sequencer**     | Pattern grid synced to a master **BPM** control for beat‑tight playback.                                                                                      |
| **MIDI Mapper**   | Maps every loaded sample (or oscillator voice) across all 88 keys with automatic pitch‑shift, tempo‑sync playback‑speed options, and per‑note tuning offsets. |
| **Output**        | Final module that pipes the mix to your speakers or audio interface.                                                                                          |

---

## What You Can Do

* **Patch Anything** – Chain modules into classic subtractive synths, granular samplers, or hybrid monsters.
* **See the Flow** – Cables animate in real‑time, so signal paths are always obvious.
* **Play Every Sound** – Any sample instantly becomes a full keyboard instrument; tweak speed or harmonic scaling to taste.
* **Sequence & Sync** – Build drum patterns, arps, or polyrhythms and lock them all to one BPM.
* **Modulate Everything** – Route LFOs or MIDI CCs to pitch, cutoff, volume, trim points—whatever sparks ideas.
* **Instant Feedback** – Every adjustment is audible immediately in the browser, no extra plugins required.
* **Expandable** – Drop new module files into the palette to keep the rig growing with your imagination.

---

## Quick Start

1. **Clone / download** this repo.
2. **Serve** the folder locally (e.g. `npx serve .`).
3. **Open** the URL in a modern Web‑Audio‑capable browser and start patching.

That’s it—modular synthesis, sampling, sequencing, and live modulation, all in one lightweight web page.
