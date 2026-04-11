# ChatterBox Local UI

This adds a small local web UI for generating speech with your installed ChatterBox model.

## 1. Install dependencies

Recommended for Apple Silicon (Python 3.11 conda env):

```bash
conda create -n chatterbox-ui python=3.11 -y
conda activate chatterbox-ui
python -m pip install flask torch torchaudio chatterbox-tts
```

If you already have a working environment for `run_chatterbox.py`, install only `flask`.

Alternative (existing Python env):

```bash
python3 -m pip install flask torch torchaudio chatterbox-tts
```

## 2. Optional voice prompts

Put voice prompt audio files in:

```bash
voices/
```

Supported types: `.wav`, `.mp3`, `.flac`, `.ogg`, `.m4a`

## 3. Run the UI server

```bash
python ui_server.py
```

Open:

```text
http://127.0.0.1:7860
```

## 4. Environment variables (optional)

- `CHATTERBOX_DEVICE=auto|mps|cpu|cuda` (default: `auto`, auto-picks `mps` on Apple Silicon)
- `CHATTERBOX_PORT=7860`
- `CHATTERBOX_HOST=127.0.0.1`
- `CHATTERBOX_VOICES_DIR=voices`
- `CHATTERBOX_OUTPUTS_DIR=generated_audio`
- `CHATTERBOX_MAX_TEXT_LENGTH=6000`
- `CHATTERBOX_MPS_CHUNK_CHARS=220` (smaller chunks are more stable on 8GB M1 for long text)
- `CHATTERBOX_CHUNK_PAUSE_MS=70` (tiny pause inserted when stitching chunked output)
- `CHATTERBOX_VOICE_CACHE_SIZE=4` (cache prepared voice conditionals to speed repeated runs)
- `CHATTERBOX_PRELOAD_MODEL=1` (preload model on startup for faster first generation)
- `CHATTERBOX_CPU_THREADS=8` (used when device is CPU)
- `CHATTERBOX_LOG_LEVEL=INFO` (`DEBUG` for very verbose internals)
- `CHATTERBOX_LOG_PROGRESS_EVERY_CHUNKS=1` (log every N chunks)

## Notes

- Server is optimized for Apple Silicon speed by default:
  - prefers MPS automatically,
  - chunks long text to avoid common MPS long-sentence failures,
  - retries automatically with smaller chunk sizes when MPS hits channel/memory limits,
  - auto-falls back to CPU per-job if MPS still fails (job still completes),
  - caches prepared voice prompts to avoid repeated preprocessing.
- UI now shows live generation progress (chunk progress, elapsed time, ETA, and chars/sec).
- Console logs now include: job lifecycle, chunk timings, MPS retry steps, and CPU fallback transitions.
- Generated WAV files are saved to `generated_audio/`.
