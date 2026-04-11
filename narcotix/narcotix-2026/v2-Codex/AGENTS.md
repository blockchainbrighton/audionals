# v2-Codex Agent Protocol (Read First)

This file is the mandatory first read for any agent working in `v2-Codex`.

## Mission
Continuously evolve the game in safe, measurable iterations so the user can say only:
`please continue`
and still get meaningful progress every cycle.

## Canonical Loop (Always Follow)
1. **Start**
2. **Select Work**
3. **Implement**
4. **Validate**
5. **Log + Re-queue**
6. **Finish**

Do not skip steps.

## Step 1: Start
Read these files in order:
1. `AGENTS.md`
2. `ITERATION_LOG.md` (latest 3 entries minimum)
3. `NEXT_ACTIONS.md`
4. `ROADMAP.md`
5. `METRICS_BASELINE.md`

Then restate internally:
- Current build status
- Highest-priority pending task
- Risks to avoid this iteration

## Step 2: Select Work
Pick exactly one primary item from `NEXT_ACTIONS.md` using this priority formula:

`Priority Score = (Impact * 4) + (PlayerValue * 3) + (Stability * 2) - (Effort * 2) - (Risk * 3)`

Rules:
- If user gives no details, pick the top scoring `pending` item.
- If there is a tie, pick the lower-effort option.
- If all high-score items are blocked, pick the best unblocked item and log blocker.

## Step 3: Implement
Each iteration must include:
- 1 gameplay/system enhancement
- 1 optimisation or reliability improvement

Hard constraints:
- Keep the game playable at all times.
- Do not remove existing controls without replacement.
- Prefer incremental edits over full rewrites.
- Preserve save compatibility when possible.

## Step 4: Validate
Minimum checks before finishing:
1. Verify code is syntactically valid.
2. Smoke-check core loop assumptions:
   - Player movement works
   - Vehicle enter/exit works
   - Combat still functions
   - Mission flow still starts and resolves
   - HUD still updates
3. Confirm no newly introduced blocking bug is obvious from code path review.

If a check cannot be run, state that clearly in the log and final message.

## Step 5: Log + Re-queue
After implementation, always update:
- `ITERATION_LOG.md` (append new entry)
- `NEXT_ACTIONS.md` (mark completed + add new follow-up tasks)
- `ROADMAP.md` (adjust progress notes if affected)
- `METRICS_BASELINE.md` (only if metrics changed)

Required iteration log fields:
- Iteration ID
- Date
- Objective
- Changes made
- Validation performed
- Performance/quality impact
- Regressions/risks
- Next best actions

## Step 6: Finish
Final response must include:
1. What changed
2. Files touched
3. Validation status
4. What is queued next (top 3)

## Definition Of Done Per Iteration
An iteration is done only when:
- Code changes are complete
- Validation is done (or explicitly marked blocked)
- Logs/roadmap/action queue are updated
- Next iteration path is clear

## "Please Continue" Contract
If the user says `please continue`, agents must:
1. Execute the Canonical Loop from this file.
2. Choose next work from `NEXT_ACTIONS.md` automatically.
3. Deliver a completed logged iteration without asking for clarification unless blocked.

## Quality Bar
Prioritize in this order:
1. Prevent regressions
2. Improve feel/playability
3. Improve performance stability
4. Expand depth (missions/progression/AI)
5. Improve maintainability/documentation

## Blocker Protocol
If blocked, do not stall. Do this:
1. Implement highest-value unblocked alternative.
2. Log blocker in `ITERATION_LOG.md`.
3. Add unblock task to `NEXT_ACTIONS.md` with high priority.

## Out-of-Scope Actions
Do not do these unless explicitly requested:
- Breaking save formats without migration
- Destructive repo cleanup
- Replacing engine architecture in one jump

## Naming + Versioning
- Build tag format: `v2-Codex.rX`
- Iteration ID format: `R###`
- Keep changes additive and traceable.
