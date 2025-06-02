// slow - lovely

export function OrganicBloom() {
  return [// --- Phase 1: Soft Focus & Vignette (0-16 bars) ---
{ effect: "fade", param: "progress", from: 0, to: 0.6, startBar: 0, endBar: 4, easing: "easeInOut" },
{ effect: "blur", param: "radius", from: 100, to: 15, startBar: 0, endBar: 16, easing: "linear" },
{ effect: "vignette", param: "intensity", from: 1.8, to: 1.2, startBar: 0, endBar: 16, easing: "linear" },
{ effect: "vignette", param: "size", from: 0.2, to: 0.4, startBar: 0, endBar: 16, easing: "linear" },
{ effect: "filmGrain", param: "intensity", from: 0.2, to: 0.8, startBar: 0, endBar: 32, easing: "linear" }, // Grain increases

// --- Phase 2: Hue Sweep & Sharpening (16-32 bars) ---
{ effect: "fade", param: "progress", from: 0.6, to: 0.85, startBar: 4, endBar: 64, easing: "easeInOut" },
{ effect: "blur", param: "radius", from: 15, to: 5, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "vignette", param: "intensity", from: 1.2, to: 0.7, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "vignette", param: "size", from: 0.4, to: 0.6, startBar: 16, endBar: 32, easing: "linear" },
{ effect: "colourSweep", param: "progress", from: 0, to: 0.7, startBar: 4, endBar: 64, hueRange: [0, 90], edgeSoftness: 0.7, color: [255,220,200,0.1] },

// --- Phase 3: Full Spectrum Sweep & Grain Reduction (32-40 bars) ---
{ effect: "fade", param: "progress", from: 0.85, to: 1, startBar: 32, endBar: 40, easing: "easeInOut" },
{ effect: "blur", param: "radius", from: 5, to: 1, startBar: 32, endBar: 40, easing: "linear" },
{ effect: "filmGrain", param: "intensity", from: 0.8, to: 0.4, startBar: 32, endBar: 40, easing: "linear" },
{ effect: "colourSweep", param: "hueRange", from: [0,90], to: [0,360], startBar: 32, endBar: 33, easing: "linear" },
{ effect: "colourSweep", param: "progress", from: 0.7, to: 1, startBar: 32, endBar: 40, edgeSoftness: 0.5, color: [0,0,0,0] },

// --- Phase 4: Final Clarity, Vignette Clears (40-64 bars) ---
{ effect: "blur", param: "radius", from: 1, to: 0, startBar: 40, endBar: 48, easing: "linear" },
{ effect: "vignette", param: "intensity", from: 0.7, to: 0, startBar: 40, endBar: 64, easing: "linear" },
{ effect: "vignette", param: "size", from: 0.6, to: 1, startBar: 40, endBar: 64, easing: "linear" },
{ effect: "filmGrain", param: "intensity", from: 0.4, to: 0.1, startBar: 40, endBar: 64, easing: "linear" },];
}
