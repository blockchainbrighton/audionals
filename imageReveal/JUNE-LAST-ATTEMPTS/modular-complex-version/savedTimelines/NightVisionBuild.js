// Nothing Visible

export function timeline_NightVisionBuild_64bars() {
    return [
      // Reveal shadows quickly
      { effect: "colourSweep", param: "hueRange",        from: [100,140], to: [100,140], startBar: 0, endBar: 0 },
      { effect: "colourSweep", param: "brightnessRange", from: [0,90],    to: [0,90],    startBar: 0, endBar: 0 },
      { effect: "colourSweep", param: "progress",        from: 0, to: 0.35, startBar: 0, endBar: 8, easing: "linear" },    // reveal some image in shadows by bar 8
      { effect: "colourSweep", param: "progress",        from: 0.35, to: 0.6, startBar: 8, endBar: 16, easing: "linear" }, // more image revealed by bar 16
      { effect: "colourSweep", param: "progress",        from: 0.6, to: 1, startBar: 16, endBar: 28, easing: "linear" },
      { effect: "scanLines",   param: "intensity",       from: 1, to: 0.4, startBar: 0, endBar: 8, easing: "easeInOut" },
      { effect: "scanLines",   param: "intensity",       from: 0.4, to: 0, startBar: 8, endBar: 32, easing: "easeInOut" },
      { effect: "filmGrain",   param: "intensity",       from: 1, to: 0.2, startBar: 0, endBar: 48, easing: "linear" },
      { effect: "pixelate",    param: "pixelSize",       from: 200, to: 32, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "pixelate",    param: "pixelSize",       from: 32, to: 16, startBar: 8, endBar: 24, easing: "linear" },
      { effect: "pixelate",    param: "pixelSize",       from: 16, to: 1, startBar: 24, endBar: 48, easing: "easeInOut" },
      { effect: "fade",        param: "progress",        from: 0, to: 1, startBar: 48, endBar: 64, easing: "linear" }
    ];
  }
  