const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const url = require('url');

// Configuration
const PORT = 8001;
const ROOT_DIR = path.join(__dirname, '..', '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'src', 'frontend');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks');
const CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const TITLES_DIR = path.join(OUTPUT_DIR, 'titles');
const BOOK_DIR = path.join(OUTPUT_DIR, 'book');
const LOGS_DIR = path.join(OUTPUT_DIR, 'logs');
const PROJECTS_DIR = path.join(OUTPUT_DIR, 'projects'); 
const TEMP_DIR = path.join(OUTPUT_DIR, 'temp');

// Ensure directories exist
[OUTPUT_DIR, CHUNKS_DIR, CHAPTERS_DIR, TITLES_DIR, BOOK_DIR, LOGS_DIR, PROJECTS_DIR, TEMP_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Queue System to protect resources
class AsyncQueue {
    constructor(concurrency = 1) {
        this.concurrency = concurrency;
        this.active = 0;
        this.queue = [];
    }

    add(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.next();
        });
    }

    next() {
        if (this.active >= this.concurrency || this.queue.length === 0) return;
        
        this.active++;
        const { fn, resolve, reject } = this.queue.shift();
        
        fn().then(resolve)
            .catch(reject)
            .finally(() => {
                this.active--;
                this.next();
            });
    }
}

// Queues
const elevenLabsQueue = new AsyncQueue(2); // Conservative concurrent limit
const ffmpegQueue = new AsyncQueue(1);     // Serial processing for heavy CPU tasks

function generateHash(text) {
    return crypto.createHash('md5').update(text).digest('hex').substring(0, 12);
}

