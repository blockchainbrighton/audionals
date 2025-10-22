const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks');
const CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const BOOK_DIR = path.join(OUTPUT_DIR, 'book');
const DATA_FILE = path.join(OUTPUT_DIR, 'projects.json');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const PORT = Number(process.env.PORT) || 3000;
const MAX_CHUNK_CHARS = 4500;
const DUAL_VOICE_TOKEN = '***';

const DIRECTORIES = [OUTPUT_DIR, CHUNKS_DIR, CHAPTERS_DIR, BOOK_DIR];

for (const dir of DIRECTORIES) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  ROOT_DIR,
  OUTPUT_DIR,
  CHUNKS_DIR,
  CHAPTERS_DIR,
  BOOK_DIR,
  DATA_FILE,
  PUBLIC_DIR,
  PORT,
  MAX_CHUNK_CHARS,
  DUAL_VOICE_TOKEN
};
