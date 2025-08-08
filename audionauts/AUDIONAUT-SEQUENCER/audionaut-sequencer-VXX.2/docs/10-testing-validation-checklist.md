
# Testing & Validation Checklist

**Functional**
- [ ] Transport start/stop/loop works with BPM change
- [ ] Step on/off reflects in audio
- [ ] Sampler channel sample selection persists across save/load
- [ ] Instrument channel opens synth, plays notes, saves state

**Audio**
- [ ] No clicks at default levels
- [ ] Consistent timing over 10 minutes
- [ ] FX tails audible, not cut

**Web3**
- [ ] Tone load from Ordinals URL succeeds; fallback tested
- [ ] All OG sample URLs fetch & decode; checksum verified

**Regression**
- [ ] validate-imports.html passes
- [ ] Console clean (no red errors)
