import torch
from kokoro import KPipeline
import soundfile as sf

# --------------------------------------------------------
# SETTINGS
# 'a' = American English. 
# Other codes: 'b' (British), 'j' (Japanese), 'z' (Chinese)
LANG_CODE = 'a' 

# 'af_heart' is the default female voice.
# Try 'am_michael' for male, or 'af_bella' for another female voice.
VOICE_NAME = 'af_heart' 
# --------------------------------------------------------

# Initialize the pipeline
print("Loading model... (this may take a moment the first time)")
pipeline = KPipeline(lang_code=LANG_CODE) 

text = '''
Kokoro is now successfully installed on your MacBook Air!
This model is running locally on your hardware.
'''

# Generate audio
print(f"Generating audio with voice: {VOICE_NAME}...")
generator = pipeline(text, voice=VOICE_NAME, speed=1)

# Save the audio file
for i, (gs, ps, audio) in enumerate(generator):
    filename = f'test_audio.wav'
    sf.write(filename, audio, 24000)
    print(f"Success! Audio saved to: {filename}")