// NICE ONE!!

export function timeline_dramaticGlitchChroma_64bars() {
    return [
      // Fade and scanlines, but leave image visible by bar 8
      { effect: "fade",       param: "progress", from: 0,  to: 1,   startBar: 0, endBar: 4,  easing: "easeInOut" },
      { effect: "scanLines",  param: "intensity",from: 1,  to: 0.6, startBar: 0, endBar: 6,  easing: "linear" },
      { effect: "scanLines",  param: "intensity",from: 0.6,to: 0,   startBar: 6, endBar: 12, easing: "linear" },
      { effect: "scanLines",  param: "lineWidth",from: 10, to: 2,   startBar: 0, endBar: 12, easing: "linear" },
  
      // ChromaShift comes in early for digital movement
      { effect: "chromaShift",param: "intensity",from: 0,  to: 0.3, startBar: 4, endBar: 16, easing: "linear" },
      { effect: "chromaShift",param: "intensity",from: 0.3,to: 0,   startBar: 16,endBar: 40, easing: "linear" },
      { effect: "chromaShift",param: "direction", from: 1,  to: -1, startBar: 12,endBar: 32, easing: "linear" },
  
      // Early glitch pulse for accent
      { effect: "glitch",     param: "intensity",from: 0,  to: 0.6, startBar: 8, endBar: 9,  easing: "easeInOut" },
      { effect: "glitch",     param: "intensity",from: 0.6,to: 0,   startBar: 9, endBar: 10, easing: "linear" },
      { effect: "glitch",     param: "intensity",from: 0,  to: 0.7, startBar: 32,endBar: 33, easing: "easeInOut" },
      { effect: "glitch",     param: "intensity",from: 0.7,to: 0,   startBar: 33,endBar: 34, easing: "linear" },
      { effect: "glitch",     param: "intensity",from: 0,  to: 1,   startBar: 48,endBar: 49, easing: "easeInOut" },
      { effect: "glitch",     param: "intensity",from: 1,  to: 0,   startBar: 49,endBar: 50, easing: "linear" },
  
      // Colour sweep starts earlier for visible build
      { effect: "colourSweep",param: "progress",  from: 0,  to: 1,   startBar: 8, endBar: 60, easing: "easeInOut" },
      { effect: "colourSweep",param: "direction", from: 1,  to: 1,   startBar: 8, endBar: 60, easing: "linear" },
      { effect: "colourSweep",param: "edgeSoftness",from:0.15,to:0.5,startBar:24,endBar:40,easing: "linear" },
  
      // Pixelation/blur begin to fade much sooner
      { effect: "pixelate",   param: "pixelSize", from: 64, to: 16,  startBar: 0, endBar: 8,  easing: "easeInOut" },
      { effect: "pixelate",   param: "pixelSize", from: 16, to: 1,   startBar: 8, endBar: 56, easing: "easeInOut" },
      { effect: "blur",       param: "radius",    from: 16, to: 2,   startBar: 0, endBar: 8,  easing: "linear" },
      { effect: "blur",       param: "radius",    from: 2,  to: 0,   startBar: 8, endBar: 56, easing: "linear" },
    ];
  }
  