// another great timeline  - doesn't wuite complete to reveal full original image

export function timeline_windowSweepReveal_64bars() {
    return [
      // Start black and pixelated, slowly fade in
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 240, to: 32, startBar: 0, endBar: 12, easing: "linear" },
      { effect: "blur", param: "radius", from: 32, to: 12, startBar: 0, endBar: 12, easing: "linear" },
  
      // Vignette window slowly grows, stays at medium for drama, then opens
      { effect: "vignette", param: "size", from: 0.2, to: 0.4, startBar: 6, endBar: 24, easing: "easeInOut" },
      { effect: "vignette", param: "size", from: 0.4, to: 0.95, startBar: 24, endBar: 54, easing: "easeInOut" },
      { effect: "vignette", param: "intensity", from: 2, to: 0, startBar: 48, endBar: 64, easing: "linear" },
  
      // Colour sweep reveals highlights only
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 12, endBar: 48, easing: "linear" },
      { effect: "colourSweep", param: "brightnessRange", from: [160,255], to: [0,255], startBar: 12, endBar: 40, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.15, to: 0.4, startBar: 16, endBar: 32, easing: "linear" },
  
      // Film grain fades in, peaks, then fades out as clarity arrives
      { effect: "filmGrain", param: "intensity", from: 0, to: 1.2, startBar: 4, endBar: 36, easing: "easeInOut" },
      { effect: "filmGrain", param: "intensity", from: 1.2, to: 0, startBar: 36, endBar: 60, easing: "linear" },
  
      // Final pixelation/blurring smooths to sharpness
      { effect: "pixelate", param: "pixelSize", from: 32, to: 1, startBar: 12, endBar: 60, easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 12, to: 0, startBar: 20, endBar: 60, easing: "easeInOut" },
    ];
  }
  