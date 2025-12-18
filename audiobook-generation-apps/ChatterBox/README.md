# Chatterbox Voice Cloning Demo

This project provides a Python-based tool for generating custom AI voiceovers using **Chatterbox TTS**. It specializes in **Zero-Shot Voice Cloning**, allowing you to create new voice styles from just a short 5-10 second audio sample without hours of training.

## 🚀 Features

- **Zero-Shot Cloning:** Clone any voice using a single `.wav` reference file.
- **Emotional Control:** Adjust the `exaggeration` parameter to make voices sound calm, dramatic, or intense.
- **Pacing Control:** Use `cfg_weight` to fine-tune the speed and stability of the speech.
- **Mac Optimized:** Includes safety switches to run on CPU to avoid known MPS (Apple Silicon) crashes with longer audio generation.

## 📂 Project Structure

```text
Chatterbox/
├── chatterbox-voice-clones-demo.py  # Main script for generating cloned voices
├── ref_voices/                      # [INPUT] Place your 5-15s reference WAV files here
└── clone_audition_tapes/            # [OUTPUT] Generated audio files appear here
```

## 🛠️ Installation & Setup

### 1. Prerequisites
- Python 3.9 or higher
- `ffmpeg` (often required for audio processing)

### 2. Set up a Virtual Environment
It is best practice to run this in an isolated environment.

```bash
# Create the environment
python3 -m venv venv

# Activate the environment
# On Mac/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate
```

### 3. Install Dependencies
Install the required libraries. Note that Chatterbox relies on PyTorch.

```bash
pip install chatterbox-tts torch torchaudio
```

## 🎙️ Usage Guide

### Step 1: Prepare Reference Audio
Find a clean recording of the voice you want to clone.
- **Format:** `.wav`
- **Length:** 5 to 15 seconds is optimal.
- **Content:** Clear speech with minimal background noise.
- **Action:** Place this file inside the `ref_voices/` folder.

### Step 2: Configure the Script
Open `chatterbox-voice-clones-demo.py` in your text editor. Look for the `auditions` list:

```python
auditions = [
    # Ref_file matches the filename in 'ref_voices/'
    # Exag (0.0-1.0): Higher = More emotional/dramatic
    # CFG (0.0-1.0):  Lower = More expressive/fast; Higher = More stable/slow
    
    {"name": "My_Clone_Calm", "ref": "my_voice_sample.wav", "exag": 0.3, "cfg": 0.6},
    {"name": "My_Clone_Fast", "ref": "my_voice_sample.wav", "exag": 0.6, "cfg": 0.3},
]
```
*   **`name`**: The name of the output file.
*   **`ref`**: The filename of your source audio in `ref_voices/`.
*   **`exaggeration`**: Controls emotional intensity (default ~0.5).
*   **`cfg_weight`**: Controls how strictly the model follows the text vs. the style. Lower values often result in faster, more fluid speech.

### Step 3: Run the Generator
Execute the script to generate your audio files.

```bash
python3 chatterbox-voice-clones-demo.py
```

### Step 4: Check Results
Your generated voiceovers will be saved in the `clone_audition_tapes/` directory.

## 🧠 Advanced: Zero-Shot vs. Fine-Tuning

### Zero-Shot Cloning (This Tool)
This tool uses **Zero-Shot Cloning**. It looks at the "style" of your reference audio and instantly applies it to the new text. 
- **Pros:** Instant, no training required, infinite voice variety.
- **Cons:** Consistency can vary between generations; sensitive to background noise in the reference.

### Fine-Tuning (Training)
For production-grade audiobooks where you need a consistent character voice for hours of content, you might consider **Fine-Tuning**.
- **Process:** Requires a dataset of the speaker (15-60 minutes of clean audio), transcribed text, and GPU resources.
- **Tools:** The standard `chatterbox-tts` library is for inference. To fine-tune, you would typically need to use community training scripts (e.g., from the Resemble AI research repositories) or third-party training kits that allow you to retrain the underlying model checkpoints.
- **Note:** Fine-tuning is significantly more complex and resource-intensive than the cloning method provided in this demo.

## 🔧 Troubleshooting

**Issue: "MPS" or "Out of Memory" crashes on Mac**
- **Fix:** The script is hardcoded to use `device = "cpu"` by default. While slower, this is much more stable for generating longer sentences than the experimental Apple Silicon (MPS) support. Do not change this to "mps" unless you are generating very short clips.

**Issue: Generated voice sounds static or garbled**
- **Fix:** Check your reference audio. If the `ref_voices` file has background music, noise, or silence, the model will try to "clone" that noise. Use high-quality, dry vocal recordings.
