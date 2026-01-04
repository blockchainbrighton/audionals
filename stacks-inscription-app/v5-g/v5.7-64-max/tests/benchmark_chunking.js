import { computeMerkleRoot } from '../src/lib/merkle.js';
import { sha256 } from 'js-sha256';

// Re-implement chunkFile to accept variable chunk sizes for testing
function chunkFile(fileBuffer, chunkSize) {
  const chunks = [];
  for (let i = 0; i < fileBuffer.byteLength; i += chunkSize) {
    chunks.push(new Uint8Array(fileBuffer.slice(i, i + chunkSize)));
  }
  return chunks;
}

function generateRandomBuffer(size) {
  // Creating a buffer with some data. Doesn't need to be truly random for speed testing,
  // but let's fill it to be safe against optimization that skips empty blocks.
  const buffer = new Uint8Array(size);
  for(let i=0; i<size; i+=1000) {
      buffer[i] = i % 255;
  }
  return buffer.buffer;
}

function runBenchmark(label, fileSize, chunkSize) {
  console.log(`\n--- ${label} ---`);
  console.log(`File Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Chunk Size: ${chunkSize} bytes`);

  const startGen = performance.now();
  const buffer = generateRandomBuffer(fileSize);
  const endGen = performance.now();
  // console.log(`Data Generation: ${(endGen - startGen).toFixed(2)}ms`);

  const startChunk = performance.now();
  const chunks = chunkFile(buffer, chunkSize);
  const endChunk = performance.now();
  
  const startMerkle = performance.now();
  const root = computeMerkleRoot(chunks);
  const endMerkle = performance.now();

  const chunkTime = endChunk - startChunk;
  const merkleTime = endMerkle - startMerkle;
  const totalTime = chunkTime + merkleTime;

  console.log(`Chunking Time: ${chunkTime.toFixed(2)}ms`);
  console.log(`Merkle Root Time: ${merkleTime.toFixed(2)}ms`);
  console.log(`Total Client Processing: ${totalTime.toFixed(2)}ms`);
  console.log(`Total Chunks: ${chunks.length}`);
  
  return { fileSize, chunkSize, totalTime };
}

console.log("Starting Chunking & Hashing Benchmark...");

// Test Cases
const sizes = [
    100 * 1024,         // 100 KB
    1 * 1024 * 1024,    // 1 MB
    5 * 1024 * 1024,    // 5 MB
    10 * 1024 * 1024    // 10 MB
];

const chunkSizes = [
    4096,   // 4KB
    8192,   // 8KB (Current Standard)
    16384   // 16KB (Potential Future)
];

for (const size of sizes) {
    for (const chunkSize of chunkSizes) {
        runBenchmark(`Benchmark`, size, chunkSize);
    }
}
