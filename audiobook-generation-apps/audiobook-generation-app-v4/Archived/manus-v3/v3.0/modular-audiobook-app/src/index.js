#!/usr/bin/env node

const http = require('http');
const { exec } = require('child_process');
const {
  PORT,
  ensureOutputStructure,
} = require('./config');
const { createProjectStore } = require('./storage/projectStore');
const { createAudioService } = require('./services/audioService');
const textParser = require('./services/textParser');
const { createProjectProcessor } = require('./services/projectProcessor');
const { createSseHub } = require('./server/sseHub');
const { createRouter } = require('./server/router');
const { renderAppPage } = require('./web/pageTemplate');

ensureOutputStructure();

const projectStore = createProjectStore();
const audioService = createAudioService();
const sseHub = createSseHub();
const projectProcessor = createProjectProcessor({
  projectStore,
  audioService,
  sseHub,
  splitIntoChunks: textParser.splitIntoChunks,
});

const router = createRouter({
  projectStore,
  audioService,
  textParser,
  projectProcessor,
  pageRenderer: renderAppPage,
  sseHub,
});

const server = http.createServer((req, res) => {
  router.handle(req, res);
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           🎙️  Audiobook Generator Started  🎙️            ║
║                                                           ║
║   Server running at: http://localhost:${PORT}              ║
║                                                           ║
║   Open your browser and navigate to the URL above        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  const opener = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'start'
      : 'xdg-open';

  exec(`${opener} http://localhost:${PORT}`);
});
