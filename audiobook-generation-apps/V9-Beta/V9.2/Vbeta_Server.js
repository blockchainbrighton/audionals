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
const TITLES_DIR = path.join(OUTPUT_DIR, 'titles'); // New
const BOOK_DIR = path.join(OUTPUT_DIR, 'book');
const LOGS_DIR = path.join(OUTPUT_DIR, 'logs');
const PROJECTS_FILE = path.join(OUTPUT_DIR, 'projects.json');

// Ensure directories exist
[OUTPUT_DIR, CHUNKS_DIR, CHAPTERS_DIR, TITLES_DIR, BOOK_DIR, LOGS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Store projects in memory (and sync to disk)
let projects = {};
if (fs.existsSync(PROJECTS_FILE)) {
    try {
        projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    } catch (e) {
        console.error("Error reading projects file:", e);
    }
}

function saveProjects() {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

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
    if (inputPaths.length === 0) throw new Error("No files to merge");
    
    // Create a temporary list file for ffmpeg concat demuxer
    // We use absolute paths to be safe
    const listPath = outputPath + '.list.txt';
    const fileContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, fileContent);
    
    try {
        await executeFfmpeg([
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            listPath,
            '-c',
            'copy', // Stream copy (fast, no re-encoding)
            '-y',
            outputPath
        ]);
    } finally {
        if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
    }
}

// ElevenLabs API Helper
async function generateAudio(text, voiceId, apiKey, modelId) {
    return new Promise((resolve, reject) => {
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
    });
}

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // 1. Serve Vbeta.html
    if (pathname === '/' || pathname === '/index.html') {
        fs.readFile(path.join(__dirname, 'Vbeta.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading UI');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
        return;
    }

    // 2. Serve Audio Files
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

    // 3. API: List Projects
    if (pathname === '/api/projects' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(projects));
        return;
    }

    // 4. API: Save Project (Create/Update)
    if (pathname === '/api/projects' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                // Ensure ID
                const id = data.id || 'proj_' + Date.now().toString(36);
                projects[id] = { ...data, id, updatedAt: new Date().toISOString() };
                saveProjects();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ id, status: 'saved' }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // 5. API: Generate Audio Chunk
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

    // 6. API: Merge Chapter
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

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`Audiobook Server running at http://localhost:${PORT}`);
    console.log(`Files will be saved to: ${OUTPUT_DIR}`);
});