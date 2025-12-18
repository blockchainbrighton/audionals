import os
import csv
import torch
import soundfile as sf
import numpy as np
from kokoro import KPipeline

# ==========================================
# CONFIGURATION
# ==========================================

ORIGINAL_TEXT = """Navy SEAL’s Innocent Italian.
By Leslie North.
The Denver Men Series. Book 4.
Chapter 1.
“Grazie. I can’t tell you how excited I am to finally be in America.” Alexandra Moretti gave the waitress her order and handed back her menu. Rizole’s was a charming Italian restaurant with strong ties to her beloved Verona right in the heart of New York City. Looking around the beautifully decorated restaurant, she tried not to notice that the waitress was paying more attention to the lunch guest sitting around the corner than she was to herself and il signor Bresi. Alex resisted the urge to turn around and look at the man who held the young woman’s attention.
Marco Bresi smiled at her. “Keep that enthusiasm. Your papa asked for additional assistance at our last meeting. He didn’t say anything to you?”"""

OUTPUT_DIR = "demos_no_apostrophes"

# Voices
SELECTED_SINGLES = ['am_adam', 'af_bella', 'af_heart', 'af_sky']
SELECTED_MIXES = [('af_bella', 'af_heart'), ('af_heart', 'af_nicole'), ('af_heart', 'af_sky')]

# ==========================================
# SETUP
# ==========================================

os.makedirs(OUTPUT_DIR, exist_ok=True)
print("Initializing Pipeline...")
pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')

audition_log = []

def get_clean_name(technical_id):
    if '_' in technical_id:
        return technical_id.split('_')[1].title()
    return technical_id

def clean_text_for_audio(text):
    """
    Simplifies text by removing apostrophes entirely to prevent 
    awkward pauses (e.g., "Rizole's" -> "Rizoles").
    """
    # 1. Remove all variations of apostrophes
    spoken_text = text.replace("’", "").replace("'", "")
    
    # 2. Normalize other smart quotes to standard quotes (optional, but good for safety)
    spoken_text = spoken_text.replace("“", '"').replace("”", '"')
    
    # 3. Retain the intonation fix for the final question
    # (Matches previous request to fix flat questioning tone)
    spoken_text = spoken_text.replace("say anything to you?", "say anything... to you??")
    
    return spoken_text

def save_audio(generator, filename, description):
    full_path = os.path.join(OUTPUT_DIR, filename)
    all_audio = []
    
    for i, (gs, ps, audio) in enumerate(generator):
        all_audio.append(audio)
    
    if len(all_audio) > 0:
        final_audio = np.concatenate(all_audio)
        sf.write(full_path, final_audio, 24000)
        
        audition_log.append({
            "Filename": filename,
            "Voice Name/Mix": description,
            "Notes": "Apostrophes removed"
        })
        print(f"Generated: {filename}")

# Prepare the text
SPOKEN_TEXT = clean_text_for_audio(ORIGINAL_TEXT)
print("\n--- Audio Script Prepared ---")
print(f"Original snippet: ... Rizole’s was a charming...")
print(f"Cleaned snippet:  ... {SPOKEN_TEXT[175:200]}...") # printing the area where Rizoles occurs

# ==========================================
# PART 1: GENERATE SINGLES
# ==========================================
print("\n--- Generating Singles ---")

for voice_name in SELECTED_SINGLES:
    try:
        clean_name = get_clean_name(voice_name)
        full_text = f"Voice check. {clean_name}. " + SPOKEN_TEXT
        
        filename = f"01_NoApos_{clean_name}.wav"
        
        generator = pipeline(full_text, voice=voice_name, speed=0.9)
        save_audio(generator, filename, clean_name)
        
    except Exception as e:
        print(f"Error {voice_name}: {e}")

# ==========================================
# PART 2: GENERATE MIXES
# ==========================================
print("\n--- Generating Mixes ---")

# Load tensors
needed_voices = set()
for v1, v2 in SELECTED_MIXES:
    needed_voices.add(v1)
    needed_voices.add(v2)

voice_tensors = {}
for v in needed_voices:
    try:
        voice_tensors[v] = pipeline.load_voice(v)
    except:
        pass

for v1_name, v2_name in SELECTED_MIXES:
    try:
        if v1_name not in voice_tensors or v2_name not in voice_tensors:
            continue

        mixed_voice = (voice_tensors[v1_name] + voice_tensors[v2_name]) / 2
        n1 = get_clean_name(v1_name)
        n2 = get_clean_name(v2_name)
        
        full_text = f"Voice check. Mix of {n1} and {n2}. " + SPOKEN_TEXT
        filename = f"02_NoApos_Mix_{n1}_{n2}.wav"
        
        generator = pipeline(full_text, voice=mixed_voice, speed=0.9)
        save_audio(generator, filename, f"Mix: {n1} & {n2}")
        
    except Exception as e:
        print(f"Error mixing {v1_name} + {v2_name}: {e}")

# ==========================================
# PART 3: SAVE CSV
# ==========================================
csv_path = os.path.join(OUTPUT_DIR, "Audition_Log_NoApos.csv")
with open(csv_path, mode='w', newline='') as file:
    writer = csv.DictWriter(file, fieldnames=["Filename", "Voice Name/Mix", "Notes"])
    writer.writeheader()
    writer.writerows(audition_log)

print(f"\nDone! Files saved to '{OUTPUT_DIR}'.")