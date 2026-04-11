const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
};

const TTS_ENGINES = {
    kokoro: {
        id: 'kokoro',
        label: 'Kokoro (Local)',
        host: '127.0.0.1',
        port: Number(process.env.KOKORO_PORT || 5010),
    },
    chatterbox: {
        id: 'chatterbox',
        label: 'Chatterbox (Local)',
        host: '127.0.0.1',
        port: Number(process.env.CHATTERBOX_PORT || 5011),
    },
};

function setCriticalHeaders(res) {
    // CRITICAL: These headers are required for FFmpeg.wasm (SharedArrayBuffer)
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(res, statusCode, obj) {
    setCriticalHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function proxyToEngine(req, res, engineId, targetPath) {
    const engine = TTS_ENGINES[engineId];
    if (!engine) {
        sendJson(res, 400, { error: `Unknown engine '${engineId}'` });
        return;
    }

    const options = {
        hostname: engine.host,
        port: engine.port,
        method: req.method,
        path: targetPath,
        headers: {
            'Content-Type': req.headers['content-type'] || 'application/json',
        },
        timeout: 30_000,
    };

    const upstream = http.request(options, (upstreamRes) => {
        setCriticalHeaders(res);
        // Pass through content type/length where available
        if (upstreamRes.headers['content-type']) res.setHeader('Content-Type', upstreamRes.headers['content-type']);
        if (upstreamRes.headers['content-length']) res.setHeader('Content-Length', upstreamRes.headers['content-length']);
        res.writeHead(upstreamRes.statusCode || 502);
        upstreamRes.pipe(res);
    });

    upstream.on('timeout', () => upstream.destroy(new Error('Upstream timeout')));
    upstream.on('error', (err) => {
        sendJson(res, 502, { error: `${engine.label} is not reachable at http://${engine.host}:${engine.port}`, details: err.message });
    });

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        req.pipe(upstream);
    } else {
        upstream.end();
    }
}

function probeEngine(engineId) {
    const engine = TTS_ENGINES[engineId];
    return new Promise((resolve) => {
        const options = {
            hostname: engine.host,
            port: engine.port,
            method: 'GET',
            path: '/voices',
            timeout: 800,
        };
        const r = http.request(options, (resp) => {
            let data = '';
            resp.on('data', (c) => (data += c.toString('utf8')));
            resp.on('end', () => {
                try {
                    const parsed = JSON.parse(data || '{}');
                    const voices = Array.isArray(parsed.voices) ? parsed.voices.length : null;
                    resolve({ running: resp.statusCode === 200, voices });
                } catch {
                    resolve({ running: resp.statusCode === 200, voices: null });
                }
            });
        });
        r.on('timeout', () => {
            r.destroy();
            resolve({ running: false, voices: null });
        });
        r.on('error', () => resolve({ running: false, voices: null }));
        r.end();
    });
}

http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        setCriticalHeaders(res);
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // API routes for local TTS engines (proxied to localhost ports)
    if (url.pathname === '/api/engines' && req.method === 'GET') {
        Promise.all(Object.keys(TTS_ENGINES).map(async (id) => {
            const engine = TTS_ENGINES[id];
            const status = await probeEngine(id);
            return {
                id: engine.id,
                label: engine.label,
                host: engine.host,
                port: engine.port,
                running: status.running,
                voices: status.voices,
            };
        })).then((engines) => sendJson(res, 200, { engines }));
        return;
    }

    if (url.pathname === '/api/voices' && req.method === 'GET') {
        const engineId = url.searchParams.get('engine');
        proxyToEngine(req, res, engineId, '/voices');
        return;
    }

    if (url.pathname === '/api/synthesize' && req.method === 'POST') {
        const engineId = url.searchParams.get('engine');
        proxyToEngine(req, res, engineId, '/synthesize');
        return;
    }

    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('500 Internal Server Error');
            }
        } else {
            setCriticalHeaders(res);
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}).listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Secure headers (COOP/COEP) enabled for FFmpeg.wasm');
});
