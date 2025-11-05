// audiobook_app.js
// A single-file Node.js application for generating audiobooks using ElevenLabs API
// Run with: node audiobook_app.js

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = path.resolve('output');
const CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks');
const CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const BOOK_DIR = path.join(OUTPUT_DIR, 'book');
const PROJECTS_FILE = path.join(OUTPUT_DIR, 'projects.json');

// Ensure directories exist
async function ensureDirs() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(CHUNKS_DIR, { recursive: true });
  await fs.mkdir(CHAPTERS_DIR, { recursive: true });
  await fs.mkdir(BOOK_DIR, { recursive: true });
}

// --- Project State Management ---
let projects = {};
let activeGenerations = new Map(); // projectId => AbortController

async function loadProjects() {
  try {
    const data = await fs.readFile(PROJECTS_FILE, 'utf8');
    projects = JSON.parse(data);
  } catch (e) {
    projects = {};
  }
}

async function saveProjects() {
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

// --- ElevenLabs API ---
function getElevenLabsApiKey() {
  // Try environment variable first
  if (process.env.ELEVENLABS_API_KEY) {
    return process.env.ELEVENLABS_API_KEY;
  }
  // Try local .env file
  try {
    const envPath = path.resolve('.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/ELEVENLABS_API_KEY\s*=\s*["']?([^"'\n]+)/);
    if (match) return match[1];
  } catch (e) {
    // Ignore
  }
  return null;
}

async function getAvailableVoices(apiKey) {
  if (!apiKey) throw new Error('ElevenLabs API key not configured');
  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    });
    return response.data.voices.map(v => ({ id: v.voice_id, name: v.name, category: v.category }));
  } catch (error) {
    console.error('Error fetching voices:', error.response?.data || error.message);
    throw new Error('Failed to fetch voices from ElevenLabs');
  }
}

