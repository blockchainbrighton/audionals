#!/usr/bin/env python3
"""
One-click audiobook generator (dual-voice aware) - v3

Features:
- Load manuscript from TXT / DOCX / MD / PDF
- Smart Narrator Synthesis:
    - Automatically detects the starting narrator for each chapter by name.
    - Speaks chapter titles and narrator headings (e.g., "Demetri.", "DIANA.").
    - Correctly alternates voices after "***" markers, which are stripped from audio.
- Smart chunking (sentence-aware) within model limits.
- Async ElevenLabs TTS (parallel), with resilient retries.
- Generates per-chapter MP3s, a stitched master file, and a 2-minute QC reel.
- Applies loudness normalization & basic ID3 tagging.

Env vars:
  ELEVEN_API_KEY     (required)
  INPUT_PATH         (required) path to .txt/.docx/.md/.pdf
  BOOK_TITLE         (required)
  BOOK_AUTHOR        (required)
  PREF_VOICES        (required, e.g., "Demetri,Diana")
                      - First name is Voice A, second is Voice B.
                      - These names are used to detect the starting narrator in the text.
  ELEVEN_MODEL       (optional, default "eleven_turbo_v2_5")
  CONCURRENCY        (optional, default "8")
  OUTPUT_DIR         (optional, default "./output/<slug-of-book-title>")
  PRIMARY_CHUNK_CHAR_LIMIT (optional) override primary chunk size before fallback
  FALLBACK_CHUNK_CHAR_LIMIT (optional) override fallback chunk size when a chunk times out
"""

import os
import re
import sys
import io
import json
import pathlib
import asyncio
from dataclasses import dataclass
from typing import List, Tuple, Dict

# Third-party
try:
    import httpx
    from tenacity import retry, stop_after_attempt, wait_exponential, RetryError
    from dotenv import load_dotenv
    from pydub import AudioSegment
    from mutagen.easyid3 import EasyID3
except ImportError as e:
    print("Missing dependencies. Please run 'pip install -r requirements.txt' first.")
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
    "eleven_turbo_v2_5": 40000,
    "eleven_flash_v2_5": 40000,
    "eleven_multilingual_v2": 10000,
}
DEFAULT_PRIMARY_CHUNK_LIMITS = {model: int(limit * 0.9) for model, limit in MODEL_LIMITS.items()}
DEFAULT_FALLBACK_CHUNK_LIMITS = {
    "eleven_turbo_v2_5": 4000,
    "eleven_flash_v2_5": 4000,
    "eleven_multilingual_v2": 3000,
}
CHAPTER_RE = re.compile(r"(?im)^(?:chapter|part|kapitel)\b[^\n]*$|^\s*#.+$", re.MULTILINE)
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

def normalize_whitespace(s: str) -> str:
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = s.replace("\u000C", "").replace("\u00AD", "")  # form feed, soft hyphen
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

def split_chapters(text: str) -> List[str]:
    indices = [m.start() for m in CHAPTER_RE.finditer(text)]
    if not indices or indices != 0:
        indices.insert(0, 0)
    parts = []
    for i, idx in enumerate(indices):
        start = idx
        end = indices[i + 1] if i + 1 < len(indices) else len(text)
        part = text[start:end].strip()
        if part:
            parts.append(part)
    return parts if parts else [text.strip()]
    
def sentence_chunks(text: str, max_chars: int) -> List[str]:
    sents = re.findall(r'[^.!?…]+[.!?…]+[\"\'’)]*\s*|[^.!?…]+$', text) or [text]
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
                for i in range(0, len(s), max_chars):
                    part = s[i:i+max_chars].strip()
                    if part: chunks.append(part)
                buf = ""
    if buf.strip():
        chunks.append(buf.strip())
    return chunks

def ensure_ffmpeg():
    try:
        _ = AudioSegment.silent(duration=10)
    except Exception:
        print("Fatal: pydub/ffmpeg is not available. Make sure ffmpeg is installed and in your system's PATH.", file=sys.stderr)
        sys.exit(1)

def tag_file(path: str, title: str, artist: str, album: str, track: int = 0):
    try:
        audio = EasyID3(path)
    except Exception:
        from mutagen.mp3 import MP3
        mp3 = MP3(path)
        try: mp3.add_tags()
        except Exception: pass
        mp3.save()
        audio = EasyID3(path)
    audio["title"] = title
    audio["artist"] = artist
    audio["album"] = album
    if track > 0:
        audio["tracknumber"] = str(track)
    audio.save()

