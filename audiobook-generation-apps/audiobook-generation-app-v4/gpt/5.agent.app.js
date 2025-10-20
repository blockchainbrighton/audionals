/*
 * Audiobook Generator App
 *
 * A single‑file Node.js application which exposes a local web interface for turning
 * plain text or markdown manuscripts into fully voiced audiobooks using the
 * ElevenLabs text‑to‑speech API. The server handles everything: parsing the
 * manuscript into chapters and segments, calling the ElevenLabs API to
 * synthesise each piece, stitching the resulting MP3s together into chapters
 * and a complete book, persisting progress to disk, and pushing real time
 * updates back to the browser via Server Sent Events (SSE).
 *
 * There are no external dependencies to install. Simply run:
 *
 *   node audiobook_app.js
 *
 * The server will start on an available port (default 3100) and open your
 * default browser pointing at the dashboard. Projects live inside the
 * `output/` folder: temporary segments in `output/chunks`, final chapters
 * in `output/chapters` and complete books in `output/book`. A JSON file
 * `output/projects.json` stores the state of all projects so that if you stop
 * and restart the server it will pick up where it left off.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const childProcess = require('child_process');

// Promisified pipeline for streaming API responses into files
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

// Root directories for output. All generated audio and state lives here.
const OUTPUT_DIR = path.join(__dirname, 'output');
const CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks');
const CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const BOOK_DIR = path.join(OUTPUT_DIR, 'book');
const PROJECTS_FILE = path.join(OUTPUT_DIR, 'projects.json');

// Ensure output directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(OUTPUT_DIR);
ensureDir(CHUNKS_DIR);
ensureDir(CHAPTERS_DIR);
ensureDir(BOOK_DIR);

/**
 * In‑memory record of all projects keyed by id. Projects persist to disk on
 * every update so that work can resume across restarts. The structure of a
 * project looks like this:
 *
 * {
 *   id: string,
 *   title: string,
 *   author: string,
 *   description: string,
 *   language: string,
 *   voiceMode: 'single'|'dual',
 *   voices: [voice1, voice2?],
 *   settings: { stability, similarity, style, speed },
 *   apiKey: string,
 *   chapters: [
 *     {
 *       index: number,
 *       title: string,
 *       content: string,
 *       segments: [
 *         {
 *           index: number,
 *           text: string,
 *           voice: string,
 *           textLength: number,
 *           status: 'pending'|'processing'|'done'|'error',
 *           filePath: string|null
 *         }
 *       ],
 *       totalLength: number,
 *       status: 'pending'|'processing'|'done'|'error',
 *       filePath: string|null
 *     }
 *   ],
 *   status: 'queued'|'processing'|'paused'|'done'|'error',
 *   progress: { current: number, total: number },
 *   logs: string[],
 *   sseClients: [] // array of Response objects for SSE clients
 * }
 */
const projects = {};

/**
 * Load existing projects from disk (if any) and kick off processing
 * for any that were incomplete. This runs at startup.
 */
