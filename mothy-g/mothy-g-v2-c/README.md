# Mothy G ♥

**A Love-Inspired, VST-Ready JavaScript Synthesizer**

Mothy G is a fully functional, expressive synthesizer built entirely in JavaScript using Tone.js and Web Components. Designed with a romantic, warm aesthetic, it delivers professional sound quality and can run standalone in browsers or be embedded as a component in other JavaScript applications.

---

## Features

### Sound Engine
- **Dual Oscillator Synthesis** with multiple waveforms (sine, triangle, sawtooth, square)
- **Resonant Filter** with envelope modulation (lowpass, highpass, bandpass)
- **Independent ADSR Envelopes** for amplitude and filter
- **Built-in Effects**: Reverb, Delay, Chorus with adjustable parameters
- **16-voice Polyphony** for rich, layered sounds
- **Master Volume Control** with compression

### User Interface
- **Love-Inspired Design** with soft pinks, warm roses, and elegant typography
- **Virtual Keyboard** with 2 octaves (C4-C5)
- **Computer Keyboard Support** for playing notes
- **Real-time Visual Feedback** for active notes
- **Intuitive Controls** with sliders and dropdowns
- **Responsive Layout** that works on desktop and mobile

### Preset Management
- **15 Expressive Presets** across multiple categories:
  - Romantic Pads (Eternal Embrace, Whispered Dreams, Heartstrings)
  - Silky Leads (Tender Touch, Passionate Cry, Sweet Serenade)
  - Gentle Basses (Warm Embrace, Gentle Pulse)
  - Lush Keys (Love Letter, Moonlit Dance)
  - Dreamy Textures (Floating Hearts, Velvet Sky)
  - Bright Sounds (First Kiss, Butterfly Wings)
- **Save/Load Custom Presets** with localStorage persistence
- **Import/Export Presets** as JSON files
- **Preset Browser** organized by category

---

## Quick Start

### Standalone Usage

1. **Open `index.html` in a modern web browser**
   ```bash
   # Using Python's built-in server
   python3 -m http.server 8000
   
   # Or using Node.js
   npx serve
   ```

2. **Navigate to** `http://localhost:8000`

3. **Click "♥ Click to Start ♥"** to initialize the audio context

4. **Play!** Use your mouse, touchscreen, or computer keyboard

### Embedded Component Usage

Include Mothy G in your web application:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App with Mothy G</title>
</head>
<body>
  <!-- Embed the synthesizer -->
  <mothy-g></mothy-g>
  
  <!-- Load the component -->
  <script type="module" src="./src/MothyG.js"></script>
</body>
</html>
```

### Programmatic Control

Access the synthesizer via JavaScript:

```javascript
// Get the component
const synth = document.querySelector('mothy-g');

// Wait for initialization
await synth.start();

// Play notes (MIDI note numbers)
synth.playNote(60, 0.8); // C4 with velocity 0.8
synth.playNote(64, 0.7); // E4
synth.playNote(67, 0.9); // G4

// Stop notes
synth.stopNote(60);
synth.stopAllNotes();

// Load presets
synth.loadPreset('Eternal Embrace');

// Get available presets
const presets = synth.getPresets();
console.log(presets);

// Update parameters
synth.updateParam('filterFreq', 1500);
synth.updateParam('reverbMix', 0.4);

// Save custom preset
synth.savePreset('My Custom Sound', 'User');

// Get current parameters
const params = synth.getCurrentParams();
console.log(params);
```

---

## Keyboard Controls

### Computer Keyboard Mapping

Play notes using your QWERTY keyboard:

```
 W E   T Y U   O P
A S D F G H J K L ; ' ]

Maps to:
C4 C# D D# E F F# G G# A A# B C5 C#5 D5 D#5 E5 F5 F#5
```

### Virtual Keyboard

- **Click** white and black keys to play notes
- **Drag** across keys while holding mouse button
- **Touch** on mobile/tablet devices

---

## Architecture

### Project Structure

```
mothy-g/
├── index.html              # Standalone demo page
├── README.md               # This file
├── ARCHITECTURE.md         # Detailed architecture documentation
├── src/
│   ├── MothyG.js          # Main Web Component
│   ├── SynthEngine.js     # Tone.js synthesis engine
│   ├── PresetManager.js   # Preset storage and management
│   ├── UIController.js    # UI state and control logic
│   ├── Keyboard.js        # Virtual keyboard component
│   └── presets.js         # Built-in preset definitions
└── assets/
    └── styles.css         # Love-inspired theme styles
