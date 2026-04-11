# Repository Guidelines

## Project Structure & Module Organization

- `index.html`: Single-page app shell and UI markup.
- `js/script.js`: Main application logic (state, OPFS storage, model loading, audio generation, export).
- `js/vendor/`: Bundled third‑party assets (notably `ffmpeg-core.wasm` and related loaders).
- `css/style.css`: Global styling and theme variables.
- `server_local.js`: Minimal Node HTTP server that sets COOP/COEP headers required for `SharedArrayBuffer` (FFmpeg.wasm).
- `V11-future-Development-DOCS/`: Design/implementation notes (reference docs).
- `local-tts-engines/`: Optional, separate local TTS experiments/tools (Python-based; see per-folder READMEs).

## Build, Test, and Development Commands

- `node server_local.js`: Serve the app at `http://localhost:8080` with the required COOP/COEP headers.
  - Avoid `python -m http.server` unless you also add equivalent headers; FFmpeg.wasm will fail without them.
- No bundler/build step is currently used; changes are reflected on refresh.

## Coding Style & Naming Conventions

- Indentation: 4 spaces; keep existing style consistent within a file.
- JavaScript: prefer `const`/`let`, semicolons, and object-literal modules (e.g., `Models`, `AudioEngine`).
- Naming: UI IDs follow `btn-*`, `tab-*`, `status-*`, `progress-*`; keep new IDs consistent with these patterns.
- Vendor files: treat `js/vendor/*` as third‑party; avoid editing unless upgrading intentionally.

## Testing Guidelines

- No automated test suite is present.
- Manual smoke check:
  - Start `node server_local.js`, load the page, and confirm “Local AI” model loading works.
  - Generate at least one chapter/chunk, play it back, and verify export/merge features still function.

## Commit & Pull Request Guidelines

- Commit history mixes simple imperative messages and Conventional Commits (`feat:`, `fix(scope):`).
- Prefer Conventional Commits for new work, e.g. `feat(v11): improve timeline rendering` or `fix(v11): handle ffmpeg load error`.
- PRs should include: summary, verification steps, and screenshots/GIFs for UI changes; note browser(s) tested.

## Security & Data Notes

- The app uses browser storage (OPFS). Do not commit generated audio/output artifacts.
- Model downloads may occur at runtime (first load); document any changes that affect model sources or caching.

