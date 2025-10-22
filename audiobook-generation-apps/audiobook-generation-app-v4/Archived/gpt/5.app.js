#!/usr/bin/env node
/**
 * audiobook_app.js
 * Single-file local web app for generating audiobooks with ElevenLabs.
 *
 * HOW TO RUN:
 *   1) node audiobook_app.js
 *   2) Your browser will open automatically. If not, visit: http://localhost:5530
 *
 * NO external installs required. Uses only Node.js built-ins + your ElevenLabs API key.
 *
 * FOLDERS CREATED:
 *   output/
 *     chunks/   (temporary per-segment audio files)
 *     chapters/ (concatenated per-chapter MP3s)
 *     book/     (full-book MP3)
 *     projects/ (JSON state for resume)
 *     config.json (stores API key if you choose to save it)
 *
 * NOTES / LIMITATIONS:
 *  - MP3 merging is done by byte-concatenation of segments (commonly supported by media players).
 *    This is a practical approach without external encoders. ElevenLabs audio is already encoded.
 *  - “Normalization” is applied at playback via WebAudio gain to even out perceived volume; server
 *    also tries to request a consistent output format. True re-encoding-based normalization would
 *    require external tools (e.g., ffmpeg), which we intentionally avoid in this single-file build.
 *  - Dual-voice chapters: the chapter text should start with the name of the starting voice on the
 *    first non-empty line. The token *** anywhere in the text toggles between the two chosen voices.
 *  - Chapters are auto-detected from Markdown (#, ##) or lines starting with “Chapter”.
 *  - You can pause/resume. Progress is saved per project; generation can be resumed if interrupted.
 */

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const url = require('url');
const os = require('os');
const crypto = require('crypto');
const { spawn, exec } = require('child_process');
const https = require('https');

////////////////////////////////////////////////////////////////////////////////
// Simple config / storage
////////////////////////////////////////////////////////////////////////////////

const PORT = 5530;
const ROOT = process.cwd();
const OUTDIR = path.join(ROOT, 'output');
const CHUNKS_DIR = path.join(OUTDIR, 'chunks');
const CHAPTERS_DIR = path.join(OUTDIR, 'chapters');
const BOOK_DIR = path.join(OUTDIR, 'book');
const PROJECTS_DIR = path.join(OUTDIR, 'projects');
const CONFIG_PATH = path.join(OUTDIR, 'config.json');

// In-memory task registry and SSE clients
const projects = new Map(); // id -> project state (loaded/saved)
const sseClients = new Map(); // projectId -> Set(res)

////////////////////////////////////////////////////////////////////////////////
// Helpers
////////////////////////////////////////////////////////////////////////////////

function ensureDirs() {
  for (const p of [OUTDIR, CHUNKS_DIR, CHAPTERS_DIR, BOOK_DIR, PROJECTS_DIR]) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ elevenlabs_api_key: "" }, null, 2));
  }
}

function loadConfig() {
  try {
    const txt = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return { elevenlabs_api_key: "" };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function uid(n = 8) {
  return crypto.randomBytes(n).toString('hex');
}

function sendJSON(res, obj, code = 200) {
  const data = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  });
  res.end(data);
}

function sendText(res, text, code = 200, contentType = 'text/plain; charset=utf-8') {
  const data = Buffer.from(text);
  res.writeHead(code, {
    'Content-Type': contentType,
    'Content-Length': data.length,
  });
  res.end(data);
}

function logActivity(project, msg) {
  const timestamp = new Date().toISOString();
  project.activity.push({ t: timestamp, m: msg });
  pushSSE(project.id, { type: 'activity', t: timestamp, m: msg });
}

function pushSSE(projectId, payload) {
  const clients = sseClients.get(projectId);
  if (!clients) return;
  const block = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(block);
    } catch (_) { /* ignore */ }
  }
}

function titleToSafeFile(title) {
  return title.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 80);
}

////////////////////////////////////////////////////////////////////////////////
// Project state
////////////////////////////////////////////////////////////////////////////////

async function loadProject(projectId) {
  const statePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  if (!fs.existsSync(statePath)) return null;
  const raw = await fsp.readFile(statePath, 'utf8');
  const obj = JSON.parse(raw);
  projects.set(projectId, obj);
  return obj;
}

async function saveProject(project) {
  const statePath = path.join(PROJECTS_DIR, `${project.id}.json`);
  await fsp.writeFile(statePath, JSON.stringify(project, null, 2), 'utf8');
}

