const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');
const os = require('os');

const PORT = 3000;
const API_KEY = process.env.ELEVENLABS_API_KEY;
const OUTPUT_DIR = path.join(process.cwd(), 'output');
const PROJECTS_DIR = path.join(os.homedir(), '.audiobook_app_projects');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.mp3': 'audio/mpeg',
    '.json': 'application/json'
};

// --- UTILITY FUNCTIONS ---

const log = (projectId, message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${projectId}] ${message}`);
    const project = getProject(projectId);
    if (project) {
        project.log.push({ timestamp, message });
        saveProject(project);
        sendUpdate(projectId, { type: 'log', message });
    }
};

const sendUpdate = (projectId, data) => {
    const clients = sseClients[projectId] || [];
    clients.forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`));
};

const makeDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// --- PROJECT MANAGEMENT ---

const getProjects = () => {
    if (!fs.existsSync(PROJECTS_DIR)) return [];
    return fs.readdirSync(PROJECTS_DIR)
        .filter(file => file.endsWith('.json'))
        .map(file => JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf-8')))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getProject = (id) => {
    const projectPath = path.join(PROJECTS_DIR, `${id}.json`);
    if (!fs.existsSync(projectPath)) return null;
    return JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
};

const saveProject = (project) => {
    makeDir(PROJECTS_DIR);
    const projectPath = path.join(PROJECTS_DIR, `${project.id}.json`);
    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
};

// --- CORE AUDIOBOOK GENERATION LOGIC ---

let generationQueue = [];
let isGenerating = false;
let pausedProjects = new Set();

const startGenerationProcess = async (projectId) => {
    if (generationQueue.includes(projectId) || isGenerating) {
        if (!generationQueue.includes(projectId)) generationQueue.push(projectId);
        log(projectId, "Generation is already in progress. Queued project.");
        return;
    }
    
    generationQueue.push(projectId);
    processQueue();
};

const processQueue = async () => {
    if (isGenerating || generationQueue.length === 0) return;
    isGenerating = true;
    
    const projectId = generationQueue.shift();
    if (pausedProjects.has(projectId)) {
        isGenerating = false;
        log(projectId, "Skipping paused project.");
        processQueue(); // Try next in queue
        return;
    }

    const project = getProject(projectId);
    log(projectId, "Starting generation.");
    project.status = 'processing';
    saveProject(project);
    sendUpdate(projectId, { type: 'status', status: 'processing' });
    
    const projectOutputDir = path.join(OUTPUT_DIR, projectId);
    const chunksDir = path.join(projectOutputDir, 'chunks');
    const chaptersDir = path.join(projectOutputDir, 'chapters');
    makeDir(chunksDir);
    makeDir(chaptersDir);

    for (let i = 0; i < project.chapters.length; i++) {
        if (pausedProjects.has(projectId)) {
            log(projectId, "Generation paused.");
            project.status = 'paused';
            saveProject(project);
            sendUpdate(projectId, { type: 'status', status: 'paused' });
            isGenerating = false;
            return;
        }

        const chapter = project.chapters[i];
        if (chapter.status === 'completed') continue;

        chapter.status = 'processing';
        log(projectId, `Processing Chapter ${i + 1}: ${chapter.title}`);
        sendUpdate(projectId, { type: 'chapter_status', chapterIndex: i, status: 'processing' });

        const segmentFiles = [];
        for (let j = 0; j < chapter.segments.length; j++) {
            const segment = chapter.segments[j];
            if (segment.status === 'completed') {
                segmentFiles.push(segment.filePath);
                continue;
            }

            try {
                log(projectId, `Generating audio for Chapter ${i + 1}, Segment ${j + 1}`);
                const audioData = await generateAudio(segment.text, segment.voice, project.audioSettings);
                const segmentFile = path.join(chunksDir, `chapter_${i}_segment_${j}.mp3`);
                fs.writeFileSync(segmentFile, audioData);
                
                segment.status = 'completed';
                segment.filePath = segmentFile;
                segmentFiles.push(segmentFile);

                const progress = ((j + 1) / chapter.segments.length) * 100;
                sendUpdate(projectId, { type: 'segment_progress', chapterIndex: i, segmentIndex: j, progress: 100 });
                saveProject(project);
            } catch (error) {
                log(projectId, `Error generating segment ${j+1} of chapter ${i+1}: ${error.message}`);
                chapter.status = 'failed';
                project.status = 'failed';
                sendUpdate(projectId, { type: 'chapter_status', chapterIndex: i, status: 'failed' });
                sendUpdate(projectId, { type: 'status', status: 'failed' });
                saveProject(project);
                isGenerating = false;
                processQueue();
                return;
            }
        }
        
        log(projectId, `Merging segments for Chapter ${i + 1}`);
        const chapterFile = path.join(chaptersDir, `chapter_${i + 1}.mp3`);
        await mergeAudioFiles(segmentFiles, chapterFile);
        
        chapter.status = 'completed';
        chapter.filePath = chapterFile;
        project.progress = ((i + 1) / project.chapters.length) * 100;
        saveProject(project);

        log(projectId, `Chapter ${i + 1} completed.`);
        sendUpdate(projectId, { type: 'chapter_status', chapterIndex: i, status: 'completed', filePath: `/output/${projectId}/chapters/chapter_${i + 1}.mp3` });
        sendUpdate(projectId, { type: 'progress', progress: project.progress });
    }

    log(projectId, "Merging all chapters into a full audiobook.");
    const chapterFiles = project.chapters.map(c => c.filePath).filter(Boolean);
    const fullBookPath = path.join(projectOutputDir, 'book.mp3');
    await mergeAudioFiles(chapterFiles, fullBookPath);
    
    project.status = 'completed';
    project.fullBookPath = fullBookPath;
    saveProject(project);
    log(projectId, "Audiobook generation complete.");
    sendUpdate(projectId, { type: 'status', status: 'completed', filePath: `/output/${projectId}/book.mp3` });

    isGenerating = false;
    processQueue();
};


const generateAudio = (text, voiceId, settings) => {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: settings.stability || 0.7,
                similarity_boost: settings.similarity || 0.75,
            }
        });

        const options = {
            hostname: 'api.elevenlabs.io',
            path: `/v1/text-to-speech/${voiceId}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': API_KEY,
                'Accept': 'audio/mpeg'
            }
        };

        const req = http.request(options, res => {
            if (res.statusCode !== 200) {
                let errorData = '';
                res.on('data', chunk => errorData += chunk);
                res.on('end', () => reject(new Error(`ElevenLabs API Error: ${res.statusCode} - ${errorData}`)));
                return;
            }
            
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });

        req.on('error', e => reject(e));
        req.write(body);
        req.end();
    });
};

const mergeAudioFiles = (files, outputFile) => {
    return new Promise((resolve, reject) => {
        const ffmpegPath = os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
        const fileList = files.map(f => `file '${path.resolve(f)}'`).join('\n');
        const listPath = path.join(path.dirname(outputFile), `concat_${crypto.randomBytes(4).toString('hex')}.txt`);
        fs.writeFileSync(listPath, fileList);

        const command = `${ffmpegPath} -f concat -safe 0 -i "${listPath}" -c copy "${outputFile}"`;

        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(listPath);
            if (error) {
                console.error(`ffmpeg error: ${stderr}`);
                return reject(error);
            }
            resolve(outputFile);
        });
    });
};


// --- TEXT PROCESSING ---

const processManuscript = (text, mode, voice1, voice2) => {
    const chapters = text.split(/^(Chapter \d+|# .+)/m).filter(Boolean);
    const processedChapters = [];

    for (let i = 0; i < chapters.length; i += 2) {
        const title = chapters[i].trim();
        const content = chapters[i + 1] || '';
        const segments = createSegments(content, mode, voice1, voice2);
        processedChapters.push({ title, segments, status: 'pending' });
    }

    return processedChapters;
};

const createSegments = (chapterText, mode, voice1, voice2) => {
    let currentVoice = voice1;
    let segments = [];
    
    const textBlocks = (mode === 'dual') ? chapterText.split('***') : [chapterText];

    for (const block of textBlocks) {
        if (!block.trim()) continue;

        const sentences = block.match(/[^.!?]+[.!?]+/g) || [block];
        let currentSegment = '';

        for (const sentence of sentences) {
            if ((currentSegment + sentence).length > 2500) { // ElevenLabs optimal segment length
                segments.push({ text: currentSegment, voice: currentVoice, status: 'pending' });
                currentSegment = sentence;
            } else {
                currentSegment += sentence;
            }
        }
        if (currentSegment) {
            segments.push({ text: currentSegment, voice: currentVoice, status: 'pending' });
        }
        
        if (mode === 'dual') {
            currentVoice = (currentVoice === voice1) ? voice2 : voice1;
        }
    }
    return segments;
};


// --- HTTP SERVER ---
let sseClients = {};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const { pathname } = url;

    // API Routes
    if (pathname.startsWith('/api/')) {
        handleApiRequest(req, res, pathname);
    } 
    // SSE Route
    else if (pathname.startsWith('/updates/')) {
        const projectId = pathname.split('/')[2];
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });
        
        if (!sseClients[projectId]) sseClients[projectId] = [];
        const clientId = Date.now();
        sseClients[projectId].push({ id: clientId, res });

        req.on('close', () => {
            sseClients[projectId] = sseClients[projectId].filter(c => c.id !== clientId);
        });
    }
    // Static file serving for generated audio
    else if (pathname.startsWith('/output/')) {
        const filePath = path.join(OUTPUT_DIR, pathname.replace('/output/', ''));
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404);
            res.end('File not found');
        }
    }
    // Main App Route
    else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getHtml());
    }
});

const handleApiRequest = (req, res, pathname) => {
    res.setHeader('Content-Type', 'application/json');
    let body = '';
    req.on('data', chunk => body += chunk.toString());

    req.on('end', async () => {
        const data = body ? JSON.parse(body) : {};

        // Get voices from ElevenLabs
        if (pathname === '/api/voices' && req.method === 'GET') {
            try {
                if (!API_KEY) throw new Error('ElevenLabs API key not set.');
                const options = {
                    hostname: 'api.elevenlabs.io',
                    path: '/v1/voices',
                    method: 'GET',
                    headers: { 'xi-api-key': API_KEY }
                };
                const proxyReq = http.request(options, (proxyRes) => {
                    let voiceData = '';
                    proxyRes.on('data', chunk => voiceData += chunk);
                    proxyRes.on('end', () => {
                        res.writeHead(proxyRes.statusCode);
                        res.end(voiceData);
                    });
                });
                proxyReq.on('error', e => {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: e.message }));
                });
                proxyReq.end();
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        }
        
        // Project routes
        else if (pathname === '/api/projects' && req.method === 'GET') {
            res.end(JSON.stringify(getProjects()));
        }
        else if (pathname === '/api/projects' && req.method === 'POST') {
            const projectId = crypto.randomBytes(8).toString('hex');
            const chapters = processManuscript(data.manuscript, data.mode, data.voice1, data.voice2);
            const project = {
                id: projectId,
                title: data.title,
                author: data.author,
                ...data,
                chapters,
                status: 'pending',
                progress: 0,
                log: [],
                createdAt: new Date().toISOString()
            };
            saveProject(project);
            res.end(JSON.stringify(project));
        }
        else if (pathname.match(/^\/api\/projects\/([a-zA-Z0-9]+)$/) && req.method === 'GET') {
            const id = pathname.split('/')[3];
            const project = getProject(id);
            if (project) {
                res.end(JSON.stringify(project));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: "Project not found" }));
            }
        }
        else if (pathname.match(/^\/api\/projects\/([a-zA-Z0-9]+)\/generate$/) && req.method === 'POST') {
            const id = pathname.split('/')[3];
            pausedProjects.delete(id);
            startGenerationProcess(id);
            res.end(JSON.stringify({ message: 'Generation started' }));
        }
        else if (pathname.match(/^\/api\/projects\/([a-zA-Z0-9]+)\/pause$/) && req.method === 'POST') {
            const id = pathname.split('/')[3];
            pausedProjects.add(id);
            res.end(JSON.stringify({ message: 'Pausing generation' }));
        }
        else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'API route not found' }));
        }
    });
};

server.listen(PORT, () => {
    console.log(`Audiobook App running at http://localhost:${PORT}`);
    if (!API_KEY) {
        console.warn('WARNING: ELEVENLABS_API_KEY environment variable not set.');
        console.warn('The application will not be able to generate audio.');
    }
    exec(`command -v ffmpeg`, (error, stdout, stderr) => {
        if(error) {
            console.warn('WARNING: ffmpeg not found in PATH. Audio file merging will fail.');
            console.warn('Please install ffmpeg and ensure it is available in your system\'s PATH.');
        }
    });
    makeDir(OUTPUT_DIR);
    makeDir(PROJECTS_DIR);
});


