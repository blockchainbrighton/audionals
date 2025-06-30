// lovely picellated effect like flickering lights

export function savedTimeline_2025_05_30T18_01_03_138Z() {
  return [
    // Fade-in and strong film grain start
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1, to: 0.6, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.6, to: 0, startBar: 48, endBar: 64, easing: "linear" },

    // Pixelation and blur for soft reveal, both diminish fully before 64
    { effect: "pixelate", param: "pixelSize", from: 180, to: 16, startBar: 0, endBar: 24, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 16, to: 1, startBar: 24, endBar: 48, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 8, endBar: 56, easing: "easeInOut" },

    // Multi-stage colour sweep (oscillating then finishing at 1)
    { effect: "colourSweep", param: "progress", from: 0, to: 0.25, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0.25, to: 0.1, startBar: 16, endBar: 20, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0.1, to: 0.3, startBar: 20, endBar: 24, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0.3, to: 0.1, startBar: 24, endBar: 28, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0.1, to: 0.3, startBar: 28, endBar: 32, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0.3, to: 1, startBar: 32, endBar: 64, easing: "linear" },

    // Final polish: all obfuscating effects at minimum by end
    { effect: "filmGrain", param: "size", from: 100, to: 5, startBar: 60, endBar: 64, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 2, to: 1, startBar: 56, endBar: 64, easing: "linear" }
  ];
}
