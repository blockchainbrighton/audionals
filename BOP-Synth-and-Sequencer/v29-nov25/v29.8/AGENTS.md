# Agent Runbook

## Commands
- `npm ci` or `npm i`
- `npm run test`
- `npm run changed`
- `npm run cover`

## Conventions
- Default test environment is Node via Vitest; opt into DOM-only flows with `withDom`.
- Use `FakeClock` from `tests/helpers/fake-clock.js` for deterministic timing.
- Prefer strict stubs (`FakeAudioContext`) before introducing heavier polyfills.

## PR Policy
- This track is for test scaffolding only; production source changes require a separate PR with justification.
- Keep the suite fast (<1s) and avoid DOM/audio dependencies unless explicitly guarded.
