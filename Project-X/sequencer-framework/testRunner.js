const fs = require('fs');
const path = require('path');
const { assert, assertEqual, spy } = require('./test/assertion');

async function runTests() {
  const testsDir = path.join(__dirname, 'test');
  const testFiles = fs
    .readdirSync(testsDir)
    .filter((f) => f.endsWith('.test.js'));
  let passed = 0;
  let failed = 0;
  for (const file of testFiles) {
    const testPath = path.join(testsDir, file);
    try {
      console.log(`Running ${file}...`);
      const testFn = require(testPath);
      if (typeof testFn === 'function') {
        await testFn({ assert, assertEqual, spy });
      }
      console.log(`✓ ${file}`);
      passed++;
    } catch (err) {
      console.error(`✕ ${file}`);
      console.error(err);
      failed++;
    }
  }
  console.log(`\n${passed} tests passed, ${failed} tests failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();