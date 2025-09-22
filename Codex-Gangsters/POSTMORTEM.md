# Postmortem

## Wins
- **Data-first architecture**: Vehicles, weapons, peds, missions, and spawn rules all live in JSON, keeping content iteration fast and letting debug tools feed directly into runtime.
- **Performance scaffolding**: Entity pooling, chunk streaming, and lightweight AI loops keep the scene responsive even with elevated densities.
- **Debug UX**: In-engine waypoint editor and spawn painter dramatically cut iteration time and match the documented workflows.
- **Testable subsystems**: Extracting deterministic helpers (vehicle physics, mission FSM, wanted decay) enabled Vitest coverage without relying on a DOM/Phaser runtime.

## Challenges
- Phaser's DOM assumptions surfaced in tests; solved by swapping in a custom event emitter and removing runtime Phaser dependencies from logic modules.
- Striking a balance between depth and scope for missions and economy—current content is intentionally archetypal but ready for expansion.
- Procedural placeholder art/audio were essential for IP-safety yet required tooling (Node/Python scripts) to guarantee reproducibility.

## Next Steps
1. **Streaming polish**: Derive chunk loads from actual player velocity, prefetch next-in-direction chunks, and persist mission-critical actors across unloads.
2. **AI richness**: Layer behavioural variation (loiter, converse, idle groups) and integrate waypoint graph decisions for traffic beyond simple loops.
3. **Mission depth**: Add multi-path objectives, branching rewards/penalties, and integrate shops/respray costs with mission payouts.
4. **UX polish**: Extend pause settings (audio sliders, key rebinding), add mini-map GPS routing via A* on lane graph, and surface weapon/ammo inventory explicitly in UI.
