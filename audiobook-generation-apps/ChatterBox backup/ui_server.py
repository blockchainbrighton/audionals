import gc
import logging
import os
import platform
import re
import threading
import time
import uuid
from collections import OrderedDict
from datetime import datetime
from pathlib import Path

# Allow PyTorch to fall back for unsupported MPS kernels on Apple Silicon.
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import torch
import torchaudio as ta
from flask import Flask, jsonify, request, send_from_directory

from chatterbox.tts import ChatterboxTTS


BASE_DIR = Path(__file__).resolve().parent
VOICES_DIR = Path(os.getenv("CHATTERBOX_VOICES_DIR", str(BASE_DIR / "voices")))
OUTPUTS_DIR = Path(os.getenv("CHATTERBOX_OUTPUTS_DIR", str(BASE_DIR / "generated_audio")))
MAX_TEXT_LENGTH = int(os.getenv("CHATTERBOX_MAX_TEXT_LENGTH", "6000"))
MPS_CHUNK_CHARS = int(os.getenv("CHATTERBOX_MPS_CHUNK_CHARS", "220"))
CHUNK_PAUSE_MS = int(os.getenv("CHATTERBOX_CHUNK_PAUSE_MS", "70"))
VOICE_CACHE_SIZE = int(os.getenv("CHATTERBOX_VOICE_CACHE_SIZE", "4"))
CPU_THREADS = int(os.getenv("CHATTERBOX_CPU_THREADS", str(min(8, os.cpu_count() or 8))))
PRELOAD_MODEL = os.getenv("CHATTERBOX_PRELOAD_MODEL", "1") == "1"
JOB_RETENTION_SECONDS = int(os.getenv("CHATTERBOX_JOB_RETENTION_SECONDS", "3600"))
LOG_LEVEL = os.getenv("CHATTERBOX_LOG_LEVEL", "INFO").upper()
LOG_PROGRESS_EVERY_CHUNKS = max(1, int(os.getenv("CHATTERBOX_LOG_PROGRESS_EVERY_CHUNKS", "1")))

VOICE_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}
IS_APPLE_SILICON = platform.system() == "Darwin" and platform.machine().lower() in {"arm64", "aarch64"}

app = Flask(__name__, static_folder="web", static_url_path="/static")

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)-7s | %(threadName)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("chatterbox-ui")

_model = None
_cpu_model = None
_builtin_conds_by_device = {}
_model_lock = threading.Lock()
_cpu_model_lock = threading.Lock()
_generate_lock = threading.Lock()
_voice_cond_cache_by_device = {}
_last_generation_stats = {"seconds": None, "chunks": None}

_jobs = {}
_jobs_lock = threading.Lock()


def utc_now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def detect_device() -> str:
    configured = os.getenv("CHATTERBOX_DEVICE", "auto").strip().lower()
    if configured in {"cpu", "cuda", "mps"}:
        if configured == "cuda" and not torch.cuda.is_available():
            logger.warning("CHATTERBOX_DEVICE=cuda requested but CUDA unavailable; falling back to cpu")
            return "cpu"
        if configured == "mps" and not torch.backends.mps.is_available():
            logger.warning("CHATTERBOX_DEVICE=mps requested but MPS unavailable; falling back to cpu")
            return "cpu"
        return configured

    if IS_APPLE_SILICON and torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


DEVICE = detect_device()
logger.info("Startup device selected: %s (AppleSilicon=%s, log_level=%s)", DEVICE, IS_APPLE_SILICON, LOG_LEVEL)


def configure_runtime() -> None:
    try:
        torch.set_float32_matmul_precision("high")
    except Exception:
        pass

    # CPU fallback defaults tuned for lightweight Macs.
    if DEVICE == "cpu":
        try:
            torch.set_num_threads(max(1, CPU_THREADS))
            torch.set_num_interop_threads(1)
            logger.info("CPU runtime configured: threads=%s interop_threads=1", max(1, CPU_THREADS))
        except Exception:
            pass


