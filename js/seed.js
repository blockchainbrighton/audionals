// Deterministic seed utilities
// xmur3 hash -> mulberry32 PRNG
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFromSeed(seed) {
  const seedFn = xmur3(String(seed));
  // fold into 32-bit int
  const a = seedFn();
  return mulberry32(a);
}

export function pickScale(rng) {
  const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const scales = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    whole: [0, 2, 4, 6, 8, 10],
  };
  const rootIndex = Math.floor(rng() * roots.length) % roots.length;
  const scaleName = Object.keys(scales)[Math.floor(rng() * 7) % 7];
  const baseOct = 3 + Math.floor(rng() * 2); // 3 or 4
  const bpm = 90 + Math.floor(rng() * 80); // 90-169
  const steps = scales[scaleName];
  const root = roots[rootIndex];
  const rootMidi = 12 * baseOct + rootIndex; // approximate
  function degreeToMidi(degIndex, octaveOffset = 0) {
    const interval = steps[degIndex % steps.length] + 12 * Math.floor(degIndex / steps.length);
    const midi = rootMidi + interval + 12 * octaveOffset;
    return midi;
  }
  return { root, scaleName, steps, rootMidi, degreeToMidi, bpm };
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function generateDemoPattern(rng, tracks = 10, steps = 16) {
  // Deterministic, dense but musical: ensure at least 1-2 hits per track.
  const grid = Array.from({ length: tracks }, () => Array(steps).fill(false));
  for (let t = 0; t < tracks; t++) {
    const density = 0.25 + 0.1 * (t % 5) + (rng() * 0.1); // vary density by track
    let count = 0;
    for (let s = 0; s < steps; s++) {
      if (rng() < density) {
        grid[t][s] = true;
        count++;
      }
    }
    if (count === 0) {
      // guarantee at least one note
      const s = Math.floor(rng() * steps) % steps;
      grid[t][s] = true;
    }
  }
  // Add a few syncopations and accents
  for (let i = 0; i < Math.floor(steps / 4); i++) {
    const t = Math.floor(rng() * tracks) % tracks;
    const s = (i * 4 + (rng() < 0.5 ? 2 : 3)) % steps;
    grid[t][s] = true;
  }
  return grid;
}