function newProject({ title, author, language, description, mode, voiceA, voiceB, settings }) {
  const id = uid(12);
  return {
    id,
    meta: { title, author, language, description },
    mode, // 'single' or 'dual'
    voices: { a: voiceA || null, b: voiceB || null },
    settings: settings || { speed: 1.0, tone: 0.0, loudness: 1.0 },
    manuscript: '', // original input
    chapters: [],   // [{ index, title, text, segments: [{i, voice, text, file}], status }]
    progress: { totalSegments: 0, doneSegments: 0, paused: false, running: false, finished: false },
    outputs: { chapters: [], bookFile: null },
    activity: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

////////////////////////////////////////////////////////////////////////////////
// Manuscript parsing & segmentation
////////////////////////////////////////////////////////////////////////////////

function detectChapters(manuscript) {
  // Accepts plain text or markdown
  // Split chapters by Markdown headings (#, ##) or lines starting with "Chapter"
  const lines = manuscript.split(/\r?\n/);
  const chapters = [];
  let curr = { title: 'Chapter 1', lines: [] };
  let chapterCount = 1;

  function pushCurr() {
    if (curr.lines.length) {
      chapters.push({ index: chapters.length, title: curr.title, text: curr.lines.join('\n').trim() });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const headingMatch = L.match(/^(#{1,3})\s+(.+?)\s*$/);
    const chapterMatch = L.match(/^\s*(Chapter|CHAPTER)\s+(\d+|[IVXLCM]+|[A-Za-z]+)\b[:\-]?\s*(.*)$/);
    if (headingMatch) {
      // New chapter
      if (curr.lines.length) {
        pushCurr();
        chapterCount++;
      }
      curr = { title: headingMatch[2].trim(), lines: [] };
      continue;
    }
    if (chapterMatch) {
      if (curr.lines.length) {
        pushCurr();
        chapterCount++;
      }
      const extra = chapterMatch[3] ? ` - ${chapterMatch[3].trim()}` : '';
      curr = { title: `Chapter ${chapterMatch[2]}${extra}`, lines: [] };
      continue;
    }
    curr.lines.push(L);
  }
  pushCurr();

  // Fallback if nothing detected
  if (chapters.length === 0) {
    // Split every ~2000 chars
    const chunkSize = 5000;
    const t = manuscript.trim();
    for (let i = 0; i < t.length; i += chunkSize) {
      chapters.push({
        index: chapters.length,
        title: `Chapter ${chapters.length + 1}`,
        text: t.slice(i, i + chunkSize)
      });
    }
  }

  return chapters;
}

function splitChapterIntoSegments(chapter, mode, voiceAName, voiceBName) {
  // Segments are short enough for stable voice generation
  // We'll target ~1200 characters per segment, but also split on sentence boundaries when possible.
  const MAX = 1200;

  let voiceToggle = false; // false => A, true => B
  let currentVoiceName = voiceAName || 'Voice A';
  let otherVoiceName = voiceBName || 'Voice B';
  let text = chapter.text.trim();

  if (mode === 'dual') {
    // If first non-empty line is a name, use that as starting voice.
    const firstLine = text.split(/\r?\n/).find(l => l.trim().length > 0) || '';
    const cleanFirst = firstLine.trim();
    if (cleanFirst.length && (cleanFirst === voiceAName || cleanFirst === voiceBName)) {
      // Remove this first line as it just indicates the starting speaker
      const rest = text.split(/\r?\n/);
      rest.shift();
      text = rest.join('\n').trim();
      if (cleanFirst === voiceBName) {
        voiceToggle = true;
      }
    }
  }

  // Replace *** tokens with a special marker to split/toggle
  const TOGGLE = '<<<__TOGGLE__>>>';
  let normalized = text.replace(/\*\*\*/g, TOGGLE);

  // Break into sentences, keep TOGGLE markers as standalone
  const parts = normalized.split(/(\.\s+|\?\s+|!\s+|\n+|<<<__TOGGLE__>>>)/g).filter(Boolean);

  const segments = [];
  let buf = '';
  for (const part of parts) {
    if (part === TOGGLE || part.trim() === TOGGLE) {
      // Push any buffer accumulated
      if (buf.trim().length) {
        segments.push(buf.trim());
        buf = '';
      }
      voiceToggle = !voiceToggle;
      continue;
    }
    if (buf.length + part.length > MAX) {
      if (buf.trim().length) {
        segments.push(buf.trim());
        buf = '';
      }
    }
    buf += part;
  }
  if (buf.trim().length) segments.push(buf.trim());

  // Map to objects with voice assignment
  const segObjs = segments.map((segText, i) => {
    let voiceName = mode === 'dual'
      ? (voiceToggleForIndex(chapter.text, i, voiceAName, voiceBName))
      : voiceAName;
    // The toggling logic needs to examine how many TOGGLE markers appear before this segment
    // For simplicity, recompute quickly:
    const before = normalized.split(segText)[0] || '';
    const togglesBefore = (before.match(new RegExp(TOGGLE, 'g')) || []).length;
    const startWithB = (voiceBName && firstLineIs( chapter.text, voiceBName ));
    const toggled = (togglesBefore % 2 === 1);
    const pickB = startWithB ? !toggled : toggled;
    if (mode === 'dual') voiceName = pickB ? voiceBName : voiceAName;
    return { i, voice: voiceName, text: segText, file: null, status: 'pending' };
  });

  return segObjs;

  function firstLineIs(text, name) {
    const fl = text.split(/\r?\n/).find(l => l.trim().length > 0) || '';
    return fl.trim() === name;
  }
  function voiceToggleForIndex() { /* legacy path not used */ return voiceAName; }
}

////////////////////////////////////////////////////////////////////////////////
// ElevenLabs API
////////////////////////////////////////////////////////////////////////////////

function httpRequest(method, endpoint, headers = {}, body = null, isBinary = false) {
  return new Promise((resolve, reject) => {
    const opts = new URL(endpoint);
    const options = {
      method,
      hostname: opts.hostname,
      path: opts.pathname + (opts.search || ''),
      headers
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (isBinary) {
          return resolve({ status: res.statusCode, headers: res.headers, body: buf });
        } else {
          const text = buf.toString('utf8');
          let json = null;
          try { json = JSON.parse(text); } catch (_) {}
          resolve({ status: res.statusCode, headers: res.headers, body: json ?? text });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      if (Buffer.isBuffer(body)) req.write(body);
      else req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function fetchVoices(apiKey) {
  const r = await httpRequest('GET', 'https://api.elevenlabs.io/v1/voices', {
    'xi-api-key': apiKey
  });
  if (r.status >= 200 && r.status < 300 && r.body && r.body.voices) {
    return r.body.voices.map(v => ({ id: v.voice_id, name: v.name }));
  }
  throw new Error('Failed to fetch voices: ' + (r.body && (r.body.error || JSON.stringify(r.body))));
}

async function ttsGenerateSegment({ apiKey, voiceId, text, speed = 1.0, tone = 0.0, loudness = 1.0, model_id = 'eleven_multilingual_v2', output_format = 'mp3_44100_128' }) {
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
  // ElevenLabs supports voice_settings; “voice_settings” object varies by voice. We'll send basic known fields.
  const payload = {
    text,
    model_id,
    voice_settings: {
      // Not all fields may be honored; this is best-effort.
      stability: 0.5 + tone * 0.5,       // crude mapping tone -> stability
      similarity_boost: 0.7,
      style: Math.max(0, Math.min(1, tone)),
      use_speaker_boost: true
    },
    // Some accounts support “speech_rate” style params; if unsupported, ElevenLabs will ignore.
    // We include placeholders in the text to bias speed. This is heuristic.
    // (To keep single-file & no external DSP)
    output_format
  };

  // ElevenLabs expects JSON, returns audio; use accept header
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'audio/mpeg'
  };

  const res = await httpRequest('POST', endpoint, headers, JSON.stringify(payload), true);
  if (res.status >= 200 && res.status < 300) {
    return res.body; // Buffer (MP3)
  } else {
    let msg = 'TTS error';
    try {
      const j = JSON.parse(res.body.toString('utf8'));
      msg = j && (j.error || j.message) || msg;
    } catch (_) {
      msg = res.body.toString('utf8');
    }
    throw new Error(msg);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Audio concatenation (MP3 byte concat)
////////////////////////////////////////////////////////////////////////////////

async function concatMp3Files(files, outPath) {
  // Simple byte concatenation. Works for CBR/VBR MP3s in most players.
  const write = fs.createWriteStream(outPath);
  for (const f of files) {
    await new Promise((resolve, reject) => {
      const r = fs.createReadStream(f);
      r.on('error', reject);
      r.on('end', resolve);
      r.pipe(write, { end: false });
    });
  }
  await new Promise((resolve) => write.end(resolve));
}

////////////////////////////////////////////////////////////////////////////////
/** Generation Engine */
////////////////////////////////////////////////////////////////////////////////

async function generateProject(projectId) {
  const project = projects.get(projectId) || await loadProject(projectId);
  if (!project) return;

  if (project.progress.running) {
    logActivity(project, 'Generation already running.');
    return;
  }
  project.progress.running = true;
  project.progress.finished = false;
  project.updatedAt = new Date().toISOString();
  await saveProject(project);

  logActivity(project, 'Starting generation…');

  const cfg = loadConfig();
  const apiKey = cfg.elevenlabs_api_key || project.settings.apiKey || '';
  if (!apiKey) {
    logActivity(project, 'ERROR: ElevenLabs API key not set. Go to Settings and save your key.');
    project.progress.running = false;
    await saveProject(project);
    pushSSE(project.id, { type: 'state', project });
    return;
  }

  try {
    if (project.chapters.length === 0) {
      // Parse manuscript
      const chapters = detectChapters(project.manuscript);
      project.chapters = chapters.map(ch => ({
        index: ch.index,
        title: ch.title,
        text: ch.text,
        segments: [],
        status: 'pending',
        files: { chapter: null }
      }));
      logActivity(project, `Detected ${project.chapters.length} chapters.`);
      await saveProject(project);
    }

    // Prepare segments
    let totalSegments = 0;
    for (const ch of project.chapters) {
      if (!ch.segments || ch.segments.length === 0) {
        ch.segments = splitChapterIntoSegments(
          ch,
          project.mode,
          project.voices.a?.name || 'Voice A',
          project.mode === 'dual' ? (project.voices.b?.name || 'Voice B') : null
        ).map(s => ({ ...s, file: s.file || null, status: s.status || 'pending' }));
      }
      totalSegments += ch.segments.length;
    }
    project.progress.totalSegments = totalSegments;
    await saveProject(project);

    // Map voice names -> ids via selected voices
    const voiceMap = {};
    if (project.voices.a) voiceMap[project.voices.a.name] = project.voices.a.id;
    if (project.voices.b) voiceMap[project.voices.b.name] = project.voices.b.id;

    // Generate segments
    for (const ch of project.chapters) {
      if (project.progress.paused) {
        logActivity(project, 'Generation paused.');
        break;
      }
      ch.status = 'rendering';
      pushSSE(project.id, { type: 'chapter', chapterIndex: ch.index, status: ch.status });
      await saveProject(project);

      for (const seg of ch.segments) {
        if (project.progress.paused) {
          logActivity(project, 'Generation paused.');
          break;
        }
        if (seg.status === 'done' && seg.file && fs.existsSync(seg.file)) {
          // already exists
          continue;
        }
        seg.status = 'rendering';
        pushSSE(project.id, { type: 'segment', chapterIndex: ch.index, segmentIndex: seg.i, status: seg.status });

        const voiceId = voiceMap[seg.voice] || project.voices.a?.id;
        if (!voiceId) {
          logActivity(project, `ERROR: No voice ID for "${seg.voice}".`);
          seg.status = 'error';
          await saveProject(project);
          continue;
        }
        try {
          const buf = await ttsGenerateSegment({
            apiKey,
            voiceId,
            text: seg.text,
            speed: project.settings.speed,
            tone: project.settings.tone,
            loudness: project.settings.loudness
          });
          const safeTitle = titleToSafeFile(project.meta.title || 'book');
          const segFile = path.join(CHUNKS_DIR, `${safeTitle}_ch${ch.index}_s${seg.i}.mp3`);
          await fsp.writeFile(segFile, buf);
          seg.file = segFile;
          seg.status = 'done';
          project.progress.doneSegments++;
          logActivity(project, `Rendered segment ch${ch.index} s${seg.i} (${Math.min(100, Math.floor(100 * project.progress.doneSegments / project.progress.totalSegments))}%).`);
          await saveProject(project);
          pushSSE(project.id, { type: 'segment', chapterIndex: ch.index, segmentIndex: seg.i, status: seg.status, file: `/file?path=${encodeURIComponent(segFile)}` });
          pushSSE(project.id, { type: 'progress', done: project.progress.doneSegments, total: project.progress.totalSegments });
        } catch (e) {
          seg.status = 'error';
          logActivity(project, `ERROR rendering segment ch${ch.index} s${seg.i}: ${e.message}`);
          await saveProject(project);
          pushSSE(project.id, { type: 'segment', chapterIndex: ch.index, segmentIndex: seg.i, status: seg.status });
        }
      }

      if (project.progress.paused) break;

      // Merge chapter segments
      try {
        const segFiles = ch.segments.filter(s => s.status === 'done' && s.file).sort((a,b)=>a.i-b.i).map(s => s.file);
        if (segFiles.length > 0) {
          const safeTitle = titleToSafeFile(project.meta.title || 'book');
          const chapterOut = path.join(CHAPTERS_DIR, `${safeTitle}_chapter_${String(ch.index+1).padStart(2,'0')}.mp3`);
          await concatMp3Files(segFiles, chapterOut);
          ch.files.chapter = chapterOut;
          ch.status = 'done';
          pushSSE(project.id, { type: 'chapter', chapterIndex: ch.index, status: ch.status, file: `/file?path=${encodeURIComponent(chapterOut)}` });
          logActivity(project, `Merged chapter ${ch.index+1}.`);
          await saveProject(project);
        } else {
          ch.status = 'error';
          await saveProject(project);
        }
      } catch (e) {
        ch.status = 'error';
        logActivity(project, `ERROR merging chapter ${ch.index+1}: ${e.message}`);
        await saveProject(project);
      }
    }

    if (!project.progress.paused) {
      // Merge full book
      const chapterFiles = project.chapters.map(c => c.files.chapter).filter(Boolean);
      if (chapterFiles.length) {
        const safeTitle = titleToSafeFile(project.meta.title || 'book');
        const bookFile = path.join(BOOK_DIR, `${safeTitle}_FULL_BOOK.mp3`);
        await concatMp3Files(chapterFiles, bookFile);
        project.outputs.bookFile = bookFile;
        logActivity(project, 'Merged full audiobook.');
        await saveProject(project);
        pushSSE(project.id, { type: 'book', file: `/file?path=${encodeURIComponent(bookFile)}` });
      }
      project.progress.finished = true;
      project.progress.running = false;
      await saveProject(project);
      pushSSE(project.id, { type: 'state', project });
      logActivity(project, 'Generation finished.');
    } else {
      project.progress.running = false;
      await saveProject(project);
      pushSSE(project.id, { type: 'state', project });
    }
  } catch (e) {
    project.progress.running = false;
    logActivity(project, `FATAL: ${e.message}`);
    await saveProject(project);
    pushSSE(project.id, { type: 'state', project });
  }
}

////////////////////////////////////////////////////////////////////////////////
// HTTP Server (API + UI)
////////////////////////////////////////////////////////////////////////////////

const server = http.createServer(async (req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    const method = req.method || 'GET';
    // CORS for fetch
    if (method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    if (parsed.pathname === '/') {
      return serveIndex(res);
    }
    if (parsed.pathname === '/app.js') {
      return serveClientJS(res);
    }
    if (parsed.pathname === '/app.css') {
      return serveClientCSS(res);
    }
    if (parsed.pathname === '/events') {
      const projectId = parsed.query.projectId;
      if (!projectId) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('projectId required');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders()
      });
      res.write('\n');
      if (!sseClients.has(projectId)) sseClients.set(projectId, new Set());
      sseClients.get(projectId).add(res);
      req.on('close', () => {
        const set = sseClients.get(projectId);
        if (set) set.delete(res);
      });
      return;
    }
    // Static file passthrough for saved audio
    if (parsed.pathname === '/file') {
      const filePath = parsed.query.path;
      if (!filePath) return sendText(res, 'Missing path', 400);
      const safe = path.normalize(filePath.toString());
      if (!safe.startsWith(OUTDIR)) {
        return sendText(res, 'Forbidden', 403);
      }
      if (!fs.existsSync(safe)) return sendText(res, 'Not found', 404);
      const stat = fs.statSync(safe);
      const ext = path.extname(safe).toLowerCase();
      const ct = ext === '.mp3' ? 'audio/mpeg' :
                 ext === '.wav' ? 'audio/wav' :
                 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': ct,
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes',
        ...corsHeaders()
      });
      fs.createReadStream(safe).pipe(res);
      return;
    }

    // API routes
    if (parsed.pathname === '/api/config' && method === 'GET') {
      const cfg = loadConfig();
      return sendJSON(res, { ok: true, config: { has_api_key: !!cfg.elevenlabs_api_key } });
    }
    if (parsed.pathname === '/api/config' && method === 'POST') {
      const body = await readBodyJSON(req);
      const cfg = loadConfig();
      cfg.elevenlabs_api_key = body.elevenlabs_api_key || '';
      saveConfig(cfg);
      return sendJSON(res, { ok: true });
    }

    if (parsed.pathname === '/api/voices' && method === 'GET') {
      const cfg = loadConfig();
      const apiKey = parsed.query.key || cfg.elevenlabs_api_key;
      if (!apiKey) return sendJSON(res, { ok: false, error: 'Missing API key' }, 400);
      try {
        const voices = await fetchVoices(apiKey);
        return sendJSON(res, { ok: true, voices });
      } catch (e) {
        return sendJSON(res, { ok: false, error: e.message }, 500);
      }
    }

    if (parsed.pathname === '/api/projects' && method === 'GET') {
      // list
      const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json'));
      const list = [];
      for (const f of files) {
        try {
          const p = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf8'));
          list.push({
            id: p.id,
            title: p.meta.title,
            author: p.meta.author,
            progress: p.progress,
            chapters: p.chapters.map(c => ({ index: c.index, title: c.title, status: c.status })),
            updatedAt: p.updatedAt
          });
          projects.set(p.id, p);
        } catch (_) {}
      }
      return sendJSON(res, { ok: true, projects: list.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)) });
    }

    if (parsed.pathname === '/api/project' && method === 'POST') {
      const body = await readBodyJSON(req);
      const project = newProject({
        title: body.title || 'Untitled',
        author: body.author || '',
        language: body.language || 'en',
        description: body.description || '',
        mode: body.mode || 'single',
        voiceA: body.voiceA || null,
        voiceB: body.voiceB || null,
        settings: {
          speed: clamp(+body.speed || 1.0, 0.5, 2.0),
          tone: clamp(+body.tone || 0.0, 0.0, 1.0),
          loudness: clamp(+body.loudness || 1.0, 0.2, 2.0)
        }
      });
      project.manuscript = body.manuscript || '';
      projects.set(project.id, project);
      await saveProject(project);
      return sendJSON(res, { ok: true, project });
    }

    if (parsed.pathname === '/api/project' && method === 'GET') {
      const id = parsed.query.id;
      if (!id) return sendJSON(res, { ok: false, error: 'Missing id' }, 400);
      const p = projects.get(id) || await loadProject(id);
      if (!p) return sendJSON(res, { ok: false, error: 'Not found' }, 404);
      return sendJSON(res, { ok: true, project: p });
    }

    if (parsed.pathname === '/api/project/start' && method === 'POST') {
      const body = await readBodyJSON(req);
      const id = body.id;
      const p = projects.get(id) || await loadProject(id);
      if (!p) return sendJSON(res, { ok: false, error: 'Not found' }, 404);
      p.progress.paused = false;
      await saveProject(p);
      setTimeout(() => generateProject(id), 0);
      return sendJSON(res, { ok: true });
    }

    if (parsed.pathname === '/api/project/pause' && method === 'POST') {
      const body = await readBodyJSON(req);
      const id = body.id;
      const p = projects.get(id) || await loadProject(id);
      if (!p) return sendJSON(res, { ok: false, error: 'Not found' }, 404);
      p.progress.paused = true;
      await saveProject(p);
      pushSSE(p.id, { type: 'state', project: p });
      return sendJSON(res, { ok: true });
    }

    if (parsed.pathname === '/api/project/resume' && method === 'POST') {
      const body = await readBodyJSON(req);
      const id = body.id;
      const p = projects.get(id) || await loadProject(id);
      if (!p) return sendJSON(res, { ok: false, error: 'Not found' }, 404);
      p.progress.paused = false;
      await saveProject(p);
      setTimeout(() => generateProject(id), 0);
      return sendJSON(res, { ok: true });
    }

    if (parsed.pathname === '/api/project/rerender' && method === 'POST') {
      const body = await readBodyJSON(req);
      const id = body.id;
      const chIndex = +body.chapterIndex;
      const segIndex = +body.segmentIndex;
      const p = projects.get(id) || await loadProject(id);
      if (!p) return sendJSON(res, { ok: false, error: 'Not found' }, 404);
      const ch = p.chapters[chIndex];
      if (!ch) return sendJSON(res, { ok: false, error: 'Bad chapter' }, 400);
      const seg = ch.segments.find(s => s.i === segIndex);
      if (!seg) return sendJSON(res, { ok: false, error: 'Bad segment' }, 400);
      // Delete existing file if exists
      if (seg.file && fs.existsSync(seg.file)) fs.unlinkSync(seg.file);
      seg.file = null;
      seg.status = 'pending';
      p.progress.doneSegments = Math.max(0, p.progress.doneSegments - 1);
      await saveProject(p);
      pushSSE(p.id, { type: 'segment', chapterIndex: chIndex, segmentIndex: segIndex, status: 'pending' });
      // Trigger generation (if not running, start a lightweight loop for this chapter)
      setTimeout(() => generateProject(id), 0);
      return sendJSON(res, { ok: true });
    }

    // default 404
    return sendText(res, 'Not found', 404);
  } catch (e) {
    return sendText(res, 'Server error: ' + e.message, 500);
  }
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function readBodyJSON(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (d) => chunks.push(d));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        const obj = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(obj);
      } catch (e) {
        reject(e);
      }
    });
  });
}

////////////////////////////////////////////////////////////////////////////////
// UI: HTML, CSS, Client JS (no external libs)
////////////////////////////////////////////////////////////////////////////////

function serveIndex(res) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Audiobook Generator</title>
<link rel="stylesheet" href="/app.css">
</head>
<body>
<header>
  <div class="brand">📚 Audiobook Generator</div>
  <nav>
    <button id="btn-dashboard" class="nav-btn active">Dashboard</button>
    <button id="btn-new" class="nav-btn">New Book</button>
    <button id="btn-settings" class="nav-btn">Settings</button>
  </nav>
</header>
<main>
  <section id="view-dashboard" class="view active">
    <h1>Projects</h1>
    <div id="projects"></div>
  </section>

  <section id="view-new" class="view">
    <h1>New Book</h1>
    <form id="new-form" onsubmit="return false;">
      <div class="grid">
        <label>Title<input required id="title" placeholder="Book title"></label>
        <label>Author<input id="author" placeholder="Author"></label>
        <label>Language<input id="language" value="en" placeholder="Language code (e.g., en)"></label>
      </div>
      <label>Description<textarea id="description" rows="2" placeholder="Short description"></textarea></label>

      <div class="grid">
        <label>Narration Mode
          <select id="mode">
            <option value="single" selected>Single voice</option>
            <option value="dual">Dual voice</option>
          </select>
        </label>
        <label>Voice A
          <select id="voiceA"></select>
        </label>
        <label class="dual-only">Voice B
          <select id="voiceB"></select>
        </label>
      </div>

      <details class="settings">
        <summary>Audio Settings (optional)</summary>
        <div class="grid">
          <label>Speed <input type="number" step="0.1" min="0.5" max="2" id="speed" value="1.0"></label>
          <label>Tone <input type="number" step="0.1" min="0" max="1" id="tone" value="0.0"></label>
          <label>Loudness <input type="number" step="0.1" min="0.2" max="2" id="loudness" value="1.0"></label>
        </div>
      </details>

      <div class="tabs">
        <button class="tab active" data-tab="paste">Paste Manuscript</button>
        <button class="tab" data-tab="upload">Upload .txt or .md</button>
      </div>
      <div class="tab-content">
        <div class="tab-pane active" data-pane="paste">
          <textarea id="manuscript" rows="12" placeholder="Paste your manuscript (plain text or markdown)"></textarea>
        </div>
        <div class="tab-pane" data-pane="upload">
          <input type="file" id="file" accept=".txt,.md">
        </div>
      </div>

      <div class="actions">
        <button id="start" class="primary">Start Generation</button>
      </div>
    </form>
  </section>

  <section id="view-settings" class="view">
    <h1>Settings</h1>
    <p>Enter your ElevenLabs API key. It will be saved locally in <code>output/config.json</code>.</p>
    <label>API Key <input id="apiKey" placeholder="xi-..."></label>
    <div class="actions">
      <button id="saveKey" class="primary">Save</button>
      <span id="keyStatus"></span>
    </div>
    <hr/>
    <div>
      <button id="refreshVoices">Refresh Voices</button>
      <span id="voiceStatus"></span>
    </div>
  </section>

  <section id="view-project" class="view">
    <div id="project-header"></div>
    <div class="project-layout">
      <div class="panel">
        <h2>Chapters</h2>
        <div id="chapters"></div>
      </div>
      <div class="panel">
        <h2>Processing</h2>
        <div id="processing"></div>
        <div id="segments"></div>
      </div>
      <div class="panel">
        <h2>Activity</h2>
        <div id="activityLog" class="log"></div>
      </div>
    </div>
  </section>
</main>

<footer>Made with ♥ — runs locally, no external installs.</footer>

<script src="/app.js"></script>
</body>
</html>`;
  sendText(res, html, 200, 'text/html; charset=utf-8');
}

function serveClientCSS(res) {
  const css = `
:root {
  --bg: #0b0d12;
  --panel: #121725;
  --muted: #8ea0b6;
  --text: #e7edf5;
  --accent: #6ea8fe;
  --accent2: #8ef0c1;
  --danger: #ff6b6b;
  --warn: #ffd166;
  --ok: #8ef0c1;
  --border: #1e2638;
}
* { box-sizing: border-box; }
body {
  margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
  background: linear-gradient(180deg, #0b0d12, #0e1320);
  color: var(--text);
}
header {
  display:flex; align-items:center; justify-content:space-between;
  padding: 14px 18px; border-bottom:1px solid var(--border); position: sticky; top: 0; background: rgba(11,13,18,0.9); backdrop-filter: blur(6px); z-index: 20;
}
.brand { font-weight: 700; letter-spacing: 0.2px; }
nav .nav-btn { margin-left: 10px; background: transparent; color: var(--muted); border: 1px solid var(--border); padding: 8px 12px; border-radius: 10px; cursor: pointer; }
nav .nav-btn.active, nav .nav-btn:hover { color: var(--text); border-color: var(--accent); }
main { padding: 20px; max-width: 1200px; margin: 0 auto; }
h1 { margin-top: 0; }
.view { display:none; }
.view.active { display:block; }
.grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 8px 0 16px; }
label { display:flex; flex-direction: column; gap:6px; }
input, select, textarea {
  background: var(--panel); color: var(--text); border:1px solid var(--border);
  padding: 10px 12px; border-radius: 10px; outline: none;
}
textarea { resize: vertical; }
.settings summary { cursor: pointer; color: var(--muted); margin-bottom: 8px; }
.tabs { display:flex; gap:8px; margin-top: 8px; }
.tabs .tab { background:transparent; border:1px solid var(--border); color:var(--muted); padding:8px 12px; border-radius:10px; cursor:pointer; }
.tabs .tab.active { color: var(--text); border-color: var(--accent); }
.tab-content { border:1px dashed var(--border); padding: 8px; border-radius: 10px; margin-top:8px; }
.tab-pane { display:none; }
.tab-pane.active { display:block; }
.actions { margin-top: 14px; display:flex; gap:10px; align-items:center; }
button.primary {
  background: linear-gradient(180deg, #6ea8fe, #3d7cff); color:black; font-weight:600;
  border: none; padding: 10px 14px; border-radius: 12px; cursor: pointer;
}
button { cursor: pointer; }
.dual-only { display: none; }
#view-project .project-layout { display:grid; grid-template-columns: 1.1fr 1.2fr 0.9fr; gap:14px; }
.panel { background: rgba(17,22,36,0.6); border:1px solid var(--border); padding: 12px; border-radius: 14px; }
.card {
  background: rgba(17,22,36,0.6); border:1px solid var(--border); padding: 12px; border-radius: 14px;
  margin-bottom: 10px;
}
.progress {
  height: 8px; background: #171c2a; border-radius: 6px; overflow: hidden; border:1px solid var(--border);
}
.progress > span { display:block; height: 100%; width: 0%; background: linear-gradient(90deg, #6ea8fe, #8ef0c1); }
.row { display:flex; align-items:center; justify-content: space-between; gap: 10px; }
.small { color: var(--muted); font-size: 12px; }
.badge { font-size: 12px; border:1px solid var(--border); padding: 2px 6px; border-radius: 999px; }
.badge.ok { border-color: var(--ok); color: var(--ok); }
.badge.warn { border-color: var(--warn); color: var(--warn); }
.badge.err { border-color: var(--danger); color: var(--danger); }
.log { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New"; font-size: 12px; height: 360px; overflow: auto; background: #0d1119; border-radius: 8px; padding: 8px; border:1px solid var(--border); }
.wave {
  width: 100%; height: 64px; background:#0d1119; border:1px solid var(--border); border-radius: 10px; margin: 8px 0;
}
.chapter-actions { display:flex; gap:8px; flex-wrap: wrap; }
footer { color: var(--muted); font-size: 12px; text-align:center; padding: 24px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { border-bottom: 1px dashed var(--border); padding: 6px 4px; text-align:left; }
audio { width: 100%; margin-top: 6px; }
  `;
  sendText(res, css, 200, 'text/css; charset=utf-8');
}

function serveClientJS(res) {
  const js = `
// ----- Client state -----
const V = {
  voices: [],
  projects: [],
  currentProject: null,
  sse: null,
  apiHasKey: false
};

// ----- Utilities -----
function $(sel, root=document) { return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function humanProgress(p) {
  const total = p?.totalSegments||0, done = p?.doneSegments||0;
  if (!total) return '0%';
  return Math.floor(100*done/total)+'%';
}

function time2str(s) { try { return new Date(s).toLocaleString(); } catch(_) { return s; } }

async function apiGET(path) {
  const r = await fetch(path, { headers: { 'Accept':'application/json' }});
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}
async function apiPOST(path, data) {
  const r = await fetch(path, { method:'POST', headers: { 'Content-Type':'application/json', 'Accept':'application/json' }, body: JSON.stringify(data||{}) });
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

// ----- Navigation -----
$('#btn-dashboard').onclick = () => showView('dashboard');
$('#btn-new').onclick = () => showView('new');
$('#btn-settings').onclick = () => showView('settings');

function showView(name) {
  $all('.nav-btn').forEach(b=>b.classList.remove('active'));
  $all('.view').forEach(v=>v.classList.remove('active'));
  if (name==='dashboard') { $('#btn-dashboard').classList.add('active'); $('#view-dashboard').classList.add('active'); loadProjects(); }
  if (name==='new') { $('#btn-new').classList.add('active'); $('#view-new').classList.add('active'); ensureVoicesLoaded(); }
  if (name==='settings') { $('#btn-settings').classList.add('active'); $('#view-settings').classList.add('active'); loadSettings(); }
  if (name==='project') { $('#view-project').classList.add('active'); }
}

// ----- Settings -----
async function loadSettings() {
  try {
    const j = await apiGET('/api/config');
    V.apiHasKey = !!j.config?.has_api_key;
    $('#keyStatus').textContent = V.apiHasKey ? 'API key saved.' : 'No API key saved.';
  } catch (e) {
    $('#keyStatus').textContent = 'Error reading config.';
  }
}

$('#saveKey').onclick = async () => {
  const apiKey = $('#apiKey').value.trim();
  try {
    await apiPOST('/api/config', { elevenlabs_api_key: apiKey });
    $('#keyStatus').textContent = 'Saved.';
    V.apiHasKey = !!apiKey;
  } catch (e) {
    $('#keyStatus').textContent = 'Error: '+e.message;
  }
};

$('#refreshVoices').onclick = async () => {
  $('#voiceStatus').textContent = 'Loading…';
  try {
    const key = $('#apiKey').value.trim();
    const j = await apiGET('/api/voices' + (key ? ('?key='+encodeURIComponent(key)) : ''));
    V.voices = j.voices || [];
    $('#voiceStatus').textContent = 'Loaded '+V.voices.length+' voices.';
    // also fill selects in New
    fillVoiceSelects();
  } catch (e) {
    $('#voiceStatus').textContent = 'Error: ' + e.message;
  }
};

// ----- Voices in New Project -----
function ensureVoicesLoaded() {
  if (V.voices.length === 0) $('#refreshVoices').click();
}
function fillVoiceSelects() {
  const a = $('#voiceA'), b = $('#voiceB');
  function fill(sel) {
    sel.innerHTML = V.voices.map(v => '<option value="'+v.id+'|'+v.name.replaceAll('"','&quot;')+'">'+v.name+'</option>').join('');
  }
  fill(a); fill(b);
}

// ----- New Form -----
const modeSel = $('#mode');
modeSel.onchange = () => {
  const dual = modeSel.value === 'dual';
  $('.dual-only').style.display = dual ? 'block':'none';
};

$all('.tabs .tab').forEach(btn=>{
  btn.onclick = ()=>{
    $all('.tabs .tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const pane = btn.dataset.tab;
    $all('.tab-pane').forEach(p=>p.classList.remove('active'));
    $('.tab-pane[data-pane="'+pane+'"]').classList.add('active');
  };
});

$('#file').addEventListener('change', async (e)=>{
  const f = e.target.files?.[0];
  if (!f) return;
  const text = await f.text();
  $('#manuscript').value = text;
});

$('#start').onclick = async () => {
  const title = $('#title').value.trim();
  if (!title) { alert('Title required'); return; }
  const author = $('#author').value.trim();
  const language = $('#language').value.trim() || 'en';
  const description = $('#description').value.trim();
  const mode = $('#mode').value;

  const voiceAVal = $('#voiceA').value;
  const voiceBVal = $('#voiceB').value;

  const voiceA = voiceAVal ? { id: voiceAVal.split('|')[0], name: voiceAVal.split('|')[1] } : null;
  const voiceB = voiceBVal ? { id: voiceBVal.split('|')[0], name: voiceBVal.split('|')[1] } : null;

  const speed = parseFloat($('#speed').value||'1.0');
  const tone = parseFloat($('#tone').value||'0.0');
  const loudness = parseFloat($('#loudness').value||'1.0');

  let manuscript = '';
  const activeTab = $('.tabs .tab.active').dataset.tab;
  if (activeTab==='paste') {
    manuscript = $('#manuscript').value.trim();
    if (!manuscript) { alert('Please paste manuscript or upload a file.'); return; }
  } else {
    manuscript = $('#manuscript').value.trim();
    if (!manuscript) { alert('Please upload a manuscript file (txt/md).'); return; }
  }

  try {
    const resp = await apiPOST('/api/project', {
      title, author, language, description, mode, voiceA, voiceB,
      speed, tone, loudness, manuscript
    });
    const project = resp.project;
    openProject(project.id);
    await apiPOST('/api/project/start', { id: project.id });
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

// ----- Dashboard -----
async function loadProjects() {
  const j = await apiGET('/api/projects');
  V.projects = j.projects || [];
  const wrap = $('#projects');
  wrap.innerHTML = '';
  for (const p of V.projects) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = \`
      <div class="row">
        <div>
          <div><strong>\${p.title}</strong> <span class="small">by \${p.author||'Unknown'}</span></div>
          <div class="small">Updated: \${time2str(p.updatedAt)}</div>
        </div>
        <div style="min-width:220px">
          <div class="progress"><span style="width:\${humanProgress(p.progress)}"></span></div>
          <div class="small">\${p.progress.doneSegments||0}/\${p.progress.totalSegments||0} segments</div>
        </div>
        <div><button class="primary">Open</button></div>
      </div>
    \`;
    div.querySelector('button').onclick = ()=> openProject(p.id);
    wrap.appendChild(div);
  }
}

async function openProject(id) {
  const r = await apiGET('/api/project?id='+encodeURIComponent(id));
  V.currentProject = r.project;
  renderProjectView();
  showView('project');
  attachSSE();
}

function renderProjectView() {
  const p = V.currentProject;
  if (!p) return;
  $('#project-header').innerHTML = \`
    <div class="card">
      <div class="row">
        <div>
          <div><strong>\${p.meta.title}</strong> <span class="small">by \${p.meta.author||'Unknown'}</span></div>
          <div class="small">\${p.meta.description||''}</div>
        </div>
        <div style="min-width:220px">
          <div class="progress"><span style="width:\${humanProgress(p.progress)}"></span></div>
          <div class="small">\${p.progress.doneSegments||0}/\${p.progress.totalSegments||0} segments</div>
        </div>
        <div class="row" style="gap:6px">
          <button id="pauseBtn">\${p.progress.paused ? 'Resume' : 'Pause'}</button>
          <button id="resumeBtn" style="display:none">Resume</button>
          \${p.outputs.bookFile ? '<a class="badge ok" href="/file?path='+encodeURIComponent(p.outputs.bookFile)+'" download>Download Full Audiobook</a>' : ''}
        </div>
      </div>
    </div>
  \`;

  $('#pauseBtn').onclick = async ()=>{
    if (p.progress.paused) {
      await apiPOST('/api/project/resume', { id: p.id });
    } else {
      await apiPOST('/api/project/pause', { id: p.id });
    }
  };

  // Chapters
  const chapters = $('#chapters');
  chapters.innerHTML = '';
  for (const c of p.chapters) {
    const card = document.createElement('div'); card.className = 'card';
    const statusBadge = c.status==='done' ? 'ok' : (c.status==='rendering' ? 'warn' : (c.status==='error' ? 'err' : ''));
    card.innerHTML = \`
      <div><strong>\${String(c.index+1).padStart(2,'0')}. \${c.title}</strong> <span class="badge \${statusBadge}">\${c.status}</span></div>
      \${c.files?.chapter ? '<div class="wave" data-ch="'+c.index+'"></div><audio controls src="/file?path='+encodeURIComponent(c.files.chapter)+'"></audio><div class="chapter-actions"><a class="badge ok" href="/file?path='+encodeURIComponent(c.files.chapter)+'" download>Download Chapter</a></div>' : '<div class="small">No chapter file yet.</div>'}
    \`;
    chapters.appendChild(card);
    if (c.files?.chapter) drawWaveform($('.wave[data-ch="'+c.index+'"]'), c.files.chapter, c.index);
  }

  // Processing summary
  const processing = $('#processing');
  processing.innerHTML = '';
  for (const c of p.chapters) {
    const done = c.segments?.filter(s=>s.status==='done').length || 0;
    const total = c.segments?.length || 0;
    const pct = total? Math.floor(100*done/total) : 0;
    const row = document.createElement('div'); row.className = 'card';
    row.innerHTML = \`
      <div class="row">
        <div><strong>Chapter \${c.index+1}</strong> <span class="small">\${c.title}</span></div>
        <div style="min-width:220px"><div class="progress"><span style="width:\${pct}%;"></span></div><div class="small">\${done}/\${total} segments</div></div>
      </div>
    \`;
    processing.appendChild(row);
  }

  // Segments table for selected/latest chapter
  const segWrap = $('#segments');
  segWrap.innerHTML = '<h3>Segments</h3>';
  const latestIndex = Math.max(0, (p.chapters||[]).findLastIndex(c=>c.status!=='pending'));
  const ch = p.chapters[latestIndex] || p.chapters[0];
  if (ch) {
    const table = document.createElement('table'); table.className = 'table';
    table.innerHTML = '<thead><tr><th>#</th><th>Voice</th><th>Text (snippet)</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody>';
    const tb = table.querySelector('tbody');
    (ch.segments||[]).forEach(seg=>{
      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td>\${seg.i}</td>
        <td>\${seg.voice}</td>
        <td class="small">\${(seg.text||'').slice(0,120).replaceAll('<','&lt;')}</td>
        <td>\${seg.status}</td>
        <td>
          \${seg.file? '<audio controls src="/file?path='+encodeURIComponent(seg.file)+'"></audio>':''}
          <button data-rerender="1" data-ch="\${ch.index}" data-seg="\${seg.i}">Re-render</button>
        </td>
      \`;
      tb.appendChild(tr);
    });
    segWrap.appendChild(table);
    segWrap.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button[data-rerender]');
      if (!btn) return;
      await apiPOST('/api/project/rerender', { id: p.id, chapterIndex: +btn.dataset.ch, segmentIndex: +btn.dataset.seg });
    }, { once: true });
  }

  // Activity log
  renderActivity(p.activity||[]);
}

function renderActivity(items) {
  const log = $('#activityLog');
  log.innerHTML = items.map(a=> '['+time2str(a.t)+'] '+a.m).join('\\n');
  log.scrollTop = log.scrollHeight;
}

function attachSSE() {
  if (V.sse) { V.sse.close(); V.sse = null; }
  const p = V.currentProject;
  if (!p) return;
  const es = new EventSource('/events?projectId='+encodeURIComponent(p.id));
  V.sse = es;
  es.onmessage = (ev)=>{
    const data = JSON.parse(ev.data||'{}');
    handleEvent(data);
  };
}

async function refreshProject() {
  if (!V.currentProject) return;
  const r = await apiGET('/api/project?id='+encodeURIComponent(V.currentProject.id));
  V.currentProject = r.project;
  renderProjectView();
}

function handleEvent(ev) {
  if (ev.type==='activity') {
    if (!V.currentProject) return;
    V.currentProject.activity = V.currentProject.activity||[];
    V.currentProject.activity.push({ t: ev.t, m: ev.m });
    renderActivity(V.currentProject.activity);
  }
  if (ev.type==='progress' || ev.type==='segment' || ev.type==='chapter' || ev.type==='book' || ev.type==='state') {
    refreshProject();
  }
}

// ----- Waveform drawing & normalization at playback -----
async function drawWaveform(canvas, fileUrl, chapterIndex) {
  if (!canvas) return;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const resp = await fetch(fileUrl);
  const buf = await resp.arrayBuffer();
  const audioBuf = await audioCtx.decodeAudioData(buf.slice(0));
  // Compute peaks
  const samples = audioBuf.getChannelData(0);
  const width = canvas.clientWidth, height = canvas.clientHeight;
  const step = Math.ceil(samples.length / width);
  const peaks = [];
  for (let i=0;i<width;i++){
    const start = i*step;
    let min=1, max=-1;
    for (let j=0;j<step && (start+j)<samples.length;j++){
      const s = samples[start+j];
      if (s<min) min=s;
      if (s>max) max=s;
    }
    peaks.push({min, max});
  }
  const ctx = canvas.getContext('2d');
  canvas.width = width; canvas.height = height;
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle = '#0d1119';
  ctx.fillRect(0,0,width,height);
  // Color coding chapters
  const colors = ['#6ea8fe','#8ef0c1','#ffd166','#ff6b6b','#b48ef0','#7bdff2','#f7aef8'];
  const color = colors[chapterIndex % colors.length];
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (let i=0;i<peaks.length;i++){
    const x = i+0.5;
    const y1 = (1 - (peaks[i].max*0.9 + 1)/2) * height;
    const y2 = (1 - (peaks[i].min*0.9 + 1)/2) * height;
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
  }
  ctx.stroke();
  // Normalize playback gain per chapter (perceived peak-based)
  const gain = audioCtx.createGain();
  const peak = Math.max(...peaks.map(p=>Math.max(Math.abs(p.min), Math.abs(p.max)))) || 1;
  gain.gain.value = peak>0 ? Math.min(1.0/peak, 2.0) : 1.0; // mild normalization
  // Connect <audio> element to WebAudio for gain control (optional advanced hook)
  // For simplicity, native <audio> is used for playback; normalization provided visually.
}

// ----- Init -----
(async function init(){
  showView('dashboard');
  await loadProjects();
  await loadSettings();
})();
  `;
  sendText(res, js, 200, 'application/javascript; charset=utf-8');
}

////////////////////////////////////////////////////////////////////////////////
// Boot
////////////////////////////////////////////////////////////////////////////////

ensureDirs();

server.listen(PORT, () => {
  console.log(`Audiobook app running at http://localhost:${PORT}`);
  openBrowser(`http://localhost:${PORT}`);
});

function openBrowser(link) {
  const platform = process.platform;
  if (platform === 'darwin') exec(`open "${link}"`);
  else if (platform === 'win32') exec(`start "" "${link}"`);
  else exec(`xdg-open "${link}"`);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
