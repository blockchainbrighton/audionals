// Nice

export function neonDreamscape_64bars() {
    // Discrete pixel sizes for each beat: most dramatic at first, then finer
    const pixelSizes = [
      240, 240, 120, 120, // 0-1 bar
      64, 64, 48, 48,     // 1-2 bar
      32, 32, 24, 24,     // 2-3 bar
      16, 16, 8, 8,       // 3-4 bar
      16, 16, 8, 8,       // 4-5 bar (repeat for more drama)
      16, 16, 8, 8,       // 5-6 bar
      8, 8, 4, 4,         // 6-7 bar
      2, 1, 1, 1          // 7-8 bar, approach clear
    ];
    const pixelateEvents = [];
    for (let i = 0; i < 32; ++i) {
      // Each step lands exactly on the beat, holds for a beat (0.25 bar)
      pixelateEvents.push({
        effect: "pixelate",
        param: "pixelSize",
        from: pixelSizes[i],
        to: pixelSizes[i],
        startBar: i * 0.25,
        endBar: (i + 1) * 0.25
      });
    }
  
    return [
      // Glitch burst and blur at intro
      { effect: "glitch", param: "intensity", from: 0.1, to: 0, startBar: 0, endBar: 8, easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 8 },
  
      // Fade and beat-synced pixelation (using array above)
      { effect: "fade", param: "progress", from: 0, to: 0.1, startBar: 0, endBar: 8 },
      ...pixelateEvents,
  
      // Neon color sweeps and subtle fade
      { effect: "colourSweep", param: "progress", from: 0, to: 0.5, startBar: 8, endBar: 16, color: "#00faff", edgeSoftness: 0.6 },
      { effect: "colourSweep", param: "progress", from: 0.5, to: 1, startBar: 16, endBar: 24, color: "#ff00ea", direction: -1, edgeSoftness: 0.6 },
      { effect: "fade", param: "progress", from: 0.1, to: 0.9, startBar: 8, endBar: 24 },
  
      // RGB separation and reveal clarity at big musical moments
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.12, startBar: 20, endBar: 28 },
      { effect: "chromaShift", param: "angle", from: 0, to: Math.PI * 2, startBar: 24, endBar: 32 },
      { effect: "pixelate", param: "pixelSize", from: 16, to: 1, startBar: 24, endBar: 40 },
  
      // Subtle film grain overlay
      { effect: "filmGrain", param: "intensity", from: 0.4, to: 0.8, startBar: 16, endBar: 56 },
      { effect: "filmGrain", param: "intensity", from: 0.8, to: 0, startBar: 56, endBar: 60 },
  
      // Dramatic glitch drop and fade to clear at the end
      { effect: "glitch", param: "intensity", from: 0, to: 0.15, startBar: 40, endBar: 48, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 0.15, to: 0, startBar: 48, endBar: 56, easing: "easeInOut" },
  
      // Final full reveal, chroma shift to zero, and soft vignette
      { effect: "fade", param: "progress", from: 0.9, to: 1, startBar: 56, endBar: 64 },
      { effect: "chromaShift", param: "intensity", from: 0.12, to: 0, startBar: 56, endBar: 64 },
      { effect: "vignette", param: "intensity", from: 0, to: 0.2, startBar: 56, endBar: 64 },
    ];
  }
  