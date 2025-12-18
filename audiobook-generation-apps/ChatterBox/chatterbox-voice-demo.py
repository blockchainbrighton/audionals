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

# Directory for reference audio files (for voice cloning)
VOICE_SAMPLES_DIR = "voice_samples"
os.makedirs(VOICE_SAMPLES_DIR, exist_ok=True)

# ------------------------------------------------------
# 3. DEFINE STYLES
# ------------------------------------------------------
# To generate emotional variations of a cloned voice,
# place a .wav file in the 'voice_samples' folder and use its filename
# in the 'ref_file' field below.
# Each entry in this list represents a different style for a specific cloned voice.
# If the specified 'ref_file' is not found, that entry will be skipped.

auditions = [
    # Example: Emotional variations for a cloned voice using 'my_voice.wav'
    # Make sure to place 'my_voice.wav' (a 5-15 second audio clip)
    # inside the 'voice_samples/' directory.
    {"name": "Cloned_Voice_Neutral",  "exag": 0.5, "cfg": 0.5, "ref_file": "my_voice.wav"},
    {"name": "Cloned_Voice_Calm",     "exag": 0.3, "cfg": 0.6, "ref_file": "my_voice.wav"},
    {"name": "Cloned_Voice_Dramatic", "exag": 0.8, "cfg": 0.4, "ref_file": "my_voice.wav"},
    {"name": "Cloned_Voice_Fast",     "exag": 0.6, "cfg": 0.3, "ref_file": "my_voice.wav"},
    {"name": "Cloned_Voice_Slow",     "exag": 0.4, "cfg": 0.8, "ref_file": "my_voice.wav"},
    {"name": "Cloned_Voice_Emotive",  "exag": 0.9, "cfg": 0.35, "ref_file": "my_voice.wav"},
    {"name": "Cloned_Voice_Robotic",  "exag": 0.1, "cfg": 0.9, "ref_file": "my_voice.wav"},
    {"name": "Cloned_Voice_Warm",     "exag": 0.45, "cfg": 0.55, "ref_file": "my_voice.wav"},
    {"name": "Cloned_Voice_Intense",  "exag": 1.0, "cfg": 0.3, "ref_file": "my_voice.wav"},
    {"name": "Cloned_Voice_Balanced", "exag": 0.6, "cfg": 0.5, "ref_file": "my_voice.wav"},

    # If you have another voice, e.g., 'another_voice.wav':
    # {"name": "Another_Voice_Neutral", "exag": 0.5, "cfg": 0.5, "ref_file": "another_voice.wav"},
    # {"name": "Another_Voice_Calm",    "exag": 0.3, "cfg": 0.6, "ref_file": "another_voice.wav"},
]

# ------------------------------------------------------
# 4. LOAD MODEL & GENERATE
# ------------------------------------------------------
print("--- 📥 Loading Chatterbox Model ---")
model = ChatterboxTTS.from_pretrained(device=device)

print(f"\n--- 🎙️ Starting Audition Session ({len(auditions)} takes) ---")
print("Note: CPU generation is slower but will not crash on long text.\n")
print(f"To clone voices, place your reference audio files (5-15s WAV) in the '{VOICE_SAMPLES_DIR}' folder.\n")

for i, style in enumerate(auditions):
    print(f"[{i+1}/{len(auditions)}] Generating: {style['name']}...")
    
    audio_prompt_path = None
    if style.get("ref_file"):
        ref_path = os.path.join(VOICE_SAMPLES_DIR, style["ref_file"])
        if os.path.exists(ref_path):
            audio_prompt_path = ref_path
            print(f"   Using reference voice: {style['ref_file']}")
        else:
            print(f"   ❌ Reference file '{style['ref_file']}' not found in '{VOICE_SAMPLES_DIR}'. Skipping this audition as no cloned voice can be generated.")
            continue # Skip to the next audition if ref file is missing
    else:
        print(f"   ❌ No reference file specified for '{style['name']}'. Skipping this audition as only cloned voices are requested.")
        continue # Skip if no ref_file is specified

    try:
        wav = model.generate(
            SCRIPT_TEXT,
            exaggeration=style['exag'],
            cfg_weight=style['cfg'],
            audio_prompt_path=audio_prompt_path  # Inject the voice clone reference
        )
        
        filename = f"{OUTPUT_DIR}/{style['name']}.wav"
        ta.save(filename, wav, model.sr)
        print(f"   ✅ Saved to {filename}")
        
    except Exception as e:
        print(f"   ❌ Error generating {style['name']}: {e}")

print(f"\n--- 🎉 Done! All files are in the '{OUTPUT_DIR}' folder. ---")