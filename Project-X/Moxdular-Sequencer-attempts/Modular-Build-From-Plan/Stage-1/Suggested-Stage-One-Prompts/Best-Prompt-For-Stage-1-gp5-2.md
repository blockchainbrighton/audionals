

# ✅ Generation Prompt — Segment 1 (Bootstrap → Platform → Time, Mock-First) — **ZIP Deliverable**

You are generating the **first segment** of the Modular Web3 DAW (v2.0). Produce a **complete, runnable repository** with:

* A **minimal but robust test spine** (no external deps needed to run).
* **Mocks** for early integration.
* **Platform Primitives** (PRNG, WorkerScheduler, WorkletLoader, Safe AudioContext, Units).
* **Time System (phase 1)**.
* **Contracts, goldens, artifacts, CI**, and a **machine-readable test report**.
* **All timing in seconds (float64)** unless stated.

At the end, you **must deliver a single ZIP file** containing the full Stage 1 directory, ready to unzip and run tests immediately.

---

## 0) Packaging & Delivery (MANDATORY)

* **ZIP filename**: `modular-web3-daw-stage1.zip`
* **Root directory inside ZIP**: `modular-web3-daw-stage1/` (all files under this single folder)
* **No external runtime dependencies required to execute tests.**

  * Tests must run with plain Node (≥18) via `node ./tests/harness.js`.
  * ESLint and CI are optional to run; they should not block local test execution.
* **Include** a one-file **smoke runner** at the repo root: `run-tests.js` that simply calls the harness (`node ./tests/harness.js --all`) and prints pass/fail + path to artifacts.
* **Integrity**: Provide a **SHA-256** of the ZIP as `SHA256: <hex>` in a text footer (and include `/ARTIFACT_SHA256.txt` inside the ZIP with the same value).
* **If your delivery channel cannot attach binary files**, also include:

  * A **Base64** of the ZIP (line-wrapped at 76 chars) in `modular-web3-daw-stage1.zip.base64.txt`.
  * A **decode script** `decode-zip.sh`:

    ```bash
    #!/usr/bin/env bash
    base64 -d modular-web3-daw-stage1.zip.base64.txt > modular-web3-daw-stage1.zip
    ```
  * Ensure `decode-zip.sh` is executable (`chmod +x` within the archive via proper file mode).

### Post-unzip quickstart (must work immediately)

```bash
unzip modular-web3-daw-stage1.zip
cd modular-web3-daw-stage1
node run-tests.js
# or:
node ./tests/harness.js --all
```

**Expected outputs on success** (must be created by the harness):

* `/artifacts/test-report.json` with `gates.allOk === true`
* `/artifacts/logs/scheduler.metrics.json`
* `/artifacts/logs/time.sync.drift.json`
* `/artifacts/logs/time-model.events.json`
* `/artifacts/SEGMENT_1_OK`

---

## 1) Repository Scaffold (exact paths)

```
modular-web3-daw-stage1/
  package.json
  .eslintrc.json
  .nvmrc
  .gitignore
  run-tests.js
  ARTIFACT_SHA256.txt                  (filled at package time)
  decode-zip.sh                        (executable; see above)
  README.segment-1.md
  .ci/thresholds.json
  .github/workflows/ci.yml

  contracts/platform.json
  contracts/time.json
  contracts/model.events.json          (placeholder minimal schema + version)

  goldens/worklets/noop.processor.js
  goldens/time/tempo-ramp-8bars.events.json
  goldens/model/8bar-song.events.json  (generated if --update-goldens)

  src/platform/audio-context.js
  src/platform/worklet-loader.js
  src/platform/worker-scheduler.js
  src/platform/prng.js
  src/platform/units.js

  src/time/transport-clock.js
  src/time/tempo-map.js
  src/time/quantize.js
  src/time/scheduler.js
  src/time/units.js                    (re-exports platform/units)

  tests/harness.js
  tests/assert.js
  tests/helpers/fake-time.js
  tests/mocks/mock-engine.js
  tests/mocks/mock-resolver.js
  tests/mocks/mock-worker-scheduler.js
  tests/mocks/mock-audio-context.js

  tests/platform.prng.test.js
  tests/platform.worker-scheduler.test.js
  tests/platform.worklet-loader.test.js
  tests/platform.units.test.js

  tests/time.transport-clock.test.js
  tests/time.tempo-map.test.js
  tests/time.quantize.test.js
  tests/time.scheduler.test.js
  tests/contracts/time.sync.contract.test.js

  tests/integration/time-model.test.js

  artifacts/                            (created at test time)
```

