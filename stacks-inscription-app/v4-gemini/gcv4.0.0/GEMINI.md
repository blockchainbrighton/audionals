# GEMINI.md

Context and instructions for Gemini Agents working on `v4-gemini`.

## 1. Project Overview
**Name**: Strata (provisionally, codename: stacks-inscription-app)
**Version**: v4-gemini / gcv4.0.0
**Stack**: Vanilla JS + Vite + Stacks.js
**Core Logic**: Stacks Inscriptions (Chunked data storage on-chain).

## 2. Key Mandates
- **Preserve `index.html` IDs**: These are the public API for the JS features. Do NOT change them without updating all referencing feature modules.
- **Redaction**: Ensure `journeyLog` and auth logging always redact private keys/seeds (see `src/shared/serialization.js`).
- **Manifest**: `public/manifest.json` must be reachable at `/manifest.json` for Stacks Connect.
- **Conventions**:
    - Feature modules (`src/features/`) export a `createXFeature` function.
    - DOM manipulation happens in `*Ui.js` files (where split) or within the feature closure.
    - No hardcoded contract IDs in features (dependency injection via `initApp.js`).

## 3. Directory Structure
- `src/main.js`: Entry point.
- `src/app/`: Application wiring (`initApp.js`) and cross-cutting concerns (`dom.js`, `contractConfig.js`).
- `src/features/`: Functional domains.
    - `auth/`: Wallet connection & diagnostics. (Monolithic `authFeature.js` - Refactor planned).
    - `fees/`: Fee estimation logic.
    - `mint/`: Inscription creation (Split into `Ui`, `Storage`, `State`, `Feature`).
    - `viewer/`: Playback & Gallery. (Monolithic `viewerFeature.js` - Refactor planned).
- `src/lib/`: Heavy logic (Merkle trees, Audio Engine).
- `src/stacks/`: Stacks interaction layer.
- `contracts/`: Clarity smart contracts.
- `docs/`: Documentation (Architecture, Refactor Plans, Updates).

## 4. Workflows
- **Dev**: `npm run dev`
- **Build**: `npm run build`
- **Test**: `npm test` (Currently limited, check `tests/`).

## 5. Current Status & Roadmap
- **Refactor Status**: `mint` feature is modularized. `viewer` and `auth` are next (see `docs/REFACTOR_PLAN.md`).
- **Recent Updates**: Universal file support (MIME sniffing), Resume Mint robustness (see `docs/UPDATES.md`).

## 6. Documentation
- Keep `docs/UPDATES.md` log appended with significant changes.
- Refer to `docs/ARCHITECTURE.md` for deep dives.
