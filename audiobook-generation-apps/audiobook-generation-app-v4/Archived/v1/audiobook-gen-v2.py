#!/usr/bin/env python3
"""
One-click audiobook generator (dual-voice aware)

Features:
- Load manuscript from TXT / DOCX / MD / PDF
- Detect "***" voice-switch markers (tolerates ZWSP and spaces), never send them to TTS
- Alternate voices A/B per span between markers
- Smart chunking (sentence-aware) within model limits
- Async ElevenLabs TTS (parallel), resilient retries
- Per-chapter MP3s + stitched master + 2-minute QC reel
- Loudness normalization & basic ID3 tagging

Env vars:
  ELEVEN_API_KEY     (required)
  INPUT_PATH         (required) path to .txt/.docx/.md/.pdf
  BOOK_TITLE         (required)
  BOOK_AUTHOR        (required)
  PREF_VOICES        (optional, default "Jessica,Clyde")
                      - First name = Voice A (before first ***), second = Voice B
                      - If only one provided, A=B
  ELEVEN_MODEL       (optional, default "eleven_turbo_v2_5")
  CONCURRENCY        (optional, default "8")
  OUTPUT_DIR         (optional, default "./output/<slug-of-book-title>")
"""

import os
import re
import io
import sys
import uuid
import json
import math
import time
import pathlib
import asyncio
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional

# Third-party
try:
    import httpx
    from tenacity import retry, stop_after_attempt, wait_exponential
    from dotenv import load_dotenv
    from pydub import AudioSegment
    from mutagen.easyid3 import EasyID3
except ImportError as e:
    print("Missing dependencies. Please install requirements first.")
    print(e)
    sys.exit(1)

# Optional loaders
def _safe_imports():
    mods = {}
    try:
        import docx
        mods["docx"] = docx
    except Exception:
        mods["docx"] = None
    try:
        from pdfminer.high_level import extract_text as pdf_extract_text
        mods["pdf_extract_text"] = pdf_extract_text
    except Exception:
        mods["pdf_extract_text"] = None
    try:
        import markdown as md
        from bs4 import BeautifulSoup
        mods["markdown"] = md
        mods["BeautifulSoup"] = BeautifulSoup
    except Exception:
        mods["markdown"] = None
        mods["BeautifulSoup"] = None
    return mods

MODS = _safe_imports()

# ------------ Config ------------

ELEVEN_API = "https://api.elevenlabs.io/v1"

MODEL_LIMITS = {
    # Practical character limits; adjust if your account differs
    "eleven_turbo_v2_5": 40000,
    "eleven_flash_v2_5": 40000,
    "eleven_multilingual_v2": 10000,
    "eleven_v3": 3000
}

CHAPTER_RE = re.compile(r"(?im)^(?:chapter|part|kapitel)\b[^\n]*$|^\s*#.+$", re.MULTILINE)

# Matches three asterisks with optional spaces / ZW chars in between, e.g. "***", "* * *", "*\u200B*\u200B*"
TRIPLE_ASTERISM = re.compile(r'(?:\*[\s\u200B\u200C\u200D\u00A0]?){3}')

# ------------ Utilities ------------

def slugify(s: str) -> str:
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    s = re.sub(r"\s+", "-", s.strip())
    return s.lower()

def read_text_from_file(path: str) -> str:
    p = pathlib.Path(path)
    if not p.exists():
        raise FileNotFoundError(f"INPUT_PATH not found: {path}")

    ext = p.suffix.lower()
    if ext == ".txt":
        return p.read_text(encoding="utf-8", errors="ignore")

    if ext == ".docx":
        if not MODS["docx"]:
            raise RuntimeError("python-docx not installed. pip install python-docx")
        doc = MODS["docx"].Document(str(p))
        return "\n\n".join(para.text for para in doc.paragraphs)

    if ext in [".md", ".markdown"]:
        txt = p.read_text(encoding="utf-8", errors="ignore")
        # Convert MD to plaintext by going MD->HTML->plain
        if not (MODS["markdown"] and MODS["BeautifulSoup"]):
            return txt
        html = MODS["markdown"].markdown(txt)
        soup = MODS["BeautifulSoup"](html, "html.parser")
        return soup.get_text("\n")

    if ext == ".pdf":
        if not MODS["pdf_extract_text"]:
            raise RuntimeError("pdfminer.six not installed. pip install pdfminer.six")
        return MODS["pdf_extract_text"](str(p))

    raise ValueError(f"Unsupported file extension: {ext}")

