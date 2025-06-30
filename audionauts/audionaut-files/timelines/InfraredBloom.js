// LOVELY clear colour sweep over intense grains - love it

export function timeline_InfraredBloom_64bars() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 12, easing: "linear" },
      { effect: "colourSweep", param: "hueRange", from: [0,60], to: [0,60], startBar: 8, endBar: 8 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 36, easing: "easeInOut" },
      { effect: "colourSweep", param: "hueRange", from: [60,360], to: [60,360], startBar: 36, endBar: 36 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 36, endBar: 64, easing: "easeInOut" },
      { effect: "filmGrain", param: "intensity", from: 0, to: 1.5, startBar: 0, endBar: 36, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 1.5, to: 0.2, startBar: 36, endBar: 64, easing: "linear" },
      { effect: "scanLines", param: "intensity", from: 0.4, to: 0, startBar: 12, endBar: 56, easing: "linear" }
    ];
  }