#!/usr/bin/env node

/**
 * Audiobook Generator - Single File Application
 * Generates audiobooks using ElevenLabs API with web interface
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { URL } = require('url');

// Configuration
const PORT = 3000;
const OUTPUT_DIR = path.join(__dirname, 'output');
const CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks');
const CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const BOOK_DIR = path.join(OUTPUT_DIR, 'book');
const DATA_FILE = path.join(OUTPUT_DIR, 'projects.json');

const ELEVEN_MODEL_VERSIONS = {
  v2: 'eleven_multilingual_v2',
  v3: 'eleven_multilingual_v3'
};
const DEFAULT_MODEL_VERSION = 'v2';

// Ensure output directories exist
[OUTPUT_DIR, CHUNKS_DIR, CHAPTERS_DIR, BOOK_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// In-memory storage
let projects = loadProjects();
let clients = new Map(); // SSE clients for real-time updates

// Load projects from disk
function loadProjects() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data && typeof data === 'object') {
        Object.values(data).forEach(project => normalizeProject(project));
      }
      return data;
    } catch (e) {
      console.error('Error loading projects:', e);
    }
  }
  return {};
}

// Save projects to disk
function saveProjects() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Send SSE update to clients
function sendUpdate(projectId, data) {
  const clientList = clients.get(projectId);
  if (clientList) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    clientList.forEach(res => {
      try {
        res.write(message);
      } catch (e) {
        console.error('Error sending SSE:', e);
      }
    });
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const ZERO_WIDTH_CHAR_REGEX = /[\u200B\u200C\u200D\uFEFF]/g;
const NON_WORD_CHAR_REGEX = /[^\p{L}\p{N}]+/gu;

function resolveVoiceLabel(voiceNames, index) {
  const fallback = `Voice ${(Number.isFinite(index) ? Number(index) : 0) + 1}`;
  if (!Array.isArray(voiceNames)) {
    return fallback;
  }
  const name = voiceNames[index];
  if (typeof name === 'string' && name.trim().length > 0) {
    return name.trim();
  }
  return fallback;
}

function sanitizeLine(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(ZERO_WIDTH_CHAR_REGEX, '').trim();
}

function normalizeToken(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .replace(ZERO_WIDTH_CHAR_REGEX, '')
    .toLowerCase()
    .replace(NON_WORD_CHAR_REGEX, '');
}

function extractVoiceIndicator(line) {
  const cleaned = sanitizeLine(line);
  if (!cleaned) {
    return '';
  }
  const match = cleaned.match(/^([^\s]+)/);
  if (!match) {
    return '';
  }
  return normalizeToken(match[1]);
}

function prepareVoiceCandidates(voiceNames) {
  if (!Array.isArray(voiceNames)) {
    return [];
  }
  return voiceNames.map((name, index) => {
    if (typeof name !== 'string') {
      return null;
    }
    const label = name.trim();
    if (!label) {
      return null;
    }
    const primary = normalizeToken(label.split(/\s+/)[0] || label);
    const full = normalizeToken(label);
    if (!primary && !full) {
      return null;
    }
    return { index, label, primary, full };
  }).filter(Boolean);
}

function detectChapterStartingVoice(chapterText, heading, voiceNames = []) {
  if (typeof chapterText !== 'string' || chapterText.trim().length === 0) {
    return null;
  }

  const lines = chapterText.split('\n').map(sanitizeLine);
  let pointer = 0;

  while (pointer < lines.length && !lines[pointer]) {
    pointer += 1;
  }

  if (pointer >= lines.length) {
    return null;
  }

  const normalizedHeading = typeof heading === 'string' ? normalizeToken(heading) : '';
  if (normalizedHeading) {
    const lineToken = normalizeToken(lines[pointer]);
    if (lineToken && (lineToken === normalizedHeading || normalizedHeading.startsWith(lineToken) || lineToken.startsWith(normalizedHeading))) {
      pointer += 1;
    }
  } else {
    const headingRegex = getChapterHeadingRegex();
    if (headingRegex.test(lines[pointer])) {
      pointer += 1;
    }
  }

  while (pointer < lines.length && !lines[pointer]) {
    pointer += 1;
  }

  if (pointer >= lines.length) {
    return null;
  }

  const firstContentLine = lines[pointer];
  const indicator = extractVoiceIndicator(firstContentLine);
  if (!indicator) {
    return null;
  }

  const candidates = prepareVoiceCandidates(voiceNames);
  if (!candidates.length) {
    return null;
  }

  const normalizedLine = normalizeToken(firstContentLine);

  for (const candidate of candidates) {
    if (candidate.primary && indicator === candidate.primary) {
      return { index: candidate.index, label: candidate.label, sourceLine: firstContentLine };
    }
    if (candidate.full && indicator === candidate.full) {
      return { index: candidate.index, label: candidate.label, sourceLine: firstContentLine };
    }
  }

  for (const candidate of candidates) {
    if (candidate.full && normalizedLine.startsWith(candidate.full)) {
      return { index: candidate.index, label: candidate.label, sourceLine: firstContentLine };
    }
    if (candidate.primary && normalizedLine.startsWith(candidate.primary)) {
      return { index: candidate.index, label: candidate.label, sourceLine: firstContentLine };
    }
  }

  return null;
}

function normalizeProject(project) {
  if (!project || typeof project !== 'object') {
    return;
  }

  if (!Array.isArray(project.voiceNames)) {
    project.voiceNames = [];
  }

  if (!project.modelVersion || !ELEVEN_MODEL_VERSIONS[project.modelVersion]) {
    project.modelVersion = DEFAULT_MODEL_VERSION;
  }

  if (!Array.isArray(project.chapters)) {
    return;
  }

  let maxNumber = 0;
  project.chapters.forEach(chapter => {
    if (Number.isFinite(chapter.number) && chapter.number > maxNumber) {
      maxNumber = chapter.number;
    }
  });

  if (maxNumber === 0) {
    maxNumber = project.chapters.length;
    project.chapters.forEach((chapter, index) => {
      chapter.number = index + 1;
    });
  } else {
    project.chapters.forEach((chapter) => {
      if (!Number.isFinite(chapter.number) || chapter.number <= 0) {
        maxNumber += 1;
        chapter.number = maxNumber;
      }
    });
  }

  project.chapters.sort((a, b) => (a.number || 0) - (b.number || 0));

  project.chapters.forEach((chapter) => {
    if (!Array.isArray(chapter.segments)) {
      chapter.segments = [];
      return;
    }
    const startingVoiceIndex = Number.isFinite(chapter.startingVoiceIndex)
      ? Math.abs(chapter.startingVoiceIndex) % 2
      : 0;
    chapter.startingVoiceIndex = startingVoiceIndex;
    chapter.startingVoiceLabel = typeof chapter.startingVoiceLabel === 'string' && chapter.startingVoiceLabel.trim().length > 0
      ? chapter.startingVoiceLabel.trim()
      : resolveVoiceLabel(project.voiceNames, startingVoiceIndex);
    chapter.startingVoiceLine = typeof chapter.startingVoiceLine === 'string'
      ? chapter.startingVoiceLine.trim()
      : null;
    chapter.segments = chapter.segments.map((segment, index) => ({
      ...segment,
      index: Number.isFinite(segment.index) ? segment.index : index,
      status: segment.status || 'pending'
    }));
  });
}

function getNextChapterNumber(project) {
  if (!project || !Array.isArray(project.chapters) || project.chapters.length === 0) {
    return 1;
  }
  return project.chapters.reduce((max, chapter) => {
    if (Number.isFinite(chapter.number) && chapter.number > max) {
      return chapter.number;
    }
    return max;
  }, 0) + 1;
}

function appendChaptersToProject(project, newChapters) {
  if (!project) return;
  if (!Array.isArray(project.chapters)) {
    project.chapters = [];
  }

  const chaptersToAdd = Array.isArray(newChapters) ? newChapters : [];
  chaptersToAdd.forEach((chapter) => {
    const voiceNames = Array.isArray(project.voiceNames) ? project.voiceNames : [];
    const startingVoiceIndex = Number.isFinite(chapter.startingVoiceIndex)
      ? Math.abs(chapter.startingVoiceIndex) % 2
      : 0;
    const startingVoiceLabel = typeof chapter.startingVoiceLabel === 'string' && chapter.startingVoiceLabel.trim().length > 0
      ? chapter.startingVoiceLabel.trim()
      : resolveVoiceLabel(voiceNames, startingVoiceIndex);
    const startingVoiceLine = typeof chapter.startingVoiceLine === 'string' && chapter.startingVoiceLine.trim().length > 0
      ? chapter.startingVoiceLine.trim()
      : null;
    const normalizedSegments = Array.isArray(chapter.segments)
      ? chapter.segments.map((segment, index) => ({
          ...segment,
          index,
          voiceIndex: Number.isFinite(segment.voiceIndex)
            ? Math.abs(segment.voiceIndex) % 2
            : ((startingVoiceIndex + index) % 2),
          status: 'pending',
          file: null
        }))
      : [];

    project.chapters.push({
      ...chapter,
      title: chapter.title || `Chapter ${chapter.number}`,
      startingVoiceIndex,
      startingVoiceLabel,
      startingVoiceLine,
      status: 'pending',
      segments: normalizedSegments,
      file: null,
      url: null,
      error: null,
      demo: false
    });
  });

  project.chapters.sort((a, b) => (a.number || 0) - (b.number || 0));
  if (project.status !== 'paused' && project.status !== 'processing') {
    project.status = 'pending';
  }
  project.updatedAt = new Date().toISOString();

  if (project.bookFile) {
    try {
      if (fs.existsSync(project.bookFile)) {
        fs.unlinkSync(project.bookFile);
      }
    } catch (error) {
      console.warn('Unable to remove existing book file:', error.message);
    }
    project.bookFile = null;
    project.bookUrl = null;
  }
  project.completedAt = null;
}

// Parse manuscript into chapters
function parseManuscript(text, mode, options = {}) {
  const chapters = [];
  const voiceSwitchToken = options.voiceSwitchToken || '***';
  const startingNumber = Number.isFinite(options.startingNumber) && options.startingNumber > 0
    ? Math.floor(options.startingNumber)
    : 1;
  const manuscriptText = normalizeManuscript(text);
  const chapterRegex = getChapterHeadingRegex();
  const matches = [...manuscriptText.matchAll(chapterRegex)];
  const voiceNames = Array.isArray(options.voiceNames) ? options.voiceNames : [];
  
  if (mode === 'single') {
    // Split by chapter markers (# Chapter, ## Chapter, etc.)
    if (matches.length === 0) {
      // No chapters found, treat entire text as one chapter
      const chapterNumber = startingNumber + chapters.length;
      chapters.push({
        title: 'Full Text',
        content: manuscriptText.trim(),
        voice: null,
        number: chapterNumber
      });
    } else {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i < matches.length - 1 ? matches[i + 1].index : manuscriptText.length;
        const chapterText = manuscriptText.substring(start, end).trim();
        const rawTitle = matches[i][0].trim();
        const title = extractChapterTitle(rawTitle);
        const chapterNumber = startingNumber + chapters.length;
        
        chapters.push({
          title: title || `Chapter ${chapterNumber}`,
          content: chapterText,
          voice: null,
          number: chapterNumber
        });
      }
    }
  } else if (mode === 'dual') {
    // Dual voice mode: chapters start with voice name, *** switches voices
    if (matches.length === 0) {
        const detection = detectChapterStartingVoice(manuscriptText.trim(), null, voiceNames);
        const startingVoiceIndex = detection && Number.isFinite(detection.index) ? Math.abs(detection.index) % 2 : 0;
        const startingVoiceLabel = detection && detection.label
          ? detection.label
          : resolveVoiceLabel(voiceNames, startingVoiceIndex);
        const chapterNumber = startingNumber + chapters.length;
        chapters.push({
          title: 'Full Text',
          content: manuscriptText.trim(),
          voice: null,
          startingVoiceIndex,
          startingVoiceLabel,
          startingVoiceLine: detection ? detection.sourceLine : null,
          segments: parseDualVoiceSegments(manuscriptText.trim(), voiceSwitchToken, startingVoiceIndex),
          number: chapterNumber
        });
    } else {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i < matches.length - 1 ? matches[i + 1].index : manuscriptText.length;
        const chapterText = manuscriptText.substring(start, end).trim();
        const rawTitle = matches[i][0].trim();
        const title = extractChapterTitle(rawTitle);
        const detection = detectChapterStartingVoice(chapterText, rawTitle, voiceNames);
        const startingVoiceIndex = detection && Number.isFinite(detection.index) ? Math.abs(detection.index) % 2 : 0;
        const startingVoiceLabel = detection && detection.label
          ? detection.label
          : resolveVoiceLabel(voiceNames, startingVoiceIndex);
        const chapterNumber = startingNumber + chapters.length;
        
        chapters.push({
          title: title || `Chapter ${chapterNumber}`,
          content: chapterText,
          voice: null,
          startingVoiceIndex,
          startingVoiceLabel,
          startingVoiceLine: detection ? detection.sourceLine : null,
          segments: parseDualVoiceSegments(chapterText, voiceSwitchToken, startingVoiceIndex),
          number: chapterNumber
        });
      }
    }
  }
  
  return chapters;
}

function normalizeManuscript(text) {
  if (typeof text !== 'string') {
    return '';
  }
  return text.replace(/\r\n/g, '\n').replace(/\f/g, '\n');
}

function getChapterHeadingRegex() {
  const keywords = [
    'Chapter',
    'Kapitel'
  ];
  const keywordPattern = keywords.map(escapeRegex).join('|');
  return new RegExp(
    `^\\s*(?:#{1,6}\\s+[^\\n#]+|(?:${keywordPattern})(?:\\s+[^\\n]+)?)\\s*$`,
    'gmi'
  );
}

function extractChapterTitle(rawHeading) {
  if (!rawHeading) {
    return '';
  }
  return rawHeading.replace(/^#{1,6}\s*/, '').trim();
}

