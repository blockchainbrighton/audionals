// DigitalEmergence_64bars.js (assuming 64 bars from context)
// Enhanced early evolution with more dynamic pixelation, blur, and subtle chroma shifts.
export function DigitalEmergence_64bars() { // Renamed for consistency
  return [
    // --- Phase 1: Initial Glitchy Pixelation & Blur (0-16 bars) ---
    { effect: "fade", param: "progress", from: 0, to: 0.7, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 240, to: 100, startBar: 0, endBar: 16, easing: "easeInOut" }, // More noticeable change
    { effect: "blur", param: "radius", from: 20, to: 10, startBar: 0, endBar: 16, easing: "linear" }, // Introduce blur
    { effect: "scanLines", param: "intensity", from: 0.8, to: 0.4, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "scanLines", param: "lineWidth", from: 5, to: 2, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "glitch", param: "intensity", from: 0.6, to: 0.2, startBar: 0, endBar: 8, easing: "linear" }, // Vary glitch more
    { effect: "glitch", param: "intensity", from: 0.2, to: 0.4, startBar: 8, endBar: 16, easing: "linear" },
    { effect: "chromaShift", param: "intensity", from: 0, to: 0.1, startBar: 8, endBar: 16, easing: "linear" }, // Early subtle chroma

    // --- Phase 2: Chromatic Shift & Sharpening (16-32 bars) ---
    { effect: "fade", param: "progress", from: 0.7, to: 0.9, startBar: 16, endBar: 32, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 100, to: 30, startBar: 16, endBar: 32, easing: "easeInOut" }, // Faster reduction
    { effect: "blur", param: "radius", from: 10, to: 5, startBar: 16, endBar: 32, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.4, to: 0.1, startBar: 16, endBar: 32, easing: "linear" },
    { effect: "glitch", param: "intensity", from: 0.4, to: 0.7, startBar: 16, endBar: 17, easing: "easeInOut" }, // Spike
    { effect: "glitch", param: "intensity", from: 0.7, to: 0.05, startBar: 17, endBar: 32, easing: "linear" },
    { effect: "chromaShift", param: "intensity", from: 0.1, to: 0.3, startBar: 16, endBar: 24, easing: "easeInOut" }, // More intense chroma
    { effect: "chromaShift", param: "intensity", from: 0.3, to: 0.1, startBar: 24, endBar: 32, easing: "linear" },

    // --- Phase 3: Focus Pull & Brightness Sweep (32-40 bars) ---
    { effect: "fade", param: "progress", from: 0.9, to: 1, startBar: 32, endBar: 40, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 30, to: 1, startBar: 32, endBar: 40, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 5, to: 0, startBar: 32, endBar: 40, easing: "easeInOut" }, // Clearing the remaining blur
    { effect: "scanLines", param: "intensity", from: 0.1, to: 0, startBar: 32, endBar: 40, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0, to: 0.5, startBar: 32, endBar: 40, easing: "linear", brightnessRange: [0, 128], edgeSoftness: 0.5 },

    // --- Phase 4: Final Clarity & Subtle Grain (40-64 bars) ---
    { effect: "colourSweep", param: "progress", from: 0.5, to: 1, startBar: 40, endBar: 56, easing: "linear", brightnessRange: [0, 255], edgeSoftness: 0.3 },
    { effect: "filmGrain", param: "intensity", from: 0, to: 0.2, startBar: 40, endBar: 56, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.05, startBar: 56, endBar: 64, easing: "linear" },
    { effect: "chromaShift", param: "intensity", from: 0.1, to: 0, startBar: 40, endBar: 48, easing: "linear" },
  ];
}