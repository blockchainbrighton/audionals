# Module Structure Plan

## CSS Modules
- `css/main.css` - All styles (~200 lines, under 500 limit)

## JavaScript Modules

### 1. `js/utils.js` (~50 lines)
- Helper functions ($, log, clamp, midiToHz, h)
- Constants (STEPS, BARS, LOOKAHEAD, etc.)
- Default synth parameters

### 2. `js/audio.js` (~150 lines)
- Web Audio Context setup
- Rhodes synth creation
- Audio loading functions (samples and synth modules)
- Audio decoding utilities

### 3. `js/sequencer.js` (~100 lines)
- Transport controls (play, stop, pause)
- Step scheduling and timing
- Playhead management
- BPM handling

### 4. `js/channels.js` (~200 lines)
- Channel creation and management
- Pattern management
- Channel UI building
- Grid rendering functions

### 5. `js/sequences.js` (~80 lines)
- Sequence management
- Sequence switching
- Sequence UI rendering

### 6. `js/ui.js` (~150 lines)
- Event delegation for grid clicks
- Synth parameter UI (buildSynthHead, etc.)
- General UI utilities
- Status updates

### 7. `js/midi-keyboard.js` (~120 lines)
- MIDI input handling
- Virtual keyboard creation
- Note triggering
- Recording functionality

### 8. `js/session.js` (~100 lines)
- Save/load functionality
- JSON serialization
- Drag and drop handling
- Session management

### 9. `js/app.js` (~50 lines)
- Main application initialization
- Module coordination
- Event listener setup
- Boot sequence

Total: ~1000 lines across 9 modules (all under 500 lines each)

