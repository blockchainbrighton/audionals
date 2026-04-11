# Repository Agent Router

Primary active project: `v2-Codex`.

## First-Read Rule
For any request about the game or when the user says `please continue`, read these first:
1. `v2-Codex/AGENTS.md`
2. `v2-Codex/ITERATION_LOG.md`
3. `v2-Codex/NEXT_ACTIONS.md`
4. `v2-Codex/ROADMAP.md`
5. `v2-Codex/METRICS_BASELINE.md`

Then execute the canonical loop defined in `v2-Codex/AGENTS.md`.

## Default Continuation Behavior
If user intent is continuation and no extra constraints are given:
- Choose the top pending item in `v2-Codex/NEXT_ACTIONS.md` by score.
- Deliver one complete iteration.
- Update logs and queue before finishing.
