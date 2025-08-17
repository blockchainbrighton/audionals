### Summary

This document is a staged build plan for a fully modular, 
Web3-enabled digital audio workstation implemented in the browser. 
It breaks the system into self-contained directories—platform primitives, 
timing core, sequencing model, audio engines, Web3 asset handling, integration, 
and UI adapters—each with clearly defined deliverables, unit and contract tests, and promotion gates. 
The build proceeds in manageable chunks, with parallelizable sections where possible, 
and every stage produces artifacts and golden references to prove correctness and determinism. 
The end result is a reproducible, deterministic DAW that can run entirely from on-chain assets, 
with a single source of musical time driving both Web Audio API and Tone.js engines, 
all wired together through tested contracts for reliable integration.


---

# 0) Bootstrap & CI spine (once)

**Scope:** `/tests/harness.js`, `/tests/assert.js`, repo scripts, CI.

**Deliverables**

* Minimal test runner + assertion utils (already specced).
* `npm scripts`: `test`, `test:unit`, `test:int`, `lint`, `build`.
* CI workflow (Node + headless browser): run unit first, then integration.
* Coverage & performance baselines saved as artifacts.

**Tests / Gates**

* Runner executes a dummy test suite; nonzero exit on failures.
* Coverage ≥ 60% to start (ratchet later).
* Timing for runner < 2s locally (sanity).

**Artifacts**

* `/.ci/thresholds.json` (coverage targets, perf budgets).

---

# 1) Platform primitives

**Scope:** `/platform/audio-context.js`, `audio-worklet-loader.js`, `worker-scheduler.js`, `prng.js`

**Deliverables**

* Safe AudioContext factory (latency hints, SAB feature sniff).
* Worklet loader with URL/inscription support.
* Worker-based ticker (postMessage clockbeats), fallback to main thread.
* Deterministic PRNG (xoshiro128\*\* or splitmix64).

**Unit tests**

* `platform.prng.test.js`: fixed seeds → fixed sequences; jump/skip determinism.
* `platform.worker-scheduler.test.js`: emits ticks at requested cadence; drift < 1ms avg in fake time.
* `platform.audio-worklet-loader.test.js`: loads a no-op worklet processor; idempotent.

**Gate (Definition of Done)**

* Tick jitter p95 < 3ms (simulated clock).
* All pass; coverage ≥ 80% here (tiny surface).

**Artifacts**

* `contracts/platform.json` (API signatures + expected behaviors).

---

# 2) Time system

**Scope:** `/time/transport-clock.js`, `tempo-map.js`, `quantize.js`, `scheduler.js`

**Deliverables**

* TransportClock: start/stop/seek; beats↔seconds.
* TempoMap: constant tempo + linear ramps.
* Quantize: grid, swing %, micro-offsets.
* Scheduler: lookahead loop (uses platform worker); pluggable `target.schedule`.

**Unit tests**

* `time.transport-clock.test.js`: start/stop offsets; seek; bpm convert.
* `time.tempo-map.test.js`: ramp integration exactness; boundary events.
* `time.quantize.test.js`: swing at 0/50%; microtiming sum to zero (optional).
* `time.scheduler.test.js`: events emitted once, in order; horizon boundaries exact.

**Gate**

* Ramp error < 0.5ms across 8 bars.
* No duplicate events in overlapping horizons.
* 100% pass.

**Artifacts**

* `contracts/time.md` (timing rules & invariants).

---

# 3) Sequencing model (headless)

**Scope:** `/model/events.js`, `pattern.js`, `clip.js`, `track.js`, `song.js`, `groove.js`

**Deliverables**

* Event structs (NoteOn/Off generated from NoteOn+dur), SampleTrig, ParamChange.
* Pattern (seedable), Clip (pattern/audio), Track types, Song aggregator.

**Unit tests**

* `model.pattern.test.js`: toggles → correct NoteOn/Off; repeatability with PRNG.
* `model.clip.test.js`: pattern loop math; audio clip windows; edge cases on clip boundaries.
* `model.song.test.js`: multi-track merge sorted by time; stable across seeds.

**Gate**

* Deterministic: same seed → identical event lists byte-for-byte.
* Event stability under horizon slicing (chunking doesn’t change set).

**Artifacts**

* `goldens/model/*.json` (event lists for fixtures).

---

# 4) Web3 access & integrity

**Scope:** `/web3/inscription-resolver.js`, `cache.js`, `integrity.js`, `manifest.js`

**Deliverables**

* Multi-endpoint read resolver; integrity (SRI/hash) check.
* Cache (memory + CacheStorage) with content hash keys.
* Project & library manifest loader.

**Unit tests**

* `web3.inscription-resolver.test.js`: fallback on endpoint error; byte-for-byte integrity check; caching.
* `web3.manifest.test.js`: schema validate; missing asset errors are descriptive.

