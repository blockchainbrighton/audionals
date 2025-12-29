const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const url = require('url');

// Configuration
const PORT = 3000;
const OUTPUT_DIR = path.join(__dirname, 'output');
const CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks');
const CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const TITLES_DIR = path.join(OUTPUT_DIR, 'titles');
const BOOK_DIR = path.join(OUTPUT_DIR, 'book');
const LOGS_DIR = path.join(OUTPUT_DIR, 'logs');
const PROJECTS_DIR = path.join(OUTPUT_DIR, 'projects'); 

// Ensure directories exist
[OUTPUT_DIR, CHUNKS_DIR, CHAPTERS_DIR, TITLES_DIR, BOOK_DIR, LOGS_DIR, PROJECTS_DIR].forEach(d => {
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

async function mergeAudioFiles(inputPaths, outputPath) {
    return ffmpegQueue.add(async () => {
        if (inputPaths.length === 0) throw new Error("No files to merge");
        
        const listPath = outputPath + '.list.txt';
        const fileContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
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

// ElevenLabs API Helper
async function generateAudio(text, voiceId, apiKey, modelId) {
    return elevenLabsQueue.add(() => new Promise((resolve, reject) => {
        const req = https.request('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            }
        }, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`ElevenLabs API Error: ${res.statusCode}`));
                } else {
                    resolve(Buffer.concat(chunks));
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
    }));
}

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // ==========================================
    // 1. SERVE FRONTEND (MODIFIED FOR MODULES)
    // ==========================================

    // Serve HTML
    if (pathname === '/' || pathname === '/index.html' || pathname === '/Vbeta.html') {
        // We look for index.html first (standard), fallback to Vbeta.html if you haven't renamed it
        const fileToServe = fs.existsSync(path.join(__dirname, 'index.html')) ? 'index.html' : 'Vbeta.html';
        
        fs.readFile(path.join(__dirname, fileToServe), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading UI: Ensure index.html exists.');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
        return;
    }

    // Serve CSS
    if (pathname === '/style.css') {
        fs.readFile(path.join(__dirname, 'style.css'), (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('CSS not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/css' });
                res.end(data);
            }
        });
        return;
    }

    // Serve JS
    if (pathname === '/script.js') {
        fs.readFile(path.join(__dirname, 'script.js'), (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('JS not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end(data);
            }
        });
        return;
    }

    // ==========================================
    // 2. Serve Audio Files (EXISTING LOGIC)
    // ==========================================
    if (pathname.startsWith('/output/')) {
        const filePath = path.join(__dirname, pathname);
        // Security check
        if (!filePath.startsWith(__dirname)) {
            res.writeHead(403);
            res.end('Access Denied');
            return;
        }
        if (fs.existsSync(filePath)) {
            res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404);
            res.end('File not found');
        }
        return;
    }

    // ==========================================
    // 3. API ROUTES (EXISTING LOGIC)
    // ==========================================

    // API: List Projects
    if ((pathname === '/api/projects' || pathname === '/api/projects/') && req.method === 'GET') {
        try {
            // 1. Get Real Projects (JSON files)
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

            // 2. Discover "Ghost" Projects from Chunks (Unsaved)
            const chunkFiles = fs.existsSync(CHUNKS_DIR) ? fs.readdirSync(CHUNKS_DIR).filter(f => f.endsWith('.mp3')) : [];
            const ghostIds = new Set();
            
            chunkFiles.forEach(f => {
                const match = f.match(/^(.+?)_ch\d+_chk\d+/);
                if (match) {
                    ghostIds.add(match[1]);
                }
            });

            const existingIds = new Set(projectList.map(p => p.id));
            
            ghostIds.forEach(gid => {
                if (!existingIds.has(gid) && gid !== 'undefined') {
                    const inferredTitle = gid.split('_').slice(0, -1).join('_') || gid;
                    
                    projectList.push({
                        id: gid,
                        title: `(Recovered) ${inferredTitle}`,
                        author: 'Unknown',
                        updatedAt: new Date().toISOString(), 
                        type: 'ghost'
                    });
                }
            });

            projectList.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(projectList));
        } catch (e) {
            console.error("List Projects Error:", e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // API: Load Specific Project
    if (pathname.startsWith('/api/projects/') && req.method === 'GET') {
        const parts = pathname.split('/').filter(Boolean);
        const projectId = parts.pop();
        
        if (!projectId || projectId === 'projects') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Invalid Project ID" }));
            return;
        }

        const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
        
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);

                // 1. Auto-discover existing chapter/title files
                if (data.chapters && Array.isArray(data.chapters)) {
                    // Pre-scan chunks directory to speed up lookup
                    const chunkFiles = fs.existsSync(CHUNKS_DIR) ? fs.readdirSync(CHUNKS_DIR) : [];

                    data.chapters.forEach((ch, idx) => {
                        const isTitle = ch.title === "Titles" || idx === 0;
                        const chapterFileName = isTitle ? `${projectId}_titles.mp3` : `${projectId}_chapter_${idx}.mp3`;
                        const chapterDir = isTitle ? TITLES_DIR : CHAPTERS_DIR;
                        const subDir = isTitle ? 'titles' : 'chapters';
                        
                        if (fs.existsSync(path.join(chapterDir, chapterFileName))) {
                            ch.audioUrl = `/output/${subDir}/${chapterFileName}`;
                        }

                        // 2. Discover individual chunks for this chapter
                        if (ch.chunks && Array.isArray(ch.chunks)) {
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

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Failed to parse project: " + e.message }));
            }
            return;
        }

        try {
            if (!fs.existsSync(CHUNKS_DIR)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Project not found" }));
                return;
            }
            const chunkFiles = fs.readdirSync(CHUNKS_DIR).filter(f => f.startsWith(`${projectId}_`) && f.endsWith('.mp3'));
            
            if (chunkFiles.length === 0) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Project not found" }));
                return;
            }

            // Group by Chapter
            const chaptersMap = new Map();
            
            chunkFiles.forEach(f => {
                // Parse: projId_ch0_chk0_hash.mp3
                const match = f.match(/_ch(\d+)_chk(\d+)_/);
                if (match) {
                    const chIdx = parseInt(match[1]);
                    const ckIdx = parseInt(match[2]);
                    
                    if (!chaptersMap.has(chIdx)) {
                        chaptersMap.set(chIdx, []);
                    }
                    
                    chaptersMap.get(chIdx).push({
                        id: `rec_${chIdx}_${ckIdx}`,
                        text: "(Recovered Audio Segment)",
                        status: 'done',
                        filename: f,
                        audioUrl: `/output/chunks/${f}`,
                        chunkIndex: ckIdx,
                        voiceId: null
                    });
                }
            });

            // Convert to Array and Sort
            const chapters = Array.from(chaptersMap.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([idx, chunks]) => ({
                    title: idx === 0 ? "Titles (Recovered)" : `Chapter ${idx} (Recovered)`,
                    chunks: chunks.sort((a, b) => a.chunkIndex - b.chunkIndex)
                }));

            const recoveredProject = {
                id: projectId,
                title: projectId,
                author: 'Unknown',
                manuscript: "Project recovered from audio files. Original text unavailable.\n\nTo restore generation capabilities, paste the original text here and Analyze again (it should match the hashes if unchanged).",
                chapters: chapters,
                projectSettings: { mode: 'single', voiceIds: [], names: [] }
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(recoveredProject));

        } catch(e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Recovery failed: " + e.message }));
        }
        return;
    }

    // API: Save Project (Create/Update)
    if (pathname === '/api/projects' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                // Ensure ID
                const id = data.id || 'proj_' + Date.now().toString(36);
                const projectData = { 
                    ...data, 
                    id, 
                    updatedAt: new Date().toISOString() 
                };
                
                // Save to individual file
                const filePath = path.join(PROJECTS_DIR, `${id}.json`);
                fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ id, status: 'saved' }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: e.message }));
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
                console.log("[API Generate Request]", { ...requestData, apiKey: '***' }); // Log request (hide key)

                const { text, voiceId, apiKey, modelId, projectId, chapterIndex, chunkIndex } = requestData;
                
                if (!text || !voiceId || !apiKey) {
                    throw new Error("Missing required fields: text, voiceId, or apiKey");
                }

                // Deterministic Filename based on content hash
                const contentHash = generateHash(text + voiceId + modelId);
                const fileName = `${projectId}_ch${chapterIndex}_chk${chunkIndex}_${contentHash}.mp3`;
                const filePath = path.join(CHUNKS_DIR, fileName);
                const publicUrl = `/output/chunks/${fileName}`;

                // Check if exists
                if (fs.existsSync(filePath)) {
                    console.log(`[Cache Hit] ${fileName}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ url: publicUrl, filename: fileName, cached: true }));
                    return;
                }

                console.log(`[Generating] ${fileName} ...`);
                const audioBuffer = await generateAudio(text, voiceId, apiKey, modelId);
                fs.writeFileSync(filePath, audioBuffer);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ url: publicUrl, filename: fileName, cached: false }));

            } catch (e) {
                console.error("Generation Error:", e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
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
                const { projectId, chapterIndex, filenames, isTitle } = JSON.parse(body);
                
                if (!filenames || filenames.length === 0) throw new Error("No files provided");

                // Resolve absolute paths
                const inputPaths = filenames.map(f => path.join(CHUNKS_DIR, f));
                
                // Verify all exist
                for (const p of inputPaths) {
                    if (!fs.existsSync(p)) throw new Error(`Missing chunk file: ${path.basename(p)}`);
                }

                // Determine Output Dir and Filename
                const targetDir = isTitle ? TITLES_DIR : CHAPTERS_DIR;
                const outName = isTitle ? `${projectId}_titles.mp3` : `${projectId}_chapter_${chapterIndex}.mp3`;
                const outPath = path.join(targetDir, outName);
                const publicUrl = `/output/${isTitle ? 'titles' : 'chapters'}/${outName}`;

                console.log(`[Merging] ${outName} from ${filenames.length} chunks...`);
                await mergeAudioFiles(inputPaths, outPath);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ url: publicUrl, path: outPath }));

            } catch (e) {
                console.error("Merge Error:", e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // API: Bulk Cache Check
    if (pathname === '/api/check-cache' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { chunks, projectId, modelId } = JSON.parse(body);
                const results = chunks.map(c => {
                    const contentHash = generateHash(c.text + c.voiceId + modelId);
                    const fileName = `${projectId}_ch${c.chapterIndex}_chk${c.chunkIndex}_${contentHash}.mp3`;
                    const filePath = path.join(CHUNKS_DIR, fileName);
                    return {
                        id: c.id,
                        exists: fs.existsSync(filePath),
                        filename: fileName,
                        url: `/output/chunks/${fileName}`
                    };
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ chunks: results }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`Audiobook Server running at http://localhost:${PORT}`);
    console.log(`Files will be saved to: ${OUTPUT_DIR}`);
});