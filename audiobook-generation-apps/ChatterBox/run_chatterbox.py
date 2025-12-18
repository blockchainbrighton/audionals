import torch
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

# 1. Setup Mac Acceleration (MPS)
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Running on device: {device}")

# 2. Patch for Mac torch.load issue
map_location = torch.device(device)
torch_load_original = torch.load
def patched_torch_load(*args, **kwargs):
    if 'map_location' not in kwargs:
        kwargs['map_location'] = map_location
    return torch_load_original(*args, **kwargs)
torch.load = patched_torch_load

# 3. Load Model & Generate
print("Downloading model (this happens once)...")
model = ChatterboxTTS.from_pretrained(device=device)

text = "Chatterbox is now running on my MacBook Air."
wav = model.generate(text)

ta.save("test_output.wav", wav, model.sr)
print("Success! Check test_output.wav")