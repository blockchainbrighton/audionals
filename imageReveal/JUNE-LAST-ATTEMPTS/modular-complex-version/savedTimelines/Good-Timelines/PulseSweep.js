// nice pixel effect - needs better timing changes for pixel stages
export function timeline_PulseSweep_64bars() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 4, easing: "linear" },
      { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 4, endBar: 12, easing: "linear" },
      { effect: "scanLines", param: "intensity", from: 0, to: 1, startBar: 20, endBar: 28, easing: "linear" },
      { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 36, endBar: 44, easing: "linear" },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 4, endBar: 44, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.2, to: 0.7, startBar: 4, endBar: 44, easing: "linear" },
      { effect: "blur", param: "radius", from: 24, to: 0, startBar: 0, endBar: 44, easing: "easeInOut" },
      { effect: "pixelate", param: "pixelSize", from: 128, to: 1, startBar: 0, endBar: 44, easing: "linear" }
    ];
  }
  