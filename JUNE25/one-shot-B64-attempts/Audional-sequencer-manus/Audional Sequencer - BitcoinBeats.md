# Audional Sequencer - BitcoinBeats

A modern, professional-grade web audio sequencer built with vanilla JavaScript, featuring 16 channels, 64-step sequencing, sample management, and Bitcoin Ordinals integration.

![Audional Sequencer](https://via.placeholder.com/800x400/1a1a1a/ff6b35?text=Audional+Sequencer)

## 🎵 Features

### Core Sequencing
- **16 Independent Channels** - Each with volume, mute, solo, and pitch controls
- **64-Step Sequencer** - Professional-grade step sequencing with visual feedback
- **64 Sequences** - Create complex arrangements with sequence navigation
- **BPM Control** - Adjustable from 1-420 BPM with real-time changes
- **Continuous Playback** - Seamless sequence chaining for live performance

### Audio Engine
- **Web Audio API** - Professional audio processing with low latency
- **Sample Management** - Upload WAV, MP3, OGG, and other audio formats
- **Bitcoin Ordinals Support** - Load samples directly from Bitcoin Ordinals URLs
- **Audio Effects** - Volume, pitch shifting, reverse playback, and trimming
- **Polyphony** - Multiple simultaneous sample playback per channel

### User Interface
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Multiple Themes** - Dark, Light, Neon, Purple, Blue, Retro, and Minimal themes
- **Keyboard Shortcuts** - Professional workflow with comprehensive shortcuts
- **Tooltips** - Contextual help for all controls
- **Modal System** - Clean, accessible dialogs for settings and controls

### Project Management
- **Save/Load Projects** - JSON and compressed .gz format support
- **Copy/Paste Patterns** - Efficient pattern editing and duplication
- **Preset System** - Save and load drum kits and sample collections
- **Auto-save** - Automatic project backup to prevent data loss
- **Import/Export** - Share projects and collaborate with others

## 🚀 Quick Start

### 1. Setup
```bash
# Clone or download the project
cd audional-sequencer

# Start a local HTTP server (required for ES6 modules)
python3 -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000
```

### 2. Open in Browser
Navigate to `http://localhost:8000` in your web browser.

### 3. First Steps
1. **Click anywhere** to initialize the audio engine (required by browsers)
2. **Load samples** by clicking the file upload button or dragging files
3. **Click step buttons** to create patterns
4. **Press spacebar** to play/pause
5. **Adjust BPM** using the tempo control

## 🎛️ Interface Guide

### Master Controls
- **Play/Pause** - Spacebar or click the play button
- **Stop** - Escape key or click the stop button
- **BPM** - Adjust tempo from 1-420 BPM
- **Master Volume** - Global volume control

### Channel Strip
Each of the 16 channels includes:
- **Channel Number** - Visual identifier
- **Channel Name** - Editable name (click to rename)
- **Mute (M)** - Silence the channel
- **Solo (S)** - Play only this channel
- **Settings (⚙)** - Volume, pitch, and sample controls
- **64 Step Buttons** - Click to toggle steps on/off

### Sequence Navigation
- **Previous/Next** - Navigate between 64 sequences
- **Copy/Paste** - Duplicate patterns between sequences
- **Clear** - Remove all steps from current sequence
- **Continuous** - Enable seamless sequence chaining

### Sample Management
- **File Upload** - Drag and drop or click to upload audio files
- **Bitcoin Ordinals** - Enter Ordinals URLs to load samples
- **Waveform Display** - Visual representation with trim controls
- **Preset System** - Save and load complete drum kits

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Spacebar` | Play/Pause |
| `Escape` | Stop |
| `Ctrl/Cmd + ←` | Previous sequence |
| `Ctrl/Cmd + →` | Next sequence |
| `Ctrl/Cmd + C` | Copy sequence pattern |
| `Ctrl/Cmd + V` | Paste sequence pattern |
| `Ctrl/Cmd + S` | Save project |
| `Ctrl/Cmd + O` | Open project |

## 🎨 Themes

Choose from 7 carefully crafted themes:

- **Dark** - Professional dark interface (default)
- **Light** - Clean light interface
- **Neon** - Cyberpunk-inspired neon colors
- **Purple** - Rich purple gradients
- **Blue** - Cool blue tones
- **Retro** - Vintage-inspired colors
- **Minimal** - Ultra-clean minimal design

## 🔧 Technical Specifications

### Browser Requirements
- **Modern Browser** - Chrome 66+, Firefox 60+, Safari 12+, Edge 79+
- **Web Audio API** - Required for audio processing
- **ES6 Modules** - Required for JavaScript modules
- **Local Server** - Required for development (CORS restrictions)

### Audio Formats Supported
- **WAV** - Uncompressed audio (recommended)
- **MP3** - Compressed audio
- **OGG** - Open source compressed audio
- **M4A** - Apple compressed audio
- **FLAC** - Lossless compressed audio

### Performance
- **Low Latency** - Optimized for real-time performance
- **Memory Efficient** - Smart sample caching and cleanup
- **Responsive** - 60fps UI updates with debounced rendering
- **Scalable** - Handles large sample libraries efficiently

## 📁 Project Structure

```
audional-sequencer/
├── index.html              # Main application entry point
├── css/
│   ├── main.css            # Core styles and layout
│   └── themes.css          # Theme definitions
├── js/
│   ├── app.js              # Application coordinator
│   ├── modules/
│   │   ├── state.js        # State management
│   │   ├── audio-engine.js # Web Audio API engine
│   │   ├── sequencer.js    # Step sequencer logic
│   │   ├── sample-manager.js # Sample loading and management
│   │   ├── ui-manager.js   # User interface management
│   │   └── project-manager.js # Save/load functionality
│   └── utils/
│       ├── helpers.js      # Utility functions
│       └── event-bus.js    # Event system
├── assets/
│   ├── samples/           # Default sample library
│   └── presets/           # Preset configurations
└── docs/
    └── README.md          # This documentation
```

## 🎵 Sample Library

The application supports loading samples from multiple sources:

### File Upload
- Drag and drop audio files onto the interface
- Click the upload button to browse files
- Supports batch upload of multiple files

### Bitcoin Ordinals Integration
- Load samples directly from Bitcoin Ordinals URLs
- Format: `https://ordinals.com/content/[inscription_id]`
- Automatic validation and error handling
- Cached for offline use

### Preset Kits
- Pre-configured drum kits and sample collections
- Easy one-click loading of complete setups
- Community-shareable preset format

## 🔊 Audio Features

### Sample Processing
- **Pitch Shifting** - Real-time pitch adjustment (0.25x to 4x)
- **Reverse Playback** - Automatic reverse buffer generation
- **Trimming** - Precise start and end point control
- **Volume Control** - Per-channel and master volume
- **Polyphony** - Multiple simultaneous sample triggers

### Timing and Sync
- **Lookahead Scheduling** - Precise timing with Web Audio API
- **BPM Sync** - Real-time tempo changes without stopping
- **Step Resolution** - 64 steps per sequence for detailed patterns
- **Swing** - Humanize timing (planned feature)

### Audio Context Management
- **Automatic Initialization** - User interaction triggers audio context
- **State Management** - Proper suspend/resume handling
- **Memory Optimization** - Efficient buffer management
- **Error Recovery** - Graceful handling of audio failures

## 💾 Project Format

Projects are saved in JSON format with optional gzip compression:

```json
{
  "id": "project_unique_id",
  "name": "My Beat",
  "created": "2025-06-04T00:00:00.000Z",
  "modified": "2025-06-04T00:00:00.000Z",
  "version": "1.0.0",
  "metadata": {
    "author": "Producer Name",
    "description": "Project description",
    "tags": ["hip-hop", "trap"],
    "bpm": 120,
    "key": "C",
    "scale": "minor"
  },
  "state": {
    "sequences": [...],
    "currentSequence": 0,
    "bpm": 120,
    "isPlaying": false
  },
  "samples": [...]
}
```

## 🛠️ Development

### Local Development
1. Clone the repository
2. Start a local HTTP server
3. Open in browser and start coding
4. All modules use ES6 imports/exports

### Architecture
- **Modular Design** - Clean separation of concerns
- **Event-Driven** - Decoupled communication via event bus
- **State Management** - Centralized state with observer pattern
- **Performance** - Optimized for real-time audio processing

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🎯 Use Cases

### Music Production
- **Beat Making** - Create drum patterns and rhythms
- **Sampling** - Chop and sequence audio samples
- **Live Performance** - Real-time pattern switching
- **Collaboration** - Share projects and samples

### Education
- **Music Theory** - Learn rhythm and timing
- **Audio Technology** - Understand digital audio concepts
- **Programming** - Study modern web audio development
- **Creative Expression** - Explore electronic music creation

### Professional Applications
- **Prototyping** - Quick beat sketches and ideas
- **Live Sets** - Performance-ready sequencing
- **Sound Design** - Audio manipulation and processing
- **Client Demos** - Shareable project format

## 🔮 Future Enhancements

### Planned Features
- **MIDI Support** - Hardware controller integration
- **Audio Recording** - Record sequences to audio files
- **Effects Chain** - Built-in audio effects and filters
- **Collaboration** - Real-time collaborative editing
- **Cloud Sync** - Online project storage and sharing

### Advanced Features
- **Automation** - Parameter automation over time
- **Swing and Groove** - Humanize timing and feel
- **Song Mode** - Arrange sequences into complete songs
- **Audio Analysis** - Automatic beat detection and slicing
- **AI Integration** - Machine learning-powered features

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Web Audio API** - Modern browser audio processing
- **Bitcoin Ordinals** - Decentralized sample storage
- **Open Source Community** - Inspiration and best practices
- **Electronic Music Producers** - Feature requirements and testing

---

**Built with ❤️ for the electronic music community**

For support, feature requests, or contributions, please visit our GitHub repository or join our community Discord server.