configure_runtime()


def ensure_dirs() -> None:
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    logger.debug("Ensured directories: voices=%s outputs=%s", VOICES_DIR, OUTPUTS_DIR)


def get_voice_cache(device_key: str):
    cache = _voice_cond_cache_by_device.get(device_key)
    if cache is None:
        cache = OrderedDict()
        _voice_cond_cache_by_device[device_key] = cache
    return cache


def get_model() -> ChatterboxTTS:
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                logger.info("Loading primary ChatterBox model on device=%s", DEVICE)
                start = time.perf_counter()
                _model = ChatterboxTTS.from_pretrained(device=DEVICE)
                _builtin_conds_by_device[DEVICE] = _model.conds
                logger.info("Primary model loaded on %s in %.2fs", DEVICE, time.perf_counter() - start)
    return _model


def get_cpu_fallback_model() -> ChatterboxTTS:
    global _cpu_model
    if _cpu_model is None:
        with _cpu_model_lock:
            if _cpu_model is None:
                logger.warning("Loading CPU fallback model (MPS path could not complete)")
                try:
                    torch.set_num_threads(max(1, CPU_THREADS))
                    torch.set_num_interop_threads(1)
                except Exception:
                    pass
                # CPU fallback is slower but avoids MPS output channel hard limit failures.
                start = time.perf_counter()
                _cpu_model = ChatterboxTTS.from_pretrained(device="cpu")
                _builtin_conds_by_device["cpu"] = _cpu_model.conds
                logger.warning("CPU fallback model loaded in %.2fs", time.perf_counter() - start)
    return _cpu_model


def list_voices():
    ensure_dirs()
    voices = [{"id": "__default__", "name": "Default (built-in ChatterBox voice)"}]
    for file_path in sorted(VOICES_DIR.iterdir()):
        if file_path.is_file() and file_path.suffix.lower() in VOICE_EXTENSIONS:
            voices.append({"id": file_path.name, "name": file_path.stem.replace("_", " ")})
    logger.debug("Listed %d voices from %s", len(voices), VOICES_DIR)
    return voices


def resolve_voice_path(voice_id: str):
    if not voice_id or voice_id == "__default__":
        return None
    safe_name = Path(voice_id).name
    candidate = VOICES_DIR / safe_name
    if not candidate.exists() or not candidate.is_file():
        raise ValueError(f"Voice file '{safe_name}' not found in '{VOICES_DIR}'.")
    if candidate.suffix.lower() not in VOICE_EXTENSIONS:
        raise ValueError("Voice file type is not supported.")
    return candidate


def parse_float(payload, key, minimum, maximum, default):
    raw_value = payload.get(key, default)
    try:
        value = float(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"'{key}' must be a number.") from exc
    if value < minimum or value > maximum:
        raise ValueError(f"'{key}' must be between {minimum} and {maximum}.")
    return value


def split_by_words(text: str, max_chars: int):
    words = text.split()
    if not words:
        return []

    def expand_word(word: str):
        if len(word) <= max_chars:
            return [word]
        return [word[i : i + max_chars] for i in range(0, len(word), max_chars)]

    chunks = []
    current = ""
    for raw_word in words:
        for word in expand_word(raw_word):
            if not current:
                current = word
                continue
            candidate = f"{current} {word}"
            if len(candidate) <= max_chars:
                current = candidate
            else:
                chunks.append(current)
                current = word

    if current:
        chunks.append(current)
    return chunks


