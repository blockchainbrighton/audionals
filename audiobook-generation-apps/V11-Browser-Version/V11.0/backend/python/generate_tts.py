import sys
import json
import os
import torch
import soundfile as sf
import numpy as np
from kokoro import KPipeline

# Initialize Pipeline globally for reuse if we keep it running
# But for child_process simple mode, we init every time (slow)
# TODO: Future - keep process alive

def get_pipeline(lang_code='a'):
    return KPipeline(lang_code=lang_code)

def generate(text, voice, output_path, speed=1.0):
    pipeline = get_pipeline()
    generator = pipeline(text, voice=voice, speed=speed)
    
    all_audio = []
    for i, (gs, ps, audio) in enumerate(generator):
        all_audio.append(audio)
    
    if len(all_audio) > 0:
        final_audio = np.concatenate(all_audio)
        sf.write(output_path, final_audio, 24000)
        return True
    return False

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            return

        data = json.loads(input_data)
        command = data.get('command')

        if command == 'list_voices':
            # Simplified voice list based on Kokoro defaults
            # In a real scenario, we might scan the voices folder
            voices = [
                {"id": "af_heart", "name": "Heart (Female)", "gender": "F"},
                {"id": "af_bella", "name": "Bella (Female)", "gender": "F"},
                {"id": "af_sky", "name": "Sky (Female)", "gender": "F"},
                {"id": "af_nicole", "name": "Nicole (Female)", "gender": "F"},
                {"id": "am_michael", "name": "Michael (Male)", "gender": "M"},
                {"id": "am_adam", "name": "Adam (Male)", "gender": "M"},
            ]
            print(json.dumps({"status": "success", "voices": voices}))

        elif command == 'generate':
            text = data.get('text')
            voice = data.get('voice', 'af_heart')
            output_path = data.get('output_path')
            speed = data.get('speed', 1.0)

            if not text or not output_path:
                print(json.dumps({"status": "error", "message": "Missing text or output_path"}))
                return

            success = generate(text, voice, output_path, speed)
            if success:
                print(json.dumps({"status": "success", "output_path": output_path}))
            else:
                print(json.dumps({"status": "error", "message": "Generation failed"}))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == "__main__":
    main()
