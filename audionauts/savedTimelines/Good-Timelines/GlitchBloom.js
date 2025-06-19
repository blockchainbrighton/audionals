// nice but needs to complete the image reveal


export function timelineGlitchBloom_2025_06_02() {
    return [
      // Early chaotic energy
      { effect: "glitch",      param: "intensity",  from: 0,   to: 0.8,  startBar: 0,  endBar: 4,   easing: "linear" },
      { effect: "glitch",      param: "intensity",  from: 0.8, to: 0.2,  startBar: 4,  endBar: 16,  easing: "linear" },
  
      // CRT lines dissolve
      { effect: "scanLines",   param: "intensity",  from: 1,   to: 0,    startBar: 0,  endBar: 24,  easing: "linear" },
      { effect: "scanLines",   param: "lineWidth",  from: 8,   to: 1,    startBar: 0,  endBar: 24,  easing: "linear" },
  
      // Ghostly chroma converges
      { effect: "chromaShift", param: "intensity",  from: 0,   to: 0.4,  startBar: 0,  endBar: 8,   easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity",  from: 0.4, to: 0,    startBar: 8,  endBar: 16,  easing: "easeInOut" },
  
      // Fade in and hold a sliver before final polish
      { effect: "fade",        param: "progress",   from: 0,   to: 0.9,  startBar: 0,  endBar: 16,  easing: "linear" },
      { effect: "fade",        param: "progress",   from: 0.9, to: 1,    startBar: 56, endBar: 64,  easing: "linear" },
  
      // Blocks resolve
      { effect: "pixelate",    param: "pixelSize",  from: 120, to: 1,    startBar: 8,  endBar: 48,  easing: "easeInOut" }
    ];
  }
  