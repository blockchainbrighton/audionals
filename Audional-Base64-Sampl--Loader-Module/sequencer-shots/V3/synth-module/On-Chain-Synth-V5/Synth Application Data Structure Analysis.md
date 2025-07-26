# Synth Application Data Structure Analysis

## Global State Variables (window.synthApp)

The main application state is stored in `window.synthApp` object with the following properties:

### Core State Variables
- `seq: []` - Array of recorded note events (sequence data)
- `curOct: 4` - Current octave setting (0-7)
- `activeNotes: new Set()` - Currently playing notes
- `isRec: false` - Recording state flag
- `isArmed: false` - Record armed state flag
- `isPlaying: false` - Playback state flag
- `recStart: 0` - Recording start timestamp
- `events: []` - Array of scheduled Tone.js events
- `selNote: null` - Currently selected note in piano roll

### Audio Objects
- `synth: null` - Tone.js PolySynth instance
- `reverb: null` - Tone.js Reverb effect
- `delay: null` - Tone.js FeedbackDelay effect
- `filter: null` - Tone.js Filter instance

## Synth Settings (Control Panel Parameters)

### Oscillator Settings
- **Waveform**: `string` - Values: 'sine', 'square', 'sawtooth', 'triangle'
  - DOM: `#waveform` select element
  - Default: 'sine'
- **Detune**: `number` - Range: -50 to 50
  - DOM: `#detune` range input
  - Default: 0

### Filter Settings
- **Filter Type**: `string` - Values: 'lowpass', 'highpass', 'bandpass'
  - DOM: `#filterType` select element
  - Default: 'lowpass'
- **Filter Frequency**: `number` - Range: 20 to 20000 Hz
  - DOM: `#filterFreq` range input
  - Default: 5000
- **Filter Resonance (Q)**: `number` - Range: 0 to 20
  - DOM: `#filterQ` range input
  - Default: 1

### Effects Settings
- **Reverb Wet**: `number` - Range: 0 to 100 (percentage)
  - DOM: `#reverb` range input
  - Default: 30
- **Delay Wet**: `number` - Range: 0 to 100 (percentage)
  - DOM: `#delay` range input
  - Default: 20

### Transport Settings
- **BPM**: `number` - Range: 40 to 240
  - DOM: `#bpm` number input
  - Default: 120

## Recording Data Structure

### Sequence Data (`synthApp.seq`)
Array of note event objects with the following structure:
```javascript
{
  note: string,     // Note name (e.g., "C4", "F#3")
  start: number,    // Start time in seconds from recording start
  dur: number,      // Duration in seconds
  vel: number       // Velocity (0.0 to 1.0), typically 0.8
}
```

### MIDI Data Handling
- MIDI input processed through `MidiControl.onMIDI()`
- Note on/off messages converted to note names using `Tone.Frequency(note,'midi').toNote()`
- MIDI notes stored in same format as recorded notes

## Audio Engine Configuration

### Tone.js Audio Chain
```
PolySynth → Filter → Reverb → Destination
                  → Delay → Destination
```

### Default Audio Settings
- **Reverb**: `{ decay: 2, wet: 0.3 }`
- **Delay**: `{ delayTime: 0.25, feedback: 0.3, wet: 0.2 }`
- **Filter**: `{ frequency: 5000, type: "lowpass", Q: 1 }`
- **Synth**: `PolySynth(Tone.Synth)`

## UI State Variables

### Keyboard State
- Current octave: `synthApp.curOct` (0-7)
- Active keys visual state managed by `Keyboard.updateKeyVisual()`

### Transport State
- Record button armed state: CSS class 'armed'
- Status indicators: `#recInd` and `#midiInd` active states
- Button disabled states for play/stop/clear

### Piano Roll State
- Selected note: `synthApp.selNote` (index or null)
- Grid dimensions calculated dynamically
- Note positions based on MIDI values and time

## File Dependencies
- Tone.js library loaded from ordinals URL
- All modules are ES6 modules with import/export
- No external configuration files or presets

