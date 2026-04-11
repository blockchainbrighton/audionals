# GIF Converter

A standalone Python desktop app that converts any movie file into an optimised GIF with full user control over every conversion parameter.

---

## Folder Structure

```
gifConverter/
├── gifConverter.py       ← Run this script
├── README.md             ← This file
├── GIFS/                 ← Converted GIFs are saved here
└── Processed-Clips/      ← Original movie files are moved here after conversion
```

---

## How to Use

1. **Drop** any movie file directly into the `gifConverter/` folder (same level as `gifConverter.py`).
2. **Run** the script:
   ```bash
   python3 gifConverter.py
   ```
3. The app will **auto-detect** your file and show a preview.
4. **Configure** your settings (see below).
5. Click **Convert to GIF**.
6. Your GIF appears in `GIFS/` and the original is archived in `Processed-Clips/`.

---

## Supported Input Formats

`.mp4` `.mov` `.avi` `.mkv` `.wmv` `.flv` `.webm` `.m4v` `.mpg` `.mpeg` `.3gp` `.ts`

---

## Settings Reference

| Setting | Description | Safe Limits |
|---|---|---|
| **Trim — Start / End** | Set the clip window to convert | 0 – 120 s max |
| **Frame Rate** | GIF playback frames per second | 1 – 24 fps |
| **Playback Speed** | Speed multiplier relative to original | 0.25× – 4× |
| **Width (px)** | Output pixel width (aspect ratio preserved) | 64 – 1280 px |
| **Colour Depth** | Number of colours in the GIF palette | 8 – 256 |
| **Loop Mode** | Infinite loop, play once, or fixed count | — |
| **Dither Method** | Controls colour banding appearance | sierra2_4a recommended |
| **Optimise Level** | gifsicle compression effort (1=Fast, 3=Best) | — |
| **Lossy Compress** | Lossy artefact level (0=lossless, 200=max) | 40 default |
| **Crop** | Optional crop region: `W:H:X:Y` | e.g. `640:360:0:60` |
| **Reverse Playback** | Play the clip backwards | — |
| **Boomerang** | Forward then reverse (Instagram-style) | — |
| **Output Name** | Custom filename for the GIF | Auto if blank |

---

## Dependencies

| Tool | Purpose | Install |
|---|---|---|
| **ffmpeg** | Video decoding, palette generation, GIF rendering | `sudo apt-get install ffmpeg` / `brew install ffmpeg` |
| **ffprobe** | Video metadata (bundled with ffmpeg) | — |
| **gifsicle** | GIF optimisation and loop control | `sudo apt-get install gifsicle` / `brew install gifsicle` |
| **Pillow** | Preview thumbnail | `pip3 install Pillow` |
| **tkinter** | GUI (Python stdlib) | `sudo apt-get install python3-tk` |

The app checks for all dependencies on startup and warns you if any are missing.

---

## Tips for Best Results

- **Keep clips short** — GIFs are uncompressed video; 3–10 seconds is the sweet spot for file size vs. quality.
- **Lower the frame rate** — 10–15 fps looks smooth and keeps file sizes small.
- **Reduce width** — 480 px is a good default; go lower for web/social use.
- **Use sierra2_4a dither** — Best quality-to-size ratio for most footage.
- **Lossy 30–60** — Barely visible quality loss with significant size reduction.
- **Boomerang** works best on short clips (1–3 s) with clear motion.

---

## Platform Notes

- **macOS**: Install dependencies via [Homebrew](https://brew.sh): `brew install ffmpeg gifsicle`
- **Windows**: Install [ffmpeg for Windows](https://ffmpeg.org/download.html) and [gifsicle for Windows](https://eternallybored.org/misc/gifsicle/); ensure both are on your `PATH`.
- **Linux**: `sudo apt-get install ffmpeg gifsicle python3-tk`