def split_text_for_mps(text: str, max_chars: int):
    text = " ".join(text.split())
    if max_chars <= 0 or len(text) <= max_chars:
        return [text]

    sentence_pieces = re.split(r"(?<=[.!?])\s+", text)
    normalized = []
    for sentence in sentence_pieces:
        sentence = sentence.strip()
        if not sentence:
            continue

        if len(sentence) <= max_chars:
            normalized.append(sentence)
            continue

        clause_pieces = re.split(r"(?<=[,;:])\s+", sentence)
        for clause in clause_pieces:
            clause = clause.strip()
            if not clause:
                continue
            if len(clause) <= max_chars:
                normalized.append(clause)
            else:
                normalized.extend(split_by_words(clause, max_chars))

    if not normalized:
        return [text]

    chunks = []
    current = ""
    for piece in normalized:
        candidate = piece if not current else f"{current} {piece}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = piece
    if current:
        chunks.append(current)
    return chunks


def stitch_chunks(chunks, sample_rate: int):
    if len(chunks) == 1:
        return chunks[0]

    pause_samples = max(0, int(sample_rate * (CHUNK_PAUSE_MS / 1000.0)))
    parts = []
    for idx, chunk in enumerate(chunks):
        parts.append(chunk)
        if pause_samples > 0 and idx < len(chunks) - 1:
            parts.append(torch.zeros((1, pause_samples), dtype=chunk.dtype))
    return torch.cat(parts, dim=1)


def set_voice_conditionals(model: ChatterboxTTS, voice_path: Path | None, exaggeration: float) -> None:
    device_key = str(getattr(model, "device", DEVICE))
    if _builtin_conds_by_device.get(device_key) is None:
        _builtin_conds_by_device[device_key] = model.conds

    if voice_path is None:
        model.conds = _builtin_conds_by_device[device_key]
        logger.debug("Voice conds: using built-in default voice on device=%s", device_key)
        return

    voice_key = str(voice_path.resolve())
    cache = get_voice_cache(device_key)
    cache_key = f"{device_key}:{voice_key}"
    cached = cache.get(cache_key)
    if cached is None:
        logger.info("Voice conds cache miss on %s: preparing %s", device_key, voice_path.name)
        start = time.perf_counter()
        model.prepare_conditionals(voice_key, exaggeration=exaggeration)
        cache[cache_key] = model.conds
        cache.move_to_end(cache_key)
        while len(cache) > VOICE_CACHE_SIZE:
            cache.popitem(last=False)
        logger.info("Voice conds prepared in %.2fs (cache_size=%d)", time.perf_counter() - start, len(cache))
    else:
        cache.move_to_end(cache_key)
        model.conds = cached
        logger.debug("Voice conds cache hit on %s: %s", device_key, voice_path.name)


def maybe_clear_mps_cache() -> None:
    if DEVICE != "mps":
        return
    try:
        if hasattr(torch, "mps") and hasattr(torch.mps, "empty_cache"):
            torch.mps.empty_cache()
            logger.debug("Cleared MPS cache")
    except Exception:
        pass


def generate_audio(
    model: ChatterboxTTS,
    text: str,
    voice_path: Path | None,
    settings: dict,
    chunk_chars: int,
    progress_cb=None,
    log_tag: str = "",
):
    set_voice_conditionals(model, voice_path, settings["exaggeration"])
    device_key = str(getattr(model, "device", DEVICE))
    normalized_text = " ".join(text.split())
    chunks = split_text_for_mps(normalized_text, chunk_chars) if chunk_chars > 0 else [normalized_text]

    total_chars = sum(len(chunk_text) for chunk_text in chunks)
    chars_done = 0
    logger.info(
        "%s generation start: device=%s chunks=%d chunk_chars=%s total_chars=%d voice=%s",
        log_tag,
        device_key,
        len(chunks),
        chunk_chars if chunk_chars > 0 else "disabled",
        total_chars,
        voice_path.name if voice_path else "__default__",
    )
    if progress_cb:
        progress_cb(0, len(chunks), chars_done, total_chars, "generating")

    generated = []
    for idx, chunk_text in enumerate(chunks, start=1):
        chunk_start = time.perf_counter()
        generated.append(
            model.generate(
                chunk_text,
                audio_prompt_path=None,
                exaggeration=settings["exaggeration"],
                cfg_weight=settings["cfg_weight"],
                temperature=settings["temperature"],
                repetition_penalty=settings["repetition_penalty"],
                min_p=settings["min_p"],
                top_p=settings["top_p"],
            )
        )
        chunk_seconds = time.perf_counter() - chunk_start
        chars_done += len(chunk_text)
        if progress_cb:
            progress_cb(idx, len(chunks), chars_done, total_chars, "generating")
        if idx == 1 or idx == len(chunks) or idx % LOG_PROGRESS_EVERY_CHUNKS == 0:
            logger.info(
                "%s chunk %d/%d complete: chunk_chars=%d elapsed=%.2fs",
                log_tag,
                idx,
                len(chunks),
                len(chunk_text),
                chunk_seconds,
            )

    return stitch_chunks(generated, model.sr), len(chunks), total_chars


