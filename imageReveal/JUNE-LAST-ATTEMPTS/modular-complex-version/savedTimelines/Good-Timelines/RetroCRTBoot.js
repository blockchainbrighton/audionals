//Love this one! LOVE LOVE LOVE

export function RetroCRTBoot() {
  return [// --- Phase 1: Scanline Fizz & Pixel Form (0-16 bars) ---
{ effect: "fade", param: "progress", from: 0, to: 0.5, startBar: 0, endBar: 16, easing: "linear" },
{ effect: "scanLines", param: "intensity", from: 1, to: 0.7, startBar: 0, endBar: 16, easing: "linear" },
{ effect: "scanLines", param: "lineWidth", from: 8, to: 4, startBar: 0, endBar: 16, easing: "linear" },
{ effect: "scanLines", param: "spacing", from: 10, to: 6, startBar: 0, endBar: 16, easing: "linear" },
{ effect: "scanLines", param: "progress", from: 0, to: 0.5, startBar: 0, endBar: 16, easing: "linear", direction: -1 },
{ effect: "pixelate", param: "pixelSize", from: 180, to: 70, startBar: 0, endBar: 16, easing: "easeInOut" },
{ effect: "blur", param: "radius", from: 10, to: 5, startBar: 0, endBar: 16, easing: "linear" },

// --- Phase 2: Chroma Aberration & Image Stabilization (16-32 bars) ---
{ effect: "fade", param: "progress", from: 0.5, to: 0.8, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "scanLines", param: "intensity", from: 0.7, to: 0.3, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "scanLines", param: "lineWidth", from: 4, to: 2, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "scanLines", param: "spacing", from: 6, to: 3, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "scanLines", param: "progress", from: 0.5, to: 1, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "pixelate", param: "pixelSize", from: 70, to: 15, startBar: 16, endBar: 32, easing: "easeInOut" },
{ effect: "blur", param: "radius", from: 5, to: 2, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "chromaShift", param: "intensity", from: 0, to: 0.3, startBar: 16, endBar: 20, easing: "easeInOut" },
{ effect: "chromaShift", param: "intensity", from: 0.3, to: 0.1, startBar: 20, endBar: 32, easing: "linear" },

// --- Phase 3: Brightness Reveal & Glitch Accents (32-40 bars) ---
{ effect: "fade", param: "progress", from: 0.8, to: 1, startBar: 32, endBar: 40, easing: "linear" },
{ effect: "scanLines", param: "intensity", from: 0.3, to: 0.05, startBar: 32, endBar: 40, easing: "linear" },
{ effect: "pixelate", param: "pixelSize", from: 15, to: 3, startBar: 32, endBar: 40, easing: "easeInOut" },
{ effect: "blur", param: "radius", from: 2, to: 0, startBar: 32, endBar: 40, easing: "linear" },
{ effect: "colourSweep", param: "progress", from: 0, to: 0.6, startBar: 32, endBar: 40, brightnessRange: [150, 255], edgeSoftness: 0.4 },
{ effect: "glitch", param: "intensity", from: 0, to: 0.6, startBar: 32, endBar: 33, easing: "easeInOut" },
{ effect: "glitch", param: "intensity", from: 0.6, to: 0, startBar: 33, endBar: 34, easing: "linear" },
{ effect: "glitch", param: "intensity", from: 0, to: 0.4, startBar: 38, endBar: 39, easing: "easeInOut" },
{ effect: "glitch", param: "intensity", from: 0.4, to: 0, startBar: 39, endBar: 40, easing: "linear" },

// --- Phase 4: Full Clarity, Lingering Scanlines Fade (40-64 bars) ---
{ effect: "pixelate", param: "pixelSize", from: 3, to: 1, startBar: 40, endBar: 48, easing: "easeInOut" },
{ effect: "scanLines", param: "intensity", from: 0.05, to: 0, startBar: 40, endBar: 56, easing: "linear" },
{ effect: "colourSweep", param: "progress", from: 0.6, to: 1, startBar: 40, endBar: 56, brightnessRange: [0, 255], edgeSoftness: 0.2 },
{ effect: "chromaShift", param: "intensity", from: 0.1, to: 0, startBar: 40, endBar: 48, easing: "linear" },
{ effect: "filmGrain", param: "intensity", from: 0, to: 0.15, startBar: 48, endBar: 64, easing: "linear" },];
}
