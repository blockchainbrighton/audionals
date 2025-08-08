
# Architecture & Data Flow

```mermaid
flowchart LR
  A[sequencer-main] --> B[sequencer-state]
  A --> C[sequencer-ui]
  A --> D[sequencer-audio-time-scheduling]
  D -->|step events| E[sequencer-sampler-playback]
  D -->|note route| F[sequencer-instrument]
  F --> G[synth-logic]
  G --> H[synth-engine]
  H --> I[Tone.js]
  E --> I
```
**Key Paths**
- **Boot:** main → config/state → UI → transport/schedule
- **Playback:** schedule tick → sampler/instrument dispatch
- **Save/Load:** UI → {sequencer-save-load|synth-save-load} → JSON

**Audio Graphs (textual)**
- **Sampler:** Player → Envelope → Channel Gain → Master → Limiter
- **Synth:** Osc/Noise → Filter/FX chain → VCA → Master → Limiter
