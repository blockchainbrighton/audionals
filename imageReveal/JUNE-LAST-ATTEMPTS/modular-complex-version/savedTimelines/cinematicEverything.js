// still nothing visible

export function timeline_cinematicEverything_64bars() {
    return [
      // Immediate fade and start revealing by pixel/blur/scanlines within 8 bars
      { effect: "fade",      param: "progress", from: 0,   to: 1,   startBar: 0, endBar: 4,  easing: "linear" },
      { effect: "pixelate",  param: "pixelSize",from: 240, to: 32,  startBar: 0, endBar: 8,  easing: "easeInOut" },
      { effect: "pixelate",  param: "pixelSize",from: 32,  to: 16,  startBar: 8, endBar: 24, easing: "easeInOut" },
      { effect: "blur",      param: "radius",   from: 32,  to: 4,   startBar: 0, endBar: 8,  easing: "linear" },
      { effect: "blur",      param: "radius",   from: 4,   to: 2,   startBar: 8, endBar: 20, easing: "linear" },
      { effect: "scanLines", param: "intensity",from: 1,   to: 0.5, startBar: 0, endBar: 8,  easing: "easeInOut" },
      { effect: "scanLines", param: "intensity",from: 0.5, to: 0,   startBar: 8, endBar: 20, easing: "easeInOut" },
      { effect: "vignette",  param: "intensity",from: 2,   to: 0.7, startBar: 0, endBar: 8,  easing: "easeInOut" },
      { effect: "vignette",  param: "intensity",from: 0.7, to: 0.4, startBar: 8, endBar: 32, easing: "easeInOut" },
      { effect: "filmGrain", param: "intensity",from: 1.2, to: 0.6, startBar: 0, endBar: 8,  easing: "linear" },
      { effect: "filmGrain", param: "intensity",from: 0.6, to: 0.2, startBar: 8, endBar: 44, easing: "linear" },
  
      // All clarity by bar 44, then sweep colour for final reveal
      { effect: "pixelate",  param: "pixelSize",from: 16,  to: 1,   startBar: 24, endBar: 44, easing: "linear" },
      { effect: "blur",      param: "radius",   from: 2,   to: 0,   startBar: 20, endBar: 44, easing: "easeInOut" },
      { effect: "vignette",  param: "intensity",from: 0.4, to: 0,   startBar: 44, endBar: 64, easing: "linear" },
      { effect: "scanLines", param: "intensity",from: 0,   to: 0.6, startBar: 48, endBar: 60, easing: "easeInOut" },
      { effect: "scanLines", param: "intensity",from: 0.6, to: 0,   startBar: 60, endBar: 64, easing: "linear" },
  
      // Slow colour sweep with high softness and shifting hue
      { effect: "colourSweep", param: "progress",    from: 0, to: 1,    startBar: 32, endBar: 64, easing: "easeInOut" },
      { effect: "colourSweep", param: "edgeSoftness",from: 0.2, to: 0.6,startBar: 32, endBar: 64, easing: "linear" },
      { effect: "colourSweep", param: "hueRange",    from: [0,360], to: [120,360], startBar: 32, endBar: 64, easing: "linear" }
    ];
  }
  