# v2-Codex Metrics Baseline

## Build
- Current build: `v2-Codex.r1`
- Baseline iteration: `R001`
- Baseline date: `2026-02-13`

## Runtime Targets
- Target FPS (desktop): >= 60
- Acceptable floor under heavy action: >= 45
- Autosave interval: 20 seconds
- Desired mission completion rate (future telemetry): 55% to 75%

## Current Known Baseline (Code-Level)
- World grid: 50 x 50
- Tile size: 420
- Base traffic cap: 70
- Base pedestrian cap: 120
- Base police cap: 18
- Adaptive entity scaling: enabled (`0.62` to `1.0`)

## Observability Gaps
- No automated benchmark harness yet
- No persisted mission analytics yet
- No crash/error telemetry yet

## Update Rule
Only change this file when measurable metrics change or new telemetry is added.
