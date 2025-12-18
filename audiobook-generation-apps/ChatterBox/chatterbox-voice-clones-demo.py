import os
import torch
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

# ------------------------------------------------------
# 1. SETUP
# ------------------------------------------------------
device = "cpu"
print(f"--- 🚀 Initializing on device: {device} (Safe Mode) ---")

SCRIPT_TEXT = """Navy SEAL’s Innocent Italian.
By Leslie North.
The Denver Men Series. Book 4.
Chapter 1.
“Grazie. I can’t tell you how excited I am to finally be in America.” Alexandra Moretti gave the waitress her order and handed back her menu. Rizole’s was a charming Italian restaurant with strong ties to her beloved Verona right in the heart of New York City. Looking around the beautifully decorated restaurant, she tried not to notice that the waitress was paying more attention to the lunch guest sitting around the corner than she was to herself and il signor Bresi. Alex resisted the urge to turn around and look at the man who held the young woman’s attention.
Marco Bresi smiled at her. “Keep that enthusiasm. Your papa asked for additional assistance at our last meeting. He didn’t say anything to you?”"""

OUTPUT_DIR = "Denver Man Test Samples"
# Create a folder for your reference voices if it doesn't exist
REF_DIR = "ref_voices" 

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(REF_DIR, exist_ok=True)

# ------------------------------------------------------
# 2. DEFINE STYLES & REFERENCES
# ------------------------------------------------------
# INSTRUCTION: Place .wav files (5-10s long) in the 'ref_voices' folder
# matching these filenames. Only entries with existing reference files will be processed.

auditions = [
    # Ref_file determines WHO speaks. Exag/CFG determines HOW they speak.
    
    # --- Baseline (Original Settings) ---
    {"name": "relay-denver-man_BASE",     "ref": "relay-denver-man.wav",   "exag": 0.4, "cfg": 0.5},
    {"name": "relay-longer_BASE",         "ref": "relay-voice-longer-sample.wav",   "exag": 0.4, "cfg": 0.5},

    # --- Tuning Set 1: Increased Stability ---
    # Higher CFG (0.7) and slightly lower Temp (0.7) can reduce robotic artifacts
    {"name": "relay-denver-man_STABLE",   "ref": "relay-denver-man.wav",   "exag": 0.4, "cfg": 0.7, "temp": 0.7},
    
    # --- Tuning Set 2: High Expressiveness ---
    # Lower CFG (0.35) and Higher Exaggeration (0.6) for more dynamic range
    {"name": "relay-denver-man_DYN",      "ref": "relay-denver-man.wav",   "exag": 0.6, "cfg": 0.35, "temp": 0.8},

    # --- Tuning Set 3: Smoother Flow ---
    # Lower Repetition Penalty (1.0 = disabled) to prevent stuttering/glitching
    {"name": "relay-denver-man_SMOOTH",   "ref": "relay-denver-man.wav",   "exag": 0.4, "cfg": 0.5, "rep": 1.0},
    
    # --- Tuning Set 4: Best Guess (Balanced) ---
    # A mix of settings that often yields good results
    {"name": "relay-denver-man_BALANCED", "ref": "relay-denver-man.wav",   "exag": 0.45, "cfg": 0.6, "temp": 0.75, "rep": 1.1},
]

# ------------------------------------------------------
# 3. LOAD MODEL
# ------------------------------------------------------
print("--- 📥 Loading Chatterbox Model ---")
# If using a specific repo version, ensure it's updated
model = ChatterboxTTS.from_pretrained(device=device)

print(f"\n--- 🎙️ Starting Audition Session ({len(auditions)} takes) ---")
print(f"To clone voices, place your reference audio files (5-15s WAV) in the '{REF_DIR}' folder.\n")

for i, style in enumerate(auditions):
    print(f"[{i+1}/{len(auditions)}] Generating: {style['name']}...")

    # Construct full path to reference audio
    ref_path = None
    if style.get("ref"): # Use .get() to avoid KeyError if 'ref' is missing, though it shouldn't be with current config
        ref_path = os.path.join(REF_DIR, style["ref"])
        
        # Check if user actually put the file there
        if not os.path.exists(ref_path):
            print(f"   ❌ Reference '{style['ref']}' not found in '{REF_DIR}'. Skipping this audition as only cloned voices are requested.")
            continue # Skip this entry if the reference file is missing
    else:
        # This case handles entries where "ref": None, which should no longer be present
        # but provides robustness.
        print(f"   ❌ No reference file specified for '{style['name']}'. Skipping this audition as only cloned voices are requested.")
        continue # Skip this entry if no reference file is specified

    try:
        # Pass the audio_prompt_path to clone the voice
        wav = model.generate(
            SCRIPT_TEXT,
            audio_prompt_path=ref_path,
            exaggeration=style.get('exag', 0.5),
            cfg_weight=style.get('cfg', 0.5),
            temperature=style.get('temp', 0.8),
            repetition_penalty=style.get('rep', 1.2)
        )
        
        filename = f"{OUTPUT_DIR}/{style['name']}.wav"
        ta.save(filename, wav, model.sr)
        print(f"   ✅ Saved to {filename}")
        
    except Exception as e:
        print(f"   ❌ Error generating {style['name']}: {e}")

print(f"\n--- 🎉 Done! Files saved to '{OUTPUT_DIR}'. ---")
