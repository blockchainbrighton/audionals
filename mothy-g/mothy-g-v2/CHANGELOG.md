# Mothy G - Changelog

## Version 1.0.1 - November 6, 2025

### Fixed
- **Tone.js Import Issue**: Fixed module import structure to properly handle Tone.js exports
  - The Tone.js module from the Bitcoin Ordinals URL exports as `{ default: Tone }`
  - Updated `SynthEngine.js` to correctly access the Tone object from the module
  - Resolved "PolySynth is not a constructor" error
  - All synthesis features now work correctly

### Technical Details
The fix involved updating the import handling in `SynthEngine.js`:

```javascript
// Before (incorrect)
const module = await import(TONE_JS_URL);
this.Tone = module.default || module;

// After (correct)
const module = await import(TONE_JS_URL);
this.Tone = module.default || module.Tone || module;
```

This ensures the Tone.js classes (PolySynth, Synth, Filter, etc.) are properly accessible.

### Verified Working
- ✅ Synthesis engine initializes without errors
- ✅ All 15 presets load correctly
- ✅ Virtual keyboard functions properly
- ✅ Computer keyboard input works
- ✅ Parameter controls update sound in real-time
- ✅ Preset save/load functionality operational
- ✅ External API for programmatic control functional
- ✅ Both standalone and embedded modes work

---

## Version 1.0.0 - November 6, 2025

### Initial Release
- Complete love-inspired synthesizer with Tone.js
- 15 expressive presets across 6 categories
- Virtual keyboard with computer keyboard support
- Comprehensive parameter controls
- Preset management system
- Web Component architecture
- Standalone and embeddable modes
- Full documentation and examples
