// Really nice

export function glitchWaves_64bars() {
    return [
      // Quick glitch bursts and pixel wipe intro
      { effect: "fade", param: "progress", from: 0, to: 0.1, startBar: 8, endBar: 16 },
      { effect: "fade", param: "progress", from: 0.4, to: 0.75, startBar: 16, endBar: 48 },


      { effect: "pixelate", param: "pixelSize", from: 64, to: 8, startBar: 0, endBar: 8 },
      { effect: "glitch", param: "intensity", from: 0, to: 0.4, startBar: 0, endBar: 14, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 0.4, to: 0, startBar: 14, endBar: 16, easing: "easeInOut" },
      { effect: "scanLines", param: "intensity", from: 0.3, to: 0, startBar: 0, endBar: 16 },
  
      // Heavy color sweep block at drop
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 16, color: "#ffd600", mode: "hide", edgeSoftness: 0.8 },
  
      // Blur fade and rapid unpixelate, then chroma glitch
      { effect: "blur", param: "radius", from: 24, to: 0, startBar: 16, endBar: 24 },
      { effect: "pixelate", param: "pixelSize", from: 8, to: 1, startBar: 16, endBar: 24 },
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.25, startBar: 24, endBar: 32 },
      { effect: "chromaShift", param: "angle", from: 0, to: Math.PI, startBar: 24, endBar: 40 },
      { effect: "chromaShift", param: "intensity", from: 0.25, to: 0, startBar: 32, endBar: 40 },
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.25, startBar: 48, endBar: 56 },
      { effect: "chromaShift", param: "intensity", from: 0.25, to: 0, startBar: 56, endBar: 60 },
      { effect: "chromaShift", param: "angle", from: 0, to: Math.PI, startBar: 48, endBar: 60 },
      
  
      // Glitch+grain combo for drama
      { effect: "filmGrain", param: "intensity", from: 0, to: 1, startBar: 32, endBar: 40 },
      { effect: "glitch", param: "intensity", from: 0, to: 0.3, startBar: 36, endBar: 40, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 0.3, to: 0, startBar: 40, endBar: 40, easing: "easeInOut" },
      
      { effect: "colourSweep", param: "moveToTop", from: 0, to: 1, startBar: 30, endBar: 30 },
      { effect: "colourSweep", param: "progress", from: 1, to: 0.1, startBar: 32, endBar: 33, color: "#ffd600", mode: "reveal", edgeSoftness: 0.8 },
      { effect: "colourSweep", param: "progress", from: 0.1, to: 0.3, startBar: 33, endBar: 35, color: "#ffd600", mode: "reveal", edgeSoftness: 0.8 },
      { effect: "colourSweep", param: "progress", from: 0.3, to: 1, startBar: 35, endBar: 36, color: "#ffd600", mode: "reveal", edgeSoftness: 0.8 },



    //   { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 39, endBar: 40, color: "#ffd600", mode: "hide", edgeSoftness: 0.8 },
      { effect: "colourSweep", param: "progress", from: 0.1, to: 0.3, startBar: 40, endBar: 47.5, color: "#ffd600", mode: "reveal", edgeSoftness: 0.8 },
      { effect: "colourSweep", param: "progress", from: 0.3, to: 1, startBar: 47.5, endBar: 48, color: "#ffd600", mode: "reveal", edgeSoftness: 0.8 },


  
      // Unveiling final clarity
      { effect: "fade", param: "progress", from: 0.75, to: 1, startBar: 48, endBar: 56 },
      { effect: "filmGrain", param: "intensity", from: 1, to: 0.2, startBar: 48, endBar: 56 },
      { effect: "vignette", param: "intensity", from: 1, to: 0, startBar: 56, endBar: 64 },
    ];
  }
  