
---

# high-level architecture

**Layers (bottom → top):**

1. **Platform & Web3**

* `AudioContext`, `AudioWorklet`, `SharedArrayBuffer` (optional), `Web MIDI API` (optional), `Web Workers`.
* **Ordinals I/O** (read-only): load libraries, samples, presets from inscription IDs/paths.
* **Deterministic RNG** seeded from a project seed (important for reproducible renders & tests).

2. **Core Timebase**

* Single **TransportClock** (source of truth = `audioContext.currentTime`).
* **Scheduler** (lookahead on main/worker, sample-accurate event insertion into AudioWorklet/Tone).
* **TempoMap** (BPM, swing, time signature, tempo ramps).

3. **Audio Engine**

* **Engine Abstraction** with two backends:

  * **ToneEngine** (wraps Tone.Transport/Players/Synth/FX).
  * **WAEngine** (pure Web Audio nodes, Players, AudioWorklets).
* **Graph Router** (Tracks → Buses → Master; per-track FX chains).

4. **Sequencing Model (Headless)**

* **Song** → **Tracks** (SamplerTrack, InstrumentTrack) → **Clips** (PatternClip for steps, AudioClip for arrangement).
* **Patterns** (step grid), **Clips** (time-ranged), **Scenes** (optional “session/clip launcher”).
* **Events**: NoteOn/Off, CC/Param, One-shot sample triggers.
* **Quantization** & **Groove** application.

5. **Assets**

* **InscriptionResolver** (URI/ID → bytes/JSON).
* **SampleLoader**, **PresetLoader**, **ProjectManifest** loader.
* Cache (memory + `CacheStorage`) with **content hash verification**.

6. **State & Persistence**

* **Project** (JSON, deterministic, content-addressed).
* **Serializer/Deserializer** (+ schema versioning & migrations).
* **Undo/Redo** (command log).

7. **UI Adapters (optional)**

* **ArrangeViewAdapter** (timeline view model).
* **StepSequencerAdapter** (grid view model).
* Renderers (p5.js 2D, Three.js for fancy/3D scopes), but **UI never touches audio**—it listens to headless state.

8. **Testing**

* Tiny built-in test harness (so you’re not blocked by off-chain libs).
* Per-module tests + **Master integration test** (“render 8 bars headless, compare event log & buffer hash”).

---

# allowed/assumed libraries (must exist on-chain as inscriptions)

* **Tone.js** (core audio lib adapter).
* **Three.js** (optional visuals).
* **p5.js** (optional UI).
* Everything else is written in-repo as tiny ES modules (assert, test runner, PRNG, deep-equal, etc.).
  *(Standards like Web Audio/MIDI/Workers aren’t “libraries,” so they’re fine.)*

---

# repository layout (ES modules)

```
/src
  /platform
    audio-context.js
    audio-worklet-loader.js
    worker-scheduler.js
    prng.js
  /web3
    inscription-resolver.js
    cache.js
    integrity.js
    manifest.js
  /time
    transport-clock.js
    scheduler.js
    tempo-map.js
    quantize.js
  /engine
    engine.js              // interface
    tone-engine.js
    wa-engine.js
    graph-router.js
    fx
      gain.js
      biquad.js
      convolver.js
      compressor.js
  /model
    song.js
    track.js
    sampler-track.js
    instrument-track.js
    clip.js
    pattern.js
    events.js
    groove.js
  /assets
    sample-loader.js
    preset-loader.js
    project-serializer.js
  /control
    commands.js
    history.js
  /ui-adapters
    arrange-vm.js
    stepseq-vm.js
  /integration
    project-player.js
    render-offline.js
  /tests
    harness.js
    assert.js
    /unit
      time.transport-clock.test.js
      time.scheduler.test.js
      model.pattern.test.js
      model.clip.test.js
      engine.tone-engine.test.js
      engine.wa-engine.test.js
      assets.sample-loader.test.js
      web3.inscription-resolver.test.js
      control.history.test.js
    /integration
      master.system.test.js
/index.html      // loads from Ordinals inscriptions
/main.js         // bootstraps based on a manifest
```

---

# core contracts (concise APIs)

## time/transport-clock.js