def clean_control_chars(s: str) -> str:
    # Normalize + remove control/formatting glyphs that can cause TTS clicks/pauses
    return (
        s
        .normalize("NFC") if hasattr(s, "normalize") else s  # Py<3.12 fallback
    )

def normalize_whitespace(s: str) -> str:
    # Also remove common noisy glyphs: form feed and soft hyphen
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = s.replace("\u000C", "")     # form feed
    s = s.replace("\u00AD", "")     # soft hyphen
    # collapse trailing spaces before newline and huge blank blocks
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

def split_chapters(text: str) -> List[str]:
    indices = [m.start() for m in CHAPTER_RE.finditer(text)]
    if not indices:
        return [text.strip()]
    parts = []
    for i, idx in enumerate(indices):
        end = indices[i + 1] if i + 1 < len(indices) else len(text)
        parts.append(text[idx:end].strip())
    return parts

def sentence_chunks(text: str, max_chars: int, keep_newlines: bool = True) -> List[str]:
    """Sentence-aware greedy chunking with hard split fallback for very long sentences."""
    t = text if keep_newlines else re.sub(r"\s*\n\s*", " ", text)
    # Split into sentences; keep trailing punctuation and closing quotes/brackets.
    sents = re.findall(r"[^.!?…]+[.!?…]+[\"')\]]*\s*|[^.!?…]+$", t) or [t]
    chunks: List[str] = []
    buf = ""
    for s in sents:
        if len(buf) + len(s) <= max_chars:
            buf += s
        else:
            if buf:
                chunks.append(buf.strip())
            if len(s) <= max_chars:
                buf = s
            else:
                # Hard split long sentence
                for i in range(0, len(s), max_chars):
                    part = s[i:i+max_chars].strip()
                    if part:
                        chunks.append(part)
                buf = ""
    if buf.strip():
        chunks.append(buf.strip())
    return chunks

def ensure_ffmpeg():
    try:
        _ = AudioSegment.silent(duration=10)
    except Exception:
        print("Warning: pydub/ffmpeg may not be available. Make sure ffmpeg is installed.")

def tag_file(path: str, title: str, artist: str, album: str):
    try:
        audio = EasyID3(path)
    except Exception:
        from mutagen.mp3 import MP3
        mp3 = MP3(path)
        try:
            mp3.add_tags()
        except Exception:
            pass
        mp3.save()
        audio = EasyID3(path)
    audio["title"] = title
    audio["artist"] = artist
    audio["album"] = album
    audio.save()

def stitch_files(file_paths: List[str], out_full: str, silence_ms_between: int = 2500, normalize_db: float = -16.0):
    sil = AudioSegment.silent(duration=silence_ms_between)
    segs = []
    for fp in file_paths:
        a = AudioSegment.from_file(fp)
        if a.dBFS != float("-inf"):
            a = a.apply_gain(normalize_db - a.dBFS)
        segs.append(a)
    full = AudioSegment.empty()
    for i, s in enumerate(segs):
        full += s
        if i < len(segs) - 1:
            full += sil
    full.export(out_full, format="mp3", bitrate="128k")

# ------------ Dual-voice planning ------------

@dataclass
class PlanItem:
    chapter_index: int
    job_index: int
    voice_id: str
    text: str

def split_by_asterisms_alternate(text: str, voice_a: str, voice_b: str, max_chars: int) -> List[Tuple[str, str]]:
    """
    Split text into spans by *** (robust regex) and pair each span with the alternating voice id.
    Returns list of (voice_id, span_text) without the markers.
    """
    # Split on markers, they are not included in fragments
    fragments = TRIPLE_ASTERISM.split(text)
    items: List[Tuple[str, str]] = []

    # Voice assignment: start with A for pre-first-marker span
    current_is_a = True
    for frag in fragments:
        frag = frag.strip()
        # Even if empty, we still toggle voice after the boundary,
        # but we only enqueue non-empty text
        if frag:
            vid = voice_a if current_is_a else voice_b
            # Chunk spans sentence-wise for reliability/prosody
            for chunk in sentence_chunks(frag, max_chars=max_chars, keep_newlines=True):
                if chunk.strip():
                    items.append((vid, chunk.strip()))
        # Toggle voice for the next span (i.e., after asterism boundary)
        current_is_a = not current_is_a

    return items

# ------------ ElevenLabs client ------------