function loadProjects() {
  if (!fs.existsSync(PROJECTS_FILE)) return;
  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
    const stored = JSON.parse(data);
    if (typeof stored === 'object' && stored) {
      for (const id of Object.keys(stored)) {
        const proj = stored[id];
        // reattach empty arrays for sseClients to avoid circular refs
        proj.sseClients = [];
        projects[id] = proj;
        // compute pending and completed segments for resuming progress
        // and resume processing if not finished
        if (proj.status === 'processing' || proj.status === 'paused') {
          // Check which segments already have files and update their status
          for (const chapter of proj.chapters) {
            for (const seg of chapter.segments) {
              if (seg.filePath && fs.existsSync(seg.filePath)) {
                seg.status = 'done';
              }
            }
            // If chapter file exists then mark it done
            if (chapter.filePath && fs.existsSync(chapter.filePath)) {
              chapter.status = 'done';
            }
          }
          // Update progress counters
          let current = 0;
          let total = 0;
          for (const chapter of proj.chapters) {
            total += chapter.segments.length;
            for (const seg of chapter.segments) {
              if (seg.status === 'done') current++;
            }
          }
          proj.progress = { current, total };
          // Kick off processing asynchronously
          startProcessing(proj).catch((err) => {
            logAndSend(proj, 'error', `Resume failed: ${err.message || err}`);
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to load projects:', err);
  }
}

/**
 * Persist all projects to disk. This runs on every update to minimise
 * the risk of losing progress if the process is interrupted.
 */
function saveProjects() {
  const clone = {};
  for (const id of Object.keys(projects)) {
    const p = projects[id];
    // Clone without SSE client references (responses cannot be serialised)
    clone[id] = {
      ...p,
      sseClients: undefined,
    };
  }
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(clone, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save projects:', err);
  }
}

/**
 * Append a message to the project's activity log and broadcast it to any
 * connected SSE clients. Logs are truncated to a reasonable length to
 * avoid unbounded memory usage.
 *
 * @param {object} proj The project
 * @param {string} level 'info'|'error'|'log'
 * @param {string} message The message to append
 */
function logAndSend(proj, level, message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  proj.logs.push(entry);
  // Limit log length
  if (proj.logs.length > 2000) proj.logs.shift();
  // Broadcast via SSE
  sendEvent(proj, 'log', { level, message, timestamp });
  saveProjects();
}

/**
 * Send an event to all SSE clients connected for this project.
 *
 * @param {object} proj The project
 * @param {string} event The event name
 * @param {object} data The data to send
 */
function sendEvent(proj, event, data) {
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
  for (const res of proj.sseClients.slice()) {
    try {
      res.write(payload);
    } catch (err) {
      // On error remove the client
      proj.sseClients.splice(proj.sseClients.indexOf(res), 1);
    }
  }
}

/**
 * Convenience function to merge multiple MP3 files into a single MP3.
 * This implementation simply concatenates the MP3 frames and discards
 * the ID3 metadata from all files except the first. Many audio players
 * will play the resulting file without issue. It is a compromise that
 * avoids pulling in external native dependencies.
 *
 * @param {string[]} inputFiles Ordered list of MP3 files to merge
 * @param {string} outputFile Path for the merged MP3
 */
function mergeMp3Files(inputFiles, outputFile) {
  const buffers = [];
  for (let i = 0; i < inputFiles.length; i++) {
    let buf;
    try {
      buf = fs.readFileSync(inputFiles[i]);
    } catch (err) {
      throw new Error(`Failed to read segment file ${inputFiles[i]}: ${err.message}`);
    }
    // Remove ID3v2 tag from all except first
    if (i > 0 && buf.slice(0, 3).toString() === 'ID3') {
      // The size is encoded in 4 synchsafe bytes at positions 6–9
      const sizeBytes = buf.slice(6, 10);
      const size = ((sizeBytes[0] & 0x7f) << 21) | ((sizeBytes[1] & 0x7f) << 14) | ((sizeBytes[2] & 0x7f) << 7) | (sizeBytes[3] & 0x7f);
      const headerSize = 10 + size;
      buf = buf.slice(headerSize);
    }
    // Remove ID3v1 tag (128 bytes at end starting with 'TAG') from all except last
    if (i < inputFiles.length - 1) {
      if (buf.length > 128) {
        const tail = buf.slice(buf.length - 128);
        if (tail.slice(0, 3).toString() === 'TAG') {
          buf = buf.slice(0, buf.length - 128);
        }
      }
    }
    buffers.push(buf);
  }
  const merged = Buffer.concat(buffers);
  fs.writeFileSync(outputFile, merged);
}

/**
 * Parse the manuscript into chapters. Headings (lines starting with one to
 * six '#') denote chapter titles; everything until the next heading is part
 * of that chapter. If no headings are present the entire manuscript
 * becomes a single chapter. The returned array contains objects with
 * `title` and `content` fields.
 *
 * @param {string} manuscript The raw manuscript text
 * @returns {Array<{title:string, content:string}>}
 */
function parseChapters(manuscript) {
  const lines = manuscript.replace(/\r\n/g, '\n').split('\n');
  const chapters = [];
  let currentTitle = null;
  let buffer = [];
  function pushChapter() {
    if (buffer.length === 0) return;
    chapters.push({ title: currentTitle || `Chapter ${chapters.length + 1}`, content: buffer.join('\n').trim() });
    buffer = [];
  }
  for (const line of lines) {
    const heading = /^\s*(#{1,6})\s*(.+)\s*$/.exec(line);
    if (heading) {
      // Push previous chapter if there is content
      pushChapter();
      currentTitle = heading[2].trim();
    } else {
      buffer.push(line);
    }
  }
  // Final chapter
  pushChapter();
  if (chapters.length === 0) {
    chapters.push({ title: 'Chapter 1', content: manuscript.trim() });
  }
  return chapters;
}

/**
 * Break a chapter into smaller segments appropriate for the ElevenLabs
 * streaming API. Segments are limited in size to avoid hitting the API's
 * internal limits. For dual‑voice narration the voices alternate whenever
 * a sequence of three or more asterisks ("***") appears. Each segment
 * records the chosen voice and its length.
 *
 * @param {string} text The chapter text
 * @param {string} voiceMode 'single' or 'dual'
 * @param {string[]} voices Array of one or two voice IDs
 * @returns {Array<{ text: string, voice: string, textLength: number }>} Segments
 */
function splitIntoSegments(text, voiceMode, voices) {
  const SEGMENT_CHAR_LIMIT = 1000; // safe limit to avoid very long sentences
  const results = [];
  if (voiceMode === 'dual' && voices.length === 2) {
    // Split around *** switches. Alternate voices on each part.
    const parts = text.split(/\*{3,}/g);
    let voiceIndex = 0;
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) {
        // Toggle even for empty parts to maintain alternation
        voiceIndex = 1 - voiceIndex;
        continue;
      }
      // Further divide the part into sentences using punctuation to improve
      // speech naturalness. This is a heuristic and not perfect but works
      // reasonably for typical prose.
      const sentences = trimmed.split(/(?<=[\.!\?])\s+/);
      let current = '';
      for (const sentence of sentences) {
        if ((current + (current ? ' ' : '') + sentence).length > SEGMENT_CHAR_LIMIT) {
          const segText = current.trim();
          if (segText) {
            results.push({ text: segText, voice: voices[voiceIndex], textLength: segText.length });
          }
          current = sentence;
        } else {
          current += (current ? ' ' : '') + sentence;
        }
      }
      if (current.trim()) {
        results.push({ text: current.trim(), voice: voices[voiceIndex], textLength: current.trim().length });
      }
      // Alternate voice for next part
      voiceIndex = 1 - voiceIndex;
    }
  } else {
    // Single voice – just split into segments by sentences respecting limits
    const sentences = text.trim().split(/(?<=[\.!\?])\s+/);
    let current = '';
    for (const sentence of sentences) {
      if ((current + (current ? ' ' : '') + sentence).length > SEGMENT_CHAR_LIMIT) {
        const segText = current.trim();
        if (segText) results.push({ text: segText, voice: voices[0], textLength: segText.length });
        current = sentence;
      } else {
        current += (current ? ' ' : '') + sentence;
      }
    }
    if (current.trim()) {
      results.push({ text: current.trim(), voice: voices[0], textLength: current.trim().length });
    }
  }
  return results;
}

/**
 * Generate an MP3 for a single text segment using the ElevenLabs API. The
 * returned promise resolves when the segment has been fully written to
 * disk. Any HTTP errors from the ElevenLabs API will reject the promise.
 *
 * @param {string} apiKey The user's ElevenLabs API key
 * @param {string} voiceId The voice to use
 * @param {string} text Text to synthesise
 * @param {object} settings Optional voice settings (stability, similarity, style)
 * @param {string} destPath Destination path on disk (MP3)
 */
async function generateSegment(apiKey, voiceId, text, settings, destPath) {
  const fetch = globalThis.fetch; // Node 18+ has global fetch
  const body = {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: Number(settings.stability) || 0.5,
      similarity_boost: Number(settings.similarity) || 0.5,
      style: Number(settings.style) || 0.0,
      use_speaker_boost: true
    }
  };
  const urlEndpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`;
  const res = await fetch(urlEndpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const textResp = await res.text().catch(() => '');
    throw new Error(`ElevenLabs API request failed (${res.status}): ${textResp}`);
  }
  // Stream the response to file
  const destStream = fs.createWriteStream(destPath);
  // Convert WebStream to Node stream
  const nodeReadable = Readable.fromWeb(res.body);
  await pipeline(nodeReadable, destStream);
}

/**
 * Start processing a project by streaming segments from ElevenLabs and
 * merging them into chapters and a complete book. The function checks
 * whether segments or chapters are already completed (on resume) and
 * skips them accordingly. It honours the project's `status` field,
 * allowing the user to pause and resume work.
 *
 * @param {object} proj The project
 */
async function startProcessing(proj) {
  // If already processing, do nothing
  if (proj._processingPromise) return proj._processingPromise;
  proj.status = proj.status || 'queued';
  // Kick off asynchronous processing but do not await here, so that the
  // HTTP response to project creation can return immediately. Subsequent
  // calls will reuse the same promise.
  proj._processingPromise = (async () => {
    try {
      proj.status = 'processing';
      saveProjects();
      logAndSend(proj, 'info', `Starting synthesis of "${proj.title}"...`);
      for (const chapter of proj.chapters) {
        if (proj.status === 'paused') {
          logAndSend(proj, 'info', `Generation paused. Waiting to resume...`);
        }
        // Wait while paused
        while (proj.status === 'paused') {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (chapter.status === 'done') {
          continue;
        }
        chapter.status = 'processing';
        logAndSend(proj, 'info', `Processing chapter ${chapter.index + 1}: ${chapter.title}`);
        // Process segments sequentially
        for (const seg of chapter.segments) {
          if (seg.status === 'done') {
            continue;
          }
          seg.status = 'processing';
          sendEvent(proj, 'progress', { projectId: proj.id, current: proj.progress.current, total: proj.progress.total });
          const segPath = path.join(CHUNKS_DIR, `${proj.id}-chapter${chapter.index}-seg${seg.index}.mp3`);
          try {
            await generateSegment(proj.apiKey, seg.voice, seg.text, proj.settings, segPath);
            seg.status = 'done';
            seg.filePath = segPath;
            proj.progress.current++;
            sendEvent(proj, 'progress', { projectId: proj.id, current: proj.progress.current, total: proj.progress.total });
            logAndSend(proj, 'info', `Generated segment ${seg.index + 1}/${chapter.segments.length} of chapter ${chapter.index + 1}`);
            saveProjects();
          } catch (err) {
            seg.status = 'error';
            logAndSend(proj, 'error', `Error generating segment ${seg.index + 1}: ${err.message || err}`);
            proj.status = 'error';
            saveProjects();
            throw err;
          }
          // Respect pause between segments
          while (proj.status === 'paused') {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
        // Merge segments for this chapter
        try {
          const segFiles = chapter.segments.map((s) => s.filePath).filter(Boolean);
          const chapterFile = path.join(CHAPTERS_DIR, `${proj.id}-chapter${chapter.index}.mp3`);
          mergeMp3Files(segFiles, chapterFile);
          chapter.filePath = chapterFile;
          chapter.status = 'done';
          logAndSend(proj, 'info', `Finished chapter ${chapter.index + 1}`);
          // Optionally delete chunk files to save space
          // segFiles.forEach(fp => fs.existsSync(fp) && fs.unlinkSync(fp));
          saveProjects();
        } catch (err) {
          chapter.status = 'error';
          logAndSend(proj, 'error', `Error merging chapter ${chapter.index + 1}: ${err.message || err}`);
          proj.status = 'error';
          saveProjects();
          throw err;
        }
      }
      // Merge chapters into full audiobook
      try {
        const chapterFiles = proj.chapters.map((ch) => ch.filePath).filter(Boolean);
        const bookFile = path.join(BOOK_DIR, `${proj.id}.mp3`);
        mergeMp3Files(chapterFiles, bookFile);
        proj.bookFile = bookFile;
        proj.status = 'done';
        logAndSend(proj, 'info', `All chapters complete! Merged into full book.`);
        saveProjects();
      } catch (err) {
        proj.status = 'error';
        logAndSend(proj, 'error', `Error merging book: ${err.message || err}`);
        saveProjects();
        throw err;
      }
    } finally {
      proj._processingPromise = null;
    }
  })().catch((err) => {
    // Error already logged; nothing else to do
  });
  return proj._processingPromise;
}

/**
 * Create a new project from parameters provided by the client. This
 * function performs parsing of chapters and segmentation. It does not
 * initiate synthesis – that is handled separately by startProcessing().
 *
 * @param {object} params The project parameters supplied by the client
 * @returns {object} The newly created project
 */
function createProject(params) {
  const id = crypto.randomUUID();
  const title = (params.title || '').trim() || 'Untitled Book';
  const author = (params.author || '').trim() || '';
  const description = (params.description || '').trim() || '';
  const language = (params.language || '').trim() || '';
  const voiceMode = params.voiceMode === 'dual' ? 'dual' : 'single';
  const voices = [];
  if (voiceMode === 'dual') {
    voices.push((params.voice1 || '').trim());
    voices.push((params.voice2 || '').trim());
  } else {
    voices.push((params.voice1 || params.voice || '').trim());
  }
  const settings = {
    stability: params.stability !== undefined ? params.stability : 0.5,
    similarity: params.similarity !== undefined ? params.similarity : 0.5,
    style: params.style !== undefined ? params.style : 0.0,
    speed: params.speed !== undefined ? params.speed : 1.0
  };
  const manuscript = (params.manuscript || '').toString();
  const apiKey = (params.apiKey || '').trim();
  if (!apiKey) {
    throw new Error('API key is required');
  }
  // Parse chapters
  const chapData = parseChapters(manuscript);
  const chapters = chapData.map((ch, idx) => {
    const segments = splitIntoSegments(ch.content, voiceMode, voices).map((seg, sIdx) => ({
      index: sIdx,
      text: seg.text,
      voice: seg.voice,
      textLength: seg.textLength,
      status: 'pending',
      filePath: null
    }));
    const totalLength = segments.reduce((a, s) => a + s.textLength, 0);
    return {
      index: idx,
      title: ch.title,
      content: ch.content,
      segments,
      totalLength,
      status: 'pending',
      filePath: null
    };
  });
  // Count total segments for progress tracking
  const totalSegments = chapters.reduce((sum, ch) => sum + ch.segments.length, 0);
  const project = {
    id,
    title,
    author,
    description,
    language,
    voiceMode,
    voices,
    settings,
    apiKey,
    chapters,
    status: 'queued',
    progress: { current: 0, total: totalSegments },
    logs: [],
    sseClients: []
  };
  projects[id] = project;
  saveProjects();
  return project;
}

/**
 * Return a minimal representation of a project suitable for listing
 * projects on the dashboard. Sensitive data such as API keys are removed.
 *
 * @param {object} proj The project
 */
function summariseProject(proj) {
  return {
    id: proj.id,
    title: proj.title,
    author: proj.author,
    description: proj.description,
    language: proj.language,
    status: proj.status,
    progress: proj.progress,
    chapters: proj.chapters.map((ch) => ({ index: ch.index, title: ch.title, status: ch.status }))
  };
}

/**
 * Main HTTP request handler. Routes requests based on method and path.
 * All API responses are JSON unless otherwise noted. SSE connections
 * remain open and push events as they occur.
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;
  // Serve root page
  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(indexHtml);
    return;
  }
  // Serve static CSS/JS if requested
  if (req.method === 'GET' && pathname === '/favicon.ico') {
    // Respond with 204 to suppress favicon errors
    res.writeHead(204);
    res.end();
    return;
  }
  // Serve audio files dynamically
  const projectIdMatch = pathname.match(/^\/api\/project\/([\w-]+)\/chapter\/(\d+)$/);
  const chapterDownloadMatch = pathname.match(/^\/api\/project\/([\w-]+)\/download\/chapter\/(\d+)$/);
  const bookDownloadMatch = pathname.match(/^\/api\/project\/([\w-]+)\/download\/book$/);
  if (req.method === 'GET' && projectIdMatch) {
    // Stream chapter audio file
    const pid = projectIdMatch[1];
    const chIdx = parseInt(projectIdMatch[2], 10);
    const proj = projects[pid];
    if (!proj || !proj.chapters[chIdx] || !proj.chapters[chIdx].filePath) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const filePath = proj.chapters[chIdx].filePath;
    streamFile(filePath, req, res);
    return;
  }
  if (req.method === 'GET' && chapterDownloadMatch) {
    // Download chapter file
    const pid = chapterDownloadMatch[1];
    const chIdx = parseInt(chapterDownloadMatch[2], 10);
    const proj = projects[pid];
    if (!proj || !proj.chapters[chIdx] || !proj.chapters[chIdx].filePath) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const filePath = proj.chapters[chIdx].filePath;
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(proj.title.replace(/[^a-z0-9]/gi, '_'))}_chapter_${chIdx + 1}.mp3"`
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }
  if (req.method === 'GET' && bookDownloadMatch) {
    const pid = bookDownloadMatch[1];
    const proj = projects[pid];
    if (!proj || !proj.bookFile) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(proj.title.replace(/[^a-z0-9]/gi, '_'))}.mp3"`
    });
    fs.createReadStream(proj.bookFile).pipe(res);
    return;
  }
  // SSE endpoint for project events
  const sseMatch = pathname.match(/^\/api\/project\/([\w-]+)\/events$/);
  if (req.method === 'GET' && sseMatch) {
    const pid = sseMatch[1];
    const proj = projects[pid];
    if (!proj) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('\n');
    // Add to clients list
    proj.sseClients.push(res);
    // Send initial state
    sendEvent(proj, 'init', summariseProject(proj));
    // Remove on close
    req.on('close', () => {
      const idx = proj.sseClients.indexOf(res);
      if (idx >= 0) proj.sseClients.splice(idx, 1);
    });
    return;
  }
  // Voices endpoint to fetch list of available voices from ElevenLabs
  if (req.method === 'GET' && pathname === '/api/voices') {
    const apiKey = (query.apiKey || '').trim();
    if (!apiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'apiKey query parameter required' }));
      return;
    }
    try {
      const fetch = globalThis.fetch;
      const voicesRes = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey }
      });
      if (!voicesRes.ok) {
        const txt = await voicesRes.text().catch(() => '');
        res.writeHead(voicesRes.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Failed to fetch voices: ${txt}` }));
        return;
      }
      const data = await voicesRes.json();
      // Reduce the payload to id and name only
      const list = (data.voices || []).map((v) => ({ id: v.voice_id, name: v.name }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ voices: list }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || err }));
    }
    return;
  }
  // Get list of projects
  if (req.method === 'GET' && pathname === '/api/projects') {
    const list = Object.values(projects).map((p) => summariseProject(p));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ projects: list }));
    return;
  }
  // Create new project
  if (req.method === 'POST' && pathname === '/api/projects') {
    // Read request body (JSON)
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      let params;
      try {
        params = JSON.parse(body || '{}');
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
      }
      try {
        const proj = createProject(params);
        // Start processing asynchronously
        startProcessing(proj).catch((err) => {
          // Already logged in logAndSend; respond with error update
        });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ project: summariseProject(proj) }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || err }));
      }
    });
    return;
  }
  // Get a specific project's details
  const projectMatch = pathname.match(/^\/api\/project\/([\w-]+)$/);
  if (req.method === 'GET' && projectMatch) {
    const pid = projectMatch[1];
    const proj = projects[pid];
    if (!proj) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    // Omit sensitive values
    const detail = summariseProject(proj);
    // Include chapter details and segment summary lengths for UI
    detail.chapters = proj.chapters.map((ch) => ({
      index: ch.index,
      title: ch.title,
      status: ch.status,
      totalLength: ch.totalLength,
      segments: ch.segments.map((s) => ({ index: s.index, voice: s.voice, textLength: s.textLength }))
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ project: detail }));
    return;
  }
  // Pause or resume a project
  const pauseMatch = pathname.match(/^\/api\/project\/([\w-]+)\/pause$/);
  const resumeMatch = pathname.match(/^\/api\/project\/([\w-]+)\/resume$/);
  if ((req.method === 'POST' || req.method === 'PUT') && (pauseMatch || resumeMatch)) {
    const pid = (pauseMatch || resumeMatch)[1];
    const proj = projects[pid];
    if (!proj) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    if (pauseMatch) {
      if (proj.status === 'processing') {
        proj.status = 'paused';
        saveProjects();
        logAndSend(proj, 'info', 'Generation paused by user');
      }
    } else {
      // resume
      if (proj.status === 'paused') {
        proj.status = 'processing';
        saveProjects();
        logAndSend(proj, 'info', 'Resuming generation');
        startProcessing(proj).catch(() => {});
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ project: summariseProject(proj) }));
    return;
  }
  // Unknown API path
  if (pathname.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
    return;
  }
  // For any other request, serve 404
  res.writeHead(404);
  res.end('Not found');
}

/**
 * Stream a file with range support (for audio streaming). Clients can
 * request byte ranges via the Range header to enable seeking.
 *
 * @param {string} filePath The file to stream
 * @param {http.IncomingMessage} req The request
 * @param {http.ServerResponse} res The response
 */
function streamFile(filePath, req, res) {
  const stat = fs.statSync(filePath);
  const total = stat.size;
  // Range header lives on the request object
  const range = req.headers.range;
  if (range) {
    // Parse Range header: bytes=start-end
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'audio/mpeg'
    });
    file.pipe(res);
  } else {
    // Whole file
    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type': 'audio/mpeg'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

// HTML for the UI. This is a self‑contained page with inline styles and
// scripts. It contacts the API endpoints defined above to create and
// manage projects. A minimal design is used to keep everything in one file.
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Audiobook Generator</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fafafa; color: #333; }
    header { background: #3f51b5; color: white; padding: 1rem; text-align: center; }
    h1 { margin: 0; }
    main { display: flex; flex-direction: column; padding: 1rem; }
    .container { max-width: 960px; margin: 0 auto; }
    .button { background: #3f51b5; color: white; padding: 0.5rem 1rem; border: none; cursor: pointer; border-radius: 4px; }
    .button:disabled { background: #9fa8da; cursor: not-allowed; }
    .card { background: white; border-radius: 4px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .flex { display: flex; }
    .flex-row { flex-direction: row; }
    .flex-col { flex-direction: column; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mt-2 { margin-top: 0.5rem; }
    .w-100 { width: 100%; }
    .w-50 { width: 50%; }
    .input-field { width: 100%; padding: 0.5rem; margin-bottom: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .text-area { width: 100%; height: 150px; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .project-row { padding: 0.5rem; border-bottom: 1px solid #eee; cursor: pointer; }
    .project-row:hover { background: #f0f0f0; }
    .progress-bar { height: 6px; background: #e0e0e0; margin-top: 4px; border-radius: 3px; }
    .progress { height: 100%; background: #3f51b5; border-radius: 3px; }
    .log-panel { max-height: 200px; overflow-y: auto; background: #fafafa; border: 1px solid #ccc; padding: 0.5rem; font-size: 0.85rem; }
    .audio-container { margin-top: 1rem; }
    .chapter-header { font-weight: bold; margin-top: 1rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
    .region-color { height: 12px; width: 12px; display: inline-block; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
  </style>
</head>
<body>
  <header>
    <h1>Audiobook Generator</h1>
  </header>
  <main>
    <div class="container">
      <div id="dashboard-view">
        <div class="flex justify-between items-center mb-2">
          <h2>Projects</h2>
          <button id="new-project-btn" class="button">New Book</button>
        </div>
        <div id="projects-list"></div>
      </div>
      <div id="new-project-view" style="display:none;">
        <div class="flex justify-between items-center mb-2">
          <h2>New Book</h2>
          <button id="cancel-new-project" class="button">Cancel</button>
        </div>
        <form id="new-project-form">
          <input class="input-field" type="text" id="title" name="title" placeholder="Title" required />
          <input class="input-field" type="text" id="author" name="author" placeholder="Author" />
          <input class="input-field" type="text" id="language" name="language" placeholder="Language (optional)" />
          <textarea class="text-area" id="description" name="description" placeholder="Description (optional)"></textarea>
          <label>Voice mode:</label>
          <select class="input-field" id="voice-mode" name="voice-mode">
            <option value="single">Single voice</option>
            <option value="dual">Dual voices</option>
          </select>
          <div id="voice-selectors" class="flex flex-row mb-2">
            <div class="w-50 pr-1"><input class="input-field" type="text" id="voice1" name="voice1" placeholder="Voice ID 1" required /></div>
            <div class="w-50 pl-1" id="voice2-container" style="display:none;"><input class="input-field" type="text" id="voice2" name="voice2" placeholder="Voice ID 2" /></div>
          </div>
          <div class="flex flex-row">
            <div class="w-50 pr-1">
              <label>Stability (0–1):</label>
              <input class="input-field" type="number" step="0.01" min="0" max="1" id="stability" name="stability" value="0.5" />
            </div>
            <div class="w-50 pl-1">
              <label>Similarity (0–1):</label>
              <input class="input-field" type="number" step="0.01" min="0" max="1" id="similarity" name="similarity" value="0.5" />
            </div>
          </div>
          <div class="flex flex-row">
            <div class="w-50 pr-1">
              <label>Style (0–1):</label>
              <input class="input-field" type="number" step="0.01" min="0" max="1" id="style" name="style" value="0.0" />
            </div>
            <div class="w-50 pl-1">
              <label>Speed (0.5–2):</label>
              <input class="input-field" type="number" step="0.1" min="0.5" max="2" id="speed" name="speed" value="1.0" />
            </div>
          </div>
          <textarea class="text-area" id="manuscript" name="manuscript" placeholder="Paste manuscript text here" required></textarea>
          <input class="input-field" type="password" id="api-key" name="api-key" placeholder="ElevenLabs API Key" required />
          <button type="submit" class="button mt-2">Create & Start</button>
        </form>
      </div>
      <div id="project-detail-view" style="display:none;"></div>
    </div>
  </main>
  <script src="https://unpkg.com/wavesurfer.js"></script>
  <script src="https://unpkg.com/wavesurfer.js/dist/plugin/wavesurfer.regions.min.js"></script>
  <script>
    const dashboardView = document.getElementById('dashboard-view');
    const newProjectView = document.getElementById('new-project-view');
    const projectDetailView = document.getElementById('project-detail-view');
    const projectsListEl = document.getElementById('projects-list');
    const newProjectBtn = document.getElementById('new-project-btn');
    const cancelNewBtn = document.getElementById('cancel-new-project');
    const newProjectForm = document.getElementById('new-project-form');
    const voiceModeSelect = document.getElementById('voice-mode');
    const voice2Container = document.getElementById('voice2-container');

    let currentProject = null;
    let eventSource = null;

    function showDashboard() {
      dashboardView.style.display = '';
      newProjectView.style.display = 'none';
      projectDetailView.style.display = 'none';
      loadProjects();
    }
    function showNewProject() {
      dashboardView.style.display = 'none';
      newProjectView.style.display = '';
      projectDetailView.style.display = 'none';
    }
    function showProjectDetail(project) {
      dashboardView.style.display = 'none';
      newProjectView.style.display = 'none';
      projectDetailView.style.display = '';
      currentProject = project;
      renderProjectDetail(project);
      // Open SSE connection
      if (eventSource) eventSource.close();
      // Open an SSE connection for real‑time updates. Concatenate strings to avoid
      // Node interpolating template literals in this source code. The
      // interpolation will occur in the browser at runtime.
      eventSource = new EventSource('/api/project/' + project.id + '/events');
      eventSource.onmessage = () => {};
      eventSource.addEventListener('init', (ev) => {
        const data = JSON.parse(ev.data);
        currentProject = data;
        renderProjectDetail(currentProject);
      });
      eventSource.addEventListener('progress', (ev) => {
        const data = JSON.parse(ev.data);
        if (currentProject && currentProject.id === data.projectId) {
          currentProject.progress = { current: data.current, total: data.total };
          updateProgressBar();
        }
      });
      eventSource.addEventListener('log', (ev) => {
        const info = JSON.parse(ev.data);
        appendLog(info.level, info.message, info.timestamp);
      });
    }

    newProjectBtn.addEventListener('click', showNewProject);
    cancelNewBtn.addEventListener('click', showDashboard);

    voiceModeSelect.addEventListener('change', () => {
      if (voiceModeSelect.value === 'dual') {
        voice2Container.style.display = '';
      } else {
        voice2Container.style.display = 'none';
      }
    });

    newProjectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(newProjectForm);
      const data = {
        title: formData.get('title'),
        author: formData.get('author'),
        language: formData.get('language'),
        description: formData.get('description'),
        voiceMode: formData.get('voice-mode'),
        voice1: formData.get('voice1'),
        voice2: formData.get('voice2'),
        stability: parseFloat(formData.get('stability')),
        similarity: parseFloat(formData.get('similarity')),
        style: parseFloat(formData.get('style')),
        speed: parseFloat(formData.get('speed')),
        manuscript: formData.get('manuscript'),
        apiKey: formData.get('api-key')
      };
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()).then(resp => {
        if (resp.error) {
          alert(resp.error);
        } else {
          showProjectDetail(resp.project);
          newProjectForm.reset();
        }
      }).catch(err => {
        alert('Error creating project: ' + err);
      });
    });

    function loadProjects() {
      fetch('/api/projects').then(res => res.json()).then(data => {
        projectsListEl.innerHTML = '';
        data.projects.forEach((p) => {
          const row = document.createElement('div');
          row.className = 'project-row';
          // Build HTML for the project row without using backtick interpolation to
          // prevent Node from evaluating the expressions at build time.
          row.innerHTML = '<strong>' + p.title + '</strong> by ' + (p.author || 'Unknown') + ' &nbsp;(' + p.status + ')' +
            '<div class="progress-bar"><div class="progress" style="width:' + (p.progress.total ? (100 * p.progress.current / p.progress.total) : 0) + '%;"></div></div>';
          row.addEventListener('click', () => showProjectDetail(p));
          projectsListEl.appendChild(row);
        });
        if (data.projects.length === 0) {
          projectsListEl.innerHTML = '<p>No projects yet. Click "New Book" to get started.</p>';
        }
      });
    }
    function updateProgressBar() {
      const bar = document.getElementById('project-progress-bar');
      if (bar && currentProject) {
        const percent = currentProject.progress.total ? (100 * currentProject.progress.current / currentProject.progress.total) : 0;
        bar.style.width = percent + '%';
        const text = document.getElementById('progress-text');
        if (text) text.textContent = currentProject.progress.current + ' / ' + currentProject.progress.total;
      }
    }
    function appendLog(level, message, timestamp) {
      const panel = document.getElementById('log-panel');
      if (!panel) return;
      const div = document.createElement('div');
      const timeStr = new Date(timestamp).toLocaleTimeString();
      div.textContent = '[' + timeStr + '] ' + message;
      div.style.color = (level === 'error') ? '#d32f2f' : ((level === 'info') ? '#388e3c' : '#333');
      panel.appendChild(div);
      panel.scrollTop = panel.scrollHeight;
    }
    function renderProjectDetail(proj) {
      // Clear view
      projectDetailView.innerHTML = '';
      // Title and controls
      const headerDiv = document.createElement('div');
      headerDiv.className = 'flex justify-between items-center';
      const titleH = document.createElement('h2');
      titleH.textContent = proj.title;
      headerDiv.appendChild(titleH);
      const backBtn = document.createElement('button');
      backBtn.className = 'button';
      backBtn.textContent = 'Back';
      backBtn.addEventListener('click', () => {
        if (eventSource) eventSource.close();
        showDashboard();
      });
      headerDiv.appendChild(backBtn);
      projectDetailView.appendChild(headerDiv);
      // Progress bar
      const progressContainer = document.createElement('div');
      progressContainer.className = 'progress-bar';
      const progressInner = document.createElement('div');
      progressInner.id = 'project-progress-bar';
      progressInner.className = 'progress';
      const percent = proj.progress.total ? (100 * proj.progress.current / proj.progress.total) : 0;
      progressInner.style.width = percent + '%';
      progressContainer.appendChild(progressInner);
      projectDetailView.appendChild(progressContainer);
      const progressText = document.createElement('div');
      progressText.id = 'progress-text';
      progressText.style.fontSize = '0.8rem';
      progressText.textContent = proj.progress.current + ' / ' + proj.progress.total;
      projectDetailView.appendChild(progressText);
      // Pause/Resume buttons
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'flex flex-row mb-2';
      const pauseBtn = document.createElement('button');
      pauseBtn.className = 'button mr-1';
      pauseBtn.textContent = 'Pause';
      pauseBtn.disabled = proj.status !== 'processing';
      pauseBtn.addEventListener('click', () => {
        fetch('/api/project/' + proj.id + '/pause', { method: 'POST' }).then(() => {});
      });
      const resumeBtn = document.createElement('button');
      resumeBtn.className = 'button';
      resumeBtn.textContent = 'Resume';
      resumeBtn.disabled = proj.status !== 'paused';
      resumeBtn.addEventListener('click', () => {
        fetch('/api/project/' + proj.id + '/resume', { method: 'POST' }).then(() => {});
      });
      controlsDiv.appendChild(pauseBtn);
      controlsDiv.appendChild(resumeBtn);
      projectDetailView.appendChild(controlsDiv);
      // Chapters list
      proj.chapters.forEach((ch) => {
        const chCard = document.createElement('div');
        chCard.className = 'card';
        const chHeader = document.createElement('div');
        chHeader.className = 'chapter-header';
        chHeader.textContent = 'Chapter ' + (ch.index + 1) + ': ' + ch.title + ' (' + ch.status + ')';
        chCard.appendChild(chHeader);
        // Waveform & player if completed
        if (ch.status === 'done') {
          const audioDiv = document.createElement('div');
          audioDiv.id = 'waveform-' + proj.id + '-' + ch.index;
          audioDiv.className = 'audio-container';
          chCard.appendChild(audioDiv);
          // Controls for download
          const downloadBtn = document.createElement('button');
          downloadBtn.className = 'button mt-1';
          downloadBtn.textContent = 'Download Chapter';
          downloadBtn.addEventListener('click', () => {
            window.location = '/api/project/' + proj.id + '/download/chapter/' + ch.index;
          });
          chCard.appendChild(downloadBtn);
        } else {
          const p = document.createElement('p');
          p.textContent = 'Not finished yet...';
          chCard.appendChild(p);
        }
        // Show segments table summarising voice usage
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>Segment</th><th>Voice</th><th>Text length</th></tr>';
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        ch.segments.forEach((s) => {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td>' + (s.index + 1) + '</td><td>' + s.voice + '</td><td>' + s.textLength + '</td>';
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        chCard.appendChild(table);
        projectDetailView.appendChild(chCard);
      });
      // Log panel
      const logCard = document.createElement('div');
      logCard.className = 'card';
      const logHeader = document.createElement('h3');
      logHeader.textContent = 'Activity Log';
      logCard.appendChild(logHeader);
      const logPanel = document.createElement('div');
      logPanel.id = 'log-panel';
      logPanel.className = 'log-panel';
      // Populate with existing logs
      (currentProject.logs || []).forEach((entry) => {
        const [ts, rest] = entry.match(/^\[(.+?)\] (.*)$/).slice(1);
        appendLog('log', rest, ts);
      });
      logCard.appendChild(logPanel);
      projectDetailView.appendChild(logCard);
      // Full book download if done
      if (proj.status === 'done') {
        const fullBtn = document.createElement('button');
        fullBtn.className = 'button mt-2';
        fullBtn.textContent = 'Download Full Audiobook';
        fullBtn.addEventListener('click', () => {
          window.location = '/api/project/' + proj.id + '/download/book';
        });
        projectDetailView.appendChild(fullBtn);
      }
      // Initialise waveforms after DOM inserted
      setTimeout(() => {
        proj.chapters.forEach((ch) => {
          if (ch.status === 'done') {
            const elem = document.getElementById('waveform-' + proj.id + '-' + ch.index);
            if (elem && !elem.dataset.initialised) {
              elem.dataset.initialised = 'true';
              const wavesurfer = WaveSurfer.create({
                container: elem,
                waveColor: '#90caf9',
                progressColor: '#3f51b5',
                height: 80,
                responsive: true,
                backend: 'MediaElement'
              });
              wavesurfer.load('/api/project/' + proj.id + '/chapter/' + ch.index);
              // Once ready add regions for segments. Use relative text lengths to
              // approximate durations.
              wavesurfer.on('ready', () => {
                const total = ch.totalLength;
                let cum = 0;
                ch.segments.forEach((s, idx) => {
                  const rel = s.textLength / total;
                  const start = cum;
                  const end = cum + rel;
                  cum += rel;
                  // Assign color based on voice index
                  const voiceIdx = proj.voices.indexOf(s.voice);
                  const colors = ['rgba(63,81,181,0.2)', 'rgba(255,193,7,0.2)', 'rgba(76,175,80,0.2)', 'rgba(244,67,54,0.2)'];
                  const color = colors[voiceIdx % colors.length];
                  wavesurfer.addRegion({
                    start: start * wavesurfer.getDuration(),
                    end: end * wavesurfer.getDuration(),
                    color: color,
                    drag: false,
                    resize: false
                  });
                });
              });
            }
          }
        });
      }, 200);
    }
    // Initial load
    showDashboard();
  </script>
</body>
</html>`;

// Create and start the HTTP server
const PORT = process.env.PORT || 3100;
const server = http.createServer((req, res) => {
  // Simple CORS headers for all API responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  handleRequest(req, res).catch((err) => {
    console.error('Unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Audiobook generator listening on port ${PORT}`);
  // Attempt to open default browser when server starts
  const url = `http://localhost:${PORT}/`;
  try {
    const platform = process.platform;
    if (platform === 'darwin') {
      childProcess.exec(`open "${url}"`);
    } else if (platform === 'win32') {
      childProcess.exec(`start "" "${url}"`);
    } else {
      childProcess.exec(`xdg-open "${url}"`);
    }
  } catch (err) {
    console.warn('Could not automatically open the browser:', err);
  }
});

// Load existing projects from disk and resume any in‑progress work
loadProjects();