def stitch_files(file_paths: List[str], out_full: str, silence_ms: int = 2500, normalize_db: float = -16.0):
    sil = AudioSegment.silent(duration=silence_ms)
    full = AudioSegment.empty()
    for fp in file_paths:
        a = AudioSegment.from_file(fp)
        if a.dBFS != float("-inf"):
            a = a.apply_gain(normalize_db - a.dBFS)
        full += a + sil
    full.export(out_full, format="mp3", bitrate="128k")

# ------------ Dual-voice planning ------------

def split_by_asterisms_alternate(
    text: str, 
    voice_a_id: str, 
    voice_b_id: str,
    max_chars: int, 
    starts_with_a: bool = True
) -> List[Tuple[str, str]]:
    """
    Splits text by '***', alternates voices, and chunks the text.
    Headings are KEPT in the text to be spoken.
    """
    fragments = TRIPLE_ASTERISM.split(text)
    items: List[Tuple[str, str]] = []

    current_is_a = starts_with_a
    for frag in fragments:
        frag = frag.strip()

        if frag:
            vid = voice_a_id if current_is_a else voice_b_id
            for chunk in sentence_chunks(frag, max_chars=max_chars):
                if chunk.strip():
                    items.append((vid, chunk.strip()))
        
        # Toggle voice for the next section
        current_is_a = not current_is_a

    return items

# ------------ ElevenLabs client ------------

class ElevenTTS:
    def __init__(self, api_key: str, model_id: str):
        self.api_key = api_key
        self.model_id = model_id
        self.client = httpx.AsyncClient(
            headers={"xi-api-key": api_key, "accept": "audio/mpeg", "Content-Type": "application/json"},
            timeout=120,
        )

    async def close(self):
        await self.client.aclose()

    async def get_voices(self) -> List[Dict]:
        r = await self.client.get(f"{ELEVEN_API}/voices")
        r.raise_for_status()
        return r.json().get("voices", [])

    async def resolve_voice_ids(self, preferred_names: Tuple[str, ...]) -> Dict[str, str]:
        cache_path = pathlib.Path("voices_cache.json")
        cache: Dict[str, str] = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}

        out: Dict[str, str] = {name: cache[name] for name in preferred_names if name in cache}
        unresolved = [name for name in preferred_names if name not in out]

        if unresolved:
            voices = await self.get_voices()
            by_name = {v["name"].lower(): v["voice_id"] for v in voices}
            for name in unresolved:
                vid = by_name.get(name.lower())
                if vid:
                    out[name] = vid
                    cache[name] = vid
            cache_path.write_text(json.dumps(cache, indent=2), encoding="utf-8")
        
        missing = [name for name in preferred_names if name not in out]
        if missing:
            raise RuntimeError(f"Requested voices not found: {', '.join(missing)}. Check names in ElevenLabs and PREF_VOICES.")
        return out

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=2, max=20))
    async def tts_chunk(self, voice_id: str, text: str) -> bytes:
        payload = {"text": text, "model_id": self.model_id}
        url = f"{ELEVEN_API}/text-to-speech/{voice_id}"
        r = await self.client.post(url, json=payload)
        r.raise_for_status()
        return r.content

# ------------ Orchestration ------------

@dataclass
class RunConfig:
    api_key: str
    input_path: str
    book_title: str
    book_author: str
    preferred_voices: Tuple[str, ...]
    model_id: str
    model_limit: int
    concurrency: int
    outdir: pathlib.Path
    primary_chunk_char_limit: int
    fallback_chunk_char_limit: int

