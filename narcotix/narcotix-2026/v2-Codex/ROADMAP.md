# v2-Codex Roadmap

## Vision
Evolve from a strong arcade sandbox into a durable, replayable city-action game with compounding systems, stable performance, and predictable iterative delivery.

## Pillars
1. Driving + combat feel quality
2. Mission depth + escalation variety
3. Stable frame pacing under load
4. Reliable persistence and non-breaking evolution
5. Agent-operable process with minimal user prompting

## Phases

### Phase 1: Stable Core (r1-r3)
- Build canonical continuation protocol
- Add mission loop baseline
- Add persistence baseline
- Add adaptive performance scaling
- Status: **in progress** (started in `R001`)

### Phase 2: Depth Expansion (r4-r8)
- Multi-step mission chains
- Improved police + traffic AI
- Weapon and enemy archetype diversity
- Economy and progression balancing
- Status: pending

### Phase 3: Production Hardening (r9-r12)
- Pooling/culling and perf tooling
- Save schema migration framework
- Regression smoke automation
- Input/accessibility upgrades (desktop + touch)
- Status: pending

## Optimization Streams (Always Active)
- Frame pacing: remove spikes, smooth update/render cadence
- Entity budget: dynamic caps, culling, pooling
- Logic efficiency: reduce expensive loops/collisions
- UX latency: immediate feedback for missions/combat/damage
- Code maintainability: modularity and safer state transitions

## Exit Criteria For "Great Game" Candidate
- Stable play loop at target FPS on mid-range hardware
- Mission system supports meaningful replay variety
- Progression rewards long-session play without grind spikes
- No major regressions over 3 consecutive iterations
- New agents can continue with only `please continue`