// Parse dual voice segments
function parseDualVoiceSegments(text, delimiter = '***', initialVoiceIndex = 0) {
  const segments = [];
  const token = typeof delimiter === 'string' && delimiter.trim().length > 0 ? delimiter : '***';
  const tokenRegex = buildDelimiterRegex(token);
  const baseVoice = Number.isFinite(initialVoiceIndex) ? Math.abs(initialVoiceIndex) % 2 : 0;

  if (!tokenRegex) {
    const content = text.trim();
    if (content) {
      segments.push({ content, voiceIndex: baseVoice });
    }
    return segments;
  }

  let lastIndex = 0;
  let boundaryCount = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    const content = text.slice(lastIndex, match.index).trim();
    if (content) {
      segments.push({
        content,
        voiceIndex: (baseVoice + boundaryCount) % 2
      });
    }
    boundaryCount += 1;
    lastIndex = tokenRegex.lastIndex;

    if (match.index === tokenRegex.lastIndex) {
      tokenRegex.lastIndex += 1;
    }
  }

  const trailing = text.slice(lastIndex).trim();
  if (trailing) {
    segments.push({
      content: trailing,
      voiceIndex: (baseVoice + boundaryCount) % 2
    });
  }

  return segments;
}

function buildDelimiterRegex(delimiter) {
  const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF]/g;
  const ZERO_WIDTH_PATTERN = '[\u200B\u200C\u200D\uFEFF]*';
  const sanitized = delimiter.replace(ZERO_WIDTH_CHARS, '');

  if (!sanitized) {
    return null;
  }

  const tokens = sanitized.split(/(\s+)/).filter(Boolean);
  const pattern = tokens.map(part => {
    if (/^\s+$/.test(part)) {
      return '\\s+';
    }
    return part.split('').map(char => `${escapeRegex(char)}${ZERO_WIDTH_PATTERN}`).join('');
  }).join('');

  if (!pattern) {
    return null;
  }

  return new RegExp(pattern, 'g');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Split text into smaller chunks (max ~5000 chars for stability)
function splitIntoChunks(text, maxChars = 4500) {
  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Make API request to ElevenLabs
function elevenLabsRequest(endpoint, method, headers, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: headers
    };
    
    const req = https.request(options, (res) => {
      if (method === 'GET' && endpoint.includes('/voices')) {
        // JSON response
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`API error: ${res.statusCode} ${data}`));
          }
        });
      } else {
        // Audio response
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(Buffer.concat(chunks));
          } else {
            reject(new Error(`API error: ${res.statusCode}`));
          }
        });
      }
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Get available voices from ElevenLabs
async function getVoices(apiKey) {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json'
  };
  
  const data = await elevenLabsRequest(
    'https://api.elevenlabs.io/v2/voices',
    'GET',
    headers
  );
  
  return data.voices || [];
}

// Generate audio for text segment
async function generateAudio(text, voiceId, apiKey, settings = {}, modelVersion = DEFAULT_MODEL_VERSION) {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json'
  };
  const modelId = ELEVEN_MODEL_VERSIONS[modelVersion] || ELEVEN_MODEL_VERSIONS[DEFAULT_MODEL_VERSION];

  const body = {
    text: text,
    model_id: modelId,
    voice_settings: {
      stability: settings.stability || 0.5,
      similarity_boost: settings.similarity_boost || 0.75,
      style: settings.style || 0,
      speed: settings.speed || 1.0
    }
  };
  
  const audioBuffer = await elevenLabsRequest(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    'POST',
    headers,
    body
  );
  
  return audioBuffer;
}