class ElevenTTS:
    def __init__(self, api_key: str, model_id: str):
        self.api_key = api_key
        self.model_id = model_id
        self.client = httpx.AsyncClient(
            headers={
                "xi-api-key": api_key,
                "accept": "audio/mpeg",
                "Content-Type": "application/json",
            },
            timeout=120,
        )

    async def close(self):
        await self.client.aclose()

    async def get_voices(self):
        r = await self.client.get(f"{ELEVEN_API}/voices")
        r.raise_for_status()
        return r.json().get("voices", [])

    async def resolve_voice_ids(self, preferred_names: Tuple[str, ...]) -> Dict[str, str]:
        """
        Return mapping name->voice_id for given preferred names (up to 2 used).
        Caches by name in voices_cache.json.
        """
        cache_path = pathlib.Path("voices_cache.json")
        cache: Dict[str, str] = {}
        if cache_path.exists():
            try:
                cache = json.loads(cache_path.read_text(encoding="utf-8"))
            except Exception:
                cache = {}

        names = [n for n in preferred_names if n]
        if not names:
            raise RuntimeError("No preferred voices provided in PREF_VOICES.")
        # Only first two matter for A/B
        names = names[:2]

        # Attempt cache hits
        out: Dict[str, str] = {}
        unresolved = []
        for name in names:
            vid = cache.get(name)
            if vid:
                out[name] = vid
            else:
                unresolved.append(name)

        if unresolved:
            voices = await self.get_voices()
            by_name = {v["name"]: v["voice_id"] for v in voices}
            for name in unresolved:
                if name in by_name:
                    vid = by_name[name]
                    out[name] = vid
                    cache[name] = vid
                else:
                    # Best-effort fuzzy: case-insensitive match
                    for k, v in by_name.items():
                        if k.lower() == name.lower():
                            out[name] = v
                            cache[name] = v
                            break

            cache_path.write_text(json.dumps(cache, indent=2), encoding="utf-8")

        # Verify all resolved
        missing = [n for n in names if n not in out]
        if missing:
            available = ", ".join(sorted(cache.keys()))
            raise RuntimeError(f"Requested voices not found: {', '.join(missing)}. Check your ElevenLabs voice names.")

        return out

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=2, max=20))
    async def tts_chunk(self, voice_id: str, text: str) -> bytes:
        payload = {"text": text, "model_id": self.model_id}
        url = f"{ELEVEN_API}/text-to-speech/{voice_id}"
        r = await self.client.post(url, json=payload)
        if r.status_code == 400 and "too many characters" in r.text.lower():
            raise ValueError("Chunk exceeded model character limit.")
        r.raise_for_status()
        return r.content  # MP3 bytes

# ------------ Orchestration ------------

@dataclass
class RunConfig:
    api_key: str
    input_path: str
    book_title: str
    book_author: str
    preferred_voices: Tuple[str, ...]  # names, e.g. ("Jessica","Clyde")
    model_id: str
    model_limit: int
    concurrency: int
    outdir: pathlib.Path

