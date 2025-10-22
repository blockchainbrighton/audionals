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
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
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

// Parse manuscript into chapters
function parseManuscript(text, mode) {
  const chapters = [];
  
  if (mode === 'single') {
    // Split by chapter markers (# Chapter, ## Chapter, etc.)
    const chapterRegex = /^#{1,3}\s+(?:Chapter\s+\d+|[A-Z][^#\n]*?)$/gim;
    const matches = [...text.matchAll(chapterRegex)];
    
    if (matches.length === 0) {
      // No chapters found, treat entire text as one chapter
      chapters.push({
        title: 'Full Text',
        content: text.trim(),
        voice: null
      });
    } else {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
        const chapterText = text.substring(start, end).trim();
        const title = matches[i][0].replace(/^#+\s*/, '').trim();
        
        chapters.push({
          title: title || `Chapter ${i + 1}`,
          content: chapterText,
          voice: null
        });
      }
    }
  } else if (mode === 'dual') {
    // Dual voice mode: chapters start with voice name, *** switches voices
    const chapterRegex = /^#{1,3}\s+(?:Chapter\s+\d+|[A-Z][^#\n]*?)$/gim;
    const matches = [...text.matchAll(chapterRegex)];
    
    if (matches.length === 0) {
      chapters.push({
        title: 'Full Text',
        content: text.trim(),
        voice: null,
        segments: parseDualVoiceSegments(text.trim())
      });
    } else {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
        const chapterText = text.substring(start, end).trim();
        const title = matches[i][0].replace(/^#+\s*/, '').trim();
        
        chapters.push({
          title: title || `Chapter ${i + 1}`,
          content: chapterText,
          voice: null,
          segments: parseDualVoiceSegments(chapterText)
        });
      }
    }
  }
  
  return chapters;
}

