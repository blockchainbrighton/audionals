const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks');
const CHAPTERS_DIR = path.join(OUTPUT_DIR, 'chapters');
const BOOK_DIR = path.join(OUTPUT_DIR, 'book');
const DATA_FILE = path.join(OUTPUT_DIR, 'projects.json');
const PORT = parseInt(process.env.PORT, 10) || 3000;

function ensureOutputStructure() {
  [OUTPUT_DIR, CHUNKS_DIR, CHAPTERS_DIR, BOOK_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

module.exports = {
  PORT,
  ROOT_DIR,
  OUTPUT_DIR,
  CHUNKS_DIR,
  CHAPTERS_DIR,
  BOOK_DIR,
  DATA_FILE,
  ensureOutputStructure,
};
