const fs = require('fs');
const path = require('path');
const { OUTPUT_DIR } = require('../config');

function createRouter({
  projectStore,
  audioService,
  textParser,
  projectProcessor,
  pageRenderer,
  sseHub,
}) {
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function sendJson(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }

  function serveAudioFile(res, relativePath) {
    const safePath = path.normalize(relativePath).replace(/^\.\//, '');
    const fullPath = path.join(OUTPUT_DIR, safePath);

    if (!fullPath.startsWith(OUTPUT_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(fullPath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const stat = fs.statSync(fullPath);
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
    });
    fs.createReadStream(fullPath).pipe(res);
  }

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

    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(pageRenderer());
      return;
    }

    if (pathname.startsWith('/audio/')) {
      const relative = pathname.replace('/audio/', '');
      serveAudioFile(res, relative);
      return;
    }

    if (pathname === '/api/projects' && req.method === 'GET') {
      sendJson(res, 200, projectStore.listProjects());
      return;
    }

    if (pathname === '/api/projects' && req.method === 'POST') {
      try {
        const data = await parseJsonBody(req);

        const voiceSwitchToken = typeof data.voiceSwitchToken === 'string' && data.voiceSwitchToken.trim().length > 0
          ? data.voiceSwitchToken.trim()
          : '***';

        let chapterLimit = null;
        if (data.chapterLimit !== undefined && data.chapterLimit !== null && data.chapterLimit !== '') {
          const parsedLimit = parseInt(data.chapterLimit, 10);
          if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
            throw new Error('Chapter limit must be a positive integer when provided');
          }
          chapterLimit = parsedLimit;
        }

        const demoMode = Boolean(data.demoMode);
        const demoCharLimit = typeof data.demoCharLimit === 'number' && data.demoCharLimit > 0 ? data.demoCharLimit : undefined;
        const demoChunksPerSegment = typeof data.demoChunksPerSegment === 'number' && data.demoChunksPerSegment > 0 ? data.demoChunksPerSegment : undefined;
        const demoSegmentsPerChapter = typeof data.demoSegmentsPerChapter === 'number' && data.demoSegmentsPerChapter > 0 ? data.demoSegmentsPerChapter : undefined;

        await audioService.getVoices(data.apiKey);

        const projectId = generateId();
        const chapters = textParser.parseManuscript(data.manuscript, data.mode, { voiceSwitchToken });

        const project = {
          id: projectId,
          title: data.title,
          author: data.author,
          language: data.language,
          description: data.description,
          mode: data.mode,
          voices: data.voices,
          apiKey: data.apiKey,
          settings: data.settings || {},
          chapterLimit,
          demoMode,
          demoCharLimit,
          demoChunksPerSegment,
          demoSegmentsPerChapter,
          voiceSwitchToken,
          chapters: chapters.map((chapter) => ({
            ...chapter,
            status: 'pending',
            segments: chapter.segments || [],
          })),
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        projectStore.setProject(project);

        sendJson(res, 200, { projectId, chapters: chapters.length });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (pathname.startsWith('/api/projects/') && req.method === 'GET') {
      const projectId = pathname.split('/')[3];
      const project = projectStore.getProject(projectId);

      if (!project) {
        sendJson(res, 404, { error: 'Project not found' });
        return;
      }

      sendJson(res, 200, project);
      return;
    }

    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/start') && req.method === 'POST') {
      const projectId = pathname.split('/')[3];
      const project = projectStore.getProject(projectId);

      if (!project) {
        sendJson(res, 404, { error: 'Project not found' });
        return;
      }

      project.status = 'processing';
      projectStore.persist();
      projectProcessor.processProject(projectId).catch(console.error);

      sendJson(res, 200, { status: 'started' });
      return;
    }

    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/pause') && req.method === 'POST') {
      const projectId = pathname.split('/')[3];
      const project = projectStore.getProject(projectId);

      if (!project) {
        sendJson(res, 404, { error: 'Project not found' });
        return;
      }

      project.status = 'paused';
      projectStore.persist();

      sendJson(res, 200, { status: 'paused' });
      return;
    }

    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/resume') && req.method === 'POST') {
      const projectId = pathname.split('/')[3];
      const project = projectStore.getProject(projectId);

      if (!project) {
        sendJson(res, 404, { error: 'Project not found' });
        return;
      }

      project.status = 'processing';
      projectStore.persist();
      projectProcessor.processProject(projectId).catch(console.error);

      sendJson(res, 200, { status: 'resumed' });
      return;
    }

    if (pathname === '/api/voices' && req.method === 'POST') {
      try {
        const data = await parseJsonBody(req);
        const voices = await audioService.getVoices(data.apiKey);
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
        Connection: 'keep-alive',
      });

      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      const cleanup = sseHub.registerClient(projectId, res);

      req.on('close', () => {
        cleanup();
      });

      return;
    }

    res.writeHead(404);
    res.end('Not found');
  }

  return {
    handle: handleRequest,
  };
}

module.exports = {
  createRouter,
};
