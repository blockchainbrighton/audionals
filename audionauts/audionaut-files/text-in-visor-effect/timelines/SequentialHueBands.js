// my absolute favourite timeline at this point - excellent combinations and timing

export function revealSequentialHueBands_64bars() {
  return [
    // Initial darkness
    { effect: "fade", param: "progress", from: 0, to: 0.1, startBar: 0, endBar: 8 },

    // Sequential color band reveals
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 4, endBar: 20, hueRange: [0, 60] },      // Reds
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 12, endBar: 28, hueRange: [60, 120] },    // Yellows/Greens
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 20, endBar: 36, hueRange: [120, 180] },   // Cyans
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 28, endBar: 44, hueRange: [180, 240] },   // Blues
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 36, endBar: 52, hueRange: [240, 300] },   // Purples
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 44, endBar: 60, hueRange: [300, 360] },   // Magentas

    // Supporting effects
    { effect: "blur", param: "radius", from: 20, to: 0, startBar: 0, endBar: 24 },
    { effect: "chromaShift", param: "intensity", from: 0.4, to: 0, startBar: 20, endBar: 40 },
    { effect: "fade", param: "progress", from: 0.1, to: 1, startBar: 8, endBar: 32 },

    // Final polish
    { effect: "vignette", param: "intensity", from: 0.8, to: 0.2, startBar: 48, endBar: 64 },
    { effect: "filmGrain", param: "intensity", from: 0.5, to: 0.1, startBar: 40, endBar: 60 }
  ];
}
