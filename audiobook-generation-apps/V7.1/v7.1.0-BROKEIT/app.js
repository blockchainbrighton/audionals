#!/usr/bin/env node
/**
 * Audiobook Generator - Optimized Single File Application
 * Generates audiobooks using ElevenLabs API with web interface
 */
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), { spawn } = require('child_process'), { URL } = require('url');

// Configuration
const PORT = 3000, OUTPUT_DIR = path.join(__dirname, 'output');
const CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks'), CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const BOOK_DIR = path.join(OUTPUT_DIR, 'book'), TITLES_DIR = path.join(OUTPUT_DIR, 'titles');
const LOGS_DIR = path.join(OUTPUT_DIR, 'logs'), DATA_FILE = path.join(OUTPUT_DIR, 'projects.json');

const ELEVEN_MODELS = [
  ['multilingual-v2', 'eleven_multilingual_v2', 'ElevenLabs Multilingual v2'],
  ['multilingual-v3', 'eleven_multilingual_v3', 'ElevenLabs Multilingual v3'],
  ['turbo-v2', 'eleven_turbo_v2', 'ElevenLabs Turbo v2'],
  ['turbo-v2-5', 'eleven_turbo_v2_5', 'ElevenLabs Turbo v2.5'],
  ['flash-v2', 'eleven_flash_v2', 'ElevenLabs Flash v2'],
  ['flash-v2-5', 'eleven_flash_v2_5', 'ElevenLabs Flash v2.5'],
  ['monolingual-v1', 'eleven_monolingual_v1', 'ElevenLabs Monolingual v1'],
  ['monolingual-v2', 'eleven_monolingual_v2', 'ElevenLabs Monolingual v2']
];
const DEFAULT_MODEL = 'multilingual-v2';
const MODEL_IDS = Object.fromEntries(ELEVEN_MODELS.map(m => [m[0], m[1]]));
const MODEL_LABELS = Object.fromEntries(ELEVEN_MODELS.map(m => [m[0], m[2]]));
const MODEL_ALIASES = Object.fromEntries([
  ...ELEVEN_MODELS.map(m => [m[1], m[0]]),
  ...ELEVEN_MODELS.map(m => [m[0].replace(/-/g, '_'), m[0]]),
  ['v2', 'multilingual-v2'], ['v3', 'multilingual-v3']
]);

const MODEL_OPTIONS_HTML = ELEVEN_MODELS.map(m => 
  `<option value="${m[0]}"${m[0] === DEFAULT_MODEL ? ' selected' : ''}>${m[2]}</option>`
).join('');

const resolveModel = v => {
  if (typeof v !== 'string' || !v.trim()) return DEFAULT_MODEL;
  const t = v.trim();
  return MODEL_IDS[t] ? t : (MODEL_ALIASES[t] && MODEL_IDS[MODEL_ALIASES[t]]) ? MODEL_ALIASES[t] : DEFAULT_MODEL;
};

// Ensure directories exist
[OUTPUT_DIR, CHUNKS_DIR, CHAPTERS_DIR, BOOK_DIR, TITLES_DIR, LOGS_DIR].forEach(d => 
  fs.existsSync(d) || fs.mkdirSync(d, { recursive: true })
);

// Storage
let projects = loadProjects(), clients = new Map();

function loadProjects() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data && typeof data === 'object') Object.values(data).forEach(normalizeProject);
      return data;
    } catch (e) { console.error('Error loading projects:', e); }
  }
  return {};
}

const saveProjects = () => fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

function appendProjectLog(projectId, data) {
  if (!projectId || !data) return;
  try {
    fs.appendFileSync(path.join(LOGS_DIR, `${projectId}.jsonl`), 
      JSON.stringify({ timestamp: new Date().toISOString(), ...data }) + '\n');
  } catch (e) { console.error('Error appending log:', e); }
}

function getProjectLogs(projectId) {
  const logFile = path.join(LOGS_DIR, `${projectId}.jsonl`);
  if (!fs.existsSync(logFile)) return [];
  try {
    return fs.readFileSync(logFile, 'utf8').trim().split('\n')
      .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch (e) { return []; }
}

function sendUpdate(projectId, data) {
  appendProjectLog(projectId, data);
  const cl = clients.get(projectId);
  if (cl) {
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    cl.forEach(res => { try { res.write(msg); } catch {} });
  }
}

const readJsonBody = req => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    if (!body) return resolve({});
    try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
  });
  req.on('error', reject);
});

// Text processing utilities
const ZERO_WIDTH = /[\u200B\u200C\u200D\uFEFF]/g;
const NON_WORD = /[^\p{L}\p{N}]+/gu;

const sanitize = v => typeof v === 'string' ? v.replace(ZERO_WIDTH, '').trim() : '';
const normalize = v => typeof v === 'string' ? v.replace(ZERO_WIDTH, '').toLowerCase().replace(NON_WORD, '') : '';
const voiceLabel = (names, i) => {
  const idx = Number.isFinite(i) ? i : 0;
  return Array.isArray(names) && typeof names[idx] === 'string' && names[idx].trim() 
    ? names[idx].trim() : `Voice ${idx + 1}`;
};

function extractVoiceIndicator(line) {
  const c = sanitize(line);
  if (!c) return '';
  const m = c.match(/^([^\s]+)/);
  return m ? normalize(m[1]) : '';
}

function prepareVoiceCandidates(voiceNames) {
  if (!Array.isArray(voiceNames)) return [];
  return voiceNames.map((name, index) => {
    if (typeof name !== 'string') return null;
    const label = name.trim();
    if (!label) return null;
    const primary = normalize(label.split(/\s+/)[0] || label);
    const full = normalize(label);
    return (primary || full) ? { index, label, primary, full } : null;
  }).filter(Boolean);
}

function detectChapterStartingVoice(chapterText, heading, voiceNames = []) {
  if (typeof heading === 'string' && heading.length && Array.isArray(voiceNames)) {
    const lh = heading.toLowerCase();
    for (let i = 0; i < voiceNames.length; i++) {
      const name = voiceNames[i];
      if (typeof name === 'string' && name.trim() && lh.includes(name.trim().toLowerCase()))
        return { index: i, label: name, sourceLine: `Title detection: "${heading}"` };
    }
  }
  if (typeof chapterText !== 'string' || !chapterText.trim()) return null;
  
  const lines = chapterText.split('\n').map(sanitize);
  let ptr = 0;
  while (ptr < lines.length && !lines[ptr]) ptr++;
  if (ptr >= lines.length) return null;
  
  const normHead = typeof heading === 'string' ? normalize(heading) : '';
  if (normHead) {
    const lt = normalize(lines[ptr]);
    if (lt && (lt === normHead || normHead.startsWith(lt) || lt.startsWith(normHead))) ptr++;
  } else if (getChapterHeadingRegex().test(lines[ptr])) ptr++;
  
  while (ptr < lines.length && !lines[ptr]) ptr++;
  if (ptr >= lines.length) return null;
  
  const firstLine = lines[ptr], indicator = extractVoiceIndicator(firstLine);
  if (!indicator) return null;
  
  const candidates = prepareVoiceCandidates(voiceNames);
  if (!candidates.length) return null;
  
  const normLine = normalize(firstLine);
  for (const c of candidates) {
    if ((c.primary && indicator === c.primary) || (c.full && indicator === c.full))
      return { index: c.index, label: c.label, sourceLine: firstLine };
  }
  for (const c of candidates) {
    if (c.full && normLine.startsWith(c.full))
      return { index: c.index, label: c.label, sourceLine: firstLine };
  }
  return null;
}

function normalizeProject(project) {
  if (!project || typeof project !== 'object') return;
  if (!Array.isArray(project.voiceNames)) project.voiceNames = [];
  if (typeof project.titleIntroText !== 'string') project.titleIntroText = '';
  if (!project.titleIntroText && typeof project.description === 'string' && project.description.trim())
    project.titleIntroText = project.description.trim();
  delete project.description;
  if (!Number.isFinite(project.titleIntroVoiceIndex) || project.titleIntroVoiceIndex < 0) project.titleIntroVoiceIndex = 0;
  if (typeof project.titleIntroFile !== 'string') project.titleIntroFile = null;
  if (typeof project.titleIntroUrl !== 'string') project.titleIntroUrl = null;
  
  const pause = Number(project.pauseBetweenChaptersSeconds);
  project.pauseBetweenChaptersSeconds = Number.isFinite(pause) && pause >= 0 
    ? Math.round(Math.min(pause, 30) * 10) / 10 : 2;
  project.modelVersion = resolveModel(project.modelVersion);
  
  if (!Array.isArray(project.chapters)) return;
  let maxNum = project.chapters.reduce((m, c) => Number.isFinite(c.number) && c.number > m ? c.number : m, 0);
  if (maxNum === 0) {
    project.chapters.forEach((c, i) => c.number = i + 1);
    maxNum = project.chapters.length;
  } else {
    project.chapters.forEach(c => {
      if (!Number.isFinite(c.number) || c.number <= 0) c.number = ++maxNum;
    });
  }
  project.chapters.sort((a, b) => (a.number || 0) - (b.number || 0));
  
  project.chapters.forEach(ch => {
    if (!Array.isArray(ch.segments)) { ch.segments = []; return; }
    const svi = Number.isFinite(ch.startingVoiceIndex) ? Math.abs(ch.startingVoiceIndex) % 2 : 0;
    ch.startingVoiceIndex = svi;
    ch.startingVoiceLabel = typeof ch.startingVoiceLabel === 'string' && ch.startingVoiceLabel.trim()
      ? ch.startingVoiceLabel.trim() : voiceLabel(project.voiceNames, svi);
    ch.startingVoiceLine = typeof ch.startingVoiceLine === 'string' ? ch.startingVoiceLine.trim() : null;
    ch.segments = ch.segments.map((s, i) => ({ ...s, index: Number.isFinite(s.index) ? s.index : i, status: s.status || 'pending' }));
  });
}

const getNextChapterNumber = p => (!p || !Array.isArray(p.chapters) || !p.chapters.length) ? 1 
  : p.chapters.reduce((m, c) => Number.isFinite(c.number) && c.number > m ? c.number : m, 0) + 1;

function appendChaptersToProject(project, newChapters) {
  if (!project) return;
  if (!Array.isArray(project.chapters)) project.chapters = [];
  const toAdd = Array.isArray(newChapters) ? newChapters : [];
  const voiceNames = Array.isArray(project.voiceNames) ? project.voiceNames : [];
  
  toAdd.forEach(ch => {
    const svi = Number.isFinite(ch.startingVoiceIndex) ? Math.abs(ch.startingVoiceIndex) % 2 : 0;
    const svl = typeof ch.startingVoiceLabel === 'string' && ch.startingVoiceLabel.trim()
      ? ch.startingVoiceLabel.trim() : voiceLabel(voiceNames, svi);
    const svLine = typeof ch.startingVoiceLine === 'string' && ch.startingVoiceLine.trim()
      ? ch.startingVoiceLine.trim() : null;
    const segs = Array.isArray(ch.segments) ? ch.segments.map((s, i) => ({
      ...s, index: i, voiceIndex: Number.isFinite(s.voiceIndex) ? Math.abs(s.voiceIndex) % 2 : (svi + i) % 2,
      status: 'pending', file: null
    })) : [];
    project.chapters.push({
      ...ch, title: ch.title || `Chapter ${ch.number}`, startingVoiceIndex: svi, startingVoiceLabel: svl,
      startingVoiceLine: svLine, status: 'pending', segments: segs, file: null, url: null, error: null, demo: false
    });
  });
  
  project.chapters.sort((a, b) => (a.number || 0) - (b.number || 0));
  if (project.status !== 'paused' && project.status !== 'processing') project.status = 'pending';
  project.updatedAt = new Date().toISOString();
  
  if (project.bookFile) {
    try { fs.existsSync(project.bookFile) && fs.unlinkSync(project.bookFile); } catch {}
    project.bookFile = null; project.bookUrl = null;
  }
  project.completedAt = null;
}

// Language configuration
const LANG_CONFIG = [
  ['en', 'English', ['Chapter'], ['By', 'Written by', 'Narrated by']],
  ['de', 'German', ['Kapitel'], ['Von', 'Geschrieben von']],
  ['es', 'Spanish', ['Capítulo', 'Capitulo'], ['Por', 'Escrito por']],
  ['fr', 'French', ['Chapitre'], ['Par', 'Écrit par']],
  ['it', 'Italian', ['Capitolo'], ['Di', 'Scritto da']],
  ['pt', 'Portuguese', ['Capítulo', 'Capitulo'], ['Por', 'Escrito por']],
  ['nl', 'Dutch', ['Hoofdstuk'], ['Door', 'Geschreven door']],
  ['pl', 'Polish', ['Rozdział'], ['Przez', 'Napisał']],
  ['ru', 'Russian', ['Глава'], ['Автор']],
  ['tr', 'Turkish', ['Bölüm'], ['Yazan']],
  ['fi', 'Finnish', ['Luku'], ['Kirjoittanut']],
  ['hu', 'Hungarian', ['Fejezet'], ['Írta']],
  ['cs', 'Czech', ['Kapitola'], ['Napsal']],
  ['el', 'Greek', ['Κεφάλαιο'], ['Από']],
  ['id', 'Indonesian', ['Bab'], ['Oleh']],
  ['unk', 'Unknown', ['Part', 'Parte', 'Partie', 'Teil', 'Livre', 'Libro', 'Buch'], []]
];

