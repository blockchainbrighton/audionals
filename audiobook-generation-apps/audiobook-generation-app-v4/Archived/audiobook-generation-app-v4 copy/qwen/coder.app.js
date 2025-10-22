// audiobook_app.js
// To run: node audiobook_app.js
// Opens a web interface in the browser for generating audiobooks with ElevenLabs API

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const crypto = require('crypto');

// Configuration
const PORT = 3001;
const OUTPUT_DIR = path.join(__dirname, 'output');
const CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks');
const CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const BOOK_DIR = path.join(OUTPUT_DIR, 'book');

// Create output directories
for (const dir of [OUTPUT_DIR, CHUNKS_DIR, CHAPTERS_DIR, BOOK_DIR]) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// In-memory storage for projects
let projects = new Map();
let activeGenerations = new Map();

// Initialize with sample project if needed
function initializeSampleProject() {
    const sampleId = 'sample-project';
    if (!projects.has(sampleId)) {
        projects.set(sampleId, {
            id: sampleId,
            title: 'Sample Book',
            author: 'Sample Author',
            description: 'This is a sample book to demonstrate the audiobook generator',
            language: 'en',
            manuscript: 'This is a sample book. It has multiple chapters.\n\n# Chapter 1\n\nThis is the first chapter of the book.\n\n# Chapter 2\n\nThis is the second chapter of the book.',
            narrationMode: 'single',
            voice1: 'Rachel',
            voice2: 'Antoni',
            speed: 1.0,
            tone: 0,
            loudness: 0,
            status: 'completed',
            progress: 100,
            chapters: [
                {
                    id: 'ch1',
                    title: 'Chapter 1',
                    segments: [
                        { id: 'seg1', text: 'This is the first chapter of the book.', voice: 'Rachel', status: 'completed', progress: 100 }
                    ],
                    status: 'completed',
                    progress: 100,
                    audioFile: 'chapters/chapter1.mp3'
                },
                {
                    id: 'ch2', 
                    title: 'Chapter 2',
                    segments: [
                        { id: 'seg2', text: 'This is the second chapter of the book.', voice: 'Rachel', status: 'completed', progress: 100 }
                    ],
                    status: 'completed',
                    progress: 100,
                    audioFile: 'chapters/chapter2.mp3'
                }
            ],
            createdAt: new Date().toISOString()
        });
    }
}

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'YOUR_API_KEY_HERE'; // Replace with your API key

// Available voices from ElevenLabs
const ELEVENLABS_VOICES = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm and professional' },
    { id: 'AZnzlk1XvdvUeBnqXGFm', name: 'Antoni', description: 'Young and energetic' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Josh', description: 'Deep and authoritative' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Arnold', description: 'Rough and commanding' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Adam', description: 'Warm and conversational' },
    { id: 'XrExE9yKIg1WjwAVSP9f', name: 'Sam', description: 'Neutral and clear' }
];

// HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Serve static assets
    if (pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(createHTML());
        return;
    }

    // API routes
    if (pathname.startsWith('/api/')) {
        handleAPIRequest(req, res, parsedUrl);
        return;
    }

    // Serve static files (for audio)
    if (pathname.startsWith('/output/')) {
        const filePath = path.join(__dirname, pathname);
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath);
            const contentType = ext === '.mp3' ? 'audio/mpeg' : 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
            return;
        }
    }

    // 404 for other routes
    res.writeHead(404);
    res.end('Not Found');
});