async def synthesize_book(cfg: RunConfig):
    ensure_ffmpeg()

    raw = read_text_from_file(cfg.input_path)
    raw = normalize_whitespace(raw)

    chapters = split_chapters(raw)
    print(f"Detected {len(chapters)} chapter-like sections.")

    tts = ElevenTTS(cfg.api_key, cfg.model_id)
    try:
        voice_map = await tts.resolve_voice_ids(cfg.preferred_voices)
    except Exception:
        await tts.close()
        raise

    # Assign A/B voices
    names = list(cfg.preferred_voices[:2])
    if len(names) == 0:
        raise RuntimeError("Provide at least one preferred voice in PREF_VOICES.")
    if len(names) == 1:
        names = [names[0], names[0]]
    voiceA_name, voiceB_name = names[0], names[1]
    voiceA_id = voice_map.get(voiceA_name) or voice_map[names[0]]
    voiceB_id = voice_map.get(voiceB_name) or voice_map[names[1]]
    print(f"Using voices A/B: {voiceA_name} ({voiceA_id}) / {voiceB_name} ({voiceB_id}), model: {cfg.model_id}")

    cfg.outdir.mkdir(parents=True, exist_ok=True)

    sem = asyncio.Semaphore(cfg.concurrency)
    tasks: List[asyncio.Task] = []
    chapter_to_futures: List[List[asyncio.Task]] = []
    job_ix = 0

    async def synth_save(ix: int, vid: str, text: str):
        async with sem:
            mp3 = await tts.tts_chunk(vid, text)
            out = cfg.outdir / f"{ix:05d}_{uuid.uuid4().hex[:6]}.mp3"
            with open(out, "wb") as w:
                w.write(mp3)
            return str(out)

    # Build plan per chapter: split by asterisms, alternate voices, chunk within model limits
    soft_cap = int(cfg.model_limit * 0.88)

    for ci, ch in enumerate(chapters, start=1):
        # Split/chunk with alternating voices
        span_items = split_by_asterisms_alternate(ch, voiceA_id, voiceB_id, max_chars=soft_cap)
        if not span_items:
            # fallback – treat whole chapter as single-voice A
            span_items = [(voiceA_id, ch)]
        sub_futures: List[asyncio.Task] = []
        for vid, span in span_items:
            # Enqueue this span's chunks as individual jobs (already chunked)
            job_ix += 1
            fut = asyncio.create_task(synth_save(job_ix, vid, span))
            tasks.append(fut)
            sub_futures.append(fut)
        chapter_to_futures.append(sub_futures)

    print(f"Queued {len(tasks)} synthesis jobs across {len(chapters)} chapter sections…")

    # Gather all results (order preserved by our mapping below)
    all_paths = await asyncio.gather(*tasks)

    # Map futures back to paths in chapter order
    it = iter(all_paths)
    chapter_paths: List[List[str]] = []
    for sub_f in chapter_to_futures:
        paths = [next(it) for _ in sub_f]
        chapter_paths.append(paths)

    # Export per-chapter files (concatenate chunks without extra gap)
    from pydub import AudioSegment as AS
    chapter_mp3s: List[str] = []
    for i, paths in enumerate(chapter_paths, start=1):
        seg = AS.silent(duration=10)
        for p in paths:
            seg += AS.from_file(p)
        ch_name = cfg.outdir / f"{i:02d} Chapter.mp3"
        seg.export(ch_name, format="mp3", bitrate="128k")
        try:
            tag_file(str(ch_name), f"Chapter {i}", cfg.book_author, cfg.book_title)
        except Exception:
            pass
        chapter_mp3s.append(str(ch_name))

    # Stitch full book with 2.5s gaps + normalize to ~-16 dBFS
    full_path = cfg.outdir / "_full_book.mp3"
    stitch_files(chapter_mp3s, str(full_path), silence_ms_between=2500, normalize_db=-16.0)
    try:
        tag_file(str(full_path), cfg.book_title, cfg.book_author, cfg.book_title)
    except Exception:
        pass

    # 2-minute QC reel
    full = AudioSegment.from_file(full_path)
    qc = full[:120_000]
    qc_path = cfg.outdir / "_qc_reel_2m.mp3"
    qc.export(qc_path, format="mp3", bitrate="128k")

    await tts.close()

    print("\nDone.")
    print(f"Folder: {cfg.outdir}")
    print(f"- Full: {full_path}")
    print(f"- QC:   {qc_path}")
    print(f"- Chapters: {len(chapter_mp3s)} files")

def load_config_from_env() -> RunConfig:
    load_dotenv()

    api_key = os.getenv("ELEVEN_API_KEY", "").strip()
    input_path = os.getenv("INPUT_PATH", "").strip()
    book_title = os.getenv("BOOK_TITLE", "").strip()
    book_author = os.getenv("BOOK_AUTHOR", "").strip()
    if not api_key or not input_path or not book_title or not book_author:
        missing = [k for k, v in [
            ("ELEVEN_API_KEY", api_key),
            ("INPUT_PATH", input_path),
            ("BOOK_TITLE", book_title),
            ("BOOK_AUTHOR", book_author),
        ] if not v]
        raise SystemExit(f"Missing required env vars: {', '.join(missing)}")

    pref_raw = os.getenv("PREF_VOICES", "Jessica,Clyde")
    pref = tuple([s.strip() for s in pref_raw.split(",") if s.strip()])
    if not pref:
        pref = ("Jessica", "Clyde")

    model_id = os.getenv("ELEVEN_MODEL", "eleven_turbo_v2_5").strip()
    model_limit = MODEL_LIMITS.get(model_id, 10000)
    concurrency = int(os.getenv("CONCURRENCY", "8").strip() or "8")

    outdir_env = os.getenv("OUTPUT_DIR", "").strip()
    outdir = pathlib.Path(outdir_env) if outdir_env else pathlib.Path("output") / slugify(book_title)

    return RunConfig(
        api_key=api_key,
        input_path=input_path,
        book_title=book_title,
        book_author=book_author,
        preferred_voices=pref,
        model_id=model_id,
        model_limit=model_limit,
        concurrency=concurrency,
        outdir=outdir,
    )

def main():
    try:
        cfg = load_config_from_env()
        asyncio.run(synthesize_book(cfg))
    except KeyboardInterrupt:
        print("\nInterrupted.")
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