> **Note**: Do **not** include `node_modules/` in the ZIP. Tests must run without it.

---

## 2) package.json (scripts + deps)

* Keep runtime deps empty; dev deps optional (eslint).
* Tests and artifacts must be runnable with **plain Node**.

```json
{
  "name": "modular-web3-daw-stage1",
  "private": true,
  "engines": { "node": ">=18" },
  "type": "module",
  "scripts": {
    "test": "node ./tests/harness.js --all",
    "test:unit": "node ./tests/harness.js --filter unit",
    "test:contract": "node ./tests/harness.js --filter contract",
    "test:int": "node ./tests/harness.js --filter integration",
    "perf": "node ./tests/harness.js --perf",
    "lint": "eslint . || true",
    "build": "node -e \"console.log('build stub')\"",
    "golden:update": "node ./tests/harness.js --update-goldens"
  },
  "devDependencies": {
    "eslint": "^9.0.0"
  }
}
```

---

## 3) CI thresholds & workflow

* `.ci/thresholds.json` (unchanged from previous prompt).
* `.github/workflows/ci.yml` must:

  * Checkout → setup Node 18.x → `npm ci || true` (eslint only)
  * Run `node ./tests/harness.js --all`
  * Upload `/artifacts/**` as build artifacts.

---

## 4) Test harness, assertions, report schema

Exactly as previously specified, with these **additions**:

* On success, harness **writes** a plain-text `OK` marker to `/artifacts/SEGMENT_1_OK`.
* Harness **never requires external packages**.
* Harness writes short console summary and absolute path to `/artifacts/test-report.json`.

`/artifacts/test-report.json` schema remains the same; ensure:

* `summary.durationMs` populated.
* `gates` booleans reflect actual gate checks (listed in §8).

---

## 5) Mocks, Platform Primitives, Time System

Implement exactly as previously specified. Keep deterministic, no DOM, no network.

---

## 6) Contracts & Goldens

As previously specified. Support `--update-goldens` to overwrite:

* `goldens/time/tempo-ramp-8bars.events.json`
* `goldens/model/8bar-song.events.json`

---

## 7) Unit, Contract, Integration Tests

As previously specified, with outputs written under `/artifacts/logs/*.json` and any diffs under `/artifacts/failures/*.diff`.

---

## 8) Promotion Gates (programmatically enforced by harness)

All must pass or exit non-zero:

1. **All tests pass** (unit + contract + integration).
2. **Coverage ≥ 60%** (from `.ci/thresholds.json`).
3. **Perf**: runner `< 2000ms` and scheduler `p95 < 3ms`.
4. **Contracts**: drift < 0.0001s; worklet loader hash verified.
5. **Determinism**: `integration/time-model.test.js` event log **deep-equal** to golden (or updated intentionally).
6. **Artifacts present** as listed above.
7. Create `/artifacts/SEGMENT_1_OK` on success.

---

## 9) README for this segment

`README.segment-1.md` must include:

* Scope, file tree, how to run tests, where artifacts are, explanation of gates.
* “**Unzip & run**” quickstart commands.
* Note that no dependencies are required to run tests.
* How to update goldens.

---

## 10) ZIP Creation (performed by you, the generator)

When repository is built:

1. Ensure executable bit on `decode-zip.sh`.
2. Create `modular-web3-daw-stage1.zip` with the **single root** directory `modular-web3-daw-stage1/`.
3. Compute SHA-256 of the ZIP; write hex digest to:

   * Console footer: `SHA256: <hex>`
   * File `ARTIFACT_SHA256.txt` inside the ZIP.

If binaries aren’t attachable, also include:

* `modular-web3-daw-stage1.zip.base64.txt` (Base64 of the ZIP, 76-char wrapped).
* `decode-zip.sh` at repo root as described.

---