def is_mps_limit_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(marker in msg for marker in ("mps", "out of memory", "output channels"))


def generate_with_retry(
    model: ChatterboxTTS,
    text: str,
    voice_path: Path | None,
    settings: dict,
    progress_cb=None,
    job_id: str | None = None,
):
    log_tag = f"[job={job_id}]" if job_id else "[job=unknown]"
    # CPU or CUDA mode: single direct generation path.
    if DEVICE != "mps":
        logger.info("%s non-MPS path selected: device=%s", log_tag, DEVICE)
        wav, chunk_count, total_chars = generate_audio(
            model,
            text,
            voice_path,
            settings,
            0,
            progress_cb=progress_cb,
            log_tag=log_tag,
        )
        return wav, chunk_count, total_chars, DEVICE

    # MPS mode: progressively reduce chunk size before falling back to CPU.
    attempt_sizes = []
    for size in (
        MPS_CHUNK_CHARS,
        max(140, MPS_CHUNK_CHARS // 2),
        120,
        96,
        80,
        64,
        48,
        36,
    ):
        if size not in attempt_sizes:
            attempt_sizes.append(size)
    logger.info("%s MPS attempt plan: chunk_sizes=%s", log_tag, attempt_sizes)

    last_exc = None
    for chunk_size in attempt_sizes:
        try:
            logger.info("%s attempting MPS generation with chunk_size=%d", log_tag, chunk_size)
            wav, chunk_count, total_chars = generate_audio(
                model,
                text,
                voice_path,
                settings,
                chunk_size,
                progress_cb=progress_cb,
                log_tag=log_tag,
            )
            logger.info("%s MPS generation succeeded with chunk_size=%d", log_tag, chunk_size)
            return wav, chunk_count, total_chars, "mps"
        except RuntimeError as exc:
            if not is_mps_limit_error(exc):
                raise
            last_exc = exc
            logger.warning(
                "%s MPS generation failed at chunk_size=%d: %s",
                log_tag,
                chunk_size,
                exc,
            )
            maybe_clear_mps_cache()
            gc.collect()
            if progress_cb:
                progress_cb(0, 0, 0, 0, f"retrying_mps_{chunk_size}")

    if progress_cb:
        progress_cb(0, 0, 0, 0, "fallback_cpu_loading")
    logger.warning("%s all MPS attempts failed; switching to CPU fallback", log_tag)
    cpu_model = get_cpu_fallback_model()
    if progress_cb:
        progress_cb(0, 0, 0, 0, "fallback_cpu_generating")
    try:
        wav, chunk_count, total_chars = generate_audio(
            cpu_model,
            text,
            voice_path,
            settings,
            max(120, MPS_CHUNK_CHARS),
            progress_cb=progress_cb,
            log_tag=log_tag,
        )
        logger.warning("%s CPU fallback generation succeeded", log_tag)
        return wav, chunk_count, total_chars, "cpu"
    except Exception as cpu_exc:
        logger.exception("%s CPU fallback generation failed", log_tag)
        if last_exc is not None:
            raise RuntimeError(f"MPS failed ({last_exc}); CPU fallback failed ({cpu_exc})") from cpu_exc
        raise


def prune_jobs_locked(now_ts: float) -> None:
    stale_ids = [
        job_id
        for job_id, job in _jobs.items()
        if job.get("finished_at_ts") and (now_ts - job["finished_at_ts"] > JOB_RETENTION_SECONDS)
    ]
    for job_id in stale_ids:
        _jobs.pop(job_id, None)


def create_job(text: str, voice_path: Path | None, settings: dict) -> str:
    job_id = uuid.uuid4().hex[:12]
    now_ts = time.time()
    with _jobs_lock:
        prune_jobs_locked(now_ts)
        _jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "stage": "queued",
            "message": "Queued",
            "progress": 0.0,
            "elapsed_seconds": 0.0,
            "eta_seconds": None,
            "speed_chars_per_second": 0.0,
            "chunks_done": 0,
            "chunks_total": 0,
            "text_chars": len(text),
            "voice": voice_path.name if voice_path else "__default__",
            "submitted_at": utc_now_iso(),
            "started_at": None,
            "finished_at": None,
            "created_at_ts": now_ts,
            "finished_at_ts": None,
            "generation_seconds": None,
            "total_seconds": None,
            "file": None,
            "audio_url": None,
            "sample_rate": None,
            "device_used": None,
            "error": None,
        }
    logger.info(
        "[job=%s] queued: text_chars=%d voice=%s settings=%s",
        job_id,
        len(text),
        voice_path.name if voice_path else "__default__",
        settings,
    )
    return job_id