```

### Technology Stack

- **Tone.js v15.0.4** - Web Audio synthesis framework
- **Web Components** - Custom element API
- **ES Modules** - Modern JavaScript modules
- **Web Audio API** - Native browser audio
- **localStorage** - Preset persistence
- **CSS3** - Love-inspired styling

### External Dependencies

Mothy G uses **only one external dependency**:

- **Tone.js v15.0.4** from: `https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0`

The library is dynamically imported at runtime, ensuring isolation and compatibility.

---

## API Reference

### Public Methods

#### `playNote(note, velocity, duration)`
Play a MIDI note.
- `note` (number): MIDI note number (0-127)
- `velocity` (number): Note velocity (0-1), default 0.8
- `duration` (number): Optional duration in seconds

#### `stopNote(note)`
Stop a playing note.
- `note` (number): MIDI note number

#### `stopAllNotes()`
Stop all currently playing notes.

#### `loadPreset(name)`
Load a preset by name.
- `name` (string): Preset name

#### `getPresets()`
Get all available presets.
- Returns: Array of preset objects

#### `getCurrentParams()`
Get current synthesizer parameters.
- Returns: Object with all parameter values

#### `updateParam(param, value)`
Update a synthesizer parameter.
- `param` (string): Parameter name
- `value` (any): Parameter value

#### `savePreset(name, category)`
Save current settings as a preset.
- `name` (string): Preset name
- `category` (string): Preset category, default 'User'

#### `isInitialized()`
Check if synthesizer is initialized.
- Returns: boolean

#### `getSynthEngine()`
Get the synth engine instance for advanced usage.
- Returns: SynthEngine instance

---

## Parameter Reference

### Oscillator Parameters
- `osc1Type`: Waveform type ('sine', 'triangle', 'sawtooth', 'square')
- `osc1Detune`: Detune in cents (-50 to 50)
- `osc1Volume`: Volume in dB (-40 to 0)

### Filter Parameters
- `filterType`: Filter type ('lowpass', 'highpass', 'bandpass')
- `filterFreq`: Cutoff frequency in Hz (20 to 20000)
- `filterQ`: Resonance (0.1 to 20)
- `filterEnvAmount`: Envelope modulation amount in Hz (0 to 10000)

### Envelope Parameters
- `ampAttack`: Amplitude attack time in seconds (0.001 to 2)
- `ampDecay`: Amplitude decay time in seconds (0.001 to 2)
- `ampSustain`: Amplitude sustain level (0 to 1)
- `ampRelease`: Amplitude release time in seconds (0.001 to 5)
- `filterAttack`: Filter attack time in seconds (0.001 to 2)
- `filterDecay`: Filter decay time in seconds (0.001 to 2)
- `filterSustain`: Filter sustain level (0 to 1)
- `filterRelease`: Filter release time in seconds (0.001 to 5)

### Effect Parameters
- `reverbMix`: Reverb wet/dry mix (0 to 1)
- `reverbDecay`: Reverb decay time in seconds (1 to 10)
- `delayTime`: Delay time in seconds (0.01 to 2)
- `delayFeedback`: Delay feedback amount (0 to 0.9)
- `delayMix`: Delay wet/dry mix (0 to 1)
- `chorusDepth`: Chorus depth (0 to 1)
- `chorusRate`: Chorus rate in Hz (0.1 to 10)
- `chorusMix`: Chorus wet/dry mix (0 to 1)

### Global Parameters
- `masterVolume`: Master volume in dB (-40 to 0)

---

## Browser Compatibility

Mothy G works in all modern browsers that support:
- Web Audio API
- Web Components (Custom Elements v1)
- ES Modules
- Shadow DOM

**Tested browsers:**
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Opera 74+

---

## Design Philosophy

Mothy G embodies a **love-inspired aesthetic** throughout:

### Visual Design
- **Soft, warm color palette**: Pinks, roses, purples, and cream
- **Elegant typography**: Serif titles with clean sans-serif body text
- **Organic animations**: Smooth transitions and heartbeat effects
- **Responsive layout**: Beautiful on all screen sizes

### Sound Design
- **Expressive presets**: Named after romantic concepts and emotions
- **Warm character**: Carefully tuned for emotional, musical sounds
- **Versatile range**: From gentle pads to passionate leads
- **Professional quality**: Studio-ready synthesis and effects

### User Experience
- **Intuitive controls**: Clear labeling and logical grouping
- **Immediate feedback**: Visual and auditory responses
- **Accessible**: Keyboard, mouse, and touch support
- **Forgiving**: Easy to explore and experiment

---

## Development

### Local Development

1. Clone or download the project
2. Serve the directory with any HTTP server
3. Open `index.html` in your browser

### Customization

#### Adding Custom Presets

Edit `src/presets.js` and add to the `DEFAULT_PRESETS` array:

```javascript
{
  name: 'My Preset',
  category: 'Custom',
  params: {
    osc1Type: 'sawtooth',
    filterFreq: 2000,
    // ... all parameters
  }
}
```

#### Styling

Modify `assets/styles.css` to customize the theme. CSS variables are defined in `:root`:

```css
:root {
  --color-rose: #ffb3c6;
  --color-pink: #ff6b9d;
  /* ... more variables */
}
```

#### Extending Functionality

Access the synth engine directly for advanced features:

```javascript
const synth = document.querySelector('mothy-g');
const engine = synth.getSynthEngine();

// Access Tone.js directly
const Tone = engine.Tone;

// Modify the synthesis chain
engine.filter.frequency.value = 1000;
```

---

## License

This project is provided as-is for educational and creative purposes.

**External Dependencies:**
- Tone.js is licensed under the MIT License

---

## Credits

**Created with love by the Mothy G team**

Mothy G uses Tone.js v15.0.4 for Web Audio synthesis.

---

## Support

For questions, issues, or feature requests, please refer to the project documentation or contact the development team.

---

**♥ Made with love for music lovers everywhere ♥**
