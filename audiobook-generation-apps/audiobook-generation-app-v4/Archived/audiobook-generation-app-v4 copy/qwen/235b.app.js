const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const https = require('https');

// Configuration
const PORT = 3000;
const OUTPUT_DIR = path.join(__dirname, 'output');
const CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks');
const CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const BOOK_DIR = path.join(OUTPUT_DIR, 'book');

// Ensure directories exist
[OUTPUT_DIR, CHUNKS_DIR, CHAPTERS_DIR, BOOK_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Project storage
let projects = {};
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

// Load existing projects
if (fs.existsSync(PROJECTS_FILE)) {
    try {
        const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
        projects = JSON.parse(data);
    } catch (err) {
        console.warn('Could not load projects:', err.message);
        projects = {};
    }
}

// ElevenLabs API key - you can set this as an environment variable or hardcode it
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'your-api-key-here';

// Voice options (you can customize these based on available voices in ElevenLabs)
const VOICES = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', language: 'en' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', language: 'en' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', language: 'en' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', language: 'en' },
    { id: 'MF3fxJYAyK2h2Nds6HSK', name: 'Elli', gender: 'female', language: 'en' },
    { id: 'TxGE5RpM3Aa1pijfZASu', name: 'Josh', gender: 'male', language: 'en' },
    { id: 'VR6AewLTigWG4rUd1GFykN', name: 'Arnold', gender: 'male', language: 'en' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Emily', gender: 'female', language: 'en' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Liam', gender: 'male', language: 'en' },
];

// Generate a unique ID for projects and segments
function generateId() {
    return crypto.randomBytes(16).toString('hex');
}

// Save projects to file
function saveProjects() {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

// Parse manuscript into chapters
function parseManuscript(text) {
    // Split by common chapter markers
    const chapterMarkers = [
        /^#{1,6}\s+Chapter\s+\d+/im,
        /^#{1,6}\s+CHAPTER\s+\d+/im,
        /^#{1,6}\s+[Cc]hapter\s+[IVXLCDM]+/im,
        /^#{1,6}\s+PART\s+\d+/im,
        /^#{1,6}\s+[Pp]art\s+[IVXLCDM]+/im,
        /^#{1,6}\s+Prologue/im,
        /^#{1,6}\s+[Pp]rologue/im,
        /^#{1,6}\s+Epilogue/im,
        /^#{1,6}\s+[Ee]pilogue/im,
        /^Chapter\s+\d+/im,
        /^CHAPTER\s+\d+/im,
        /^[Cc]hapter\s+[IVXLCDM]+/im,
        /^Part\s+\d+/im,
        /^[Pp]art\s+[IVXLCDM]+/im,
        /^Prologue/im,
        /^[Pp]rologue/im,
        /^Epilogue/im,
        /^[Ee]pilogue/im,
    ];

    let chapters = [];
    let currentChapter = { title: 'Introduction', content: '', index: 0 };
    let lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Check if line matches any chapter marker
        let isChapterMarker = false;
        for (let marker of chapterMarkers) {
            if (marker.test(line)) {
                isChapterMarker = true;
                break;
            }
        }

        if (isChapterMarker) {
            if (currentChapter.content.trim().length > 0) {
                chapters.push(currentChapter);
                currentChapter = { title: line.trim(), content: '', index: chapters.length };
            } else {
                currentChapter.title = line.trim();
            }
        } else {
            currentChapter.content += line + '\n';
        }
    }

    // Add the last chapter
    if (currentChapter.content.trim().length > 0) {
        chapters.push(currentChapter);
    }

    // If no chapters found, create one with all content
    if (chapters.length === 0) {
        chapters.push({ title: 'Book Content', content: text, index: 0 });
    }

    return chapters;
}

// Split chapter into segments (max 5000 characters for ElevenLabs)
function splitChapterIntoSegments(chapterContent) {
    const maxSegmentLength = 5000;
    const segments = [];
    
    let remainingText = chapterContent;
    let segmentIndex = 0;
    
    while (remainingText.length > 0) {
        let segmentText = '';
        
        if (remainingText.length <= maxSegmentLength) {
            segmentText = remainingText;
            remainingText = '';
        } else {
            // Find the last sentence boundary within the limit
            let cutPoint = maxSegmentLength;
            
            // Look for sentence boundaries
            const sentenceEndings = ['.', '!', '?', '\n'];
            for (let i = maxSegmentLength; i > maxSegmentLength - 200 && i > 0; i--) {
                if (sentenceEndings.includes(remainingText[i])) {
                    cutPoint = i + 1;
                    break;
                }
            }
            
            segmentText = remainingText.substring(0, cutPoint);
            remainingText = remainingText.substring(cutPoint);
        }
        
        segments.push({
            id: generateId(),
            index: segmentIndex++,
            text: segmentText.trim()
        });
    }
    
    return segments;
}

// Generate audio using ElevenLabs API
async function generateAudio(segment, voiceId, settings = {}) {
    const { speed = 1.0, tone = 0, loudness = 0 } = settings;
    
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
            'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
            text: segment.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true
            },
            speed: speed,
            temperature: 0.75,
            repetition_penalty: 1.0
        })
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                return;
            }
            
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
        
        req.on('error', reject);
        req.write(options.body);
        req.end();
    });
}

// Merge audio files using ffmpeg (requires ffmpeg to be installed)
function mergeAudioFiles(inputFiles, outputFile) {
    return new Promise((resolve, reject) => {
        const ffmpegPath = findFFmpeg();
        if (!ffmpegPath) {
            reject(new Error('FFmpeg not found. Please install FFmpeg and make sure it\'s in your PATH.'));
            return;
        }
        
        const args = ['-y'];
        inputFiles.forEach(file => {
            args.push('-i', file);
        });
        
        args.push('-filter_complex', 'concat=n=' + inputFiles.length + ':v=0:a=1', outputFile);
        
        const ffmpeg = spawn(ffmpegPath, args);
        
        let stderr = '';
        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
            }
        });
    });
}

