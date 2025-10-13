# 🎧 Dual-Voice Audiobook Generator

A one-click audiobook creator for manuscripts with alternating **male/female POVs** (for example, *Demetri* and *Diana*).
It automatically detects POV switches, generates per-chapter MP3s, and produces both a stitched full audiobook and a 2-minute QC reel for review.

---

## 🚀 Features

* Loads `.txt`, `.docx`, `.md`, and `.pdf` manuscripts
* Detects voice switches via:

  * `Kapitel …` / `Chapter …` → resets to **male**
  * `DIANA.` / `Demetri.` → switches and speaks the header
  * Scene breaks like `***`, `* * *`, or `*​*​*` → switch to **female** unless the next line starts with `Demetri.`
* Alternates **two ElevenLabs voices** (female/male)
* Cleans formatting symbols and control glyphs that cause TTS clicks
* Sentence-aware chunking that respects ElevenLabs model limits
* Asynchronous TTS synthesis with automatic retries
* Loudness normalization and ID3 tagging
* Generates per-chapter MP3s, a stitched full-book file, and a 2-minute QC reel

---

## ⚙️ Environment Variables

| Variable         | Required | Description                                                                                                              |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `ELEVEN_API_KEY` | ✅        | Your ElevenLabs API key                                                                                                  |
| `INPUT_PATH`     | ✅        | Path to the manuscript file                                                                                              |
| `BOOK_TITLE`     | ✅        | Title of the audiobook                                                                                                   |
| `BOOK_AUTHOR`    | ✅        | Author name for tagging                                                                                                  |
| `PREF_VOICES`    | Optional | Comma-separated voice names, e.g. `"Jessica,Clyde"` (female,male). If only one is given, both roles use that same voice. |
| `ELEVEN_MODEL`   | Optional | ElevenLabs model ID (default: `eleven_turbo_v2_5`)                                                                       |
| `CONCURRENCY`    | Optional | Number of concurrent TTS requests (default: `8`)                                                                         |
| `OUTPUT_DIR`     | Optional | Output directory (default: `./output/<slug-of-book-title>`)                                                              |

---

## 🪄 Usage

1. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

2. **Create a `.env` file** (see template below) or export variables manually:

   ```bash
   export ELEVEN_API_KEY=sk-xxxx
   export INPUT_PATH=/path/to/book.txt
   export BOOK_TITLE="Die Zufallsschwangerschaft des SEALs"
   export BOOK_AUTHOR="Katie Knight & Leslie North"
   export PREF_VOICES="Jessica,Clyde"
   ```

3. **Run the generator**

   ```bash
   python3 audiobook_dual_pov.py
   ```

4. **Output structure**

   ```
   output/<book-slug>/
   ├── 01 Chapter.mp3
   ├── 02 Chapter.mp3
   ├── _full_book.mp3
   └── _qc_reel_2m.mp3
   ```

---

## 🧩 How Voice Switching Works

| Cue                                | Action                                                               |
| ---------------------------------- | -------------------------------------------------------------------- |
| `Kapitel …` / `Chapter …`          | Resets to **male** voice                                             |
| `DIANA.` line                      | Switches to **female** voice and speaks it                           |
| `Demetri.` line                    | Switches to **male** voice and speaks it                             |
| `***` / `* * *` / `*​*​*`          | Switches to **female**, unless the next non-blank line is `Demetri.` |
| Any other text                     | Spoken by the current voice                                          |
| Asterisms (`***`) & control glyphs | Used only for logic — **never spoken**                               |

---

## 🧰 Example `.env` File

Save as `.env` in the same directory as the script:

```env
ELEVEN_API_KEY=your_elevenlabs_api_key_here
INPUT_PATH=/path/to/manuscript.txt
BOOK_TITLE=Die Zufallsschwangerschaft des SEALs
BOOK_AUTHOR=Katie Knight & Leslie North
PREF_VOICES=Jessica,Clyde
ELEVEN_MODEL=eleven_turbo_v2_5
CONCURRENCY=8
OUTPUT_DIR=./output/die-zufallsschwangerschaft-des-seals
```

---

## 🗣️ Voice Setup Tips

* Use [**ElevenLabs VoiceLab**](https://elevenlabs.io/app/voice-lab) to browse and test male/female voices.
* Set the **first** voice in `PREF_VOICES` to your **female** narrator (e.g. `Jessica`).
* Set the **second** voice to your **male** narrator (e.g. `Clyde`).
* If you only want a single-voice narration, specify one name (e.g. `Jessica`).

---

## 🪶 License

This software is **proprietary** and distributed under a **restricted license**.
You may use it internally for audiobook production but may **not redistribute, resell, or publish derivative versions** without explicit written permission from the copyright holder.


