// ThermalVision_64bars.js
// Enhanced with a dramatic blur (0-100-0) and film grain pulse between bars 16-18.
// Also, minor cleanup of redundant/overlapping entries.
export function ThermalVision_64bars() {
  return [
    // === Phase 1: Initial Thermal Sweep (0-16 bars) ===
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:8, easing: "linear" }, // Single fade entry

    // First colour sweep (Reds/Oranges for thermal)
    { effect:"colourSweep", param:"hueRange", from:[0,60], to:[0,60], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"brightnessOffset", from:50, to:50, startBar:0, endBar:0 }, // Positive offset for "hot" areas
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:16, easing: "linear" }, // Sweep completes by bar 16

    // === Dramatic Blur & Grain Pulse (Bars 16-18) ===
    // Blur goes from 0 to 100 (very high)
    { effect: "blur", param: "radius", from: 0, to: 100, startBar: 16, endBar: 17, easing: "linear" },
    // Film grain appears intensely
    { effect: "filmGrain", param: "intensity", from: 0, to: 1.5, startBar: 16, endBar: 17, easing: "linear" }, // Starts from 0, high intensity
    { effect: "filmGrain", param: "size", from: 1.0, to: 1.5, startBar: 16, endBar: 17, easing: "linear" }, // Slightly larger grain

    // Focus returns: Blur from 100 to 0
    { effect: "blur", param: "radius", from: 100, to: 0, startBar: 17, endBar: 18, easing: "linear" },
    // Film grain fades out quickly
    { effect: "filmGrain", param: "intensity", from: 1.5, to: 0, startBar: 17, endBar: 18, easing: "linear" },
    { effect: "filmGrain", param: "size", from: 1.5, to: 1.0, startBar: 17, endBar: 18, easing: "linear" }, // Grain size normalizes

    // Vignette pulse during this dramatic moment (original timing)
    { effect:"vignette", param:"size", from:1, to:0.2, startBar:16, endBar:18, easing: "easeInOut" }, // Make it easeInOut for smoother pulse
    { effect:"vignette", param:"intensity", from:0, to:0.8, startBar:16, endBar:18, easing: "easeInOut" }, // Add intensity to vignette
    { effect:"vignette", param:"size", from:0.2, to:1, startBar:18, endBar:20, easing: "easeInOut" },
    { effect:"vignette", param:"intensity", from:0.8, to:0, startBar:18, endBar:20, easing: "easeInOut" },


    // === Phase 2: Second Thermal Sweep (24-48 bars) ===
    // Second colour sweep (Blues/Cyans for "cooler" thermal)
    { effect:"colourSweep", param:"hueRange", from:[180,240], to:[180,240], startBar:24, endBar:24 },
    // No brightnessOffset here, or a neutral one, to differentiate from the first "hot" sweep
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:24, endBar:48, easing: "linear" },


    // === Phase 3: Third Sweep & Conclusion (40-64 bars) ===
    // Third colour sweep (could be different hues or a different brightness effect)
    // Using the original negative brightnessOffset for a "cold" or inverted feel
    { effect:"colourSweep", param:"brightnessOffset", from:-50, to:-50, startBar:40, endBar:40 },
    // To make this sweep distinct, let's assume it uses a different hue or no specific hue (sweeps all)
    // If you want a specific hue for this, add a hueRange entry at bar 40.
    // For example: { effect:"colourSweep", param:"hueRange", from:[270,330], to:[270,330], startBar:40, endBar:40 }, // Purples/Magentas
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:40, endBar:64, easing: "linear" },

    // Optional: Add a subtle pixelation dissolve throughout if desired for more texture
    // { effect: "pixelate", param: "pixelSize", from:16, to:1, startBar:0, endBar:60, easing: "linear"},
  ];
}