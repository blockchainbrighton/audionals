// timeline_windowSweepReveal_64bars
// Features a stepped pixelation reveal, improving clarity over 64 bars.
// Pixelation decreases in distinct steps every 4 bars until fully clear.
export function timeline_windowSweepReveal_64bars() {
  const pixelRevealStages = [240, 220, 200, 160, 100, 200, 240,  64, 32, 16, 8, 4, 1]; // Desired pixel sizes
  const pixelStepDurationBars = 4; // Change pixel size every 4 bars

  const pixelateEntries = [];
  for (let i = 0; i < pixelRevealStages.length; i++) {
    const start = i * pixelStepDurationBars;
    // The last stage holds its value until the end of the timeline (64 bars)
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
    // Start black, slowly fade in
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    // Initial blur, which will also clear up
    { effect: "blur", param: "radius", from: 32, to: 24, startBar: 0, endBar: 32, easing: "linear" },

    // --- Stepped Pixelation Reveal ---
    // This replaces the original continuous pixelate animations.
    // PixelSize will step down every 4 bars.
    ...pixelateEntries,

    // Vignette window slowly grows, stays at medium for drama, then opens
    { effect: "vignette", param: "size", from: 0.2, to: 0.4, startBar: 6, endBar: 24, easing: "easeInOut" },
    { effect: "vignette", param: "size", from: 0.4, to: 0.95, startBar: 24, endBar: 54, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 2, to: 0, startBar: 48, endBar: 64, easing: "linear" },

    // Colour sweep reveals highlights only, then expands range
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 12, endBar: 48, easing: "linear" },
    { effect: "colourSweep", param: "brightnessRange", from: [160, 255], to: [0, 255], startBar: 12, endBar: 40, easing: "linear" },
    { effect: "colourSweep", param: "edgeSoftness", from: 0.15, to: 0.4, startBar: 16, endBar: 32, easing: "linear" },

    // Film grain fades in, peaks, then fades out as clarity arrives
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 1.2, startBar: 0, endBar: 60, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 1.2, to: 0, startBar: 60, endBar: 64, easing: "linear" },

    // Final blurring smooths to sharpness (pixelation is handled by the stepped entries above)
    { effect: "blur", param: "radius", from: 24, to: 0, startBar: 40, endBar: 60, easing: "easeInOut" },
  ];
}