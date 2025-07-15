import { ogSampleUrls } from './samples.js';

function generateLoop(seedHex) {
  // 1. Convert seed → 128-bit BigInt
  const seed = BigInt('0x' + seedHex.padEnd(32, '0').slice(0, 32));
  let bits = seed;

  function read(n) {
    const val = Number(bits & ((1n << BigInt(n)) - 1n));
    bits >>= BigInt(n);
    return val;
  }

  // 2. Build 8 channels
  const channels = [];
  for (let c = 0; c < 8; c++) {
    const sampleIdx   = read(5) % ogSampleUrls.length;
    const patternBits = read(11);
    const sequence    = Array.from({ length: 16 }, (_, i) => (patternBits >> i) & 1);
    channels.push({
      name: ogSampleUrls[sampleIdx].text,
      volume: 0.9,
      muted: false,
      solo: false,
      sampleUrl: ogSampleUrls[sampleIdx].value,
      trimStart: 0,
      trimEnd: null,
      speed: 1,
      gain: 0,
      reversed: false,
      sequence
    });
  }

  // 3. Global settings
  const swing = read(7) / 127 * 100;

  return JSON.stringify({ bpm: 120, swing, channels }, null, 2);
}

// tiny demo
console.log(generateLoop('a1b2c3d4'));   // deterministic