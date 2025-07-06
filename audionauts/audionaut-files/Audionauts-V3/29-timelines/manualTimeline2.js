// lovely pixel colour effects

export function savedTimeline_2025_05_30T19_10_16_499Z() {
  return [
    // Proper fade in at start
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },

    // Colour sweep with evolving edgeSoftness for a more natural reveal
    { effect: "colourSweep", param: "edgeSoftness", from: 0.6, to: 0.1, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0, to: 0.25, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0.25, to: 0.1, startBar: 16, endBar: 20, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0.1, to: 0.3, startBar: 20, endBar: 24, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0.3, to: 0.1, startBar: 24, endBar: 28, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0.1, to: 0.3, startBar: 28, endBar: 32, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0.3, to: 1, startBar: 32, endBar: 64, easing: "linear" },

    // Add progressive pixel clarity for full reveal
    { effect: "pixelate", param: "pixelSize", from: 128, to: 1, startBar: 8, endBar: 56, easing: "easeInOut" },

    // Blur: short burst up, then long down to 0
    { effect: "blur", param: "radius", from: 0, to: 40, startBar: 40, endBar: 44, easing: "linear" },
    { effect: "blur", param: "radius", from: 40, to: 0, startBar: 44, endBar: 56, easing: "linear" },

    // Brief glitch accent, off before final reveal
    { effect: "glitch", param: "intensity", from: 0.1, to: 0, startBar: 23, endBar: 24, easing: "easeInOut" },

    // Fade all obfuscating effects by bar 64 for a clean full reveal
    { effect: "pixelate", param: "pixelSize", from: 2, to: 1, startBar: 56, endBar: 64, easing: "linear" },
    { effect: "colourSweep", param: "edgeSoftness", from: 0.1, to: 0, startBar: 56, endBar: 64, easing: "linear" }
  ];
}
