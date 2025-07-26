# Synth Save-Load Module Documentation

## Overview

The Save-Load module provides comprehensive state management for the Audionauts Web Synthesizer, allowing users to save and restore complete synth configurations including all settings, recorded sequences, and UI state.

## Features

- **Complete State Capture**: Saves all synth parameters, effects settings, recorded sequences, and UI state
- **Human-Readable Format**: Uses JSON format for easy inspection and manual editing
- **Keyboard Shortcuts**: Ctrl+S to save, Ctrl+O to load
- **Error Handling**: Graceful error handling with user feedback
- **Cross-Session Compatibility**: Restore exact synth state in fresh browser sessions
- **File Validation**: Validates loaded files to prevent corruption

## Installation

1. Copy `modules/save-load.js` to your synth's modules directory
2. Use the updated HTML file (`index-with-saveload.html`) or integrate manually
3. Optionally include `save-load-styles.css` for enhanced button styling

### Manual Integration

Add to your HTML file after other module imports:

```javascript
import('./modules/save-load.js').then(({ SaveLoad }) => {
    console.log('[Audionauts] SaveLoad module loaded');
    
    // Initialize in your app init function
    SaveLoad.init();
    
    // Store references for save-load access
    window.Keyboard = Keyboard;
    window.PianoRoll = PianoRoll;
});
```

## Usage

### Saving State

1. **UI Method**: Click the "💾 Save State" button in the transport controls
2. **Keyboard Shortcut**: Press `Ctrl+S` (or `Cmd+S` on Mac)
3. **Programmatic**: Call `SaveLoad.saveState()`

The save operation will:
- Capture all current synth settings
- Export recorded sequence data
- Save UI state (octave, selected notes)
- Generate a timestamped filename
- Trigger automatic download

### Loading State

1. **UI Method**: Click the "📁 Load State" button and select a file
2. **Keyboard Shortcut**: Press `Ctrl+O` (or `Cmd+O` on Mac)
3. **Programmatic**: Call `SaveLoad.loadState(jsonString)`

The load operation will:
- Validate the file format
- Restore all synth parameters
- Load sequence data into the piano roll
- Update UI elements
- Refresh all displays

## File Format

### File Extension
- Primary: `.synthstate` (recommended)
- Alternative: `.json` (also supported)

### File Structure
```json
{
  "version": "1.0",
  "timestamp": "2025-07-26T12:36:00.000Z",
  "synthState": {
    "settings": {
      "oscillator": {
        "waveform": "sine",
        "detune": 0
      },
      "filter": {
        "type": "lowpass",
        "frequency": 5000,
        "resonance": 1
      },
      "effects": {
        "reverb": 30,
        "delay": 20
      },
      "transport": {
        "bpm": 120
      }
    },
    "sequence": [
      {
        "note": "C4",
        "start": 0.123,
        "dur": 0.456,
        "vel": 0.8
      }
    ],
    "ui": {
      "currentOctave": 4,
      "selectedNote": null
    }
  }
}
```

## Settings Captured

### Oscillator Settings
- **Waveform**: sine, square, sawtooth, triangle
- **Detune**: -50 to +50 cents

### Filter Settings
- **Type**: lowpass, highpass, bandpass
- **Frequency**: 20 to 20,000 Hz
- **Resonance (Q)**: 0 to 20

### Effects Settings
- **Reverb**: 0 to 100% wet signal
- **Delay**: 0 to 100% wet signal

### Transport Settings
- **BPM**: 40 to 240 beats per minute

### Sequence Data
- **Notes**: Complete recorded sequences with timing
- **Timing**: Precise start times and durations
- **Velocity**: Note velocity information

### UI State
- **Current Octave**: Keyboard octave setting (0-7)
- **Selected Note**: Piano roll selection state

## API Reference

### SaveLoad.init()
Initializes the save-load module, adds UI elements, and binds event handlers.

### SaveLoad.saveState()
Captures current synth state and triggers file download.

**Returns**: None (triggers download)

### SaveLoad.loadState(jsonString)
Loads synth state from JSON string.

**Parameters**:
- `jsonString` (string): JSON representation of synth state

**Throws**: Error if JSON is invalid or incompatible

### SaveLoad.captureState()
Returns current synth state as JavaScript object.

**Returns**: Object containing complete synth state

### SaveLoad.exportStateJSON()
Returns current synth state as formatted JSON string.

**Returns**: JSON string or null on error

### SaveLoad.importStateJSON(jsonString)
Imports synth state from JSON string.

**Parameters**:
- `jsonString` (string): JSON representation of synth state

**Returns**: Boolean indicating success

## Error Handling

The module includes comprehensive error handling:

### Save Errors
- Missing DOM elements (graceful degradation)
- JSON serialization failures
- File download issues

### Load Errors
- Invalid JSON format
- Missing required fields (default substitution)
- Version incompatibility warnings
- Audio object initialization failures

### User Feedback
- Status messages appear in the transport controls
- Color-coded feedback (green=success, red=error, blue=info)
- Auto-hide after 3 seconds
- Console logging for debugging

## Browser Compatibility

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
- **File API**: Required for save/load functionality
- **ES6 Modules**: Required for module loading
- **Web Audio API**: Required for audio functionality

## Troubleshooting

### Save Issues
- **No download triggered**: Check browser popup blockers
- **Empty file**: Verify synthApp global object exists
- **Missing settings**: Ensure all modules are initialized

### Load Issues
- **File not recognized**: Verify .synthstate or .json extension
- **Settings not applied**: Check console for initialization errors
- **Sequence not loaded**: Verify piano roll module is available

### General Issues
- **Module not found**: Verify file path in import statement
- **UI elements missing**: Ensure transport controls container exists
- **Keyboard shortcuts not working**: Check for conflicting event handlers

## Development Notes

### Dependencies
- Requires `window.synthApp` global object
- Needs access to Tone.js library
- Depends on existing module structure

### Extension Points
- Add custom validation rules in `validateState()`
- Extend file format in `captureState()` and `restoreSettings()`
- Add migration logic for version compatibility

### Testing
- Test with various sequence lengths
- Verify all parameter ranges
- Check error handling with corrupted files
- Test keyboard shortcuts in different contexts

## Version History

### Version 1.0
- Initial release
- Complete state save/load functionality
- UI integration with transport controls
- Keyboard shortcuts support
- Error handling and user feedback

