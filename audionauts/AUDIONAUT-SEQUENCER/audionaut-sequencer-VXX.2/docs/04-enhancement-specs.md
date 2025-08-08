
# Enhancement Spec — Transport Ownership & Step Dispatch Consolidation

**Current Behavior**
Multiple modules interact with Tone.Transport; step highlighting comes from a window CustomEvent fired by scheduler.

**Limitations**
Risk of double scheduling in future features; scattered BPM set flows.

**Proposed Behavior**
Single Transport controller module; all others subscribe. Centralize BPM/running state; typed event payloads.

**Implementation Notes**
- Modules: sequencer-audio-time-scheduling.js, sequencer-ui.js, sequencer-main.js
- Public API changes: None (internal event bus module exported).
- Persistence changes: None

**Testing Criteria**
- [ ] Unit/logic
- [ ] Timing/audio
- [ ] Save/Load
- [ ] Web3 loading



# Enhancement Spec — Preallocated Sampler Voices per Channel

**Current Behavior**
Temp envelopes/players created per hit; disposed after tail.

**Limitations**
GC churn; occasional click risk if disposal races.

**Proposed Behavior**
Pool N voices per sampler channel; rotate on trigger. Tail-aware voice release.

**Implementation Notes**
- Modules: sequencer-sampler-playback.js, sequencer-state.js
- Public API changes: Optional channel setting: voices=N
- Persistence changes: Add optional per-channel voices

**Testing Criteria**
- [ ] Unit/logic
- [ ] Timing/audio
- [ ] Save/Load
- [ ] Web3 loading



# Enhancement Spec — Step Grid Virtualization

**Current Behavior**
DOM renders full grid; responsive wrapping.

**Limitations**
Large grids cost layout/paint on each tick.

**Proposed Behavior**
Virtual list per row; only visible steps in DOM; canvas-based highlight.

**Implementation Notes**
- Modules: sequencer-ui.js
- Public API changes: None
- Persistence changes: None

**Testing Criteria**
- [ ] Unit/logic
- [ ] Timing/audio
- [ ] Save/Load
- [ ] Web3 loading
