# Multi-Sequence Implementation Guide

## Overview

This implementation adds multi-sequence support to the Audional Sequencer while maintaining full backward compatibility with existing single-sequence projects. Users can now create, manage, and switch between multiple sequences (songs/patterns) within a single project.

## Key Features

- **Multiple Sequences**: Support for up to 8 sequences per project
- **Sequence Navigation**: Previous/Next buttons and clickable tabs
- **Sequence Management**: Add, duplicate, rename, and remove sequences
- **Enhanced Save/Load**: Support for both multi-sequence and single-sequence files
- **Keyboard Shortcuts**: Ctrl+Left/Right for navigation, Ctrl+N for new sequence
- **Backward Compatibility**: Existing JSON files load seamlessly

## New Files Added

### Core Modules
1. **`js/sequenceManager.js`** - Core multi-sequence state management
2. **`js/sequenceUI.js`** - Sequence navigation UI components
3. **`js/multiSequenceSaveLoad.js`** - Enhanced save/load functionality

### Styling
4. **`css/11_sequence-navigation.css`** - Styles for sequence navigation UI

### Integration Files
5. **`js/app_multisequence.js`** - Updated main application file
6. **`index_multisequence.html`** - Updated HTML with multi-sequence support

## Installation Instructions

### Option 1: Drop-in Replacement (Recommended)
1. **Backup your current files**
2. **Replace existing files:**
   - Replace `js/app.js` with `js/app_multisequence.js`
   - Replace `index.html` with `index_multisequence.html`
3. **Add new files:**
   - Copy `js/sequenceManager.js` to your js folder
   - Copy `js/sequenceUI.js` to your js folder
   - Copy `js/multiSequenceSaveLoad.js` to your js folder
   - Copy `css/11_sequence-navigation.css` to your css folder

### Option 2: Side-by-side Installation
1. **Keep original files intact**
2. **Add all new files as listed above**
3. **Use `index_multisequence.html` as entry point**

## File Structure After Installation

```
asx/
├── index.html (original)
├── index_multisequence.html (new)
├── css/
│   ├── 01_variables.css
│   ├── ... (existing files)
│   ├── 10_buttons.css
│   └── 11_sequence-navigation.css (new)
├── js/
│   ├── app.js (original)
│   ├── app_multisequence.js (new)
│   ├── sequenceManager.js (new)
│   ├── sequenceUI.js (new)
│   ├── multiSequenceSaveLoad.js (new)
│   └── ... (existing files)
└── ... (other existing files)
```

## Usage Guide

### Basic Operations

#### Creating New Sequences
- Click the **"+"** button in the sequence navigation bar
- Choose to create a blank sequence or copy the current one
- Name your sequence in the dialog

#### Switching Between Sequences
- Click on sequence tabs in the navigation bar
- Use **Previous (◀)** and **Next (▶)** buttons
- Keyboard shortcuts: **Ctrl+Left Arrow** / **Ctrl+Right Arrow**

#### Managing Sequences
- **Rename**: Double-click on a sequence tab
- **Duplicate**: Click the **"⧉"** button
- **Remove**: Click the **"×"** button (requires confirmation)

#### Saving Projects
- **Save Button**: Opens a dialog to choose between:
  - Multi-sequence project (saves all sequences)
  - Single sequence (saves current sequence only)
- **File Format**: Multi-sequence files have `_multi.json` suffix

#### Loading Projects
- **Auto-detection**: System automatically detects file type
- **Single-sequence files**: Converted to multi-sequence format
- **Multi-sequence files**: All sequences loaded with navigation

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Left Arrow` | Previous sequence |
| `Ctrl + Right Arrow` | Next sequence |
| `Ctrl + N` | New sequence |
| `Ctrl + D` | Duplicate current sequence |

### File Formats

#### Multi-Sequence Format
```json
{
  "version": "1.0",
  "type": "multi-sequence",
  "sequences": [
    {
      "id": "seq_123456789_abc123def",
      "name": "Sequence 1",
      "created": 1640995200000,
      "modified": 1640995200000,
      "data": {
        "projectName": "Sequence 1",
        "bpm": 120,
        "channels": [...],
        "playing": false,
        "currentStep": 0
      }
    }
  ],
  "currentSequenceIndex": 0,
  "maxSequences": 8
}
```

#### Single-Sequence Format (Backward Compatible)
```json
{
  "projectName": "My Song",
  "bpm": 120,
  "channels": [...],
  "playing": false,
  "currentStep": 0
}
```

## Technical Details

### Architecture

The multi-sequence system is built as a layer above the existing state management:

```
┌─────────────────────────┐
│    SequenceUI.js       │ ← User Interface
├─────────────────────────┤
│  SequenceManager.js    │ ← Multi-sequence Logic
├─────────────────────────┤
│     State.js           │ ← Original State System
├─────────────────────────┤
│   Audio Engine, etc.   │ ← Existing Components
└─────────────────────────┘
```

### Key Design Principles

1. **Backward Compatibility**: All existing functionality preserved
2. **Modular Design**: New features in separate modules
3. **Minimal Changes**: Existing code largely untouched
4. **Progressive Enhancement**: Works with or without multi-sequence features

### State Management

- **Current State**: Managed by existing `State.js`
- **Sequence Collection**: Managed by `SequenceManager.js`
- **UI Synchronization**: Handled by `SequenceUI.js`
- **Persistence**: Extended by `MultiSequenceSaveLoad.js`

## Troubleshooting

### Common Issues

1. **Sequences not switching**: Check browser console for JavaScript errors
2. **Save dialog not appearing**: Ensure all new modules are loaded
3. **Styling issues**: Verify `11_sequence-navigation.css` is included
4. **Keyboard shortcuts not working**: Check for input focus conflicts

### Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile**: Responsive design included

### Performance Considerations

- **Memory Usage**: Each sequence stores its own state
- **Recommended Limit**: 8 sequences (configurable)
- **Large Projects**: Consider sequence count vs. complexity

## Migration from Single-Sequence

Existing projects automatically convert when loaded:

1. **Single sequence** → **First sequence in multi-sequence project**
2. **All settings preserved**
3. **No data loss**
4. **Can save back to single-sequence format**

## Customization

### Sequence Limits
Modify `maxSequences` in `sequenceManager.js`:
```javascript
let maxSequences = 8; // Change this value
```

### UI Styling
Customize appearance in `css/11_sequence-navigation.css`:
- Colors via CSS variables
- Layout adjustments
- Mobile responsiveness

### Keyboard Shortcuts
Modify shortcuts in `sequenceUI.js` `handleKeyboardShortcuts` function.

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all files are properly loaded
3. Test with a simple project first
4. Ensure backward compatibility with existing projects

## Future Enhancements

Potential additions:
- Sequence templates
- Sequence import/export
- Sequence copying between projects
- MIDI export per sequence
- Sequence-specific BPM settings

