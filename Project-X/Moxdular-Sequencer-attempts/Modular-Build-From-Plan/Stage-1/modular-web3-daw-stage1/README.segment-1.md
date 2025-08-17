# Modular Web3 DAW - Segment 1: Bootstrap, Platform, Time

This repository contains the first segment of the Modular Web3 DAW (v2.0), focusing on foundational elements: a robust test spine, mocks for early integration, platform primitives (PRNG, WorkerScheduler, WorkletLoader, Safe AudioContext, Units), and the initial phase of the Time System. It is designed to be a complete, runnable repository with no external dependencies required to execute tests.

## File Tree

```
modular-web3-daw-stage1/
  package.json
  .eslintrc.json
  .nvmrc
  .gitignore
  run-tests.js
  ARTIFACT_SHA256.txt
  decode-zip.sh
  README.segment-1.md
  .ci/thresholds.json
  .github/workflows/ci.yml

  contracts/
    platform.json
    time.json
    model.events.json

  goldens/
    worklets/noop.processor.js
    time/tempo-ramp-8bars.events.json
    model/8bar-song.events.json

  src/
    platform/
      audio-context.js
      worklet-loader.js
      worker-scheduler.js
      prng.js
      units.js
    time/
      transport-clock.js
      tempo-map.js
      quantize.js
      scheduler.js
      units.js

  tests/
    harness.js
    assert.js
    helpers/fake-time.js
    mocks/
      mock-engine.js
      mock-resolver.js
      mock-worker-scheduler.js
      mock-audio-context.js
    platform.prng.test.js
    platform.worker-scheduler.test.js
    platform.worklet-loader.test.js
    platform.units.test.js
    time.transport-clock.test.js
    time.tempo-map.test.js
    time.quantize.test.js
    time.scheduler.test.js
    contracts/time.sync.contract.test.js
    integration/time-model.test.js

  artifacts/                            (created at test time)
```

## How to Run Tests

No external runtime dependencies are required to execute tests. Tests must run with plain Node (≥18).

### Unzip & Run Quickstart

```bash
unzip modular-web3-daw-stage1.zip
cd modular-web3-daw-stage1
node run-tests.js
# or:
node ./tests/harness.js --all
```

### Test Commands

*   `npm test` or `node ./tests/harness.js --all`: Runs all unit, contract, and integration tests.
*   `npm run test:unit` or `node ./tests/harness.js --filter unit`: Runs only unit tests.
*   `npm run test:contract` or `node ./tests/harness.js --filter contract`: Runs only contract tests.
*   `npm run test:int` or `node ./tests/harness.js --filter integration`: Runs only integration tests.
*   `npm run perf` or `node ./tests/harness.js --perf`: Runs tests in performance mode.

## Artifacts

Upon successful test execution, the following artifacts will be generated in the `artifacts/` directory:

*   `/artifacts/test-report.json`: A machine-readable test report with `gates.allOk === true` on success.
*   `/artifacts/logs/scheduler.metrics.json`
*   `/artifacts/logs/time.sync.drift.json`
*   `/artifacts/logs/time-model.events.json`
*   `/artifacts/SEGMENT_1_OK`: A plain-text marker indicating successful completion of Segment 1.

## Promotion Gates

The test harness programmatically enforces the following promotion gates. All must pass for a successful build:

1.  **All tests pass**: All unit, contract, and integration tests must pass.
2.  **Coverage ≥ 60%**: Code coverage must meet or exceed 60% (threshold defined in `.ci/thresholds.json`).
3.  **Perf**: The test runner must complete in less than 2000ms, and scheduler p95 latency must be less than 3ms.
4.  **Contracts**: Time synchronization drift must be less than 0.0001s; worklet loader hash must be verified.
5.  **Determinism**: The `integration/time-model.test.js` event log must be deep-equal to its golden file (or intentionally updated).
6.  **Artifacts present**: All required artifacts (listed above) must be generated.
7.  **SEGMENT_1_OK created**: The `/artifacts/SEGMENT_1_OK` file must be created on success.

## Updating Goldens

To update the golden files (e.g., `goldens/time/tempo-ramp-8bars.events.json` and `goldens/model/8bar-song.events.json`), run:

```bash
npm run golden:update
# or:
node ./tests/harness.js --update-goldens
```

This will overwrite the golden files with the current output of the relevant tests. Use this command when intentional changes to the expected output are made.

