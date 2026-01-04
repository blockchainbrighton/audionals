# cv4.2 Streamlining Plan

## What cv4.2 already does
- Introduces a clearer top-level layout (`docs/`, `scripts/`, `src/`).
- Starts splitting “feature mega-files” by responsibility (Mint: UI + storage extracted).
- Removes “service reads DOM directly” coupling for contract config.
- Improves tx polling reliability (no overlapping `setInterval` fetches).

## Next Refactors (safe, incremental)
1. **Viewer modularization**
   - Split `src/features/viewer/viewerFeature.js` into `fetchInscriptionData`, `gallery`, and `renderers/`.
   - Make “add a new MIME renderer” a single-file change under `renderers/`.
2. **Auth modularization**
   - Split `src/features/auth/authFeature.js` into `authUi`, `authDebug`, and `providerDetection`.
   - Keep redaction in `src/shared/serialization.js`.
3. **Centralize “UI API”**
   - Add a single `src/app/domIds.js` (constants) + `src/app/dom.js` helpers.
   - Keep `index.html` IDs stable; treat them as public API.
4. **Centralize storage keys**
   - Move all `localStorage` keys into `src/app/storageKeys.js`.
   - Keep migrations/back-compat by reading old keys where needed.
5. **Config boundaries**
   - Introduce `src/app/config.js` for network defaults and feature flags.
   - Keep env-like values out of feature code.

## Quality Gates for future work
- Keep `npm run build` green for each refactor.
- Prefer “extract + rewire” over behavior changes.
- Add focused tests when extracting pure logic (parsers, sniffers, Merkle helpers).
