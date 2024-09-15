import whisperx
import requests
import tempfile
import os
import logging
import numpy as np
import librosa
import parselmouth
from pydub import AudioSegment
from pydub.silence import detect_nonsilent

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_URL = "https://ordinals.com/content/"
HEADERS = {"User-Agent": "Mozilla/5.0"}

def fetch_audio(ordinal_id):
    """Fetch audio content from the given ordinal ID."""
    try:
        response = requests.get(f"{BASE_URL}{ordinal_id}", headers=HEADERS, timeout=30)
        response.raise_for_status()
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio_file:
            temp_audio_file.write(response.content)
            return temp_audio_file.name
    except requests.exceptions.RequestException as e:
        logger.error(f"Error downloading audio for {ordinal_id}: {e}")

def detect_leading_silence(audio_path):
    """Detect leading silence duration in the audio file."""
    audio = AudioSegment.from_mp3(audio_path)
    nonsilent = detect_nonsilent(audio, min_silence_len=500, silence_thresh=-50)
    return nonsilent[0][0] / 1000.0 if nonsilent else 0

def analyze_audio_features(audio_path, transcription_words):
    """Analyze audio to detect music, vocals, percussion, genre, and instruments."""
    y, sr = librosa.load(audio_path, sr=None)
    duration = librosa.get_duration(y=y, sr=sr)
    tags = []
    
    # Percussive and Harmonic Components
    y_harmonic, y_percussive = librosa.effects.hpss(y)
    total_energy = np.sum(y**2)
    percussive_energy = np.sum(y_percussive**2)
    percussive_ratio = percussive_energy / total_energy if total_energy > 0 else 0
    harmonic_ratio = np.sum(y_harmonic**2) / total_energy if total_energy > 0 else 0
    
    # Initialize instrument and genre tags
    instrument_tags = []
    genre_tags = []

    # Tempo detection
    tempo = None  # Default to None if no tempo can be detected
    if duration > 1.0:  # Only calculate tempo for longer audio clips (not single hits)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    
    # Compute spectral features
    spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
    zcr = np.mean(librosa.feature.zero_crossing_rate(y))
    rolloff = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))
    mfcc_mean = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13), axis=1).tolist()

    # Genre Detection Heuristics
    if tempo and tempo > 120:
        genre_tags.append('Fast Tempo (Dance/Electronic/Punk)')
    elif tempo and tempo < 60:
        genre_tags.append('Slow Tempo (Ballad/Blues/Reggae)')
    elif tempo:
        genre_tags.append('Moderate Tempo (Pop/Rock)')

    if spectral_centroid > 4000:
        genre_tags.append('Bright Sound (Electronic/Rock)')
    elif spectral_centroid < 2000:
        genre_tags.append('Dark Sound (Classical/Jazz)')

    # Chroma features for harmonic analysis
    chroma = librosa.feature.chroma_stft(y=y_harmonic, sr=sr)
    if np.mean(chroma) > 0.5:
        tags.append('Harmonic Content')
        genre_tags.append('Pop/Classical/Rock')  # These genres tend to have more harmonic content

    # Detect Tonal Instruments based on Harmonic Content
    if harmonic_ratio > 0.3:
        instrument_tags.append('Tonal Instrument (Piano/Guitar)')

    # Instrument Detection
    if harmonic_ratio > 0.3 and spectral_centroid < 2000:
        instrument_tags.append('Bass')
    if harmonic_ratio > 0.3 and spectral_centroid > 3000:
        instrument_tags.append('Guitar')
    if harmonic_ratio > 0.4 and rolloff > 5000:
        instrument_tags.append('Piano')

    # Percussive Analysis
    percussive_tags = []
    if percussive_ratio > 0.5 and duration > 0.2:
        tags.append('Percussion')
        # Analyze percussive components
        S = np.abs(librosa.stft(y_percussive))
        freqs = librosa.fft_frequencies(sr=sr)
        
        # Define frequency bands for specific percussion instruments
        kick_band = (freqs >= 20) & (freqs <= 150)
        snare_band = (freqs >= 150) & (freqs <= 1500)
        toms_band = (freqs >= 80) & (freqs <= 600)
        hats_band = (freqs >= 5000) & (freqs <= 20000)

        kick_energy = np.sum(S[kick_band, :]**2)
        snare_energy = np.sum(S[snare_band, :]**2)
        toms_energy = np.sum(S[toms_band, :]**2)
        hats_energy = np.sum(S[hats_band, :]**2)

        total_percussive_energy = kick_energy + snare_energy + toms_energy + hats_energy

        if total_percussive_energy > 0:
            if kick_energy / total_percussive_energy > 0.4:
                percussive_tags.append('Kick Drum')
            if snare_energy / total_percussive_energy > 0.4:
                percussive_tags.append('Snare Drum')
            if toms_energy / total_percussive_energy > 0.4:
                percussive_tags.append('Toms')
            if hats_energy / total_percussive_energy > 0.4:
                percussive_tags.append('Hi-Hats/Cymbals')

        tags.extend(percussive_tags)

    # Speech/Vocal Detection
    if transcription_words:
        tags.append('Speech')
        genre_tags.append('Vocal-Based (Pop/Rap)')
        # Set tempo to None for speech
        tempo = None

    # Single Hit Detection
    if duration < 1.0 and percussive_ratio > 0.6 and harmonic_ratio < 0.2:
        tags.append('Single Hit')
        # Set tempo to None for single hits
        tempo = None

    # Music Detection
    if harmonic_ratio > 0.3 and tempo and tempo > 50:
        tags.append('Music')

    # Estimate Key if music is detected
    single_note = None
    if duration < 3.0 and 'Music' not in tags:
        single_note = identify_single_note(y, sr)
        if single_note:
            tags.append('Single Note')

    key_estimate = estimate_key(y, sr) if 'Music' in tags else None

    audio_features = {
        'duration': duration,
        'tempo': tempo if tempo else None,  # Only set tempo if it's valid
        'spectral_centroid_mean': spectral_centroid,
        'zero_crossing_rate_mean': zcr,
        'rolloff_mean': rolloff,
        'mfcc_mean': mfcc_mean,
        'percussive_ratio': percussive_ratio,
        'harmonic_ratio': harmonic_ratio,
        'single_note': single_note,
        'key_estimate': key_estimate,
        'tags': tags + instrument_tags + genre_tags  # Add the instrument and genre tags to the main tags
    }
    
    logger.info(f"Audio features for {audio_path}: {audio_features}")
    return audio_features



