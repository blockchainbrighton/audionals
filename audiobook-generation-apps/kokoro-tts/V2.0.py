import os

# ==========================================
# 1. ENVIRONMENT & DEVICE SETUP
# ==========================================
# CRITICAL FIX: This must be set BEFORE importing torch
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import soundfile as sf
import numpy as np
import torch
from kokoro import KPipeline

def get_device():
    if torch.cuda.is_available():
        return 'cuda'
    
    # CRITICAL MAC FIX: 
    # We intentionally disable MPS (GPU) return here.
    # Kokoro's vocoder uses >65,536 output channels which crashes 
    # the current Mac Metal driver. CPU is fast enough (0.5s generation) 
    # and prevents the crash.
    # if torch.backends.mps.is_available():
    #    return 'mps'
    
    return 'cpu'

DEVICE = get_device()
print(f"🚀 Running on: {DEVICE}")

# ==========================================
# 2. CONTENT CONFIGURATION
# ==========================================

# The Italian hook (Voice A)
TEXT_ITALIAN = "Grazie." # Added period for prosody stability

# The Narrative (Voice B)
# Note: "Breh-see" is a good phonetic hack. 
# Ensure strictly consistent spacing for the model to breathe.
TEXT_AMERICAN = """
I can't tell you how excited I am to finally be in America. Alexandra Moretti gave the waitress her order and handed back her menu. Rizoles was a charming Italian restaurant with strong ties to her beloved Verona, right in the heart of New York City. Looking around the beautifully decorated restaurant, she tried not to notice that the waitress was paying more attention to the lunch guest sitting around the corner, than she was to herself and eel seen-yor Breh-see. Alex resisted the urge to turn around and look at the man who held the young woman’s attention.
Marco Breh-see smiled at her. Keep that enthusiasm. Your papa asked for additional assistance at our last meeting. He didn’t say anything to you?
"""

OUTPUT_DIR = "demos_optimized"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Define tasks
# Single voices
SINGLES = ['am_adam', 'af_bella', 'af_heart', 'af_sky']

# Mixed voices: (Voice1, Weight1, Voice2, Weight2, OutputName)
# Weights allow you to dominate with one voice while adding "texture" from another.
MIXES = [
    ('af_bella', 0.5, 'af_heart',  0.5, 'Mix_Bella50_Heart50'),
    ('af_heart', 0.7, 'af_nicole', 0.3, 'Mix_Heart70_Nicole30'), # Mostly Heart, slightly sharper
    ('af_heart',   0.8, 'af_sky',   0.2, 'Mix_Heart80_Sky20'),   # Androgynous/Deepening experiment
]

# ==========================================
# 3. ADVANCED AUDIO PROCESSING
# ==========================================

def trim_silence_db(audio, top_db=60):
    """
    Trims silence using Decibels relative to peak, not just raw amplitude.
    This prevents cutting off the quiet 'breath' at the end of words.
    """
    if len(audio) == 0: return audio
    
    # Calculate dB amplitude
    # Add epsilon to avoid log(0)
    audio_abs = np.abs(audio)
    db = 20 * np.log10(audio_abs + 1e-10)
    
    peak = np.max(db)
    threshold = peak - top_db
    
    # Create mask
    mask = db > threshold
    
    if not np.any(mask):
        return np.array([])
        
    start = np.argmax(mask)
    # Find last True
    end = len(audio) - np.argmax(mask[::-1])
    
    return audio[start:end]

def crossfade_stitch(audio1, audio2, crossfade_ms=50, pause_ms=100, sr=24000):
    """
    Stitches two clips. Instead of a hard cut, it crossfades them 
    if they overlap, or adds silence if there is a gap.
    
    For a natural dialogue flow:
    1. Trim tails.
    2. Add 'pause_ms' of silence.
    3. Crossfade slightly to blend room tone (if any).
    """
    silence_samples = int(sr * (pause_ms / 1000))
    silence = np.zeros(silence_samples)
    
    # Simple concatenation with silence for this specific use case
    # (Since we are switching languages/pipelines, a crossfade is overkill 
    # unless we are blending background noise, but a smooth join is key).
    
    # Normalize inputs to prevent volume jumps between languages
    def normalize(a):
        peak = np.max(np.abs(a))
        if peak == 0: return a
        return a / peak * 0.9 # Target 90% volume
        
    audio1 = normalize(audio1)
    audio2 = normalize(audio2)
    
    return np.concatenate([audio1, silence, audio2])

def generate_full_text(pipe, text, voice_tensor, speed):
    """Generate all segments for a text block and join them."""
    generator = pipe(text, voice=voice_tensor, speed=speed, split_pattern=r'\n+')
    full_audio = []
    for i, (gs, ps, audio) in enumerate(generator):
        full_audio.append(audio)
    if not full_audio: return np.array([])
    return np.concatenate(full_audio)

# ==========================================
# 4. EXECUTION
# ==========================================

print("--- Loading Models ---")
# Load Pipelines once
pipeline_us = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M', device=DEVICE)
pipeline_it = KPipeline(lang_code='i', repo_id='hexgrad/Kokoro-82M', device=DEVICE)

def process_voice(voice_tensor, filename):
    print(f"Generating: {filename}...")
    
    # 1. Italian Segment (The "Grazie")
    # Note: We pass the same voice tensor to the Italian pipeline.
    # Kokoro voices are language-agnostic tensors!
    audio_it = generate_full_text(pipeline_it, TEXT_ITALIAN, voice_tensor, speed=1.0)
    
    # 2. American Segment
    audio_us = generate_full_text(pipeline_us, TEXT_AMERICAN, voice_tensor, speed=1.0)
    
    # 3. Smart Trim
    # We trim the tail of Italian strictly to control the pacing
    audio_it = trim_silence_db(audio_it, top_db=40) 
    audio_us = trim_silence_db(audio_us, top_db=50) # Looser trim on narrative start
    
    # 4. Stitch
    # 150ms is a "comma" pause. 300ms is a "period" pause.
    # For "Grazie... I can't", 200ms feels like a turning of the head.
    final_audio = crossfade_stitch(audio_it, audio_us, pause_ms=200)
    
    # 5. Save
    save_path = os.path.join(OUTPUT_DIR, filename)
    sf.write(save_path, final_audio, 24000)

# --- Run Singles ---
for v_name in SINGLES:
    # Use load_voice from US pipeline (shared dict usually)
    voice_tensor = pipeline_us.load_voice(v_name)
    process_voice(voice_tensor, f"{v_name}_Hybrid.wav")

# --- Run Weighted Mixes ---
for v1_name, w1, v2_name, w2, out_name in MIXES:
    try:
        t1 = pipeline_us.load_voice(v1_name)
        t2 = pipeline_us.load_voice(v2_name)
        
        # Weighted Average Formula
        # (V1 * w1 + V2 * w2) / (w1 + w2)
        mixed_voice = (t1 * w1 + t2 * w2) / (w1 + w2)
        
        process_voice(mixed_voice, f"{out_name}.wav")
        
    except Exception as e:
        print(f"Failed to mix {v1_name}/{v2_name}: {e}")

print("✅ Processing Complete.")