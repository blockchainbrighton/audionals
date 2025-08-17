#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const harnessPath = path.join(__dirname, 'tests', 'harness.js');
const result = spawnSync('node', [harnessPath, '--all'], { stdio: 'inherit' });

if (result.status === 0) {
  console.log('\n✅ All tests passed!');
  console.log(`Test report: ${path.join(__dirname, 'artifacts', 'test-report.json')}`);
} else {
  console.error('\n❌ Some tests failed.');
  process.exit(result.status ?? 1);
}
