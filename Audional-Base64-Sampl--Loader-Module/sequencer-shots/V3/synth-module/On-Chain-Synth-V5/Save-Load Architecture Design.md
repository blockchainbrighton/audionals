# Save-Load Architecture Design

## Overview
The save-load system will capture the complete state of the synth application into a JSON format that can be saved as a text file and later loaded to restore the exact same state.

## JSON Schema Design

```javascript
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

## Save Function Design

### `saveState()` Function
1. **Capture Settings**: Read all control panel values from DOM elements
2. **Capture Sequence**: Copy `synthApp.seq` array
3. **Capture UI State**: Get current octave and selected note
4. **Generate Metadata**: Add version and timestamp
5. **Serialize**: Convert to JSON string
6. **Download**: Trigger file download with .json extension

### Data Collection Strategy
- **Settings**: Read directly from DOM elements to ensure current values
- **Sequence**: Deep copy from `synthApp.seq` to avoid references
- **UI State**: Capture octave and piano roll selection
- **Validation**: Check for required objects before accessing

## Load Function Design

### `loadState(jsonString)` Function
1. **Parse JSON**: Validate and parse the JSON string
2. **Version Check**: Ensure compatibility with current version
3. **Restore Settings**: Update DOM elements and audio objects
4. **Restore Sequence**: Replace `synthApp.seq` with loaded data
5. **Restore UI**: Set octave and redraw interfaces
6. **Refresh Views**: Update piano roll and keyboard displays

### Restoration Strategy
- **Settings**: Update DOM elements and trigger change events
- **Audio Objects**: Reconfigure Tone.js objects with loaded parameters
- **Sequence**: Replace sequence data and refresh piano roll
- **UI State**: Update octave controls and redraw keyboard
- **Error Handling**: Graceful fallback for missing or invalid data

## File Format Specification

### File Extension
- Primary: `.synthstate` (custom extension)
- Alternative: `.json` (standard JSON)

### File Naming Convention
- Format: `synth-state-YYYY-MM-DD-HHMMSS.synthstate`
- Example: `synth-state-2025-07-26-123600.synthstate`

### File Structure
- Human-readable JSON format
- Indented for easy manual editing
- UTF-8 encoding
- Maximum file size: ~1MB (for large sequences)

## Integration Points

### UI Integration
1. **Save Button**: Add to transport controls or main interface
2. **Load Button**: File input element with JSON validation
3. **Status Feedback**: Show save/load success/error messages
4. **Keyboard Shortcuts**: Ctrl+S for save, Ctrl+O for load

### Module Integration
- **Import**: Add to main HTML file after other modules
- **Dependencies**: Requires access to `synthApp` global object
- **Event Handling**: Integrate with existing UI event system
- **Error Reporting**: Use existing status display system

## Error Handling Strategy

### Save Errors
- Missing audio objects (graceful degradation)
- DOM elements not found (skip with warning)
- JSON serialization errors (user notification)
- File download failures (browser compatibility)

### Load Errors
- Invalid JSON format (parse error handling)
- Missing required fields (default value substitution)
- Version incompatibility (migration or warning)
- Audio object initialization failures (retry mechanism)

## Backward Compatibility

### Version Management
- Semantic versioning (major.minor.patch)
- Migration functions for older formats
- Deprecation warnings for outdated features
- Graceful fallback for unknown fields

### Future Extensions
- Plugin settings support
- Custom waveform data
- Extended MIDI mapping
- User preferences and themes

## Performance Considerations

### Save Performance
- Minimal DOM queries (cache selectors)
- Efficient JSON serialization
- Non-blocking file generation
- Progress indication for large sequences

### Load Performance
- Streaming JSON parsing for large files
- Batch DOM updates
- Deferred audio object initialization
- Progressive sequence loading

## Security Considerations

### Input Validation
- JSON schema validation
- Sanitize loaded values
- Prevent code injection
- Limit sequence size and complexity

### File Handling
- Client-side only (no server upload)
- Local file system access only
- No external URL loading
- Safe filename generation