**Gate**

* Corrupt bytes → hard fail with hash mismatch.
* Cold vs warm fetch speedup > 2× (simulated).

**Artifacts**

* `schemas/project.manifest.schema.json`.

---

# 5) Assets

**Scope:** `/assets/sample-loader.js`, `preset-loader.js`, `project-serializer.js`

**Deliverables**

* Sample loader: decode, cache, verify against expected hash.
* Preset loader: parse preset JSON.
* Serializer: deterministic sort; versioning + migrations.

**Unit tests**

* `assets.sample-loader.test.js`: decode fixture; hash verify; cached path not re-decoding.
* `assets.project-serializer.test.js`: v1→v2 migration; stable stringify → stable hash.

**Gate**

* Re-serialize → identical bytes (idempotent).
* Decode failures surface the failing asset id.

**Artifacts**

* `goldens/assets/*.wav` (tiny fixtures), `goldens/project/*.json`.

---

# 6) Engine contracts & routing

**Scope:** `/engine/engine.js`, `graph-router.js`, `/engine/fx/*`

**Deliverables**

* Engine interface (schedule/setTempo/connectTrack/setTrackGain/dispose).
* GraphRouter builds per-track FX chains → master.
* Minimal FX (gain, biquad, convolver, compressor) with identical param names across engines.

**Unit tests**

* `engine.graph-router.test.js`: builds declared graph; re-entrant connections safe; setTrackGain reflects on AudioParams (mock).
* `engine.fx.*.test.js`: param mapping & default values.

**Contract tests** (new):

* `tests/contracts/engine.schedule.contract.test.js`: using a fake engine, assert events/whenSec shape & ordering from the scheduler.

**Gate**

* Graph diff (spec vs built) === Ø (no missing nodes).
* Contract suite passes for both engines later.

**Artifacts**

* `contracts/engine.schedule.json` (event envelope schema).

---

# 7) WAEngine (authoritative path)

**Scope:** `/engine/wa-engine.js`

**Deliverables**

* Sample playback (ABSN) with offset/dur; polyphony management.
* Basic synth voice (OscillatorNode + envelopes), or Worklet synth stub.
* Param automation mapping.

**Unit tests**

* `engine.wa-engine.test.js`: schedules start times accurately; stops; rate changes; parameter ramps.
* `engine.wa-engine.offline.test.js`: render via `OfflineAudioContext` → hash equals golden for fixture song.

**Gate**

* Start-time error p95 < 0.2ms in Offline context.
* Golden buffer hash matches (determinism).

**Artifacts**

* `goldens/audio/waengine/8bars.hash.json`.

---

# 8) ToneEngine (adapter with parity targets)

**Scope:** `/engine/tone-engine.js`

**Deliverables**

* Tone players/synths invoked with absolute `whenSec`.
* Mirror `setTempo(bpm, whenSec)` into `Tone.Transport.bpm`.
* No use of `Tone.Transport.schedule` for musical events (only direct instrument APIs).

**Unit tests**

* `engine.tone-engine.test.js`: translate absolute `whenSec` to Tone calls (spy/mocks); tempo mirrored at exact times.
* **Parity tests (critical):** feed the same fixture song to WAEngine offline and ToneEngine live-recorded into Offline graph (or an equivalent WA graph) → event log equivalence + rendered hash within tolerance.

**Gate**

* Event log identical to WAEngine for the fixture.
* Rendered hash within epsilon (e.g., allowing denormals/noise floor diff) or byte-exact if using equivalent WA export path.

**Artifacts**

* `goldens/audio/toneengine/8bars.hash.json`
* `goldens/logs/fixture.events.json`

---

# 9) Integration: project playback & offline render

**Scope:** `/integration/project-player.js`, `render-offline.js`

**Deliverables**

* ProjectPlayer wires: Resolver → Assets → Song → Graph → Engine → Scheduler → Clock.
* Offline renderer: WAEngine + OfflineAudioContext; mirrors live schedule.

**Integration tests**

* `integration.master.system.test.js`: build minimal manifest → render 8 bars → compare (1) event log, (2) PCM hash.
* `integration.engine-matrix.test.js`: run the same manifest on both engines; assert logs match; hashes match/epsilon.

**Gate**

* “SYSTEM OK” with deterministic outputs.
* Swap engines without code changes in project bootstrap.

**Artifacts**

* `goldens/system-ok.json`

---

# 10) Control & history

**Scope:** `/control/commands.js`, `history.js`

**Deliverables**

* Commands for edit ops: add/move clip, change bpm, toggle step; inverse ops for undo/redo.

**Unit tests**

* `control.history.test.js`: linear and branching undo/redo; command compaction; redo invalidation after new op.

