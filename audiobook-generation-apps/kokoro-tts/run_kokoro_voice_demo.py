import os
import csv
import torch
import random
import soundfile as sf
from kokoro import KPipeline

# ==========================================
# CONFIGURATION
# ==========================================

TEST_TEXT = "This is a voice audition test for my new audiobook generation app. " \
"I am generating multiple voices and voice combinations to evaluate their quality and suitability for the project. " \
"The aim is to provide a variety of voice options to consider for your next audiobook series."

OUTPUT_DIR = "demos"

# Define Voice Groups (Region Specific)
US_VOICES = [
    'af_heart', 'af_bella', 'af_nicole', 'af_sarah', 'af_sky',
    'am_adam', 'am_michael'
]

UK_VOICES = [
    'bf_emma', 'bf_isabella', 
    'bm_george', 'bm_lewis'
]

# Total mixes desired (will be split roughly 50/50 between US and UK)
TOTAL_MIXES = 20

# ==========================================
# SETUP
# ==========================================

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Initialize Pipeline
print("Initializing Pipeline...")
pipeline = KPipeline(lang_code='a')

audition_log = []

def get_clean_name(technical_id):
    """
    Converts 'af_heart' -> 'Heart', 'bm_george' -> 'George'
    for better pronunciation in the audio intro.
    """
    if '_' in technical_id:
        return technical_id.split('_')[1].title()
    return technical_id

def save_audio(generator, filename, description, region):
    """Helper to save audio and log entry"""
    full_path = os.path.join(OUTPUT_DIR, filename)
    
    # We combine segments if the model breaks the intro and text into parts
    all_audio = []
    
    for i, (gs, ps, audio) in enumerate(generator):
        all_audio.append(audio)
    
    if len(all_audio) > 0:
        # Concatenate all audio segments (intro + main text)
        final_audio = torch.cat([torch.from_numpy(a) for a in all_audio]) if len(all_audio) > 1 else all_audio[0]
        
        # Save to file
        sf.write(full_path, final_audio, 24000)
        
        audition_log.append({
            "Filename": filename,
            "Region": region,
            "Voice Name/Mix": description,
            "User Notes": "" 
        })
        print(f"Generated: {filename}")

# ==========================================
# PART 1: GENERATE SINGLE VOICES
# ==========================================
print("\n--- Generating Single Voices ---")

# Combine lists just for the single iteration
all_voices = [('US', v) for v in US_VOICES] + [('UK', v) for v in UK_VOICES]

for region, voice_name in all_voices:
    try:
        # Update pipeline language code ensures best phonemes for that accent
        target_lang = 'a' if region == 'US' else 'b'
        pipeline.lang_code = target_lang
        
        # Clean name for audio (e.g. "Heart")
        spoken_name = get_clean_name(voice_name)
        
        # Create spoken intro
        intro_text = f"Hello. I am {spoken_name}. "
        full_text = intro_text + TEST_TEXT
        
        generator = pipeline(full_text, voice=voice_name, speed=1)
        filename = f"01_{region}_single_{voice_name}.wav"
        save_audio(generator, filename, voice_name, region)
    except Exception as e:
        print(f"Skipping {voice_name}: {e}")

# ==========================================
# PART 2: GENERATE REGIONAL MIXES
# ==========================================
print("\n--- Generating Accent-Matched Mixed Voices ---")

# Pre-load all voice tensors
voice_tensors = {}
for region, v in all_voices:
    try:
        voice_tensors[v] = pipeline.load_voice(v)
    except:
        pass

def generate_mixes(voice_list, region_code, count):
    """Generates random mixes from a specific list of voices"""
    print(f"Creating {count} mixes for region: {region_code}...")
    pipeline.lang_code = 'a' if region_code == 'US' else 'b'
    
    for i in range(count):
        # Pick two random different voices from THIS region only
        v1_name, v2_name = random.sample(voice_list, 2)
        
        t1 = voice_tensors[v1_name]
        t2 = voice_tensors[v2_name]
        
        # Mix them (50/50 average)
        mixed_voice = (t1 + t2) / 2
        
        # Clean names for audio intro
        n1 = get_clean_name(v1_name)
        n2 = get_clean_name(v2_name)
        
        mix_name = f"Mix: {v1_name} + {v2_name}"
        
        # Create spoken intro for the mix
        intro_text = f"This is a fifty-fifty mix of {n1} and {n2}. "
        full_text = intro_text + TEST_TEXT
        
        filename = f"02_{region_code}_mix_{i+1:02d}.wav"
        
        generator = pipeline(full_text, voice=mixed_voice, speed=1)
        save_audio(generator, filename, mix_name, region_code)

# Split the total mixes evenly
mixes_per_region = TOTAL_MIXES // 2

generate_mixes(US_VOICES, "US", mixes_per_region)
generate_mixes(UK_VOICES, "UK", mixes_per_region)

# ==========================================
# PART 3: GENERATE REPORT (CSV)
# ==========================================
csv_filename = "Audition_Log.csv"
csv_path = os.path.join(OUTPUT_DIR, csv_filename)

# Sort log so US is together and UK is together
audition_log.sort(key=lambda x: (x["Region"], x["Filename"]))

with open(csv_path, mode='w', newline='') as file:
    writer = csv.DictWriter(file, fieldnames=["Filename", "Region", "Voice Name/Mix", "User Notes"])
    writer.writeheader()
    writer.writerows(audition_log)

print(f"\nDone! \n1. Audio files are in the '{OUTPUT_DIR}' folder.")
print(f"2. Audition Log saved to '{csv_path}'.")