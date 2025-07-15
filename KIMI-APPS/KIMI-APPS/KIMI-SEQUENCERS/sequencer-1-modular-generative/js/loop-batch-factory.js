import fs from 'fs';
import path from 'path';

function createLibrary(count = 1000, outDir = './loops') {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  for (let i = 0; i < count; i++) {
    const seed = crypto.randomBytes(16).toString('hex');
    const json = generateLoop(seed);
    fs.writeFileSync(path.join(outDir, `${seed}.json`), json);
  }
}

createLibrary(10_000);   // 10 k unique loops in ~2 s