// nice after bar 32 but needs more evolution before 32 as is just static noise for too long

export function DigitalEmergence() {
  return [// --- Phase 1: Initial Glitchy Pixelation (0-16 bars) ---
{ effect: "fade", param: "progress", from: 0, to: 0.7, startBar: 0, endBar: 16, easing: "linear" },
{ effect: "pixelate", param: "pixelSize", from: 200, to: 80, startBar: 0, endBar: 16, easing: "easeInOut" },
{ effect: "scanLines", param: "intensity", from: 0.8, to: 0.4, startBar: 0, endBar: 16, easing: "linear" },
{ effect: "scanLines", param: "lineWidth", from: 5, to: 2, startBar: 0, endBar: 16, easing: "linear" },
{ effect: "glitch", param: "intensity", from: 0.5, to: 0.1, startBar: 0, endBar: 16, easing: "linear" }, // Constant low glitch

// --- Phase 2: Chromatic Shift & Sharpening (16-32 bars) ---
// @ Bar 16: Glitch spikes, pixelation reduces faster, chroma shift introduced
{ effect: "fade", param: "progress", from: 0.7, to: 0.9, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "pixelate", param: "pixelSize", from: 80, to: 20, startBar: 16, endBar: 32, easing: "easeInOut" },
{ effect: "scanLines", param: "intensity", from: 0.4, to: 0.1, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "glitch", param: "intensity", from: 0.1, to: 0.7, startBar: 16, endBar: 17, easing: "easeInOut" }, // Spike
{ effect: "glitch", param: "intensity", from: 0.7, to: 0.05, startBar: 17, endBar: 32, easing: "linear" },
{ effect: "chromaShift", param: "intensity", from: 0, to: 0.25, startBar: 16, endBar: 24, easing: "easeInOut" },
{ effect: "chromaShift", param: "intensity", from: 0.25, to: 0.05, startBar: 24, endBar: 32, easing: "linear" },

// --- Phase 3: Focus Pull & Brightness Sweep (32-40 bars) ---
// @ Bar 32: Pixelation clears, blur introduced then removed, brightness sweep starts
{ effect: "fade", param: "progress", from: 0.9, to: 1, startBar: 32, endBar: 40, easing: "linear" },
{ effect: "pixelate", param: "pixelSize", from: 20, to: 1, startBar: 32, endBar: 40, easing: "easeInOut" },
{ effect: "scanLines", param: "intensity", from: 0.1, to: 0, startBar: 32, endBar: 40, easing: "linear" },
{ effect: "blur", param: "radius", from: 15, to: 0, startBar: 32, endBar: 40, easing: "easeInOut" },
{ effect: "colourSweep", param: "progress", from: 0, to: 0.5, startBar: 32, endBar: 40, brightnessRange: [0, 128], edgeSoftness: 0.5 }, // Reveal darker parts

// --- Phase 4: Final Clarity & Subtle Grain (40-64 bars) ---
// @ Bar 40: Full fade, remaining sweep, subtle grain
{ effect: "colourSweep", param: "progress", from: 0.5, to: 1, startBar: 40, endBar: 56, brightnessRange: [0, 255], edgeSoftness: 0.3 }, // Reveal all
{ effect: "filmGrain", param: "intensity", from: 0, to: 0.2, startBar: 40, endBar: 56, easing: "linear" },
{ effect: "filmGrain", param: "intensity", from: 0.2, to: 0.05, startBar: 56, endBar: 64, easing: "linear" },
{ effect: "chromaShift", param: "intensity", from: 0.05, to: 0, startBar: 40, endBar: 48, easing: "linear" },];
}