// FFmpeg Helper
const executeFfmpeg = (args) => new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', args);
    let stderr = '';
    ff.stderr.on('data', d => stderr += d);
    ff.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with ${code}: ${stderr}`)));
    ff.on('error', reject);
});

async function createSilenceFile(duration) {
    const filename = `silence_${duration}s.mp3`;
    const filePath = path.join(TEMP_DIR, filename);
    if (fs.existsSync(filePath)) return filePath;
    
    // Generate silence (44.1kHz, mono, 128k - standard ElevenLabs match)
    // We use -c:a libmp3lame to ensure mp3 format.
    await executeFfmpeg([
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', 
        '-t', duration.toString(), 
        '-b:a', '128k', 
        '-y', filePath
    ]);
    return filePath;
}

async function mergeAudioFiles(inputPaths, outputPath, silenceDuration = 0) {
    return ffmpegQueue.add(async () => {
        if (inputPaths.length === 0) throw new Error("No files to merge");
        
        let filesToMerge = [...inputPaths];

        // Insert silence if requested
        if (silenceDuration > 0) {
            try {
                const silenceFile = await createSilenceFile(silenceDuration);
                const interleaved = [];
                for (let i = 0; i < filesToMerge.length; i++) {
                    interleaved.push(filesToMerge[i]);
                    // Add silence between chunks (not after the last one)
                    if (i < filesToMerge.length - 1) {
                        interleaved.push(silenceFile);
                    }
                }
                filesToMerge = interleaved;
            } catch (e) {
                console.error("Silence generation failed, proceeding without silence:", e);
            }
        }

        const listPath = outputPath + '.list.txt';
        const fileContent = filesToMerge.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
        fs.writeFileSync(listPath, fileContent);
        
        try {
            await executeFfmpeg([
                '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-y', outputPath
            ]);
        } finally {
            if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
        }
    });
}

// Helper: Wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Send Response with CORS
const sendResponse = (res, statusCode, data, contentType = 'application/json') => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, xi-api-key');
    res.writeHead(statusCode, { 'Content-Type': contentType });
    res.end(typeof data === 'object' ? JSON.stringify(data) : data);
};

// ElevenLabs API Helper (with Retry)
async function generateAudio(text, voiceId, apiKey, modelId) {
    return elevenLabsQueue.add(async () => {
        let attempts = 0;
        const maxAttempts = 5;
        let delay = 1000;

        while (attempts < maxAttempts) {
            try {
                return await new Promise((resolve, reject) => {
                    const req = https.request('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
                        method: 'POST',
                        headers: {
                            'xi-api-key': apiKey,
                            'Content-Type': 'application/json',
                            'Accept': 'audio/mpeg'
                        }
                    }, (res) => {
                        if (res.statusCode === 429) {
                            // Rate Limited
                            resolve({ retry: true }); 
                            return;
                        }
                        
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => {
                            if (res.statusCode !== 200) {
                                reject(new Error(`ElevenLabs API Error: ${res.statusCode}`));
                            } else {
                                resolve({ buffer: Buffer.concat(chunks) });
                            }
                        });
                    });

                    req.on('error', reject);
                    req.write(JSON.stringify({
                        text,
                        model_id: modelId,
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                    }));
                    req.end();
                });
            } catch (e) {
                // Network errors, throw immediately unless we want to retry those too? 
                // For now, throw.
                throw e;
            }
            
            // Check result of the promise
            // NOTE: The Queue wrapper expects a Promise. 
            // We had to await the inner promise to check for retry signal.
            
            // Wait, the structure above is slightly complex because of the callback.
            // Let's refactor slightly to handle the result.
        }
        throw new Error("Max retries exceeded for ElevenLabs API");
    });
}

// Refactored Generate Audio to be cleaner
async function generateAudioWithRetry(text, voiceId, apiKey, modelId) {
    return elevenLabsQueue.add(async () => {
        let attempts = 0;
        let delay = 2000; // Start with 2s

        while (attempts < 5) {
            attempts++;
            try {
                const result = await new Promise((resolve, reject) => {
                    const req = https.request('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
                        method: 'POST',
                        headers: {
                            'xi-api-key': apiKey,
                            'Content-Type': 'application/json',
                            'Accept': 'audio/mpeg'
                        }
                    }, (res) => {
                        if (res.statusCode === 429) {
                            resolve({ status: 429 });
                            return;
                        }
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => {
                            if (res.statusCode !== 200) {
                                reject(new Error(`ElevenLabs API Error: ${res.statusCode}`));
                            } else {
                                resolve({ status: 200, buffer: Buffer.concat(chunks) });
                            }
                        });
                    });
                    req.on('error', reject);
                    req.write(JSON.stringify({ text, model_id: modelId, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }));
                    req.end();
                });

                if (result.status === 429) {
                    console.log(`[ElevenLabs] Rate Limit (429). Retrying in ${delay/1000}s...`);
                    await wait(delay);
                    delay *= 2; // Exponential backoff
                    continue;
                }

                return result.buffer;

            } catch (e) {
                throw e;
            }
        }
        throw new Error("ElevenLabs API Rate Limit Exceeded (Max Retries)");
    });
}

// Map old function name to new one
const generateAudioOld = generateAudio; 
// We will replace the call site to use generateAudioWithRetry or rename it.
// Let's rename generateAudioWithRetry to generateAudio in the final replacement.

const server = http.createServer(async (req, res) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        sendResponse(res, 200, '');
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // ==========================================
    // 1. SERVE FRONTEND
    // ==========================================
    if (pathname === '/' || pathname === '/index.html') {
        fs.readFile(path.join(FRONTEND_DIR, 'index.html'), (err, data) => {
            if (err) sendResponse(res, 500, 'Error loading UI', 'text/plain');
            else sendResponse(res, 200, data, 'text/html');
        });
        return;
    }
    if (pathname === '/style.css' || pathname === '/css/style.css') {
        fs.readFile(path.join(FRONTEND_DIR, 'css', 'style.css'), (err, data) => {
            if (err) sendResponse(res, 404, 'CSS not found', 'text/plain');
            else sendResponse(res, 200, data, 'text/css');
        });
        return;
    }
    if (pathname === '/script.js' || pathname === '/js/script.js') {
        fs.readFile(path.join(FRONTEND_DIR, 'js', 'script.js'), (err, data) => {
            if (err) sendResponse(res, 404, 'JS not found', 'text/plain');
            else sendResponse(res, 200, data, 'text/javascript');
        });
        return;
    }

    // ==========================================
    // 2. Serve Audio Files
    // ==========================================
    if (pathname.startsWith('/output/')) {
        const filePath = path.join(ROOT_DIR, pathname);
        if (!filePath.startsWith(ROOT_DIR)) {
            sendResponse(res, 403, 'Access Denied', 'text/plain');
            return;
        }
        if (fs.existsSync(filePath)) {
            // Stream audio - need manual headers for stream
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            sendResponse(res, 404, 'File not found', 'text/plain');
        }
        return;
    }

    // ==========================================
    // 3. API ROUTES
    // ==========================================

    // API: List Projects
    if ((pathname === '/api/projects' || pathname === '/api/projects/') && req.method === 'GET') {
        try {
            if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
            const projectFiles = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json'));
            const projectList = projectFiles.map(f => {
                try {
                    const content = fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf8');
                    const data = JSON.parse(content);
                    const id = data.id || f.replace('.json', '');
                    return { 
                        id: id, 
                        title: data.title || 'Untitled', 
                        author: data.author || 'Unknown',
                        updatedAt: data.updatedAt || fs.statSync(path.join(PROJECTS_DIR, f)).mtime.toISOString(),
                        filename: f,
                        type: 'saved'
                    };
                } catch(e) { return null; }
            }).filter(Boolean);

            // Ghost Projects Logic...
            const chunkFiles = fs.existsSync(CHUNKS_DIR) ? fs.readdirSync(CHUNKS_DIR).filter(f => f.endsWith('.mp3')) : [];
            const ghostIds = new Set();
            chunkFiles.forEach(f => {
                const match = f.match(/^(.+?)_ch\d+_chk\d+/);
                if (match) ghostIds.add(match[1]);
            });
            const existingIds = new Set(projectList.map(p => p.id));
            ghostIds.forEach(gid => {
                if (!existingIds.has(gid) && gid !== 'undefined') {
                    const inferredTitle = gid.split('_').slice(0, -1).join('_') || gid;
                    projectList.push({
                        id: gid, title: `(Recovered) ${inferredTitle}`, author: 'Unknown', updatedAt: new Date().toISOString(), type: 'ghost'
                    });
                }
            });
            projectList.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            
            sendResponse(res, 200, projectList);
        } catch (e) {
            console.error("List Projects Error:", e);
            sendResponse(res, 500, { error: e.message });
        }
        return;
    }

    // API: Load Specific Project
    if (pathname.startsWith('/api/projects/') && req.method === 'GET') {
        const parts = pathname.split('/').filter(Boolean);
        const projectId = parts.pop();
        
        if (!projectId || projectId === 'projects') {
            sendResponse(res, 400, { error: "Invalid Project ID" });
            return;
        }

        const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
        
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                // Discovery logic (omitted for brevity in replacement, assumed largely same structure but wrapped)
                if (data.chapters && Array.isArray(data.chapters)) {
                    const chunkFiles = fs.existsSync(CHUNKS_DIR) ? fs.readdirSync(CHUNKS_DIR) : [];
                    data.chapters.forEach((ch, idx) => {
                        const isTitle = ch.title === "Titles" || idx === 0;
                        const chapterFileName = isTitle ? `${projectId}_titles.mp3` : `${projectId}_chapter_${idx}.mp3`;
                        const chapterDir = isTitle ? TITLES_DIR : CHAPTERS_DIR;
                        const subDir = isTitle ? 'titles' : 'chapters';
                        if (fs.existsSync(path.join(chapterDir, chapterFileName))) {
                            ch.audioUrl = `/output/${subDir}/${chapterFileName}`;
                        }
                        if (ch.chunks) {
                            ch.chunks.forEach((chunk, cIdx) => {
                                const chunkPrefix = `${projectId}_ch${idx}_chk${cIdx}_`;
                                const foundChunkFile = chunkFiles.find(f => f.startsWith(chunkPrefix) && f.endsWith('.mp3'));
                                if (foundChunkFile) {
                                    chunk.audioUrl = `/output/chunks/${foundChunkFile}`;
                                    chunk.filename = foundChunkFile;
                                    chunk.status = 'done';
                                }
                            });
                        }
                    });
                }
                sendResponse(res, 200, data);
            } catch (e) {
                sendResponse(res, 500, { error: "Failed to parse project: " + e.message });
            }
            return;
        }
        
        // Ghost Recovery Logic
        try {
            if (!fs.existsSync(CHUNKS_DIR)) {
                sendResponse(res, 404, { error: "Project not found" });
                return;
            }
            const chunkFiles = fs.readdirSync(CHUNKS_DIR).filter(f => f.startsWith(`${projectId}_`) && f.endsWith('.mp3'));
            if (chunkFiles.length === 0) {
                sendResponse(res, 404, { error: "Project not found" });
                return;
            }
            // ... (Recovery logic same as before) ...
            const chaptersMap = new Map();
            chunkFiles.forEach(f => {
                const match = f.match(/_ch(\d+)_chk(\d+)_/);
                if (match) {
                    const chIdx = parseInt(match[1]);
                    const ckIdx = parseInt(match[2]);
                    if (!chaptersMap.has(chIdx)) chaptersMap.set(chIdx, []);
                    chaptersMap.get(chIdx).push({
                        id: `rec_${chIdx}_${ckIdx}`, text: "(Recovered Audio Segment)", status: 'done', filename: f, audioUrl: `/output/chunks/${f}`, chunkIndex: ckIdx, voiceId: null
                    });
                }
            });
            const chapters = Array.from(chaptersMap.entries()).sort((a, b) => a[0] - b[0]).map(([idx, chunks]) => ({ title: idx === 0 ? "Titles" : `Chapter ${idx}`, chunks: chunks.sort((a, b) => a.chunkIndex - b.chunkIndex) }));
            const recoveredProject = { id: projectId, title: projectId, author: 'Unknown', manuscript: "Recovered...", chapters: chapters, projectSettings: { mode: 'single', voiceIds: [], names: [] } };
            sendResponse(res, 200, recoveredProject);
        } catch(e) {
            sendResponse(res, 500, { error: "Recovery failed: " + e.message });
        }
        return;
    }

    // API: Rename Project
    if (pathname.startsWith('/api/projects/') && req.method === 'PATCH') {
        const parts = pathname.split('/').filter(Boolean);
        const projectId = parts.pop();
        if (!projectId) { sendResponse(res, 400, { error: "Invalid Project ID" }); return; }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { title } = JSON.parse(body);
                const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
                if (fs.existsSync(filePath)) {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    data.title = title;
                    data.updatedAt = new Date().toISOString();
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                    sendResponse(res, 200, { status: 'updated', id: projectId, title });
                } else {
                    sendResponse(res, 404, { error: "Project not found" });
                }
            } catch (e) {
                sendResponse(res, 500, { error: "Failed to rename: " + e.message });
            }
        });
        return;
    }

    // API: Delete Project
    if (pathname.startsWith('/api/projects/') && req.method === 'DELETE') {
        const parts = pathname.split('/').filter(Boolean);
        const projectId = parts.pop();
        if (!projectId) { sendResponse(res, 400, { error: "Invalid Project ID" }); return; }

        const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                sendResponse(res, 200, { status: 'deleted', id: projectId });
            } catch (e) {
                sendResponse(res, 500, { error: "Failed to delete: " + e.message });
            }
        } else {
            sendResponse(res, 404, { error: "Project not found" });
        }
        return;
    }

    // API: Save Project
    if (pathname === '/api/projects' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const id = data.id || 'proj_' + Date.now().toString(36);
                const projectData = { ...data, id, updatedAt: new Date().toISOString() };
                fs.writeFileSync(path.join(PROJECTS_DIR, `${id}.json`), JSON.stringify(projectData, null, 2));
                sendResponse(res, 200, { id, status: 'saved' });
            } catch (e) {
                sendResponse(res, 400, { error: e.message });
            }
        });
        return;
    }

    // API: Generate Audio Chunk
    if (pathname === '/api/generate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body);
                console.log("[API Generate Request]", { ...requestData, apiKey: '***' }); 
                const { text, voiceId, apiKey, modelId, projectId, chapterIndex, chunkIndex, force } = requestData;
                
                if (!text || !voiceId || !apiKey) throw new Error("Missing fields");

                const contentHash = generateHash(text + voiceId + modelId);
                const fileName = `${projectId}_ch${chapterIndex}_chk${chunkIndex}_${contentHash}.mp3`;
                const filePath = path.join(CHUNKS_DIR, fileName);
                const publicUrl = `/output/chunks/${fileName}`;

                if (fs.existsSync(filePath) && !force) {
                    console.log(`[Cache Hit] ${fileName}`);
                    sendResponse(res, 200, { url: publicUrl, filename: fileName, cached: true });
                    return;
                }

                console.log(`[Generating${force ? ' (FORCE)' : ''}] ${fileName} ...`);
                // Use new Retry Function
                const audioBuffer = await generateAudioWithRetry(text, voiceId, apiKey, modelId);
                fs.writeFileSync(filePath, audioBuffer);

                sendResponse(res, 200, { url: publicUrl, filename: fileName, cached: false });

            } catch (e) {
                console.error("Generation Error:", e);
                sendResponse(res, 500, { error: e.message });
            }
        });
        return;
    }

    // API: Merge Chapter
    if (pathname === '/api/merge-chapter' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { projectId, chapterIndex, filenames, isTitle, silence } = JSON.parse(body);
                if (!filenames || !filenames.length) throw new Error("No files");

                const inputPaths = filenames.map(f => path.join(CHUNKS_DIR, f));
                for (const p of inputPaths) if (!fs.existsSync(p)) throw new Error(`Missing: ${path.basename(p)}`);

                const targetDir = isTitle ? TITLES_DIR : CHAPTERS_DIR;
                const outName = isTitle ? `${projectId}_titles.mp3` : `${projectId}_chapter_${chapterIndex}.mp3`;
                const outPath = path.join(targetDir, outName);
                const publicUrl = `/output/${isTitle ? 'titles' : 'chapters'}/${outName}`;

                console.log(`[Merging] ${outName}...`);
                await mergeAudioFiles(inputPaths, outPath, silence);

                sendResponse(res, 200, { url: publicUrl, path: outPath });
            } catch (e) {
                console.error("Merge Error:", e);
                sendResponse(res, 500, { error: e.message });
            }
        });
        return;
    }

    // API: Merge Book
    if (pathname === '/api/merge-book' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { projectId, silence } = JSON.parse(body);
                // (Omitted: Same logic as before, just wrapped in sendResponse)
                // Re-implementing logic quickly:
                const files = [];
                const titleFile = `${projectId}_titles.mp3`;
                if (fs.existsSync(path.join(TITLES_DIR, titleFile))) files.push({ path: path.join(TITLES_DIR, titleFile), index: -1 });
                if (fs.existsSync(CHAPTERS_DIR)) {
                    fs.readdirSync(CHAPTERS_DIR).forEach(f => {
                        const match = f.match(new RegExp(`^${projectId}_chapter_(\\d+)\\.mp3$`));
                        if (match) files.push({ path: path.join(CHAPTERS_DIR, f), index: parseInt(match[1]) });
                    });
                }
                if (files.length === 0) throw new Error("No chapters found");
                files.sort((a, b) => a.index - b.index);
                const inputPaths = files.map(f => f.path);
                const outName = `${projectId}_full_book.mp3`;
                const outPath = path.join(BOOK_DIR, outName);
                const publicUrl = `/output/book/${outName}`;

                console.log(`[Merging Book] ${outName}...`);
                await mergeAudioFiles(inputPaths, outPath, silence);
                sendResponse(res, 200, { url: publicUrl, path: outPath });
            } catch (e) {
                console.error("Book Merge Error:", e);
                sendResponse(res, 500, { error: e.message });
            }
        });
        return;
    }

    // API: Check Cache
    if (pathname === '/api/check-cache' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { chunks, projectId, modelId } = JSON.parse(body);
                const results = chunks.map(c => {
                    const contentHash = generateHash(c.text + c.voiceId + modelId);
                    const fileName = `${projectId}_ch${c.chapterIndex}_chk${c.chunkIndex}_${contentHash}.mp3`;
                    return { id: c.id, exists: fs.existsSync(path.join(CHUNKS_DIR, fileName)), filename: fileName, url: `/output/chunks/${fileName}` };
                });
                sendResponse(res, 200, { chunks: results });
            } catch (e) {
                sendResponse(res, 400, { error: e.message });
            }
        });
        return;
    }

    sendResponse(res, 404, 'Not Found', 'text/plain');
});

server.listen(PORT, () => {
    console.log(`Audiobook Server running at http://localhost:${PORT}`);
    console.log(`Files will be saved to: ${path.resolve(OUTPUT_DIR)}`);
});