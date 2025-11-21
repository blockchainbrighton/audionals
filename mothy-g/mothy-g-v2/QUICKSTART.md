# Mothy G - Quick Start Guide

## Getting Started in 3 Steps

### 1. Extract the Package

```bash
# For .tar.gz
tar -xzf mothy-g-complete.tar.gz

# For .zip
unzip mothy-g-complete.zip
```

### 2. Start a Local Server

```bash
cd mothy-g
python3 -m http.server 8080
```

Or use any other HTTP server:
- Node.js: `npx serve`
- PHP: `php -S localhost:8080`

### 3. Open in Browser

Navigate to `http://localhost:8080` in your web browser.

Click the **"♥ Start Mothy G ♥"** button to initialize the synthesizer.

---

## Using the Synthesizer

### Playing Notes

**Virtual Keyboard**: Click or touch the piano keys

**Computer Keyboard**: Use these keys to play notes:
```
A W S E D F T G Y H U J K O L P ; ' ]
```

### Selecting Presets

Click the **Preset** dropdown to choose from 15 love-themed sounds:
- **Pads**: Eternal Embrace, Whispered Dreams, Heartstrings
- **Leads**: Tender Touch, Passionate Cry, Sweet Serenade
- **Bass**: Warm Embrace, Gentle Pulse
- **Keys**: Love Letter, Moonlit Dance
- **Textures**: Floating Hearts, Velvet Sky
- **Bright**: First Kiss, Butterfly Wings
- **Init**: Pure Love

### Adjusting Sound

**Oscillators**: Control waveform type, detune, and volume for two oscillators

**Filter**: Adjust cutoff frequency, resonance, and envelope amount

**Envelopes**: Shape the amplitude and filter response with ADSR controls

**Effects**: Add reverb, delay, and chorus to taste

### Saving Your Sounds

1. Adjust parameters to create your sound
2. Click **"Save Preset"**
3. Enter a name and category
4. Your preset is saved to browser localStorage

### Importing/Exporting Presets

**Export**: Click **"Export Presets"** to download all presets as JSON

**Import**: Click **"Import Presets"** and select a JSON file to load presets

---

## Embedding in Your Project

### Basic Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App with Mothy G</title>
</head>
<body>
  <h1>My Music App</h1>
  
  <!-- Embed Mothy G -->
  <mothy-g></mothy-g>
  
  <!-- Load the component -->
  <script type="module" src="./mothy-g/src/MothyG.js"></script>
</body>
</html>
```

### Programmatic Control

```javascript
// Get reference to synth
const synth = document.querySelector('mothy-g');

// Initialize (required after user gesture)
await synth.start();

// Play notes (MIDI note number, velocity 0-1, duration in seconds)
synth.playNote(60, 0.8, 0.5);  // Play C4 for 500ms

// Stop notes
synth.stopNote(60);
synth.stopAllNotes();

// Load presets
synth.loadPreset('Eternal Embrace');

// Get all presets
const presets = synth.getPresets();
console.log(presets);

// Update parameters
synth.updateParam('filterFreq', 2000);
synth.updateParam('reverbMix', 0.5);

// Get current parameters
const params = synth.getCurrentParams();
console.log(params);
```

### MIDI Integration Example

```javascript
// Request MIDI access
const midiAccess = await navigator.requestMIDIAccess();
const synth = document.querySelector('mothy-g');

// Initialize synth
await synth.start();

// Connect MIDI inputs
for (const input of midiAccess.inputs.values()) {
  input.onmidimessage = (message) => {
    const [status, note, velocity] = message.data;
    
    // Note On
    if (status >= 144 && status < 160 && velocity > 0) {
      synth.playNote(note, velocity / 127);
    }
    // Note Off
    else if ((status >= 128 && status < 144) || velocity === 0) {
      synth.stopNote(note);
    }
  };
}

console.log('MIDI connected to Mothy G!');
```

---

## Troubleshooting

### No Sound

**Problem**: Synthesizer doesn't make sound

**Solution**: 
1. Ensure you clicked the start button (required by browsers)
2. Check browser audio isn't muted
3. Try a different browser (Chrome/Edge recommended)
4. Check browser console for errors

### UI Not Appearing

**Problem**: Controls and keyboard don't show up

**Solution**:
1. Click the start button to initialize
2. Check browser console for JavaScript errors
3. Ensure files are served via HTTP (not file://)
4. Verify all files are present in the package

### Presets Not Saving

**Problem**: Custom presets don't persist

**Solution**:
1. Check browser localStorage is enabled
2. Verify browser isn't in private/incognito mode
3. Try clearing localStorage and reloading
4. Use export/import as backup

---

## Browser Requirements

Mothy G requires a modern browser with:
- Web Audio API support
- Web Components (Custom Elements)
- ES Modules
- Shadow DOM
- localStorage

**Recommended**: Chrome 88+, Edge 88+, Firefox 85+, Safari 14+

---

## Need Help?

**Documentation**:
- `README.md` - Complete user guide and API reference
- `ARCHITECTURE.md` - Technical architecture details
- `DEPLOYMENT.md` - Advanced integration guide
- `CHANGELOG.md` - Version history and fixes

**Examples**:
- `index.html` - Standalone demo
- `example.html` - Integration example with external controls
- `test.html` - Debug and testing page

---

**♥ Enjoy making beautiful music with Mothy G! ♥**
