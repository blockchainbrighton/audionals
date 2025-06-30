// Nice shifts between effects

export function timeline_ChromaticPulseAndFocus_64bars() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 12, easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 24, to: 0, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.3, startBar: 8, endBar: 16, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0.3, to: 0, startBar: 16, endBar: 20, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.4, startBar: 28, endBar: 36, easing: "easeInOut" },
      { effect: "chromaShift", param: "direction", from: 1, to: -1, startBar: 28, endBar: 36 },
      { effect: "pixelate", param: "pixelSize", from: 80, to: 1, startBar: 8, endBar: 40, easing: "linear" },
      { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 16, endBar: 32, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 0, to: 0.7, startBar: 48, endBar: 49, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 0.7, to: 0, startBar: 49, endBar: 50, easing: "easeInOut" }
    ];
  }