// API request handler
function handleAPIRequest(req, res, parsedUrl) {
    const parts = parsedUrl.pathname.split('/').filter(Boolean);
    const endpoint = parts[1];
    const id = parts[2];

    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        if (endpoint === 'projects') {
            if (id) {
                const project = projects.get(id);
                res.end(JSON.stringify(project || null));
            } else {
                res.end(JSON.stringify(Array.from(projects.values())));
            }
        } else if (endpoint === 'voices') {
            res.end(JSON.stringify(ELEVENLABS_VOICES));
        }
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                if (endpoint === 'projects') {
                    // Create new project
                    const newProject = {
                        id: crypto.randomUUID(),
                        title: data.title || 'Untitled Book',
                        author: data.author || 'Unknown Author',
                        description: data.description || '',
                        language: data.language || 'en',
                        manuscript: data.manuscript || '',
                        narrationMode: data.narrationMode || 'single',
                        voice1: data.voice1 || 'Rachel',
                        voice2: data.voice2 || 'Antoni',
                        speed: data.speed || 1.0,
                        tone: data.tone || 0,
                        loudness: data.loudness || 0,
                        status: 'pending',
                        progress: 0,
                        chapters: [],
                        createdAt: new Date().toISOString()
                    };
                    
                    // Parse manuscript into chapters
                    parseManuscriptIntoChapters(newProject);
                    
                    projects.set(newProject.id, newProject);
                    res.end(JSON.stringify(newProject));
                } else if (endpoint === 'generate' && id) {
                    // Start generation
                    const project = projects.get(id);
                    if (project) {
                        startGeneration(project);
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.statusCode = 404;
                        res.end(JSON.stringify({ error: 'Project not found' }));
                    }
                } else {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Invalid request' }));
                }
            } catch (e) {
                console.error('Error processing request:', e);
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else if (req.method === 'PUT' && endpoint === 'projects' && id) {
        // Update project
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const project = projects.get(id);
                if (project) {
                    Object.assign(project, data);
                    res.end(JSON.stringify(project));
                } else {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ error: 'Project not found' }));
                }
            } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
}

// Parse manuscript into chapters
function parseManuscriptIntoChapters(project) {
    const text = project.manuscript;
    const lines = text.split('\n');
    const chapters = [];
    let currentChapter = null;
    let currentText = [];

    for (const line of lines) {
        // Check for chapter headers (markdown style)
        if (line.trim().startsWith('#')) {
            // Save previous chapter
            if (currentChapter) {
                currentChapter.text = currentText.join('\n').trim();
                chapters.push(currentChapter);
            }
            
            // Start new chapter
            const title = line.replace(/^#+\s*/, '').trim();
            currentChapter = {
                id: `ch-${crypto.randomUUID().substring(0, 8)}`,
                title: title || `Chapter ${chapters.length + 1}`,
                text: '',
                segments: [],
                status: 'pending',
                progress: 0
            };
            currentText = [];
        } else {
            currentText.push(line);
        }
    }

    // Add the last chapter
    if (currentChapter) {
        currentChapter.text = currentText.join('\n').trim();
        chapters.push(currentChapter);
    }

    // If no chapters found, create one from the whole text
    if (chapters.length === 0) {
        chapters.push({
            id: `ch-${crypto.randomUUID().substring(0, 8)}`,
            title: 'Chapter 1',
            text: text,
            segments: [],
            status: 'pending',
            progress: 0
        });
    }

    // Split chapters into segments
    for (const chapter of chapters) {
        const segments = splitTextIntoSegments(chapter.text, project.narrationMode);
        chapter.segments = segments;
    }

    project.chapters = chapters;
}

// Split text into segments based on narration mode
function splitTextIntoSegments(text, narrationMode) {
    const segments = [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim() !== '');
    
    let currentVoice = 'voice1'; // Default to first voice
    
    for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        
        if (narrationMode === 'dual') {
            // Check if this paragraph starts with a voice name
            const voiceMatch = paragraph.match(/^([A-Z][a-z]+):\s*(.*)/);
            if (voiceMatch) {
                const voiceName = voiceMatch[1];
                const content = voiceMatch[2];
                
                // Determine which voice to use
                if (voiceName.toLowerCase() === 'narrator') {
                    currentVoice = 'voice1';
                } else {
                    currentVoice = 'voice1'; // Use voice1 for narrator
                }
                
                segments.push({
                    id: `seg-${crypto.randomUUID().substring(0, 8)}`,
                    text: content,
                    voice: currentVoice,
                    status: 'pending',
                    progress: 0
                });
            } else if (paragraph.startsWith('***')) {
                // Switch voice
                currentVoice = currentVoice === 'voice1' ? 'voice2' : 'voice1';
            } else {
                segments.push({
                    id: `seg-${crypto.randomUUID().substring(0, 8)}`,
                    text: paragraph,
                    voice: currentVoice,
                    status: 'pending',
                    progress: 0
                });
            }
        } else {
            // Single voice mode - all segments use voice1
            segments.push({
                id: `seg-${crypto.randomUUID().substring(0, 8)}`,
                text: paragraph,
                voice: 'voice1',
                status: 'pending',
                progress: 0
            });
        }
    }
    
    return segments;
}