```js
export class TransportClock {
  constructor(audioContext) { this.ac = audioContext; this.state = { bpm:120, timeSig:[4,4], running:false, startAt:0, offset:0 }; }
  nowAudio()        { return this.ac.currentTime; }          // seconds
  nowMusical()      { return this.secondsToBeats(this.nowAudio()); }
  setBpm(bpm, when=this.nowAudio()) { /* schedule tempo change */ }
  start(when=this.nowAudio())       { /* set startAt/offset, running=true */ }
  stop(when=this.nowAudio())        { /* running=false, offset = ... */ }
  beatsToSeconds(b) { return (60/this.state.bpm)*b; }
  secondsToBeats(s) { return s/(60/this.state.bpm); }
}
```

## time/scheduler.js (single lookahead loop → engine callback)

```js
export class Scheduler {
  constructor({clock, lookahead=0.1, horizon=0.2, target}) { /* target.schedule(event, atTime) */ }
  setSource(sequenceProvider) { this.seq = sequenceProvider; } // getEventsInRange(t0,t1)->[]
  tick() { /* on interval: query events in [t, t+horizon], call target.schedule(e, time) */ }
  start() { /* uses setInterval or Worker postMessage; base times on clock.nowAudio() */ }
  stop() { /* ... */ }
}
```

## engine/engine.js (interface all engines implement)

```js
export class Engine {
  constructor({audioContext, graph}) {}
  schedule(event, when) {}         // event = {type:'note'|'sample'|'param', payload:{...}}
  setTempo(bpm, when) {}
  connectTrack(trackId, nodesSpec) {}
  setTrackGain(trackId, value) {}
  dispose() {}
}
```

## engine/tone-engine.js (adapter)

* Wraps: `Tone.Transport`, `Tone.Player`, `Tone.Sampler`, `Tone.PolySynth`, FX.
* Mirrors **TransportClock**: you never call Tone.Transport start/stop directly; this engine listens to clock changes and maps them into Tone.
* Supports sample preloading from **InscriptionResolver**.

## engine/wa-engine.js (pure Web Audio)

* `AudioBufferSourceNode` for samples, `OscillatorNode` + simple Synth via `AudioWorkletNode` for more complex instruments.
* Minimal FX nodes (Gain, Biquad, Convolver, Dynamics).
* Sample-accurate scheduling: create sources early, start at `when`, stop at computed time.

## engine/graph-router.js

* Declarative graph spec:

```js
// example
{
  master: { fx:['compressor'], gain:0.9 },
  tracks: {
    "kicks": { fx:['eqLow'], out:'master' },
    "lead":  { fx:['chorus','reverb'], out:'master' }
  }
}
```

* Builds/owns node instances per engine; exposes `connectTrack`, `setTrackGain`.

## model primitives

### model/events.js

```
NoteOn { type:'noteOn', trackId, note, vel, dur, channel? }
NoteOff { ... }                 // generated automatically from NoteOn+dur
SampleTrig { type:'sample', trackId, bufferId, offset, dur, gain, rate }
ParamChange { type:'param', target, param, value, glide? }
```

### model/pattern.js (step sequencer)

```js
export class Pattern {
  constructor({steps=16, resolution='1/16', lanes=['note'], seed=0}) { /* deterministic lanes via PRNG */ }
  getEventsInRange(t0Beats, t1Beats, track) { /* emit NoteOn/Param by looking at active steps */ }
  setStep(lane, index, payload) { /* toggle or set */ }
}
```

### model/clip.js (arrangement audio or pattern reference)

```js
export class Clip {
  constructor({type:'pattern'|'audio', startBeats, lengthBeats, refId, loop=true}){}
  getEventsInRange(t0, t1, track) { /* if pattern: delegate; if audio: map to SampleTrig windows */ }
}
```

### model/track.js (+ specializations)

```js
export class Track { constructor({id, kind:'sampler'|'instrument', channel=0}) { this.clips=[]; this.gain=1; } }
export class SamplerTrack extends Track { constructor(opts){ super({...opts,kind:'sampler'}); this.zoneMap = {/* note->bufferId */}; } }
export class InstrumentTrack extends Track { constructor(opts){ super({...opts,kind:'instrument'}); this.patch = {/* synth params */}; } }
```

### model/song.js

```js
export class Song {
  constructor({tempoMap, tracks=[], scenes=[]}) { /* scenes optional */ }
  getEventsInRange(t0Beats, t1Beats) {
    // gather from each track’s clips; return sorted list with absolute times in beats
  }
}
```