**Contract tests**

* Commands emit exact state diffs consumable by UI adapters.

**Gate**

* Undo/redo round-trip leaves model byte-identical.

**Artifacts**

* `contracts/commands.json` (command payload schema).

---

# 11) UI adapters (optional to ship audio core)

**Scope:** `/ui-adapters/arrange-vm.js`, `stepseq-vm.js`

**Deliverables**

* Read-only view models + “intent” events that map to commands.
* No audio coupling.

**Unit tests**

* `ui.arrange-vm.test.js`: selection, cursor, clip projections.
* `ui.stepseq-vm.test.js`: lanes, steps, toggles → command intent.

**Gate**

* 100% of intents map to valid commands (property test pass).

---

# 12) Performance & reliability

**Scope:** perf budgets, GC pressure, memory

**Deliverables**

* Microbenchmarks for: scheduler tick, event range query, engine.schedule.
* Long-run soak test: 10 min playback @ 128 steps, 16 tracks.

**Tests**

* `perf.scheduler.bench.js`: p95 tick < 3ms under load (simulated).
* `reliability.soak.test.js`: no missed events; no increasing drift; no unbounded heap growth (simple RSS snapshot trend).

**Gate**

* Budgets met (stored in `.ci/thresholds.json`).

---

# 13) Packaging & bootstrap

**Scope:** `/index.html`, `/main.js`, inscriptions

**Deliverables**

* Bootstraps from project manifest id; selects engine based on availability of Tone inscription.
* Preload/pin assets; start player.

**Integration tests**

* `integration.bootstrap.test.js`: simulate a DOM bootstrap, fetch a small manifest via stubbed resolver, start/stop successfully.

**Gate**

* Cold start to first audio < 1.5s (with cached samples) in CI headless env (approximate).

---

## How to “wire it all together” at the end

1. **Contracts First:** You’ve produced schemas in `/contracts/*` and golden logs/hashes in `/goldens/*`. These are the glue and the proof.
2. **Engine Matrix:** A single **engine contract test suite** runs against **both** WAEngine and ToneEngine using the same fixture songs. That’s your parity safety net.
3. **ProjectPlayer Assembly:** The final assembly uses only **published contracts**:

   * `Resolver` (contract: bytes + integrity)
   * `SampleLoader` (contract: buffer objects)
   * `Song` (contract: `getEventsInRange`)
   * `Scheduler` (contract: `target.schedule(e, whenSec)`)
   * `Engine` (contract: `schedule/setTempo/connectTrack`)
   * `GraphRouter` (contract: track id ↔ node ids)
   * `Clock` (contract: beats↔seconds; start/stop)
4. **Golden System Test:** `master.system.test.js` stays green with:

   * **Event log equality** (source-of-truth timing).
   * **PCM hash equality** (deterministic render).
5. **End-to-End Smoke:** `main.js` bootstrap points to a small manifest; CI runs a headless smoke that starts/stops and renders 1 bar offline.

---

## Build order & parallelism

* **Parallel tracks**: (1) Platform + Time + Model and (2) Web3 + Assets can proceed in parallel after Stage 0.
* **Sequential gates**: Engines depend on Time + Model + Assets; WAEngine before ToneEngine; Integration after both engines.

---

## Promotion criteria (what “ready to move on” means)

For **each directory**:

* ✅ Unit tests green (≥ X% coverage per directory; start at 80% for small modules).
* ✅ Contract tests green (schemas + behavioral invariants).
* ✅ Goldens updated intentionally (PR must include a reason).
* ✅ Perf budgets met (where applicable).
* ✅ No TODOs in public APIs; breaking changes require contract bump.

---

## Notes on determinism & parity

* Always convert **beats → absolute seconds** in the scheduler using **TempoMap** (including ramps/swing) before calling either engine.
* For ToneEngine parity, either:

  * Export via a **parallel WAEngine graph** for offline (recommended), or
  * Record Tone’s output into an offline buffer and compare with epsilon tolerance (slightly looser).

---

## “Map” of the whole (at a glance)

```
Platform ─┬─ PRNG
          ├─ WorkerScheduler  ──▶ Time.Scheduler ──▶ Engine.schedule()
          └─ WorkletLoader

Time ──▶ TransportClock + TempoMap + Quantize
                         ▲
Model ── Song ─ Tracks ─┘ (getEventsInRange in beats)

Web3 ──▶ InscriptionResolver ─▶ Assets (Sample/Preset/Serializer)

Engine Interface ─┬─ WAEngine ──▶ GraphRouter ─▶ FX ─▶ Master
                  └─ ToneEngine ─┘

Integration ──▶ ProjectPlayer / render-offline

UI Adapters ──▶ ArrangeVM / StepSeqVM (no audio)
```

---
