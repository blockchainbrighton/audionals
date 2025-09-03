# Refactor Plan (Auto-drafted)

## A. Fix Unresolved Relative Imports


## B. Remove or Wire Up Unused Modules

- `Audio-Gnarls-V13.0/osc-app/osc-app.js` (LOC 541) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `Audio-Gnarls-V13.0/osc-controls.js` (LOC 252) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `Audio-Gnarls-V13.0/scope-canvas.js` (LOC 541) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `Audio-Gnarls-V13.0/seed-synth.js` (LOC 362) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `Audio-Gnarls-V13.0/seq-app.js` (LOC 565) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `Audio-Gnarls-V13.0/tone-loader.js` (LOC 29) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `__MACOSX/Audio-Gnarls-V13.0/._osc-controls.js` (LOC 1) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `__MACOSX/Audio-Gnarls-V13.0/._scope-canvas.js` (LOC 1) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `__MACOSX/Audio-Gnarls-V13.0/._seed-synth.js` (LOC 1) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `__MACOSX/Audio-Gnarls-V13.0/._seq-app.js` (LOC 1) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `__MACOSX/Audio-Gnarls-V13.0/._tone-loader.js` (LOC 1) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `__MACOSX/Audio-Gnarls-V13.0/osc-app/._osc-app.js` (LOC 1) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `__MACOSX/Audio-Gnarls-V13.0/osc-app/._osc-audio.js` (LOC 1) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `__MACOSX/Audio-Gnarls-V13.0/osc-app/._osc-presets.js` (LOC 1) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `__MACOSX/Audio-Gnarls-V13.0/osc-app/._osc-signature-sequencer.js` (LOC 1) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.
- `__MACOSX/Audio-Gnarls-V13.0/osc-app/._osc-utils.js` (LOC 1) — not referenced; options: delete, move to `experimental/`, or export from a barrel and import from entry path.

## C. Unused Exports (module exported API not imported anywhere)

- `Audio-Gnarls-V13.0/osc-app/osc-audio.js` exports: export function Audio — incoming imports: 0 → consider making internal or removing.
- `Audio-Gnarls-V13.0/osc-app/osc-presets.js` exports: export function Presets — incoming imports: 0 → consider making internal or removing.
- `Audio-Gnarls-V13.0/osc-app/osc-signature-sequencer.js` exports: export function SignatureSequencer — incoming imports: 0 → consider making internal or removing.
- `Audio-Gnarls-V13.0/osc-app/osc-utils.js` exports: export function Utils — incoming imports: 0 → consider making internal or removing.
- `Audio-Gnarls-V13.0/seed-synth.js` exports: export {v as SeedSynthElement} — incoming imports: 0 → consider making internal or removing.

## D. Consolidation Candidates by Folder (small, low-coupling files)

- **__MACOSX/Audio-Gnarls-V13.0** — 5/5 small files: __MACOSX/Audio-Gnarls-V13.0/._osc-controls.js, __MACOSX/Audio-Gnarls-V13.0/._scope-canvas.js, __MACOSX/Audio-Gnarls-V13.0/._seed-synth.js, __MACOSX/Audio-Gnarls-V13.0/._seq-app.js, __MACOSX/Audio-Gnarls-V13.0/._tone-loader.js
- **__MACOSX/Audio-Gnarls-V13.0/osc-app** — 5/5 small files: __MACOSX/Audio-Gnarls-V13.0/osc-app/._osc-app.js, __MACOSX/Audio-Gnarls-V13.0/osc-app/._osc-audio.js, __MACOSX/Audio-Gnarls-V13.0/osc-app/._osc-presets.js, __MACOSX/Audio-Gnarls-V13.0/osc-app/._osc-signature-sequencer.js, __MACOSX/Audio-Gnarls-V13.0/osc-app/._osc-utils.js