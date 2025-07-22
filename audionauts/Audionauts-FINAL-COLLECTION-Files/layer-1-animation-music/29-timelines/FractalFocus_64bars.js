// FractalFocus_64bars.js
// Enhanced with more effects and parameter changes at key intervals (8, 16, 32 bars)
// for a richer, more dynamic "fractal focusing" experience.
export function FractalFocus_64bars() {
  const pixelChangeBars = [0, 8, 16, 24, 32, 40, 48, 56, 60, 64];
  const pixelSequence =   [200, 120, 80, 40, 20, 10,  4,  2,  1];

  if (pixelSequence.length !== pixelChangeBars.length - 1) {
    console.error("FractalFocus_64bars: Mismatch in pixelation data.");
    return [];
  }

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
    // === Initial Setup & Reveal (Bars 0-8) ===
    { effect: "fade", param: "progress", from: 0, to: 0.8, startBar: 0, endBar: 8, easing: "linear" }, // Initial fade in
    ...pixelateEntries.filter(p => p.startBar < 8), // Pixelation for 0-8

    // Initial blur, starts clearing
    { effect: "blur", param: "radius", from: 24, to: 15, startBar: 0, endBar: 8, easing: "easeInOut" },
    // Introduce subtle scanlines
    { effect: "scanLines", param: "intensity", from: 0, to: 0.3, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "scanLines", param: "lineWidth", from: 4, to: 2, startBar: 0, endBar: 8, easing: "linear" },
    // Subtle film grain builds
    { effect: "filmGrain", param: "intensity", from: 0, to: 0.4, startBar: 0, endBar: 8, easing: "linear" },


    // === First Major Shift (Around Bar 8-16) ===
    { effect: "fade", param: "progress", from: 0.8, to: 1, startBar: 8, endBar: 16, easing: "linear" }, // Complete fade-in
    ...pixelateEntries.filter(p => p.startBar >= 8 && p.startBar < 16), // Pixelation for 8-16

    // Blur continues to clear
    { effect: "blur", param: "radius", from: 15, to: 8, startBar: 8, endBar: 16, easing: "easeInOut" },
    // Scanlines intensify then begin to fade slightly
    { effect: "scanLines", param: "intensity", from: 0.3, to: 0.6, startBar: 8, endBar: 12, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.6, to: 0.2, startBar: 12, endBar: 16, easing: "linear" },
    // Film grain peaks
    { effect: "filmGrain", param: "intensity", from: 0.4, to: 0.7, startBar: 8, endBar: 16, easing: "easeInOut" },
    // First glitch accent (original timing)
    { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 16, endBar: 17 }, // Hits at the end of this phase
    { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 17, endBar: 18 },
    // Subtle chroma shift introduced
    { effect: "chromaShift", param: "intensity", from: 0, to: 0.15, startBar: 12, endBar: 16, easing: "easeInOut"},
    { effect: "chromaShift", param: "angle", from: 0, to: Math.PI, startBar: 12, endBar: 16, easing: "linear"}, // Slow sweep


    // === Second Major Shift & Focus (Around Bar 16-32) ===
    ...pixelateEntries.filter(p => p.startBar >= 16 && p.startBar < 32), // Pixelation for 16-32

    // Blur clears more rapidly
    { effect: "blur", param: "radius", from: 8, to: 2, startBar: 16, endBar: 32, easing: "easeInOut" },
    // Scanlines fade out
    { effect: "scanLines", param: "intensity", from: 0.2, to: 0, startBar: 16, endBar: 24, easing: "linear" },
    // Film grain starts to fade
    { effect: "filmGrain", param: "intensity", from: 0.7, to: 0.3, startBar: 16, endBar: 32, easing: "linear" },
    // More pronounced Chroma Shift (original timing for burst, but with angle animation)
    { effect: "chromaShift", param: "intensity", from: 0.15, to: 0.5, startBar: 28, endBar: 32, easing: "easeInOut" }, // Build up to burst
    { effect: "chromaShift", param: "angle", from: Math.PI, to: Math.PI * 3, startBar: 28, endBar: 32, easing: "linear"}, // Faster, wider sweep
    { effect: "chromaShift", param: "intensity", from: 0.5, to: 0, startBar: 32, endBar: 34, easing: "easeInOut" }, // Original burst fade
    { effect: "chromaShift", param: "angle", from: Math.PI * 3, to: Math.PI * 4, startBar: 32, endBar: 34, easing: "linear"}, // Continue angle animation


    // === Final Clarity (Bar 32 onwards) ===
    ...pixelateEntries.filter(p => p.startBar >= 32), // Pixelation for 32 onwards

    // Final blur clear
    { effect: "blur", param: "radius", from: 2, to: 0, startBar: 32, endBar: 48, easing: "easeInOut" }, // Extended clear
    // Film grain fades out completely
    { effect: "filmGrain", param: "intensity", from: 0.3, to: 0, startBar: 32, endBar: 48, easing: "linear" },
    // Final glitch accent (original timing)
    { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 40, endBar: 41 },
    { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 41, endBar: 42 },

    // Adding a subtle vignette that clears towards the end for focus
    { effect: "vignette", param: "intensity", from: 0.5, to: 0, startBar: 32, endBar: 56, easing: "linear" },
    { effect: "vignette", param: "size", from: 0.7, to: 1, startBar: 32, endBar: 56, easing: "linear" }
  ];
}