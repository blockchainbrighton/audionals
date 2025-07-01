// nice timeline

export function timeline_Solarize_64bars() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 6, easing: "linear" },
      { effect: "colourSweep", param: "brightnessRange", from: [0,90], to: [0,90], startBar: 0, endBar: 0 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 18, easing: "linear" },
      { effect: "colourSweep", param: "brightnessRange", from: [90,180], to: [90,180], startBar: 18, endBar: 18 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 18, endBar: 38, easing: "linear" },
      { effect: "colourSweep", param: "brightnessRange", from: [180,255], to: [180,255], startBar: 38, endBar: 38 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 38, endBar: 64, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 0.6, to: 0.1, startBar: 6, endBar: 56, easing: "linear" },
      { effect: "blur", param: "radius", from: 16, to: 0, startBar: 6, endBar: 56, easing: "linear" }
    ];
  }