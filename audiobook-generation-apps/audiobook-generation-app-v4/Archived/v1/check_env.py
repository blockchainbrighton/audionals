#!/usr/bin/env python3
"""
Sanity check for the one-shot audiobook tool.

What it verifies:
- Python version (>=3.10)
- Required packages import
- ffmpeg availability
- Environment variables & file paths
- ElevenLabs API reachability (optional, if ELEVEN_API_KEY is set)
- Output directory writeability

Run:
  python check_env.py
"""

import os
import sys
import shutil
import pathlib
import subprocess
import json

MIN_PY = (3, 10)

REQUIRED_PKGS = [
    "httpx",
    "tenacity",
    "python-dotenv",
    "pydub",
    "mutagen",
    "python_docx",      # import name is 'docx' (we check both)
    "pdfminer.six",
    "markdown",
    "beautifulsoup4",
]

def import_ok():
    missing = []
    # map to actual import names
    name_map = {
        "python_docx": "docx",
        "pdfminer.six": "pdfminer",
        "beautifulsoup4": "bs4",
    }
    for pkg in REQUIRED_PKGS:
        mod = name_map.get(pkg, pkg)
        try:
            __import__(mod)
        except Exception:
            missing.append(pkg)
    return missing

def check_ffmpeg():
    return shutil.which("ffmpeg") is not None

def check_file(path):
    if not path:
        return False, "not set"
    p = pathlib.Path(path)
    if not p.exists():
        return False, f"missing ({p})"
    if p.is_dir():
        return False, f"is a directory ({p})"
    return True, str(p)

def check_outdir(outdir):
    try:
        p = pathlib.Path(outdir)
        p.mkdir(parents=True, exist_ok=True)
        testfile = p / ".write_test"
        testfile.write_text("ok", encoding="utf-8")
        testfile.unlink(missing_ok=True)
        return True, str(p)
    except Exception as e:
        return False, f"{outdir} -> {e}"

def check_eleven_api(api_key):
    if not api_key:
        return None, "ELEVEN_API_KEY not set (skipping API call)"
    try:
        import httpx
        r = httpx.get("https://api.elevenlabs.io/v1/voices",
                      headers={"xi-api-key": api_key},
                      timeout=20)
        if r.status_code == 200:
            data = r.json()
            voices = [v.get("name") for v in data.get("voices", [])][:5]
            return True, f"reachable (sample voices: {', '.join(voices) if voices else 'none returned'})"
        return False, f"HTTP {r.status_code}: {r.text[:180]}"
    except Exception as e:
        return False, f"error: {e}"

def main():
    print("== Audiobook Tool – Environment Check ==")

    # Python version
    py_ok = sys.version_info >= MIN_PY
    print(f"Python: {sys.version.split()[0]}  -> {'OK' if py_ok else 'Too old (need >= 3.10)'}")
    if not py_ok:
        sys.exit(1)

    # Packages
    missing = import_ok()
    if missing:
        print("Packages: MISSING ->", ", ".join(missing))
        print("Try: pip install -U httpx==0.27.0 tenacity python-dotenv pydub mutagen python-docx pdfminer.six markdown beautifulsoup4")
        sys.exit(1)
    else:
        print("Packages: OK")

    # ffmpeg
    if check_ffmpeg():
        try:
            out = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, timeout=10)
            line = out.stdout.splitlines()[0] if out.stdout else "ffmpeg found"
        except Exception:
            line = "ffmpeg found (version check skipped)"
        print(f"ffmpeg: {line}")
    else:
        print("ffmpeg: NOT FOUND (install it: macOS `brew install ffmpeg`, Ubuntu `sudo apt-get install ffmpeg`, Windows `choco install ffmpeg`)")

    # Env + paths
    input_path = os.getenv("INPUT_PATH", "")
    book_title = os.getenv("BOOK_TITLE", "")
    book_author = os.getenv("BOOK_AUTHOR", "")
    outdir = os.getenv("OUTPUT_DIR", f"./output/{(book_title or 'book').lower().replace(' ', '-')}")
    model = os.getenv("ELEVEN_MODEL", "eleven_turbo_v2_5")
    concurrency = os.getenv("CONCURRENCY", "8")
    voices = os.getenv("PREF_VOICES", "Jessica,Sarah")

    ok, detail = check_file(input_path)
    print(f"INPUT_PATH: {'OK' if ok else 'ERR'} -> {detail}")
    print(f"BOOK_TITLE: {'OK' if book_title else 'ERR'} -> {book_title or 'not set'}")
    print(f"BOOK_AUTHOR: {'OK' if book_author else 'ERR'} -> {book_author or 'not set'}")
    print(f"ELEVEN_MODEL: {model}   | CONCURRENCY: {concurrency}   | PREF_VOICES: {voices}")

    ok_out, out_detail = check_outdir(outdir)
    print(f"OUTPUT_DIR: {'OK' if ok_out else 'ERR'} -> {out_detail}")

    # ElevenLabs reachability (optional)
    api_key = os.getenv("ELEVEN_API_KEY", "")
    api_ok, api_detail = check_eleven_api(api_key)
    label = "OK" if api_ok else ("SKIP" if api_ok is None else "ERR")
    print(f"ElevenLabs API: {label} -> {api_detail}")

    # Final verdict
    errs = []
    if not ok: errs.append("INPUT_PATH")
    if not book_title: errs.append("BOOK_TITLE")
    if not book_author: errs.append("BOOK_AUTHOR")
    if not ok_out: errs.append("OUTPUT_DIR")
    if api_ok is False: errs.append("ELEVEN_API")

    if errs:
        print("\nStatus: ❌ Issues detected ->", ", ".join(errs))
        sys.exit(1)
    else:
        print("\nStatus: ✅ Environment looks good. You can run:  python audiobook_tool.py")

if __name__ == "__main__":
    main()