// Normalize audio using ffmpeg
function normalizeAudio(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        const ffmpegPath = findFFmpeg();
        if (!ffmpegPath) {
            reject(new Error('FFmpeg not found. Please install FFmpeg and make sure it\'s in your PATH.'));
            return;
        }
        
        const args = [
            '-y', '-i', inputFile,
            '-af', 'loudnorm=I=-16:LRA=11:TP=-1.5',
            outputFile
        ];
        
        const ffmpeg = spawn(ffmpegPath, args);
        
        let stderr = '';
        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg normalization failed with code ${code}: ${stderr}`));
            }
        });
    });
}

// Find ffmpeg executable
function findFFmpeg() {
    const paths = [
        'ffmpeg',
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe'
    ];
    
    for (const p of paths) {
        try {
            if (fs.existsSync(p)) {
                return p;
            }
        } catch (e) {
            continue;
        }
    }
    
    return null;
}

// Serve static files
function serveStaticFile(req, res, filePath) {
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.wav':
            contentType = 'audio/wav';
            break;
        case '.mp3':
            contentType = 'audio/mpeg';
            break;
        case '.ogg':
            contentType = 'audio/ogg';
            break;
    }
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

// Create HTML response
function htmlResponse(res, content) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
}

// Main server handler
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;
    
    // Handle API routes
    if (pathname.startsWith('/api/')) {
        handleApiRequest(req, res, pathname);
        return;
    }
    
    // Serve static files
    if (pathname === '/' || pathname === '/index.html') {
        serveHomePage(res);
    } else if (pathname === '/dashboard') {
        serveDashboardPage(res);
    } else if (pathname === '/new-book') {
        serveNewBookPage(res);
    } else if (pathname.startsWith('/project/')) {
        serveProjectPage(res, pathname);
    } else {
        // Try to serve static files from public folder
        const publicPath = path.join(__dirname, 'public', pathname);
        if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
            serveStaticFile(req, res, publicPath);
        } else {
            // 404
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
        }
    }
});

// Handle API requests
function handleApiRequest(req, res, pathname) {
    if (req.method === 'GET' && pathname === '/api/projects') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Object.values(projects)));
        return;
    }
    
    if (req.method === 'POST' && pathname === '/api/projects') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const projectData = JSON.parse(body);
                const projectId = generateId();
                
                // Validate required fields
                if (!projectData.title || !projectData.author || !projectData.manuscript) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing required fields' }));
                    return;
                }
                
                // Parse manuscript into chapters
                const chapters = parseManuscript(projectData.manuscript);
                
                // Initialize project
                const newProject = {
                    id: projectId,
                    title: projectData.title,
                    author: projectData.author,
                    language: projectData.language || 'en',
                    description: projectData.description || '',
                    narrationMode: projectData.narrationMode || 'single',
                    voice1: projectData.voice1 || VOICES[0].id,
                    voice2: projectData.voice2 || VOICES[1].id,
                    settings: {
                        speed: parseFloat(projectData.speed) || 1.0,
                        tone: parseFloat(projectData.tone) || 0,
                        loudness: parseFloat(projectData.loudness) || 0
                    },
                    chapters: chapters.map((chapter, index) => ({
                        id: generateId(),
                        title: chapter.title,
                        content: chapter.content,
                        index: index,
                        segments: [],
                        status: 'pending',
                        progress: 0,
                        duration: 0,
                        audioFile: ''
                    })),
                    status: 'created',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                // Split chapters into segments
                for (let chapter of newProject.chapters) {
                    chapter.segments = splitChapterIntoSegments(chapter.content);
                    
                    // For dual voice mode, analyze segments to assign voices
                    if (newProject.narrationMode === 'dual') {
                        for (let segment of chapter.segments) {
                            // Simple detection: look for voice names at start of segment
                            const firstLine = segment.text.split('\n')[0].trim();
                            if (firstLine.toLowerCase().startsWith('rachel') || 
                                firstLine.toLowerCase().startsWith('domi') ||
                                firstLine.toLowerCase().startsWith('bella') ||
                                firstLine.toLowerCase().startsWith('antoni') ||
                                firstLine.toLowerCase().startsWith('elli') ||
                                firstLine.toLowerCase().startsWith('josh') ||
                                firstLine.toLowerCase().startsWith('arnold') ||
                                firstLine.toLowerCase().startsWith('emily') ||
                                firstLine.toLowerCase().startsWith('liam')) {
                                
                                segment.voice = newProject.voice1; // First voice
                            } else if (segment.text.includes('***')) {
                                // Switch voice after ***
                                segment.voice = newProject.voice2; // Second voice
                            } else {
                                segment.voice = newProject.voice1; // Default to first voice
                            }
                        }
                    } else {
                        // Single voice mode
                        for (let segment of chapter.segments) {
                            segment.voice = newProject.voice1;
                        }
                    }
                }
                
                projects[projectId] = newProject;
                saveProjects();
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(newProject));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }
    
    if (req.method === 'POST' && pathname.startsWith('/api/project/')) {
        const projectId = pathname.split('/')[3];
        if (!projects[projectId]) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Project not found' }));
            return;
        }
        
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const action = JSON.parse(body).action;
                
                if (action === 'start') {
                    await startProjectGeneration(projectId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else if (action === 'pause') {
                    pauseProject(projectId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else if (action === 'resume') {
                    resumeProject(projectId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else if (action === 'rerender') {
                    const segmentId = JSON.parse(body).segmentId;
                    await rerenderSegment(projectId, segmentId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else if (action === 'downloadChapter') {
                    const chapterIndex = parseInt(JSON.parse(body).chapterIndex);
                    const chapter = projects[projectId].chapters[chapterIndex];
                    if (chapter && chapter.audioFile) {
                        const filePath = path.join(CHAPTERS_DIR, chapter.audioFile);
                        if (fs.existsSync(filePath)) {
                            res.writeHead(200, {
                                'Content-Type': 'audio/mpeg',
                                'Content-Disposition': `attachment; filename="${chapter.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3"`
                            });
                            fs.createReadStream(filePath).pipe(res);
                            return;
                        }
                    }
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Chapter not found' }));
                } else if (action === 'exportBook') {
                    await exportFullBook(projectId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid action' }));
                }
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }
    
    // Default: 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
}

// Start project generation
async function startProjectGeneration(projectId) {
    const project = projects[projectId];
    if (!project) return;
    
    project.status = 'generating';
    project.updatedAt = new Date().toISOString();
    saveProjects();
    
    // Process each chapter
    for (let i = 0; i < project.chapters.length; i++) {
        const chapter = project.chapters[i];
        if (chapter.status === 'completed') continue;
        
        chapter.status = 'processing';
        chapter.progress = 0;
        saveProjects();
        
        // Generate audio for each segment
        const segmentFiles = [];
        for (let j = 0; j < chapter.segments.length; j++) {
            const segment = chapter.segments[j];
            if (segment.status === 'completed') continue;
            
            segment.status = 'processing';
            segment.progress = 0;
            saveProjects();
            
            try {
                // Generate audio
                const audioBuffer = await generateAudio(
                    segment, 
                    segment.voice || project.voice1, 
                    project.settings
                );
                
                // Save segment file
                const segmentFileName = `${projectId}_${chapter.id}_${segment.id}.mp3`;
                const segmentFilePath = path.join(CHUNKS_DIR, segmentFileName);
                fs.writeFileSync(segmentFilePath, audioBuffer);
                
                segment.status = 'completed';
                segment.audioFile = segmentFileName;
                segment.progress = 100;
                
                // Update chapter progress
                chapter.progress = Math.round(((j + 1) / chapter.segments.length) * 100);
                saveProjects();
                
                segmentFiles.push(segmentFilePath);
            } catch (error) {
                segment.status = 'failed';
                segment.error = error.message;
                chapter.status = 'failed';
                saveProjects();
                throw error;
            }
        }
        
        // Merge segments into chapter
        if (segmentFiles.length > 0) {
            try {
                const chapterFileName = `${projectId}_${chapter.id}.mp3`;
                const chapterFilePath = path.join(CHAPTERS_DIR, chapterFileName);
                
                await mergeAudioFiles(segmentFiles, chapterFilePath);
                await normalizeAudio(chapterFilePath, chapterFilePath);
                
                chapter.status = 'completed';
                chapter.audioFile = chapterFileName;
                chapter.duration = getAudioDuration(chapterFilePath);
                saveProjects();
            } catch (error) {
                chapter.status = 'failed';
                chapter.error = error.message;
                saveProjects();
                throw error;
            }
        }
    }
    
    // All chapters completed, update project status
    project.status = 'completed';
    project.updatedAt = new Date().toISOString();
    saveProjects();
}

// Get audio duration (simple implementation - would need more sophisticated approach for real app)
function getAudioDuration(filePath) {
    // This is a placeholder - in a real app, you'd use a library like ffprobe
    // For now, we'll just return a dummy value
    return 300; // 5 minutes
}

// Pause project
function pauseProject(projectId) {
    const project = projects[projectId];
    if (!project) return;
    
    project.status = 'paused';
    project.updatedAt = new Date().toISOString();
    saveProjects();
}

// Resume project
function resumeProject(projectId) {
    const project = projects[projectId];
    if (!project) return;
    
    project.status = 'generating';
    project.updatedAt = new Date().toISOString();
    saveProjects();
    
    // Restart generation (in a real app, you'd resume from where it left off)
    // For simplicity, we'll just restart the whole process
    startProjectGeneration(projectId);
}

// Rerender a specific segment
async function rerenderSegment(projectId, segmentId) {
    const project = projects[projectId];
    if (!project) return;
    
    // Find the segment
    let targetSegment = null;
    let targetChapter = null;
    
    for (let chapter of project.chapters) {
        for (let segment of chapter.segments) {
            if (segment.id === segmentId) {
                targetSegment = segment;
                targetChapter = chapter;
                break;
            }
        }
        if (targetSegment) break;
    }
    
    if (!targetSegment) return;
    
    targetSegment.status = 'processing';
    targetSegment.progress = 0;
    saveProjects();
    
    try {
        // Generate audio
        const audioBuffer = await generateAudio(
            targetSegment, 
            targetSegment.voice || project.voice1, 
            project.settings
        );
        
        // Save segment file
        const segmentFileName = `${projectId}_${targetChapter.id}_${targetSegment.id}.mp3`;
        const segmentFilePath = path.join(CHUNKS_DIR, segmentFileName);
        fs.writeFileSync(segmentFilePath, audioBuffer);
        
        targetSegment.status = 'completed';
        targetSegment.audioFile = segmentFileName;
        targetSegment.progress = 100;
        saveProjects();
        
        // Regenerate chapter (merge all segments again)
        const segmentFiles = targetChapter.segments
            .filter(seg => seg.status === 'completed')
            .map(seg => path.join(CHUNKS_DIR, seg.audioFile));
        
        if (segmentFiles.length > 0) {
            try {
                const chapterFileName = `${projectId}_${targetChapter.id}.mp3`;
                const chapterFilePath = path.join(CHAPTERS_DIR, chapterFileName);
                
                await mergeAudioFiles(segmentFiles, chapterFilePath);
                await normalizeAudio(chapterFilePath, chapterFilePath);
                
                targetChapter.status = 'completed';
                targetChapter.audioFile = chapterFileName;
                targetChapter.duration = getAudioDuration(chapterFilePath);
                saveProjects();
            } catch (error) {
                targetChapter.status = 'failed';
                targetChapter.error = error.message;
                saveProjects();
                throw error;
            }
        }
    } catch (error) {
        targetSegment.status = 'failed';
        targetSegment.error = error.message;
        saveProjects();
        throw error;
    }
}

// Export full book
async function exportFullBook(projectId) {
    const project = projects[projectId];
    if (!project) return;
    
    project.status = 'exporting';
    project.updatedAt = new Date().toISOString();
    saveProjects();
    
    try {
        // Get all chapter files
        const chapterFiles = project.chapters
            .filter(chapter => chapter.status === 'completed' && chapter.audioFile)
            .map(chapter => path.join(CHAPTERS_DIR, chapter.audioFile));
        
        if (chapterFiles.length === 0) {
            throw new Error('No completed chapters to export');
        }
        
        // Merge all chapters into full book
        const bookFileName = `${projectId}_full_book.mp3`;
        const bookFilePath = path.join(BOOK_DIR, bookFileName);
        
        await mergeAudioFiles(chapterFiles, bookFilePath);
        await normalizeAudio(bookFilePath, bookFilePath);
        
        // Update project with book info
        project.bookFile = bookFileName;
        project.status = 'completed';
        project.updatedAt = new Date().toISOString();
        saveProjects();
    } catch (error) {
        project.status = 'failed';
        project.error = error.message;
        saveProjects();
        throw error;
    }
}

// Serve home page
function serveHomePage(res) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audiobook Generator</title>
    <style>
        :root {
            --primary: #4f46e5;
            --secondary: #60a5fa;
            --accent: #10b981;
            --background: #f9fafb;
            --surface: #ffffff;
            --border: #e5e7eb;
            --text: #111827;
            --text-secondary: #6b7280;
            --shadow: rgba(0, 0, 0, 0.1);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--background);
            color: var(--text);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background-color: var(--surface);
            padding: 20px;
            border-bottom: 1px solid var(--border);
            box-shadow: 0 2px 4px var(--shadow);
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: var(--primary);
        }
        
        nav ul {
            display: flex;
            list-style: none;
        }
        
        nav li {
            margin-left: 20px;
        }
        
        nav a {
            text-decoration: none;
            color: var(--text);
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        nav a:hover {
            background-color: var(--secondary);
            color: white;
        }
        
        nav a.active {
            background-color: var(--primary);
            color: white;
        }
        
        main {
            padding: 20px 0;
        }
        
        .hero {
            text-align: center;
            padding: 40px 20px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .hero h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .hero p {
            font-size: 1.2rem;
            max-width: 600px;
            margin: 0 auto 20px;
        }
        
        .cta-button {
            display: inline-block;
            background-color: white;
            color: var(--primary);
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        
        .feature-card {
            background-color: var(--surface);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px var(--shadow);
            transition: transform 0.2s;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
        }
        
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 10px;
            color: var(--primary);
        }
        
        .feature-card h3 {
            margin-bottom: 10px;
            color: var(--text);
        }
        
        footer {
            margin-top: 40px;
            padding: 20px;
            background-color: var(--surface);
            border-top: 1px solid var(--border);
            text-align: center;
            color: var(--text-secondary);
        }
        
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 15px;
            }
            
            nav ul {
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .hero h1 {
                font-size: 2rem;
            }
            
            .features {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container header-content">
            <div class="logo">Audiobook Generator</div>
            <nav>
                <ul>
                    <li><a href="/" class="active">Home</a></li>
                    <li><a href="/dashboard">Dashboard</a></li>
                    <li><a href="/new-book">New Book</a></li>
                </ul>
            </nav>
        </div>
    </header>
    
    <main class="container">
        <section class="hero">
            <h1>Create Professional Audiobooks</h1>
            <p>Transform your manuscripts into high-quality audiobooks with our easy-to-use interface and powerful AI voice technology.</p>
            <a href="/new-book" class="cta-button">Start Creating</a>
        </section>
        
        <section class="features">
            <div class="feature-card">
                <div class="feature-icon">📚</div>
                <h3>Multiple Formats</h3>
                <p>Support for plain text and markdown manuscripts with automatic chapter detection.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">🎤</div>
                <h3>Voice Options</h3>
                <p>Choose from multiple professional voices or use dual-voice narration for dialogue scenes.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">⚙️</div>
                <h3>Custom Settings</h3>
                <p>Adjust speed, tone, and volume to match your desired listening experience.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">🔄</div>
                <h3>Resume & Edit</h3>
                <p>Pause, resume, or re-render individual segments without starting over.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">🎧</div>
                <h3>Real-time Preview</h3>
                <p>Listen to generated chapters with waveform visualization as they're being created.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">💾</div>
                <h3>Export Anywhere</h3>
                <p>Download individual chapters or the complete audiobook in MP3 format.</p>
            </div>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2025 Audiobook Generator. All rights reserved.</p>
    </footer>
</body>
</html>
    `;
    htmlResponse(res, html);
}

