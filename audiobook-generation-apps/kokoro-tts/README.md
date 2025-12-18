This README file covers setup, running the app, changing voices, and how to "create" new voices by mixing existing ones.

-----

# Kokoro TTS (Local Mac Installation)

This repository contains a local setup for **Kokoro**, an open-weight 82M parameter text-to-speech model. It is configured to run on **macOS (Apple Silicon M1/M2/M3)** with GPU acceleration.

## 📦 1. Installation & Setup

### Prerequisites

  * **MacOS** with Apple Silicon (M1/M2/M3/M4)
  * **Python 3.10** or newer (Python 3.9 will not work)
  * **Homebrew** (to install system tools)

### One-Time Setup

If you haven't set up the environment yet, run these commands in your Terminal:

1.  **Install system dependencies:**

    ```bash
    brew install espeak-ng python@3.11
    ```

2.  **Create and activate a virtual environment:**

    ```bash
    # Navigate to your project folder
    cd path/to/kokoro-tts

    # Create virtual environment (force Python 3.11)
    python3.11 -m venv venv

    # Activate it
    source venv/bin/activate
    ```

3.  **Install Python libraries:**

    ```bash
    pip install "kokoro>=0.9.4" soundfile torch
    ```

-----

## 🚀 2. How to Run

1.  **Open Terminal** and navigate to your folder:

    ```bash
    cd path/to/kokoro-tts
    ```

2.  **Activate the environment** (if not already active):

    ```bash
    source venv/bin/activate
    ```

3.  **Run the script** with GPU acceleration enabled:

    ```bash
    PYTORCH_ENABLE_MPS_FALLBACK=1 python run_kokoro.py
    ```

The audio will be saved as `test_audio.wav` (or whatever filename is in your script).

-----

## 🗣️ 3. Changing Voices

Kokoro comes with several built-in voice styles. To change the voice, edit `run_kokoro.py` and change the `VOICE_NAME` variable.

### **Available Voice Codes**

| Code | Gender | Style | Description |
| :--- | :--- | :--- | :--- |
| **`af_heart`** | Female | US English | Soft, natural, high quality (Default) |
| **`af_bella`** | Female | US English | Energetic, higher pitch |
| **`af_nicole`** | Female | US English | Calm, audiobook style |
| **`af_sarah`** | Female | US English | Professional, clear |
| **`am_michael`**| Male | US English | Natural, conversational |
| **`am_adam`** | Male | US English | Deep, narrator style |
| **`bf_emma`** | Female | British | Standard British English |
| **`bf_isabella`**| Female | British | Soft British |
| **`bm_george`** | Male | British | Standard British Male |
| **`bm_lewis`** | Male | British | Deep, authoritative |

*Note: `a` = American, `b` = British, `f` = Female, `m` = Male.*

-----

## 🧪 4. Creating New Voices (Voice Mixing)

Kokoro does not support "training" a new voice from scratch without massive datasets and computing power. However, you can **create unique custom voices** by mathematically mixing two existing voices together.

### How to Mix Voices

You can average the "style vectors" of two voices to create a hybrid.

**Example: Creating a 50/50 mix of `af_heart` and `af_bella`**

Update your `run_kokoro.py` script to look like this:

```python
import torch
from kokoro import KPipeline
import soundfile as sf

pipeline = KPipeline(lang_code='a')

# Load two voices
voice_1 = pipeline.load_voice('af_heart')
voice_2 = pipeline.load_voice('af_bella')

# Mix them (50% each)
# You can change the ratio, e.g., (voice_1 * 0.7) + (voice_2 * 0.3)
custom_voice = (voice_1 + voice_2) / 2

text = "This is a custom mixed voice, blending Heart and Bella."

# Pass the custom_voice tensor directly to the generator
generator = pipeline(text, voice=custom_voice, speed=1)

for i, (gs, ps, audio) in enumerate(generator):
    sf.write(f'mixed_voice_{i}.wav', audio, 24000)
    print(f"Saved mixed_voice_{i}.wav")
```

-----

## 🌍 5. Multilingual Support

Kokoro supports other languages. To use them, you must install the specific language pack and change the `lang_code`.

**1. Install Language Packs:**

```bash
# For Japanese
pip install "misaki[ja]"

# For Mandarin Chinese
pip install "misaki[zh]"
```

**2. Update Script Code:**

```python
# 'j' for Japanese, 'z' for Chinese
pipeline = KPipeline(lang_code='j') 

text = "猫が大好きです" # "I love cats" in Japanese
generator = pipeline(text, voice='jf_alpha', speed=1)
```

-----

## 🛠️ Troubleshooting

  * **Error:** `RuntimeError: MPS not implemented`
      * **Fix:** Ensure you run the script with `PYTORCH_ENABLE_MPS_FALLBACK=1` at the start of the command.
  * **Error:** `AttributeError: 'KPipeline' object has no attribute 'load_voice'`
      * **Fix:** Ensure you have the latest version of Kokoro (`pip install --upgrade kokoro`).
  * **Script hangs at 0% download:**
      * **Fix:** Press `Ctrl+C` to stop it, then run the command again. It usually connects on the second try.