export function timeline_windowSweepReveal_64bars() {
  const pixelRevealStages = [240, 220, 200, 160, 100, 200, 240, 64, 32, 16, 8, 4, 1];
  const pixelStepDurationBars = 3.85;

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

  // Unique cleanup for last 8 bars: animated vignette flash and fast grain pop
  const uniqueReverse = [
    // Vignette rapidly shrinks to a pinpoint, then expands past full
    { effect: "vignette", param: "size", from: 1, to: 0, startBar: 56, endBar: 60, easing: "easeIn" },
    { effect: "vignette", param: "size", from: 0, to: 1.3, startBar: 60, endBar: 64, easing: "easeOut" },
    // Vignette intensity flashes (blink/flash-to-black-and-back)
    { effect: "vignette", param: "intensity", from: 0, to: 2, startBar: 56, endBar: 59, easing: "linear" },
    { effect: "vignette", param: "intensity", from: 2, to: 0, startBar: 59, endBar: 64, easing: "linear" },
    // Grain pops up at bar 58-60, then vanishes
    { effect: "filmGrain", param: "intensity", from: 0, to: 1, startBar: 58, endBar: 60, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1, to: 0, startBar: 60, endBar: 64, easing: "linear" },
    // Pixelate blinks up briefly then off (little glitchy pop)
    { effect: "pixelate", param: "pixelSize", from: 1, to: 12, startBar: 56, endBar: 58, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 12, to: 1, startBar: 58, endBar: 64, easing: "easeOut" },
    // Blur stays clean (no blur in end)
    { effect: "blur", param: "radius", from: 0, to: 0, startBar: 56, endBar: 64 },
    // ColourSweep fades out with brightness range wipe effect
    { effect: "colourSweep", param: "brightnessRange", from: [0, 255], to: [255, 255], startBar: 56, endBar: 60, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 1, to: 0, startBar: 60, endBar: 64, easing: "linear" },
    // Fully deactivate all at the very end
    { effect: "colourSweep", param: "active", from: true, to: false, startBar: 63, endBar: 64 }
  ];

  return [
    { effect: "blur", param: "radius", from: 32, to: 24, startBar: 0, endBar: 32, easing: "linear" },
    ...pixelateEntries,
    { effect: "vignette", param: "size", from: 0.2, to: 0.4, startBar: 6, endBar: 24, easing: "easeInOut" },
    { effect: "vignette", param: "size", from: 0.4, to: 0.95, startBar: 24, endBar: 54, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 2, to: 0, startBar: 48, endBar: 56, easing: "linear" },
    // { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 12, endBar: 48, easing: "linear" },
    // { effect: "colourSweep", param: "brightnessRange", from: [160, 255], to: [0, 255], startBar: 12, endBar: 40, easing: "linear" },
    // { effect: "colourSweep", param: "edgeSoftness", from: 0.15, to: 0.4, startBar: 16, endBar: 32, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 1.2, startBar: 0, endBar: 56, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 24, to: 0, startBar: 40, endBar: 56, easing: "easeInOut" },
    ...uniqueReverse
  ];
}