def update_job(job_id: str, **updates) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job.update(updates)


def finish_job_failed(job_id: str, error_message: str) -> None:
    now_ts = time.time()
    update_job(
        job_id,
        status="failed",
        stage="failed",
        message="Generation failed",
        error=error_message,
        progress=1.0,
        finished_at=utc_now_iso(),
        finished_at_ts=now_ts,
    )


def run_generation_job(job_id: str, text: str, voice_path: Path | None, settings: dict) -> None:
    logger.info("[job=%s] worker started", job_id)
    total_start = time.perf_counter()
    update_job(
        job_id,
        status="running",
        stage="loading_model",
        message="Loading model",
        progress=0.01,
        started_at=utc_now_iso(),
    )

    try:
        model = get_model()
    except Exception as exc:
        logger.exception("[job=%s] model load failed", job_id)
        finish_job_failed(job_id, f"Model load failed: {exc}")
        return

    generation_start = time.perf_counter()

    def on_progress(chunks_done: int, chunks_total: int, chars_done: int, total_chars: int, stage: str) -> None:
        elapsed = max(time.perf_counter() - generation_start, 1e-6)
        speed_chars = (chars_done / elapsed) if chars_done else 0.0
        remaining_chars = max(total_chars - chars_done, 0)
        eta = (remaining_chars / speed_chars) if speed_chars > 0 else None

        if stage.startswith("retrying_mps_"):
            chunk_size = stage.rsplit("_", 1)[-1]
            logger.warning("[job=%s] retrying MPS with smaller chunks: %s", job_id, chunk_size)
            update_job(
                job_id,
                stage="retrying",
                message=f"MPS limit reached, retrying at ~{chunk_size} chars/chunk",
                progress=0.02,
                chunks_done=0,
                chunks_total=0,
                elapsed_seconds=round(elapsed, 2),
                eta_seconds=None,
                speed_chars_per_second=0.0,
            )
            return

        if stage == "fallback_cpu_loading":
            logger.warning("[job=%s] loading CPU fallback model", job_id)
            update_job(
                job_id,
                stage="fallback_cpu_loading",
                message="MPS still failed, loading CPU fallback model",
                progress=0.03,
                chunks_done=0,
                chunks_total=0,
                elapsed_seconds=round(elapsed, 2),
                eta_seconds=None,
                speed_chars_per_second=0.0,
            )
            return

        if stage == "fallback_cpu_generating":
            logger.warning("[job=%s] switched to CPU fallback generation", job_id)
            update_job(
                job_id,
                stage="fallback_cpu_generating",
                message="Generating on CPU fallback",
                progress=0.05,
                chunks_done=0,
                chunks_total=0,
                elapsed_seconds=round(elapsed, 2),
                eta_seconds=None,
                speed_chars_per_second=0.0,
            )
            return

        progress = (chunks_done / chunks_total) if chunks_total else 0.0
        if chunks_done and chunks_total and (chunks_done == 1 or chunks_done == chunks_total or chunks_done % LOG_PROGRESS_EVERY_CHUNKS == 0):
            logger.info(
                "[job=%s] progress %d/%d elapsed=%.2fs eta=%s speed=%.2f ch/s",
                job_id,
                chunks_done,
                chunks_total,
                elapsed,
                round(eta, 2) if eta is not None else "n/a",
                speed_chars,
            )
        update_job(
            job_id,
            stage="generating",
            message="Generating audio",
            progress=progress,
            chunks_done=chunks_done,
            chunks_total=chunks_total,
            elapsed_seconds=round(elapsed, 2),
            eta_seconds=round(eta, 2) if eta is not None else None,
            speed_chars_per_second=round(speed_chars, 2),
        )

    try:
        with _generate_lock:
            logger.info("[job=%s] acquired generation lock", job_id)
            wav, chunk_count, _total_chars, device_used = generate_with_retry(
                model,
                text,
                voice_path,
                settings,
                progress_cb=on_progress,
                job_id=job_id,
            )

            update_job(job_id, stage="saving", message="Saving WAV", progress=0.99)
            logger.info("[job=%s] saving output wav", job_id)

            output_name = f"chatterbox-{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}.wav"
            output_path = OUTPUTS_DIR / output_name
            ta.save(str(output_path), wav, model.sr)

    except Exception as exc:
        logger.exception("[job=%s] generation failed", job_id)
        finish_job_failed(job_id, f"Generation failed: {exc}")
        return

    generation_seconds = round(time.perf_counter() - generation_start, 3)
    total_seconds = round(time.perf_counter() - total_start, 3)
    _last_generation_stats["seconds"] = generation_seconds
    _last_generation_stats["chunks"] = chunk_count

    now_ts = time.time()
    update_job(
        job_id,
        status="completed",
        stage="completed",
        message="Completed",
        progress=1.0,
        chunks_done=chunk_count,
        chunks_total=chunk_count,
        eta_seconds=0.0,
        generation_seconds=generation_seconds,
        total_seconds=total_seconds,
        file=output_name,
        audio_url=f"/audio/{output_name}",
        sample_rate=model.sr,
        device_used=device_used,
        finished_at=utc_now_iso(),
        finished_at_ts=now_ts,
    )
    logger.info(
        "[job=%s] completed: device_used=%s chunks=%d generation_seconds=%.3f total_seconds=%.3f file=%s",
        job_id,
        device_used,
        chunk_count,
        generation_seconds,
        total_seconds,
        output_name,
    )


