# Mothy G Synthesizer - Architecture

## Overview
Mothy G is a love-inspired, VST-ready JavaScript synthesizer built with Tone.js and Web Components.

## Project Structure
```
mothy-g/
├── index.html              # Standalone demo page
├── src/
│   ├── MothyG.js          # Main Web Component class
│   ├── SynthEngine.js     # Tone.js synthesis engine
│   ├── PresetManager.js   # Preset storage and management
│   ├── UIController.js    # UI state and control logic
│   ├── Keyboard.js        # Virtual keyboard component
│   └── presets.js         # Built-in preset definitions
├── assets/
│   └── styles.css         # Love-inspired theme styles
└── README.md              # Usage documentation

## Component Architecture

### 1. MothyG (Web Component)
- Custom element `<mothy-g>`
- Encapsulates entire synthesizer
- Exposes public API for external integration
- Renders full UI including keyboard and controls

### 2. SynthEngine
- Wraps Tone.js synthesis
- Manages oscillators, filters, envelopes, effects
- Handles note triggering and parameter updates
- Exposes clean interface to UI layer

### 3. PresetManager
- Loads/saves presets to localStorage
- Manages preset bank
- Handles import/export
- Provides preset browsing interface

### 4. UIController
- Connects UI controls to SynthEngine
- Manages control state
- Handles user interactions
- Updates visual feedback

### 5. Keyboard
- Virtual piano keyboard
- Mouse and computer keyboard input
- Visual feedback for active notes
- Velocity sensitivity

## Design Theme: Love & Expression
- **Colors**: Soft pinks, warm roses, gentle purples, cream whites
- **Typography**: Elegant, rounded, friendly
- **Animations**: Smooth, organic, heartbeat-inspired
- **Presets**: Romantic, warm, expressive names and sounds

## Integration Modes

### Standalone
```html
<script type="module" src="./src/MothyG.js"></script>
<mothy-g></mothy-g>
```

### Component Integration
```javascript
import './src/MothyG.js';
const synth = document.createElement('mothy-g');
document.body.appendChild(synth);
// Access API: synth.playNote(60, 0.8);
```

## Tone.js Integration
- Import from: https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0
- Version: 15.0.4
- Dynamic import in SynthEngine module
