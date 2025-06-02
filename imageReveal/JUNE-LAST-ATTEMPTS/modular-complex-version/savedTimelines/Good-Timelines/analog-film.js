//nice slow simple

export function analogFilm_64bars() {
    return [
      // Film grain and vignette dominant
      { effect: "filmGrain", param: "intensity", from: 1.2, to: 1.2, startBar: 0, endBar: 16 },
      { effect: "vignette", param: "intensity", from: 1.5, to: 1.5, startBar: 0, endBar: 8 },
  
      // Horizontal sweep reveals
      { effect: "colourSweep", param: "progress", from: 0, to: 0.3, startBar: 0, endBar: 16, direction: 1, edgeSoftness: 0.3 },
      { effect: "colourSweep", param: "progress", from: 0.3, to: 0.6, startBar: 16, endBar: 32, direction: -1, brightnessOffset: 100 },
      { effect: "colourSweep", param: "progress", from: 0.6, to: 1, startBar: 32, endBar: 48, direction: 1, hueRange: [200, 300] }, // Blues/purples
  
      // Gradual focus and grain reduction
      { effect: "blur", param: "radius", from: 15, to: 0, startBar: 0, endBar: 24 },
      { effect: "filmGrain", param: "intensity", from: 1.2, to: 0.2, startBar: 16, endBar: 40 },
      { effect: "vignette", param: "intensity", from: 1.5, to: 0.4, startBar: 8, endBar: 48 },
  
      // Final clarity
      { effect: "scanLines", param: "intensity", from: 0.4, to: 0, startBar: 48, endBar: 56 }
    ];
  }
  