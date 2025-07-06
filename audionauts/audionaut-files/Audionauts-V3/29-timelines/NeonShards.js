// nice!

export function timeline_NeonShards_64bars() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "easeInOut" },
      { effect: "colourSweep", param: "hueRange", from: [280,320], to: [80,140], startBar: 0, endBar: 0 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "linear" },
      { effect: "colourSweep", param: "hueRange", from: [40,80], to: [200,260], startBar: 32, endBar: 32 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 32, endBar: 64, easing: "linear" },
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.5, startBar: 8, endBar: 12, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0.5, to: 0, startBar: 12, endBar: 16, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.5, startBar: 40, endBar: 44, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0.5, to: 0, startBar: 44, endBar: 48, easing: "easeInOut" },
      { effect: "scanLines", param: "intensity", from: 0, to: 0.7, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "scanLines", param: "intensity", from: 0.7, to: 0.4, startBar: 24, endBar: 32, easing: "linear" },
      { effect: "scanLines", param: "intensity", from: 0.4, to: 0, startBar: 48, endBar: 56, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 31, endBar: 32, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 32, endBar: 33, easing: "easeInOut" }
    ];
  }