// --- FRONT-END APPLICATION (HTML, CSS, JS) ---

const getHtml = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audiobook Generator</title>
    <script src="https://unpkg.com/wavesurfer.js"></script>
    <style>
        :root {
            --bg-color: #121212;
            --primary-color: #1DB954;
            --card-bg: #181818;
            --text-color: #FFFFFF;
            --text-muted: #B3B3B3;
            --border-color: #282828;
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        body {
            font-family: var(--font-family);
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1, h2 { color: var(--primary-color); }
        button {
            background-color: var(--primary-color);
            color: var(--text-color);
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        button:hover { background-color: #1ED760; }
        button:disabled { background-color: #535353; cursor: not-allowed; }
        .card { background: var(--card-bg); padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid var(--border-color); }
        .hidden { display: none; }
        #dashboard-view .project-card { cursor: pointer; }
        #dashboard-view .project-card:hover { background: #282828; }
        input, textarea, select {
            width: 100%;
            padding: 10px;
            background: #282828;
            border: 1px solid #404040;
            color: var(--text-color);
            border-radius: 4px;
            margin-bottom: 1rem;
            box-sizing: border-box;
        }
        textarea { min-height: 200px; resize: vertical; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .progress-bar { width: 100%; background-color: #404040; border-radius: 4px; overflow: hidden; }
        .progress-bar-inner { height: 10px; background-color: var(--primary-color); width: 0%; transition: width 0.3s; }
        .chapter-list .chapter-item { display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid var(--border-color); }
        .chapter-list .chapter-item:last-child { border-bottom: none; }
        #activity-log { background: #000; height: 200px; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 12px; border-radius: 4px; }
        #waveform { height: 128px; }
        .voice-color-1 { color: #61AFFE; }
        .voice-color-2 { color: #FFB347; }
        #api-key-warning { background: #ff4d4d; color: white; padding: 1rem; text-align: center; font-weight: bold; border-radius: 8px; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Audiobook Generator</h1>

        <div id="api-key-warning" class="hidden">
            ELEVENLABS_API_KEY is not set. Please set it as an environment variable and restart the application to enable audio generation.
        </div>
        
        <!-- Dashboard View -->
        <div id="dashboard-view">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>Projects</h2>
                <button id="new-book-btn">New Book</button>
            </div>
            <div id="project-list"></div>
        </div>

        <!-- New Book View -->
        <div id="new-book-view" class="hidden">
            <h2>New Audiobook Project</h2>
            <form id="new-book-form">
                <div class="card">
                    <h3>Manuscript</h3>
                    <textarea id="manuscript" placeholder="Paste your manuscript here. Use 'Chapter X' or '# Chapter Title' to denote chapters." required></textarea>
                </div>
                <div class="card">
                    <h3>Metadata</h3>
                    <div class="form-grid">
                        <input type="text" id="title" placeholder="Book Title" required>
                        <input type="text" id="author" placeholder="Author" required>
                    </div>
                    <textarea id="description" placeholder="Book Description"></textarea>
                </div>
                <div class="card">
                    <h3>Voice Settings</h3>
                    <div>
                        <input type="radio" name="narration-mode" id="single-voice-mode" value="single" checked> Single Voice
                        <input type="radio" name="narration-mode" id="dual-voice-mode" value="dual"> Dual Voice (use *** to switch)
                    </div>
                    <div class="form-grid" style="margin-top: 1rem;">
                        <select id="voice1" required></select>
                        <select id="voice2" disabled></select>
                    </div>
                </div>
                <button type="submit">Start Generation</button>
                <button type="button" id="cancel-new-book-btn" style="background: #535353;">Cancel</button>
            </form>
        </div>

        <!-- Processing View -->
        <div id="processing-view" class="hidden">
            <h2 id="project-title"></h2>
            <p id="project-author" style="color: var(--text-muted); margin-top: -10px;"></p>
            <div class="card">
                <h3>Overall Progress: <span id="project-status"></span></h3>
                <div class="progress-bar"><div id="project-progress-bar" class="progress-bar-inner"></div></div>
                <div style="margin-top: 1rem;">
                    <button id="back-to-dashboard-btn">Back to Dashboard</button>
                    <button id="pause-resume-btn">Pause</button>
                    <button id="export-full-book-btn" disabled>Download Full Audiobook</button>
                </div>
            </div>
            <div class="form-grid">
                <div class="card">
                    <h3>Chapters</h3>
                    <div id="chapter-list"></div>
                </div>
                <div class="card">
                    <h3>Activity Log</h3>
                    <div id="activity-log"></div>
                </div>
            </div>
            <div class="card">
                <h3>Chapter Player</h3>
                <div id="waveform"></div>
                <div id="player-controls" style="margin-top: 1rem;">
                    <button id="play-pause-chapter-btn" disabled>Play</button>
                    <span id="current-chapter-title">Select a chapter to play</span>
                </div>
            </div>
        </div>

    </div>

    <script>
        const $ = (selector) => document.querySelector(selector);
        
        // State
        let voices = [];
        let currentProject = null;
        let wavesurfer = null;
        let sseConnection = null;

        // Views
        const views = {
            dashboard: $('#dashboard-view'),
            newBook: $('#new-book-view'),
            processing: $('#processing-view'),
        };

        const switchView = (viewName, projectId = null) => {
            Object.values(views).forEach(v => v.classList.add('hidden'));
            views[viewName].classList.remove('hidden');
            
            if (viewName === 'processing' && projectId) {
                loadProjectView(projectId);
            } else if (viewName === 'dashboard') {
                loadDashboard();
                if(sseConnection) sseConnection.close();
            }
        };

        // API Calls
        const api = {
            get: (url) => fetch(url).then(res => res.ok ? res.json() : Promise.reject(res)),
            post: (url, data) => fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }).then(res => res.ok ? res.json() : Promise.reject(res)),
        };

        // Dashboard Logic
        const loadDashboard = async () => {
            try {
                const projects = await api.get('/api/projects');
                const listEl = $('#project-list');
                listEl.innerHTML = '';
                if (projects.length === 0) {
                    listEl.innerHTML = '<p>No projects yet. Click "New Book" to get started.</p>';
                } else {
                    projects.forEach(p => {
                        const card = document.createElement('div');
                        card.className = 'card project-card';
                        card.dataset.id = p.id;
                        card.innerHTML = \`
                            <h3>\${p.title}</h3>
                            <p>\${p.author}</p>
                            <p>Status: \${p.status}</p>
                            <div class="progress-bar"><div class="progress-bar-inner" style="width: \${p.progress || 0}%"></div></div>
                        \`;
                        card.onclick = () => switchView('processing', p.id);
                        listEl.appendChild(card);
                    });
                }
            } catch (err) {
                console.error("Failed to load projects", err);
                $('#project-list').innerHTML = '<p style="color: red;">Could not load projects.</p>';
            }
        };

        // New Book Logic
        const initNewBookForm = async () => {
            try {
                const data = await api.get('/api/voices');
                voices = data.voices;
                const voice1Select = $('#voice1');
                const voice2Select = $('#voice2');
                voice1Select.innerHTML = '<option value="">-- Select Voice 1 --</option>';
                voice2Select.innerHTML = '<option value="">-- Select Voice 2 --</option>';
                voices.forEach(v => {
                    const option = \`<option value="\${v.voice_id}">\${v.name}</option>\`;
                    voice1Select.innerHTML += option;
                    voice2Select.innerHTML += option;
                });
            } catch (err) {
                console.error("Failed to load voices", err);
                $('#api-key-warning').classList.remove('hidden');
                $('button[type="submit"]').disabled = true;
            }
        };

        $('#new-book-btn').onclick = () => switchView('newBook');
        $('#cancel-new-book-btn').onclick = () => switchView('dashboard');
        
        $('input[name="narration-mode"]').onchange = (e) => {
            $('#voice2').disabled = (e.target.value === 'single');
        };

        $('#new-book-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                title: $('#title').value,
                author: $('#author').value,
                description: $('#description').value,
                manuscript: $('#manuscript').value,
                mode: $('input[name="narration-mode"]:checked').value,
                voice1: $('#voice1').value,
                voice2: $('#voice2').value,
                audioSettings: {} // Add UI for this later
            };

            try {
                const project = await api.post('/api/projects', data);
                await api.post(\`/api/projects/\${project.id}/generate\`, {});
                switchView('processing', project.id);
            } catch (err) {
                console.error("Failed to create project", err);
                alert("Error creating project.");
            }
        };
        
        // Processing View Logic
        const loadProjectView = async (projectId) => {
            try {
                currentProject = await api.get(\`/api/projects/\${projectId}\`);
                renderProjectDetails();
                setupSse(projectId);
            } catch (err) {
                console.error("Failed to load project", err);
                alert("Could not load project details.");
                switchView('dashboard');
            }
        };
        
        const renderProjectDetails = () => {
            $('#project-title').textContent = currentProject.title;
            $('#project-author').textContent = \`by \${currentProject.author}\`;
            updateProjectStatus(currentProject.status, currentProject.progress);
            
            const chapterListEl = $('#chapter-list');
            chapterListEl.innerHTML = '';
            currentProject.chapters.forEach((c, i) => {
                const chapterEl = document.createElement('div');
                chapterEl.className = 'chapter-item';
                chapterEl.id = \`chapter-\${i}\`;
                chapterEl.innerHTML = \`
                    <span>\${c.title}</span>
                    <div>
                        <span class="status">\${c.status}</span>
                        <button class="play-chapter-btn" data-index="\${i}" \${c.status !== 'completed' ? 'disabled' : ''}>Play</button>
                        <a href="\${c.filePath || '#'}" class="download-chapter-btn \${c.status !== 'completed' ? 'hidden' : ''}" download>DL</a>
                    </div>
                \`;
                chapterListEl.appendChild(chapterEl);
            });
            
            $('.play-chapter-btn', chapterListEl, true).forEach(btn => {
                btn.onclick = () => playChapter(parseInt(btn.dataset.index));
            });
            
            const logEl = $('#activity-log');
            logEl.innerHTML = currentProject.log.map(l => \`<div>[\${new Date(l.timestamp).toLocaleTimeString()}] \${l.message}</div>\`).join('');
            logEl.scrollTop = logEl.scrollHeight;

            if(currentProject.status === 'completed' && currentProject.fullBookPath){
                $('#export-full-book-btn').disabled = false;
                $('#export-full-book-btn').onclick = () => {
                    const link = document.createElement('a');
                    link.href = \`/output/\${currentProject.id}/book.mp3\`;
                    link.download = \`\${currentProject.title}.mp3\`;
                    link.click();
                };
            }
        };
        
        const updateProjectStatus = (status, progress = 0) => {
            currentProject.status = status;
            $('#project-status').textContent = status;
            $('#project-progress-bar').style.width = \`\${progress}%\`;
            const pauseBtn = $('#pause-resume-btn');
            if (status === 'processing') {
                pauseBtn.textContent = 'Pause';
                pauseBtn.disabled = false;
            } else if (status === 'paused') {
                pauseBtn.textContent = 'Resume';
                pauseBtn.disabled = false;
            } else {
                pauseBtn.textContent = 'Pause';
                pauseBtn.disabled = true;
            }
        };

        const setupSse = (projectId) => {
            if (sseConnection) sseConnection.close();
            sseConnection = new EventSource(\`/updates/\${projectId}\`);
            
            sseConnection.onmessage = (event) => {
                const data = JSON.parse(event.data);
                switch(data.type) {
                    case 'log':
                        const logEl = $('#activity-log');
                        logEl.innerHTML += \`<div>[\${new Date().toLocaleTimeString()}] \${data.message}</div>\`;
                        logEl.scrollTop = logEl.scrollHeight;
                        break;
                    case 'status':
                        updateProjectStatus(data.status, currentProject.progress);
                        if(data.status === 'completed') {
                           $('#export-full-book-btn').disabled = false;
                           $('#export-full-book-btn').onclick = () => window.location.href = data.filePath;
                        }
                        break;
                    case 'progress':
                        currentProject.progress = data.progress;
                        $('#project-progress-bar').style.width = \`\${data.progress}%\`;
                        break;
                    case 'chapter_status':
                        const chapterEl = $(\`#chapter-\${data.chapterIndex}\`);
                        if (chapterEl) {
                            $('.status', chapterEl).textContent = data.status;
                            if (data.status === 'completed') {
                                $('.play-chapter-btn', chapterEl).disabled = false;
                                const downloadLink = $('.download-chapter-btn', chapterEl);
                                downloadLink.classList.remove('hidden');
                                downloadLink.href = data.filePath;
                                currentProject.chapters[data.chapterIndex].filePath = data.filePath;
                            }
                        }
                        break;
                }
            };
        };
        
        const playChapter = (index) => {
            const chapter = currentProject.chapters[index];
            if (!chapter || !chapter.filePath) return;
            
            $('#current-chapter-title').textContent = chapter.title;
            if(!wavesurfer) {
                wavesurfer = WaveSurfer.create({
                    container: '#waveform',
                    waveColor: '#B3B3B3',
                    progressColor: '#1DB954'
                });
                wavesurfer.on('play', () => $('#play-pause-chapter-btn').textContent = 'Pause');
                wavesurfer.on('pause', () => $('#play-pause-chapter-btn').textContent = 'Play');
                wavesurfer.on('finish', () => $('#play-pause-chapter-btn').textContent = 'Play');
            }
            wavesurfer.load(chapter.filePath);
            $('#play-pause-chapter-btn').disabled = false;
        };

        $('#play-pause-chapter-btn').onclick = () => {
            if(wavesurfer) wavesurfer.playPause();
        };

        $('#pause-resume-btn').onclick = () => {
            if (currentProject.status === 'processing') {
                api.post(\`/api/projects/\${currentProject.id}/pause\`);
            } else if (currentProject.status === 'paused') {
                api.post(\`/api/projects/\${currentProject.id}/generate\`);
            }
        };

        $('#back-to-dashboard-btn').onclick = () => switchView('dashboard');
        
        // Initial Load
        window.onload = () => {
            switchView('dashboard');
            initNewBookForm();
        };
    </script>
</body>
</html>
`;