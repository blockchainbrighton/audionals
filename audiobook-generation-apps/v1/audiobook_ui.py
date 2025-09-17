#!/usr/bin/env python3
# Minimal local web UI for the audiobook generator
import os, io, uuid, pathlib, asyncio, tempfile
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, Request, UploadFile, Form, File
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import Template

# Import your existing engine pieces
from audiobook_tool import RunConfig, synthesize_book, MODEL_LIMITS, slugify

app = FastAPI(title="Audiobook Generator")

# Simple in-memory job store (MVP)
JOBS: Dict[str, Dict[str, Any]] = {}

# Serve the output/ folder so the browser can play the files
OUTPUT_ROOT = pathlib.Path("output").absolute()
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/output", StaticFiles(directory=str(OUTPUT_ROOT)), name="output")

INDEX_HTML = Template("""
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Audiobook Generator</title>
  <style>
    body { font-family: system-ui, -apple-system, Arial, sans-serif; max-width: 860px; margin: 32px auto; padding: 0 16px; }
    header { display:flex; align-items:center; gap: 12px; margin-bottom: 16px; }
    .card { border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    label { display:block; font-weight:600; margin: 12px 0 4px; }
    input[type=text], textarea, select { width:100%; padding:10px; border:1px solid #ccc; border-radius:8px; }
    .row { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .actions { margin-top: 16px; display:flex; gap:10px; }
    button { padding:10px 16px; border:0; background:#111; color:#fff; border-radius:8px; cursor:pointer; }
    .muted { color:#666; font-size: 12px; }
    .drop { border:2px dashed #bbb; border-radius:10px; padding:18px; text-align:center; }
  </style>
</head>
<body>
  <header>
    <h1>One-Click Audiobook Generator</h1>
  </header>

  <form class="card" action="/start" method="post" enctype="multipart/form-data">
    <div class="row">
      <div>
        <label>Book title *</label>
        <input type="text" name="book_title" placeholder="Series – Book 3" required />
      </div>
      <div>
        <label>Author *</label>
        <input type="text" name="book_author" placeholder="Relay Publishing" required />
      </div>
    </div>

    <label>Voice preference (comma-order)</label>
    <input type="text" name="pref_voices" value="Jessica,Sarah" />

    <div class="row">
      <div>
        <label>Model</label>
        <select name="model_id">
          <option value="eleven_turbo_v2_5" selected>eleven_turbo_v2_5 (fast, large chunks)</option>
          <option value="eleven_flash_v2_5">eleven_flash_v2_5 (fast)</option>
          <option value="eleven_multilingual_v2">eleven_multilingual_v2 (smaller chunks)</option>
          <option value="eleven_v3">eleven_v3</option>
        </select>
      </div>
      <div>
        <label>Concurrency</label>
        <input type="text" name="concurrency" value="8" />
      </div>
    </div>

    <div class="card" style="background:#fafafa">
      <strong>Provide manuscript via one of the following:</strong>
      <label style="margin-top:10px">A) Upload (drag & drop)</label>
      <div class="drop" ondrop="dropHandler(event)" ondragover="event.preventDefault()">
        <input id="file" type="file" name="upload" accept=".docx,.txt,.md,.markdown,.pdf" />
        <div class="muted">DOCX / TXT / MD / PDF</div>
      </div>

      <label>B) Paste text</label>
      <textarea name="pasted_text" rows="8" placeholder="Paste full manuscript text here..."></textarea>

      <label>C) Local file path</label>
      <input type="text" name="path_text" placeholder="/absolute/path/to/manuscript.docx" />
      <div class="muted">If both upload and paste/path are provided, uploaded file wins.</div>
    </div>

    <div class="actions">
      <button type="submit">Generate Audiobook</button>
      <a class="muted" href="https://elevenlabs.io" target="_blank" rel="noreferrer">Check API quota</a>
    </div>
  </form>

  <script>
    function dropHandler(ev){
      ev.preventDefault();
      const dt = ev.dataTransfer;
      if (dt && dt.files && dt.files.length) {
        document.getElementById('file').files = dt.files;
      }
    }
  </script>
</body>
</html>
""")

STATUS_HTML = Template("""
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Job {{job_id}}</title>
  <style> body { font-family: system-ui, -apple-system, Arial, sans-serif; max-width: 860px; margin: 32px auto; padding: 0 16px; } </style>
</head>
<body>
  <h2>Status: {{status}}</h2>
  {% if status == "running" %}
    <p>Working… This page will auto-refresh.</p>
    <script> setTimeout(()=> location.reload(), 3000); </script>
  {% elif status == "error" %}
    <pre style="white-space: pre-wrap; color: #b00;">{{error}}</pre>
  {% elif status == "done" %}
    <p>Output folder: <code>{{outdir}}</code></p>

    {% if qc_url %}
      <h3>QC reel (2 minutes)</h3>
      <audio controls src="{{qc_url}}"></audio>
    {% endif %}

    {% if full_url %}
      <h3>Full book</h3>
      <audio controls src="{{full_url}}"></audio>
      <p><a href="{{full_url}}" download>Download full MP3</a></p>
    {% endif %}

    {% if chapters %}
      <h3>Chapters</h3>
      <ul>
        {% for ch in chapters %}
         <li><a href="{{ch.url}}" target="_blank">{{ch.name}}</a></li>
        {% endfor %}
      </ul>
    {% endif %}
  {% endif %}
  <p><a href="/">Back</a></p>
</body>
</html>
""")

