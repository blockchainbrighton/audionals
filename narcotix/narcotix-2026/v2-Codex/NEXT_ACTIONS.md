# v2-Codex Next Actions Queue

Scoring formula (from `AGENTS.md`):
`Priority Score = (Impact * 4) + (PlayerValue * 3) + (Stability * 2) - (Effort * 2) - (Risk * 3)`

## Queue
| ID | Task | Track | Impact | PlayerValue | Stability | Effort | Risk | Score | Status |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| A001 | Add mission chain system (multi-step contracts with fail/bonus states) | Gameplay Depth | 5 | 5 | 3 | 3 | 2 | 27 | pending |
| A002 | Add object pooling for bullets/particles to reduce GC spikes | Performance | 5 | 4 | 5 | 3 | 2 | 33 | pending |
| A003 | Improve police/nav behavior with lane-aware steering and avoidance | AI Quality | 4 | 4 | 4 | 4 | 2 | 22 | pending |
| A004 | Add mobile/touch controls overlay and responsive HUD compaction | Accessibility | 4 | 5 | 3 | 3 | 2 | 24 | pending |
| A005 | Add audio system (engine, gun, explosion, UI cues) with mute toggle | Immersion | 3 | 5 | 2 | 3 | 1 | 20 | pending |
| A006 | Add save schema versioning + migration guardrails | Reliability | 3 | 3 | 5 | 2 | 1 | 24 | pending |
| A007 | Add in-game benchmark panel + live perf telemetry graph | Tooling | 4 | 3 | 4 | 3 | 2 | 19 | pending |
| A008 | Balance progression economy (XP/cash curves by level bands) | Progression | 4 | 4 | 3 | 2 | 1 | 25 | pending |
| A009 | Add mission-specific enemy archetypes (sniper, interceptor, heavy) | Combat Depth | 4 | 4 | 3 | 4 | 2 | 20 | pending |
| A010 | Add regression smoke checklist script for deterministic iteration closeout | Process | 3 | 2 | 5 | 2 | 1 | 21 | pending |

## Completed
| ID | Summary | Iteration |
|---|---|---|
| B001 | Created `v2-Codex` baseline build and perpetual continuation protocol docs | R001 |
