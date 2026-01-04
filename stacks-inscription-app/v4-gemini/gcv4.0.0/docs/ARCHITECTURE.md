# v4-gemini Architecture

## Goals
- Keep behavior identical to `cv4.1`, while making changes safer and easier to review.
- Reduce feature-module size by splitting UI, storage, and chain/contract logic.
- Remove avoidable coupling (especially “service reads DOM directly” patterns).

## Directory Layout

### Root
- `index.html`: Static UI shell. Element IDs are treated as API and must remain stable.
- `public/manifest.json`: Stacks Connect manifest served at `/manifest.json`.
- `contracts/`: Clarity contracts.
- `scripts/`: One-off project scripts (scaffolding, local helpers).
- `docs/`: Non-runtime docs (updates, roadmap, naming).

### `src/`
- `src/main.js`: Entry (boots the app).
- `src/app/`: App composition + cross-cutting adapters (DOM, config).
- `src/stacks/`: Stacks-specific primitives (contract IO, tx polling, read-only retry).
- `src/features/`: Product features; each feature owns its UI + workflows.
- `src/shared/`: Small generic utilities (formatting, serialization, errors, time).
- `src/lib/`: Algorithmic helpers (Merkle, audio engine).

## Feature Conventions
- A feature folder exports a single constructor: `createXFeature(...)`.
- Internals are split by responsibility:
  - `*Ui.js`: DOM reads/writes and rendering.
  - `*Storage.js`: `localStorage` keys and persistence.
  - `*Workflow.js` / `*Pipeline.js`: “do the thing” orchestration (calls services + updates UI).

## Rules of Thumb (to avoid regressions)
- Keep `index.html` element IDs stable.
- Keep Journey Log redaction in `src/shared/serialization.js`.
- Keep Stacks Connect manifest reachable at `/manifest.json`.
- Prefer dependency injection for DOM-dependent inputs (e.g., contract ID getter).
