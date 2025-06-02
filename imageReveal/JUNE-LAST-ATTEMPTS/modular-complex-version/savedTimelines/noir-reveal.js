// Still nothing visible

export function timeline_noirReveal_64bars() {
    return [
      // Quick fade and first pixel blocks, so the image is visible by bar 8
      { effect: "filmGrain", param: "intensity", from: 1.8, to: 1.2, startBar: 0, endBar: 8,  easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 1.2, to: 0.9, startBar: 8, endBar: 24, easing: "linear" },
      { effect: "vignette",  param: "intensity", from: 2, to: 1.3, startBar: 0, endBar: 8,  easing: "easeInOut" },
      { effect: "vignette",  param: "intensity", from: 1.3, to: 1, startBar: 8, endBar: 24, easing: "easeInOut" },
      { effect: "fade",      param: "progress",  from: 0, to: 1,   startBar: 0, endBar: 8,  easing: "linear" },
  
      // Reduce effects for clarity and drama
      { effect: "filmGrain", param: "intensity", from: 0.9, to: 0.2, startBar: 24, endBar: 56, easing: "linear" },
      { effect: "vignette",  param: "intensity", from: 1, to: 0, startBar: 32, endBar: 64, easing: "linear" },
      { effect: "pixelate",  param: "pixelSize", from: 200, to: 32, startBar: 0, endBar: 8,  easing: "easeInOut" },
      { effect: "pixelate",  param: "pixelSize", from: 32, to: 1,   startBar: 8, endBar: 44, easing: "easeInOut" },
      { effect: "blur",      param: "radius",    from: 16, to: 4,   startBar: 0, endBar: 8,  easing: "easeInOut" },
      { effect: "blur",      param: "radius",    from: 4,  to: 0,   startBar: 8, endBar: 44, easing: "easeInOut" },
  
      // Subtle colour sweep across midsection
      { effect: "colourSweep", param: "progress",    from: 0, to: 1,    startBar: 20, endBar: 56, easing: "easeInOut" },
      { effect: "colourSweep", param: "edgeSoftness",from: 0.05, to: 0.35, startBar: 24, endBar: 48, easing: "easeInOut" },
    ];
  }
  