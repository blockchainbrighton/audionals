# BVST Generator 7.5.1 – Actionable Review + Patch Plan

This document converts the architectural review into a prioritized, buildable checklist and introduces a first-cut **BVST Patch v1** format to make future plugin inscriptions much smaller.

## Priority 0 (must fix before scaling)

1. **Stop per-render allocations in the AudioWorklet ↔ WASM bridge**
   - Problem: the current loader allocates + copies arrays each 128-sample render quantum.
   - Fix: allocate scratch buffers once in WASM memory and reuse them; only copy samples in/out.
   - Files: `System/shared/wasm_loader_unified.js`, `System/scripts/processor_glue.js`.

2. **Eliminate listener duplication in the UI controls system**
   - Problem: `Controls.init()`/`attachListeners()` can re-bind handlers when UI is rebuilt.
   - Fix: mark elements as bound and skip re-adding handlers, or switch to event delegation.
   - File: `System/shared/controls.js`.

3. **Remove logging from real-time paths**
   - Problem: console logging during note events or audio processing causes glitches.
   - Fix: gate logs behind a debug flag.
   - Files: `System/scripts/processor_glue.js`, `System/shared/keyboard.js`.

## Priority 1 (future-proofing foundations)

4. **Introduce a declarative patch file format (“BVST Patch v1”)**
   - Goal: new instruments/effects should be creatable by inscribing a small patch file instead of a bespoke `gui.html`.
   - Deliverable: `patch.json` per plugin + a shared runtime that loads and runs it.
   - Files: `System/shared/bvst_patch_v1.schema.json`, `System/shared/patch_runtime.js`, `Plugins/*/*/patch.json`.

5. **Unify parameter semantics**
   - Decide: UI sends normalized values (0..1) and Rust maps curves, or UI sends real values and Rust treats curves as metadata.
   - Document and enforce via descriptors (future step): `get_descriptor()` should describe params, units, curves, and IDs.

## Priority 2 (next-phase: “small inscriptions for new DSP”)

6. **Shared DSP runtime (single inscribed WASM) + patch-driven graphs**
   - Goal: a user inscribes only a patch/delta describing oscillator/filter/envelope wiring; the shared WASM does the heavy lifting.
   - This is a larger effort: needs a stable DSP graph IR, versioning strategy, and backwards compatibility rules.

## Patch format

- JSON Schema: `System/shared/bvst_patch_v1.schema.json`
- Runtime: `System/shared/patch_runtime.js`
- Accepted forms:
  1. Patch document: `{ "schema": "bvst.patch/v1", "config": { ...BVST.init config... } }`
  2. Raw config object (legacy/minimal): `{ ...BVST.init config... }`

