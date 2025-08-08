
# Tone.js Integration Plan

**Current**
- Tone loaded via Ordinals URL at runtime
- Transport and Sequence drive scheduling
- Sampler uses Player + AmpEnvelope
- Synth uses varied nodes (Vibrato, Compressor, BitCrusher, Reverb, PingPongDelay)

**Stability Rules**
- Unlock AudioContext with explicit user gesture before creating nodes
- One Transport owner; subscribe others via events
- Never connect to an input index that doesn't exist; prefer `.connect(destination)` without index

**Optimization Ideas**
- Batch parameter ramps per tick (use setValueAtTime & linearRampToValueAtTime)
- Preallocate nodes per channel (voice pool)
- Use offline rendering for heavy preset verification (where feasible)

**Version Strategy**
- Pin to a known-good build hash/inscription
- Add optional mirror list (fallback URLs)
- Provide smoke tests in `validate-imports.html`