const escapeRegex = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function getChapterHeadingRegex() {
  const kw = LANG_CONFIG.flatMap(l => l[2]).sort((a, b) => b.length - a.length);
  return new RegExp(`^\\s*(?:#{1,6}\\s+[^\\n#]+|(?:${kw.map(escapeRegex).join('|')})(?:\\s+[^\\n]+)?)\\s*$`, 'gmi');
}

function detectProjectMetadata(manuscript, preamble) {
  let lang = 'English', title = '', author = '';
  for (const l of LANG_CONFIG) {
    if (l[0] === 'unk') continue;
    for (const kw of l[2]) {
      if (new RegExp(`^\\s*${escapeRegex(kw)}\\s+`, 'mi').test(manuscript)) { lang = l[1]; break; }
    }
    if (lang !== 'English') break;
  }
  if (preamble && preamble.trim()) {
    const lines = preamble.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length) {
      const tm = lines.find(l => /^(?:Title|Titre|Título|Titel):/i.test(l));
      title = tm ? tm.replace(/^(?:Title|Titre|Título|Titel):\s*/i, '').trim() : lines[0];
      const lc = LANG_CONFIG.find(l => l[1] === lang) || LANG_CONFIG[0];
      const byKw = [...(lc[3] || []), 'By', 'Author'];
      for (const line of lines) {
        for (const bk of byKw) {
          const m = line.match(new RegExp(`^${escapeRegex(bk)}[:\\s]+\\s*(.+)`, 'i'));
          if (m) { author = m[1].trim(); break; }
        }
        if (author) break;
      }
      if (!author && lines.length > 1 && lines[1].length < 100 && lines[0] === title) author = lines[1];
    }
  }
  return { language: lang, title, author };
}

const extractChapterTitle = h => h ? h.replace(/^#{1,6}\s*/, '').trim() : '';
const normalizeManuscript = t => typeof t === 'string' ? t.replace(/\r\n/g, '\n').replace(/\f/g, '\n') : '';

function buildDelimiterRegex(delim) {
  const ZW = /[\u200B\u200C\u200D\uFEFF]/g, ZWP = '[\u200B\u200C\u200D\uFEFF]*';
  const san = delim.replace(ZW, '');
  if (!san) return null;
  const pattern = san.split(/(\s+)/).filter(Boolean).map(p => 
    /^\s+$/.test(p) ? '\\s+' : p.split('').map(c => `${escapeRegex(c)}${ZWP}`).join('')
  ).join('');
  return pattern ? new RegExp(pattern, 'g') : null;
}

function parseDualVoiceSegments(text, delim = '* * *', initVoice = 0) {
  const segs = [], token = typeof delim === 'string' && delim.trim() ? delim : '* * *';
  const regex = buildDelimiterRegex(token), baseVoice = Number.isFinite(initVoice) ? Math.abs(initVoice) % 2 : 0;
  if (!regex) {
    const c = text.trim();
    if (c) segs.push({ content: c, voiceIndex: baseVoice });
    return segs;
  }
  let lastIdx = 0, count = 0, m;
  while ((m = regex.exec(text)) !== null) {
    const c = text.slice(lastIdx, m.index).trim();
    if (c) segs.push({ content: c, voiceIndex: (baseVoice + count) % 2 });
    count++; lastIdx = regex.lastIndex;
    if (m.index === regex.lastIndex) regex.lastIndex++;
  }
  const trail = text.slice(lastIdx).trim();
  if (trail) segs.push({ content: trail, voiceIndex: (baseVoice + count) % 2 });
  return segs;
}

function parseManuscript(text, mode, opts = {}) {
  const chapters = [], token = opts.voiceSwitchToken || '* * *';
  const startNum = Number.isFinite(opts.startingNumber) && opts.startingNumber > 0 ? Math.floor(opts.startingNumber) : 1;
  const ms = normalizeManuscript(text), regex = getChapterHeadingRegex(), matches = [...ms.matchAll(regex)];
  const voiceNames = Array.isArray(opts.voiceNames) ? opts.voiceNames : [];
  let preamble = matches.length && matches[0].index > 0 ? ms.substring(0, matches[0].index).trim() : '';

  const addChapter = (title, content, rawTitle) => {
    const num = startNum + chapters.length;
    if (mode === 'single') {
      chapters.push({ title: title || `Chapter ${num}`, content, voice: null, number: num });
    } else {
      const det = detectChapterStartingVoice(content, rawTitle, voiceNames);
      const svi = det && Number.isFinite(det.index) ? Math.abs(det.index) % 2 : 0;
      const svl = det && det.label ? det.label : voiceLabel(voiceNames, svi);
      chapters.push({
        title: title || `Chapter ${num}`, content, voice: null, startingVoiceIndex: svi, startingVoiceLabel: svl,
        startingVoiceLine: det ? det.sourceLine : null, segments: parseDualVoiceSegments(content, token, svi), number: num
      });
    }
  };

  if (!matches.length) {
    addChapter('Full Text', ms.trim(), null);
  } else {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index, end = i < matches.length - 1 ? matches[i + 1].index : ms.length;
      const content = ms.substring(start, end).trim(), rawTitle = matches[i][0].trim();
      addChapter(extractChapterTitle(rawTitle), content, rawTitle);
    }
  }
  return { chapters, preamble };
}

function splitIntoChunks(text, maxChars = 4500) {
  const chunks = [], sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxChars && current) { chunks.push(current.trim()); current = s; }
    else current += s;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ElevenLabs API