def count_jobs_by_status():
    with _jobs_lock:
        queued = sum(1 for job in _jobs.values() if job.get("status") == "queued")
        running = sum(1 for job in _jobs.values() if job.get("status") == "running")
        completed = sum(1 for job in _jobs.values() if job.get("status") == "completed")
        failed = sum(1 for job in _jobs.values() if job.get("status") == "failed")
    return {"queued": queued, "running": running, "completed": completed, "failed": failed}


@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.route("/api/health")
def health():
    return jsonify(
        {
            "ok": True,
            "device": DEVICE,
            "model_loaded": _model is not None,
            "optimized_for_apple_silicon": IS_APPLE_SILICON,
            "log_level": LOG_LEVEL,
            "mps_chunk_chars": MPS_CHUNK_CHARS if DEVICE == "mps" else None,
            "voice_cache_size": VOICE_CACHE_SIZE,
            "voice_cache_entries": sum(len(cache) for cache in _voice_cond_cache_by_device.values()),
            "last_generation_seconds": _last_generation_stats["seconds"],
            "last_generation_chunks": _last_generation_stats["chunks"],
            "jobs": count_jobs_by_status(),
            "voices_dir": str(VOICES_DIR),
            "outputs_dir": str(OUTPUTS_DIR),
        }
    )


