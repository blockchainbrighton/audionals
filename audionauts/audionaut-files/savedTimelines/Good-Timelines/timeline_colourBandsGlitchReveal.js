// timeline_colourBandsGlitchReveal_64bars
// Features painterly colour band reveals and glitch accents, with a stepped pixelation dissolve.
// Pixelation decreases in distinct steps every 4 bars, ensuring full clarity by the end.
export function timeline_colourBandsGlitchReveal_64bars() {
  const pixelRevealStages = [240, 200, 160, 120, 80, 120, 160, 200, 240, 200, 120, 80, 32, 16, 8, 4, 1]; // Desired pixel sizes
  const pixelStepDurationBars = 4; // Change pixel size every 4 bars (32 bars total for pixelation)

  const pixelateEntries = [];
  // Pixelation will complete its steps over the first 32 bars (8 stages * 4 bars/stage)
  // The last stage (pixelSize: 1) will then hold until the end of the timeline.
  for (let i = 0; i < pixelRevealStages.length; i++) {
    const start = i * pixelStepDurationBars;
    // For the last pixel stage, make it extend to the full 64 bars
    // Otherwise, it's a 4-bar step.
    const end = (i === pixelRevealStages.length - 1) ? 64 : (i + 1) * pixelStepDurationBars;

    pixelateEntries.push({
      effect: "pixelate",
      param: "pixelSize",
      from: pixelRevealStages[i],
      to: pixelRevealStages[i], // Hold this value for the duration
      startBar: start,
      endBar: end,
      easing: "linear" // Easing is irrelevant when from === to
    });
  }

  return [
    // Very slow fade in, and initial blur dissolves over the first 32 bars
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 32, easing: "linear" },

    // --- Stepped Pixelation Reveal ---
    // Replaces the original continuous pixelate animation.
    // PixelSize steps down every 4 bars over the first 32 bars, then holds at 1.
    ...pixelateEntries,

    // Overlapping colour sweeps targeting different hue bands for painterly reveal
    // Note: The overall colourSweep progress might need adjustment if pixelation reveal time changes
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 48, easing: "linear" },
    { effect: "colourSweep", param: "hueRange", from: [0, 60], to: [0, 120], startBar: 8, endBar: 28, easing: "linear" },
    { effect: "colourSweep", param: "hueRange", from: [120, 240], to: [60, 240], startBar: 18, endBar: 38, easing: "linear" },
    { effect: "colourSweep", param: "hueRange", from: [240, 360], to: [180, 360], startBar: 28, endBar: 48, easing: "linear" },
    { effect: "colourSweep", param: "edgeSoftness", from: 0.25, to: 0.6, startBar: 12, endBar: 44, easing: "easeInOut" },

    // Scanlines fade in and out in the first half, then a later pulse
    { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 0, endBar: 18, easing: "easeInOut" },
    { effect: "scanLines", param: "intensity", from: 0, to: 0.7, startBar: 36, endBar: 48, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.7, to: 0, startBar: 48, endBar: 56, easing: "linear" },

    // Film grain pulses at midpoint, then vanishes
    { effect: "filmGrain", param: "intensity", from: 0.6, to: 1.3, startBar: 20, endBar: 36, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 1.3, to: 0, startBar: 36, endBar: 48, easing: "linear" },

    // Sudden glitch bursts near the end for dramatic accent
    { effect: "glitch", param: "intensity", from: 0, to: 0.8, startBar: 54, endBar: 56, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0.8, to: 0, startBar: 56, endBar: 58, easing: "linear" },

  ];
} 