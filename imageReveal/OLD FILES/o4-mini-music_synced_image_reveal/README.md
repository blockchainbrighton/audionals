# Music-Synced Image-Reveal

![Build Status](https://github.com/yourusername/yourrepo/actions/workflows/ci.yml/badge.svg)

## Overview

This browser-based application unveils an image through animated visual effects synchronized to the beats of a user-supplied song. The animations are deterministic based on a user-provided seed, and the tempo can be auto-detected or manually overridden.

## Features

- **User Inputs**: 
  - Image URL
  - Song URL
  - Tempo (BPM, auto-detectable)
  - Number of Bars
  - Random Seed

- **Controls**:
  - Start (Space)
  - Pause/Resume (P)
  - Reset (R)
  - Reveal Speed Slider
  - Effect Intensity Slider
  - Real-time Progress Bar

- **Effects** (12 Modular, plugin-ready):
  1. V-Shift
  2. Scanlines
  3. Gaussian Blur
  4. Pixelation
  5. Alpha Fade
  6. Glitch (RGB Shift + Noise)
  7. Color Sweep
  8. Brightness-Based Reveal
  9. Glyph Reveal
  10. Ripple Distortion
  11. Radial Reveal
  12. Ink Diffusion

- **Sync**: Beat timing based on BPM & bars, with seeded PRNG controlling effect order and parameters.
- **Performance**: Runs at 60fps on 1080p canvas using `OffscreenCanvas`.
- **Accessibility**: Keyboard shortcuts, ARIA labels.
- **Security**: URL sanitization; content security policy recommended.

## File Structure

```
/ (project root)
├── index.html
├── styles.css
├── main.js
├── effects/
│   ├── EffectBase.js
│   ├── VShift.js
│   ├── Scanlines.js
│   ├── GaussianBlur.js
│   ├── Pixelation.js
│   ├── AlphaFade.js
│   ├── Glitch.js
│   ├── ColorSweep.js
│   ├── BrightnessReveal.js
│   ├── GlyphReveal.js
│   ├── RippleDistortion.js
│   ├── RadialReveal.js
│   └── InkDiffusion.js
├── tests/
│   ├── prng.test.js
│   ├── scheduler.test.js
│   ├── glyphReveal.test.js
│   ├── radialReveal.test.js
│   └── inkDiffusion.test.js
└── README.md
```

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/yourrepo.git
   cd yourrepo
   ```

2. **Serve locally**:
   Since this is pure HTML/JS/CSS with ES modules, you need a local HTTP server. For example:
   ```bash
   npx http-server . -c-1
   ```
   This will start a server on `http://localhost:8080` by default.

3. **Open in Browser**:
   Navigate to `http://localhost:8080` to use the application.

## Usage

1. Enter a valid **Image URL**.
2. Enter a valid **Song URL** (supported formats: MP3, WAV, etc.).
3. Optionally, click **Detect BPM** to auto-detect tempo, or manually enter a BPM between 30 and 300.
4. Set the **Number of Bars** (default 16).
5. Enter a **Random Seed** (e.g., `12345`) for deterministic effects, or leave blank to use a timestamp-based seed.
6. Adjust **Reveal Speed** and **Effect Intensity** sliders as desired.
7. Press **Start** (or hit `Space`) to begin.
8. Use **Pause/Resume** (or `P`) and **Reset** (or `R`) as needed.
9. Monitor progress via the progress bar.

## Development

- **Add New Effects**:
  1. Create a new file in `effects/` extending `EffectBase`.
  2. Implement `render(ctx, image, progress)`.
  3. Call `window.registerEffect(YourEffectClass)` at the bottom.
  4. No further changes required; it auto-registers.

- **Testing**:
  - Ensure you have Jest installed globally or in your project:
    ```bash
    npm install --save-dev jest
    ```
  - Run tests:
    ```bash
    npx jest
    ```

- **Linting & Formatting**:
  - ESLint and Prettier configurations can be added as desired. This project follows ES2022 standards.

## Security

- **Content Security Policy (CSP)**: It is recommended to serve with a strict CSP header:
  ```
  Content-Security-Policy: default-src 'self'; img-src https:; script-src 'self'
  ```

- **URL Sanitization**: The application sanitizes and validates URLs to ensure only `http`/`https` are allowed.

## Continuous Integration

To add GitHub Actions CI, create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
```

Add the badge to this README (replace with your repo’s information):

```markdown
![Build Status](https://github.com/yourusername/yourrepo/actions/workflows/ci.yml/badge.svg)
```

## License

MIT License