def identify_single_note(y, sr):
    """Identify the pitch of a single note using parselmouth (Praat)."""
    try:
        snd = parselmouth.Sound(y, sr)
        pitch = snd.to_pitch()
        pitch_values = pitch.selected_array['frequency']
        pitch_values = pitch_values[pitch_values > 0]
        if not len(pitch_values):
            return None
        pitch_freq = np.median(pitch_values)
        note_name = librosa.hz_to_note(pitch_freq)
        logger.info(f"Identified single note: {note_name} at frequency {pitch_freq:.2f} Hz")
        return note_name
    except Exception as e:
        logger.error(f"Error identifying single note: {e}")

def estimate_key(y, sr):
    """Estimate the musical key of the audio."""
    try:
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        return get_key_from_chroma(np.mean(chroma, axis=1))
    except Exception as e:
        logger.error(f"Error estimating key: {e}")

def get_key_from_chroma(chroma_vector):
    """Map chroma vector to key using template matching."""
    major_template = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                               2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_template = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                               2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    key_names = ['C', 'C#', 'D', 'D#', 'E', 'F',
                 'F#', 'G', 'G#', 'A', 'A#', 'B']
    chroma_norm = chroma_vector / np.linalg.norm(chroma_vector)
    best_key, best_correlation = None, -np.inf
    for i in range(12):
        for template, mode in [(major_template, 'Major'), (minor_template, 'Minor')]:
            template_norm = np.roll(template, i) / np.linalg.norm(np.roll(template, i))
            correlation = np.dot(chroma_norm, template_norm)
            if correlation > best_correlation:
                best_correlation = correlation
                best_key = f"{key_names[i]} {mode}"
    return best_key

def extract_pitch_and_note(y, sr):
    """Extract the main frequency and corresponding note from an audio segment."""
    try:
        f0, voiced_flag, _ = librosa.pyin(y, fmin=librosa.note_to_hz('C2'),
                                          fmax=librosa.note_to_hz('C7'), sr=sr)
        if f0 is not None and np.any(voiced_flag):
            # Use the median of the non-zero frequencies
            pitches = f0[voiced_flag]
            pitch_freq = np.median(pitches)
            note_name = librosa.hz_to_note(pitch_freq)
            return pitch_freq, note_name
    except Exception as e:
        logger.error(f"Error extracting pitch and note: {e}")
    return None, None

