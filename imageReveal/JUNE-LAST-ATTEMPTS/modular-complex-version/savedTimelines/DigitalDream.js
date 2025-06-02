// still nothing visible

export function timeline_DigitalDream_64bars() {
    return [
      // Immediate fade and block reveal
      { effect: "fade",     param: "progress", from: 0,   to: 1,   startBar: 0, endBar: 4,  easing: "linear" },
      { effect: "pixelate", param: "pixelSize",from: 240, to: 64,  startBar: 0, endBar: 8,  easing: "linear" },
      { effect: "pixelate", param: "pixelSize",from: 64,  to: 32,  startBar: 8, endBar: 16, easing: "linear" },
      { effect: "pixelate", param: "pixelSize",from: 32,  to: 1,   startBar: 24, endBar: 48, easing: "easeInOut" },
  
      // Add glitch accents for energy
      { effect: "glitch",   param: "intensity",from: 0,   to: 1,   startBar: 16, endBar: 17, easing: "easeInOut" },
      { effect: "glitch",   param: "intensity",from: 1,   to: 0,   startBar: 17, endBar: 18, easing: "easeInOut" },
      { effect: "glitch",   param: "intensity",from: 0,   to: 1,   startBar: 32, endBar: 33, easing: "easeInOut" },
      { effect: "glitch",   param: "intensity",from: 1,   to: 0,   startBar: 33, endBar: 34, easing: "easeInOut" },
      { effect: "glitch",   param: "intensity",from: 0,   to: 1,   startBar: 48, endBar: 49, easing: "easeInOut" },
      { effect: "glitch",   param: "intensity",from: 1,   to: 0,   startBar: 49, endBar: 50, easing: "easeInOut" },
  
      // Colour sweep for finale
      { effect: "colourSweep", param: "hueRange", from: [0,360], to: [0,360], startBar: 40, endBar: 40 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 40, endBar: 64, easing: "easeInOut" }
    ];
  }
  