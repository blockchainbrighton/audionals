export function timeline_colourBandsGlitchReveal_64bars() {
  const pixelRevealStages = [240, 200, 160, 120, 80, 120, 160, 200, 240, 200, 120, 80, 32, 16, 8, 4, 1];
  const pixelStepDurationBars = 3.2;

  const pixelateEntries = [];
  for (let i = 0; i < pixelRevealStages.length; i++) {
    const start = i * pixelStepDurationBars;
    const end = (i === pixelRevealStages.length - 1) ? 56 : (i + 1) * pixelStepDurationBars;
    pixelateEntries.push({
      effect: "pixelate",
      param: "pixelSize",
      from: pixelRevealStages[i],
      to: pixelRevealStages[i],
      startBar: start,
      endBar: end,
      easing: "linear"
    });
  }

  // Unique ending: rainbow wipe + scanline sweep + “glitch pop”
  const uniqueReverse = [
    // Rainbow colourSweep, hue range wipes right across
    { effect: "colourSweep", param: "hueRange", from: [180, 360], to: [0, 360], startBar: 56, endBar: 62, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 1, to: 0, startBar: 62, endBar: 64, easing: "linear" },
    // Glitch “bursts” at 56-58 and 60-62
    { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 56, endBar: 58, easing: "easeIn" },
    { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 58, endBar: 60, easing: "easeOut" },
    { effect: "glitch", param: "intensity", from: 0, to: 0.8, startBar: 60, endBar: 62, easing: "linear" },
    { effect: "glitch", param: "intensity", from: 0.8, to: 0, startBar: 62, endBar: 64, easing: "linear" },
    // Scanlines “pulse” across end
    { effect: "scanLines", param: "intensity", from: 0, to: 1, startBar: 56, endBar: 59, easing: "easeIn" },
    { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 59, endBar: 64, easing: "easeOut" },
    // Pixelate: a quick “jump” up, then falls back to 1 (feels like a pop of blocks)
    { effect: "pixelate", param: "pixelSize", from: 1, to: 16, startBar: 56, endBar: 58, easing: "easeIn" },
    { effect: "pixelate", param: "pixelSize", from: 16, to: 1, startBar: 58, endBar: 64, easing: "easeOut" },
    // Film grain: smooth fade out
    { effect: "filmGrain", param: "intensity", from: 0, to: 0.5, startBar: 56, endBar: 60, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.5, to: 0, startBar: 60, endBar: 64, easing: "linear" },
    // Turn off all
    { effect: "colourSweep", param: "active", from: true, to: false, startBar: 63, endBar: 64 }
  ];

  return [
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 32, easing: "linear" },
    ...pixelateEntries,
    // { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 48, easing: "linear" },
    // { effect: "colourSweep", param: "hueRange", from: [0, 60], to: [0, 120], startBar: 8, endBar: 28, easing: "linear" },
    // { effect: "colourSweep", param: "hueRange", from: [120, 240], to: [60, 240], startBar: 18, endBar: 38, easing: "linear" },
    // { effect: "colourSweep", param: "hueRange", from: [240, 360], to: [180, 360], startBar: 28, endBar: 48, easing: "linear" },
    // { effect: "colourSweep", param: "edgeSoftness", from: 0.25, to: 0.6, startBar: 12, endBar: 44, easing: "easeInOut" },
    { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 0, endBar: 18, easing: "easeInOut" },
    { effect: "scanLines", param: "intensity", from: 0, to: 0.7, startBar: 36, endBar: 48, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.7, to: 0, startBar: 48, endBar: 56, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.6, to: 1.3, startBar: 20, endBar: 36, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 1.3, to: 0, startBar: 36, endBar: 56, easing: "linear" },
    { effect: "glitch", param: "intensity", from: 0, to: 0.8, startBar: 54, endBar: 56, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0.8, to: 0, startBar: 56, endBar: 56.5, easing: "linear" },
    ...uniqueReverse
  ];
}
