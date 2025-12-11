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
TEXT_ITALIAN = "Grazie."

# 2. THE AMERICAN PART
# We keep the phonetic fixes for the names inside the English sentence
# to maintain flow, but the opening word is handled separately.
TEXT_AMERICAN = """
I can't tell you how excited I am to finally be in America. Alexandra Moretti gave the waitress her order and handed back her menu. Rizoles was a charming Italian restaurant with strong ties to her beloved Verona right in the heart of New York City. Looking around the beautifully decorated restaurant, she tried not to notice that the waitress was paying more attention to the lunch guest sitting around the corner than she was to herself and eel seen-yor Breh-see. Alex resisted the urge to turn around and look at the man who held the young woman’s attention.
Marco Breh-see smiled at her. Keep that enthusiasm. Your papa asked for additional assistance at our last meeting. He didn’t say anything... to you??
"""

OUTPUT_DIR = "demos_hybrid_lang"
SELECTED_SINGLES = ['am_adam', 'af_bella', 'af_heart', 'af_sky']

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
    silence = np.zeros(int(sr * (pause_duration_ms / 1000))) if pause_ms > 0 else np.array([])
    
    final_stream = []
    for i, part in enumerate(audio_parts):
        final_stream.append(part)
        # Add silence between parts (but not after the last one)
        if i < len(audio_parts) - 1:
            final_stream.append(silence)
            
    return np.concatenate(final_stream)

# ==========================================
# GENERATION LOOP
# ==========================================

pause_duration_ms = 250 # Pause after "Grazie."

for voice_name in SELECTED_SINGLES:
    try:
        print(f"Processing: {voice_name}...")
        
        # CRITICAL STEP: Load the voice tensor
        # We load the voice vector ONCE. We can pass this same vector 
        # to both the Italian and American engines.
        voice_tensor = pipeline_us.load_voice(voice_name)
        
        # 1. Generate the Italian Word (Using Italian Pipeline)
        # The American voice 'af_bella' will now speak Italian.
        audio_it = generate_segment(pipeline_it, TEXT_ITALIAN, voice_tensor, speed=1.0)
        
        # 2. Generate the English Story (Using American Pipeline)
        audio_us = generate_segment(pipeline_us, TEXT_AMERICAN, voice_tensor, speed=1.0)
        
        # 3. Stitch them together
        # [Italian Audio] + [Pause] + [American Audio]
        final_audio = stitch_audio([audio_it, audio_us], pause_ms=pause_duration_ms)
        
        # Save
        filename = f"Hybrid_Lang_{voice_name}.wav"
        full_path = os.path.join(OUTPUT_DIR, filename)
        sf.write(full_path, final_audio, 24000)
        print(f"Saved: {filename}")
        
    except Exception as e:
        print(f"Error {voice_name}: {e}")

print(f"\nDone! Files saved to '{OUTPUT_DIR}'.")