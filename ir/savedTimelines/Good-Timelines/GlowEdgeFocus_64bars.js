// GlowEdgeFocus_64bars.js
// Revamped for more expressive and visually exciting focus pulls and glows,
// with added pixelation, glitch, scanlines, and dynamic chroma shifts.
export function GlowEdgeFocus_64bars() {
  // Pixelation stages for a controlled focus reveal
  const pixelChangeBars = [0, 8, 16, 24, 32, 40, 48, 56, 64];
  const pixelSequence =   [120, 80, 40, 20, 10, 4, 2, 1]; // Gradually focusing

  const pixelateEntries = [];
  for (let i = 0; i < pixelSequence.length; i++) {
    pixelateEntries.push({
      effect: "pixelate",
      param: "pixelSize",
      from: pixelSequence[i],
      to: pixelSequence[i],
      startBar: pixelChangeBars[i],
      endBar: pixelChangeBars[i + 1],
      easing: "linear"
    });
  }

  return [
    // === Phase 1: Initial Soft Glow & Emergence (0-16 bars) ===
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:12, easing:"easeInOut" },
    ...pixelateEntries.filter(p => p.startBar < 16), // Initial pixelation
    { effect:"blur", param:"radius", from:32, to:10, startBar:0, endBar:16, easing:"easeInOut" }, // Strong initial blur
    { effect:"scanLines", param:"intensity", from:0, to:0.4, startBar:4, endBar:12, easing:"linear"},
    { effect:"scanLines", param:"lineWidth", from:6, to:2, startBar:4, endBar:12, easing:"linear"},
    { effect:"vignette", param:"intensity", from:0.8, to:0.3, startBar:0, endBar:16, easing:"linear"},
    { effect:"vignette", param:"size", from:0.3, to:0.6, startBar:0, endBar:16, easing:"easeInOut"},


    // === Phase 2: First Chromatic Pulse & Sharpening (16-32 bars) ===
    ...pixelateEntries.filter(p => p.startBar >= 16 && p.startBar < 32), // Pixelation continues to reduce
    { effect:"blur", param:"radius", from:10, to:2, startBar:16, endBar:32, easing:"easeInOut" }, // Sharpening
    { effect:"scanLines", param:"intensity", from:0.4, to:0, startBar:16, endBar:24, easing:"linear"}, // Scanlines fade
    { effect:"vignette", param:"intensity", from:0.3, to:0, startBar:16, endBar:32, easing:"linear"}, // Vignette clears
    { effect:"vignette", param:"size", from:0.6, to:1, startBar:16, endBar:32, easing:"easeInOut"},

    // First chroma shift: Faster Circular sweep for more energy
    { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:20, endBar:22, easing:"easeInOut" }, // More intense
    { effect:"chromaShift", param:"angle", from:0, to: Math.PI * 4, startBar:20, endBar:24, easing:"linear" }, // Two full circles, faster
    { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:22, endBar:24, easing:"easeInOut" },

    // { effect:"glitch", param:"intensity", from:0, to:0.6, startBar:24, endBar:24.5, easing:"easeInOut"}, // Glitch accent
    // { effect:"glitch", param:"intensity", from:0.6, to:0, startBar:24.5, endBar:25, easing:"easeInOut"},


    // === Phase 3: Dynamic Multi-Directional Chroma & Final Focus (32-64 bars) ===
    ...pixelateEntries.filter(p => p.startBar >= 32), // Pixelation to full clarity
    { effect:"blur", param:"radius", from:2, to:0, startBar:32, endBar:48, easing:"easeInOut" }, // Final clear blur

    // Second chroma shift: More dynamic and layered
    { effect:"chromaShift", param:"intensity", from:0, to:0.7, startBar:36, endBar:40, easing:"easeInOut" }, // Higher intensity
    // Quick diagonal sweep
    { effect:"chromaShift", param:"angle", from: Math.PI / 4, to: Math.PI * 5 / 4, startBar:36, endBar:38, easing:"linear" },
    { effect:"chromaShift", param:"angle", from: Math.PI * 5 / 4, to: Math.PI / 4, startBar:38, endBar:40, easing:"linear" },

    // Overlapping shorter horizontal/vertical pulse
    { effect:"chromaShift", param:"intensity", from:0, to:0.4, startBar:40, endBar:41, easing:"linear" }, // Quick intensity for smaller pulse
    { effect:"chromaShift", param:"angle", from:0, to:Math.PI / 2, startBar:40, endBar:40.5, easing:"linear" }, // Fast H
    { effect:"chromaShift", param:"angle", from:Math.PI / 2, to:Math.PI, startBar:40.5, endBar:41, easing:"linear" }, // Fast V
    { effect:"chromaShift", param:"intensity", from:0.4, to:0, startBar:41, endBar:42, easing:"linear" },

    { effect:"chromaShift", param:"intensity", from:0.7, to:0, startBar:40, endBar:44, easing:"easeInOut" }, // Main intensity fade for diagonal

    // { effect:"glitch", param:"intensity", from:0, to:0.8, startBar:46, endBar:46.5, easing:"easeInOut"}, // Another glitch accent
    // { effect:"glitch", param:"intensity", from:0.8, to:0, startBar:46.5, endBar:47, easing:"easeInOut"},


    // Film grain pulses instead of slow fade
    { effect:"filmGrain", param:"intensity", from:0, to:0.6, startBar:0, endBar:8, easing:"linear" },
    { effect:"filmGrain", param:"intensity", from:0.6, to:0.2, startBar:8, endBar:24, easing:"linear" },
    { effect:"filmGrain", param:"intensity", from:0.2, to:0.8, startBar:24, endBar:36, easing:"easeInOut" }, // Pulse up
    { effect:"filmGrain", param:"intensity", from:0.8, to:0.1, startBar:36, endBar:56, easing:"linear" },
    { effect:"filmGrain", param:"intensity", from:0.1, to:0, startBar:56, endBar:64, easing:"linear" }, // Fade out
  ];
}