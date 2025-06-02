// shiny colour sweep

export function timeline_ReverseWipe_64bars() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "colourSweep", param: "mode", from: "hide", to: "hide", startBar: 8, endBar: 8 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 32, easing: "linear" },
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 32, endBar: 32 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 32, endBar: 56, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.7, to: 0.2, startBar: 8, endBar: 56, easing: "linear" },
      { effect: "blur", param: "radius", from: 16, to: 0, startBar: 32, endBar: 64, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 120, to: 1, startBar: 32, endBar: 64, easing: "easeInOut" }
    ];
  }