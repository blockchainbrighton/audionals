
# Upgrade Roadmap

**Goals**
- Stability first: eliminate connect/disconnect errors and transport edge cases.
- Performance: pooled nodes, batched param ramps, UI virtualization on large step counts.
- UX: faster save/load, better defaults, responsive modal synth.
- Web3: resilient Ordinals loading, optional mirrors, on-chain patch export path.

**Phases**
- **P1 — Reliability & Safety**
  - Harden Tone boot & context unlock
  - Enforce one Transport owner and one Sequence master
  - Safe dispose for temp nodes; tail-aware cleanup
- **P2 — Performance**
  - Preallocate envelopes/players by channel
  - Batch parameter automation per tick
  - Reduce layout thrash in step grid (virtualize rows)
- **P3 — Features**
  - Multi-pattern per sequence; pattern chaining
  - Microtonal toggle (12/19-TET) in synth host
  - Per-step probability & ratchets (non-breaking defaults)
- **P4 — Web3**
  - On-chain preset JSON schema
  - Mirror registry for Tone.js + samples
  - Content-addressed sample map

**Risks & Dependencies**
- Tone.js version parity across sequencer and synth
- Browser autoplay policies (context unlock)
- Ordinals gateway availability

**Milestones**
- M1: zero console errors during 10-min stress loop
- M2: 20% CPU reduction in heavy project
- M3: Feature toggle set landed with tests
- M4: Web3 fallback passes offline mirror test
