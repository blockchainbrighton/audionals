const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { PORT, OUTPUT_DIR, PUBLIC_DIR, DUAL_VOICE_TOKEN } = require('../config');
const {
  listProjects,
  getProject,
  createProject,
  saveProjects,
  generateId,
  registerClient,
  removeClient
} = require('../storage/projectStore');
const { parseManuscript } = require('../manuscript/parser');
const { getVoices } = require('../services/audioService');
const { processProject } = require('../processing/projectProcessor');

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/audio/')) {
    const relative = pathname.replace('/audio/', '');
    const safePath = path.join(OUTPUT_DIR, relative);
    if (!safePath.startsWith(OUTPUT_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(safePath)) {
      const stat = fs.statSync(safePath);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size
      });
      fs.createReadStream(safePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  if (pathname === '/api/projects' && req.method === 'GET') {
    sendJson(res, 200, listProjects());
    return;
  }

  if (pathname === '/api/projects' && req.method === 'POST') {
    const body = await readRequestBody(req);
    try {
      const data = JSON.parse(body || '{}');

      if (!data.apiKey) {
        throw new Error('API key is required');
      }

      const voices = await getVoices(data.apiKey);
      if (!voices || voices.length === 0) {
        throw new Error('No voices returned from ElevenLabs');
      }

      const projectId = generateId();
      const mode = data.mode || 'single';
      const manuscript = (data.manuscript || '').toString();
      const chapters = parseManuscript(manuscript, mode);

      const project = {
        id: projectId,
        title: data.title,
        author: data.author,
        language: data.language,
        description: data.description,
        mode: mode,
        voices: Array.isArray(data.voices) ? data.voices : [],
        apiKey: data.apiKey,
        settings: data.settings || {},
        chapters: chapters.map(chapter => ({
          ...chapter,
          status: 'pending',
          segments: chapter.segments || []
        })),
        dualVoiceToken: DUAL_VOICE_TOKEN,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      createProject(project);

      sendJson(res, 200, { projectId, chapters: chapters.length });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (pathname.startsWith('/api/projects/') && req.method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getProject(projectId);

    if (project) {
      sendJson(res, 200, project);
    } else {
      sendJson(res, 404, { error: 'Project not found' });
    }
    return;
  }

  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/start') && req.method === 'POST') {
    const projectId = pathname.split('/')[3];
    const project = getProject(projectId);

    if (project) {
      project.status = 'processing';
      saveProjects();
      processProject(projectId).catch(console.error);
      sendJson(res, 200, { status: 'started' });
    } else {
      sendJson(res, 404, { error: 'Project not found' });
    }
    return;
  }

  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/pause') && req.method === 'POST') {
    const projectId = pathname.split('/')[3];
    const project = getProject(projectId);

    if (project) {
      project.status = 'paused';
      saveProjects();
      sendJson(res, 200, { status: 'paused' });
    } else {
      sendJson(res, 404, { error: 'Project not found' });
    }
    return;
  }

  if (pathname.startsWith('/api/projects/') && pathname.endsWith('/resume') && req.method === 'POST') {
    const projectId = pathname.split('/')[3];
    const project = getProject(projectId);

    if (project) {
      project.status = 'processing';
      saveProjects();
      processProject(projectId).catch(console.error);
      sendJson(res, 200, { status: 'resumed' });
    } else {
      sendJson(res, 404, { error: 'Project not found' });
    }
    return;
  }

  if (pathname === '/api/voices' && req.method === 'POST') {
    const body = await readRequestBody(req);
    try {
      const { apiKey } = JSON.parse(body || '{}');
      if (!apiKey) {
        throw new Error('API key is required');
      }
      const voices = await getVoices(apiKey);
      sendJson(res, 200, voices);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (pathname.startsWith('/api/events/') && req.method === 'GET') {
    const projectId = pathname.split('/')[3];

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    registerClient(projectId, res);
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    req.on('close', () => {
      removeClient(projectId, res);
    });
    return;
  }

  if (req.method === 'GET' && !pathname.startsWith('/api/')) {
    const served = servePublicAsset(pathname, res);
    if (served) {
      return;
    }
  }

  res.writeHead(404);
  res.end('Not found');
}

function servePublicAsset(pathname, res) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const safePath = path.join(PUBLIC_DIR, relativePath);

  if (!safePath.startsWith(PUBLIC_DIR)) {
    return false;
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const ext = path.extname(safePath);
    const contentType = ext === '.html' ? 'text/html' : 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(safePath).pipe(res);
    return true;
  }

  return false;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function startServer() {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('Unhandled server error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  });

  server.listen(PORT, () => {
    console.log(`\n╔═══════════════════════════════════════════════════════════╗\n║                                                           ║\n║           🎙️  Audiobook Generator Started  🎙️            ║\n║                                                           ║\n║   Server running at: http://localhost:${PORT}              ║\n║                                                           ║\n║   Open your browser and navigate to the URL above        ║\n║                                                           ║\n╚═══════════════════════════════════════════════════════════╝\n    `);

    const opener = process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';

    exec(`${opener} http://localhost:${PORT}`);
  });
}

module.exports = {
  startServer
};
