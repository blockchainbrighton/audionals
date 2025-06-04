/**
 * effectTimeline.js — Extreme Variety Timeline Generator (2025-05-30)
 * - Effects appear in different combinations, order, and overlap per-seed.
 * - “Heavy” reveal effects (fade, pixelate, blur, vignette) are never ALL max after bar 8.
 * - Always some visibility by bar 8, always fully revealed 60–64.
 */

function makeRng(seed = 1) {
  let s = (seed | 0) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = s * 16807 % 2147483647) / 2147483647;
}

const BARLEN = 64;

const HIDE_FX = [
  // Each "heavy" reveal effect: order, overlap, duration all randomized
  {
    effect: 'fade', param: 'progress',
    hideVal: 0, revealVal: 1
  },
  {
    effect: 'pixelate', param: 'pixelSize',
    hideVal: 120, revealVal: 1
  },
  {
    effect: 'blur', param: 'radius',
    hideVal: 32, revealVal: 0
  },
  {
    effect: 'vignette', param: 'intensity',
    hideVal: 1.8, revealVal: 0
  }
];

const ACCENT_FX = [
  // “Accent”/interesting effects that never fully hide the image
  { effect: 'glitch', param: 'intensity', min: 0, max: 0.8 },
  { effect: 'scanLines', param: 'intensity', min: 0, max: 1 },
  { effect: 'chromaShift', param: 'intensity', min: 0, max: 0.5 },
  { effect: 'filmGrain', param: 'intensity', min: 0.1, max: 0.8 },
  { effect: 'colourSweep', param: 'progress', min: 0, max: 1 }
];

function shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function seededRevealTimeline(seed = 0) {
  const rnd = makeRng(seed);
  const hideOrder = shuffle([...HIDE_FX], rnd);

  // Set safe starting values
  let safeFade = 0.25 + 0.5 * rnd(); // 0.25–0.75
  let safePixelate = 10 + 70 * rnd(); // 10–80 (never max 120)
  let safeBlur = 0 + 9 * rnd(); // 0–9
  let safeVignette = 0.2 + 0.8 * rnd(); // 0.2–1

  // Decide which one will be at its "safe" (low) value, others can be max
  const safeIndex = Math.floor(rnd() * hideOrder.length);

  let lanes = [];
  hideOrder.forEach((fx, i) => {
    let start = 0;
    let end = 60 + Math.floor(rnd() * 4);
    let from;

    // Set guaranteed "safe" value for one effect, max for others
    if (fx.effect === 'fade') {
      from = (safeIndex === i) ? safeFade : 0.25 + 0.6 * rnd(); // never <0.2
    } else if (fx.effect === 'pixelate') {
      from = (safeIndex === i) ? safePixelate : 90 + 30 * rnd(); // 90–120
    } else if (fx.effect === 'blur') {
      from = (safeIndex === i) ? safeBlur : 15 + 17 * rnd(); // 15–32
    } else if (fx.effect === 'vignette') {
      from = (safeIndex === i) ? safeVignette : 1.1 + 0.7 * rnd(); // 1.1–1.8
    } else {
      from = fx.hideVal;
    }

    // For robustness: fade.progress is never <0.2, pixelate <120, blur <32, vignette <1.8
    if (fx.effect === 'fade' && from < 0.2) from = 0.2;

    lanes.push({
      effect: fx.effect,
      param: fx.param,
      from,
      to: fx.revealVal,
      startBar: start,
      endBar: end,
      unit: "bar",
      easing: i === 0 ? "linear" : (rnd() < 0.5 ? "easeInOut" : "linear")
    });
  });

  // Accent FX as before...
  let accentSlots = [];
  for (let i = 0; i < ACCENT_FX.length; ++i) {
    let win = 6 + Math.floor(rnd() * 16);
    let start = Math.floor(rnd() * (BARLEN - win - 8)) + 4;
    let end = start + win;

    if (accentSlots.some(slot => start < slot.end && end > slot.start)) continue;
    accentSlots.push({ start, end });

    const { effect, param, min, max } = ACCENT_FX[i];
    lanes.push({
      effect, param,
      from: min + rnd() * (max - min) * (rnd() < 0.5 ? 1 : 0.6),
      to: max * (rnd() < 0.8 ? 1 : 0.5),
      startBar: start,
      endBar: end,
      unit: 'bar',
      easing: rnd() < 0.5 ? 'easeInOut' : 'linear'
    });
  }

  // Optional: Add full-colourSweep lane for mid/end drama
  if (rnd() < 0.5) {
    let midStart = Math.floor(BARLEN * 0.25 * rnd());
    let midEnd = midStart + 24 + Math.floor(rnd() * 8);
    lanes.push({
      effect: 'colourSweep',
      param: 'progress',
      from: rnd() < 0.5 ? 0 : 1,
      to: rnd() < 0.5 ? 1 : 0,
      startBar: midStart,
      endBar: midEnd,
      unit: 'bar',
      easing: 'linear'
    });
  }

  lanes.sort((a, b) => a.startBar - b.startBar || a.effect.localeCompare(b.effect) || a.param.localeCompare(b.param));
  return lanes;
}


export function getTimelineByNumber(num = 0) {
  return seededRevealTimeline(num);
}
export const timelineFunctions = [
  () => seededRevealTimeline(0)
];