function elevenLabsRequest(endpoint, method, headers, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const opts = { hostname: url.hostname, port: url.port || 443, path: url.pathname + url.search, method, headers };
    const req = https.request(opts, res => {
      if (method === 'GET' && endpoint.includes('/voices')) {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => res.statusCode === 200 ? resolve(JSON.parse(data)) : reject(new Error(`API error: ${res.statusCode} ${data}`)));
      } else {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => res.statusCode === 200 ? resolve(Buffer.concat(chunks)) : reject(new Error(`API error: ${res.statusCode}`)));
      }
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const getVoices = apiKey => elevenLabsRequest('https://api.elevenlabs.io/v2/voices', 'GET', { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }).then(d => d.voices || []);

async function generateAudio(text, voiceId, apiKey, settings = {}, modelVer = DEFAULT_MODEL) {
  const modelId = MODEL_IDS[resolveModel(modelVer)] || MODEL_IDS[DEFAULT_MODEL];
  return elevenLabsRequest(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, 'POST',
    { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    { text, model_id: modelId, voice_settings: { stability: settings.stability || 0.5, similarity_boost: settings.similarity_boost || 0.75, style: settings.style || 0, speed: settings.speed || 1.0 } }
  );
}

// FFmpeg utilities
const executeFfmpeg = (args, ctx = 'ffmpeg') => new Promise((resolve, reject) => {
  const ff = spawn('ffmpeg', args, { stdio: 'pipe' });
  ff.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg ${ctx} exited with code ${code}`)));
  ff.on('error', reject);
});

const createSilenceFile = (dur, out) => executeFfmpeg(['-y', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', dur.toString(), '-ar', '44100', '-ac', '2', '-b:a', '128k', out], 'silence');
const normalizeAudio = (inp, out) => executeFfmpeg(['-y', '-i', inp, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', out], 'normalization');

async function mergeAudioFiles(inputFiles, outputFile, opts = {}) {
  if (!Array.isArray(inputFiles) || !inputFiles.length) throw new Error('No input files provided');
  const gap = Math.round(Math.min(Math.max(Number.isFinite(opts.gapSeconds) ? opts.gapSeconds : 0, 0), 30) * 1000) / 1000;
  const hasGap = gap >= 0.01, filesToMerge = [], tempFiles = [];
  const baseDir = path.dirname(outputFile), stem = path.basename(outputFile, path.extname(outputFile));

  try {
    inputFiles.forEach((f, i) => {
      filesToMerge.push(f);
      if (hasGap && i < inputFiles.length - 1)
        tempFiles.push({ path: path.join(baseDir, `${stem}_gap_${i}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`), created: false });
    });
    if (hasGap) {
      for (const t of tempFiles) { await createSilenceFile(gap, t.path); t.created = true; }
      let idx = 1;
      tempFiles.forEach(t => { filesToMerge.splice(idx, 0, t.path); idx += 2; });
    }
    const listFile = `${outputFile}.list`, tempOut = path.join(baseDir, `${stem}_merged_${Date.now()}.mp3`);
    fs.writeFileSync(listFile, filesToMerge.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
    try {
      await executeFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c:a', 'libmp3lame', '-b:a', '160k', '-ar', '44100', '-ac', '2', '-id3v2_version', '3', tempOut], 'merge');
      fs.existsSync(outputFile) && fs.unlinkSync(outputFile);
      fs.renameSync(tempOut, outputFile);
    } finally {
      try { fs.existsSync(listFile) && fs.unlinkSync(listFile); fs.existsSync(tempOut) && fs.unlinkSync(tempOut); } catch {}
    }
  } finally {
    tempFiles.forEach(t => { try { t.created && fs.existsSync(t.path) && fs.unlinkSync(t.path); } catch {} });
  }
}

// Process chapter
// Get effective settings for a chapter (merges project defaults with chapter overrides)
function getChapterSettings(project, ch) {
  const ps = project.settings || {}, so = ch.settingsOverride || {};
  return {
    stability: so.stability !== undefined ? so.stability : (ps.stability !== undefined ? ps.stability : 0.5),
    similarity_boost: so.similarity_boost !== undefined ? so.similarity_boost : (ps.similarity_boost !== undefined ? ps.similarity_boost : 0.75),
    style: so.style !== undefined ? so.style : (ps.style !== undefined ? ps.style : 0),
    speed: so.speed !== undefined ? so.speed : (ps.speed !== undefined ? ps.speed : 1.0)
  };
}

function getChapterModel(project, ch) {
  const so = ch.settingsOverride || {};
  return so.modelVersion || project.modelVersion || DEFAULT_MODEL;
}

async function processChapter(project, chapterIndex) {
  const ch = project.chapters[chapterIndex], chapterId = `${project.id}_ch${chapterIndex}`;
  const isDemo = Boolean(project.demoMode);
  const demoCharLimit = project.demoCharLimit > 0 ? project.demoCharLimit : 600;
  const demoChunksPerSeg = project.demoChunksPerSegment > 0 ? project.demoChunksPerSegment : 1;
  const demoSegsPerCh = project.demoSegmentsPerChapter > 0 ? project.demoSegmentsPerChapter : 2;
  // Get effective settings for this chapter (project defaults + chapter overrides)
  const chSettings = getChapterSettings(project, ch);
  const chModel = getChapterModel(project, ch);

  sendUpdate(project.id, { type: 'chapter_start', chapterIndex, title: ch.title });
  ch.status = 'processing'; ch.segments = ch.segments || []; saveProjects();

  try {
    const chunkFiles = [];
    if (project.mode === 'single') {
      const content = isDemo ? ch.content.slice(0, demoCharLimit) : ch.content;
      let chunks = splitIntoChunks(content);
      if (isDemo) chunks = chunks.slice(0, demoChunksPerSeg);
      for (let i = 0; i < chunks.length; i++) {
        if (project.status === 'paused') { ch.status = 'paused'; saveProjects(); return; }
        sendUpdate(project.id, { type: 'segment_start', chapterIndex, segmentIndex: i, total: chunks.length });
        const chunkFile = path.join(CHUNKS_DIR, `${chapterId}_${i}.mp3`);
        if (!fs.existsSync(chunkFile)) {
          const buf = await generateAudio(chunks[i], project.voices[0], project.apiKey, chSettings, chModel);
          fs.writeFileSync(chunkFile, buf);
        }
        chunkFiles.push(chunkFile);
        ch.segments[i] = { index: i, voice: 0, status: 'completed', file: chunkFile };
        sendUpdate(project.id, { type: 'segment_complete', chapterIndex, segmentIndex: i });
        saveProjects();
      }
    } else {
      const segs = isDemo ? ch.segments.slice(0, Math.min(ch.segments.length, demoSegsPerCh)) : ch.segments;
      let segIdx = 0;
      for (const seg of segs) {
        const content = isDemo ? seg.content.slice(0, demoCharLimit) : seg.content;
        let chunks = splitIntoChunks(content);
        if (isDemo) chunks = chunks.slice(0, demoChunksPerSeg);
        for (let i = 0; i < chunks.length; i++) {
          if (project.status === 'paused') { ch.status = 'paused'; saveProjects(); return; }
          sendUpdate(project.id, { type: 'segment_start', chapterIndex, segmentIndex: segIdx, voice: seg.voiceIndex });
          const chunkFile = path.join(CHUNKS_DIR, `${chapterId}_${segIdx}.mp3`);
          if (!fs.existsSync(chunkFile)) {
            const buf = await generateAudio(chunks[i], project.voices[seg.voiceIndex], project.apiKey, chSettings, chModel);
            fs.writeFileSync(chunkFile, buf);
          }
          chunkFiles.push(chunkFile);
          seg.status = 'completed'; seg.file = chunkFile;
          sendUpdate(project.id, { type: 'segment_complete', chapterIndex, segmentIndex: segIdx });
          segIdx++; saveProjects();
        }
      }
      if (isDemo && segs.length < ch.segments.length) {
        for (let i = segs.length; i < ch.segments.length; i++) ch.segments[i].status = 'skipped';
        saveProjects();
      }
    }
    const chFile = path.join(CHAPTERS_DIR, `${chapterId}.mp3`), normFile = path.join(CHAPTERS_DIR, `${chapterId}_normalized.mp3`);
    sendUpdate(project.id, { type: 'chapter_merging', chapterIndex });
    await mergeAudioFiles(chunkFiles, chFile);
    await normalizeAudio(chFile, normFile);
    fs.unlinkSync(chFile); fs.renameSync(normFile, chFile);
    ch.status = 'completed'; ch.demo = isDemo; ch.file = chFile; ch.url = `/audio/chapters/${path.basename(chFile)}`;
    sendUpdate(project.id, { type: 'chapter_complete', chapterIndex, url: ch.url });
    saveProjects();
  } catch (e) {
    ch.status = 'error'; ch.error = e.message;
    sendUpdate(project.id, { type: 'chapter_error', chapterIndex, error: e.message });
    saveProjects(); throw e;
  }
}

async function processProject(projectId, opts = {}) {
  const project = projects[projectId];
  if (!project) return;
  const batchLimit = Number.isFinite(opts.limit) && opts.limit > 0 ? Math.floor(opts.limit) : null;
  project.status = 'processing'; project.error = null; saveProjects();

  try {
    const total = project.chapters.length;
    const reqLimit = typeof project.chapterLimit === 'number' && project.chapterLimit > 0 ? Math.min(project.chapterLimit, total) : total;
    const effLimit = project.demoMode ? Math.min(reqLimit, 1) : reqLimit;
    let processed = 0;

    for (let i = 0; i < project.chapters.length; i++) {
      const ch = project.chapters[i];
      if (typeof effLimit === 'number' && i >= effLimit) {
        if (ch.status !== 'skipped') {
          ch.status = 'skipped';
          if (Array.isArray(ch.segments)) ch.segments.forEach(s => s.status = 'skipped');
          saveProjects();
          sendUpdate(projectId, { type: project.demoMode ? 'chapter_skipped_demo' : 'chapter_skipped', chapterIndex: i });
        }
        continue;
      }
      if (ch.status === 'completed' || ch.status === 'skipped') continue;
      if (batchLimit !== null && processed >= batchLimit) break;
      ch.status = 'pending'; ch.error = null;
      if (project.status === 'paused') break;
      await processChapter(project, i);
      processed++;
      if (project.status === 'paused') break;
    }
    if (project.status === 'paused') { saveProjects(); return; }
    const hasErr = project.chapters.some(c => c.status === 'error');
    const hasPend = project.chapters.some(c => c.status === 'pending');
    project.status = hasErr ? 'error' : hasPend ? 'pending' : 'ready_for_merge';
    if (project.status === 'ready_for_merge') sendUpdate(projectId, { type: 'project_ready_for_merge' });
    saveProjects();
  } catch (e) {
    project.status = 'error'; project.error = e.message;
    sendUpdate(projectId, { type: 'project_error', error: e.message });
    saveProjects();
  }
}

async function finalizeProject(projectId) {
  const project = projects[projectId];
  if (!project) throw new Error('Project not found');
  const incomplete = project.chapters.find(c => c.status !== 'completed' && c.status !== 'skipped');
  if (incomplete) throw new Error('All chapters must be completed before finalizing');
  const chFiles = project.chapters.filter(c => c.file && fs.existsSync(c.file)).map(c => c.file);
  const hasTitleIntro = typeof project.titleIntroFile === 'string' && project.titleIntroFile && fs.existsSync(project.titleIntroFile);
  if (!hasTitleIntro && !chFiles.length) throw new Error('No audio files available');
  sendUpdate(projectId, { type: 'book_merging' });

  const bookFile = path.join(BOOK_DIR, `${projectId}_audiobook.mp3`);
  const baseGap = Number.isFinite(project.pauseBetweenChaptersSeconds) ? Math.min(Math.max(project.pauseBetweenChaptersSeconds, 0), 30) : 2;
  const filesToMerge = [], tempSilence = [];
  let gapCnt = 0;

  const addSilence = async sec => {
    if (!Number.isFinite(sec) || sec <= 0) return;
    const dur = Math.min(Math.max(sec, 0), 60);
    if (dur <= 0) return;
    const sf = path.join(BOOK_DIR, `${projectId}_gap_${gapCnt++}_${Date.now()}.mp3`);
    await createSilenceFile(dur, sf);
    tempSilence.push(sf); filesToMerge.push(sf);
  };

  if (hasTitleIntro) { filesToMerge.push(project.titleIntroFile); if (chFiles.length) await addSilence(baseGap * 2); }
  for (let i = 0; i < chFiles.length; i++) { filesToMerge.push(chFiles[i]); if (i < chFiles.length - 1) await addSilence(baseGap); }
  if (!filesToMerge.length) throw new Error('No audio files available');

  try { await mergeAudioFiles(filesToMerge, bookFile, { gapSeconds: 0 }); }
  finally { tempSilence.forEach(f => { try { fs.existsSync(f) && fs.unlinkSync(f); } catch {} }); }

  project.bookFile = bookFile; project.bookUrl = `/audio/book/${path.basename(bookFile)}`;
  project.status = 'completed'; project.completedAt = new Date().toISOString(); project.updatedAt = new Date().toISOString();
  saveProjects();
  sendUpdate(projectId, { type: 'project_complete', bookUrl: project.bookUrl });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`), pathname = url.pathname;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Static files
  if (pathname === '/' || pathname === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(getHTML()); return; }

  // Audio files
  if (pathname.startsWith('/audio/')) {
    const fullPath = path.join(OUTPUT_DIR, pathname.replace('/audio/', ''));
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': stat.size });
      fs.createReadStream(fullPath).pipe(res);
    } else { res.writeHead(404); res.end('Not found'); }
    return;
  }

  // API: Project logs
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/logs') && req.method === 'GET') {
    const pid = pathname.split('/')[3];
    if (!projects[pid]) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(getProjectLogs(pid))); return;
  }

  // API: Estimate
  if (pathname === '/api/estimate' && req.method === 'POST') {
    try {
      const data = await readJsonBody(req);
      const text = typeof data.text === 'string' ? data.text : '', modelId = MODEL_IDS[resolveModel(data.modelVersion)] || MODEL_IDS[DEFAULT_MODEL];
      const charCount = text.length, mult = modelId.includes('turbo') || modelId.includes('flash') ? 0.5 : 1.0;
      const creditCount = Math.ceil(charCount * mult), cost = creditCount * 0.000165;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ charCount, creditCount, estimatedCost: cost, multiplier: mult }));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: Preview
  if (pathname === '/api/preview' && req.method === 'POST') {
    try {
      const data = await readJsonBody(req);
      const token = typeof data.voiceSwitchToken === 'string' && data.voiceSwitchToken.trim() ? data.voiceSwitchToken.trim() : '***';
      const voiceNames = Array.isArray(data.voiceNames) ? data.voiceNames : [];
      const { chapters, preamble } = parseManuscript(data.manuscript, data.mode, { voiceSwitchToken: token, voiceNames });
      const detected = detectProjectMetadata(data.manuscript, preamble);
      const charCount = data.manuscript.length, modelId = MODEL_IDS[resolveModel(data.modelVersion)] || MODEL_IDS[DEFAULT_MODEL];
      const mult = modelId.includes('turbo') || modelId.includes('flash') ? 0.5 : 1.0;
      const creditCount = Math.ceil(charCount * mult), cost = creditCount * 0.000165;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        metadata: detected, stats: { charCount, creditCount, estimatedCost: cost, chapterCount: chapters.length },
        previewChapters: chapters.map(c => ({ number: c.number, title: c.title, startingVoice: c.startingVoiceLabel || 'Default', segmentCount: c.segments ? c.segments.length : 0 }))
      }));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: List projects
  if (pathname === '/api/projects' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(Object.values(projects))); return;
  }

  // API: Create project
  if (pathname === '/api/projects' && req.method === 'POST') {
    let body = ''; req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const token = typeof data.voiceSwitchToken === 'string' && data.voiceSwitchToken.trim() ? data.voiceSwitchToken.trim() : '* * *';
        let chapterLimit = null;
        if (data.chapterLimit != null && data.chapterLimit !== '') {
          const pl = parseInt(data.chapterLimit, 10);
          if (Number.isNaN(pl) || pl <= 0) throw new Error('Chapter limit must be a positive integer');
          chapterLimit = pl;
        }
        const demoMode = Boolean(data.demoMode), modelVer = resolveModel(data.modelVersion);
        let pause = Number(data.pauseBetweenChaptersSeconds);
        pause = Number.isFinite(pause) && pause >= 0 ? Math.round(Math.min(pause, 30) * 10) / 10 : 2;
        await getVoices(data.apiKey);
        const pid = generateId();
        const voiceNames = [];
        if (Array.isArray(data.voiceNames)) data.voiceNames.forEach((n, i) => { if (i < (data.voices?.length || 0) && typeof n === 'string' && n.trim()) voiceNames[i] = n.trim(); });
        const { chapters, preamble } = parseManuscript(data.manuscript, data.mode, { voiceSwitchToken: token, voiceNames });
        const detected = detectProjectMetadata(data.manuscript, preamble);
        const finalTitle = (data.title?.trim()) || detected.title || 'Untitled Project';
        const finalAuthor = (data.author?.trim()) || detected.author || 'Unknown Author';
        const finalLang = (data.language?.trim()) || detected.language || 'English';
        const titleIntro = typeof data.titleIntroText === 'string' && data.titleIntroText.trim() ? data.titleIntroText.trim() : (preamble || '');

        projects[pid] = {
          id: pid, title: finalTitle, author: finalAuthor, language: finalLang, mode: data.mode, voices: data.voices,
          apiKey: data.apiKey, settings: data.settings || {}, chapterLimit, demoMode,
          demoCharLimit: data.demoCharLimit > 0 ? data.demoCharLimit : undefined,
          demoChunksPerSegment: data.demoChunksPerSegment > 0 ? data.demoChunksPerSegment : undefined,
          demoSegmentsPerChapter: data.demoSegmentsPerChapter > 0 ? data.demoSegmentsPerChapter : undefined,
          voiceSwitchToken: token, voiceNames, modelVersion: modelVer, titleIntroText: titleIntro,
          titleIntroVoiceIndex: 0, titleIntroFile: null, titleIntroUrl: null, pauseBetweenChaptersSeconds: pause,
          chapters: chapters.map(c => ({
            ...c, status: 'pending', segments: Array.isArray(c.segments) ? c.segments.map((s, i) => ({ ...s, index: i, status: 'pending', file: null })) : [],
            file: null, url: null, error: null, demo: false
          })),
          status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        normalizeProject(projects[pid]); saveProjects();
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ projectId: pid, chapters: chapters.length }));
      } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // API: Get single project
  if (pathname.startsWith('/api/projects/') && !pathname.includes('/start') && !pathname.includes('/pause') && !pathname.includes('/resume') && !pathname.includes('/finalize') && !pathname.includes('/chapters') && !pathname.includes('/voices') && !pathname.includes('/merge-settings') && !pathname.includes('/title-intro') && !pathname.includes('/logs') && !pathname.includes('/settings') && !pathname.includes('/reset') && req.method === 'GET') {
    const pid = pathname.split('/')[3];
    if (projects[pid]) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(projects[pid])); }
    else { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); }
    return;
  }

  // API: Start project
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/start') && req.method === 'POST') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    let limit = null;
    try { const d = await readJsonBody(req); if (d && Number.isFinite(d.limit) && d.limit > 0) limit = Math.floor(d.limit); } catch {}
    project.status = 'processing'; saveProjects();
    sendUpdate(pid, { type: 'project_processing' });
    processProject(pid, { limit }).catch(console.error);
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'started', limit })); return;
  }

  // API: Process single chapter
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/process-chapter') && req.method === 'POST') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    try {
      const data = await readJsonBody(req), idx = Number(data.index);
      if (!Number.isFinite(idx) || idx < 0 || idx >= project.chapters.length) throw new Error('Invalid chapter index');
      project.status = 'processing'; saveProjects();
      sendUpdate(pid, { type: 'project_processing' });
      processChapter(project, idx).then(() => {
        const hasErr = project.chapters.some(c => c.status === 'error');
        const hasPend = project.chapters.some(c => c.status === 'pending');
        project.status = hasErr ? 'error' : hasPend ? 'pending' : 'ready_for_merge';
        if (project.status === 'ready_for_merge') sendUpdate(pid, { type: 'project_ready_for_merge' });
        saveProjects();
      }).catch(e => { project.status = 'error'; project.error = e.message; saveProjects(); });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'processing', index: idx }));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: Pause
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/pause') && req.method === 'POST') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (project) { project.status = 'paused'; saveProjects(); sendUpdate(pid, { type: 'project_paused' }); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'paused' })); }
    else { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); }
    return;
  }

  // API: Resume
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/resume') && req.method === 'POST') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    let limit = null;
    try { const d = await readJsonBody(req); if (d && Number.isFinite(d.limit) && d.limit > 0) limit = Math.floor(d.limit); } catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid request body' })); return; }
    project.status = 'processing'; saveProjects(); sendUpdate(pid, { type: 'project_processing' });
    processProject(pid, { limit }).catch(console.error);
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'resumed', limit })); return;
  }

  // API: Finalize
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/finalize') && req.method === 'POST') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    try { await finalizeProject(pid); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'finalized', bookUrl: project.bookUrl })); }
    catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: Voices
  if (pathname === '/api/voices' && req.method === 'POST') {
    let body = ''; req.on('data', c => body += c);
    req.on('end', async () => {
      try { const { apiKey } = JSON.parse(body); const voices = await getVoices(apiKey); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(voices)); }
      catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // API: Add chapters
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/chapters') && req.method === 'POST') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    try {
      const data = await readJsonBody(req), ms = typeof data.manuscript === 'string' ? data.manuscript.trim() : '';
      if (!ms) throw new Error('Manuscript text is required');
      const mode = data.mode || project.mode;
      if (mode !== project.mode) throw new Error('Additional chapters must use the same mode');
      const token = typeof data.voiceSwitchToken === 'string' && data.voiceSwitchToken.trim() ? data.voiceSwitchToken.trim() : project.voiceSwitchToken || '* * *';
      const { chapters: parsed } = parseManuscript(ms, mode, { voiceSwitchToken: token, startingNumber: getNextChapterNumber(project), voiceNames: project.voiceNames });
      if (!parsed.length) throw new Error('No chapters detected');
      appendChaptersToProject(project, parsed);
      project.voiceSwitchToken = token; project.updatedAt = new Date().toISOString();
      normalizeProject(project); saveProjects(); sendUpdate(pid, { type: 'project_updated' });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ added: parsed.length, nextChapterNumber: getNextChapterNumber(project) }));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: Merge settings
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/merge-settings') && req.method === 'POST') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    try {
      const data = await readJsonBody(req), raw = Number(data.pauseBetweenChaptersSeconds);
      if (!Number.isFinite(raw)) throw new Error('Pause must be a number');
      project.pauseBetweenChaptersSeconds = Math.round(Math.min(Math.max(raw, 0), 30) * 10) / 10;
      project.updatedAt = new Date().toISOString(); normalizeProject(project); saveProjects(); sendUpdate(pid, { type: 'project_updated' });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ pauseBetweenChaptersSeconds: project.pauseBetweenChaptersSeconds }));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: Voice names
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/voices') && req.method === 'POST') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    try {
      const data = await readJsonBody(req), namesIn = Array.isArray(data.voiceNames) ? data.voiceNames : [];
      const expected = Array.isArray(project.voices) && project.voices.length ? project.voices.length : (project.mode === 'dual' ? 2 : 1);
      const voiceNames = [];
      for (let i = 0; i < expected; i++) voiceNames[i] = typeof namesIn[i] === 'string' ? namesIn[i].trim() : '';
      project.voiceNames = voiceNames; project.updatedAt = new Date().toISOString();
      normalizeProject(project); saveProjects(); sendUpdate(pid, { type: 'project_voice_updated', voiceNames });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ voiceNames }));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: Delete project
  if (pathname.startsWith('/api/projects/') && req.method === 'DELETE') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    try {
      const keepBook = url.searchParams.get('keepBook') === 'true';
      if (keepBook && project.bookFile && fs.existsSync(project.bookFile)) {
        const safeTitle = (project.title || 'Untitled').replace(/[^a-z0-9\s-_]/gi, '').trim().replace(/\s+/g, '_') || 'Audiobook';
        const ext = path.extname(project.bookFile);
        let finalPath = path.join(BOOK_DIR, `${safeTitle}${ext}`), cnt = 1;
        while (fs.existsSync(finalPath)) finalPath = path.join(BOOK_DIR, `${safeTitle}_${cnt++}${ext}`);
        try { fs.renameSync(project.bookFile, finalPath); } catch {}
      }
      const dirs = [CHUNKS_DIR, CHAPTERS_DIR, TITLES_DIR, LOGS_DIR];
      if (!keepBook) dirs.push(BOOK_DIR);
      dirs.forEach(d => { if (fs.existsSync(d)) fs.readdirSync(d).forEach(f => { if (f.startsWith(pid)) try { fs.unlinkSync(path.join(d, f)); } catch {} }); });
      delete projects[pid]; saveProjects();
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'deleted', projectId: pid }));
    } catch (e) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: Title intro
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/title-intro') && req.method === 'POST') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    let payload;
    try { payload = await readJsonBody(req); } catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid request body' })); return; }
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    if (!text) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Title intro text is required' })); return; }
    let voiceIdx = Number(payload.voiceIndex);
    if (!Number.isFinite(voiceIdx) || voiceIdx < 0) voiceIdx = Number.isFinite(project.titleIntroVoiceIndex) ? project.titleIntroVoiceIndex : 0;
    voiceIdx = Math.floor(voiceIdx);
    const voices = Array.isArray(project.voices) ? project.voices : [];
    if (!voices.length) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'No voices configured' })); return; }
    if (voiceIdx >= voices.length) voiceIdx = 0;
    const voiceId = voices[voiceIdx];
    if (typeof voiceId !== 'string' || !voiceId) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid voice' })); return; }
    const rawFile = path.join(TITLES_DIR, `${pid}_title_raw.mp3`), normFile = path.join(TITLES_DIR, `${pid}_title_normalized.mp3`), finalFile = path.join(TITLES_DIR, `${pid}_title.mp3`);
    try {
      const buf = await generateAudio(text, voiceId, project.apiKey, project.settings, project.modelVersion);
      fs.writeFileSync(rawFile, buf); await normalizeAudio(rawFile, normFile);
      fs.existsSync(rawFile) && fs.unlinkSync(rawFile); fs.existsSync(finalFile) && fs.unlinkSync(finalFile);
      fs.renameSync(normFile, finalFile);
      project.titleIntroText = text; project.titleIntroVoiceIndex = voiceIdx; project.titleIntroFile = finalFile;
      project.titleIntroUrl = `/audio/titles/${path.basename(finalFile)}`; project.updatedAt = new Date().toISOString();
      saveProjects(); sendUpdate(pid, { type: 'title_intro_updated', url: project.titleIntroUrl });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ url: project.titleIntroUrl }));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: Update project settings (voice settings, model, demo mode)
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/settings') && req.method === 'POST') {
    const pid = pathname.split('/')[3], project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    if (project.status === 'processing') { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Cannot modify settings while processing' })); return; }
    try {
      const data = await readJsonBody(req), updated = {};
      // Voice settings
      if (data.settings && typeof data.settings === 'object') {
        const s = data.settings, ps = project.settings || {};
        if (Number.isFinite(s.stability)) ps.stability = Math.max(0, Math.min(1, s.stability));
        if (Number.isFinite(s.similarity_boost)) ps.similarity_boost = Math.max(0, Math.min(1, s.similarity_boost));
        if (Number.isFinite(s.style)) ps.style = Math.max(0, Math.min(1, s.style));
        if (Number.isFinite(s.speed)) ps.speed = Math.max(0.5, Math.min(2, s.speed));
        project.settings = ps; updated.settings = ps;
      }
      // Model version
      if (data.modelVersion !== undefined) {
        project.modelVersion = resolveModel(data.modelVersion); updated.modelVersion = project.modelVersion;
      }
      // Demo mode settings
      if (typeof data.demoMode === 'boolean') { project.demoMode = data.demoMode; updated.demoMode = data.demoMode; }
      if (Number.isFinite(data.demoCharLimit) && data.demoCharLimit > 0) { project.demoCharLimit = data.demoCharLimit; updated.demoCharLimit = data.demoCharLimit; }
      if (Number.isFinite(data.demoChunksPerSegment) && data.demoChunksPerSegment > 0) { project.demoChunksPerSegment = data.demoChunksPerSegment; updated.demoChunksPerSegment = data.demoChunksPerSegment; }
      if (Number.isFinite(data.demoSegmentsPerChapter) && data.demoSegmentsPerChapter > 0) { project.demoSegmentsPerChapter = data.demoSegmentsPerChapter; updated.demoSegmentsPerChapter = data.demoSegmentsPerChapter; }
      project.updatedAt = new Date().toISOString(); saveProjects();
      sendUpdate(pid, { type: 'settings_updated', ...updated });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'updated', ...updated }));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: Update chapter-specific settings (overrides project defaults)
  if (pathname.match(/\/api\/projects\/[^/]+\/chapters\/\d+\/settings$/) && req.method === 'POST') {
    const parts = pathname.split('/'), pid = parts[3], chIdx = parseInt(parts[5], 10);
    const project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    if (!Number.isFinite(chIdx) || chIdx < 0 || chIdx >= project.chapters.length) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid chapter index' })); return; }
    const ch = project.chapters[chIdx];
    if (ch.status === 'processing') { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Cannot modify while processing' })); return; }
    try {
      const data = await readJsonBody(req);
      if (!ch.settingsOverride) ch.settingsOverride = {};
      const so = ch.settingsOverride;
      // Voice settings overrides
      if (data.settings && typeof data.settings === 'object') {
        const s = data.settings;
        if (Number.isFinite(s.stability)) so.stability = Math.max(0, Math.min(1, s.stability));
        else if (s.stability === null) delete so.stability;
        if (Number.isFinite(s.similarity_boost)) so.similarity_boost = Math.max(0, Math.min(1, s.similarity_boost));
        else if (s.similarity_boost === null) delete so.similarity_boost;
        if (Number.isFinite(s.style)) so.style = Math.max(0, Math.min(1, s.style));
        else if (s.style === null) delete so.style;
        if (Number.isFinite(s.speed)) so.speed = Math.max(0.5, Math.min(2, s.speed));
        else if (s.speed === null) delete so.speed;
      }
      // Model override
      if (data.modelVersion !== undefined) {
        if (data.modelVersion === null) delete so.modelVersion;
        else so.modelVersion = resolveModel(data.modelVersion);
      }
      // Clear empty override object
      if (Object.keys(so).length === 0) delete ch.settingsOverride;
      project.updatedAt = new Date().toISOString(); saveProjects();
      sendUpdate(pid, { type: 'chapter_settings_updated', chapterIndex: chIdx, settingsOverride: ch.settingsOverride || null });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'updated', chapterIndex: chIdx, settingsOverride: ch.settingsOverride || null }));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // API: Reset chapter to pending (allows re-processing with new settings)
  if (pathname.match(/\/api\/projects\/[^/]+\/chapters\/\d+\/reset$/) && req.method === 'POST') {
    const parts = pathname.split('/'), pid = parts[3], chIdx = parseInt(parts[5], 10);
    const project = projects[pid];
    if (!project) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Project not found' })); return; }
    if (!Number.isFinite(chIdx) || chIdx < 0 || chIdx >= project.chapters.length) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid chapter index' })); return; }
    if (project.status === 'processing') { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Cannot reset while project is processing' })); return; }
    const ch = project.chapters[chIdx], chapterId = `${pid}_ch${chIdx}`;
    try {
      // Delete existing audio files for this chapter
      if (ch.file && fs.existsSync(ch.file)) fs.unlinkSync(ch.file);
      // Delete chunk files
      if (fs.existsSync(CHUNKS_DIR)) {
        fs.readdirSync(CHUNKS_DIR).forEach(f => { if (f.startsWith(chapterId)) try { fs.unlinkSync(path.join(CHUNKS_DIR, f)); } catch {} });
      }
      // Reset chapter state
      ch.status = 'pending'; ch.file = null; ch.url = null; ch.error = null; ch.demo = false;
      if (Array.isArray(ch.segments)) ch.segments.forEach(s => { s.status = 'pending'; s.file = null; });
      // Reset project status if it was completed
      if (project.status === 'completed' || project.status === 'ready_for_merge') {
        project.status = 'pending';
        // Invalidate merged book
        if (project.bookFile && fs.existsSync(project.bookFile)) { try { fs.unlinkSync(project.bookFile); } catch {} }
        project.bookFile = null; project.bookUrl = null; project.completedAt = null;
      }
      project.updatedAt = new Date().toISOString(); saveProjects();
      sendUpdate(pid, { type: 'chapter_reset', chapterIndex: chIdx });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'reset', chapterIndex: chIdx }));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // SSE events
  if (pathname.startsWith('/api/events/') && req.method === 'GET') {
    const pid = pathname.split('/')[3];
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    if (!clients.has(pid)) clients.set(pid, []);
    clients.get(pid).push(res);
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    req.on('close', () => { const cl = clients.get(pid); if (cl) { const i = cl.indexOf(res); if (i > -1) cl.splice(i, 1); } });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

// HTML Frontend (minified CSS)
function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Audiobook Generator</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:20px}.container{max-width:1400px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 25px 80px rgba(0,0,0,.35);overflow:hidden}header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:35px 30px;text-align:center}header h1{font-size:2.5em;margin-bottom:10px;text-shadow:0 2px 4px rgba(0,0,0,.2)}header p{opacity:.9;font-size:1.1em}.content{padding:30px}.tabs{display:flex;gap:5px;border-bottom:2px solid #e0e0e0;margin-bottom:30px}.tab{padding:15px 30px;background:none;border:none;font-size:1.05em;cursor:pointer;color:#666;border-bottom:3px solid transparent;transition:all .2s;border-radius:8px 8px 0 0}.tab:hover{color:#667eea;background:rgba(102,126,234,.05)}.tab.active{color:#667eea;border-bottom-color:#667eea;background:rgba(102,126,234,.08)}.tab-content{display:none;animation:fadeIn .3s ease}.tab-content.active{display:block}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.form-group{margin-bottom:20px}label{display:block;margin-bottom:8px;font-weight:600;color:#333}.sub-label{margin-top:10px;margin-bottom:6px;font-weight:500;color:#555}.checkbox-label{display:flex;align-items:center;gap:10px;font-weight:500;cursor:pointer;padding:8px 12px;border-radius:6px;transition:background .2s}.checkbox-label:hover{background:rgba(102,126,234,.05)}.checkbox-label input[type="checkbox"]{width:18px;height:18px;margin:0;accent-color:#667eea}input[type="text"],input[type="number"],textarea,select{width:100%;padding:12px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:1em;font-family:inherit;transition:border-color .2s,box-shadow .2s}input:focus,textarea:focus,select:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.15)}textarea{min-height:200px;resize:vertical}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:768px){.form-row{grid-template-columns:1fr}}button{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:12px 24px;font-size:1em;border-radius:8px;cursor:pointer;transition:transform .15s,box-shadow .15s,opacity .15s;font-weight:600;display:inline-flex;align-items:center;gap:8px}button:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,.4)}button:active{transform:translateY(0)}button:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}.btn-secondary{background:#6c757d}.btn-secondary:hover{box-shadow:0 6px 20px rgba(108,117,125,.4)}.btn-success{background:linear-gradient(135deg,#28a745 0%,#20c997 100%)}.btn-success:hover{box-shadow:0 6px 20px rgba(40,167,69,.4)}.btn-danger{background:linear-gradient(135deg,#dc3545 0%,#e83e8c 100%)}.btn-danger:hover{box-shadow:0 6px 20px rgba(220,53,69,.4)}.btn-small{padding:8px 16px;font-size:.9em}.btn-icon{padding:8px 12px;min-width:auto}.projects-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-top:20px}.btn-delete-project{position:absolute;top:12px;right:12px;background:#dc3545;color:#fff;border:none;border-radius:50%;width:28px;height:28px;font-size:1.1em;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:10;opacity:.7}.btn-delete-project:hover{background:#c82333;opacity:1;transform:scale(1.1)}.project-card{background:#f8f9fa;border-radius:12px;padding:20px;cursor:pointer;transition:all .2s;position:relative;border:2px solid transparent}.project-card:hover{transform:translateY(-4px);box-shadow:0 12px 35px rgba(0,0,0,.12);border-color:rgba(102,126,234,.3)}.project-card h3{margin-bottom:10px;color:#333;font-size:1.1em}.project-card p{color:#666;font-size:.9em;margin-bottom:6px}.status-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:.75em;font-weight:600;text-transform:uppercase;letter-spacing:.5px}.status-pending{background:#fff3cd;color:#856404;border:1px solid #ffc107}.status-processing{background:#d1ecf1;color:#0c5460;border:1px solid #17a2b8;animation:pulse 2s infinite}.status-completed{background:#d4edda;color:#155724;border:1px solid #28a745}.status-ready_for_merge{background:#e2d5f1;color:#5a3d7a;border:1px solid #6f42c1}.status-paused{background:#ffe5d0;color:#984c0c;border:1px solid #fd7e14}.status-error{background:#f8d7da;color:#721c24;border:1px solid #dc3545}.status-skipped{background:#e9ecef;color:#495057;border:1px solid #6c757d}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}.voice-config{background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%);padding:24px;border-radius:12px;margin-bottom:20px;border:1px solid #e0e0e0}.voice-config h3{margin-bottom:15px;color:#333;display:flex;align-items:center;gap:8px}.hidden{display:none!important}.loading{text-align:center;padding:60px 40px}.spinner{width:48px;height:48px;border:4px solid #e0e0e0;border-top-color:#667eea;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}@keyframes spin{to{transform:rotate(360deg)}}.chapter-list{margin-top:20px;display:flex;flex-direction:column;gap:12px}.chapter-item{background:#fff;padding:18px;border-radius:10px;border:1px solid #e0e0e0;border-left:4px solid #667eea;transition:all .2s}.chapter-item:hover{box-shadow:0 4px 15px rgba(0,0,0,.08);border-color:#667eea}.chapter-title{font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.chapter-meta{font-size:.85em;color:#666;display:flex;align-items:center;gap:12px;flex-wrap:wrap}.controls{display:flex;gap:8px;margin-top:15px;flex-wrap:wrap;align-items:center}.progress-bar{width:100%;height:10px;background:#e0e0e0;border-radius:5px;overflow:hidden;margin-top:10px}.progress-fill{height:100%;background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);transition:width .4s ease;position:relative}.progress-fill::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);animation:shimmer 2s infinite}@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}.segment-table{width:100%;border-collapse:collapse;margin-top:15px;border-radius:8px;overflow:hidden}.segment-table th,.segment-table td{padding:12px;text-align:left;border-bottom:1px solid #e0e0e0}.segment-table th{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-weight:600}.segment-table tr:hover td{background:rgba(102,126,234,.05)}.activity-log{background:#f8f9fa;border-radius:10px;padding:15px;margin-top:20px;max-height:300px;overflow-y:auto;border:1px solid #e0e0e0}.log-entry{padding:10px 12px;border-bottom:1px solid #e0e0e0;font-size:.9em;display:flex;gap:12px;align-items:flex-start;transition:background .2s}.log-entry:hover{background:rgba(102,126,234,.05)}.log-entry:last-child{border-bottom:none}.log-time{color:#666;font-size:.8em;white-space:nowrap;background:#e9ecef;padding:2px 8px;border-radius:4px}.help-text{font-size:.85em;color:#666;margin-top:5px;font-style:italic}.section-heading{font-size:1.15em;font-weight:600;margin-top:28px;margin-bottom:12px;color:#333;display:flex;align-items:center;gap:10px;padding-bottom:8px;border-bottom:2px solid #e0e0e0}.section-heading::before{content:'';width:4px;height:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:2px}.section-subtext{font-size:.9em;color:#666;margin-bottom:15px}.voice-name-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:15px}.title-intro-preview{margin-top:15px;padding:15px;background:#f8f9fa;border-radius:8px}.title-intro-preview audio{width:100%;margin-top:10px;border-radius:8px}.slider-group{margin-bottom:18px;padding:12px;background:#fff;border-radius:8px;border:1px solid #e9ecef}.slider-group input[type="range"]{width:100%;margin-top:8px;height:8px;-webkit-appearance:none;background:linear-gradient(90deg,#667eea,#764ba2);border-radius:4px;cursor:pointer}.slider-group input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;background:#fff;border:3px solid #667eea;border-radius:50%;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2);transition:transform .15s}.slider-group input[type="range"]::-webkit-slider-thumb:hover{transform:scale(1.15)}.slider-group input[type="range"]::-moz-range-thumb{width:20px;height:20px;background:#fff;border:3px solid #667eea;border-radius:50%;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2)}.info-icon{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-size:10px;font-weight:700;cursor:help;margin-left:6px;position:relative;transition:transform .15s}.info-icon:hover{transform:scale(1.1)}.info-icon::after{content:attr(data-tooltip);position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%) translateY(4px);background:rgba(33,37,41,.95);color:#fff;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:400;min-width:220px;max-width:300px;text-align:left;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:100;white-space:normal;box-shadow:0 4px 15px rgba(0,0,0,.2)}.info-icon::before{content:'';position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);border-width:6px;border-style:solid;border-color:rgba(33,37,41,.95) transparent transparent transparent;opacity:0;transition:opacity .2s;pointer-events:none}.info-icon:hover::after,.info-icon:focus::after{opacity:1;transform:translate(-50%,-4px)}.info-icon:hover::before,.info-icon:focus::before{opacity:1}.slider-group label.slider-label{display:flex;align-items:center;gap:10px;font-weight:600;color:#333}.slider-group label .slider-label-text{flex:1}.slider-group label .slider-value{font-weight:700;color:#667eea;background:rgba(102,126,234,.1);padding:4px 10px;border-radius:6px;min-width:45px;text-align:center}.toast-container{position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px}.toast{padding:14px 20px;border-radius:10px;color:#fff;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.2);animation:slideIn .3s ease;display:flex;align-items:center;gap:10px;max-width:350px}.toast-success{background:linear-gradient(135deg,#28a745 0%,#20c997 100%)}.toast-error{background:linear-gradient(135deg,#dc3545 0%,#e83e8c 100%)}.toast-info{background:linear-gradient(135deg,#17a2b8 0%,#6f42c1 100%)}@keyframes slideIn{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}.collapsible{border:1px solid #e0e0e0;border-radius:10px;margin-bottom:15px;overflow:hidden}.collapsible-header{padding:15px 20px;background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%);cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-weight:600;transition:background .2s}.collapsible-header:hover{background:linear-gradient(135deg,#e9ecef 0%,#dee2e6 100%)}.collapsible-header::after{content:'▼';font-size:.8em;transition:transform .3s}.collapsible.collapsed .collapsible-header::after{transform:rotate(-90deg)}.collapsible-content{padding:20px;background:#fff}.collapsible.collapsed .collapsible-content{display:none}.project-progress{margin:15px 0;padding:15px;background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%);border-radius:10px}.project-progress-label{display:flex;justify-content:space-between;margin-bottom:8px;font-size:.9em;color:#555}.project-progress-label strong{color:#333}
body.dark-mode{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#e0e0e0}body.dark-mode .container,body.dark-mode .project-card,body.dark-mode #project-modal>div,body.dark-mode #delete-modal>div,body.dark-mode .voice-config,body.dark-mode .activity-log,body.dark-mode .chapter-item,body.dark-mode .slider-group,body.dark-mode .collapsible-content,body.dark-mode .project-progress,body.dark-mode .title-intro-preview{background:#1f2937;color:#e0e0e0;border-color:#374151}body.dark-mode h1,body.dark-mode h2,body.dark-mode h3,body.dark-mode .section-heading,body.dark-mode label,body.dark-mode .chapter-title,body.dark-mode .project-card h3,body.dark-mode .slider-group label.slider-label,body.dark-mode .collapsible-header{color:#f3f4f6}body.dark-mode .sub-label,body.dark-mode .section-subtext,body.dark-mode .chapter-meta,body.dark-mode .help-text,body.dark-mode .project-card p,body.dark-mode .log-time{color:#9ca3af}body.dark-mode input,body.dark-mode textarea,body.dark-mode select{background:#374151;border-color:#4b5563;color:#fff}body.dark-mode .tab{color:#9ca3af}body.dark-mode .tab.active,body.dark-mode .tab:hover{color:#818cf8;border-bottom-color:#818cf8;background:rgba(129,140,248,.1)}body.dark-mode .segment-table th{background:linear-gradient(135deg,#4c51bf 0%,#6b46c1 100%);color:#fff}body.dark-mode .segment-table td,body.dark-mode .segment-table th{border-bottom-color:#4b5563}body.dark-mode .segment-table tr:hover td{background:rgba(129,140,248,.1)}body.dark-mode .chapter-item{background:#2d3748;border-color:#4b5563;border-left-color:#818cf8}body.dark-mode .chapter-item:hover{border-color:#818cf8}body.dark-mode .log-entry{border-bottom-color:#4b5563}body.dark-mode .log-entry:hover{background:rgba(129,140,248,.1)}body.dark-mode .log-time{background:#374151}body.dark-mode #chapter-settings-modal>div,body.dark-mode #review-modal>div{background:#1f2937;color:#e0e0e0}body.dark-mode .collapsible{border-color:#4b5563}body.dark-mode .collapsible-header{background:linear-gradient(135deg,#2d3748 0%,#374151 100%)}body.dark-mode .collapsible-header:hover{background:linear-gradient(135deg,#374151 0%,#4b5563 100%)}body.dark-mode .slider-group{background:#2d3748;border-color:#4b5563}body.dark-mode .slider-group label .slider-value{background:rgba(129,140,248,.2);color:#818cf8}body.dark-mode .project-progress{background:linear-gradient(135deg,#2d3748 0%,#374151 100%)}body.dark-mode .progress-bar{background:#4b5563}body.dark-mode .checkbox-label:hover{background:rgba(129,140,248,.1)}body.dark-mode .section-heading{border-bottom-color:#4b5563}body.dark-mode .status-pending{background:#4a4520;color:#ffc107;border-color:#6b5e1f}body.dark-mode .status-processing{background:#1a3a4a;color:#63b3ed;border-color:#2b6cb0}body.dark-mode .status-completed{background:#1a4a2e;color:#68d391;border-color:#276749}body.dark-mode .status-ready_for_merge{background:#3d2a5c;color:#b794f4;border-color:#6b46c1}body.dark-mode .status-paused{background:#4a3520;color:#f6ad55;border-color:#c05621}body.dark-mode .status-error{background:#4a1a1a;color:#fc8181;border-color:#c53030}body.dark-mode .status-skipped{background:#2d3748;color:#a0aec0;border-color:#4a5568}
</style>
</head>
<body>
<div id="toast-container" class="toast-container"></div>
<div class="container">
<header style="position:relative">
<h1>🎙️ Audiobook Generator</h1>
<p>Transform your manuscripts into professional audiobooks with AI voices</p>
<button onclick="toggleDarkMode()" class="btn-secondary btn-small" style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4)">🌙 Dark Mode</button>
</header>
<script>function toggleDarkMode(){document.body.classList.toggle('dark-mode');localStorage.setItem('darkMode',document.body.classList.contains('dark-mode'))}if(localStorage.getItem('darkMode')==='true')document.body.classList.add('dark-mode')</script>
<div class="content">
<div class="tabs">
<button class="tab active" data-tab="dashboard" onclick="switchTab('dashboard',event)">Dashboard</button>
<button class="tab" data-tab="new-book" onclick="switchTab('new-book',event)">New Book</button>
</div>
<div id="dashboard" class="tab-content active">
<h2>Your Projects</h2>
<div id="projects-list" class="projects-grid"><div class="loading"><div class="spinner"></div><p>Loading projects...</p></div></div>
</div>
<div id="new-book" class="tab-content">
<h2>Create New Audiobook</h2>
<form id="new-book-form">
<div class="form-group">
<label for="api-key">ElevenLabs API Key *<span class="info-icon" tabindex="0" data-tooltip="Your personal ElevenLabs key authorises voice lookups and audio generation.">i</span></label>
<input type="text" id="api-key" required placeholder="Enter your API key">
<button type="button" class="btn-secondary btn-small" onclick="loadVoices()" style="margin-top:10px">Load Voices</button>
</div>
<div class="form-row">
<div class="form-group"><label for="title">Book Title</label><input type="text" id="title" placeholder="Leave blank to auto-detect"></div>
<div class="form-group"><label for="author">Author</label><input type="text" id="author" placeholder="Leave blank to auto-detect"></div>
</div>
<div class="form-row">
<div class="form-group"><label for="language">Language</label><input type="text" id="language" placeholder="e.g. English (Leave blank to auto-detect)"></div>
<div class="form-group"><label for="mode">Narration Mode *<span class="info-icon" tabindex="0" data-tooltip="Single voice for one narrator, dual voice to alternate using the changeover marker.">i</span></label>
<select id="mode" required onchange="updateVoiceSelectors()"><option value="single">Single Voice</option><option value="dual">Dual Voice</option></select></div>
</div>
<div class="form-row">
<div class="form-group"><label for="model-version">ElevenLabs Model *<span class="info-icon" tabindex="0" data-tooltip="Select which ElevenLabs voice model to use.">i</span></label>
<select id="model-version" required>${MODEL_OPTIONS_HTML}</select></div>
</div>
<div class="form-row">
<div class="form-group"><label for="chapter-limit">Chapters to Process<span class="info-icon" tabindex="0" data-tooltip="Set how many chapters to generate. Leave blank to process all.">i</span></label>
<input type="number" id="chapter-limit" min="1" placeholder="Leave blank to process all"></div>
<div class="form-group"><label>Demo Mode<span class="info-icon" tabindex="0" data-tooltip="Creates a short sample for quick previews.">i</span></label>
<label class="checkbox-label"><input type="checkbox" id="demo-mode"><span>Generate a short preview sample</span></label></div>
</div>
<div class="form-group"><label for="pause-between-chapters">Pause Between Chapters (seconds)<span class="info-icon" tabindex="0" data-tooltip="Silence added between chapters in the final audiobook.">i</span></label>
<input type="number" id="pause-between-chapters" min="0" max="30" step="0.5" value="2">
<span class="help-text">Set to 0 for no gap.</span></div>
<div class="form-group"><label for="manuscript">Manuscript *</label>
<textarea id="manuscript" required placeholder="Paste your full manuscript here. Text before the first Chapter heading will be detected as Title Intro."></textarea></div>
<div class="voice-config"><h3>Voice Selection</h3>
<div class="form-row">
<div class="form-group"><label for="voice-1">Voice 1 *<span class="info-icon" tabindex="0" data-tooltip="Primary narration voice.">i</span></label>
<select id="voice-1" required><option value="">Load voices first</option></select>
<label for="voice-1-name" class="sub-label">Character Name</label><input type="text" id="voice-1-name" placeholder="e.g. Demetri"></div>
<div class="form-group hidden" id="voice-2-group"><label for="voice-2">Voice 2 *<span class="info-icon" tabindex="0" data-tooltip="Secondary voice for dual mode.">i</span></label>
<select id="voice-2"><option value="">Load voices first</option></select>
<label for="voice-2-name" class="sub-label">Character Name</label><input type="text" id="voice-2-name" placeholder="e.g. Diana"></div>
</div>
<div class="form-group"><label for="voice-change-token">Voice Changeover Token<span class="info-icon" tabindex="0" data-tooltip="Marker to switch between voices.">i</span></label>
<input type="text" id="voice-change-token" value="* * *" maxlength="16">
<span class="help-text">Marker used to switch between voices in the manuscript.</span></div>
<h3 style="margin-top:20px">Audio Settings</h3>
<div class="slider-group"><label class="slider-label"><span class="slider-label-text">Stability</span><span class="info-icon" tabindex="0" data-tooltip="Higher values keep delivery consistent.">i</span><span id="stability-value" class="slider-value">0.5</span></label>
<input type="range" id="stability" min="0" max="1" step="0.1" value="0.5" oninput="updateSliderValue('stability')"></div>
<div class="slider-group"><label class="slider-label"><span class="slider-label-text">Similarity Boost</span><span class="info-icon" tabindex="0" data-tooltip="How closely output matches original voice.">i</span><span id="similarity-value" class="slider-value">0.75</span></label>
<input type="range" id="similarity" min="0" max="1" step="0.05" value="0.75" oninput="updateSliderValue('similarity')"></div>
<div class="slider-group"><label class="slider-label"><span class="slider-label-text">Style</span><span class="info-icon" tabindex="0" data-tooltip="Adds dramatic flair to delivery.">i</span><span id="style-value" class="slider-value">0</span></label>
<input type="range" id="style" min="0" max="1" step="0.1" value="0" oninput="updateSliderValue('style')"></div>
<div class="slider-group"><label class="slider-label"><span class="slider-label-text">Speed</span><span class="info-icon" tabindex="0" data-tooltip="Controls playback tempo. 1.0 is normal.">i</span><span id="speed-value" class="slider-value">1.0</span></label>
<input type="range" id="speed" min="0.5" max="2" step="0.1" value="1" oninput="updateSliderValue('speed')"></div>
</div>
<button type="submit" style="margin-top:20px">Review & Confirm</button>
</form>
</div>
</div>
</div>
<div id="project-modal" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:1000;overflow-y:auto">
<div style="max-width:1200px;margin:50px auto;background:#fff;border-radius:12px;padding:30px">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
<h2 id="modal-title">Project Details</h2><button onclick="closeModal()" class="btn-secondary">Close</button>
</div>
<div id="modal-content"></div>
</div>
</div>
<div id="delete-modal" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:1100;display:flex;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:12px;padding:30px;max-width:500px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,.2)">
<h2 id="delete-modal-title" style="margin-bottom:15px;color:#dc3545">Delete Project?</h2>
<p style="margin-bottom:20px;color:#555">How would you like to handle the generated audio files?</p>
<div style="display:flex;flex-direction:column;gap:10px">
<button class="btn-danger" onclick="performDelete('full')"><strong>Option A: Delete Everything</strong><br><span style="font-size:.85em;font-weight:normal">Remove project and ALL audio files.</span></button>
<button style="background:#17a2b8" onclick="performDelete('keep_book')"><strong>Option B: Keep Final Audiobook</strong><br><span style="font-size:.85em;font-weight:normal">Keep the final merged book, remove working files.</span></button>
<button class="btn-secondary" onclick="cancelDelete()" style="margin-top:10px">Cancel</button>
</div>
</div>
</div>
<div id="chapter-settings-modal" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:1150;overflow-y:auto">
<div style="max-width:600px;margin:50px auto;background:#fff;border-radius:12px;padding:30px;box-shadow:0 10px 40px rgba(0,0,0,.3)">
<div id="chapter-settings-content"></div>
</div>
</div>
<div id="review-modal" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:1200;overflow-y:auto">
<div style="max-width:800px;margin:50px auto;background:#fff;border-radius:12px;padding:30px;box-shadow:0 10px 40px rgba(0,0,0,.3)">
<h2 style="margin-bottom:20px">Review Project Details</h2>
<div id="review-content"></div>
<div class="controls" style="margin-top:30px;justify-content:flex-end">
<button class="btn-secondary" onclick="closeReviewModal()">Edit</button>
<button class="btn-success" onclick="confirmCreateProject()">Confirm & Create Project</button>
</div>
</div>
</div>
<script>
let currentProject=null,eventSource=null,availableVoices=[],pendingProjectData=null,deleteProjectId=null;
const MODEL_LABELS=${JSON.stringify(MODEL_LABELS)},DEFAULT_MODEL_KEY='${DEFAULT_MODEL}';
const escapeHtml=s=>s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):'';
const formatStatus=s=>s?s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'Unknown';
const formatModelVersion=v=>MODEL_LABELS[v]||v||'Unknown';
const getVoiceLabel=(p,i)=>{if(p.voiceNames&&p.voiceNames[i])return p.voiceNames[i];if(availableVoices.length){const v=p.voices&&p.voices[i];const found=availableVoices.find(x=>x.voice_id===v);if(found)return found.name}return'Voice '+(i+1)};
const formatVoiceSummary=p=>{if(!p.voices||!p.voices.length)return'';return p.voices.map((v,i)=>getVoiceLabel(p,i)).join(', ')};
const getBatchLimit=()=>{const el=document.getElementById('batch-size');if(!el)return null;const v=parseInt(el.value,10);return Number.isFinite(v)&&v>0?v:null};
function showToast(message,type='info'){const container=document.getElementById('toast-container');const toast=document.createElement('div');toast.className='toast toast-'+type;toast.innerHTML=(type==='success'?'✓ ':type==='error'?'✗ ':'ℹ ')+message;container.appendChild(toast);setTimeout(()=>{toast.style.animation='slideIn .3s ease reverse';setTimeout(()=>toast.remove(),300)},4000)}
function switchTab(name,evt){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));const btn=(evt&&(evt.currentTarget||evt.target))||document.querySelector('.tab[data-tab="'+name+'"]');if(btn)btn.classList.add('active');document.getElementById(name).classList.add('active');if(name==='dashboard')loadProjects()}
function updateSliderValue(name){const s=document.getElementById(name),d=document.getElementById(name+'-value');d.textContent=s.value}
function updateVoiceSelectors(){const mode=document.getElementById('mode').value,v2=document.getElementById('voice-2-group'),ti=document.getElementById('voice-change-token'),th=ti?ti.nextElementSibling:null;if(mode==='dual'){v2.classList.remove('hidden');document.getElementById('voice-2').required=true;if(ti)ti.disabled=false;if(th)th.textContent='Marker used to switch between voices.'}else{v2.classList.add('hidden');document.getElementById('voice-2').required=false;if(ti)ti.disabled=true;if(th)th.textContent='Enable dual voice mode to customise.'}}
async function loadVoices(){const apiKey=document.getElementById('api-key').value;if(!apiKey){showToast('Please enter your API key first','error');return}try{const r=await fetch('/api/voices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey})});if(!r.ok)throw new Error('Failed to load voices');localStorage.setItem('elevenLabsApiKey',apiKey);availableVoices=await r.json();const v1=document.getElementById('voice-1'),v2=document.getElementById('voice-2');v1.innerHTML='<option value="">Select a voice</option>';v2.innerHTML='<option value="">Select a voice</option>';availableVoices.forEach(v=>{v1.appendChild(Object.assign(document.createElement('option'),{value:v.voice_id,textContent:v.name}));v2.appendChild(Object.assign(document.createElement('option'),{value:v.voice_id,textContent:v.name}))});showToast('Loaded '+availableVoices.length+' voices','success')}catch(e){showToast('Error loading voices: '+e.message,'error')}}
async function loadProjects(){try{const r=await fetch('/api/projects'),projects=await r.json(),list=document.getElementById('projects-list');if(!projects.length){list.innerHTML='<p style="color:#666;text-align:center;padding:40px">No projects yet. Create your first audiobook!</p>';return}list.innerHTML=projects.map(p=>\`<div class="project-card" onclick="openProject('\${p.id}')"><button class="btn-delete-project" onclick="event.stopPropagation();showDeleteModal('\${p.id}','\${escapeHtml(p.title)}')" title="Delete project">×</button><h3>\${escapeHtml(p.title)}</h3><p>\${escapeHtml(p.author||'Unknown Author')}</p><p><span class="status-badge status-\${p.status}">\${formatStatus(p.status)}</span></p><p>\${p.chapters?p.chapters.length:0} chapters</p></div>\`).join('')}catch(e){console.error('Error loading projects:',e)}}
function showDeleteModal(id,title){deleteProjectId=id;document.getElementById('delete-modal-title').textContent='Delete "'+title+'"?';document.getElementById('delete-modal').classList.remove('hidden')}
function cancelDelete(){deleteProjectId=null;document.getElementById('delete-modal').classList.add('hidden')}
async function performDelete(mode){if(!deleteProjectId)return;const keepBook=mode==='keep_book';try{const r=await fetch('/api/projects/'+deleteProjectId+'?keepBook='+keepBook,{method:'DELETE'});if(!r.ok){const e=await r.json();throw new Error(e.error||'Delete failed')}showToast(keepBook?'Project deleted. Final audiobook kept.':'Project and all files deleted.','success');cancelDelete();closeModal();loadProjects()}catch(e){showToast('Error: '+e.message,'error')}}
document.getElementById('new-book-form').addEventListener('submit',async e=>{e.preventDefault();const mode=document.getElementById('mode').value,voices=[document.getElementById('voice-1').value];if(mode==='dual')voices.push(document.getElementById('voice-2').value);const voiceNames=[document.getElementById('voice-1-name').value.trim()];if(mode==='dual')voiceNames.push(document.getElementById('voice-2-name').value.trim());const data={apiKey:document.getElementById('api-key').value,title:document.getElementById('title').value,author:document.getElementById('author').value,language:document.getElementById('language').value,mode,voices,voiceNames,voiceSwitchToken:document.getElementById('voice-change-token').value,manuscript:document.getElementById('manuscript').value,chapterLimit:document.getElementById('chapter-limit').value||null,demoMode:document.getElementById('demo-mode').checked,modelVersion:document.getElementById('model-version').value,pauseBetweenChaptersSeconds:parseFloat(document.getElementById('pause-between-chapters').value)||2,settings:{stability:parseFloat(document.getElementById('stability').value),similarity_boost:parseFloat(document.getElementById('similarity').value),style:parseFloat(document.getElementById('style').value),speed:parseFloat(document.getElementById('speed').value)}};try{const r=await fetch('/api/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok){const e=await r.json();throw new Error(e.error)}const preview=await r.json();pendingProjectData=data;showReviewModal(data,preview)}catch(e){showToast('Error: '+e.message,'error')}});
function showReviewModal(data,preview){const cost='$'+preview.stats.estimatedCost.toFixed(4);document.getElementById('review-content').innerHTML=\`<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px"><div><p><strong>Title:</strong> \${escapeHtml(preview.metadata.title||data.title||'Untitled')}</p><p><strong>Author:</strong> \${escapeHtml(preview.metadata.author||data.author||'Unknown')}</p><p><strong>Language:</strong> \${escapeHtml(preview.metadata.language||data.language||'English')}</p></div><div><p><strong>Mode:</strong> \${data.mode==='single'?'Single Voice':'Dual Voice'}</p><p><strong>Model:</strong> \${formatModelVersion(data.modelVersion)}</p><p><strong>Demo Mode:</strong> \${data.demoMode?'Yes':'No'}</p></div></div><div style="background:#eef2ff;padding:15px;border-radius:8px;margin-bottom:20px;border:1px solid #c7d2fe"><h3 style="margin-bottom:10px;color:#4c51bf">Usage Estimate</h3><p><strong>Characters:</strong> \${preview.stats.charCount.toLocaleString()}</p><p><strong>Est. Credits:</strong> \${preview.stats.creditCount.toLocaleString()}</p><p style="font-size:1.2em;font-weight:bold;margin-top:5px">Est. Cost: \${cost}</p></div><h3>Chapter Structure (\${preview.stats.chapterCount} detected)</h3><div style="max-height:250px;overflow-y:auto;border:1px solid #eee;margin-top:10px"><table class="segment-table"><thead><tr><th>#</th><th>Title</th><th>Starting Voice</th><th>Segments</th></tr></thead><tbody>\${preview.previewChapters.map(ch=>\`<tr><td>\${ch.number}</td><td>\${escapeHtml(ch.title)}</td><td>\${escapeHtml(ch.startingVoice)}</td><td>\${ch.segmentCount}</td></tr>\`).join('')}</tbody></table></div>\`;document.getElementById('review-modal').classList.remove('hidden')}
function closeReviewModal(){document.getElementById('review-modal').classList.add('hidden')}
async function confirmCreateProject(){if(!pendingProjectData)return;try{const r=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pendingProjectData)});if(!r.ok){const e=await r.json();throw new Error(e.error)}localStorage.setItem('preferredModel',pendingProjectData.modelVersion);localStorage.setItem('preferredSpeed',pendingProjectData.settings.speed);showToast('Project created successfully!','success');closeReviewModal();document.getElementById('new-book-form').reset();pendingProjectData=null;switchTab('dashboard');loadProjects()}catch(e){showToast('Error creating project: '+e.message,'error')}}
async function openProject(pid){try{const r=await fetch('/api/projects/'+pid),project=await r.json();currentProject=project;const modal=document.getElementById('project-modal'),content=document.getElementById('modal-content');const total=project.chapters.length,active=project.chapters.filter(c=>c.status!=='skipped').length,completed=project.chapters.filter(c=>c.status==='completed').length,pending=project.chapters.filter(c=>c.status==='pending').length;const nextNum=project.chapters.reduce((m,c)=>Math.max(m,c.number||0),0)+1;const readyMerge=project.status==='ready_for_merge',lastUpd=project.updatedAt?new Date(project.updatedAt).toLocaleString():'—';const voiceSummary=formatVoiceSummary(project),pause=Number.isFinite(project.pauseBetweenChaptersSeconds)?project.pauseBetweenChaptersSeconds:2;const voiceNames=Array.isArray(project.voiceNames)?project.voiceNames:[];
const voiceInputs=(()=>{const inputs=['<div class="form-group"><label class="sub-label" for="voice-name-0">Voice 1 Name</label><input type="text" id="voice-name-0" data-voice-name-index="0" value="'+escapeHtml(voiceNames[0]||'')+'" placeholder="'+escapeHtml(getVoiceLabel(project,0))+'"></div>'];if(project.mode==='dual')inputs.push('<div class="form-group"><label class="sub-label" for="voice-name-1">Voice 2 Name</label><input type="text" id="voice-name-1" data-voice-name-index="1" value="'+escapeHtml(voiceNames[1]||'')+'" placeholder="'+escapeHtml(getVoiceLabel(project,1))+'"></div>');return inputs.join('')})();
const titleIntroVoiceOpts=(Array.isArray(project.voices)?project.voices:[]).map((v,i)=>'<option value="'+i+'"'+(project.titleIntroVoiceIndex===i?' selected':'')+'>'+escapeHtml(getVoiceLabel(project,i))+'</option>').join('');
const titleIntroPreview=project.titleIntroUrl?'<audio id="project-title-intro-audio" controls src="'+project.titleIntroUrl+'"></audio>':'<p class="section-subtext">Generate audio to preview.</p>';
document.getElementById('modal-title').textContent=project.title;
content.innerHTML=\`<div><p><strong>Author:</strong> \${project.author||'Unknown'}</p><p><strong>Status:</strong> <span class="status-badge status-\${project.status}">\${formatStatus(project.status)}</span></p><p><strong>Mode:</strong> \${project.mode==='single'?'Single Voice':'Dual Voice'}</p>\${voiceSummary?'<p><strong>Voices:</strong> '+escapeHtml(voiceSummary)+'</p>':''}<p><strong>Model:</strong> \${formatModelVersion(project.modelVersion)}</p><p><strong>Demo Mode:</strong> \${project.demoMode?'Enabled':'Disabled'}</p><p><strong>Active Chapters:</strong> \${completed} / \${active} completed (total \${total})</p><p><strong>Pending:</strong> \${pending}</p><p><strong>Next Chapter #:</strong> \${nextNum}</p><p><strong>Last Updated:</strong> \${lastUpd}</p><p><strong>Chapter Pause:</strong> \${pause}s</p>
<div class="section-heading">Title Intro</div><div class="section-subtext">Generate a standalone opening with \${Math.round(pause*2*10)/10}s pause.</div><div class="form-group"><label class="sub-label" for="project-title-intro-text">Title Intro Script</label><textarea id="project-title-intro-text" placeholder="Book title, series, narrator, authors.">\${escapeHtml(project.titleIntroText||'')}</textarea></div><div class="controls"><select id="project-title-intro-voice">\${titleIntroVoiceOpts||'<option value="0">Voice 1</option>'}</select><button class="btn-secondary" onclick="generateTitleIntro('\${project.id}')">Generate Title Audio</button></div><div class="title-intro-preview">\${titleIntroPreview}</div>
<div class="section-heading">Voice Names</div><div class="section-subtext">Update character labels.</div><div class="voice-name-grid">\${voiceInputs}</div><div class="controls"><button class="btn-secondary" onclick="saveVoiceNames('\${project.id}')">Save Voice Names</button></div>
<div class="section-heading">Voice Settings</div><div class="section-subtext">Adjust audio generation settings. Changes apply to future processing.</div><div class="voice-config" style="margin-top:10px"><div class="form-row"><div class="form-group"><label class="sub-label">Model</label><select id="project-model" style="width:100%">\${Object.entries(MODEL_LABELS).map(([k,v])=>'<option value="'+k+'"'+(project.modelVersion===k?' selected':'')+'>'+v+'</option>').join('')}</select></div><div class="form-group"><label class="sub-label">Demo Mode</label><label class="checkbox-label"><input type="checkbox" id="project-demo-mode" \${project.demoMode?'checked':''}><span>Enable demo mode</span></label></div></div><div class="slider-group"><label class="slider-label"><span class="slider-label-text">Stability</span><span id="project-stability-value" class="slider-value">\${(project.settings?.stability||0.5).toFixed(1)}</span></label><input type="range" id="project-stability" min="0" max="1" step="0.1" value="\${project.settings?.stability||0.5}" oninput="document.getElementById('project-stability-value').textContent=this.value"></div><div class="slider-group"><label class="slider-label"><span class="slider-label-text">Similarity</span><span id="project-similarity-value" class="slider-value">\${(project.settings?.similarity_boost||0.75).toFixed(2)}</span></label><input type="range" id="project-similarity" min="0" max="1" step="0.05" value="\${project.settings?.similarity_boost||0.75}" oninput="document.getElementById('project-similarity-value').textContent=this.value"></div><div class="slider-group"><label class="slider-label"><span class="slider-label-text">Style</span><span id="project-style-value" class="slider-value">\${(project.settings?.style||0).toFixed(1)}</span></label><input type="range" id="project-style" min="0" max="1" step="0.1" value="\${project.settings?.style||0}" oninput="document.getElementById('project-style-value').textContent=this.value"></div><div class="slider-group"><label class="slider-label"><span class="slider-label-text">Speed</span><span id="project-speed-value" class="slider-value">\${(project.settings?.speed||1.0).toFixed(1)}</span></label><input type="range" id="project-speed" min="0.5" max="2" step="0.1" value="\${project.settings?.speed||1.0}" oninput="document.getElementById('project-speed-value').textContent=this.value"></div><div class="controls"><button class="btn-secondary" onclick="saveProjectSettings('\${project.id}')">Save Voice Settings</button></div></div>
<div class="section-heading">Processing Controls</div><div class="section-subtext">Set batch size or leave blank for all pending.</div><div class="controls"><input type="number" id="batch-size" min="1" placeholder="Batch size"><button onclick="startProject('\${project.id}',getBatchLimit())" \${project.status==='processing'?'disabled':''}>Process Batch</button><button onclick="startProject('\${project.id}',1)" \${project.status==='processing'?'disabled':''}>Process Next</button><button onclick="pauseProject('\${project.id}')" class="btn-secondary" \${project.status!=='processing'?'disabled':''}>Pause</button><button onclick="resumeProject('\${project.id}',getBatchLimit())" class="btn-secondary" \${project.status!=='paused'?'disabled':''}>Resume</button></div>
<div class="section-heading">Finalize Settings</div><div class="section-subtext">Adjust pause between chapters before merging.</div><div class="controls"><input type="number" id="pause-between-chapters-setting" min="0" max="30" step="0.5" value="\${pause}" style="width:120px"><span>seconds</span><button class="btn-secondary" onclick="saveFinalizeSettings('\${project.id}')">Save Settings</button></div><div class="controls" style="margin-top:10px"><button onclick="finalizeProject('\${project.id}')" class="btn-success" \${!readyMerge?'disabled':''}>Finalize Audiobook</button></div>\${project.bookUrl?'<div style="margin-top:15px"><audio controls src="'+project.bookUrl+'" style="width:100%"></audio><a href="'+project.bookUrl+'" download style="display:inline-block;margin-top:10px">Download Audiobook</a></div>':''}
<div class="section-heading">Add More Chapters</div><div class="section-subtext">Append additional manuscript text.</div><div class="form-group"><textarea id="additional-manuscript" placeholder="Paste additional chapters here..."></textarea></div><div class="controls"><input type="text" id="additional-voice-token" placeholder="Voice token (optional)" style="width:150px"><button class="btn-secondary" onclick="appendManuscript('\${project.id}')">Add Chapters</button></div>
<div class="section-heading">Chapters</div><div class="chapter-list">\${project.chapters.map((ch,i)=>'<div class="chapter-item"><div class="chapter-title">'+ch.number+'. '+escapeHtml(ch.title)+(ch.settingsOverride&&Object.keys(ch.settingsOverride).length>0?' <span style="font-size:.75em;background:#667eea;color:#fff;padding:2px 6px;border-radius:4px">Custom Settings</span>':'')+'</div><div class="chapter-meta"><span class="status-badge status-'+ch.status+'">'+formatStatus(ch.status)+'</span>'+(ch.startingVoiceLabel?' • Starting: '+escapeHtml(ch.startingVoiceLabel):'')+(ch.segments?' • '+ch.segments.length+' segments':'')+'</div>'+(ch.url?'<audio controls src="'+ch.url+'" style="width:100%;margin-top:10px"></audio>':'')+'<div class="controls" style="margin-top:10px"><button class="btn-small btn-secondary" onclick="processChapter(\\''+project.id+'\\','+i+')" '+(ch.status==='completed'||ch.status==='processing'?'disabled':'')+'>Process</button><button class="btn-small btn-secondary" onclick="showChapterSettings(\\''+project.id+'\\','+i+')" '+(ch.status==='processing'?'disabled':'')+'>Settings</button><button class="btn-small btn-danger" onclick="resetChapter(\\''+project.id+'\\','+i+')" '+(ch.status==='pending'||ch.status==='processing'?'disabled':'')+'>Reset</button></div></div>').join('')}</div>
<div class="section-heading">Activity Log</div><div class="activity-log" id="activity-log"><p class="section-subtext">Connecting...</p></div></div>\`;
modal.classList.remove('hidden');setupEventSource(pid)}catch(e){showToast('Error loading project: '+e.message,'error')}}
function closeModal(){document.getElementById('project-modal').classList.add('hidden');if(eventSource){eventSource.close();eventSource=null}currentProject=null}
function setupEventSource(pid){if(eventSource)eventSource.close();eventSource=new EventSource('/api/events/'+pid);const log=document.getElementById('activity-log');log.innerHTML='';eventSource.onmessage=e=>{const data=JSON.parse(e.data),time=new Date().toLocaleTimeString(),entry=document.createElement('div');entry.className='log-entry';entry.innerHTML='<span class="log-time">'+time+'</span> '+formatLogMessage(data);log.insertBefore(entry,log.firstChild);if(['chapter_complete','project_complete','project_ready_for_merge','project_error'].includes(data.type))openProject(pid)};eventSource.onerror=()=>{const entry=document.createElement('div');entry.className='log-entry';entry.innerHTML='<span class="log-time">'+new Date().toLocaleTimeString()+'</span> Connection lost. Reconnecting...';log.insertBefore(entry,log.firstChild)}}
function formatLogMessage(data){const types={connected:'Connected to server',chapter_start:'Started: '+(data.title||'Chapter'),segment_start:'Processing segment '+(data.segmentIndex+1),segment_complete:'Segment '+(data.segmentIndex+1)+' complete',chapter_merging:'Merging chapter audio...',chapter_complete:'Chapter complete',chapter_error:'Error: '+data.error,project_processing:'Processing started',project_paused:'Processing paused',project_ready_for_merge:'Ready to finalize',book_merging:'Merging final audiobook...',project_complete:'Audiobook complete!',project_error:'Error: '+data.error,chapter_skipped:'Chapter skipped',chapter_skipped_demo:'Chapter skipped (demo)',title_intro_updated:'Title intro updated',project_updated:'Project updated',project_voice_updated:'Voice names updated',settings_updated:'Project settings updated',chapter_settings_updated:'Chapter '+(data.chapterIndex!==undefined?data.chapterIndex+1:'')+' settings updated',chapter_reset:'Chapter '+(data.chapterIndex!==undefined?data.chapterIndex+1:'')+' reset'};return types[data.type]||JSON.stringify(data)}
async function processChapter(pid,idx){try{const r=await fetch('/api/projects/'+pid+'/process-chapter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({index:idx})});if(!r.ok){const e=await r.json();throw new Error(e.error)}}catch(e){showToast('Error: '+e.message,'error')}}
async function startProject(pid,limit=null){try{const r=await fetch('/api/projects/'+pid+'/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({limit})});if(!r.ok){const e=await r.json();throw new Error(e.error)}showToast(limit?'Started '+limit+' chapter(s).':'Started all pending chapters.','success');loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
async function pauseProject(pid){try{await fetch('/api/projects/'+pid+'/pause',{method:'POST'});showToast('Processing paused.','info');loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
async function resumeProject(pid,limit=null){try{const r=await fetch('/api/projects/'+pid+'/resume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({limit})});if(!r.ok){const e=await r.json();throw new Error(e.error)}showToast(limit?'Resumed with batch '+limit+'.':'Resumed all.','success');loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
async function finalizeProject(pid){try{const r=await fetch('/api/projects/'+pid+'/finalize',{method:'POST'});const result=await r.json();if(!r.ok)throw new Error(result.error);showToast('Audiobook merged successfully!','success');loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
async function appendManuscript(pid){const ms=document.getElementById('additional-manuscript'),tk=document.getElementById('additional-voice-token');if(!ms||!ms.value.trim()){showToast('Please paste manuscript text.','error');return}try{const r=await fetch('/api/projects/'+pid+'/chapters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({manuscript:ms.value,voiceSwitchToken:tk&&tk.value?tk.value:undefined})});const result=await r.json();if(!r.ok)throw new Error(result.error);showToast('Added '+result.added+' chapter(s).','success');ms.value='';loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
async function saveVoiceNames(pid){const inputs=Array.from(document.querySelectorAll('input[data-voice-name-index]'));if(!inputs.length){showToast('No voice fields.','error');return}const voiceNames=[];inputs.forEach(inp=>{const idx=parseInt(inp.dataset.voiceNameIndex,10);if(Number.isFinite(idx))voiceNames[idx]=inp.value.trim()});try{const r=await fetch('/api/projects/'+pid+'/voices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voiceNames})});const result=await r.json();if(!r.ok)throw new Error(result.error);showToast('Voice names updated.','success');loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
async function saveFinalizeSettings(pid){const inp=document.getElementById('pause-between-chapters-setting');if(!inp){showToast('Setting not found.','error');return}const v=parseFloat(inp.value);if(Number.isNaN(v)||v<0){showToast('Must be zero or positive.','error');return}try{const r=await fetch('/api/projects/'+pid+'/merge-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pauseBetweenChaptersSeconds:v})});const result=await r.json();if(!r.ok)throw new Error(result.error);showToast('Settings saved.','success');loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
async function generateTitleIntro(pid){const ta=document.getElementById('project-title-intro-text');if(!ta||!ta.value.trim()){showToast('Enter title intro script.','error');return}const vs=document.getElementById('project-title-intro-voice');let voiceIdx=0;if(vs){const p=parseInt(vs.value,10);if(Number.isFinite(p)&&p>=0)voiceIdx=p}try{const r=await fetch('/api/projects/'+pid+'/title-intro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:ta.value,voiceIndex:voiceIdx})});const result=await r.json();if(!r.ok)throw new Error(result.error);showToast('Title intro updated.','success');loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
async function saveProjectSettings(pid){const data={settings:{stability:parseFloat(document.getElementById('project-stability').value),similarity_boost:parseFloat(document.getElementById('project-similarity').value),style:parseFloat(document.getElementById('project-style').value),speed:parseFloat(document.getElementById('project-speed').value)},modelVersion:document.getElementById('project-model').value,demoMode:document.getElementById('project-demo-mode').checked};try{const r=await fetch('/api/projects/'+pid+'/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error);showToast('Voice settings saved. Changes apply to future processing.','success');loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
async function resetChapter(pid,idx){if(!confirm('Reset this chapter? This will delete the generated audio and allow re-processing with current settings.'))return;try{const r=await fetch('/api/projects/'+pid+'/chapters/'+idx+'/reset',{method:'POST'});const result=await r.json();if(!r.ok)throw new Error(result.error);showToast('Chapter reset. You can now process it with new settings.','success');loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
function showChapterSettings(pid,idx){const ch=currentProject.chapters[idx];if(!ch)return;const so=ch.settingsOverride||{};const ps=currentProject.settings||{};const eff={stability:so.stability!==undefined?so.stability:(ps.stability||0.5),similarity_boost:so.similarity_boost!==undefined?so.similarity_boost:(ps.similarity_boost||0.75),style:so.style!==undefined?so.style:(ps.style||0),speed:so.speed!==undefined?so.speed:(ps.speed||1.0),modelVersion:so.modelVersion||currentProject.modelVersion||'multilingual-v2'};const hasOverride=Object.keys(so).length>0;const html='<h3>Chapter '+(ch.number)+': '+escapeHtml(ch.title)+'</h3><p class="section-subtext">Set custom voice settings for this chapter only. Leave at project defaults or customize.</p>'+(hasOverride?'<p style="color:#667eea;font-weight:600">This chapter has custom settings that override project defaults.</p>':'')+'<div class="voice-config" style="margin-top:15px"><div class="form-group"><label class="sub-label">Model Override</label><select id="ch-model"><option value=""'+(so.modelVersion?'':' selected')+'>Use Project Default ('+formatModelVersion(currentProject.modelVersion)+')</option>'+Object.entries(MODEL_LABELS).map(([k,v])=>'<option value="'+k+'"'+(so.modelVersion===k?' selected':'')+'>'+v+'</option>').join('')+'</select></div><div class="slider-group"><label class="slider-label"><span class="slider-label-text">Stability</span><span id="ch-stability-value" class="slider-value">'+eff.stability.toFixed(1)+'</span></label><input type="range" id="ch-stability" min="0" max="1" step="0.1" value="'+eff.stability+'" oninput="document.getElementById(&quot;ch-stability-value&quot;).textContent=this.value"></div><div class="slider-group"><label class="slider-label"><span class="slider-label-text">Similarity</span><span id="ch-similarity-value" class="slider-value">'+eff.similarity_boost.toFixed(2)+'</span></label><input type="range" id="ch-similarity" min="0" max="1" step="0.05" value="'+eff.similarity_boost+'" oninput="document.getElementById(&quot;ch-similarity-value&quot;).textContent=this.value"></div><div class="slider-group"><label class="slider-label"><span class="slider-label-text">Style</span><span id="ch-style-value" class="slider-value">'+eff.style.toFixed(1)+'</span></label><input type="range" id="ch-style" min="0" max="1" step="0.1" value="'+eff.style+'" oninput="document.getElementById(&quot;ch-style-value&quot;).textContent=this.value"></div><div class="slider-group"><label class="slider-label"><span class="slider-label-text">Speed</span><span id="ch-speed-value" class="slider-value">'+eff.speed.toFixed(1)+'</span></label><input type="range" id="ch-speed" min="0.5" max="2" step="0.1" value="'+eff.speed+'" oninput="document.getElementById(&quot;ch-speed-value&quot;).textContent=this.value"></div><div class="controls" style="margin-top:15px"><button class="btn-secondary" onclick="saveChapterSettings(&quot;'+pid+'&quot;,'+idx+')">Save Chapter Settings</button><button class="btn-secondary" onclick="clearChapterSettings(&quot;'+pid+'&quot;,'+idx+')">Clear Overrides</button><button class="btn-secondary" onclick="closeChapterSettingsModal()">Cancel</button></div></div>';document.getElementById('chapter-settings-content').innerHTML=html;document.getElementById('chapter-settings-modal').classList.remove('hidden')}
function closeChapterSettingsModal(){document.getElementById('chapter-settings-modal').classList.add('hidden')}
async function saveChapterSettings(pid,idx){const modelVal=document.getElementById('ch-model').value;const data={settings:{stability:parseFloat(document.getElementById('ch-stability').value),similarity_boost:parseFloat(document.getElementById('ch-similarity').value),style:parseFloat(document.getElementById('ch-style').value),speed:parseFloat(document.getElementById('ch-speed').value)},modelVersion:modelVal||null};try{const r=await fetch('/api/projects/'+pid+'/chapters/'+idx+'/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error);showToast('Chapter settings saved.','success');closeChapterSettingsModal();loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
async function clearChapterSettings(pid,idx){if(!confirm('Clear all custom settings for this chapter? It will use project defaults.'))return;try{const r=await fetch('/api/projects/'+pid+'/chapters/'+idx+'/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:{stability:null,similarity_boost:null,style:null,speed:null},modelVersion:null})});const result=await r.json();if(!r.ok)throw new Error(result.error);showToast('Chapter settings cleared.','success');closeChapterSettingsModal();loadProjects();openProject(pid)}catch(e){showToast('Error: '+e.message,'error')}}
const savedKey=localStorage.getItem('elevenLabsApiKey');if(savedKey){document.getElementById('api-key').value=savedKey;loadVoices()}
const savedModel=localStorage.getItem('preferredModel');if(savedModel){const ms=document.getElementById('model-version');if(ms)ms.value=savedModel}
const savedSpeed=localStorage.getItem('preferredSpeed');if(savedSpeed){const si=document.getElementById('speed');if(si){si.value=savedSpeed;updateSliderValue('speed')}}
updateVoiceSelectors();loadProjects();
</script>
</body>
</html>`;
}

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🎙️  Audiobook Generator Started  🎙️            ║
║   Server running at: http://localhost:${PORT}              ║
╚═══════════════════════════════════════════════════════════╝`);
  const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  require('child_process').exec(`${open} http://localhost:${PORT}`);
});