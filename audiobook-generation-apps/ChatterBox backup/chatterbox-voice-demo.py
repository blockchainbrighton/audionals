import os
import torch
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

# ------------------------------------------------------
# 1. SETUP (FORCE CPU TO AVOID MPS CRASHES)
# ------------------------------------------------------
# Mac MPS has a limit of 65536 output channels which crashes
# on long sentences. CPU is slower but safe.
device = "cpu"
print(f"--- 🚀 Initializing on device: {device} (Safe Mode) ---")

# ------------------------------------------------------
# 2. CONFIGURATION
# ------------------------------------------------------
SCRIPT_TEXT = (
    "This is a voice audition test for my new audiobook generation app. "
    "I am generating multiple voices and voice combinations to evaluate their quality "
    "and suitability for the project. The aim is to provide a variety of voice options "
    "to consider for your next audiobook series."
)

OUTPUT_DIR = "audition_tapes"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ------------------------------------------------------
# 3. DEFINE STYLES
# ------------------------------------------------------
auditions = [
    {"name": "01_Default_Neutral", "exag": 0.5, "cfg": 0.5},
    {"name": "02_Calm_Narrator",   "exag": 0.3, "cfg": 0.6},
    {"name": "03_Dramatic_Read",   "exag": 0.8, "cfg": 0.4},
    {"name": "04_Fast_Paced",      "exag": 0.6, "cfg": 0.3},
    {"name": "05_Slow_Emphasis",   "exag": 0.4, "cfg": 0.8},
    {"name": "06_Highly_Emotive",  "exag": 0.9, "cfg": 0.35},
    {"name": "07_Flat_Robotic",    "exag": 0.1, "cfg": 0.9},
    {"name": "08_Warm_Story",      "exag": 0.45, "cfg": 0.55},
    {"name": "09_Intense_Action",  "exag": 1.0, "cfg": 0.3},
    {"name": "10_Balanced_Plus",   "exag": 0.6, "cfg": 0.5},
]

# ------------------------------------------------------
# 4. LOAD MODEL & GENERATE
# ------------------------------------------------------
print("--- 📥 Loading Chatterbox Model ---")
model = ChatterboxTTS.from_pretrained(device=device)

print(f"\n--- 🎙️ Starting Audition Session ({len(auditions)} takes) ---")
print("Note: CPU generation is slower but will not crash on long text.\n")

for i, style in enumerate(auditions):
    print(f"[{i+1}/{len(auditions)}] Generating: {style['name']}...")
    
    try:
        wav = model.generate(
            SCRIPT_TEXT,
            exaggeration=style['exag'],
            cfg_weight=style['cfg']
        )
        
        filename = f"{OUTPUT_DIR}/{style['name']}.wav"
        ta.save(filename, wav, model.sr)
        print(f"   ✅ Saved to {filename}")
        
    except Exception as e:
        print(f"   ❌ Error generating {style['name']}: {e}")

print(f"\n--- 🎉 Done! All files are in the '{OUTPUT_DIR}' folder. ---")