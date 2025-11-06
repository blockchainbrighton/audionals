# Mothy G - Deployment Guide

## Quick Start

### 1. Standalone Deployment

Simply serve the `mothy-g` directory with any HTTP server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx serve

# Using PHP
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

### 2. Integration into Existing Projects

#### Basic Integration

Copy the entire `mothy-g` directory into your project, then:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <!-- Include the synthesizer -->
  <mothy-g></mothy-g>
  
  <!-- Load the component module -->
  <script type="module" src="./mothy-g/src/MothyG.js"></script>
</body>
</html>
```

#### Programmatic Control

```javascript
// Get reference to the synth
const synth = document.querySelector('mothy-g');

// Wait for user interaction, then start
document.getElementById('startBtn').addEventListener('click', async () => {
  await synth.start();
  console.log('Synth ready!');
});

// Play notes
synth.playNote(60, 0.8);  // C4
synth.playNote(64, 0.7);  // E4
synth.playNote(67, 0.9);  // G4

// Stop notes
synth.stopNote(60);
synth.stopAllNotes();

// Load presets
synth.loadPreset('Eternal Embrace');

// Get all presets
const presets = synth.getPresets();

// Update parameters
synth.updateParam('filterFreq', 1500);
synth.updateParam('reverbMix', 0.4);

// Save custom preset
synth.savePreset('My Sound', 'User');
```

### 3. Integration with Sequencers

Mothy G can be integrated into JavaScript sequencer applications:

```javascript
// Example: Integrate with a step sequencer
class Sequencer {
  constructor() {
    this.synth = document.querySelector('mothy-g');
    this.pattern = [60, 64, 67, 72]; // C, E, G, C
    this.currentStep = 0;
  }
  
  async init() {
    await this.synth.start();
  }
  
  step() {
    const note = this.pattern[this.currentStep];
    this.synth.playNote(note, 0.8, 0.2); // 200ms duration
    this.currentStep = (this.currentStep + 1) % this.pattern.length;
  }
  
  start() {
    this.interval = setInterval(() => this.step(), 250); // 120 BPM
  }
  
  stop() {
    clearInterval(this.interval);
    this.synth.stopAllNotes();
  }
}
```

### 4. MIDI Integration

Connect MIDI devices to Mothy G:

```javascript
// Request MIDI access
const midiAccess = await navigator.requestMIDIAccess();
const synth = document.querySelector('mothy-g');

// Listen to MIDI inputs
for (const input of midiAccess.inputs.values()) {
  input.onmidimessage = (message) => {
    const [status, note, velocity] = message.data;
    
    // Note On (144-159)
    if (status >= 144 && status < 160 && velocity > 0) {
      synth.playNote(note, velocity / 127);
    }
    // Note Off (128-143) or Note On with velocity 0
    else if ((status >= 128 && status < 144) || velocity === 0) {
      synth.stopNote(note);
    }
  };
}
```

## File Structure

```
mothy-g/
├── index.html              # Standalone demo
├── example.html            # Integration example
├── test.html               # Debug/test page
├── README.md               # Main documentation
├── ARCHITECTURE.md         # Technical architecture
├── DEPLOYMENT.md           # This file
├── src/
│   ├── MothyG.js          # Main Web Component
│   ├── SynthEngine.js     # Synthesis engine
│   ├── PresetManager.js   # Preset management
│   ├── UIController.js    # UI controls
│   ├── Keyboard.js        # Virtual keyboard
│   └── presets.js         # Preset definitions
└── assets/
    └── styles.css         # Theme styles
```

## Browser Requirements

- **Chrome/Edge**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Opera**: 74+

Required features:
- Web Audio API
- Web Components (Custom Elements v1)
- ES Modules
- Shadow DOM
- localStorage (for preset persistence)

## Performance Considerations

### Polyphony
- Default: 16 voices
- Can be adjusted in `SynthEngine.js` (line 79)

### Effects
- Reverb and delay can be CPU-intensive
- Reduce `reverbDecay` and `delayFeedback` for better performance
- Disable effects by setting mix parameters to 0

### Mobile Optimization
- Touch events are fully supported
- Virtual keyboard scales responsively
- Consider reducing polyphony on mobile devices

## Customization

### Changing Colors

Edit `assets/styles.css`:

```css
:root {
  --color-rose: #ffb3c6;      /* Primary pink */
  --color-pink: #ff6b9d;      /* Accent pink */
  --color-purple: #c9a4d9;    /* Secondary purple */
  /* ... modify as needed */
}
```

### Adding Presets

Edit `src/presets.js` and add to the `DEFAULT_PRESETS` array:

```javascript
{
  name: 'My Preset',
  category: 'Custom',
  params: {
    osc1Type: 'sawtooth',
    osc1Detune: 0,
    osc1Volume: -3,
    filterType: 'lowpass',
    filterFreq: 2000,
    // ... all other parameters
  }
}
```

### Modifying Synthesis

The synthesis chain in `SynthEngine.js`:

```
Synth → Filter → Chorus → Delay → Reverb → Compressor → Output
```

You can modify this chain in the `createSynthChain()` method.

## Troubleshooting

### Synth doesn't make sound
- Ensure you've clicked the start button (required for Web Audio API)
- Check browser console for errors
- Verify audio isn't muted in browser or OS
- Try a different browser

### UI doesn't appear
- Check browser console for JavaScript errors
- Ensure all files are being served correctly
- Verify the CSS file is loading
- Check that Shadow DOM is supported

### Presets don't save
- Verify localStorage is enabled in browser
- Check browser privacy settings
- Try clearing localStorage and reloading

### Performance issues
- Reduce polyphony in SynthEngine.js
- Lower effect mix levels
- Disable reverb for better performance
- Close other audio-heavy browser tabs

## Production Deployment

### Optimization

1. **Minify JavaScript** (optional):
   ```bash
   # Using terser
   npx terser src/MothyG.js -o src/MothyG.min.js
   ```

2. **Serve with compression**:
   - Enable gzip/brotli on your server
   - Most modern servers do this automatically

3. **CDN Hosting**:
   - Host on Netlify, Vercel, or GitHub Pages
   - Ensure CORS headers are set correctly

### Security

- Tone.js is loaded from a specific URL (Bitcoin Ordinals)
- This ensures version consistency
- The URL is immutable and cannot be changed
- No other external dependencies

### HTTPS Requirement

Modern browsers require HTTPS for:
- Web Audio API (in some contexts)
- MIDI access
- getUserMedia (if adding audio input)

Use HTTPS in production environments.

## License & Attribution

- Mothy G: Provided as-is for creative use
- Tone.js: MIT License
- No external dependencies except Tone.js

## Support

For issues, questions, or contributions:
1. Check the README.md for API documentation
2. Review ARCHITECTURE.md for technical details
3. Examine the example.html for integration patterns
4. Test with test.html for debugging

---

**♥ Enjoy creating beautiful music with Mothy G! ♥**