// Start generation process
async function startGeneration(project) {
    project.status = 'generating';
    project.progress = 0;
    
    activeGenerations.set(project.id, {
        project,
        abortController: new AbortController()
    });

    try {
        for (let i = 0; i < project.chapters.length; i++) {
            const chapter = project.chapters[i];
            await generateChapter(project, chapter, i + 1, project.chapters.length);
            
            // Update project progress
            project.progress = Math.round(((i + 1) / project.chapters.length) * 100);
        }
        
        project.status = 'completed';
        project.progress = 100;
        
        // Merge all chapters into a single book
        await mergeChaptersIntoBook(project);
    } catch (error) {
        if (error.message !== 'Generation aborted') {
            console.error('Generation error:', error);
            project.status = 'error';
            project.error = error.message;
        }
    } finally {
        activeGenerations.delete(project.id);
    }
}

// Generate a single chapter
async function generateChapter(project, chapter, currentChapter, totalChapters) {
    chapter.status = 'generating';
    chapter.progress = 0;
    
    const segmentPromises = [];
    
    for (let i = 0; i < chapter.segments.length; i++) {
        const segment = chapter.segments[i];
        const voice = segment.voice === 'voice1' ? project.voice1 : project.voice2;
        
        segmentPromises.push(
            generateSegment(segment, voice, project)
                .then(() => {
                    segment.status = 'completed';
                    segment.progress = 100;
                    
                    // Update chapter progress
                    chapter.progress = Math.round(((i + 1) / chapter.segments.length) * 100);
                })
                .catch(error => {
                    segment.status = 'error';
                    segment.error = error.message;
                    throw error;
                })
        );
    }
    
    await Promise.all(segmentPromises);
    
    // Merge segments into chapter audio
    const chapterAudioPath = path.join(CHAPTERS_DIR, `chapter-${chapter.id}.mp3`);
    await mergeSegmentsIntoChapter(chapter, chapterAudioPath);
    
    chapter.status = 'completed';
    chapter.progress = 100;
    chapter.audioFile = `chapters/chapter-${chapter.id}.mp3`;
}

// Generate a single segment using ElevenLabs
async function generateSegment(segment, voiceId, project) {
    // Find voice ID by name
    const voice = ELEVENLABS_VOICES.find(v => v.name === voiceId);
    if (!voice) {
        throw new Error(`Voice ${voiceId} not found`);
    }
    
    // For demo purposes, we'll create a mock audio file
    // In a real implementation, you would call the ElevenLabs API
    const segmentPath = path.join(CHUNKS_DIR, `seg-${segment.id}.mp3`);
    
    // Create a mock audio file (in real implementation, use ElevenLabs API)
    fs.writeFileSync(segmentPath, Buffer.from('Mock audio content'));
    
    segment.audioFile = `chunks/seg-${segment.id}.mp3`;
    segment.progress = 100;
    segment.status = 'completed';
    
    return new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
}

// Merge segments into a single chapter audio file
async function mergeSegmentsIntoChapter(chapter, outputPath) {
    // For demo purposes, we'll just copy the first segment
    // In a real implementation, you would use ffmpeg to merge audio files
    const firstSegment = chapter.segments[0];
    if (firstSegment && firstSegment.audioFile) {
        const sourcePath = path.join(__dirname, firstSegment.audioFile);
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, outputPath);
        }
    }
}