## assets & web3

### web3/inscription-resolver.js

```js
export class InscriptionResolver {
  constructor({endpoints}) { /* array of read endpoints/gateways */ }
  async fetchText(id)  { /* GET id, verify integrity if SRI provided */ }
  async fetchArrayBuffer(id) { /* samples/libraries */ }
}
```

### assets/sample-loader.js

```js
export class SampleLoader {
  constructor({resolver, audioContext}) { this.cache = new Map(); }
  async loadBuffer(inscriptionId, {expectedHash}) { /* decodeAudioData; verify; cache */ }
}
```

### web3/manifest.js (project & library manifests)

```js
// project.manifest.json
{
  "version":"1",
  "seed":"0xFEED1234",
  "bpm":120,
  "libraries":{
    "tone":"inscription:abc123",
    "three":"inscription:def456",
    "p5":"inscription:ghi789"
  },
  "assets":{
    "samples":{"kick01":"inscription:...","snare01":"inscription:..."},
    "presets":{"polyLead":"inscription:..."}
  },
  "graph":{...},
  "tracks":[ ... ],
  "clips":[ ... ]
}
```

### assets/project-serializer.js

* Load/save the above; compute content hashes for `assets.*` to lock determinism.

## control/commands.js + history.js

* Command pattern for edit ops (add clip, move note, change bpm), producing inverse ops for undo/redo.

## integration/project-player.js

```js
export class ProjectPlayer {
  constructor({audioContext, engine, scheduler, song, clock}) { /* wire everything */ }
  start() { this.clock.start(); this.scheduler.start(); }
  stop()  { this.scheduler.stop(); this.clock.stop(); }
  setBpm(bpm){ this.clock.setBpm(bpm); this.engine.setTempo(bpm, this.clock.nowAudio()); }
}
```

---

# single clock, unified timing

* **TransportClock** owns BPM & musical time.
* **Scheduler** runs a short interval on a Worker (prefer) or main thread: every \~25ms, it queries `song.getEventsInRange(beats0, beats1)` then converts beats → seconds via `clock.beatsToSeconds()` and calls `engine.schedule(e, whenSec)`.
* Both **Sampler** and **Synth** channels receive the same `whenSec`—there’s no second timing source (no per-engine Transport).

---

# UI adapters (optional)

UI only consumes view models:

* **ArrangeViewAdapter**: exposes tracks, clips, cursors, and selection; emits “intent” events (move clip A to B).
* **StepSequencerAdapter**: exposes lanes/steps state; emits toggle/set events.

You can render with p5.js (2D canvas) or Three.js (3D), or plain DOM. The adapters translate UI intents into **Commands** and never touch audio nodes.

---

# deterministic behavior & offline rendering

* **PRNG** (`platform/prng.js`) = xoshiro128\*\* or splitmix64 in \~30 LOC; seed from project manifest → use for:

  * Pattern autogeneration, humanization (if enabled), test reproducibility.
* **render-offline.js**: fast-path export using `OfflineAudioContext` (WAEngine path). For ToneEngine, build a parallel WAEngine just for export to guarantee consistency.

---

# tests (all headless, no UI required)

We embed a **tiny test harness** (so you don’t depend on off-chain test libs):

`/tests/harness.js`

```js
export async function run(tests) {
  let pass=0, fail=0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('✓', name); pass++; }
    catch (e) { console.error('✗', name, e); fail++; }
  }
  if (fail) throw new Error(`${fail} failing tests`);
}
```

`/tests/assert.js`

```js
export const assert = {
  equal(a,b,msg){ if(a!==b) throw new Error(msg||`${a} !== ${b}`); },
  approx(a,b,eps=1e-6,msg){ if(Math.abs(a-b)>eps) throw new Error(msg||`${a} ~ ${b}`); },
  ok(v,msg){ if(!v) throw new Error(msg||`assertion failed`); },
  deep(a,b,msg){ if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error(msg||`deep diff`); },
};
```

### example unit tests

* `time.transport-clock.test.js`: start/stop offsets, bpm conversion, tempo ramps.
* `time.scheduler.test.js`: with a fake clock, ensure events within horizon are emitted once, in order.
* `model.pattern.test.js`: toggling steps produces correct NoteOn/Off pairs.
* `engine.wa-engine.test.js`: schedule a sample → verify node start time & rate; in `OfflineAudioContext` compare rendered buffer hash to golden.
* `assets.sample-loader.test.js`: inscription fetch, hash verify, decodeAudioData roundtrip.

