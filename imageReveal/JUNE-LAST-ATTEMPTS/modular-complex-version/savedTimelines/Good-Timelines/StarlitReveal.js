// Very slow but nice

export function timeline_StarlitReveal_64bars() {
    return [
      // Grain/pixel/vignette reveal in first 8 bars for early structure
      { effect: "filmGrain", param: "intensity", from: 1, to: 0.6, startBar: 0, endBar: 8,  easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 0.6, to: 0.1, startBar: 8, endBar: 56, easing: "linear" },
      { effect: "vignette",  param: "intensity", from: 2, to: 1,   startBar: 0, endBar: 8,  easing: "linear" },
      { effect: "vignette",  param: "intensity", from: 1, to: 0,   startBar: 8, endBar: 64, easing: "linear" },
      { effect: "vignette",  param: "size",      from: 0.1, to: 0.4, startBar: 0, endBar: 8,  easing: "linear" },
      { effect: "vignette",  param: "size",      from: 0.4, to: 1,   startBar: 8, endBar: 64, easing: "linear" },
      { effect: "colourSweep", param: "randomize", from: 1, to: 1, startBar: 8, endBar: 8 },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.7, to: 0.9, startBar: 8, endBar: 8 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 56, easing: "easeInOut" },
      { effect: "blur",      param: "radius", from: 24, to: 4,   startBar: 8, endBar: 16, easing: "linear" },
      { effect: "blur",      param: "radius", from: 4,  to: 0,   startBar: 16, endBar: 56, easing: "linear" },
      { effect: "pixelate",  param: "pixelSize", from: 180, to: 32, startBar: 8, endBar: 16, easing: "linear" },
      { effect: "pixelate",  param: "pixelSize", from: 32,  to: 1,  startBar: 16, endBar: 56, easing: "linear" }
    ];
  }
  