// Merge audio files using ffmpeg
function mergeAudioFiles(inputFiles, outputFile) {
  return new Promise((resolve, reject) => {
    // Create concat file list
    const listFile = outputFile + '.list';
    const listContent = inputFiles.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(listFile, listContent);
    
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c', 'copy',
      outputFile
    ];
    
    const ffmpeg = spawn('ffmpeg', args, { stdio: 'pipe' });
    
    ffmpeg.on('close', (code) => {
      fs.unlinkSync(listFile);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
    
    ffmpeg.on('error', reject);
  });
}

// Normalize audio volume
function normalizeAudio(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputFile,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-ar', '44100',
      outputFile
    ];
    
    const ffmpeg = spawn('ffmpeg', args, { stdio: 'pipe' });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg normalization failed with code ${code}`));
      }
    });
    
    ffmpeg.on('error', reject);
  });
}

// Process a single chapter
async function processChapter(project, chapterIndex) {
  const chapter = project.chapters[chapterIndex];
  const chapterId = `${project.id}_ch${chapterIndex}`;
  const isDemo = Boolean(project.demoMode);
  const demoCharLimit = typeof project.demoCharLimit === 'number' && project.demoCharLimit > 0 ? project.demoCharLimit : 600;
  const demoChunksPerSegment = typeof project.demoChunksPerSegment === 'number' && project.demoChunksPerSegment > 0 ? project.demoChunksPerSegment : 1;
  const demoSegmentsPerChapter = typeof project.demoSegmentsPerChapter === 'number' && project.demoSegmentsPerChapter > 0 ? project.demoSegmentsPerChapter : 2;
  
  sendUpdate(project.id, {
    type: 'chapter_start',
    chapterIndex,
    title: chapter.title
  });
  
  chapter.status = 'processing';
  chapter.segments = chapter.segments || [];
  saveProjects();
  
  try {
    const chunkFiles = [];
    
    if (project.mode === 'single') {
      // Single voice mode
      const chapterContent = isDemo ? chapter.content.slice(0, demoCharLimit) : chapter.content;
      let chunks = splitIntoChunks(chapterContent);
      if (isDemo) {
        chunks = chunks.slice(0, demoChunksPerSegment);
      }
      
      for (let i = 0; i < chunks.length; i++) {
        if (project.status === 'paused') {
          chapter.status = 'paused';
          saveProjects();
          return;
        }
        
        sendUpdate(project.id, {
          type: 'segment_start',
          chapterIndex,
          segmentIndex: i,
          total: chunks.length
        });
        
        const chunkFile = path.join(CHUNKS_DIR, `${chapterId}_${i}.mp3`);
        
        if (!fs.existsSync(chunkFile)) {
          const audioBuffer = await generateAudio(
            chunks[i],
            project.voices[0],
            project.apiKey,
            project.settings,
            project.modelVersion
          );
          fs.writeFileSync(chunkFile, audioBuffer);
        }
        
        chunkFiles.push(chunkFile);
        
        chapter.segments[i] = {
          index: i,
          voice: 0,
          status: 'completed',
          file: chunkFile
        };
        
        sendUpdate(project.id, {
          type: 'segment_complete',
          chapterIndex,
          segmentIndex: i
        });
        
        saveProjects();
      }
    } else {
      // Dual voice mode
      const segments = isDemo
        ? chapter.segments.slice(0, Math.min(chapter.segments.length, demoSegmentsPerChapter))
        : chapter.segments;
      let segmentIndex = 0;
      
      for (const segment of segments) {
        const segmentContent = isDemo ? segment.content.slice(0, demoCharLimit) : segment.content;
        let chunks = splitIntoChunks(segmentContent);
        if (isDemo) {
          chunks = chunks.slice(0, demoChunksPerSegment);
        }
        
        for (let i = 0; i < chunks.length; i++) {
          if (project.status === 'paused') {
            chapter.status = 'paused';
            saveProjects();
            return;
          }
          
          sendUpdate(project.id, {
            type: 'segment_start',
            chapterIndex,
            segmentIndex,
            voice: segment.voiceIndex
          });
          
          const chunkFile = path.join(CHUNKS_DIR, `${chapterId}_${segmentIndex}.mp3`);
          
          if (!fs.existsSync(chunkFile)) {
            const voiceId = project.voices[segment.voiceIndex];
            const audioBuffer = await generateAudio(
              chunks[i],
              voiceId,
              project.apiKey,
              project.settings,
              project.modelVersion
            );
            fs.writeFileSync(chunkFile, audioBuffer);
          }
          
          chunkFiles.push(chunkFile);
          
          segment.status = 'completed';
          segment.file = chunkFile;
          
          sendUpdate(project.id, {
            type: 'segment_complete',
            chapterIndex,
            segmentIndex
          });
          
          segmentIndex++;
          saveProjects();
        }
      }
      
      if (isDemo && chapter.segments.length > segments.length) {
        for (let i = segments.length; i < chapter.segments.length; i++) {
          chapter.segments[i].status = 'skipped';
        }
        saveProjects();
      }
    }
    
    // Merge chunks into chapter
    const chapterFile = path.join(CHAPTERS_DIR, `${chapterId}.mp3`);
    const normalizedFile = path.join(CHAPTERS_DIR, `${chapterId}_normalized.mp3`);
    
    sendUpdate(project.id, {
      type: 'chapter_merging',
      chapterIndex
    });
    
    await mergeAudioFiles(chunkFiles, chapterFile);
    await normalizeAudio(chapterFile, normalizedFile);
    
    // Replace with normalized version
    fs.unlinkSync(chapterFile);
    fs.renameSync(normalizedFile, chapterFile);
    
    chapter.status = 'completed';
    chapter.demo = isDemo;
    chapter.file = chapterFile;
    chapter.url = `/audio/chapters/${path.basename(chapterFile)}`;
    
    sendUpdate(project.id, {
      type: 'chapter_complete',
      chapterIndex,
      url: chapter.url
    });
    
    saveProjects();
    
  } catch (error) {
    chapter.status = 'error';
    chapter.error = error.message;
    
    sendUpdate(project.id, {
      type: 'chapter_error',
      chapterIndex,
      error: error.message
    });
    
    saveProjects();
    throw error;
  }
}

// Process entire project
async function processProject(projectId, options = {}) {
  const project = projects[projectId];
  if (!project) return;

  const batchLimit = Number.isFinite(options.limit) && options.limit > 0
    ? Math.floor(options.limit)
    : null;

  project.status = 'processing';
  project.error = null;
  saveProjects();

  try {
    const totalChapters = project.chapters.length;
    const requestedLimit = typeof project.chapterLimit === 'number' && project.chapterLimit > 0
      ? Math.min(project.chapterLimit, totalChapters)
      : totalChapters;
    const effectiveLimit = project.demoMode ? Math.min(requestedLimit, 1) : requestedLimit;

    let processedCount = 0;

    for (let i = 0; i < project.chapters.length; i++) {
      const chapter = project.chapters[i];

      if (typeof effectiveLimit === 'number' && i >= effectiveLimit) {
        if (chapter.status !== 'skipped') {
          chapter.status = 'skipped';
          if (Array.isArray(chapter.segments)) {
            chapter.segments.forEach(seg => {
              seg.status = 'skipped';
            });
          }
          saveProjects();
          sendUpdate(projectId, {
            type: project.demoMode ? 'chapter_skipped_demo' : 'chapter_skipped',
            chapterIndex: i
          });
        }
        continue;
      }

      if (chapter.status === 'completed' || chapter.status === 'skipped') {
        continue;
      }

      if (batchLimit !== null && processedCount >= batchLimit) {
        break;
      }

      chapter.status = 'pending';
      chapter.error = null;

      if (project.status === 'paused') {
        break;
      }

      await processChapter(project, i);
      processedCount += 1;

      if (project.status === 'paused') {
        break;
      }
    }

    if (project.status === 'paused') {
      saveProjects();
      return;
    }

    const hasErrors = project.chapters.some(ch => ch.status === 'error');
    const hasPending = project.chapters.some(ch => ch.status === 'pending');

    if (hasErrors) {
      project.status = 'error';
    } else if (hasPending) {
      project.status = 'pending';
    } else {
      project.status = 'ready_for_merge';
      sendUpdate(projectId, {
        type: 'project_ready_for_merge'
      });
    }

    saveProjects();

  } catch (error) {
    project.status = 'error';
    project.error = error.message;

    sendUpdate(projectId, {
      type: 'project_error',
      error: error.message
    });

    saveProjects();
  }
}

async function finalizeProject(projectId) {
  const project = projects[projectId];
  if (!project) {
    throw new Error('Project not found');
  }

  const incompleteChapter = project.chapters.find(ch => ch.status !== 'completed' && ch.status !== 'skipped');
  if (incompleteChapter) {
    throw new Error('All chapters must be completed before finalizing the book');
  }

  const chapterFiles = project.chapters
    .filter(ch => ch.file && fs.existsSync(ch.file))
    .map(ch => ch.file);

  if (chapterFiles.length === 0) {
    throw new Error('No chapter audio files available to merge');
  }

  sendUpdate(projectId, {
    type: 'book_merging'
  });

  const bookFile = path.join(BOOK_DIR, `${projectId}_audiobook.mp3`);
  await mergeAudioFiles(chapterFiles, bookFile);

  project.bookFile = bookFile;
  project.bookUrl = `/audio/book/${path.basename(bookFile)}`;
  project.status = 'completed';
  project.completedAt = new Date().toISOString();

  saveProjects();

  sendUpdate(projectId, {
    type: 'project_complete',
    bookUrl: project.bookUrl
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Serve static files
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getHTML());
    return;
  }
  
  // Serve audio files
  if (pathname.startsWith('/audio/')) {
    const filePath = pathname.replace('/audio/', '');
    const fullPath = path.join(OUTPUT_DIR, filePath);
    
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size
      });
      fs.createReadStream(fullPath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }
  
  // API endpoints
  if (pathname === '/api/projects' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.values(projects)));
    return;
  }
  
  if (pathname === '/api/projects' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        
        const voiceSwitchToken = typeof data.voiceSwitchToken === 'string' && data.voiceSwitchToken.trim().length > 0
          ? data.voiceSwitchToken.trim()
          : '***';
        let chapterLimit = null;
        if (data.chapterLimit !== undefined && data.chapterLimit !== null && data.chapterLimit !== '') {
          const parsedLimit = parseInt(data.chapterLimit, 10);
          if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
            throw new Error('Chapter limit must be a positive integer when provided');
          }
          chapterLimit = parsedLimit;
        }
        const demoMode = Boolean(data.demoMode);
        const demoCharLimit = typeof data.demoCharLimit === 'number' && data.demoCharLimit > 0 ? data.demoCharLimit : undefined;
        const demoChunksPerSegment = typeof data.demoChunksPerSegment === 'number' && data.demoChunksPerSegment > 0 ? data.demoChunksPerSegment : undefined;
        const demoSegmentsPerChapter = typeof data.demoSegmentsPerChapter === 'number' && data.demoSegmentsPerChapter > 0 ? data.demoSegmentsPerChapter : undefined;
        const modelVersion = typeof data.modelVersion === 'string' && ELEVEN_MODEL_VERSIONS[data.modelVersion]
          ? data.modelVersion
          : DEFAULT_MODEL_VERSION;
        
        // Validate API key by fetching voices
        const voices = await getVoices(data.apiKey);
        
        const projectId = generateId();
        const voiceNames = [];
        if (Array.isArray(data.voiceNames)) {
          data.voiceNames.forEach((name, idx) => {
            if (idx >= 0 && idx < (Array.isArray(data.voices) ? data.voices.length : 0) && typeof name === 'string') {
              const trimmed = name.trim();
              if (trimmed) {
                voiceNames[idx] = trimmed;
              }
            }
          });
        }

        const chapters = parseManuscript(data.manuscript, data.mode, {
          voiceSwitchToken,
          voiceNames
        });

        projects[projectId] = {
          id: projectId,
          title: data.title,
          author: data.author,
          language: data.language,
          description: data.description,
          mode: data.mode,
          voices: data.voices,
          apiKey: data.apiKey,
          settings: data.settings || {},
          chapterLimit: chapterLimit,
          demoMode,
          demoCharLimit,
          demoChunksPerSegment,
          demoSegmentsPerChapter,
          voiceSwitchToken,
          voiceNames,
          modelVersion,
          chapters: chapters.map((ch) => ({
            ...ch,
            status: 'pending',
            segments: Array.isArray(ch.segments)
              ? ch.segments.map((segment, index) => ({
                  ...segment,
                  index,
                  status: 'pending',
                  file: null
                }))
              : [],
            file: null,
            url: null,
            error: null,
            demo: false
          })),
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        normalizeProject(projects[projectId]);
        
        saveProjects();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ projectId, chapters: chapters.length }));
        
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/chapters') && req.method === 'POST') {
    const projectId = pathname.split('/')[3];
    const project = projects[projectId];

    if (!project) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
      return;
    }

    try {
      const data = await readJsonBody(req);
      const manuscript = typeof data.manuscript === 'string' ? data.manuscript.trim() : '';

      if (!manuscript) {
        throw new Error('Manuscript text is required');
      }

      const mode = data.mode || project.mode;
      if (mode !== project.mode) {
        throw new Error('Additional chapters must use the same mode as the project');
      }

      const voiceSwitchToken = typeof data.voiceSwitchToken === 'string' && data.voiceSwitchToken.trim().length > 0
        ? data.voiceSwitchToken.trim()
        : project.voiceSwitchToken || '***';

      const startingNumber = getNextChapterNumber(project);
      const parsedChapters = parseManuscript(manuscript, mode, {
        voiceSwitchToken,
        startingNumber,
        voiceNames: project.voiceNames
      });

      if (!parsedChapters.length) {
        throw new Error('No chapters were detected in the manuscript');
      }

      appendChaptersToProject(project, parsedChapters);
      project.voiceSwitchToken = voiceSwitchToken;
      project.updatedAt = new Date().toISOString();
      normalizeProject(project);

      saveProjects();

      sendUpdate(projectId, {
        type: 'project_updated'
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        added: parsedChapters.length,
        nextChapterNumber: getNextChapterNumber(project)
      }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/voices') && req.method === 'POST') {
    const projectId = pathname.split('/')[3];
    const project = projects[projectId];

    if (!project) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
      return;
    }

    try {
      const data = await readJsonBody(req);
      const namesInput = Array.isArray(data.voiceNames) ? data.voiceNames : [];
      const expectedCount = Array.isArray(project.voices) && project.voices.length > 0
        ? project.voices.length
        : (project.mode === 'dual' ? 2 : 1);

      const voiceNames = [];
      for (let i = 0; i < expectedCount; i++) {
        const raw = typeof namesInput[i] === 'string' ? namesInput[i] : '';
        voiceNames[i] = raw.trim();
      }

      project.voiceNames = voiceNames;
      project.updatedAt = new Date().toISOString();
      normalizeProject(project);
      saveProjects();

      sendUpdate(projectId, {
        type: 'project_voice_updated',
        voiceNames
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ voiceNames }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (pathname.startsWith('/api/projects/') && req.method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = projects[projectId];
    
    if (project) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(project));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
    }
    return;
  }
  
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/start') && req.method === 'POST') {
    const projectId = pathname.split('/')[3];
    const project = projects[projectId];
    
    if (project) {
      let limit = null;
      try {
        const data = await readJsonBody(req);
        if (data && Number.isFinite(data.limit) && data.limit > 0) {
          limit = Math.floor(data.limit);
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }

      project.status = 'processing';
      saveProjects();

      sendUpdate(projectId, {
        type: 'project_processing'
      });

      // Start processing in background
      processProject(projectId, { limit }).catch(console.error);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'started', limit: limit || null }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
    }
    return;
  }
  
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/pause') && req.method === 'POST') {
    const projectId = pathname.split('/')[3];
    const project = projects[projectId];
    
    if (project) {
      project.status = 'paused';
      saveProjects();

      sendUpdate(projectId, {
        type: 'project_paused'
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'paused' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
    }
    return;
  }
  
  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/resume') && req.method === 'POST') {
    const projectId = pathname.split('/')[3];
    const project = projects[projectId];
    
    if (project) {
      let limit = null;
      try {
        const data = await readJsonBody(req);
        if (data && Number.isFinite(data.limit) && data.limit > 0) {
          limit = Math.floor(data.limit);
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }

      project.status = 'processing';
      saveProjects();

      sendUpdate(projectId, {
        type: 'project_processing'
      });

      // Resume processing
      processProject(projectId, { limit }).catch(console.error);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'resumed', limit: limit || null }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
    }
    return;
  }

  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/finalize') && req.method === 'POST') {
    const projectId = pathname.split('/')[3];
    const project = projects[projectId];

    if (!project) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
      return;
    }

    try {
      await finalizeProject(projectId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'finalized', bookUrl: project.bookUrl }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  if (pathname === '/api/voices' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { apiKey } = JSON.parse(body);
        const voices = await getVoices(apiKey);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(voices));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  if (pathname.startsWith('/api/events/') && req.method === 'GET') {
    const projectId = pathname.split('/')[3];
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Add client to list
    if (!clients.has(projectId)) {
      clients.set(projectId, []);
    }
    clients.get(projectId).push(res);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
    // Remove client on disconnect
    req.on('close', () => {
      const clientList = clients.get(projectId);
      if (clientList) {
        const index = clientList.indexOf(res);
        if (index > -1) {
          clientList.splice(index, 1);
        }
      }
    });
    
    return;
  }
  
  // 404
  res.writeHead(404);
  res.end('Not found');
});

// HTML Frontend
function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audiobook Generator</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    header p {
      opacity: 0.9;
      font-size: 1.1em;
    }
    
    .content {
      padding: 30px;
    }
    
    .tabs {
      display: flex;
      gap: 10px;
      border-bottom: 2px solid #e0e0e0;
      margin-bottom: 30px;
    }
    
    .tab {
      padding: 15px 30px;
      background: none;
      border: none;
      font-size: 1.1em;
      cursor: pointer;
      color: #666;
      border-bottom: 3px solid transparent;
      transition: all 0.3s;
    }
    
    .tab:hover {
      color: #667eea;
    }
    
    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .sub-label {
      margin-top: 10px;
      margin-bottom: 6px;
      font-weight: 500;
      color: #555;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 500;
    }

    .checkbox-label input[type="checkbox"] {
      width: auto;
      margin: 0;
    }
    
    input[type="text"],
    input[type="number"],
    textarea,
    select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1em;
      font-family: inherit;
      transition: border-color 0.3s;
    }
    
    input[type="text"]:focus,
    input[type="number"]:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: #667eea;
    }
    
    textarea {
      min-height: 200px;
      resize: vertical;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 14px 28px;
      font-size: 1em;
      border-radius: 6px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      font-weight: 600;
    }
    
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    .btn-secondary {
      background: #6c757d;
    }
    
    .btn-success {
      background: #28a745;
    }
    
    .btn-danger {
      background: #dc3545;
    }
    
    .btn-small {
      padding: 8px 16px;
      font-size: 0.9em;
    }
    
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .project-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .project-card:hover {
      border-color: #667eea;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .project-card h3 {
      color: #333;
      margin-bottom: 10px;
    }
    
    .project-card p {
      color: #666;
      margin-bottom: 5px;
      font-size: 0.9em;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
      margin-top: 10px;
    }
    
    .status-pending {
      background: #ffc107;
      color: #000;
    }
    
    .status-processing {
      background: #17a2b8;
      color: white;
    }
    
    .status-completed {
      background: #28a745;
      color: white;
    }
    
    .status-paused {
      background: #6c757d;
      color: white;
    }
    
    .status-error {
      background: #dc3545;
      color: white;
    }

    .status-skipped {
      background: #adb5bd;
      color: #212529;
    }

    .status-ready_for_merge {
      background: #20c997;
      color: white;
    }

    .status-demo {
      background: #17a2b8;
      color: white;
    }

    .controls input[type="number"] {
      max-width: 160px;
      margin-right: 10px;
    }

    .section-heading {
      margin-top: 30px;
      margin-bottom: 10px;
      font-size: 1.2em;
      font-weight: 600;
      color: #333;
    }

    .section-subtext {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 10px;
    }

    .chapter-list {
      margin-top: 20px;
    }

    .voice-name-grid {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .voice-name-grid .form-group {
      flex: 1 1 220px;
    }

    .chapter-item {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 10px;
    }

    .chapter-meta {
      margin: 8px 0;
      font-size: 0.95em;
      color: #444;
    }

    .voice-cue {
      color: #666;
      font-style: italic;
    }
    
    .chapter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .chapter-title {
      font-weight: 600;
      color: #333;
    }

    .chapter-number {
      display: inline-block;
      background: #eef2ff;
      color: #4c51bf;
      border-radius: 12px;
      padding: 2px 10px;
      margin-right: 8px;
      font-weight: 600;
      font-size: 0.9em;
    }
    
    .waveform {
      width: 100%;
      height: 80px;
      background: #f5f5f5;
      border-radius: 4px;
      margin: 10px 0;
      position: relative;
      overflow: hidden;
    }
    
    .waveform-bar {
      position: absolute;
      bottom: 0;
      width: 2px;
      background: #667eea;
      transition: height 0.3s;
    }
    
    .audio-player {
      margin-top: 10px;
    }
    
    audio {
      width: 100%;
      margin-top: 10px;
    }
    
    .activity-log {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 15px;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      margin-top: 20px;
    }
    
    .log-entry {
      padding: 5px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .log-entry:last-child {
      border-bottom: none;
    }
    
    .log-time {
      color: #6c757d;
      margin-right: 10px;
    }
    
    .controls {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      flex-wrap: wrap;
      align-items: center;
    }
    
    .voice-selector {
      margin-top: 10px;
    }
    
    .voice-config {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-top: 10px;
    }
    
    .slider-group {
      margin-bottom: 15px;
    }
    
    .slider-group label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    input[type="range"] {
      width: 100%;
    }
    
    .hidden {
      display: none !important;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .segment-table {
      width: 100%;
      margin-top: 10px;
      border-collapse: collapse;
    }
    
    .segment-table th,
    .segment-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .segment-table th {
      background: #f8f9fa;
      font-weight: 600;
    }
    
    .voice-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 5px;
    }
    
    .voice-0 {
      background: #667eea;
    }
    
    .voice-1 {
      background: #f093fb;
    }

    .help-text {
      display: block;
      margin-top: 6px;
      font-size: 0.85em;
      color: #666;
    }

    .info-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      font-size: 0.75em;
      margin-left: 8px;
      cursor: help;
      position: relative;
      flex-shrink: 0;
      outline: none;
    }

    .info-icon::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 50%;
      bottom: 125%;
      transform: translate(-50%, 4px);
      background: rgba(33, 37, 41, 0.95);
      color: white;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 0.75em;
      line-height: 1.3;
      width: max-content;
      max-width: 240px;
      text-align: left;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
      z-index: 10;
      white-space: normal;
    }

    .info-icon::before {
      content: '';
      position: absolute;
      bottom: 110%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px;
      border-style: solid;
      border-color: rgba(33, 37, 41, 0.95) transparent transparent transparent;
      opacity: 0;
      transition: opacity 0.15s ease;
      pointer-events: none;
    }

    .info-icon:hover::after,
    .info-icon:focus::after {
      opacity: 1;
      transform: translate(-50%, -4px);
    }

    .info-icon:hover::before,
    .info-icon:focus::before {
      opacity: 1;
    }

    .slider-group label.slider-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: #333;
    }

    .slider-group label .slider-label-text {
      flex: 1;
    }

    .slider-group label .slider-value {
      font-weight: 600;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎙️ Audiobook Generator</h1>
      <p>Transform your manuscripts into professional audiobooks with AI voices</p>
    </header>
    
    <div class="content">
      <div class="tabs">
        <button class="tab active" data-tab="dashboard" onclick="switchTab('dashboard', event)">Dashboard</button>
        <button class="tab" data-tab="new-book" onclick="switchTab('new-book', event)">New Book</button>
      </div>
      
      <!-- Dashboard Tab -->
      <div id="dashboard" class="tab-content active">
        <h2>Your Projects</h2>
        <div id="projects-list" class="projects-grid">
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading projects...</p>
          </div>
        </div>
      </div>
      
      <!-- New Book Tab -->
      <div id="new-book" class="tab-content">
        <h2>Create New Audiobook</h2>
        <form id="new-book-form">
          <div class="form-group">
            <label for="api-key">ElevenLabs API Key *
              <span class="info-icon" tabindex="0" role="img" aria-label="ElevenLabs API key usage info" data-tooltip="Your personal ElevenLabs key authorises voice lookups and audio generation. It is stored locally and required before loading voices.">i</span>
            </label>
            <input type="text" id="api-key" required placeholder="Enter your API key">
            <button type="button" class="btn-secondary btn-small" onclick="loadVoices()" style="margin-top: 10px;">Load Voices</button>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="title">Book Title *</label>
              <input type="text" id="title" required placeholder="Enter book title">
            </div>
            
            <div class="form-group">
              <label for="author">Author</label>
              <input type="text" id="author" placeholder="Enter author name">
            </div>
          </div>
          
          <div class="form-row">
          <div class="form-group">
            <label for="language">Language</label>
            <input type="text" id="language" placeholder="e.g., English, Spanish">
          </div>
          
          <div class="form-group">
            <label for="mode">Narration Mode *
              <span class="info-icon" tabindex="0" role="img" aria-label="Narration mode info" data-tooltip="Choose single voice for one narrator, or dual voice to alternate between two voices using the changeover marker.">i</span>
            </label>
            <select id="mode" required onchange="updateVoiceSelectors()">
              <option value="single">Single Voice</option>
              <option value="dual">Dual Voice</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="model-version">ElevenLabs Model *
              <span class="info-icon" tabindex="0" role="img" aria-label="ElevenLabs model info" data-tooltip="Select which ElevenLabs voice model to use for this project. All audio renders for the project will use this model.">i</span>
            </label>
            <select id="model-version" required>
              <option value="v2" selected>ElevenLabs v2</option>
              <option value="v3">ElevenLabs v3</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="chapter-limit">Chapters to Process
              <span class="info-icon" tabindex="0" role="img" aria-label="Chapter limit info" data-tooltip="Set how many chapters to generate this run. Leave blank to process everything detected in the manuscript.">i</span>
            </label>
            <input type="number" id="chapter-limit" min="1" placeholder="Leave blank to process all chapters">
          </div>
          
          <div class="form-group">
            <label>Demo Mode
              <span class="info-icon" tabindex="0" role="img" aria-label="Demo mode info" data-tooltip="Creates a short sample by limiting chapters, segments, and chunk lengths. Ideal for quick previews before full generation.">i</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="demo-mode">
              <span>Generate a short preview sample</span>
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" placeholder="Brief description of the book"></textarea>
        </div>
          
          <div class="form-group">
            <label for="manuscript">Manuscript *</label>
            <textarea id="manuscript" required placeholder="Paste your manuscript here (plain text or markdown)"></textarea>
          </div>
          
          <div class="voice-config">
            <h3>Voice Selection</h3>
            <div id="voice-selectors">
              <div class="form-group">
                <label for="voice-1">Voice 1 *
                  <span class="info-icon" tabindex="0" role="img" aria-label="Voice 1 info" data-tooltip="Primary narration voice. Pick a character that suits the narrator's role or the majority of the text.">i</span>
                </label>
                <select id="voice-1" required>
                  <option value="">Load voices first</option>
                </select>
                <label for="voice-1-name" class="sub-label">Character Name</label>
                <input type="text" id="voice-1-name" placeholder="e.g. Demetri">
              </div>
              
              <div class="form-group hidden" id="voice-2-group">
                <label for="voice-2">Voice 2 *
                  <span class="info-icon" tabindex="0" role="img" aria-label="Voice 2 info" data-tooltip="Secondary voice used after each changeover token. Choose a contrasting voice for dialogue or alternating perspectives.">i</span>
                </label>
                <select id="voice-2">
                  <option value="">Load voices first</option>
                </select>
                <label for="voice-2-name" class="sub-label">Character Name</label>
                <input type="text" id="voice-2-name" placeholder="e.g. Diana">
              </div>
            </div>
            
            <div class="form-group">
              <label for="voice-change-token">Voice Changeover Token
                <span class="info-icon" tabindex="0" role="img" aria-label="Voice change token info" data-tooltip="Characters in your manuscript that signal the narration should switch voices. Match the marker you place between dual-voice passages.">i</span>
              </label>
              <input type="text" id="voice-change-token" value="***" maxlength="16">
              <span class="help-text">Marker used to switch between voices in the manuscript.</span>
            </div>
            
            <h3 style="margin-top: 20px;">Audio Settings</h3>
            
            <div class="slider-group">
              <label class="slider-label">
                <span class="slider-label-text">Stability</span>
                <span class="info-icon" tabindex="0" role="img" aria-label="Stability setting info" data-tooltip="Higher values keep delivery consistent; lower values add more expressive variation. Try 0.3-0.6 for natural narration.">i</span>
                <span id="stability-value" class="slider-value">0.5</span>
              </label>
              <input type="range" id="stability" min="0" max="1" step="0.1" value="0.5" oninput="updateSliderValue('stability')">
            </div>
            
            <div class="slider-group">
              <label class="slider-label">
                <span class="slider-label-text">Similarity Boost</span>
                <span class="info-icon" tabindex="0" role="img" aria-label="Similarity boost info" data-tooltip="Raises how closely the output matches the original voice. Use higher values for brand consistency; lower for more creativity.">i</span>
                <span id="similarity-value" class="slider-value">0.75</span>
              </label>
              <input type="range" id="similarity" min="0" max="1" step="0.05" value="0.75" oninput="updateSliderValue('similarity')">
            </div>
            
            <div class="slider-group">
              <label class="slider-label">
                <span class="slider-label-text">Style</span>
                <span class="info-icon" tabindex="0" role="img" aria-label="Style setting info" data-tooltip="Adds dramatic flair to delivery. Increase slightly for storytelling energy; keep lower for neutral narration.">i</span>
                <span id="style-value" class="slider-value">0</span>
              </label>
              <input type="range" id="style" min="0" max="1" step="0.1" value="0" oninput="updateSliderValue('style')">
            </div>
            
            <div class="slider-group">
              <label class="slider-label">
                <span class="slider-label-text">Speed</span>
                <span class="info-icon" tabindex="0" role="img" aria-label="Speed setting info" data-tooltip="Controls playback tempo. 1.0 is normal. Use 0.9 for reflective pacing or up to 1.3 for brisk delivery.">i</span>
                <span id="speed-value" class="slider-value">1.0</span>
              </label>
              <input type="range" id="speed" min="0.5" max="2" step="0.1" value="1" oninput="updateSliderValue('speed')">
            </div>
          </div>
          
          <button type="submit" style="margin-top: 20px;">Create Audiobook Project</button>
        </form>
      </div>
    </div>
  </div>
  
  <!-- Project Detail Modal -->
  <div id="project-modal" class="hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; overflow-y: auto;">
    <div style="max-width: 1200px; margin: 50px auto; background: white; border-radius: 12px; padding: 30px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 id="modal-title">Project Details</h2>
        <button onclick="closeModal()" class="btn-secondary">Close</button>
      </div>
      
      <div id="modal-content">
        <!-- Dynamic content -->
      </div>
    </div>
  </div>

  <script>
    let currentProject = null;
    let eventSource = null;
    let availableVoices = [];
    const MODEL_LABELS = {
      v2: 'ElevenLabs v2',
      v3: 'ElevenLabs v3'
    };
    
    // Tab switching
    function switchTab(tabName, evt) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      
      const tabButton = (evt && (evt.currentTarget || evt.target)) || document.querySelector('.tab[data-tab="' + tabName + '"]');
      if (tabButton) {
        tabButton.classList.add('active');
      }
      document.getElementById(tabName).classList.add('active');
      
      if (tabName === 'dashboard') {
        loadProjects();
      }
    }
    
    // Update slider values
    function updateSliderValue(name) {
      const slider = document.getElementById(name);
      const display = document.getElementById(name + '-value');
      display.textContent = slider.value;
    }
    
    // Update voice selectors based on mode
    function updateVoiceSelectors() {
      const mode = document.getElementById('mode').value;
      const voice2Group = document.getElementById('voice-2-group');
      const tokenInput = document.getElementById('voice-change-token');
      const tokenHelp = tokenInput ? tokenInput.nextElementSibling : null;
      
      if (mode === 'dual') {
        voice2Group.classList.remove('hidden');
        document.getElementById('voice-2').required = true;
        if (tokenInput) {
          tokenInput.disabled = false;
        }
        if (tokenHelp) {
          tokenHelp.textContent = 'Marker used to switch between voices in the manuscript.';
        }
      } else {
        voice2Group.classList.add('hidden');
        document.getElementById('voice-2').required = false;
        if (tokenInput) {
          tokenInput.disabled = true;
        }
        if (tokenHelp) {
          tokenHelp.textContent = 'Enable dual voice mode to customise the marker.';
        }
      }
    }
    
    // Load voices from API
    async function loadVoices() {
      const apiKey = document.getElementById('api-key').value;
      if (!apiKey) {
        alert('Please enter your API key first');
        return;
      }
      
      try {
        const response = await fetch('/api/voices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });
        
        if (!response.ok) throw new Error('Failed to load voices');
        
        availableVoices = await response.json();
        
        const voice1 = document.getElementById('voice-1');
        const voice2 = document.getElementById('voice-2');
        
        voice1.innerHTML = '<option value="">Select a voice</option>';
        voice2.innerHTML = '<option value="">Select a voice</option>';
        
        availableVoices.forEach(voice => {
          const option1 = document.createElement('option');
          option1.value = voice.voice_id;
          option1.textContent = voice.name;
          voice1.appendChild(option1);
          
          const option2 = document.createElement('option');
          option2.value = voice.voice_id;
          option2.textContent = voice.name;
          voice2.appendChild(option2);
        });
        
        alert('Voices loaded successfully!');
      } catch (error) {
        alert('Error loading voices: ' + error.message);
      }
    }

    function formatStatus(status) {
      if (!status || typeof status !== 'string') {
        return 'UNKNOWN';
      }
      return status.replace(/_/g, ' ').toUpperCase();
    }

    function formatModelVersion(version) {
      return MODEL_LABELS[version] || MODEL_LABELS.v2;
    }

    function escapeHtml(value) {
      if (value === undefined || value === null) {
        return '';
      }
      return value
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function getVoiceLabel(project, index) {
      const fallback = 'Voice ' + ((Number.isFinite(index) ? Number(index) : 0) + 1);
      if (!project || !Array.isArray(project.voiceNames)) {
        return fallback;
      }
      const name = project.voiceNames[index];
      if (typeof name === 'string' && name.trim().length > 0) {
        return name.trim();
      }
      return fallback;
    }

    function formatVoiceSummary(project) {
      if (!project || !Array.isArray(project.voiceNames) || project.voiceNames.length === 0) {
        return '';
      }
      const entries = project.voiceNames.map((name, idx) => {
        const label = typeof name === 'string' && name.trim().length > 0 ? name.trim() : '—';
        return 'Voice ' + (idx + 1) + ': ' + label;
      });
      return entries.join(' | ');
    }
    
    // Load projects
    async function loadProjects() {
      try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        const container = document.getElementById('projects-list');
        
        if (projects.length === 0) {
          container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No projects yet. Create your first audiobook!</p>';
          return;
        }
        
        container.innerHTML = projects.map(project => {
          const totalChapters = project.chapters.length;
          const activeChapters = project.chapters.filter(ch => ch.status !== 'skipped').length;
          const completedChapters = project.chapters.filter(ch => ch.status === 'completed').length;
          const progress = activeChapters > 0 ? (completedChapters / activeChapters * 100) : 0;
          const nextChapterNumber = project.chapters.reduce((max, ch) => Math.max(max, ch.number || 0), 0) + 1;
          const voiceSummary = formatVoiceSummary(project);
          
          return \`
            <div class="project-card" onclick="openProject('\${project.id}')">
              <h3>\${project.title}</h3>
              <p><strong>Author:</strong> \${project.author || 'Unknown'}</p>
              <p><strong>Chapters:</strong> \${completedChapters} / \${activeChapters} active (total \${totalChapters})</p>
              <p><strong>Next Chapter #</strong>: \${nextChapterNumber}</p>
              <p><strong>Mode:</strong> \${project.mode === 'single' ? 'Single Voice' : 'Dual Voice'}</p>
              <p><strong>Model:</strong> \${formatModelVersion(project.modelVersion)}</p>
              \${voiceSummary ? '<p><strong>Voices:</strong> ' + escapeHtml(voiceSummary) + '</p>' : ''}
              <div class="progress-bar">
                <div class="progress-fill" style="width: \${progress}%"></div>
              </div>
              <span class="status-badge status-\${project.status}">\${formatStatus(project.status)}</span>
            </div>
          \`;
        }).join('');
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }
    
    // Create new project
    document.getElementById('new-book-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const mode = document.getElementById('mode').value;
      const voices = [document.getElementById('voice-1').value];
      const voiceNames = [];
      const voice1Name = document.getElementById('voice-1-name').value.trim();
      if (voice1Name) {
        voiceNames[0] = voice1Name;
      }
      
      if (mode === 'dual') {
        voices.push(document.getElementById('voice-2').value);
        const voice2Input = document.getElementById('voice-2-name');
        if (voice2Input) {
          const voice2Name = voice2Input.value.trim();
          if (voice2Name) {
            voiceNames[1] = voice2Name;
          }
        }
      }
      
      const data = {
        apiKey: document.getElementById('api-key').value,
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        language: document.getElementById('language').value,
        description: document.getElementById('description').value,
        manuscript: document.getElementById('manuscript').value,
        mode: mode,
        voices: voices,
        modelVersion: document.getElementById('model-version').value,
        settings: {
          stability: parseFloat(document.getElementById('stability').value),
          similarity_boost: parseFloat(document.getElementById('similarity').value),
          style: parseFloat(document.getElementById('style').value),
          speed: parseFloat(document.getElementById('speed').value)
        }
      };

      if (voiceNames.length > 0) {
        data.voiceNames = voiceNames;
      }
      
      const chapterLimitValue = document.getElementById('chapter-limit').value;
      if (chapterLimitValue) {
        const parsedLimit = parseInt(chapterLimitValue, 10);
        if (!Number.isNaN(parsedLimit)) {
          data.chapterLimit = parsedLimit;
        }
      }
      data.demoMode = document.getElementById('demo-mode').checked;
      const voiceSwitchTokenValue = document.getElementById('voice-change-token').value.trim();
      if (voiceSwitchTokenValue) {
        data.voiceSwitchToken = voiceSwitchTokenValue;
      }
      
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error);
        }
        
        const result = await response.json();
        alert(\`Project created successfully! \${result.chapters} chapters detected.\`);
        
        // Reset form
        document.getElementById('new-book-form').reset();
        updateSliderValue('stability');
        updateSliderValue('similarity');
        updateSliderValue('style');
        updateSliderValue('speed');
        updateVoiceSelectors();
        
        // Switch to dashboard
        switchTab('dashboard');
        loadProjects();
      } catch (error) {
        alert('Error creating project: ' + error.message);
      }
    });
    
    // Open project detail
    async function openProject(projectId) {
      try {
        const response = await fetch(\`/api/projects/\${projectId}\`);
        const project = await response.json();
        
        currentProject = project;
        
        const modal = document.getElementById('project-modal');
        const content = document.getElementById('modal-content');
        const totalChapters = project.chapters.length;
        const activeChapters = project.chapters.filter(ch => ch.status !== 'skipped').length;
        const completedChapters = project.chapters.filter(ch => ch.status === 'completed').length;
        const pendingChapters = project.chapters.filter(ch => ch.status === 'pending').length;
        const nextChapterNumber = project.chapters.reduce((max, ch) => Math.max(max, ch.number || 0), 0) + 1;
        const readyForMerge = project.status === 'ready_for_merge';
        const lastUpdated = project.updatedAt ? new Date(project.updatedAt).toLocaleString() : '—';
        const voiceSummary = formatVoiceSummary(project);
        const voiceNamesArray = Array.isArray(project.voiceNames) ? project.voiceNames : [];
        const voiceNameInputs = (() => {
          const inputs = [];
          const placeholder1 = escapeHtml(getVoiceLabel(project, 0));
          const value1 = escapeHtml(voiceNamesArray[0] || '');
          inputs.push(
            '<div class="form-group">' +
              '<label class="sub-label" for="voice-name-0">Voice 1 Name</label>' +
              '<input type="text" id="voice-name-0" data-voice-name-index="0" value="' + value1 + '" placeholder="' + placeholder1 + '">' +
            '</div>'
          );
          if (project.mode === 'dual') {
            const placeholder2 = escapeHtml(getVoiceLabel(project, 1));
            const value2 = escapeHtml(voiceNamesArray[1] || '');
            inputs.push(
              '<div class="form-group">' +
                '<label class="sub-label" for="voice-name-1">Voice 2 Name</label>' +
                '<input type="text" id="voice-name-1" data-voice-name-index="1" value="' + value2 + '" placeholder="' + placeholder2 + '">' +
              '</div>'
            );
          }
          return inputs.join('');
        })();
        
        document.getElementById('modal-title').textContent = project.title;
        
        content.innerHTML = \`
          <div>
            <p><strong>Author:</strong> \${project.author || 'Unknown'}</p>
            <p><strong>Status:</strong> <span class="status-badge status-\${project.status}">\${formatStatus(project.status)}</span></p>
            <p><strong>Mode:</strong> \${project.mode === 'single' ? 'Single Voice' : 'Dual Voice'}</p>
            \${voiceSummary ? '<p><strong>Voices:</strong> ' + escapeHtml(voiceSummary) + '</p>' : ''}
            <p><strong>Model:</strong> \${formatModelVersion(project.modelVersion)}</p>
            <p><strong>Demo Mode:</strong> \${project.demoMode ? 'Enabled' : 'Disabled'}</p>
            <p><strong>Active Chapters:</strong> \${completedChapters} / \${activeChapters} completed (total \${totalChapters})</p>
            <p><strong>Pending Chapters:</strong> \${pendingChapters}</p>
            <p><strong>Next Chapter Number:</strong> \${nextChapterNumber}</p>
            <p><strong>Last Updated:</strong> \${lastUpdated}</p>

            <div class="section-heading">Voice Names</div>
            <div class="section-subtext">Update the character labels used throughout the project. Leave blank to fall back to the default voice labels.</div>
            <div class="voice-name-grid">
              \${voiceNameInputs}
            </div>
            <div class="controls">
              <button class="btn-secondary" onclick="saveVoiceNames('\${project.id}')">Save Voice Names</button>
            </div>

            <div class="section-heading">Processing Controls</div>
            <div class="section-subtext">Set a batch size to limit how many chapters run in this pass. Leave blank to process the remaining pending chapters.</div>
            <div class="controls">
              <input type="number" id="batch-size" min="1" placeholder="Batch size (optional)">
              <button onclick="startProject('\${project.id}', getBatchLimit())" \${project.status === 'processing' ? 'disabled' : ''}>Process Batch</button>
              <button onclick="startProject('\${project.id}', 1)" \${project.status === 'processing' ? 'disabled' : ''}>Process Next Chapter</button>
              <button onclick="startProject('\${project.id}')" \${project.status === 'processing' ? 'disabled' : ''}>Process All Pending</button>
            </div>
            <div class="controls">
              <button onclick="pauseProject('\${project.id}')" class="btn-secondary" \${project.status !== 'processing' ? 'disabled' : ''}>Pause</button>
              <button onclick="resumeProject('\${project.id}', getBatchLimit())" class="btn-success" \${project.status !== 'paused' ? 'disabled' : ''}>Resume</button>
              <button onclick="finalizeProject('\${project.id}')" class="btn-success" \${readyForMerge ? '' : 'disabled'}>Finalize Audiobook</button>
              \${project.bookUrl ? \`<a href="\${project.bookUrl}" download><button class="btn-success">Download Audiobook</button></a>\` : ''}
            </div>

            <div class="section-heading">Activity</div>
            <div class="activity-log" id="activity-log">
              <div class="log-entry">
                <span class="log-time">\${new Date().toLocaleTimeString()}</span>
                <span>Ready for updates from the server.</span>
              </div>
            </div>

            <div class="section-heading">Add Manuscript</div>
            <div class="section-subtext">Appending new text will automatically assign the next chapter numbers and mark them as pending.</div>
            <div class="form-group">
              <label for="additional-voice-token">Voice Changeover Token</label>
              <input type="text" id="additional-voice-token" value="\${project.voiceSwitchToken || '***'}" maxlength="16">
              <span class="help-text">Matches the marker in your manuscript for switching voices (dual voice projects).</span>
            </div>
            <div class="form-group">
              <label for="additional-manuscript">Additional Manuscript</label>
              <textarea id="additional-manuscript" placeholder="Paste new manuscript text here"></textarea>
            </div>
            <div class="controls">
              <button class="btn-secondary" onclick="appendManuscript('\${project.id}')">Add Manuscript</button>
            </div>

            <div class="section-heading">Chapters</div>
            <div class="chapter-list">
              \${project.chapters.map((chapter, index) => \`
                <div class="chapter-item">
                  <div class="chapter-header">
                    <span class="chapter-title"><span class="chapter-number">#\${chapter.number || (index + 1)}</span>\${chapter.title || 'Untitled Chapter'}</span>
                    <span class="status-badge status-\${chapter.status || 'pending'}">\${formatStatus(chapter.status || 'pending')}</span>
                    \${chapter.demo ? '<span class="status-badge status-demo">DEMO SNIPPET</span>' : ''}
                  </div>

                  \${(() => {
                    const label = escapeHtml(getVoiceLabel(project, chapter.startingVoiceIndex ?? 0));
                    const cue = chapter.startingVoiceLine ? ' <span class="voice-cue">(' + escapeHtml(chapter.startingVoiceLine) + ')</span>' : '';
                    return '<p class="chapter-meta"><strong>Starting Voice:</strong> ' + label + cue + '</p>';
                  })()}

                  \${chapter.error ? \`<p style="color: #dc3545; font-weight: 600;">\${chapter.error}</p>\` : ''}

                  \${chapter.file ? \`
                    <audio controls src="\${chapter.url}"></audio>
                  \` : ''}

                  \${chapter.segments && chapter.segments.length > 0 ? \`
                    <table class="segment-table">
                      <thead>
                        <tr>
                          <th>Segment</th>
                          <th>Voice</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        \${chapter.segments.map((seg, i) => \`
                          <tr>
                            <td>#\${i + 1}</td>
                            <td><span class="voice-indicator voice-\${(seg.voiceIndex ?? seg.voice ?? 0)}"></span>\${escapeHtml(getVoiceLabel(project, seg.voiceIndex ?? seg.voice ?? 0))}</td>
                            <td>\${formatStatus(seg.status || 'pending')}</td>
                          </tr>
                        \`).join('')}
                      </tbody>
                    </table>
                  \` : ''}
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
        
        modal.classList.remove('hidden');
        
        // Connect to SSE for real-time updates
        connectToEvents(projectId);
        
      } catch (error) {
        alert('Error loading project: ' + error.message);
      }
    }
    
    // Close modal
    function closeModal() {
      document.getElementById('project-modal').classList.add('hidden');
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      currentProject = null;
    }
    
    // Connect to SSE events
    function connectToEvents(projectId) {
      if (eventSource) {
        eventSource.close();
      }
      
      eventSource = new EventSource(\`/api/events/\${projectId}\`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleEvent(data);
      };
      
      eventSource.onerror = () => {
        console.error('SSE connection error');
      };
    }
    
    // Handle real-time events
    function handleEvent(event) {
      const log = document.getElementById('activity-log');
      if (!log) return;
      
      const time = new Date().toLocaleTimeString();
      let message = '';
      
      switch (event.type) {
        case 'connected':
          message = 'Connected to server';
          break;
        case 'chapter_start':
          message = \`Started processing: \${event.title}\`;
          break;
        case 'segment_start':
          message = \`Processing segment \${event.segmentIndex + 1}\`;
          break;
        case 'segment_complete':
          message = \`Completed segment \${event.segmentIndex + 1}\`;
          break;
        case 'chapter_complete': {
          const chapterInfo = currentProject && currentProject.chapters
            ? currentProject.chapters[event.chapterIndex]
            : null;
          message = chapterInfo
            ? \`Completed chapter: \${chapterInfo.title}\`
            : 'Completed a chapter';
          if (currentProject) {
            openProject(currentProject.id);
          }
          loadProjects();
          break;
        }
        case 'chapter_skipped':
          message = \`Skipped chapter \${(event.chapterIndex || 0) + 1} (limit reached)\`;
          break;
        case 'chapter_skipped_demo':
          message = \`Skipped chapter \${(event.chapterIndex || 0) + 1} (demo mode)\`;
          break;
        case 'project_processing':
          message = 'Processing started';
          loadProjects();
          break;
        case 'project_paused':
          message = 'Processing paused';
          loadProjects();
          break;
        case 'book_merging':
          message = 'Merging chapters into full audiobook...';
          break;
        case 'project_ready_for_merge':
          message = 'All chapters completed. Ready to finalize.';
          loadProjects();
          if (currentProject) {
            openProject(currentProject.id);
          }
          break;
        case 'project_complete':
          message = 'Audiobook generation complete!';
          // Reload project
          if (currentProject) {
            openProject(currentProject.id);
          }
          loadProjects();
          break;
        case 'project_updated':
          message = 'Project data updated';
          loadProjects();
          if (currentProject) {
            openProject(currentProject.id);
          }
          break;
        case 'project_error':
          message = \`Error: \${event.error}\`;
          loadProjects();
          break;
        default:
          message = JSON.stringify(event);
      }
      
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = \`
        <span class="log-time">\${time}</span>
        <span>\${message}</span>
      \`;
      
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    }

    // Project controls
    function getBatchLimit() {
      const input = document.getElementById('batch-size');
      if (!input) {
        return null;
      }
      const value = parseInt(input.value, 10);
      if (Number.isNaN(value) || value <= 0) {
        return null;
      }
      return value;
    }

    async function startProject(projectId, limitOverride = null) {
      try {
        const limitValue = typeof limitOverride === 'number' ? limitOverride : getBatchLimit();
        const response = await fetch(\`/api/projects/\${projectId}/start\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: limitValue })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Unable to start processing');
        }

        const message = limitValue
          ? \`Generation started for \${limitValue} chapter\${limitValue === 1 ? '' : 's'}.\`
          : 'Generation started for all pending chapters.';
        alert(message);
        loadProjects();
        openProject(projectId);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
    
    async function pauseProject(projectId) {
      try {
        await fetch(\`/api/projects/\${projectId}/pause\`, { method: 'POST' });
        alert('Generation paused');
        loadProjects();
        openProject(projectId);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
    
    async function resumeProject(projectId, limitOverride = null) {
      try {
        const limitValue = typeof limitOverride === 'number' ? limitOverride : getBatchLimit();
        const response = await fetch(\`/api/projects/\${projectId}/resume\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: limitValue })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Unable to resume processing');
        }

        const message = limitValue
          ? \`Resumed with batch size \${limitValue}.\`
          : 'Resumed processing of all pending chapters.';
        alert(message);
        loadProjects();
        openProject(projectId);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }

    async function finalizeProject(projectId) {
      try {
        const response = await fetch(\`/api/projects/\${projectId}/finalize\`, { method: 'POST' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Unable to finalize project');
        }

        alert('Audiobook merged successfully.');
        loadProjects();
        openProject(projectId);
      } catch (error) {
        alert('Error finalizing project: ' + error.message);
      }
    }

    async function appendManuscript(projectId) {
      const manuscriptField = document.getElementById('additional-manuscript');
      const tokenField = document.getElementById('additional-voice-token');

      if (!manuscriptField || !manuscriptField.value.trim()) {
        alert('Please paste manuscript text before adding new chapters.');
        return;
      }

      const payload = {
        manuscript: manuscriptField.value,
        voiceSwitchToken: tokenField && tokenField.value ? tokenField.value : undefined
      };

      try {
        const response = await fetch(\`/api/projects/\${projectId}/chapters\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Unable to append manuscript');
        }

        alert(\`Added \${result.added} new chapter\${result.added === 1 ? '' : 's'}.\`);
        manuscriptField.value = '';
        loadProjects();
        openProject(projectId);
      } catch (error) {
        alert('Error adding manuscript: ' + error.message);
      }
    }

    async function saveVoiceNames(projectId) {
      const inputs = Array.from(document.querySelectorAll('input[data-voice-name-index]'));
      if (!inputs.length) {
        alert('No voice fields available to update.');
        return;
      }

      const voiceNames = [];
      inputs.forEach(input => {
        const idx = parseInt(input.dataset.voiceNameIndex, 10);
        if (Number.isFinite(idx)) {
          voiceNames[idx] = input.value.trim();
        }
      });

      try {
        const response = await fetch(\`/api/projects/\${projectId}/voices\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceNames })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Unable to update voice names');
        }

        alert('Voice names updated.');
        loadProjects();
        openProject(projectId);
      } catch (error) {
        alert('Error updating voice names: ' + error.message);
      }
    }
    
    // Initial load
    updateVoiceSelectors();
    loadProjects();
  </script>
</body>
</html>`;
}

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           🎙️  Audiobook Generator Started  🎙️            ║
║                                                           ║
║   Server running at: http://localhost:${PORT}              ║
║                                                           ║
║   Open your browser and navigate to the URL above        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  // Try to open browser automatically
  const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  require('child_process').exec(`${open} http://localhost:${PORT}`);
});