async def synthesize_book(cfg: RunConfig):
    ensure_ffmpeg()
    raw = read_text_from_file(cfg.input_path)
    raw = normalize_whitespace(raw)
    chapters = split_chapters(raw)
    print(f"Detected {len(chapters)} chapter-like sections.")

    tts = ElevenTTS(cfg.api_key, cfg.model_id)
    try:
        voice_map = await tts.resolve_voice_ids(cfg.preferred_voices)
    except Exception as e:
        await tts.close()
        raise e

    voiceA_name, voiceB_name = cfg.preferred_voices
    voiceA_id, voiceB_id = voice_map[voiceA_name], voice_map[voiceB_name]
    print(f"Using voices A/B: {voiceA_name} / {voiceB_name}, model: {cfg.model_id}")

    primary_cap = min(cfg.model_limit, cfg.primary_chunk_char_limit)
    fallback_cap = min(cfg.fallback_chunk_char_limit, primary_cap)
    if fallback_cap >= primary_cap and primary_cap > 1:
        fallback_cap = max(1, primary_cap // 2)
    if primary_cap <= 0:
        raise RuntimeError("Primary chunk size must be greater than zero.")
    if fallback_cap <= 0:
        fallback_cap = 1
    print(f"Max characters per chunk: {primary_cap} (fallback: {fallback_cap})")

    cfg.outdir.mkdir(parents=True, exist_ok=True)
    temp_dir = cfg.outdir / "temp_chunks"
    temp_dir.mkdir(exist_ok=True)

    sem = asyncio.Semaphore(cfg.concurrency)
    tasks: List[asyncio.Task] = []
    job_records: List[Dict] = []
    job_ix = 0

    async def synth_save(ch_idx: int, job_idx: int, vid: str, text: str, out_path: pathlib.Path):
        async with sem:
            try:
                mp3_bytes = await tts.tts_chunk(vid, text)
                out_path.write_bytes(mp3_bytes)
                return str(out_path)
            except RetryError as err:
                if len(text) <= fallback_cap or fallback_cap == primary_cap:
                    raise err
                print(
                    f"Chunk {job_idx} text length {len(text)} timed out; retrying in segments of {fallback_cap} chars."
                )
                segments = sentence_chunks(text, fallback_cap)
                if len(segments) <= 1:
                    raise err
                combined = AudioSegment.empty()
                for sub_idx, seg_text in enumerate(segments, start=1):
                    sub_bytes = await tts.tts_chunk(vid, seg_text)
                    buffer = io.BytesIO(sub_bytes)
                    buffer.seek(0)
                    combined += AudioSegment.from_file(buffer, format="mp3")
                combined.export(out_path, format="mp3", bitrate="128k")
                return str(out_path)

    skipped_cached = 0

    for ci, ch_text in enumerate(chapters):
        # Check the first few lines of the chapter text for the name of Voice B's character.
        # If it's not found, we assume it starts with Voice A.
        header_check = "\n".join(ch_text.splitlines()[:3]).lower()
        starts_with_a = voiceB_name.lower() not in header_check
        
        span_items = split_by_asterisms_alternate(
            ch_text, voiceA_id, voiceB_id, primary_cap, starts_with_a
        )
        
        for vid, span_text in span_items:
            job_ix += 1
            out_path = temp_dir / f"ch{ci + 1:03d}_{job_ix:04d}.mp3"
            record = {
                "chapter": ci + 1,
                "job_idx": job_ix,
                "voice_id": vid,
                "text": span_text,
                "path": out_path,
            }

            if out_path.exists() and out_path.stat().st_size > 0:
                skipped_cached += 1
                record["status"] = "cached"
            else:
                task = asyncio.create_task(synth_save(ci + 1, job_ix, vid, span_text, out_path))
                record["task"] = task
                tasks.append(task)
            job_records.append(record)
    
    if skipped_cached:
        print(f"Reusing {skipped_cached} existing chunk(s) from {temp_dir}.")
    if tasks:
        print(f"Queued {len(tasks)} synthesis jobs...")
        results = await asyncio.gather(*tasks, return_exceptions=True)
        task_result_map = {task: result for task, result in zip(tasks, results)}
    else:
        print("No new synthesis needed; all chunks already present.")
        task_result_map = {}

    failures = []
    for rec in job_records:
        task = rec.get("task")
        if task:
            result = task_result_map.get(task)
            if isinstance(result, Exception):
                failures.append((rec, result))
            else:
                rec["path"] = pathlib.Path(result)
        else:
            if not rec["path"].exists() or rec["path"].stat().st_size == 0:
                failures.append((rec, RuntimeError("Existing chunk missing or empty")))

    if failures:
        print("\nSome chunks failed to synthesize:")
        for rec, err in failures:
            print(f"  Chapter {rec['chapter']}, chunk {rec['job_idx']}: {err}")
        print(f"Partial audio remains in {temp_dir}. Fix the issue and re-run to resume.")
        await tts.close()
        raise RuntimeError("Chunk synthesis failed; see details above.")

    chapter_mp3s: List[str] = []

    chapter_chunks: Dict[int, List[Tuple[int, str]]] = {i + 1: [] for i in range(len(chapters))}
    for rec in job_records:
        chapter_chunks[rec["chapter"]].append((rec["job_idx"], str(rec["path"])))

    for chapter_idx in range(1, len(chapters) + 1):
        paths = [p for _, p in sorted(chapter_chunks[chapter_idx], key=lambda item: item[0])]
        ch_segment = AudioSegment.empty()
        for p in paths:
            ch_segment += AudioSegment.from_file(p)
        
        ch_name = cfg.outdir / f"{chapter_idx:02d}_Chapter.mp3"
        ch_segment.export(ch_name, format="mp3", bitrate="128k")
        tag_file(str(ch_name), f"Chapter {chapter_idx}", cfg.book_author, cfg.book_title, track=chapter_idx)
        chapter_mp3s.append(str(ch_name))

    print("Stitching full audiobook...")
    full_path = cfg.outdir / "_full_book.mp3"
    stitch_files(chapter_mp3s, str(full_path), silence_ms=2500, normalize_db=-16.0)
    tag_file(str(full_path), cfg.book_title, cfg.book_author, cfg.book_title)

    print("Creating QC reel...")
    full_audio = AudioSegment.from_file(full_path)
    qc_path = cfg.outdir / "_qc_reel_2m.mp3"
    full_audio[:120_000].export(qc_path, format="mp3", bitrate="128k")

    await tts.close()
    
    # Cleanup temp files
    for f in temp_dir.glob("*.mp3"): f.unlink()
    temp_dir.rmdir()

    print("\nDone.")
    print(f"Output folder: {cfg.outdir.resolve()}")

def load_config_from_env() -> RunConfig:
    load_dotenv()
    api_key = os.getenv("ELEVEN_API_KEY", "")
    input_path = os.getenv("INPUT_PATH", "")
    book_title = os.getenv("BOOK_TITLE", "")
    book_author = os.getenv("BOOK_AUTHOR", "")

    if not all([api_key, input_path, book_title, book_author]):
        raise SystemExit("Missing required env vars: ELEVEN_API_KEY, INPUT_PATH, BOOK_TITLE, BOOK_AUTHOR")

    pref_raw = os.getenv("PREF_VOICES", "")
    pref = tuple([s.strip() for s in pref_raw.split(",") if s.strip()])
    if len(pref) < 2:
        raise SystemExit("PREF_VOICES must contain two comma-separated names (e.g., 'Demetri,Diana')")
        
    model_id = os.getenv("ELEVEN_MODEL", "eleven_turbo_v2_5")
    concurrency = int(os.getenv("CONCURRENCY", "8"))
    outdir_env = os.getenv("OUTPUT_DIR", "")
    outdir = pathlib.Path(outdir_env) if outdir_env else pathlib.Path("output") / slugify(book_title)

    model_limit = MODEL_LIMITS.get(model_id, 10000)

    primary_env = os.getenv("PRIMARY_CHUNK_CHAR_LIMIT", "").strip()
    if primary_env:
        try:
            primary_chunk_limit = int(primary_env)
        except ValueError:
            raise SystemExit("PRIMARY_CHUNK_CHAR_LIMIT must be an integer if provided.")
    else:
        primary_chunk_limit = DEFAULT_PRIMARY_CHUNK_LIMITS.get(model_id, int(model_limit * 0.9))

    if primary_chunk_limit <= 0:
        raise SystemExit("PRIMARY_CHUNK_CHAR_LIMIT must be greater than zero.")

    primary_chunk_limit = min(primary_chunk_limit, model_limit)

    fallback_env = os.getenv("FALLBACK_CHUNK_CHAR_LIMIT", "").strip()
    if fallback_env:
        try:
            fallback_chunk_limit = int(fallback_env)
        except ValueError:
            raise SystemExit("FALLBACK_CHUNK_CHAR_LIMIT must be an integer if provided.")
    else:
        fallback_chunk_limit = DEFAULT_FALLBACK_CHUNK_LIMITS.get(model_id)
        if fallback_chunk_limit is None:
            fallback_chunk_limit = max(1, primary_chunk_limit // 3)

    if fallback_chunk_limit <= 0:
        raise SystemExit("FALLBACK_CHUNK_CHAR_LIMIT must be greater than zero.")

    if primary_chunk_limit > 1:
        fallback_chunk_limit = min(fallback_chunk_limit, primary_chunk_limit - 1)
    else:
        fallback_chunk_limit = 1

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
        primary_chunk_char_limit=primary_chunk_limit,
        fallback_chunk_char_limit=fallback_chunk_limit,
    )

def main():
    try:
        cfg = load_config_from_env()
        asyncio.run(synthesize_book(cfg))
    except (Exception, SystemExit) as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nInterrupted by user.")

if __name__ == "__main__":
    main()
