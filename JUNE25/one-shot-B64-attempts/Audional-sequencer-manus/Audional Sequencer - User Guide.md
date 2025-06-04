# Audional Sequencer - User Guide

## Getting Started

### Initial Setup

1. **Start the Application**
   - Open your web browser
   - Navigate to `http://localhost:8000` (or your server URL)
   - Wait for the application to load

2. **Initialize Audio**
   - Click anywhere on the screen when prompted
   - This activates the Web Audio API (required by browsers)
   - You should see the main sequencer interface appear

3. **Choose Your Theme**
   - Click the theme selector in the top-right corner
   - Choose from Dark, Light, Neon, Purple, Blue, Retro, or Minimal
   - The interface will update immediately

## Creating Your First Beat

### Step 1: Load Samples

**Method 1: File Upload**
1. Click the "Load Sample" button or drag audio files onto the interface
2. Select WAV, MP3, OGG, or other supported audio files
3. Files will be automatically assigned to available channels

**Method 2: Bitcoin Ordinals**
1. Click on a channel's settings button (⚙)
2. Enter a Bitcoin Ordinals URL in the format:
   `https://ordinals.com/content/[inscription_id]`
3. The sample will be loaded and cached automatically

### Step 2: Create Patterns

1. **Select a Channel**
   - Each row represents one of 16 channels
   - Channel 1 is typically used for kick drums
   - Channel 2 for snares, etc.

2. **Add Steps**
   - Click on step buttons to toggle them on/off
   - Active steps are highlighted
   - Steps 1, 5, 9, 13, etc. are marked as beats (stronger visual emphasis)

3. **Basic 4/4 Pattern**
   - Kick drum: Steps 1, 5, 9, 13 (every 4 steps)
   - Snare: Steps 5, 13 (beats 2 and 4)
   - Hi-hat: Steps 1, 3, 5, 7, 9, 11, 13, 15 (every 2 steps)

### Step 3: Playback Control

1. **Start Playing**
   - Press the spacebar or click the Play button
   - The current step will be highlighted as it plays
   - Adjust the BPM using the tempo control

2. **Stop and Pause**
   - Press spacebar again to pause
   - Press Escape to stop completely
   - Stopping returns to the beginning, pausing maintains position

## Advanced Features

### Channel Controls

**Volume and Pitch**
1. Click the settings button (⚙) on any channel
2. Adjust volume slider (0-100%)
3. Adjust pitch slider (0.25x to 4x speed)
4. Changes are applied in real-time

**Mute and Solo**
- **Mute (M)**: Silences the channel while keeping the pattern
- **Solo (S)**: Plays only this channel, muting all others
- Multiple channels can be soloed simultaneously

**Channel Naming**
- Click on the channel name to edit it
- Use descriptive names like "Kick", "Snare", "Hi-Hat"
- Names are saved with your project

### Sequence Management

**Multiple Sequences**
1. Use the Previous/Next buttons to navigate between 64 sequences
2. Each sequence can have completely different patterns
3. Current sequence number is displayed prominently

**Copy and Paste Patterns**
1. Create a pattern you like
2. Press Ctrl+C (or Cmd+C on Mac) to copy
3. Navigate to another sequence
4. Press Ctrl+V (or Cmd+V on Mac) to paste

**Continuous Playback**
- Enable the "Continuous" checkbox
- Sequences will automatically advance when they finish
- Perfect for live performance and long arrangements

### Sample Management

**Trimming Samples**
1. Open channel settings
2. Use the waveform display to set start and end points
3. Drag the handles to trim the sample
4. Changes are applied immediately

**Reverse Playback**
1. In channel settings, enable "Reverse"
2. The sample will play backwards
3. Great for reverse cymbal effects and creative sounds

**Sample Replacement**
1. Click "Load Sample" in channel settings
2. Select a new audio file
3. The new sample replaces the old one
4. All pattern data remains intact

### Project Management

**Saving Projects**
1. Press Ctrl+S or click the Save button
2. Enter a project name
3. Choose JSON or compressed .gz format
4. Project downloads to your computer

**Loading Projects**
1. Press Ctrl+O or click the Load button
2. Select a previously saved project file
3. All sequences, samples, and settings are restored
4. Large projects may take a moment to load