def process_audio(ordinal_id, audio_path, model):
    try:
        audio, sr = librosa.load(audio_path, sr=None)
        audio_duration = librosa.get_duration(y=audio, sr=sr)
        leading_silence = detect_leading_silence(audio_path)
        logger.info(f"Detected leading silence of {leading_silence:.2f} seconds for {ordinal_id}.")
        words_with_corrected_timing = []
        transcription_words = []
        if audio_duration >= 3.0:
            transcription_result = model.transcribe(audio_path, batch_size=16, language='en')
            if transcription_result.get('segments'):
                model_a, metadata = whisperx.load_align_model(transcription_result["language"], device="cpu")
                result = whisperx.align(
                    transcription_result["segments"], model_a, metadata, audio_path,
                    device="cpu", return_char_alignments=False
                )
                for segment in result["segments"]:
                    for word in segment.get("words", []):
                        start_time = word.get('start', 0) + leading_silence
                        end_time = word.get('end', 0) + leading_silence
                        if start_time < end_time:
                            # Extract audio segment for the word
                            word_audio = audio[int(start_time * sr):int(end_time * sr)]
                            # Get frequency and note
                            freq, note = extract_pitch_and_note(word_audio, sr)
                            word_entry = {
                                "word": word['word'],
                                "start_time": start_time,
                                "end_time": end_time,
                                "frequency": f"{freq:.2f} Hz" if freq else None,
                                "note": note if note else None
                            }
                            words_with_corrected_timing.append(word_entry)
                            transcription_words.append(word['word'])
            else:
                logger.info(f"No speech detected in {ordinal_id}.")
        else:
            logger.info(f"Audio duration less than 3 seconds ({audio_duration:.2f}s). Attempting to identify single note.")
        audio_features = analyze_audio_features(audio_path, transcription_words)
        return words_with_corrected_timing, audio_features
    except Exception as e:
        logger.error(f"An error occurred while processing {ordinal_id}: {e}", exc_info=True)
        return [], {}

def save_transcription_and_features(words, audio_features, ordinal_id):
    """Save transcription and audio features as a JavaScript array in the desired format."""
    js_content = f"window.transcriptions = window.transcriptions || {{}};\nwindow.transcriptions['{ordinal_id}'] = [\n"
    js_content += ''.join(
        f"  {{ word: '{escape_js_string(w['word'])}', start_time: {w['start_time']:.3f}, "
        f"end_time: {w['end_time']:.3f}, frequency: '{w['frequency']}', note: '{w['note']}' }},\n"
        for w in words
    )
    js_content += f"];\n\nwindow.audioFeatures = window.audioFeatures || {{}};\nwindow.audioFeatures['{ordinal_id}'] = {{\n"
    for key, value in audio_features.items():
        if isinstance(value, float):
            value_str = f"{value:.6f}"
        elif isinstance(value, list):
            if value and isinstance(value[0], float):
                value_str = '[' + ', '.join(f"{v:.6f}" for v in value) + ']'
            else:
                value_str = '[' + ', '.join(f"'{v}'" for v in value) + ']'
        elif isinstance(value, str):
            value_str = f"'{value}'"
        else:
            value_str = str(value).lower() if value is not None else "null"
        js_content += f"  {key}: {value_str},\n"
    js_content += "};\n"
    os.makedirs('AudioDescriptions', exist_ok=True)
    with open(os.path.join('AudioDescriptions', f"transcription_{ordinal_id}.js"), 'w') as js_file:
        js_file.write(js_content)


def escape_js_string(s):
    """Escape special characters in a string for JavaScript."""
    return s.replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')

def transcribe_words(ordinal_id, model):
    audio_path = fetch_audio(ordinal_id)
    if audio_path:
        words, audio_features = process_audio(ordinal_id, audio_path, model)
        if words is not None and audio_features is not None:
            save_transcription_and_features(words, audio_features, ordinal_id)
            logger.info(f"Transcription for {ordinal_id}: {words if words else 'No transcription generated.'}")
        os.remove(audio_path)

def process_ordinal_ids(ordinal_ids, model):
    for ordinal_id in ordinal_ids:
        logger.info(f"Processing ordinal ID: {ordinal_id}")
        transcribe_words(ordinal_id, model)

if __name__ == "__main__":
    # Load the WhisperX model once
    model = whisperx.load_model("base", device="cpu", compute_type="int8")
    # Example usage with a list of ordinal IDs
    ordinal_ids = [
        "1a64b97fa332a1e1c70186a6b1db23a924a953330f700456200d342b8c1b142ai0",
        "8e06b01f0c7aa98b42c2f09bcff483f3686424e7ca74a67d3b7938672a677d10i0",
        "66046fa4827d8f2c5c5b23e6668b5442b59c8057f129f73f5156fa6c8eda5a32i0",
        "3be3fd8fa6bca0da3dd1e272b40e61d3619cbc650a4bc3c5345ff191be98f9a4i0",
        "71b1dd7e3767419d62b334e62c51c4d910d0f33ca31b2e39c19346d9fb1fe61ci0",
        "71733b9732ce8a963eb57414a30853fb90de3ef0ab8ef5b50cc34fc14c5b2608i0"
        # Add other IDs as needed
    ]
    process_ordinal_ids(ordinal_ids, model)