// Serve dashboard page
function serveDashboardPage(res) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard | Audiobook Generator</title>
    <style>
        :root {
            --primary: #4f46e5;
            --secondary: #60a5fa;
            --accent: #10b981;
            --background: #f9fafb;
            --surface: #ffffff;
            --border: #e5e7eb;
            --text: #111827;
            --text-secondary: #6b7280;
            --shadow: rgba(0, 0, 0, 0.1);
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--background);
            color: var(--text);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background-color: var(--surface);
            padding: 20px;
            border-bottom: 1px solid var(--border);
            box-shadow: 0 2px 4px var(--shadow);
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: var(--primary);
        }
        
        nav ul {
            display: flex;
            list-style: none;
        }
        
        nav li {
            margin-left: 20px;
        }
        
        nav a {
            text-decoration: none;
            color: var(--text);
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        nav a:hover {
            background-color: var(--secondary);
            color: white;
        }
        
        nav a.active {
            background-color: var(--primary);
            color: white;
        }
        
        main {
            padding: 20px 0;
        }
        
        .page-title {
            font-size: 2rem;
            margin-bottom: 20px;
            color: var(--text);
        }
        
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .project-card {
            background-color: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px var(--shadow);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .project-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 12px var(--shadow);
        }
        
        .project-header {
            padding: 20px;
            background-color: var(--primary);
            color: white;
        }
        
        .project-title {
            font-size: 1.2rem;
            margin-bottom: 5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .project-author {
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .project-body {
            padding: 20px;
        }
        
        .project-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        
        .progress-container {
            margin-bottom: 15px;
        }
        
        .progress-bar {
            height: 8px;
            background-color: var(--border);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 5px;
        }
        
        .progress-fill {
            height: 100%;
            background-color: var(--primary);
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .progress-text {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        .project-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s, transform 0.2s;
        }
        
        .btn-primary {
            background-color: var(--primary);
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #4338ca;
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background-color: var(--secondary);
            color: white;
        }
        
        .btn-secondary:hover {
            background-color: #3b82f6;
            transform: translateY(-1px);
        }
        
        .btn-success {
            background-color: var(--success);
            color: white;
        }
        
        .btn-success:hover {
            background-color: #059669;
            transform: translateY(-1px);
        }
        
        .btn-warning {
            background-color: var(--warning);
            color: white;
        }
        
        .btn-warning:hover {
            background-color: #eab308;
            transform: translateY(-1px);
        }
        
        .btn-danger {
            background-color: var(--danger);
            color: white;
        }
        
        .btn-danger:hover {
            background-color: #dc2626;
            transform: translateY(-1px);
        }
        
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
            display: inline-block;
        }
        
        .status-created {
            background-color: #dbeafe;
            color: #2563eb;
        }
        
        .status-generating {
            background-color: #fef3c7;
            color: #f59e0b;
        }
        
        .status-completed {
            background-color: #dcfce7;
            color: #16a34a;
        }
        
        .status-paused {
            background-color: #f3f4f6;
            color: #6b7280;
        }
        
        .status-failed {
            background-color: #fee2e2;
            color: #dc2626;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            background-color: var(--surface);
            border-radius: 8px;
            border: 1px dashed var(--border);
            margin: 30px 0;
        }
        
        .empty-state-icon {
            font-size: 3rem;
            margin-bottom: 15px;
            color: var(--text-secondary);
        }
        
        .empty-state h3 {
            margin-bottom: 10px;
            color: var(--text);
        }
        
        .empty-state p {
            color: var(--text-secondary);
            margin-bottom: 20px;
        }
        
        .add-project-btn {
            background-color: var(--primary);
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
            transition: background-color 0.2s, transform 0.2s;
        }
        
        .add-project-btn:hover {
            background-color: #4338ca;
            transform: translateY(-2px);
        }
        
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 15px;
            }
            
            nav ul {
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .page-title {
                font-size: 1.5rem;
            }
            
            .projects-grid {
                grid-template-columns: 1fr;
            }
            
            .project-title {
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container header-content">
            <div class="logo">Audiobook Generator</div>
            <nav>
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/dashboard" class="active">Dashboard</a></li>
                    <li><a href="/new-book">New Book</a></li>
                </ul>
            </nav>
        </div>
    </header>
    
    <main class="container">
        <h1 class="page-title">Your Audiobook Projects</h1>
        
        <div id="projects-container">
            <!-- Projects will be loaded here via JavaScript -->
        </div>
        
        <div id="empty-state" class="empty-state" style="display: none;">
            <div class="empty-state-icon">📚</div>
            <h3>No Projects Yet</h3>
            <p>You haven't created any audiobook projects yet.</p>
            <a href="/new-book" class="add-project-btn">Create Your First Project</a>
        </div>
    </main>
    
    <script>
        document.addEventListener('DOMContentLoaded', async () => {
            const projectsContainer = document.getElementById('projects-container');
            const emptyState = document.getElementById('empty-state');
            
            try {
                const response = await fetch('/api/projects');
                const projects = await response.json();
                
                if (projects.length === 0) {
                    emptyState.style.display = 'block';
                    return;
                }
                
                projectsContainer.innerHTML = projects.map(project => {
                    const progress = calculateProjectProgress(project);
                    const statusClass = getStatusClass(project.status);
                    const statusText = getStatusText(project.status);
                    
                    return \`
                        <div class="project-card">
                            <div class="project-header">
                                <h3 class="project-title">\${project.title}</h3>
                                <p class="project-author">by \${project.author}</p>
                            </div>
                            <div class="project-body">
                                <div class="project-meta">
                                    <span>\${project.language}</span>
                                    <span>\${project.createdAt.split('T')[0]}</span>
                                </div>
                                <div class="progress-container">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: \${progress}%"></div>
                                    </div>
                                    <div class="progress-text">\${progress}% Complete</div>
                                </div>
                                <div class="project-actions">
                                    <span class="status-badge \${statusClass}">\${statusText}</span>
                                    <a href="/project/\${project.id}" class="btn btn-primary">View</a>
                                </div>
                            </div>
                        </div>
                    \`;
                }).join('');
            } catch (error) {
                console.error('Error loading projects:', error);
                projectsContainer.innerHTML = '<p>Error loading projects. Please try again later.</p>';
            }
        });
        
        function calculateProjectProgress(project) {
            if (!project.chapters || project.chapters.length === 0) return 0;
            
            let totalChapters = project.chapters.length;
            let completedChapters = project.chapters.filter(chapter => chapter.status === 'completed').length;
            
            return Math.round((completedChapters / totalChapters) * 100);
        }
        
        function getStatusClass(status) {
            switch (status) {
                case 'created': return 'status-created';
                case 'generating': return 'status-generating';
                case 'completed': return 'status-completed';
                case 'paused': return 'status-paused';
                case 'failed': return 'status-failed';
                default: return 'status-created';
            }
        }
        
        function getStatusText(status) {
            switch (status) {
                case 'created': return 'Created';
                case 'generating': return 'Generating';
                case 'completed': return 'Completed';
                case 'paused': return 'Paused';
                case 'failed': return 'Failed';
                default: return 'Created';
            }
        }
    </script>
</body>
</html>
    `;
    htmlResponse(res, html);
}

// Serve new book page
function serveNewBookPage(res) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Book | Audiobook Generator</title>
    <style>
        :root {
            --primary: #4f46e5;
            --secondary: #60a5fa;
            --accent: #10b981;
            --background: #f9fafb;
            --surface: #ffffff;
            --border: #e5e7eb;
            --text: #111827;
            --text-secondary: #6b7280;
            --shadow: rgba(0, 0, 0, 0.1);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--background);
            color: var(--text);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background-color: var(--surface);
            padding: 20px;
            border-bottom: 1px solid var(--border);
            box-shadow: 0 2px 4px var(--shadow);
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: var(--primary);
        }
        
        nav ul {
            display: flex;
            list-style: none;
        }
        
        nav li {
            margin-left: 20px;
        }
        
        nav a {
            text-decoration: none;
            color: var(--text);
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        nav a:hover {
            background-color: var(--secondary);
            color: white;
        }
        
        nav a.active {
            background-color: var(--primary);
            color: white;
        }
        
        main {
            padding: 20px 0;
        }
        
        .page-title {
            font-size: 2rem;
            margin-bottom: 20px;
            color: var(--text);
        }
        
        .form-container {
            background-color: var(--surface);
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px var(--shadow);
        }
        
        .form-section {
            margin-bottom: 30px;
        }
        
        .form-section-title {
            font-size: 1.2rem;
            margin-bottom: 15px;
            color: var(--text);
            border-bottom: 2px solid var(--primary);
            padding-bottom: 5px;
        }
        
        .form-row {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .form-group {
            flex: 1;
            min-width: 300px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        input, select, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
        }
        
        textarea {
            min-height: 150px;
            resize: vertical;
        }
        
        .file-upload {
            border: 2px dashed var(--border);
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: border-color 0.2s, background-color 0.2s;
        }
        
        .file-upload:hover {
            border-color: var(--primary);
            background-color: rgba(79, 70, 229, 0.05);
        }
        
        .file-upload input {
            display: none;
        }
        
        .file-upload-label {
            display: block;
            font-weight: 500;
            color: var(--text);
            margin-bottom: 5px;
        }
        
        .file-upload-text {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        
        .voice-options {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        
        .voice-option {
            flex: 1;
            min-width: 200px;
            padding: 15px;
            border: 1px solid var(--border);
            border-radius: 6px;
            cursor: pointer;
            transition: border-color 0.2s, background-color 0.2s;
        }
        
        .voice-option:hover {
            border-color: var(--primary);
            background-color: rgba(79, 70, 229, 0.05);
        }
        
        .voice-option.selected {
            border-color: var(--primary);
            background-color: rgba(79, 70, 229, 0.1);
        }
        
        .voice-name {
            font-weight: 500;
            margin-bottom: 5px;
        }
        
        .voice-gender {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        .settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .setting-slider {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .setting-label {
            width: 100px;
        }
        
        .slider {
            flex: 1;
        }
        
        .slider-value {
            width: 50px;
            text-align: right;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 1rem;
            transition: background-color 0.2s, transform 0.2s;
        }
        
        .btn-primary {
            background-color: var(--primary);
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #4338ca;
            transform: translateY(-2px);
        }
        
        .btn-secondary {
            background-color: var(--secondary);
            color: white;
        }
        
        .btn-secondary:hover {
            background-color: #3b82f6;
            transform: translateY(-2px);
        }
        
        .btn-danger {
            background-color: #ef4444;
            color: white;
        }
        
        .btn-danger:hover {
            background-color: #dc2626;
            transform: translateY(-2px);
        }
        
        .preview-panel {
            margin-top: 30px;
            padding: 20px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background-color: var(--surface);
        }
        
        .preview-title {
            font-size: 1.1rem;
            margin-bottom: 15px;
            color: var(--text);
        }
        
        .preview-content {
            max-height: 200px;
            overflow-y: auto;
            padding: 10px;
            background-color: var(--background);
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .loading-spinner {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .loading-spinner::after {
            content: '';
            display: inline-block;
            width: 30px;
            height: 30px;
            border: 3px solid var(--primary);
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 15px;
            }
            
            nav ul {
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .page-title {
                font-size: 1.5rem;
            }
            
            .form-row {
                flex-direction: column;
                gap: 10px;
            }
            
            .form-group {
                min-width: 100%;
            }
            
            .voice-options {
                flex-direction: column;
            }
            
            .voice-option {
                min-width: 100%;
            }
            
            .settings-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container header-content">
            <div class="logo">Audiobook Generator</div>
            <nav>
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/dashboard">Dashboard</a></li>
                    <li><a href="/new-book" class="active">New Book</a></li>
                </ul>
            </nav>
        </div>
    </header>
    
    <main class="container">
        <h1 class="page-title">Create New Audiobook</h1>
        
        <div class="form-container">
            <form id="new-book-form">
                <div class="form-section">
                    <h2 class="form-section-title">Book Information</h2>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="title">Book Title *</label>
                            <input type="text" id="title" name="title" required>
                        </div>
                        <div class="form-group">
                            <label for="author">Author *</label>
                            <input type="text" id="author" name="author" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="language">Language</label>
                            <select id="language" name="language">
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="it">Italian</option>
                                <option value="pt">Portuguese</option>
                                <option value="ru">Russian</option>
                                <option value="ja">Japanese</option>
                                <option value="ko">Korean</option>
                                <option value="zh">Chinese</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="description">Description</label>
                            <textarea id="description" name="description" placeholder="Enter a brief description of your book..."></textarea>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h2 class="form-section-title">Manuscript</h2>
                    <div class="form-row">
                        <div class="form-group">
                            <div class="file-upload" id="file-upload">
                                <input type="file" id="manuscript-file" accept=".txt,.md">
                                <div class="file-upload-label">Upload Manuscript File</div>
                                <div class="file-upload-text">Supported formats: .txt, .md</div>
                            </div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="manuscript-text">Or paste manuscript text:</label>
                            <textarea id="manuscript-text" name="manuscript" placeholder="Paste your manuscript here..."></textarea>
                        </div>
                    </div>
                    <div class="preview-panel">
                        <h3 class="preview-title">Preview</h3>
                        <div class="preview-content" id="preview-content">Paste or upload your manuscript to see a preview here.</div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h2 class="form-section-title">Narration Settings</h2>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="narration-mode">Narration Mode</label>
                            <select id="narration-mode" name="narrationMode">
                                <option value="single">Single Voice</option>
                                <option value="dual">Dual Voice</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Choose Voice(s)</label>
                            <div class="voice-options" id="voice-options">
                                <!-- Voices will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h2 class="form-section-title">Audio Settings</h2>
                    <div class="settings-grid">
                        <div class="setting-slider">
                            <span class="setting-label">Speed:</span>
                            <input type="range" id="speed" name="speed" min="0.5" max="2.0" step="0.1" value="1.0" class="slider">
                            <span class="slider-value" id="speed-value">1.0</span>
                        </div>
                        <div class="setting-slider">
                            <span class="setting-label">Tone:</span>
                            <input type="range" id="tone" name="tone" min="-1.0" max="1.0" step="0.1" value="0.0" class="slider">
                            <span class="slider-value" id="tone-value">0.0</span>
                        </div>
                        <div class="setting-slider">
                            <span class="setting-label">Loudness:</span>
                            <input type="range" id="loudness" name="loudness" min="-1.0" max="1.0" step="0.1" value="0.0" class="slider">
                            <span class="slider-value" id="loudness-value">0.0</span>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <div class="form-row">
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Start Generation</button>
                            <button type="button" id="cancel-btn" class="btn btn-danger">Cancel</button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
        
        <div class="loading-spinner" id="loading-spinner"></div>
    </main>
    
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const form = document.getElementById('new-book-form');
            const manuscriptFileInput = document.getElementById('manuscript-file');
            const manuscriptTextInput = document.getElementById('manuscript-text');
            const previewContent = document.getElementById('preview-content');
            const fileUpload = document.getElementById('file-upload');
            const voiceOptionsContainer = document.getElementById('voice-options');
            const narrationModeSelect = document.getElementById('narration-mode');
            const speedSlider = document.getElementById('speed');
            const speedValue = document.getElementById('speed-value');
            const toneSlider = document.getElementById('tone');
            const toneValue = document.getElementById('tone-value');
            const loudnessSlider = document.getElementById('loudness');
            const loudnessValue = document.getElementById('loudness-value');
            const loadingSpinner = document.getElementById('loading-spinner');
            const cancelBtn = document.getElementById('cancel-btn');
            
            // Populate voice options
            const voices = [
                { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', language: 'en' },
                { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', language: 'en' },
                { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', language: 'en' },
                { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', language: 'en' },
                { id: 'MF3fxJYAyK2h2Nds6HSK', name: 'Elli', gender: 'female', language: 'en' },
                { id: 'TxGE5RpM3Aa1pijfZASu', name: 'Josh', gender: 'male', language: 'en' },
                { id: 'VR6AewLTigWG4rUd1GFykN', name: 'Arnold', gender: 'male', language: 'en' },
                { id: 'pNInz6obpgDQGcFmaJgB', name: 'Emily', gender: 'female', language: 'en' },
                { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Liam', gender: 'male', language: 'en' },
            ];
            
            // Render voice options
            renderVoiceOptions(voices);
            
            // Handle file upload
            fileUpload.addEventListener('click', () => {
                manuscriptFileInput.click();
            });
            
            manuscriptFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        manuscriptTextInput.value = event.target.result;
                        updatePreview();
                    };
                    reader.readAsText(file);
                }
            });
            
            // Update preview when text changes
            manuscriptTextInput.addEventListener('input', updatePreview);
            
            // Update slider values
            speedSlider.addEventListener('input', () => {
                speedValue.textContent = speedSlider.value;
            });
            
            toneSlider.addEventListener('input', () => {
                toneValue.textContent = toneSlider.value;
            });
            
            loudnessSlider.addEventListener('input', () => {
                loudnessValue.textContent = loudnessSlider.value;
            });
            
            // Handle narration mode change
            narrationModeSelect.addEventListener('change', () => {
                updateVoiceSelection();
            });
            
            // Handle form submission
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Show loading spinner
                loadingSpinner.style.display = 'block';
                
                try {
                    // Get form data
                    const formData = {
                        title: document.getElementById('title').value,
                        author: document.getElementById('author').value,
                        language: document.getElementById('language').value,
                        description: document.getElementById('description').value,
                        narrationMode: narrationModeSelect.value,
                        voice1: document.querySelector('.voice-option.selected:first-child')?.dataset.voiceId || voices[0].id,
                        voice2: document.querySelector('.voice-option.selected:nth-child(2)')?.dataset.voiceId || voices[1].id,
                        speed: parseFloat(speedSlider.value),
                        tone: parseFloat(toneSlider.value),
                        loudness: parseFloat(loudnessSlider.value),
                        manuscript: manuscriptTextInput.value
                    };
                    
                    // Validate required fields
                    if (!formData.title || !formData.author || !formData.manuscript) {
                        alert('Please fill in all required fields.');
                        loadingSpinner.style.display = 'none';
                        return;
                    }
                    
                    // Send request to create project
                    const response = await fetch('/api/projects', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    if (response.ok) {
                        const project = await response.json();
                        // Redirect to project page
                        window.location.href = '/project/' + project.id;
                    } else {
                        const error = await response.json();
                        alert('Error creating project: ' + (error.error || 'Unknown error'));
                        loadingSpinner.style.display = 'none';
                    }
                } catch (error) {
                    alert('Error creating project: ' + error.message);
                    loadingSpinner.style.display = 'none';
                }
            });
            
            // Cancel button
            cancelBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
                    window.location.href = '/dashboard';
                }
            });
            
            // Helper functions
            function renderVoiceOptions(voiceList) {
                voiceOptionsContainer.innerHTML = voiceList.map(voice => {
                    return \`
                        <div class="voice-option" data-voice-id="\${voice.id}" data-gender="\${voice.gender}">
                            <div class="voice-name">\${voice.name}</div>
                            <div class="voice-gender">\${voice.gender.charAt(0).toUpperCase() + voice.gender.slice(1)} • \${voice.language.toUpperCase()}</div>
                        </div>
                    \`;
                }).join('');
                
                // Add click handlers to voice options
                document.querySelectorAll('.voice-option').forEach(option => {
                    option.addEventListener('click', () => {
                        if (narrationModeSelect.value === 'single') {
                            // Clear all selections first
                            document.querySelectorAll('.voice-option').forEach(opt => opt.classList.remove('selected'));
                            // Select only this one
                            option.classList.add('selected');
                        } else {
                            // Toggle selection for dual voice
                            option.classList.toggle('selected');
                            
                            // Limit to 2 selections
                            const selected = document.querySelectorAll('.voice-option.selected');
                            if (selected.length > 2) {
                                selected[0].classList.remove('selected');
                            }
                        }
                    });
                });
            }
            
            function updateVoiceSelection() {
                // Clear all selections
                document.querySelectorAll('.voice-option').forEach(opt => opt.classList.remove('selected'));
                
                if (narrationModeSelect.value === 'single') {
                    // Select first voice by default
                    document.querySelector('.voice-option')?.classList.add('selected');
                } else {
                    // Select first two voices by default
                    document.querySelector('.voice-option')?.classList.add('selected');
                    document.querySelector('.voice-option:nth-child(2)')?.classList.add('selected');
                }
            }
            
            function updatePreview() {
                const text = manuscriptTextInput.value;
                if (text.length > 0) {
                    // Show first 500 characters or first 10 lines
                    const previewText = text.length > 500 ? text.substring(0, 500) + '...' : text;
                    previewContent.textContent = previewText;
                } else {
                    previewContent.textContent = 'Paste or upload your manuscript to see a preview here.';
                }
            }
        });
    </script>
</body>
</html>
    `;
    htmlResponse(res, html);
}

// Serve project page
function serveProjectPage(res, pathname) {
    const projectId = pathname.split('/')[2];
    const project = projects[projectId];
    
    if (!project) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>Project Not Found</h1>');
        return;
    }
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.title} | Audiobook Generator</title>
    <style>
        :root {
            --primary: #4f46e5;
            --secondary: #60a5fa;
            --accent: #10b981;
            --background: #f9fafb;
            --surface: #ffffff;
            --border: #e5e7eb;
            --text: #111827;
            --text-secondary: #6b7280;
            --shadow: rgba(0, 0, 0, 0.1);
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--background);
            color: var(--text);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background-color: var(--surface);
            padding: 20px;
            border-bottom: 1px solid var(--border);
            box-shadow: 0 2px 4px var(--shadow);
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: var(--primary);
        }
        
        nav ul {
            display: flex;
            list-style: none;
        }
        
        nav li {
            margin-left: 20px;
        }
        
        nav a {
            text-decoration: none;
            color: var(--text);
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        nav a:hover {
            background-color: var(--secondary);
            color: white;
        }
        
        nav a.active {
            background-color: var(--primary);
            color: white;
        }
        
        main {
            padding: 20px 0;
        }
        
        .page-title {
            font-size: 2rem;
            margin-bottom: 20px;
            color: var(--text);
        }
        
        .project-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding: 20px;
            background-color: var(--surface);
            border-radius: 8px;
            box-shadow: 0 2px 8px var(--shadow);
        }
        
        .project-info {
            flex: 1;
        }
        
        .project-title {
            font-size: 1.5rem;
            margin-bottom: 5px;
            color: var(--text);
        }
        
        .project-author {
            font-size: 1.1rem;
            color: var(--text-secondary);
            margin-bottom: 10px;
        }
        
        .project-meta {
            display: flex;
            gap: 20px;
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 10px;
        }
        
        .project-status {
            padding: 8px 16px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .status-created {
            background-color: #dbeafe;
            color: #2563eb;
        }
        
        .status-generating {
            background-color: #fef3c7;
            color: #f59e0b;
        }
        
        .status-completed {
            background-color: #dcfce7;
            color: #16a34a;
        }
        
        .status-paused {
            background-color: #f3f4f6;
            color: #6b7280;
        }
        
        .status-failed {
            background-color: #fee2e2;
            color: #dc2626;
        }
        
        .project-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s, transform 0.2s;
        }
        
        .btn-primary {
            background-color: var(--primary);
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #4338ca;
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background-color: var(--secondary);
            color: white;
        }
        
        .btn-secondary:hover {
            background-color: #3b82f6;
            transform: translateY(-1px);
        }
        
        .btn-success {
            background-color: var(--success);
            color: white;
        }
        
        .btn-success:hover {
            background-color: #059669;
            transform: translateY(-1px);
        }
        
        .btn-warning {
            background-color: var(--warning);
            color: white;
        }
        
        .btn-warning:hover {
            background-color: #eab308;
            transform: translateY(-1px);
        }
        
        .btn-danger {
            background-color: var(--danger);
            color: white;
        }
        
        .btn-danger:hover {
            background-color: #dc2626;
            transform: translateY(-1px);
        }
        
        .btn-outline {
            background-color: transparent;
            border: 1px solid var(--border);
            color: var(--text);
        }
        
        .btn-outline:hover {
            background-color: var(--border);
        }
        
        .tabs {
            display: flex;
            border-bottom: 1px solid var(--border);
            margin-bottom: 20px;
        }
        
        .tab {
            padding: 12px 24px;
            cursor: pointer;
            font-weight: 500;
            border-bottom: 3px solid transparent;
            transition: border-color 0.2s;
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
        
        .chapter-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .chapter-item {
            background-color: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px var(--shadow);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .chapter-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px var(--shadow);
        }
        
        .chapter-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background-color: var(--primary);
            color: white;
        }
        
        .chapter-title {
            font-size: 1.1rem;
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .chapter-status {
            font-size: 0.8rem;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 500;
        }
        
        .chapter-body {
            padding: 20px;
        }
        
        .chapter-progress {
            margin-bottom: 15px;
        }
        
        .progress-bar {
            height: 8px;
            background-color: var(--border);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 5px;
        }
        
        .progress-fill {
            height: 100%;
            background-color: var(--primary);
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .progress-text {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        .segment-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .segment-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background-color: var(--background);
            border: 1px solid var(--border);
            border-radius: 4px;
        }
        
        .segment-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .segment-number {
            font-weight: 500;
            min-width: 30px;
        }
        
        .segment-voice {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
        }
        
        .voice-female {
            background-color: #fbcfe8;
            color: #be185d;
        }
        
        .voice-male {
            background-color: #dbeafe;
            color: #2563eb;
        }
        
        .segment-actions {
            display: flex;
            gap: 5px;
        }
        
        .segment-action-btn {
            padding: 4px 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: background-color 0.2s;
        }
        
        .segment-action-btn:hover {
            transform: scale(1.05);
        }
        
        .segment-action-btn.play {
            background-color: var(--secondary);
            color: white;
        }
        
        .segment-action-btn.rerender {
            background-color: var(--warning);
            color: white;
        }
        
        .segment-action-btn.download {
            background-color: var(--accent);
            color: white;
        }
        
        .audio-player {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
        }
        
        .audio-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .play-pause-btn {
            padding: 8px;
            border: none;
            border-radius: 50%;
            background-color: var(--primary);
            color: white;
            cursor: pointer;
            font-size: 1.2rem;
        }
        
        .play-pause-btn:hover {
            background-color: #4338ca;
        }
        
        .timeline {
            flex: 1;
            height: 6px;
            background-color: var(--border);
            border-radius: 3px;
            cursor: pointer;
            position: relative;
        }
        
        .progress-indicator {
            height: 100%;
            background-color: var(--primary);
            width: 0%;
            border-radius: 3px;
        }
        
        .time-display {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        .waveform-container {
            height: 60px;
            background-color: var(--background);
            border: 1px solid var(--border);
            border-radius: 4px;
            margin-top: 10px;
            overflow: hidden;
        }
        
        .waveform {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
        }
        
        .waveform-bar {
            width: 2px;
            background-color: var(--primary);
            height: 60%;
            margin: 0 1px;
            border-radius: 1px;
        }
        
        .waveform-bar.voice2 {
            background-color: var(--secondary);
        }
        
        .activity-log {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .log-entry {
            padding: 8px 12px;
            margin-bottom: 8px;
            border-radius: 4px;
            background-color: var(--background);
            border-left: 4px solid var(--primary);
        }
        
        .log-entry.info {
            border-left-color: var(--primary);
        }
        
        .log-entry.success {
            border-left-color: var(--success);
        }
        
        .log-entry.warning {
            border-left-color: var(--warning);
        }
        
        .log-entry.error {
            border-left-color: var(--danger);
        }
        
        .log-timestamp {
            font-size: 0.7rem;
            color: var(--text-secondary);
            margin-right: 8px;
        }
        
        .log-message {
            font-size: 0.9rem;
        }
        
        .export-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        .export-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s, transform 0.2s;
        }
        
        .export-btn.primary {
            background-color: var(--primary);
            color: white;
        }
        
        .export-btn.primary:hover {
            background-color: #4338ca;
            transform: translateY(-2px);
        }
        
        .export-btn.secondary {
            background-color: var(--secondary);
            color: white;
        }
        
        .export-btn.secondary:hover {
            background-color: #3b82f6;
            transform: translateY(-2px);
        }
        
        .export-btn.success {
            background-color: var(--success);
            color: white;
        }
        
        .export-btn.success:hover {
            background-color: #059669;
            transform: translateY(-2px);
        }
        
        .loading-spinner {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .loading-spinner::after {
            content: '';
            display: inline-block;
            width: 30px;
            height: 30px;
            border: 3px solid var(--primary);
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 15px;
            }
            
            nav ul {
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .page-title {
                font-size: 1.5rem;
            }
            
            .project-header {
                flex-direction: column;
                gap: 15px;
            }
            
            .project-info {
                width: 100%;
            }
            
            .project-actions {
                width: 100%;
                flex-wrap: wrap;
            }
            
            .chapter-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .chapter-title {
                width: 100%;
            }
            
            .segment-item {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .segment-info {
                width: 100%;
            }
            
            .segment-actions {
                width: 100%;
                justify-content: space-between;
            }
            
            .audio-controls {
                flex-direction: column;
            }
            
            .timeline {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container header-content">
            <div class="logo">Audiobook Generator</div>
            <nav>
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/dashboard">Dashboard</a></li>
                    <li><a href="/new-book">New Book</a></li>
                </ul>
            </nav>
        </div>
    </header>
    
    <main class="container">
        <h1 class="page-title">${project.title}</h1>
        
        <div class="project-header">
            <div class="project-info">
                <h2 class="project-title">${project.title}</h2>
                <p class="project-author">by ${project.author}</p>
                <div class="project-meta">
                    <span>Language: ${project.language.toUpperCase()}</span>
                    <span>Created: ${new Date(project.createdAt).toLocaleDateString()}</span>
                    <span>Status: <span class="project-status ${getStatusClass(project.status)}">${getStatusText(project.status)}</span></span>
                </div>
            </div>
            <div class="project-actions">
                <button id="start-btn" class="btn btn-primary">Start Generation</button>
                <button id="pause-btn" class="btn btn-warning">Pause</button>
                <button id="resume-btn" class="btn btn-secondary">Resume</button>
                <button id="export-btn" class="btn btn-success">Export Full Book</button>
            </div>
        </div>
        
        <div class="tabs">
            <div class="tab active" data-tab="chapters">Chapters</div>
            <div class="tab" data-tab="segments">Segments</div>
            <div class="tab" data-tab="activity">Activity Log</div>
        </div>
        
        <div class="tab-content active" id="chapters-tab">
            <div class="chapter-list" id="chapter-list">
                <!-- Chapters will be loaded here via JavaScript -->
            </div>
        </div>
        
        <div class="tab-content" id="segments-tab">
            <div class="segment-list" id="segment-list">
                <!-- Segments will be loaded here via JavaScript -->
            </div>
        </div>
        
        <div class="tab-content" id="activity-tab">
            <div class="activity-log" id="activity-log">
                <!-- Activity log will be loaded here via JavaScript -->
            </div>
        </div>
        
        <div class="export-buttons">
            <button id="export-chapter-btn" class="export-btn primary">Download Chapter</button>
            <button id="export-full-btn" class="export-btn success">Export Full Audiobook</button>
        </div>
        
        <div class="loading-spinner" id="loading-spinner"></div>
    </main>
    
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const projectId = '${projectId}';
            const chapterList = document.getElementById('chapter-list');
            const segmentList = document.getElementById('segment-list');
            const activityLog = document.getElementById('activity-log');
            const startBtn = document.getElementById('start-btn');
            const pauseBtn = document.getElementById('pause-btn');
            const resumeBtn = document.getElementById('resume-btn');
            const exportBtn = document.getElementById('export-btn');
            const exportChapterBtn = document.getElementById('export-chapter-btn');
            const exportFullBtn = document.getElementById('export-full-btn');
            const loadingSpinner = document.getElementById('loading-spinner');
            const tabs = document.querySelectorAll('.tab');
            const tabContents = document.querySelectorAll('.tab-content');
            
            // Initialize project data
            let project = ${JSON.stringify(project)};
            
            // Set up tab switching
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tabContents.forEach(tc => tc.classList.remove('active'));
                    
                    tab.classList.add('active');
                    document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
                });
            });
            
            // Load project data
            loadProjectData();
            
            // Set up button handlers
            startBtn.addEventListener('click', startGeneration);
            pauseBtn.addEventListener('click', pauseGeneration);
            resumeBtn.addEventListener('click', resumeGeneration);
            exportBtn.addEventListener('click', exportFullBook);
            exportChapterBtn.addEventListener('click', downloadChapter);
            exportFullBtn.addEventListener('click', exportFullBook);
            
            // Function to load project data
            async function loadProjectData() {
                try {
                    const response = await fetch(\`/api/project/\${projectId}\`);
                    if (response.ok) {
                        project = await response.json();
                        renderChapters();
                        renderSegments();
                        renderActivityLog();
                    }
                } catch (error) {
                    console.error('Error loading project data:', error);
                }
            }
            
            // Render chapters
            function renderChapters() {
                chapterList.innerHTML = project.chapters.map((chapter, index) => {
                    const progress = chapter.status === 'completed' ? 100 : chapter.progress || 0;
                    const statusClass = getStatusClass(chapter.status);
                    const statusText = getStatusText(chapter.status);
                    
                    return \`
                        <div class="chapter-item">
                            <div class="chapter-header">
                                <div class="chapter-title">Chapter \${index + 1}: \${chapter.title}</div>
                                <div class="chapter-status \${statusClass}">\${statusText}</div>
                            </div>
                            <div class="chapter-body">
                                <div class="chapter-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: \${progress}%"></div>
                                    </div>
                                    <div class="progress-text">\${progress}% Complete</div>
                                </div>
                                <div class="segment-list">
                                    \${chapter.segments.map(segment => {
                                        const voiceClass = segment.voice ? (getVoiceGender(segment.voice) === 'female' ? 'voice-female' : 'voice-male') : 'voice-male';
                                        const voiceName = getVoiceName(segment.voice);
                                        
                                        return \`
                                            <div class="segment-item">
                                                <div class="segment-info">
                                                    <span class="segment-number">Seg \${segment.index + 1}</span>
                                                    <span class="segment-voice \${voiceClass}">\${voiceName}</span>
                                                </div>
                                                <div class="segment-actions">
                                                    <button class="segment-action-btn play" data-segment-id="\${segment.id}">Play</button>
                                                    <button class="segment-action-btn rerender" data-segment-id="\${segment.id}">Rerender</button>
                                                    <button class="segment-action-btn download" data-segment-id="\${segment.id}">Download</button>
                                                </div>
                                            </div>
                                        \`;
                                    }).join('')}
                                </div>
                                <div class="audio-player">
                                    <div class="audio-controls">
                                        <button class="play-pause-btn" data-chapter-index="\${index}">▶</button>
                                        <div class="timeline">
                                            <div class="progress-indicator" style="width: 0%"></div>
                                        </div>
                                        <div class="time-display">0:00 / 0:00</div>
                                    </div>
                                    <div class="waveform-container">
                                        <div class="waveform" id="waveform-\${chapter.id}">
                                            \${Array.from({ length: 50 }, (_, i) => {
                                                const voiceClass = i % 2 === 0 ? '' : 'voice2';
                                                return \`<div class="waveform-bar \${voiceClass}"></div>\`;
                                            }).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`;
                }).join('');
                
                // Add event listeners to play buttons
                document.querySelectorAll('.segment-action-btn.play').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const segmentId = e.target.dataset.segmentId;
                        playSegment(segmentId);
                    });
                });
                
                // Add event listeners to rerender buttons
                document.querySelectorAll('.segment-action-btn.rerender').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const segmentId = e.target.dataset.segmentId;
                        rerenderSegment(segmentId);
                    });
                });
                
                // Add event listeners to download buttons
                document.querySelectorAll('.segment-action-btn.download').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const segmentId = e.target.dataset.segmentId;
                        downloadSegment(segmentId);
                    });
                });
                
                // Add event listeners to chapter play buttons
                document.querySelectorAll('.play-pause-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const chapterIndex = parseInt(e.target.dataset.chapterIndex);
                        toggleChapterPlayback(chapterIndex);
                    });
                });
            }
            
            // Render segments
            function renderSegments() {
                segmentList.innerHTML = project.chapters.flatMap((chapter, chapterIndex) => {
                    return chapter.segments.map((segment, segmentIndex) => {
                        const progress = segment.status === 'completed' ? 100 : segment.progress || 0;
                        const statusClass = getStatusClass(segment.status);
                        const statusText = getStatusText(segment.status);
                        const voiceClass = segment.voice ? (getVoiceGender(segment.voice) === 'female' ? 'voice-female' : 'voice-male') : 'voice-male';
                        const voiceName = getVoiceName(segment.voice);
                        
                        return \`
                            <div class="segment-item">
                                <div class="segment-info">
                                    <span class="segment-number">Ch\${chapterIndex + 1}-Seg\${segmentIndex + 1}</span>
                                    <span class="segment-voice \${voiceClass}">\${voiceName}</span>
                                    <span class="segment-status \${statusClass}">\${statusText}</span>
                                </div>
                                <div class="segment-actions">
                                    <button class="segment-action-btn play" data-segment-id="\${segment.id}">Play</button>
                                    <button class="segment-action-btn rerender" data-segment-id="\${segment.id}">Rerender</button>
                                    <button class="segment-action-btn download" data-segment-id="\${segment.id}">Download</button>
                                </div>
                            </div>
                        \`;
                    });
                }).join('');
                
                // Add event listeners to play buttons
                document.querySelectorAll('.segment-action-btn.play').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const segmentId = e.target.dataset.segmentId;
                        playSegment(segmentId);
                    });
                });
                
                // Add event listeners to rerender buttons
                document.querySelectorAll('.segment-action-btn.rerender').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const segmentId = e.target.dataset.segmentId;
                        rerenderSegment(segmentId);
                    });
                });
                
                // Add event listeners to download buttons
                document.querySelectorAll('.segment-action-btn.download').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const segmentId = e.target.dataset.segmentId;
                        downloadSegment(segmentId);
                    });
                });
            }
            
            // Render activity log
            function renderActivityLog() {
                // In a real app, this would fetch from a server
                // For now, we'll show some sample entries
                const logEntries = [
                    { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Project created successfully' },
                    { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Starting generation process' },
                    { timestamp: new Date().toLocaleTimeString(), level: 'success', message: 'Chapter 1 completed successfully' },
                    { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Processing Chapter 2 segments' },
                    { timestamp: new Date().toLocaleTimeString(), level: 'warning', message: 'Segment 3 took longer than expected' },
                    { timestamp: new Date().toLocaleTimeString(), level: 'success', message: 'Chapter 2 completed successfully' }
                ];
                
                activityLog.innerHTML = logEntries.map(entry => {
                    return \`
                        <div class="log-entry \${entry.level}">
                            <span class="log-timestamp">\${entry.timestamp}</span>
                            <span class="log-message">\${entry.message}</span>
                        </div>
                    \`;
                }).join('');
            }
            
            // Start generation
            async function startGeneration() {
                if (project.status === 'completed') {
                    if (!confirm('This project is already completed. Do you want to regenerate it?')) {
                        return;
                    }
                }
                
                loadingSpinner.style.display = 'block';
                
                try {
                    const response = await fetch(\`/api/project/\${projectId}\`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ action: 'start' })
                    });
                    
                    if (response.ok) {
                        // Update project status
                        project.status = 'generating';
                        renderChapters();
                        renderSegments();
                    } else {
                        const error = await response.json();
                        alert('Error starting generation: ' + (error.error || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error starting generation: ' + error.message);
                } finally {
                    loadingSpinner.style.display = 'none';
                }
            }
            
            // Pause generation
            async function pauseGeneration() {
                loadingSpinner.style.display = 'block';
                
                try {
                    const response = await fetch(\`/api/project/\${projectId}\`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ action: 'pause' })
                    });
                    
                    if (response.ok) {
                        // Update project status
                        project.status = 'paused';
                        renderChapters();
                        renderSegments();
                    } else {
                        const error = await response.json();
                        alert('Error pausing generation: ' + (error.error || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error pausing generation: ' + error.message);
                } finally {
                    loadingSpinner.style.display = 'none';
                }
            }
            
            // Resume generation
            async function resumeGeneration() {
                loadingSpinner.style.display = 'block';
                
                try {
                    const response = await fetch(\`/api/project/\${projectId}\`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ action: 'resume' })
                    });
                    
                    if (response.ok) {
                        // Update project status
                        project.status = 'generating';
                        renderChapters();
                        renderSegments();
                    } else {
                        const error = await response.json();
                        alert('Error resuming generation: ' + (error.error || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error resuming generation: ' + error.message);
                } finally {
                    loadingSpinner.style.display = 'none';
                }
            }
            
            // Export full book
            async function exportFullBook() {
                if (project.status !== 'completed') {
                    if (!confirm('The project is not completed. Do you want to export anyway?')) {
                        return;
                    }
                }
                
                loadingSpinner.style.display = 'block';
                
                try {
                    const response = await fetch(\`/api/project/\${projectId}\`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ action: 'exportBook' })
                    });
                    
                    if (response.ok) {
                        // Download the book
                        const bookUrl = \`/api/project/\${projectId}/book\`;
                        window.location.href = bookUrl;
                    } else {
                        const error = await response.json();
                        alert('Error exporting book: ' + (error.error || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error exporting book: ' + error.message);
                } finally {
                    loadingSpinner.style.display = 'none';
                }
            }
            
            // Download chapter
            async function downloadChapter() {
                const chapterIndex = prompt('Enter chapter number to download (1-' + project.chapters.length + '):');
                if (!chapterIndex || isNaN(chapterIndex) || chapterIndex < 1 || chapterIndex > project.chapters.length) {
                    alert('Invalid chapter number');
                    return;
                }
                
                loadingSpinner.style.display = 'block';
                
                try {
                    const response = await fetch(\`/api/project/\${projectId}\`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            action: 'downloadChapter', 
                            chapterIndex: parseInt(chapterIndex) - 1 
                        })
                    });
                    
                    if (response.ok) {
                        // The server will handle the download
                        // In a real app, we might need to handle the download differently
                    } else {
                        const error = await response.json();
                        alert('Error downloading chapter: ' + (error.error || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error downloading chapter: ' + error.message);
                } finally {
                    loadingSpinner.style.display = 'none';
                }
            }
            
            // Play segment
            function playSegment(segmentId) {
                alert('Playing segment ' + segmentId + ' - This feature requires audio player implementation.');
            }
            
            // Rerender segment
            async function rerenderSegment(segmentId) {
                loadingSpinner.style.display = 'block';
                
                try {
                    const response = await fetch(\`/api/project/\${projectId}\`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            action: 'rerender', 
                            segmentId: segmentId 
                        })
                    });
                    
                    if (response.ok) {
                        // Refresh project data
                        loadProjectData();
                    } else {
                        const error = await response.json();
                        alert('Error rerendering segment: ' + (error.error || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error rerendering segment: ' + error.message);
                } finally {
                    loadingSpinner.style.display = 'none';
                }
            }
            
            // Download segment
            function downloadSegment(segmentId) {
                alert('Downloading segment ' + segmentId + ' - This feature requires file download implementation.');
            }
            
            // Toggle chapter playback
            function toggleChapterPlayback(chapterIndex) {
                alert('Playing chapter ' + (chapterIndex + 1) + ' - This feature requires audio player implementation.');
            }
            
            // Helper functions
            function getStatusClass(status) {
                switch (status) {
                    case 'created': return 'status-created';
                    case 'generating': return 'status-generating';
                    case 'completed': return 'status-completed';
                    case 'paused': return 'status-paused';
                    case 'failed': return 'status-failed';
                    default: return 'status-created';
                }
            }
            
            function getStatusText(status) {
                switch (status) {
                    case 'created': return 'Created';
                    case 'generating': return 'Generating';
                    case 'completed': return 'Completed';
                    case 'paused': return 'Paused';
                    case 'failed': return 'Failed';
                    default: return 'Created';
                }
            }
            
            function getVoiceName(voiceId) {
                const voice = voices.find(v => v.id === voiceId);
                return voice ? voice.name : 'Unknown Voice';
            }
            
            function getVoiceGender(voiceId) {
                const voice = voices.find(v => v.id === voiceId);
                return voice ? voice.gender : 'male';
            }
            
            const voices = [
                { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', language: 'en' },
                { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', language: 'en' },
                { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', language: 'en' },
                { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', language: 'en' },
                { id: 'MF3fxJYAyK2h2Nds6HSK', name: 'Elli', gender: 'female', language: 'en' },
                { id: 'TxGE5RpM3Aa1pijfZASu', name: 'Josh', gender: 'male', language: 'en' },
                { id: 'VR6AewLTigWG4rUd1GFykN', name: 'Arnold', gender: 'male', language: 'en' },
                { id: 'pNInz6obpgDQGcFmaJgB', name: 'Emily', gender: 'female', language: 'en' },
                { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Liam', gender: 'male', language: 'en' },
            ];
        });
    </script>
</body>
</html>
    `;
    htmlResponse(res, html);
}

// Start the server
server.listen(PORT, () => {
    console.log(`Audiobook Generator is running on http://localhost:${PORT}`);
    console.log('Open your browser to view the application.');
    
    // Open browser automatically
    const open = require('open');
    open(`http://localhost:${PORT}`);
});