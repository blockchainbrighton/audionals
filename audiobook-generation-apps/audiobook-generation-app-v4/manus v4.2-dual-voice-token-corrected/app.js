const { exec } = require('child_process');
const { createProjectService } = require('./projectService');
const { getHTML } = require('./htmlTemplate');
const { createServer } = require('./server');

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  const service = createProjectService();
  const { listen } = createServer({ service, getHTML, port: PORT, logger: console });

  await listen(PORT);

  console.log(`\n╔═══════════════════════════════════════════════════════════╗\n║                                                           ║\n║           🎙️  Audiobook Generator Started  🎙️            ║\n║                                                           ║\n║   Server running at: http://localhost:${PORT}              ║\n║                                                           ║\n║   Open your browser and navigate to the URL above        ║\n║                                                           ║\n╚═══════════════════════════════════════════════════════════╝\n`);

  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} http://localhost:${PORT}`, (error) => {
    if (error) {
      console.warn('Unable to automatically open browser:', error.message);
    }
  });
}

main().catch((error) => {
  console.error('Failed to start Audiobook Generator:', error);
  process.exitCode = 1;
});
