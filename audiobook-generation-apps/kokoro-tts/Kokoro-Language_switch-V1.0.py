import os
# ==========================================
# CRITICAL MAC FIX
# ==========================================
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import soundfile as sf
import numpy as np
import torch
from kokoro import KPipeline

# ==========================================
# CONFIGURATION
# ==========================================

# 1. THE ITALIAN PART
# We isolate the word that needs the perfect accent
TEXT_ITALIAN = "Grazie"

# 2. THE AMERICAN PART
# We keep the phonetic fixes for the names inside the English sentence
# to maintain flow, but the opening word is handled separately.
TEXT_AMERICAN = """
I can't tell you how excited I am to finally be in America. Alexandra Moretti gave the waitress her order and handed back her menu. Rizoles was a charming Italian restaurant with strong ties to her beloved Verona right in the heart of New York City. Looking around the beautifully decorated restaurant, she tried not to notice that the waitress was paying more attention to the lunch guest sitting around the corner than she was to herself and eel seen-yor Breh-see. Alex resisted the urge to turn around and look at the man who held the young woman’s attention.
Marco Breh-see smiled at her. Keep that enthusiasm. Your papa asked for additional assistance at our last meeting. He didn’t say anything to you??
"""

OUTPUT_DIR = "demos_hybrid_lang"

# Define the tasks: Singles and Mixes
SINGLES = ['am_adam', 'af_bella', 'af_heart', 'af_sky']

# Mixes: List of tuples (voice1, voice2, output_name_suffix)
MIXES = [
    ('af_bella', 'af_heart', 'Mix_Bella_Heart'),
    ('af_heart', 'af_nicole', 'Mix_Heart_Nicole'),
    ('af_heart', 'af_sky',    'Mix_Heart_Sky')
]

# ==========================================
# SETUP
# ==========================================

os.makedirs(OUTPUT_DIR, exist_ok=True)
device = 'cpu' 
print(f"Initializing Hybrid Pipelines on {device}...")

# WE NEED TWO PIPELINES
# 1. American Pipeline for the main narration
pipeline_us = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M', device=device)

# 2. Italian Pipeline just for the "Grazie"
pipeline_it = KPipeline(lang_code='i', repo_id='hexgrad/Kokoro-82M', device=device)

print("--- Pipelines Ready ---")

def generate_segment(pipe, text, voice_tensor, speed=1.0):
    """
    Helper to generate audio from a specific pipeline
    """
    generator = pipe(text, voice=voice_tensor, speed=speed, split_pattern=r'\n+')
    all_audio = []
    for i, (gs, ps, audio) in enumerate(generator):
        all_audio.append(audio)
    
    if not all_audio:
        return np.array([])
    return np.concatenate(all_audio)

def stitch_audio(audio_parts, pause_ms=150):
    """
    Joins the Italian part and American part with a natural pause
    """
    sr = 24000
    # Fix: Use the passed pause_ms, not a global variable
    silence = np.zeros(int(sr * (pause_ms / 1000))) if pause_ms > 0 else np.array([])
    
    final_stream = []
    for i, part in enumerate(audio_parts):
        final_stream.append(part)
        # Add silence between parts (but not after the last one)
        if i < len(audio_parts) - 1:
            final_stream.append(silence)
            
    return np.concatenate(final_stream)


def trim_silence(audio, threshold=0.01, trim_head=True, trim_tail=True):
    """
    Removes silence from the start and/or end of an audio array 
    based on a volume threshold.
    """
    if len(audio) == 0:
        return audio

    # create a boolean mask of where audio is louder than threshold
    mask = np.abs(audio) > threshold
    
    if not np.any(mask):
        return np.array([]) # The whole clip is silence

    start = 0
    end = len(audio)

    if trim_head:
        start = np.argmax(mask) # Index of first True
    
    if trim_tail:
        # Index of last True (using reversed array)
        end = len(audio) - np.argmax(mask[::-1])

    return audio[start:end]


def process_voice_generation(voice_tensor, filename):
    full_path = os.path.join(OUTPUT_DIR, filename)
    
    if os.path.exists(full_path):
        print(f"Skipping (Already Exists): {filename}")
        return

    try:
        print(f"Processing: {filename}...")
        
        # 1. Generate Raw Audio
        audio_it = generate_segment(pipeline_it, TEXT_ITALIAN, voice_tensor, speed=1.0)
        audio_us = generate_segment(pipeline_us, TEXT_AMERICAN, voice_tensor, speed=1.0)
        
        # 2. TRIM SILENCE (Crucial Step)
        # Trim the END of Italian to stop the gap
        audio_it = trim_silence(audio_it, trim_head=False, trim_tail=True)
        # Trim the START of American so it hits immediately
        audio_us = trim_silence(audio_us, trim_head=True, trim_tail=False)
        
        # 3. Stitch with a tighter pause
        # 50ms is a quick breath. 0ms is instant. 
        # Since "Grazie" usually implies a slight pause, 50-80ms is usually perfect.
        pause_duration_ms = 150 
        
        final_audio = stitch_audio([audio_it, audio_us], pause_ms=pause_duration_ms)
        
        sf.write(full_path, final_audio, 24000)
        print(f"Saved: {filename}")
        
    except Exception as e:
        print(f"Error processing {filename}: {e}")

# ==========================================
# GENERATION LOOP
# ==========================================

print("--- Starting Generation ---")

# 1. Process Singles
for voice_name in SINGLES:
    # Load voice tensor
    voice_tensor = pipeline_us.load_voice(voice_name)
    filename = f"Hybrid_Lang_{voice_name}.wav"
    process_voice_generation(voice_tensor, filename)

# 2. Process Mixes
for v1, v2, mix_suffix in MIXES:
    try:
        t1 = pipeline_us.load_voice(v1)
        t2 = pipeline_us.load_voice(v2)
        
        # Average the tensors to create the mix
        mixed_voice = (t1 + t2) / 2
        
        filename = f"Hybrid_Lang_{mix_suffix}.wav"
        process_voice_generation(mixed_voice, filename)
        
    except Exception as e:
        print(f"Error preparing mix {v1}+{v2}: {e}")

print(f"\nDone! Files saved to '{OUTPUT_DIR}'.")
