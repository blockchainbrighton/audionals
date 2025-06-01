# Music-Synced Image Reveal

A browser-based application that unveils an image through visual effects synchronized to music.

## Features

- 12 different visual effects that respond to music
- Beat-accurate timing with BPM detection
- Customizable parameters (speed, intensity, random seed)
- Fullscreen canvas rendering at 60fps

## Requirements

- Modern browser with Web Audio API and OffscreenCanvas support
- Chrome, Firefox, Edge, or Safari (latest versions)

## Installation & Running

1. Clone or download this repository
2. Serve the files using any local web server:
   - Python 3: `python -m http.server 8000`
   - Node.js: `npx serve`
3. Open `http://localhost:8000` in your browser

## Usage

1. Enter an image URL (must be CORS-enabled or use a local image)
2. Enter an audio URL (must be CORS-enabled or use a local audio file)
3. Adjust BPM, bars, and random seed as needed
4. Click "Start" to begin the visualization
5. Use "Pause" and "Reset" controls as needed

## Keyboard Shortcuts

- Space: Toggle pause/play
- S: Start visualization
- R: Reset visualization

## Security Note

For best security practices, serve this application with a Content-Security-Policy that restricts script sources to only what's necessary.

## License

MIT License - see LICENSE file (if included)