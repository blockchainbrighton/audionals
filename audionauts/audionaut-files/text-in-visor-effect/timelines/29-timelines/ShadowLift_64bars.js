// ShadowLift_64bars.js
// Enhanced with additional, varied chroma shift movements at key moments
// to accentuate the "lifting" of different shadow/highlight ranges.
export function ShadowLift_64bars() {
  return [
    // === Phase 1: Lifting Deep Shadows (0-24 bars) ===
    { effect:"fade", param:"progress", from:0, to:0.8, startBar:0, endBar:12, easing: "linear" }, // Ensure easing for predictability
    { effect:"colourSweep", param:"brightnessRange", from:[0,60], to:[0,60], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:24, easing: "linear", edgeSoftness:0.6 },

    // Original Chroma Shift - quick pulse (horizontal implied by default angle or previous state)
    { effect:"chromaShift", param:"intensity", from:0, to:0.3, startBar:16, endBar:17, easing: "easeInOut" },
    { effect:"chromaShift", param:"intensity", from:0.3, to:0, startBar:17, endBar:18, easing: "easeInOut" },
    // Add a subtle angle drift during this first shift for a bit more movement
    { effect:"chromaShift", param:"angle", from:0, to:Math.PI / 8, startBar:16, endBar:18, easing:"linear"},


    // === Phase 2: Lifting Mid-Tones (24-48 bars) ===
    { effect:"colourSweep", param:"brightnessRange", from:[60,140], to:[60,140], startBar:24, endBar:24 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:24, endBar:48, easing: "linear", edgeSoftness:0.6 }, // ensure edgeSoftness here too

    // New Chroma Shift - around the start of mid-tone lift (Bar 24-28)
    // Vertical "shudder" or quick sweep
    { effect:"chromaShift", param:"intensity", from:0, to:0.25, startBar:25, endBar:26, easing:"easeInOut"}, // Slightly after sweep starts
    { effect:"chromaShift", param:"angle", from:Math.PI / 2, to:Math.PI * 3 / 2, startBar:25, endBar:27, easing:"linear"}, // Vertical oscillation
    { effect:"chromaShift", param:"intensity", from:0.25, to:0, startBar:26, endBar:28, easing:"easeInOut"},

    // Film grain pulse (original timing)
    { effect:"filmGrain", param:"intensity", from:0.6, to:1.1, startBar:32, endBar:36, easing:"easeInOut" },
    { effect:"filmGrain", param:"intensity", from:1.1, to:0.2, startBar:36, endBar:48, easing:"easeInOut" },


    // === Phase 3: Lifting Highlights & Finalizing (40-64 bars) ===
    // Note: Highlight sweep starts at bar 40, overlapping with mid-tone sweep's end
    { effect:"colourSweep", param:"brightnessRange", from:[140,255], to:[140,255], startBar:40, endBar:40 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:40, endBar:64, easing: "linear", edgeSoftness:0.6 }, // ensure edgeSoftness

    // New Chroma Shift - as highlights are revealed (Bar 40-44)
    // Diagonal "flare" or sweep
    { effect:"chromaShift", param:"intensity", from:0, to:0.35, startBar:41, endBar:43, easing:"easeInOut"},
    { effect:"chromaShift", param:"angle", from:Math.PI / 4, to:Math.PI * 5 / 4, startBar:41, endBar:44, easing:"linear"}, // Diagonal sweep
    { effect:"chromaShift", param:"intensity", from:0.35, to:0, startBar:43, endBar:45, easing:"easeInOut"},

    // Original Vignette (adjusting to ensure it fits the "lift" theme)
    { effect:"vignette", param:"intensity", from:0.8, to:0, startBar:40, endBar:56, easing:"linear" }, // Fades out completely
    { effect:"vignette", param:"size", from:0.7, to:1, startBar:40, endBar:56, easing:"linear" },      // Opens up fully

    // Fade to full progress if not already there
    { effect:"fade", param:"progress", from:0.8, to:1, startBar:48, endBar:64, easing: "linear" },

    // Add a final, subtle circular chroma shimmer at the very end
    { effect:"chromaShift", param:"intensity", from:0, to:0.1, startBar:60, endBar:62, easing:"linear"},
    { effect:"chromaShift", param:"angle", from:0, to:Math.PI * 2, startBar:60, endBar:64, easing:"linear"},
    { effect:"chromaShift", param:"intensity", from:0.1, to:0, startBar:62, endBar:64, easing:"linear"},
  ];
}