Each file exports an array of `[name, fn]` which `master.system.test.js` imports and runs.

### master.system.test.js (integration)

Goal: **Prove whole system works if all unit tests pass.**

1. Build a minimal project manifest (kick+snare loop, bass pattern, lead synth).
2. Load assets via `InscriptionResolver` (stub with in-repo fixtures if needed).
3. Use `WAEngine + OfflineAudioContext` to render 8 bars at 120 BPM.
4. Hash the output PCM (e.g., SHA-256 of float32 bytes) and compare to a golden hash embedded in repo.
5. Also record the **event log** (type + whenSec) and compare to a golden JSON.
   If both match → print “SYSTEM OK”.

---

# bootstrap sequence (main.js)

```js
import { InscriptionResolver } from './src/web3/inscription-resolver.js';
import { TransportClock } from './src/time/transport-clock.js';
import { Scheduler } from './src/time/scheduler.js';
import { Song } from './src/model/song.js';
import { ToneEngine } from './src/engine/tone-engine.js';
import { WAEngine } from './src/engine/wa-engine.js';
import { GraphRouter } from './src/engine/graph-router.js';
import { SampleLoader } from './src/assets/sample-loader.js';
import { loadManifest } from './src/web3/manifest.js';
import { ProjectPlayer } from './src/integration/project-player.js';

const ac = new AudioContext({ latencyHint:'interactive' });
const manifest = await loadManifest('inscription:<project_manifest_id>');

const resolver = new InscriptionResolver({ endpoints:[/* ordinal gateways */] });
const graph = new GraphRouter({ audioContext: ac, spec: manifest.graph });

const engine = manifest.libraries.tone
  ? new ToneEngine({ audioContext: ac, graph, resolver })
  : new WAEngine({ audioContext: ac, graph, resolver });

const clock = new TransportClock(ac);
const song  = new Song(await buildSongFromManifest(manifest, { resolver, audioContext: ac }));
const scheduler = new Scheduler({ clock, target: engine });

const player = new ProjectPlayer({ audioContext: ac, engine, scheduler, song, clock });
player.setBpm(manifest.bpm);
player.start();
```

---

# performance notes

* **Single clock**: no Tone.Transport start/stop unless mediated—avoids drift.
* **Worker-driven scheduler**: post lookahead windows to main; main strictly calls `engine.schedule`.
* **Preload & pin** samples before play; decode once.
* **AudioWorklets** for custom synths/FX; avoid parameter automation on main thread—use `AudioParam.setValueAtTime` and ramps.
* **Graph freeze**: when not editing routing, keep nodes stable to minimize GC.
* **Determinism**: never use `Date.now()` or `Math.random()` in engine/model—only the seeded PRNG.

---

# what you’ll inscribe (minimum set)

1. **Core repo** (all `/src` modules & tests).
2. **Tone.js** (as a standalone inscription; referenced from manifest).
3. **Optional**: **Three.js**, **p5.js** inscriptions for visuals.
4. **Project manifolds** for example songs, with content hashes.
5. **Golden artifacts** for tests: small audio fixtures, golden buffer hash JSON.

---

# fill-in checklist (to reach “complete working DAW”)

* [ ] Implement `TransportClock` tempo ramps + swing in `quantize.js`.
* [ ] Worker-based `Scheduler` with fallback to main thread.
* [ ] Both engines: **ToneEngine** parity with **WAEngine** for features used.
* [ ] `SamplerTrack` zone mapping (note→inscription sample) + round-robin voices.
* [ ] `InstrumentTrack` with at least: mono/poly synth, envelope, filter, simple LFO.
* [ ] FX set: gain, EQ, compressor, convolver (IR as inscription).
* [ ] Arrange **AudioClip**: offset/warp (start with fixed tempo; stretch later).
* [ ] Step Sequencer **PatternClip**: per-step prob, retrig, micro-timing.
* [ ] `ProjectSerializer` + migration v1→v2.
* [ ] UI adapters (arrange & step) + minimal p5.js renderer (optional).
* [ ] Unit tests (all green).
* [ ] Master integration test (buffer hash & event log match).
* [ ] Offline render/export to WAV (inscribed or downloadable).

---

