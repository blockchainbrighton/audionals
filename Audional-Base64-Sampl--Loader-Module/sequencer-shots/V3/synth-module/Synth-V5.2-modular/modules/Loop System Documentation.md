# Loop System Documentation

## Overview

The Synth-V5-modular synthesizer has been enhanced with a comprehensive looped playback system that provides intuitive and robust controls for setting any recorded array into looped playback. The system includes advanced features like quantization and tempo conversion, making it easy to transform any recording into perfectly timed loops at any desired tempo.

## Key Features

### Core Loop Functionality
- **Seamless Looping**: Smooth transitions between loop iterations with no gaps or clicks
- **Auto-Detection**: Automatically detects optimal loop boundaries from recorded sequences
- **Manual Control**: Set custom loop start and end points with precision
- **Flexible Loop Counts**: Choose from 1 loop to infinite looping

### Quantization Engine
- **Grid-Based Quantization**: Snap notes to musical grid positions for perfect timing
- **Multiple Grid Options**: Support for whole notes, half notes, quarter notes, eighth notes, sixteenth notes, and thirty-second notes
- **Swing Support**: Add musical swing/groove to quantized sequences
- **Smart Duration Handling**: Intelligently quantizes both note start times and durations

### Tempo Conversion
- **Real-Time Tempo Scaling**: Convert any loop to match any target BPM
- **Pitch Preservation**: Maintains original pitch while changing tempo
- **Accurate Timing**: Mathematically precise tempo conversion with no timing drift
- **Wide BPM Range**: Support for tempos from 60 to 200+ BPM

## Architecture

The loop system consists of four main components:

1. **LoopManager** (`modules/loop.js`): Core loop logic and state management
2. **LoopUI** (`modules/loop-ui.js`): User interface controls and interactions
3. **Recorder Integration**: Enhanced recorder with loop-aware playback
4. **Transport Integration**: Loop controls integrated with transport system




## User Interface

### Loop Control Panel

The loop control panel is located between the transport controls and the keyboard. It provides comprehensive controls for all loop functionality:

#### Basic Loop Controls

**Enable Loop Toggle**
- Checkbox to enable/disable loop mode
- When enabled, playback will use looped playback instead of single playthrough
- Status indicator shows current loop state (Disabled/Ready/Active)

**Loop Boundaries**
- **Start (s)**: Set the loop start time in seconds
- **End (s)**: Set the loop end time in seconds  
- **Auto-Detect Button**: Automatically calculates optimal loop boundaries from the recorded sequence

**Loop Settings**
- **Max Loops**: Choose maximum number of loop iterations
  - Options: Infinite, 1, 2, 4, 8, 16
  - Infinite loops continue until manually stopped

#### Quantization Controls

**Enable Quantization**
- Checkbox to enable/disable quantization
- When enabled, all notes are snapped to the selected grid

**Quantization Grid**
- **Whole Note**: 4 beats (very loose quantization)
- **Half Note**: 2 beats  
- **Quarter Note**: 1 beat (standard quantization)
- **Eighth Note**: 1/2 beat (tight quantization)
- **Sixteenth Note**: 1/4 beat (very tight quantization)
- **Thirty-second Note**: 1/8 beat (extremely tight quantization)

**Swing Control**
- Slider from 0% to 100%
- Adds musical swing/groove to quantized sequences
- 0% = straight timing, higher values = more swing

#### Tempo Conversion Controls

**Original BPM**
- Set the original tempo of the recorded sequence
- Used as the baseline for tempo conversion calculations

**Target BPM** 
- Set the desired playback tempo
- Loop will be stretched or compressed to match this tempo

**Tempo Ratio Display**
- Shows the calculated conversion ratio (e.g., "1.33x")
- Values > 1.0 = faster playback, < 1.0 = slower playback

### Status Indicators

The loop system provides visual feedback through status indicators:

- **Loop: Disabled** (Gray) - Loop mode is turned off
- **Loop: Ready** (Cyan) - Loop mode enabled, ready to play
- **Loop: Active** (Purple, pulsing) - Currently playing a loop



## Usage Examples

### Basic Loop Setup

1. **Record a sequence** using the record button
2. **Enable loop mode** by checking "Enable Loop"
3. **Auto-detect boundaries** by clicking "Auto-Detect" 
4. **Start playback** - the sequence will now loop continuously
5. **Stop when desired** using the stop button

### Quantized Loop Creation

1. Record a sequence with loose timing
2. Enable loop mode
3. **Enable quantization** and select desired grid (e.g., "Quarter Note")
4. Optionally add swing for musical feel
5. Play - notes will be perfectly aligned to the beat

### Tempo Conversion Workflow

1. Record a sequence at any comfortable tempo
2. Set the **Original BPM** to match your recording tempo
3. Set the **Target BPM** to your desired playback tempo
4. Enable loop mode and play - sequence plays at new tempo with original pitch

### Advanced Example: Perfect Dance Loop

1. Record a 4-bar musical phrase
2. Enable quantization with "Sixteenth Note" grid
3. Add 20% swing for groove
4. Set Original BPM to 120, Target BPM to 128
5. Set Max Loops to 8 for a finite loop
6. Result: Perfectly timed, groovy 8-loop sequence at dance tempo

## Programming Guide

### LoopManager API

The `LoopManager` object provides programmatic access to all loop functionality:

#### Basic Loop Control

```javascript
// Enable/disable looping
LoopManager.setLoopEnabled(true);

// Set loop boundaries (in seconds)
LoopManager.setLoopBounds(0.0, 4.0);

// Auto-detect optimal boundaries
const bounds = LoopManager.autoDetectLoopBounds();

// Set maximum loops (-1 for infinite)
LoopManager.setMaxLoops(4);

// Start loop playback
LoopManager.startLoop(synthApp.seq);

// Stop loop playback
LoopManager.stopLoop();

// Check if currently looping
const isLooping = LoopManager.isCurrentlyLooping();
```

#### Quantization Control

```javascript
// Enable quantization with grid size
LoopManager.setQuantization(true, 0.25); // 16th note grid

// Set quantization grid by name
LoopManager.setQuantizationGrid('quarter'); // Quarter note

// Set swing amount (0-1)
LoopManager.setSwing(0.2); // 20% swing

// Quantize a sequence manually
const quantizedSeq = LoopManager.quantizeSequence(originalSeq);
```

#### Tempo Conversion

```javascript
// Set tempo conversion parameters
LoopManager.setTempoConversion(120, 140); // 120 BPM -> 140 BPM

// Convert sequence tempo manually
const convertedSeq = LoopManager.convertSequenceTempo(originalSeq);

// Process sequence with all effects
const processedSeq = LoopManager.processSequence(originalSeq);
```

#### Status and Information

```javascript
// Get comprehensive loop status
const status = LoopManager.getLoopStatus();
console.log(status);
// {
//   enabled: true,
//   active: false, 
//   start: 0.0,
//   end: 4.0,
//   duration: 4.0,
//   iteration: 0,
//   maxLoops: -1
// }

// Get available quantization options
const options = LoopManager.getQuantizationOptions();
```


### Data Structure

The loop system works with the existing sequence format:

```javascript
// Standard sequence format
const sequence = [
    {
        note: "C4",      // Note name (e.g., "C4", "A#3")
        start: 0.0,      // Start time in seconds
        dur: 0.5,        // Duration in seconds  
        vel: 0.8         // Velocity (0.0 - 1.0)
    },
    // ... more notes
];
```

## Technical Details

### Timing Precision

The loop system uses high-precision timing based on Tone.js Transport:

- **Scheduling Accuracy**: Sub-millisecond precision using Web Audio API
- **Loop Boundaries**: Calculated to beat boundaries for seamless loops
- **Quantization**: Mathematical rounding to exact grid positions
- **Tempo Conversion**: Precise ratio-based time scaling

### Performance Optimization

- **Efficient Scheduling**: Only schedules necessary loop iterations
- **Memory Management**: Clears old events when stopping/restarting
- **Smooth Transitions**: No audio dropouts between loop iterations
- **Real-time Processing**: All calculations optimized for real-time use

### Browser Compatibility

The loop system is compatible with all modern browsers that support:
- Web Audio API
- ES6 Modules  
- Tone.js 14.x+

Tested browsers:
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Troubleshooting

### Common Issues

**Loop doesn't start playing**
- Ensure audio context is activated (click anywhere on page first)
- Check that sequence has recorded notes
- Verify loop boundaries are set correctly

**Quantization not working as expected**
- Check that quantization is enabled
- Verify the correct grid size is selected
- Ensure target BPM is set appropriately

**Tempo conversion sounds wrong**
- Verify Original BPM matches your recording tempo
- Check that Target BPM is within reasonable range (60-200)
- Ensure sequence timing is accurate

**Loop boundaries are incorrect**
- Use Auto-Detect to calculate optimal boundaries
- Manually adjust start/end times if needed
- Check that sequence contains notes in the expected time range

### Debug Information

Enable console logging to see detailed loop information:

```javascript
// The system logs detailed information to console
// Look for messages starting with [LoopManager] or [LoopUI]
console.log('Loop system debug info available in browser console');
```

### Performance Tips

1. **Limit Loop Length**: Very long loops (>30 seconds) may impact performance
2. **Reasonable Loop Counts**: Avoid extremely high finite loop counts
3. **Moderate Swing**: High swing values (>50%) may cause timing issues
4. **Stable BPM**: Keep tempo conversions within 0.5x - 2.0x range for best results

## Integration Notes

### Existing Code Compatibility

The loop system is designed to be fully backward compatible:

- **Existing recordings** work without modification
- **Standard playback** continues to work normally
- **Save/Load functionality** preserves loop settings
- **MIDI integration** works with looped playback

### Extension Points

The modular design allows for easy extensions:

- **Custom Quantization Grids**: Add new grid subdivisions
- **Advanced Swing Algorithms**: Implement different swing styles  
- **Loop Effects**: Add per-loop audio processing
- **Visual Feedback**: Enhance UI with waveform displays

## Conclusion

The loop system transforms the Synth-V5-modular into a powerful tool for creating perfectly timed, professional-quality loops. Whether you're creating simple backing tracks or complex rhythmic patterns, the combination of auto-detection, quantization, and tempo conversion provides everything needed for intuitive and efficient loop creation.

The system's robust architecture ensures reliable performance while maintaining the flexibility to handle any musical style or tempo. With both user-friendly controls and comprehensive programming APIs, it serves both casual users and advanced developers.