@app.get("/", response_class=HTMLResponse)
async def index():
    return INDEX_HTML.render()

def write_temp_text(text: str) -> pathlib.Path:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
    tmp.write(text.encode("utf-8"))
    tmp.flush(); tmp.close()
    return pathlib.Path(tmp.name)

async def _run_job(job_id: str,
                   input_path: pathlib.Path,
                   book_title: str,
                   book_author: str,
                   voices: List[str],
                   model_id: str,
                   concurrency: int):
    try:
        from audiobook_tool import MODEL_LIMITS  # ensure synced
        outdir = pathlib.Path("output") / slugify(book_title)
        cfg = RunConfig(
            api_key=os.environ.get("ELEVEN_API_KEY", "").strip(),
            input_path=str(input_path),
            book_title=book_title,
            book_author=book_author,
            preferred_voices=tuple(voices),
            model_id=model_id,
            model_limit=MODEL_LIMITS.get(model_id, 10000),
            concurrency=concurrency,
            outdir=outdir,
        )
        JOBS[job_id].update(status="running")
        await synthesize_book(cfg)

        # collect outputs
        full = (outdir / "_full_book.mp3")
        qc = (outdir / "_qc_reel_2m.mp3")
        chapters = sorted(outdir.glob("* Chapter.mp3"))

        def to_url(p: pathlib.Path) -> Optional[str]:
            try:
                rel = p.absolute().relative_to(OUTPUT_ROOT)
                return f"/output/{rel.as_posix()}"
            except Exception:
                return None

        JOBS[job_id].update(
            status="done",
            outdir=str(outdir),
            full_url=to_url(full) if full.exists() else None,
            qc_url=to_url(qc) if qc.exists() else None,
            chapters=[{"name": c.name, "url": to_url(c)} for c in chapters if to_url(c)]
        )
    except Exception as e:
        JOBS[job_id].update(status="error", error=str(e))

@app.post("/start")
async def start(
    request: Request,
    book_title: str = Form(...),
    book_author: str = Form(...),
    pref_voices: str = Form("Jessica,Sarah"),
    model_id: str = Form("eleven_turbo_v2_5"),
    concurrency: int = Form(8),
    upload: UploadFile | None = File(None),
    pasted_text: str = Form(""),
    path_text: str = Form(""),
):
    # Input resolution precedence: uploaded file > pasted text > path
    src_path: Optional[pathlib.Path] = None

    if upload and upload.filename:
        suffix = pathlib.Path(upload.filename).suffix or ".txt"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        content = await upload.read()
        tmp.write(content); tmp.flush(); tmp.close()
        src_path = pathlib.Path(tmp.name)

    elif pasted_text.strip():
        src_path = write_temp_text(pasted_text)

    elif path_text.strip():
        p = pathlib.Path(path_text.strip()).expanduser()
        if not p.exists():
            return HTMLResponse(f"<h3>Path not found:</h3><pre>{p}</pre><p><a href='/'>Back</a></p>", status_code=400)
        src_path = p

    else:
        return HTMLResponse("<h3>Please provide a manuscript (upload, paste, or path).</h3><p><a href='/'>Back</a></p>", status_code=400)

    # Check API key
    if not os.environ.get("ELEVEN_API_KEY"):
        return HTMLResponse("<h3>ELEVEN_API_KEY is not set in your environment.</h3><p>Set it and restart the app.</p><p><a href='/'>Back</a></p>", status_code=400)

    job_id = uuid.uuid4().hex[:10]
    JOBS[job_id] = dict(status="queued")
    voices = [v.strip() for v in pref_voices.split(",") if v.strip()]

    # Launch background task
    asyncio.create_task(_run_job(job_id, src_path, book_title.strip(), book_author.strip(), voices, model_id.strip(), int(concurrency)))

    return RedirectResponse(url=f"/job/{job_id}", status_code=303)

@app.get("/job/{job_id}", response_class=HTMLResponse)
async def job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return HTMLResponse("<h3>Job not found</h3><p><a href='/'>Back</a></p>", status_code=404)
    return STATUS_HTML.render(
        job_id=job_id,
        status=job.get("status"),
        error=job.get("error"),
        outdir=job.get("outdir"),
        full_url=job.get("full_url"),
        qc_url=job.get("qc_url"),
        chapters=job.get("chapters", []),
    )
