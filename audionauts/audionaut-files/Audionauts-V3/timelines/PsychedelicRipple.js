// Really  nice timing and mix of effects
export function timelinePsychedelicRipple_2025_06_02() {
    return [
      // Base visibility
      { effect: "fade",        param: "progress",   from: 0,    to: 1,     startBar: 0,  endBar: 16, easing: "easeInOut" },
  
      // Alternating hue band sweeps (reds then blues then greens)
      { effect: "colourSweep", param: "hueRange",    from: [330, 30], to: [330, 30], startBar: 0,  endBar: 0,  easing: "linear" },
      { effect: "colourSweep", param: "progress",    from: 0,   to: 1,     startBar: 0,  endBar: 24, easing: "linear" },
  
      { effect: "colourSweep", param: "hueRange",    from: [180, 240], to: [180, 240], startBar: 24, endBar: 24, easing: "linear" },
      { effect: "colourSweep", param: "progress",    from: 0,   to: 1,     startBar: 24, endBar: 48, easing: "linear" },
  
      { effect: "colourSweep", param: "hueRange",    from: [60, 120], to: [60, 120],  startBar: 48, endBar: 48, easing: "linear" },
      { effect: "colourSweep", param: "progress",    from: 0,   to: 1,     startBar: 48, endBar: 64, easing: "linear" },
  
      // Psychedelic edges
      { effect: "chromaShift", param: "intensity",   from: 0,   to: 0.5,   startBar: 0,  endBar: 4,  easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity",   from: 0.5, to: 0,     startBar: 4,  endBar: 8,  easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity",   from: 0,   to: 0.5,   startBar: 16, endBar: 20, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity",   from: 0.5, to: 0,     startBar: 20, endBar: 24, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity",   from: 0,   to: 0.5,   startBar: 32, endBar: 36, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity",   from: 0.5, to: 0,     startBar: 36, endBar: 40, easing: "easeInOut" },
  
      // Random glitch hits
      { effect: "glitch",      param: "intensity",   from: 0,   to: 0.7,   startBar: 12, endBar: 13, easing: "linear" },
      { effect: "glitch",      param: "intensity",   from: 0,   to: 0.7,   startBar: 40, endBar: 41, easing: "linear" },
      { effect: "glitch",      param: "intensity",   from: 0.7, to: 0,     startBar: 41, endBar: 42, easing: "linear" }
    ];
  }
  