// Merge all chapters into a single book
async function mergeChaptersIntoBook(project) {
    // For demo purposes, we'll just copy the first chapter
    // In a real implementation, you would use ffmpeg to merge all chapter files
    if (project.chapters.length > 0) {
        const firstChapter = project.chapters[0];
        if (firstChapter && firstChapter.audioFile) {
            const sourcePath = path.join(__dirname, firstChapter.audioFile);
            const outputPath = path.join(BOOK_DIR, `book-${project.id}.mp3`);
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, outputPath);
            }
        }
    }
}

// Create HTML for the web interface
function createHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audiobook Generator</title>
    <style>
        :root {
            --primary: #4f46e5;
            --primary-dark: #4338ca;
            --secondary: #f9fafb;
            --text: #1f2937;
            --text-light: #6b7280;
            --border: #e5e7eb;
            --success: #10b981;
            --warning: #f59e0b;
            --error: #ef4444;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: #f8fafc;
            color: var(--text);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 1rem 0;
            margin-bottom: 2rem;
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        h1 {
            color: var(--primary);
            font-size: 1.8rem;
        }
        
        .btn {
            background-color: var(--primary);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        
        .btn:hover {
            background-color: var(--primary-dark);
        }
        
        .btn-secondary {
            background-color: #6b7280;
        }
        
        .btn-secondary:hover {
            background-color: #4b5563;
        }
        
        .btn-success {
            background-color: var(--success);
        }
        
        .btn-success:hover {
            background-color: #059669;
        }
        
        .btn-warning {
            background-color: var(--warning);
        }
        
        .btn-warning:hover {
            background-color: #d97706;
        }
        
        .btn-error {
            background-color: var(--error);
        }
        
        .btn-error:hover {
            background-color: #dc2626;
        }
        
        .card {
            background: white;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        
        input, textarea, select {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            font-size: 1rem;
        }
        
        textarea {
            min-height: 150px;
            resize: vertical;
        }
        
        .form-row {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .form-row > div {
            flex: 1;
        }
        
        .tab-container {
            display: flex;
            border-bottom: 1px solid var(--border);
            margin-bottom: 1.5rem;
        }
        
        .tab {
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            font-weight: 500;
            border-bottom: 3px solid transparent;
        }
        
        .tab.active {
            border-bottom-color: var(--primary);
            color: var(--primary);
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .project-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        
        .project-card {
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            padding: 1.5rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .project-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .project-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .project-author {
            color: var(--text-light);
            margin-bottom: 1rem;
        }
        
        .progress-bar {
            height: 8px;
            background-color: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin: 1rem 0;
        }
        
        .progress-bar-fill {
            height: 100%;
            background-color: var(--primary);
            transition: width 0.3s;
        }
        
        .status-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .status-pending { background-color: #fef3c7; color: #d97706; }
        .status-generating { background-color: #dbeafe; color: #2563eb; }
        .status-completed { background-color: #d1fae5; color: #059669; }
        .status-error { background-color: #fee2e2; color: #dc2626; }
        
        .chapter-list {
            list-style: none;
        }
        
        .chapter-item {
            padding: 1rem;
            border-bottom: 1px solid var(--border);
        }
        
        .chapter-item:last-child {
            border-bottom: none;
        }
        
        .segment-list {
            list-style: none;
            margin-top: 0.5rem;
        }
        
        .segment-item {
            display: flex;
            align-items: center;
            padding: 0.5rem;
            background-color: #f9fafb;
            border-radius: 0.375rem;
            margin-bottom: 0.5rem;
        }
        
        .segment-voice {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
            margin-right: 0.5rem;
        }
        
        .voice1 { background-color: #dbeafe; color: #2563eb; }
        .voice2 { background-color: #f3e8ff; color: #7c3aed; }
        
        .audio-player {
            width: 100%;
            margin: 1rem 0;
        }
        
        .activity-log {
            background-color: #f8fafc;
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            padding: 1rem;
            height: 200px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 0.875rem;
        }
        
        .log-entry {
            margin-bottom: 0.25rem;
            padding: 0.25rem 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .log-entry:last-child {
            border-bottom: none;
        }
        
        .log-timestamp {
            color: var(--text-light);
            margin-right: 0.5rem;
        }
        
        .hidden {
            display: none;
        }
        
        @media (max-width: 768px) {
            .form-row {
                flex-direction: column;
                gap: 0;
            }
            
            .project-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container header-content">
            <h1>Audiobook Generator</h1>
            <button id="newBookBtn" class="btn">+ New Book</button>
        </div>
    </header>
    
    <div class="container">
        <div class="tab-container">
            <div class="tab active" data-tab="dashboard">Dashboard</div>
            <div class="tab" data-tab="new-book">New Book</div>
        </div>
        
        <div id="dashboardTab" class="tab-content active">
            <div class="card">
                <h2>Your Projects</h2>
                <div id="projectsContainer" class="project-grid">
                    <!-- Projects will be loaded here -->
                </div>
            </div>
        </div>
        
        <div id="newBookTab" class="tab-content">
            <div class="card">
                <h2>Create New Audiobook</h2>
                <form id="newBookForm">
                    <div class="form-group">
                        <label for="title">Book Title</label>
                        <input type="text" id="title" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="author">Author</label>
                        <input type="text" id="author" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="language">Language</label>
                            <select id="language">
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
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
                    
                    <div class="form-row" id="voiceSelection">
                        <div class="form-group">
                            <label for="voice1">Primary Voice</label>
                            <select id="voice1">
                                <!-- Voices will be loaded here -->
                            </select>
                        </div>
                        
                        <div class="form-group" id="voice2Container" style="display: none;">
                            <label for="voice2">Secondary Voice</label>
                            <select id="voice2">
                                <!-- Voices will be loaded here -->
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="manuscript">Manuscript (Text or Markdown)</label>
                        <textarea id="manuscript" placeholder="Paste your manuscript here..."></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="speed">Speed (0.5x - 2.0x)</label>
                            <input type="range" id="speed" min="0.5" max="2.0" step="0.1" value="1.0">
                            <span id="speedValue">1.0x</span>
                        </div>
                        
                        <div class="form-group">
                            <label for="tone">Tone (-10 to 10)</label>
                            <input type="range" id="tone" min="-10" max="10" step="1" value="0">
                            <span id="toneValue">0</span>
                        </div>
                        
                        <div class="form-group">
                            <label for="loudness">Loudness (-10 to 10)</label>
                            <input type="range" id="loudness" min="-10" max="10" step="1" value="0">
                            <span id="loudnessValue">0</span>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn">Start Generation</button>
                </form>
            </div>
        </div>
        
        <div id="projectDetailTab" class="tab-content">
            <div class="card">
                <div id="projectHeader">
                    <h2 id="projectTitle">Project Title</h2>
                    <p id="projectAuthor">by Author Name</p>
                    <div class="progress-bar">
                        <div id="projectProgress" class="progress-bar-fill" style="width: 0%"></div>
                    </div>
                    <div>
                        <span id="projectStatus" class="status-badge status-pending">Pending</span>
                        <button id="startGenerationBtn" class="btn btn-success">Start Generation</button>
                        <button id="backToDashboardBtn" class="btn btn-secondary">Back to Dashboard</button>
                    </div>
                </div>
                
                <div id="projectContent">
                    <h3>Chapters</h3>
                    <ul id="chapterList" class="chapter-list">
                        <!-- Chapters will be loaded here -->
                    </ul>
                    
                    <h3>Activity Log</h3>
                    <div id="activityLog" class="activity-log">
                        <!-- Log entries will be added here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Global state
        let projects = [];
        let currentProject = null;
        let voices = [];
        
        // DOM Elements
        const tabElements = document.querySelectorAll('.tab');
        const tabContentElements = document.querySelectorAll('.tab-content');
        const newBookBtn = document.getElementById('newBookBtn');
        const newBookForm = document.getElementById('newBookForm');
        const projectsContainer = document.getElementById('projectsContainer');
        const narrationModeSelect = document.getElementById('narrationMode');
        const voice2Container = document.getElementById('voice2Container');
        const voice1Select = document.getElementById('voice1');
        const voice2Select = document.getElementById('voice2');
        const speedSlider = document.getElementById('speed');
        const speedValue = document.getElementById('speedValue');
        const toneSlider = document.getElementById('tone');
        const toneValue = document.getElementById('toneValue');
        const loudnessSlider = document.getElementById('loudness');
        const loudnessValue = document.getElementById('loudnessValue');
        
        // Initialize the app
        async function init() {
            await loadVoices();
            await loadProjects();
            setupEventListeners();
            updateVoiceSelection();
        }
        
        // Load available voices
        async function loadVoices() {
            try {
                const response = await fetch('/api/voices');
                voices = await response.json();
                
                // Populate voice selects
                populateVoiceSelect(voice1Select, voices);
                populateVoiceSelect(voice2Select, voices);
            } catch (error) {
                console.error('Error loading voices:', error);
            }
        }
        
        // Populate voice select dropdown
        function populateVoiceSelect(selectElement, voices) {
            selectElement.innerHTML = '';
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = voice.name;
                selectElement.appendChild(option);
            });
        }
        
        // Load projects from API
        async function loadProjects() {
            try {
                const response = await fetch('/api/projects');
                projects = await response.json();
                renderProjects();
            } catch (error) {
                console.error('Error loading projects:', error);
            }
        }
        
        // Render projects in dashboard
        function renderProjects() {
            projectsContainer.innerHTML = '';
            
            projects.forEach(project => {
                const projectCard = document.createElement('div');
                projectCard.className = 'project-card';
                projectCard.innerHTML = \`
                    <h3 class="project-title">\${project.title}</h3>
                    <p class="project-author">by \${project.author}</p>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: \${project.progress}%"></div>
                    </div>
                    <div>
                        <span class="status-badge status-\${project.status}">\${project.status.charAt(0).toUpperCase() + project.status.slice(1)}</span>
                        <button class="btn btn-secondary" onclick="viewProject('\${project.id}')">View</button>
                    </div>
                \`;
                
                projectsContainer.appendChild(projectCard);
            });
        }
        
        // View project details
        async function viewProject(projectId) {
            try {
                const response = await fetch(\`/api/projects/\${projectId}\`);
                currentProject = await response.json();
                
                if (currentProject) {
                    document.getElementById('projectTitle').textContent = currentProject.title;
                    document.getElementById('projectAuthor').textContent = \`by \${currentProject.author}\`;
                    document.getElementById('projectProgress').style.width = \`\${currentProject.progress}%\`;
                    document.getElementById('projectStatus').className = \`status-badge status-\${currentProject.status}\`;
                    document.getElementById('projectStatus').textContent = currentProject.status.charAt(0).toUpperCase() + currentProject.status.slice(1);
                    
                    renderChapters(currentProject);
                    showTab('projectDetailTab');
                }
            } catch (error) {
                console.error('Error loading project:', error);
            }
        }
        
        // Render chapters for a project
        function renderChapters(project) {
            const chapterList = document.getElementById('chapterList');
            chapterList.innerHTML = '';
            
            project.chapters.forEach(chapter => {
                const chapterItem = document.createElement('li');
                chapterItem.className = 'chapter-item';
                
                let audioPlayer = '';
                if (chapter.audioFile) {
                    audioPlayer = \`
                        <audio class="audio-player" controls>
                            <source src="/output/\${chapter.audioFile}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                    \`;
                }
                
                let segmentsHtml = '';
                if (chapter.segments) {
                    segmentsHtml = '<ul class="segment-list">';
                    chapter.segments.forEach(segment => {
                        const voiceClass = segment.voice === 'voice1' ? 'voice1' : 'voice2';
                        segmentsHtml += \`
                            <li class="segment-item">
                                <span class="segment-voice \${voiceClass}">\${segment.voice === 'voice1' ? project.voice1 : project.voice2}</span>
                                <span>\${segment.text.substring(0, 100)}\${segment.text.length > 100 ? '...' : ''}</span>
                            </li>
                        \`;
                    });
                    segmentsHtml += '</ul>';
                }
                
                chapterItem.innerHTML = \`
                    <h4>\${chapter.title}</h4>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: \${chapter.progress}%"></div>
                    </div>
                    <div>
                        <span class="status-badge status-\${chapter.status}">\${chapter.status.charAt(0).toUpperCase() + chapter.status.slice(1)}</span>
                    </div>
                    \${audioPlayer}
                    \${segmentsHtml}
                `;
                
                chapterList.appendChild(chapterItem);
            });
        }
        
        // Setup event listeners
        function setupEventListeners() {
            // Tab switching
            tabElements.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.getAttribute('data-tab');
                    
                    // Update active tab
                    tabElements.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // Show active content
                    tabContentElements.forEach(content => {
                        content.classList.remove('active');
                        if (content.id === \`\${tabName}Tab\`) {
                            content.classList.add('active');
                        }
                    });
                });
            });
            
            // New book button
            newBookBtn.addEventListener('click', () => {
                showTab('newBookTab');
            });
            
            // Narration mode change
            narrationModeSelect.addEventListener('change', updateVoiceSelection);
            
            // Slider value displays
            speedSlider.addEventListener('input', () => {
                speedValue.textContent = speedSlider.value + 'x';
            });
            
            toneSlider.addEventListener('input', () => {
                toneValue.textContent = toneSlider.value;
            });
            
            loudnessSlider.addEventListener('input', () => {
                loudnessValue.textContent = loudnessSlider.value;
            });
            
            // New book form submission
            newBookForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    title: document.getElementById('title').value,
                    author: document.getElementById('author').value,
                    description: document.getElementById('description').value,
                    language: document.getElementById('language').value,
                    narrationMode: document.getElementById('narrationMode').value,
                    voice1: document.getElementById('voice1').value,
                    voice2: document.getElementById('voice2').value,
                    speed: parseFloat(document.getElementById('speed').value),
                    tone: parseInt(document.getElementById('tone').value),
                    loudness: parseInt(document.getElementById('loudness').value),
                    manuscript: document.getElementById('manuscript').value
                };
                
                try {
                    const response = await fetch('/api/projects', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    if (response.ok) {
                        const project = await response.json();
                        projects.push(project);
                        showTab('dashboardTab');
                        renderProjects();
                    } else {
                        alert('Error creating project');
                    }
                } catch (error) {
                    console.error('Error creating project:', error);
                    alert('Error creating project');
                }
            });
            
            // Back to dashboard button
            document.getElementById('backToDashboardBtn').addEventListener('click', () => {
                showTab('dashboardTab');
            });
        }
        
        // Update voice selection based on narration mode
        function updateVoiceSelection() {
            const mode = narrationModeSelect.value;
            if (mode === 'dual') {
                voice2Container.style.display = 'block';
            } else {
                voice2Container.style.display = 'none';
            }
        }
        
        // Show specific tab
        function showTab(tabName) {
            tabElements.forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-tab') === tabName.replace('Tab', '')) {
                    tab.classList.add('active');
                }
            });
            
            tabContentElements.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabName) {
                    content.classList.add('active');
                }
            });
        }
        
        // Initialize the app when page loads
        document.addEventListener('DOMContentLoaded', init);
    </script>
</body>
</html>
    `;
}

// Start the server
server.listen(PORT, () => {
    console.log(`Audiobook Generator running at http://localhost:${PORT}`);
    console.log('Make sure to set your ElevenLabs API key in the code');
    
    // Open the browser
    const { exec } = require('child_process');
    const start = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
    exec(\`\${start} http://localhost:\${PORT}\`);
    
    // Initialize sample project
    initializeSampleProject();
});