@app.route("/api/voices")
def voices():
    return jsonify({"voices": list_voices()})


@app.route("/api/generate", methods=["POST"])
def generate():
    ensure_dirs()
    payload = request.get_json(silent=True) or {}
    logger.info("Incoming /api/generate request")
    text = str(payload.get("text", "")).strip()
    if not text:
        logger.warning("Rejected /api/generate: empty text")
        return jsonify({"error": "Text is required."}), 400
    if len(text) > MAX_TEXT_LENGTH:
        logger.warning("Rejected /api/generate: text too long chars=%d max=%d", len(text), MAX_TEXT_LENGTH)
        return jsonify({"error": f"Text is too long. Max length is {MAX_TEXT_LENGTH} characters."}), 400

    try:
        voice_path = resolve_voice_path(str(payload.get("voice", "__default__")))
        settings = {
            "exaggeration": parse_float(payload, "exaggeration", 0.25, 2.0, 0.5),
            "cfg_weight": parse_float(payload, "cfg_weight", 0.0, 1.0, 0.5),
            "temperature": parse_float(payload, "temperature", 0.05, 5.0, 0.8),
            "repetition_penalty": parse_float(payload, "repetition_penalty", 1.0, 3.0, 1.2),
            "min_p": parse_float(payload, "min_p", 0.0, 1.0, 0.05),
            "top_p": parse_float(payload, "top_p", 0.01, 1.0, 1.0),
        }
    except ValueError as exc:
        logger.warning("Rejected /api/generate: invalid params (%s)", exc)
        return jsonify({"error": str(exc)}), 400

    job_id = create_job(text, voice_path, settings)
    worker = threading.Thread(target=run_generation_job, args=(job_id, text, voice_path, settings), daemon=True)
    worker.start()
    logger.info("[job=%s] worker thread started", job_id)

    return (
        jsonify(
            {
                "ok": True,
                "job_id": job_id,
                "status_url": f"/api/jobs/{job_id}",
            }
        ),
        202,
    )


@app.route("/api/jobs/<job_id>")
def job_status(job_id):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            logger.warning("[job=%s] status requested but job not found", job_id)
            return jsonify({"error": "Job not found."}), 404
        logger.debug("[job=%s] status requested: %s", job_id, job.get("status"))
        return jsonify(dict(job))


@app.route("/audio/<path:filename>")
def serve_audio(filename):
    return send_from_directory(OUTPUTS_DIR, Path(filename).name)


if __name__ == "__main__":
    ensure_dirs()
    logger.info(
        "Server config: host=%s port=%s preload=%s mps_chunk_chars=%s cpu_threads=%s cache=%s",
        os.getenv("CHATTERBOX_HOST", "127.0.0.1"),
        int(os.getenv("CHATTERBOX_PORT", "7860")),
        PRELOAD_MODEL,
        MPS_CHUNK_CHARS,
        CPU_THREADS,
        VOICE_CACHE_SIZE,
    )
    if PRELOAD_MODEL:
        try:
            logger.info("Preloading model on startup...")
            get_model()
            logger.info("Startup preload complete")
        except Exception as exc:
            logger.exception("Model preload failed: %s", exc)
    host = os.getenv("CHATTERBOX_HOST", "127.0.0.1")
    port = int(os.getenv("CHATTERBOX_PORT", "7860"))
    app.run(host=host, port=port, debug=False)
