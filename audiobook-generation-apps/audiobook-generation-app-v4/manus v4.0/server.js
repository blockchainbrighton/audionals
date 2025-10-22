const http = require('http');
const fs = require('fs');
const path = require('path');

function createServer({ service, getHTML, port = 3000, logger = console } = {}) {
  if (!service) {
    throw new Error('Project service instance is required');
  }
  if (typeof getHTML !== 'function') {
    throw new Error('getHTML function is required');
  }

  const { outputDir } = service.getOutputDirs();
  const sseClients = new Map();

  service.setUpdateHandler((projectId, payload) => {
    const clients = sseClients.get(projectId);
    if (!clients || clients.length === 0) {
      return;
    }
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    clients.forEach((res) => {
      try {
        res.write(message);
      } catch (error) {
        logger.error('Failed to deliver SSE message:', error);
      }
    });
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getHTML());
        return;
      }

      if (pathname.startsWith('/audio/')) {
        await serveAudio(pathname, res);
        return;
      }

      if (pathname === '/api/projects' && req.method === 'GET') {
        return sendJson(res, 200, service.listProjects());
      }

      if (pathname === '/api/projects' && req.method === 'POST') {
        let body;
        try {
          body = await readJson(req);
        } catch {
          return sendJson(res, 400, { error: 'Invalid JSON payload' });
        }

        if (!body || !body.apiKey) {
          return sendJson(res, 400, { error: 'API key is required' });
        }

        try {
          await service.getVoices(body.apiKey);
        } catch (error) {
          return sendJson(res, 400, { error: error.message });
        }

        const result = service.createProject(body);
        return sendJson(res, 200, result);
      }

      if (pathname.startsWith('/api/projects/') && req.method === 'GET') {
        const projectId = pathname.split('/')[3];
        const project = service.getProject(projectId);
        if (!project) {
          return sendJson(res, 404, { error: 'Project not found' });
        }
        return sendJson(res, 200, project);
      }

      if (pathname.endsWith('/start') && req.method === 'POST') {
        const projectId = pathname.split('/')[3];
        const ok = service.startProject(projectId);
        if (!ok) {
          return sendJson(res, 404, { error: 'Project not found' });
        }
        return sendJson(res, 200, { status: 'started' });
      }

      if (pathname.endsWith('/pause') && req.method === 'POST') {
        const projectId = pathname.split('/')[3];
        const ok = service.pauseProject(projectId);
        if (!ok) {
          return sendJson(res, 404, { error: 'Project not found' });
        }
        return sendJson(res, 200, { status: 'paused' });
      }

      if (pathname.endsWith('/resume') && req.method === 'POST') {
        const projectId = pathname.split('/')[3];
        const ok = service.resumeProject(projectId);
        if (!ok) {
          return sendJson(res, 404, { error: 'Project not found' });
        }
        return sendJson(res, 200, { status: 'resumed' });
      }

      if (pathname.endsWith('/book') && req.method === 'POST') {
        const projectId = pathname.split('/')[3];
        const project = service.getProject(projectId);
        if (!project) {
          return sendJson(res, 404, { error: 'Project not found' });
        }
        try {
          const bookUrl = await service.compileBook(projectId, { manual: true });
          const completedCount = project.chapters.filter((ch) => ch && ch.status === 'completed' && ch.file && fs.existsSync(ch.file)).length;
          return sendJson(res, 200, { status: 'ok', bookUrl, chapters: completedCount });
        } catch (error) {
          return sendJson(res, 400, { error: error.message });
        }
      }

      if (pathname === '/api/voices' && req.method === 'POST') {
        let body;
        try {
          body = await readJson(req);
        } catch {
          return sendJson(res, 400, { error: 'Invalid JSON payload' });
        }

        const apiKey = body && body.apiKey;
        if (!apiKey) {
          return sendJson(res, 400, { error: 'API key is required' });
        }
        try {
          const voices = await service.getVoices(apiKey);
          return sendJson(res, 200, voices);
        } catch (error) {
          return sendJson(res, 400, { error: error.message });
        }
      }

      if (pathname.startsWith('/api/events/') && req.method === 'GET') {
        const projectId = pathname.split('/')[3];
        handleEventStream(projectId, req, res);
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    } catch (error) {
      logger.error('Unhandled server error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  function serveAudio(requestPath, res) {
    return new Promise((resolve) => {
      const relativePath = requestPath.replace('/audio/', '');
      const safePath = path.normalize(relativePath).replace(/^\.\/+/, '');
      const fullPath = path.join(outputDir, safePath);

      fs.stat(fullPath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.writeHead(404);
          res.end('Not found');
          return resolve();
        }

        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': stat.size
        });
        fs.createReadStream(fullPath)
          .on('end', resolve)
          .on('error', (streamError) => {
            logger.error('Error streaming audio:', streamError);
            if (!res.headersSent) {
              res.writeHead(500);
            }
            res.end('Stream error');
            resolve();
          })
          .pipe(res);
      });
    });
  }

  function handleEventStream(projectId, req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    if (!sseClients.has(projectId)) {
      sseClients.set(projectId, []);
    }
    const clientList = sseClients.get(projectId);
    clientList.push(res);

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    const cleanup = () => {
      const clients = sseClients.get(projectId);
      if (!clients) {
        return;
      }
      const index = clients.indexOf(res);
      if (index >= 0) {
        clients.splice(index, 1);
      }
    };

    req.on('close', cleanup);
    req.on('finish', cleanup);
  }

  function readJson(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }

  function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  function listen(listenPort = port) {
    return new Promise((resolve) => {
      server.listen(listenPort, () => {
        logger.log(`Server listening on http://localhost:${listenPort}`);
        resolve(server);
      });
    });
  }

  return { server, listen };
}

module.exports = { createServer };