**Auto-save**
- Projects are automatically backed up as you work
- Prevents data loss from browser crashes
- Backup is stored in browser local storage

## Tips and Tricks

### Workflow Optimization

**Keyboard Shortcuts**
- Learn the keyboard shortcuts for faster workflow
- Spacebar for play/pause is the most important
- Use Ctrl+Arrow keys for quick sequence navigation

**Pattern Building**
- Start with a simple kick and snare pattern
- Add hi-hats and percussion gradually
- Use the copy/paste feature to create variations

**Sample Organization**
- Name your channels descriptively
- Group similar sounds (all drums, all synths, etc.)
- Use the preset system to save favorite combinations

### Creative Techniques

**Polyrhythms**
- Use different step patterns on different channels
- Try 3-step patterns against 4-step patterns
- Creates complex, evolving rhythms

**Swing and Groove**
- Slightly offset certain steps for human feel
- Move snares slightly late for laid-back groove
- Experiment with different timing relationships

**Layering**
- Use multiple channels for the same type of sound
- Layer different kick drums for fuller sound
- Combine short and long samples for texture

### Performance Tips

**Live Performance**
- Practice sequence navigation before performing
- Use continuous playback for seamless transitions
- Prepare multiple variations of your main patterns

**Collaboration**
- Save projects in JSON format for easy sharing
- Include sample files when sharing projects
- Use descriptive project and channel names

**Recording Output**
- Use audio recording software to capture your sequences
- Route your browser audio to a DAW for recording
- Consider using virtual audio cables for clean recording

## Troubleshooting

### Common Issues

**No Sound**
1. Check that audio is initialized (click anywhere if needed)
2. Verify master volume is not at zero
3. Check that channels aren't muted
4. Ensure your browser supports Web Audio API

**Samples Won't Load**
1. Check file format is supported (WAV, MP3, OGG, etc.)
2. Verify file isn't corrupted
3. Try a different file to isolate the issue
4. Check browser console for error messages

**Performance Issues**
1. Close other browser tabs to free memory
2. Use smaller sample files when possible
3. Avoid extremely high BPM settings
4. Clear browser cache if problems persist

**Timing Issues**
1. Ensure stable internet connection for sample loading
2. Close other applications that might affect audio
3. Use a dedicated audio interface if available
4. Check that your browser is up to date

### Browser Compatibility

**Recommended Browsers**
- Chrome 66+ (best performance)
- Firefox 60+ (good compatibility)
- Safari 12+ (Mac users)
- Edge 79+ (Windows users)

**Not Supported**
- Internet Explorer (any version)
- Very old mobile browsers
- Browsers with Web Audio API disabled

### Getting Help

**Error Messages**
- Read error messages carefully
- Check the browser console (F12) for detailed errors
- Note what you were doing when the error occurred

**Community Support**
- Join our Discord server for real-time help
- Check GitHub issues for known problems
- Share your project files when asking for help

**Reporting Bugs**
- Include browser version and operating system
- Describe steps to reproduce the issue
- Attach project files if relevant
- Check if the issue occurs in other browsers

## Advanced Configuration

### Audio Settings

**Buffer Size**
- Smaller buffers = lower latency, higher CPU usage
- Larger buffers = higher latency, lower CPU usage
- Default settings work well for most users

**Sample Rate**
- Application uses your system's default sample rate
- 44.1kHz or 48kHz are most common
- Higher rates use more CPU and memory

### Performance Tuning

**Memory Management**
- Large sample libraries use more RAM
- Clear unused samples periodically
- Use compressed audio formats for storage efficiency

**CPU Optimization**
- Lower BPM settings use less CPU
- Fewer simultaneous samples reduce processing load
- Close other applications during intensive use

### Customization

**Theme Creation**
- Themes are defined in CSS
- Create custom themes by modifying theme files
- Share custom themes with the community

**Sample Libraries**
- Organize samples in folders by type
- Use consistent naming conventions
- Create preset files for quick loading

---

This user guide covers the essential features and workflows of the Audional Sequencer. For more advanced topics and the latest updates, check the README file and project documentation.