async function generateAudioSegment(text, voiceId, apiKey, options = {}) {
  if (!apiKey) throw new Error('ElevenLabs API key not configured');
  
  const formData = new FormData();
  formData.append('text', text);
  formData.append('model_id', 'eleven_multilingual_v2');
  formData.append('voice_settings', JSON.stringify({
    stability: options.stability ?? 0.75,
    similarity_boost: options.similarity_boost ?? 0.75,
    style: options.style ?? 0.0,
    use_speaker_boost: options.use_speaker_boost ?? true
  }));

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      formData,
      {
        headers: {
          'xi-api-key': apiKey,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error generating audio:', error.response?.data || error.message);
    throw new Error(`Audio generation failed: ${error.response?.data?.detail?.message || error.message}`);
  }
}

// --- Audio Processing ---
async function mergeAudioFiles(inputFiles, outputFile) {
  const inputArgs = inputFiles.map(file => `-i "${file}"`).join(' ');
  const filterComplex = inputFiles.map((_, i) => `[${i}:a]`).join('') + `concat=n=${inputFiles.length}:v=0:a=1[out]`;
  
  const command = `ffmpeg ${inputArgs} -filter_complex "${filterComplex}" -map "[out]" -c:a libmp3lame -q:a 2 "${outputFile}" -y`;
  
  try {
    await execAsync(command);
  } catch (error) {
    console.error('FFmpeg merge error:', error);
    throw new Error('Failed to merge audio files');
  }
}

async function normalizeAudio(inputFile, outputFile) {
  // Simple normalization using ffmpeg loudnorm
  const command = `ffmpeg -i "${inputFile}" -af loudnorm=I=-16:LRA=11:TP=-1.5 "${outputFile}" -y`;
  try {
    await execAsync(command);
  } catch (error) {
    console.error('Normalization error:', error);
    // If normalization fails, just copy the file
    await fs.copyFile(inputFile, outputFile);
  }
}

// --- Text Processing ---
function detectChapters(text) {
  // Split by common chapter markers
  const chapterMarkers = [
    /^#\s+(chapter|section|part)\s+\d+/im,
    /^chapter\s+\d+/im,
    /^part\s+\d+/im,
    /^#\s+.+/im
  ];
  
  // First try markdown headers
  const lines = text.split('\n');
  let chapters = [];
  let currentChapter = { title: 'Introduction', content: '' };
  let inChapter = false;
  
  for (let line of lines) {
    let isChapterHeader = false;
    for (let marker of chapterMarkers) {
      if (marker.test(line)) {
        isChapterHeader = true;
        break;
      }
    }
    
    if (isChapterHeader) {
      if (currentChapter.content.trim()) {
        chapters.push(currentChapter);
      }
      currentChapter = { 
        title: line.replace(/^#+\s+/, '').trim() || `Chapter ${chapters.length + 1}`,
        content: ''
      };
      inChapter = true;
    } else {
      if (inChapter || currentChapter.content) {
        currentChapter.content += line + '\n';
      }
    }
  }
  
  if (currentChapter.content.trim()) {
    chapters.push(currentChapter);
  }
  
  // If no chapters detected, treat entire text as one chapter
  if (chapters.length === 0) {
    chapters = [{ title: 'Full Book', content: text }];
  }
  
  return chapters;
}

function splitIntoSegments(text, maxChars = 2500) {
  // Split by paragraphs first
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  const segments = [];
  let currentSegment = '';
  
  for (const para of paragraphs) {
    if (currentSegment.length + para.length > maxChars && currentSegment.length > 0) {
      segments.push(currentSegment.trim());
      currentSegment = para;
    } else {
      currentSegment += (currentSegment ? '\n\n' : '') + para;
    }
  }
  
  if (currentSegment.trim()) {
    segments.push(currentSegment.trim());
  }
  
  // If any segment is still too long, split by sentences
  const finalSegments = [];
  for (const seg of segments) {
    if (seg.length <= maxChars) {
      finalSegments.push(seg);
    } else {
      // Simple sentence splitting
      const sentences = seg.match(/[^.!?]+[.!?]+/g) || [seg];
      let current = '';
      for (const sent of sentences) {
        if (current.length + sent.length > maxChars && current.length > 0) {
          finalSegments.push(current.trim());
          current = sent;
        } else {
          current += (current ? ' ' : '') + sent;
        }
      }
      if (current.trim()) finalSegments.push(current.trim());
    }
  }
  
  return finalSegments.filter(s => s.trim());
}

// --- Express App ---
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/output', express.static(OUTPUT_DIR));

// API Routes
app.get('/api/voices', async (req, res) => {
  try {
    const apiKey = getElevenLabsApiKey();
    if (!apiKey) {
      return res.status(400).json({ error: 'ElevenLabs API key not configured. Set ELEVENLABS_API_KEY environment variable or create a .env file.' });
    }
    const voices = await getAvailableVoices(apiKey);
    res.json({ voices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects', (req, res) => {
  res.json({ projects });
});

app.post('/api/projects', async (req, res) => {
  try {
    const { title, author, language, description, narrationMode, voice1, voice2, manuscript, speed, stability, similarity_boost } = req.body;
    
    if (!title || !manuscript) {
      return res.status(400).json({ error: 'Title and manuscript are required' });
    }
    
    const projectId = crypto.randomBytes(16).toString('hex');
    const project = {
      id: projectId,
      title,
      author: author || 'Unknown',
      language: language || 'en',
      description: description || '',
      narrationMode,
      voice1,
      voice2,
      speed: speed || 1.0,
      stability: stability || 0.75,
      similarity_boost: similarity_boost || 0.75,
      status: 'created',
      createdAt: new Date().toISOString(),
      chapters: [],
      progress: 0,
      log: []
    };
    
    // Process manuscript
    let cleanText = manuscript;
    if (manuscript.trim().startsWith('#')) {
      // Assume markdown
      cleanText = sanitizeHtml(marked(manuscript), {
        allowedTags: [],
        allowedAttributes: {}
      });
    }
    
    const chapters = detectChapters(cleanText);
    project.chapters = chapters.map((ch, idx) => ({
      id: idx,
      title: ch.title,
      status: 'pending',
      progress: 0,
      segments: []
    }));
    
    projects[projectId] = project;
    await saveProjects();
    
    res.json({ projectId });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects[req.params.id];
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({ project });
});

app.post('/api/projects/:id/start', async (req, res) => {
  const projectId = req.params.id;
  const project = projects[projectId];
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  if (activeGenerations.has(projectId)) {
    return res.status(400).json({ error: 'Generation already in progress' });
  }
  
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    return res.status(400).json({ error: 'ElevenLabs API key not configured' });
  }
  
  // Update project status
  project.status = 'processing';
  project.log = [{ time: new Date().toISOString(), message: 'Starting generation...' }];
  await saveProjects();
  
  // Create abort controller for this generation
  const abortController = new AbortController();
  activeGenerations.set(projectId, abortController);
  
  // Start generation in background
  setImmediate(() => generateAudiobook(projectId, apiKey, abortController.signal));
  
  res.json({ success: true });
});

app.post('/api/projects/:id/pause', (req, res) => {
  const projectId = req.params.id;
  if (activeGenerations.has(projectId)) {
    const controller = activeGenerations.get(projectId);
    controller.abort();
    activeGenerations.delete(projectId);
    projects[projectId].status = 'paused';
    saveProjects();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No active generation to pause' });
  }
});

app.post('/api/projects/:id/resume', async (req, res) => {
  const projectId = req.params.id;
  const project = projects[projectId];
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    return res.status(400).json({ error: 'ElevenLabs API key not configured' });
  }
  
  project.status = 'processing';
  project.log.push({ time: new Date().toISOString(), message: 'Resuming generation...' });
  await saveProjects();
  
  const abortController = new AbortController();
  activeGenerations.set(projectId, abortController);
  
  setImmediate(() => generateAudiobook(projectId, apiKey, abortController.signal));
  
  res.json({ success: true });
});

// --- Generation Logic ---
async function generateAudiobook(projectId, apiKey, signal) {
  const project = projects[projectId];
  if (!project) return;
  
  try {
    // Process each chapter
    for (let chapterIdx = 0; chapterIdx < project.chapters.length; chapterIdx++) {
      if (signal.aborted) {
        project.status = 'paused';
        await saveProjects();
        return;
      }
      
      const chapter = project.chapters[chapterIdx];
      if (chapter.status === 'completed') continue;
      
      chapter.status = 'processing';
      project.log.push({ time: new Date().toISOString(), message: `Processing chapter: ${chapter.title}` });
      await saveProjects();
      
      // Get chapter text
      const cleanText = project.chapters[chapterIdx].content || 
        (detectChapters(project.manuscript)[chapterIdx] || {}).content || '';
      
      // Handle dual voice mode
      let segments;
      if (project.narrationMode === 'dual' && cleanText.includes('***')) {
        // Split by voice markers
        const parts = cleanText.split('***');
        segments = [];
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          if (!part) continue;
          const voiceId = i % 2 === 0 ? project.voice1 : project.voice2;
          const partSegments = splitIntoSegments(part);
          segments.push(...partSegments.map(text => ({ text, voiceId })));
        }
      } else {
        // Single voice or no markers
        const voiceId = project.voice1;
        const chapterSegments = splitIntoSegments(cleanText);
        segments = chapterSegments.map(text => ({ text, voiceId }));
      }
      
      chapter.segments = segments.map((seg, idx) => ({
        id: idx,
        voiceId: seg.voiceId,
        status: 'pending',
        progress: 0
      }));
      
      // Generate each segment
      const chunkFiles = [];
      for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        if (signal.aborted) {
          project.status = 'paused';
          await saveProjects();
          return;
        }
        
        const segment = segments[segIdx];
        const chunkId = `${projectId}_ch${chapterIdx}_seg${segIdx}`;
        const chunkPath = path.join(CHUNKS_DIR, `${chunkId}.mp3`);
        
        // Skip if already generated
        try {
          await fs.access(chunkPath);
          chunkFiles.push(chunkPath);
          chapter.segments[segIdx].status = 'completed';
          continue;
        } catch (e) {
          // File doesn't exist, need to generate
        }
        
        chapter.segments[segIdx].status = 'processing';
        project.log.push({ 
          time: new Date().toISOString(), 
          message: `Generating segment ${segIdx + 1}/${segments.length} of chapter ${chapterIdx + 1}` 
        });
        await saveProjects();
        
        try {
          const audioBuffer = await generateAudioSegment(
            segment.text,
            segment.voiceId,
            apiKey,
            {
              stability: project.stability,
              similarity_boost: project.similarity_boost
            }
          );
          
          await fs.writeFile(chunkPath, audioBuffer);
          chunkFiles.push(chunkPath);
          chapter.segments[segIdx].status = 'completed';
        } catch (error) {
          project.log.push({ 
            time: new Date().toISOString(), 
            message: `Error generating segment: ${error.message}` 
          });
          chapter.segments[segIdx].status = 'error';
          await saveProjects();
          // Continue with next segment
        }
      }
      
      // Merge chapter segments
      if (chunkFiles.length > 0) {
        const chapterPath = path.join(CHAPTERS_DIR, `${projectId}_ch${chapterIdx}.mp3`);
        const normalizedPath = path.join(CHAPTERS_DIR, `${projectId}_ch${chapterIdx}_norm.mp3`);
        
        await mergeAudioFiles(chunkFiles, chapterPath);
        await normalizeAudio(chapterPath, normalizedPath);
        
        chapter.status = 'completed';
        chapter.audioPath = `/output/chapters/${path.basename(normalizedPath)}`;
        project.log.push({ 
          time: new Date().toISOString(), 
          message: `Chapter ${chapterIdx + 1} completed` 
        });
      } else {
        chapter.status = 'error';
        project.log.push({ 
          time: new Date().toISOString(), 
          message: `Chapter ${chapterIdx + 1} has no valid segments` 
        });
      }
      
      // Update progress
      const completedChapters = project.chapters.filter(ch => ch.status === 'completed').length;
      project.progress = Math.round((completedChapters / project.chapters.length) * 100);
      await saveProjects();
    }
    
    // Generate full audiobook
    const completedChapterFiles = project.chapters
      .filter(ch => ch.status === 'completed')
      .map(ch => path.join(CHAPTERS_DIR, `${projectId}_ch${ch.id}_norm.mp3`));
    
    if (completedChapterFiles.length > 0) {
      const bookPath = path.join(BOOK_DIR, `${projectId}.mp3`);
      const normalizedBookPath = path.join(BOOK_DIR, `${projectId}_norm.mp3`);
      
      await mergeAudioFiles(completedChapterFiles, bookPath);
      await normalizeAudio(bookPath, normalizedBookPath);
      
      project.fullBookPath = `/output/book/${path.basename(normalizedBookPath)}`;
    }
    
    project.status = 'completed';
    project.log.push({ 
      time: new Date().toISOString(), 
      message: 'Audiobook generation completed!' 
    });
    await saveProjects();
    
  } catch (error) {
    project.status = 'error';
    project.log.push({ 
      time: new Date().toISOString(), 
      message: `Fatal error: ${error.message}` 
    });
    await saveProjects();
  } finally {
    activeGenerations.delete(projectId);
  }
}

// --- Frontend HTML ---
const frontendHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audiobook Generator</title>
  <style>
    :root {
      --primary: #4361ee;
      --secondary: #3f37c9;
      --success: #4cc9f0;
      --light: #f8f9fa;
      --dark: #212529;
      --gray: #6c757d;
      --border: #dee2e6;
      --card-bg: #ffffff;
      --wave-color1: #4361ee;
      --wave-color2: #f72585;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f7fb;
      color: var(--dark);
      line-height: 1.6;
    }
    
    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 1rem 0;
      margin-bottom: 2rem;
    }
    
    header .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    h1 {
      color: var(--primary);
      font-size: 1.8rem;
    }
    
    .btn {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }
    
    .btn:hover {
      background: var(--secondary);
    }
    
    .btn-outline {
      background: transparent;
      border: 1px solid var(--primary);
      color: var(--primary);
    }
    
    .btn-outline:hover {
      background: rgba(67, 97, 238, 0.1);
    }
    
    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
    }
    
    .card {
      background: var(--card-bg);
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    
    input, select, textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 1rem;
    }
    
    textarea {
      min-height: 200px;
      resize: vertical;
    }
    
    .form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .form-row > * {
      flex: 1;
    }
    
    .project-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    
    .project-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .project-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.1);
    }
    
    .project-title {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
      color: var(--primary);
    }
    
    .project-author {
      color: var(--gray);
      margin-bottom: 1rem;
    }
    
    .progress-bar {
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
      margin: 1rem 0;
    }
    
    .progress-fill {
      height: 100%;
      background: var(--primary);
      border-radius: 4px;
    }
    
    .status {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    
    .status-processing { background: #e3f2fd; color: #1976d2; }
    .status-completed { background: #e8f5e9; color: #2e7d32; }
    .status-paused { background: #fff8e1; color: #f57f17; }
    .status-error { background: #ffebee; color: #c62828; }
    
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      margin-bottom: 1.5rem;
    }
    
    .tab {
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      border-bottom: 3px solid transparent;
    }
    
    .tab.active {
      border-bottom-color: var(--primary);
      color: var(--primary);
      font-weight: 600;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .chapter-list {
      margin-bottom: 2rem;
    }
    
    .chapter-item {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    
    .chapter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .chapter-title {
      font-size: 1.125rem;
      font-weight: 600;
    }
    
    .audio-player {
      width: 100%;
      margin: 1rem 0;
    }
    
    .waveform {
      height: 60px;
      background: #f8f9fa;
      border-radius: 4px;
      margin: 1rem 0;
      position: relative;
      overflow: hidden;
    }
    
    .wave-segment {
      position: absolute;
      top: 0;
      height: 100%;
      opacity: 0.7;
    }
    
    .log-panel {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 1rem;
      border-radius: 8px;
      font-family: monospace;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .log-entry {
      margin-bottom: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #34495e;
    }
    
    .log-time {
      color: #3498db;
      margin-right: 0.5rem;
    }
    
    .hidden {
      display: none !important;
    }
    
    .flex {
      display: flex;
      gap: 1rem;
    }
    
    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
        gap: 1rem;
      }
      
      .project-list {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>📚 Audiobook Generator</h1>
      <button id="newBookBtn" class="btn">+ New Book</button>
    </div>
  </header>
  
  <div class="container">
    <div id="dashboardView">
      <h2>My Projects</h2>
      <div class="project-list" id="projectList">
        <!-- Projects will be populated here -->
      </div>
    </div>
    
    <div id="newBookView" class="hidden">
      <div class="card">
        <h2>New Audiobook</h2>
        <form id="newBookForm">
          <div class="form-group">
            <label for="title">Book Title *</label>
            <input type="text" id="title" required>
          </div>
          
          <div class="form-group">
            <label for="author">Author</label>
            <input type="text" id="author">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="language">Language</label>
              <select id="language">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="narrationMode">Narration Mode</label>
              <select id="narrationMode">
                <option value="single">Single Voice</option>
                <option value="dual">Dual Voice</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description"></textarea>
          </div>
          
          <div class="form-group">
            <label for="manuscript">Manuscript (Plain text or Markdown) *</label>
            <textarea id="manuscript" placeholder="Paste your book text here..." required></textarea>
          </div>
          
          <div id="voiceSelection">
            <div class="form-row">
              <div class="form-group">
                <label for="voice1">Voice 1 *</label>
                <select id="voice1" required>
                  <option value="">Loading voices...</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="voice2">Voice 2 (for dual mode)</label>
                <select id="voice2">
                  <option value="">Select voice</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="stability">Stability (0-1)</label>
              <input type="number" id="stability" min="0" max="1" step="0.01" value="0.75">
            </div>
            
            <div class="form-group">
              <label for="similarity_boost">Similarity Boost (0-1)</label>
              <input type="number" id="similarity_boost" min="0" max="1" step="0.01" value="0.75">
            </div>
          </div>
          
          <div class="flex">
            <button type="submit" class="btn">Start Generation</button>
            <button type="button" id="cancelNewBook" class="btn btn-outline">Cancel</button>
          </div>
        </form>
      </div>
    </div>
    
    <div id="processingView" class="hidden">
      <div class="tabs">
        <div class="tab active" data-tab="chapters">Chapters</div>
        <div class="tab" data-tab="log">Activity Log</div>
      </div>
      
      <div class="tab-content active" id="chaptersTab">
        <div class="chapter-list" id="chapterList">
          <!-- Chapters will be populated here -->
        </div>
      </div>
      
      <div class="tab-content" id="logTab">
        <div class="log-panel" id="logPanel">
          <!-- Log entries will be populated here -->
        </div>
      </div>
      
      <div class="flex" style="margin-top: 1rem;">
        <button id="pauseBtn" class="btn">Pause</button>
        <button id="resumeBtn" class="btn hidden">Resume</button>
        <button id="backToDashboard" class="btn btn-outline">Back to Dashboard</button>
        <a id="downloadFullBook" class="btn hidden" download>Download Full Audiobook</a>
      </div>
    </div>
  </div>

  <script>
    // Global state
    let currentProjectId = null;
    let voices = [];
    
    // DOM Elements
    const dashboardView = document.getElementById('dashboardView');
    const newBookView = document.getElementById('newBookView');
    const processingView = document.getElementById('processingView');
    const projectList = document.getElementById('projectList');
    const chapterList = document.getElementById('chapterList');
    const logPanel = document.getElementById('logPanel');
    const newBookBtn = document.getElementById('newBookBtn');
    const cancelNewBook = document.getElementById('cancelNewBook');
    const newBookForm = document.getElementById('newBookForm');
    const voice1Select = document.getElementById('voice1');
    const voice2Select = document.getElementById('voice2');
    const narrationModeSelect = document.getElementById('narrationMode');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const backToDashboard = document.getElementById('backToDashboard');
    const downloadFullBook = document.getElementById('downloadFullBook');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Initialize
    document.addEventListener('DOMContentLoaded', async () => {
      loadProjects();
      loadVoices();
      
      // Event listeners
      newBookBtn.addEventListener('click', () => {
        dashboardView.classList.add('hidden');
        newBookView.classList.remove('hidden');
      });
      
      cancelNewBook.addEventListener('click', () => {
        newBookView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
      });
      
      newBookForm.addEventListener('submit', createProject);
      
      narrationModeSelect.addEventListener('change', () => {
        voice2Select.disabled = narrationModeSelect.value === 'single';
      });
      
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tabContents.forEach(c => c.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
        });
      });
      
      pauseBtn.addEventListener('click', pauseProject);
      resumeBtn.addEventListener('click', resumeProject);
      backToDashboard.addEventListener('click', () => {
        processingView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        currentProjectId = null;
      });
      
      // Auto-refresh processing view
      setInterval(() => {
        if (currentProjectId) {
          loadProject(currentProjectId);
        }
      }, 2000);
    });
    
    // API Functions
    async function apiCall(endpoint, options = {}) {
      try {
        const response = await fetch(endpoint, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        return { error: error.message };
      }
    }
    
    async function loadProjects() {
      const data = await apiCall('/api/projects');
      if (data.error) {
        alert('Error loading projects: ' + data.error);
        return;
      }
      
      projectList.innerHTML = '';
      if (Object.keys(data.projects).length === 0) {
        projectList.innerHTML = '<p>No projects yet. Create your first audiobook!</p>';
        return;
      }
      
      Object.values(data.projects).forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.innerHTML = \`
          <div class="project-title">\${project.title}</div>
          <div class="project-author">by \${project.author}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: \${project.progress}%"></div>
          </div>
          <div class="status status-\${project.status}">\${project.status.charAt(0).toUpperCase() + project.status.slice(1)}</div>
          <button class="btn btn-sm" onclick="viewProject('\${project.id}')">View</button>
        \`;
        projectList.appendChild(projectCard);
      });
    }
    
    async function loadVoices() {
      const data = await apiCall('/api/voices');
      if (data.error) {
        voice1Select.innerHTML = \`<option value="">Error: \${data.error}</option>\`;
        return;
      }
      
      voices = data.voices;
      voice1Select.innerHTML = '';
      voice2Select.innerHTML = '<option value="">Select voice</option>';
      
      voices.forEach(voice => {
        const option1 = document.createElement('option');
        option1.value = voice.id;
        option1.textContent = voice.name;
        voice1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = voice.id;
        option2.textContent = voice.name;
        voice2Select.appendChild(option2);
      });
    }
    
    async function createProject(e) {
      e.preventDefault();
      
      const formData = new FormData(newBookForm);
      const data = {
        title: formData.get('title'),
        author: formData.get('author'),
        language: formData.get('language'),
        description: formData.get('description'),
        narrationMode: formData.get('narrationMode'),
        voice1: formData.get('voice1'),
        voice2: formData.get('voice2'),
        manuscript: formData.get('manuscript'),
        stability: parseFloat(formData.get('stability')),
        similarity_boost: parseFloat(formData.get('similarity_boost'))
      };
      
      if (data.narrationMode === 'dual' && !data.voice2) {
        alert('Please select a second voice for dual narration mode');
        return;
      }
      
      const response = await apiCall('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (response.error) {
        alert('Error creating project: ' + response.error);
        return;
      }
      
      // Start generation
      const startResponse = await apiCall(\`/api/projects/\${response.projectId}/start\`, {
        method: 'POST'
      });
      
      if (startResponse.error) {
        alert('Error starting generation: ' + startResponse.error);
        return;
      }
      
      // Switch to processing view
      newBookView.classList.add('hidden');
      processingView.classList.remove('hidden');
      currentProjectId = response.projectId;
      loadProject(currentProjectId);
    }
    
    async function loadProject(projectId) {
      const data = await apiCall(\`/api/projects/\${projectId}\`);
      if (data.error) {
        alert('Error loading project: ' + data.error);
        return;
      }
      
      const project = data.project;
      
      // Update UI based on status
      pauseBtn.classList.toggle('hidden', project.status !== 'processing');
      resumeBtn.classList.toggle('hidden', project.status !== 'paused');
      downloadFullBook.classList.toggle('hidden', !project.fullBookPath);
      if (project.fullBookPath) {
        downloadFullBook.href = project.fullBookPath;
        downloadFullBook.download = \`\${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3\`;
      }
      
      // Update log panel
      logPanel.innerHTML = '';
      project.log.forEach(entry => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = \`<span class="log-time">\${new Date(entry.time).toLocaleTimeString()}</span> \${entry.message}\`;
        logPanel.appendChild(logEntry);
      });
      logPanel.scrollTop = logPanel.scrollHeight;
      
      // Update chapter list
      chapterList.innerHTML = '';
      project.chapters.forEach(chapter => {
        const chapterItem = document.createElement('div');
        chapterItem.className = 'chapter-item';
        
        let chapterHtml = \`
          <div class="chapter-header">
            <div class="chapter-title">\${chapter.title}</div>
            <div class="status status-\${chapter.status}">\${chapter.status}</div>
          </div>
        \`;
        
        if (chapter.status === 'completed' && chapter.audioPath) {
          chapterHtml += \`
            <audio class="audio-player" controls src="\${chapter.audioPath}"></audio>
            <div class="waveform" id="waveform-\${chapter.id}"></div>
            <button class="btn btn-sm" onclick="downloadChapter('\${projectId}', \${chapter.id})">Download Chapter</button>
          \`;
        }
        
        chapterItem.innerHTML = chapterHtml;
        chapterList.appendChild(chapterItem);
        
        // Draw waveform if completed
        if (chapter.status === 'completed' && chapter.audioPath) {
          drawWaveform(\`waveform-\${chapter.id}\`, chapter.segments);
        }
      });
    }
    
    function drawWaveform(containerId, segments) {
      const container = document.getElementById(containerId);
      if (!container) return;
      
      container.innerHTML = '';
      const totalSegments = segments.length;
      
      segments.forEach((segment, idx) => {
        const segmentEl = document.createElement('div');
        segmentEl.className = 'wave-segment';
        segmentEl.style.left = \`\${(idx / totalSegments) * 100}%\`;
        segmentEl.style.width = \`\${(1 / totalSegments) * 100}%\`;
        segmentEl.style.backgroundColor = segment.voiceId === voices[0]?.id ? 'var(--wave-color1)' : 'var(--wave-color2)';
        container.appendChild(segmentEl);
      });
    }
    
    async function pauseProject() {
      const response = await apiCall(\`/api/projects/\${currentProjectId}/pause\`, {
        method: 'POST'
      });
      if (response.error) {
        alert('Error pausing project: ' + response.error);
      }
    }
    
    async function resumeProject() {
      const response = await apiCall(\`/api/projects/\${currentProjectId}/resume\`, {
        method: 'POST'
      });
      if (response.error) {
        alert('Error resuming project: ' + response.error);
      }
    }
    
    function viewProject(projectId) {
      dashboardView.classList.add('hidden');
      processingView.classList.remove('hidden');
      currentProjectId = projectId;
      loadProject(projectId);
    }
    
    function downloadChapter(projectId, chapterId) {
      const chapter = projects[projectId].chapters[chapterId];
      if (chapter && chapter.audioPath) {
        const link = document.createElement('a');
        link.href = chapter.audioPath;
        link.download = \`chapter_\${chapterId + 1}.mp3\`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    
    // Expose functions to global scope for inline onclick
    window.viewProject = viewProject;
    window.downloadChapter = downloadChapter;
  </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.send(frontendHtml);
});

// --- Main Execution ---
async function main() {
  await ensureDirs();
  await loadProjects();
  
  const server = app.listen(PORT, () => {
    console.log(`Audiobook Generator running at http://localhost:${PORT}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
    
    // Try to open browser
    const open = async (url) => {
      try {
        switch (process.platform) {
          case 'darwin': await execAsync(`open ${url}`); break;
          case 'win32': await execAsync(`start ${url}`); break;
          case 'linux': await execAsync(`xdg-open ${url}`); break;
          default: break;
        }
      } catch (e) {
        console.log('Could not open browser automatically.');
      }
    };
    
    open(`http://localhost:${PORT}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await saveProjects();
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
}

// Check for required dependencies
function checkDependencies() {
  const required = ['express', 'axios', 'form-data', 'marked', 'sanitize-html'];
  const missing = [];
  
  for (const pkg of required) {
    try {
      require.resolve(pkg);
    } catch (e) {
      missing.push(pkg);
    }
  }
  
  if (missing.length > 0) {
    console.error('Missing required dependencies. Please install them with:');
    console.error(`npm install ${missing.join(' ')}`);
    process.exit(1);
  }
}

// Run the app
if (require.main === module) {
  checkDependencies();
  main().catch(console.error);
}