// Parse dual voice segments
function parseDualVoiceSegments(text) {
  const segments = [];
  const parts = text.split('***');
  
  for (let i = 0; i < parts.length; i++) {
    const content = parts[i].trim();
    if (content) {
      segments.push({
        content,
        voiceIndex: i % 2 // Alternate between voice 1 and voice 2
      });
    }
  }
  
  return segments;
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
async function generateAudio(text, voiceId, apiKey, settings = {}) {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json'
  };
  
  const body = {
    text: text,
    model_id: 'eleven_multilingual_v2',
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
      const chunks = splitIntoChunks(chapter.content);
      
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
            project.settings
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
      const segments = chapter.segments;
      let segmentIndex = 0;
      
      for (const segment of segments) {
        const chunks = splitIntoChunks(segment.content);
        
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
              project.settings
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
async function processProject(projectId) {
  const project = projects[projectId];
  if (!project) return;
  
  project.status = 'processing';
  saveProjects();
  
  try {
    // Process each chapter
    for (let i = 0; i < project.chapters.length; i++) {
      if (project.status === 'paused') {
        return;
      }
      
      await processChapter(project, i);
    }
    
    // Merge all chapters into full audiobook
    sendUpdate(projectId, {
      type: 'book_merging'
    });
    
    const chapterFiles = project.chapters
      .filter(ch => ch.file && fs.existsSync(ch.file))
      .map(ch => ch.file);
    
    if (chapterFiles.length > 0) {
      const bookFile = path.join(BOOK_DIR, `${projectId}_audiobook.mp3`);
      await mergeAudioFiles(chapterFiles, bookFile);
      
      project.bookFile = bookFile;
      project.bookUrl = `/audio/book/${path.basename(bookFile)}`;
    }
    
    project.status = 'completed';
    project.completedAt = new Date().toISOString();
    
    sendUpdate(projectId, {
      type: 'project_complete',
      bookUrl: project.bookUrl
    });
    
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
        
        // Validate API key by fetching voices
        const voices = await getVoices(data.apiKey);
        
        const projectId = generateId();
        const chapters = parseManuscript(data.manuscript, data.mode);
        
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
          chapters: chapters.map(ch => ({
            ...ch,
            status: 'pending',
            segments: ch.segments || []
          })),
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        
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
      project.status = 'processing';
      saveProjects();
      
      // Start processing in background
      processProject(projectId).catch(console.error);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'started' }));
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
      project.status = 'processing';
      saveProjects();
      
      // Resume processing
      processProject(projectId).catch(console.error);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'resumed' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
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
    
    input[type="text"],
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
    
    .chapter-list {
      margin-top: 20px;
    }
    
    .chapter-item {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 10px;
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
        <button class="tab active" onclick="switchTab('dashboard')">Dashboard</button>
        <button class="tab" onclick="switchTab('new-book')">New Book</button>
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
            <label for="api-key">ElevenLabs API Key *</label>
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
              <label for="mode">Narration Mode *</label>
              <select id="mode" required onchange="updateVoiceSelectors()">
                <option value="single">Single Voice</option>
                <option value="dual">Dual Voice</option>
              </select>
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
                <label for="voice-1">Voice 1 *</label>
                <select id="voice-1" required>
                  <option value="">Load voices first</option>
                </select>
              </div>
              
              <div class="form-group hidden" id="voice-2-group">
                <label for="voice-2">Voice 2 *</label>
                <select id="voice-2">
                  <option value="">Load voices first</option>
                </select>
              </div>
            </div>
            
            <h3 style="margin-top: 20px;">Audio Settings</h3>
            
            <div class="slider-group">
              <label>
                <span>Stability</span>
                <span id="stability-value">0.5</span>
              </label>
              <input type="range" id="stability" min="0" max="1" step="0.1" value="0.5" oninput="updateSliderValue('stability')">
            </div>
            
            <div class="slider-group">
              <label>
                <span>Similarity Boost</span>
                <span id="similarity-value">0.75</span>
              </label>
              <input type="range" id="similarity" min="0" max="1" step="0.05" value="0.75" oninput="updateSliderValue('similarity')">
            </div>
            
            <div class="slider-group">
              <label>
                <span>Style</span>
                <span id="style-value">0</span>
              </label>
              <input type="range" id="style" min="0" max="1" step="0.1" value="0" oninput="updateSliderValue('style')">
            </div>
            
            <div class="slider-group">
              <label>
                <span>Speed</span>
                <span id="speed-value">1.0</span>
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
    
    // Tab switching
    function switchTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      
      event.target.classList.add('active');
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
      
      if (mode === 'dual') {
        voice2Group.classList.remove('hidden');
        document.getElementById('voice-2').required = true;
      } else {
        voice2Group.classList.add('hidden');
        document.getElementById('voice-2').required = false;
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
          const completedChapters = project.chapters.filter(ch => ch.status === 'completed').length;
          const totalChapters = project.chapters.length;
          const progress = totalChapters > 0 ? (completedChapters / totalChapters * 100) : 0;
          
          return \`
            <div class="project-card" onclick="openProject('\${project.id}')">
              <h3>\${project.title}</h3>
              <p><strong>Author:</strong> \${project.author || 'Unknown'}</p>
              <p><strong>Chapters:</strong> \${completedChapters} / \${totalChapters}</p>
              <p><strong>Mode:</strong> \${project.mode === 'single' ? 'Single Voice' : 'Dual Voice'}</p>
              <div class="progress-bar">
                <div class="progress-fill" style="width: \${progress}%"></div>
              </div>
              <span class="status-badge status-\${project.status}">\${project.status.toUpperCase()}</span>
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
      
      if (mode === 'dual') {
        voices.push(document.getElementById('voice-2').value);
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
        settings: {
          stability: parseFloat(document.getElementById('stability').value),
          similarity_boost: parseFloat(document.getElementById('similarity').value),
          style: parseFloat(document.getElementById('style').value),
          speed: parseFloat(document.getElementById('speed').value)
        }
      };
      
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
        
        document.getElementById('modal-title').textContent = project.title;
        
        content.innerHTML = \`
          <div>
            <p><strong>Author:</strong> \${project.author || 'Unknown'}</p>
            <p><strong>Status:</strong> <span class="status-badge status-\${project.status}">\${project.status.toUpperCase()}</span></p>
            <p><strong>Mode:</strong> \${project.mode === 'single' ? 'Single Voice' : 'Dual Voice'}</p>
            <p><strong>Chapters:</strong> \${project.chapters.length}</p>
            
            <div class="controls">
              <button onclick="startProject('\${project.id}')" \${project.status === 'processing' ? 'disabled' : ''}>Start Generation</button>
              <button onclick="pauseProject('\${project.id}')" class="btn-secondary" \${project.status !== 'processing' ? 'disabled' : ''}>Pause</button>
              <button onclick="resumeProject('\${project.id}')" class="btn-success" \${project.status !== 'paused' ? 'disabled' : ''}>Resume</button>
              \${project.bookUrl ? \`<a href="\${project.bookUrl}" download><button class="btn-success">Download Full Audiobook</button></a>\` : ''}
            </div>
            
            <div class="activity-log" id="activity-log">
              <div class="log-entry">
                <span class="log-time">\${new Date().toLocaleTimeString()}</span>
                <span>Ready to start generation</span>
              </div>
            </div>
            
            <div class="chapter-list">
              <h3>Chapters</h3>
              \${project.chapters.map((chapter, index) => \`
                <div class="chapter-item">
                  <div class="chapter-header">
                    <span class="chapter-title">\${chapter.title}</span>
                    <span class="status-badge status-\${chapter.status || 'pending'}">\${(chapter.status || 'pending').toUpperCase()}</span>
                  </div>
                  
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
                            <td><span class="voice-indicator voice-\${seg.voiceIndex || seg.voice || 0}"></span>Voice \${(seg.voiceIndex || seg.voice || 0) + 1}</td>
                            <td>\${seg.status || 'pending'}</td>
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
        case 'chapter_complete':
          message = \`Completed chapter: \${currentProject.chapters[event.chapterIndex].title}\`;
          // Reload project to show audio player
          if (currentProject) {
            openProject(currentProject.id);
          }
          break;
        case 'book_merging':
          message = 'Merging chapters into full audiobook...';
          break;
        case 'project_complete':
          message = 'Audiobook generation complete!';
          // Reload project
          if (currentProject) {
            openProject(currentProject.id);
          }
          break;
        case 'project_error':
          message = \`Error: \${event.error}\`;
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
    async function startProject(projectId) {
      try {
        await fetch(\`/api/projects/\${projectId}/start\`, { method: 'POST' });
        alert('Generation started!');
        openProject(projectId);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
    
    async function pauseProject(projectId) {
      try {
        await fetch(\`/api/projects/\${projectId}/pause\`, { method: 'POST' });
        alert('Generation paused');
        openProject(projectId);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
    
    async function resumeProject(projectId) {
      try {
        await fetch(\`/api/projects/\${projectId}/resume\`, { method: 'POST' });
        alert('Generation resumed');
        openProject(projectId);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
    
    // Initial load
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

