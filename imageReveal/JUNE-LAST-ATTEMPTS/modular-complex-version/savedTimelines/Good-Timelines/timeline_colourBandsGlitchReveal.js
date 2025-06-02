// really great timeline effect only doesn't quite complete to reveal original image

export function timeline_colourBandsGlitchReveal_64bars() {
    return [
      // Very slow fade and pixelation dissolve
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 16, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 32, easing: "linear" },
  
      // Overlapping colour sweeps targeting different hue bands for painterly reveal
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 48, easing: "linear" },
      { effect: "colourSweep", param: "hueRange", from: [0,60], to: [0,120], startBar: 8, endBar: 28, easing: "linear" },
      { effect: "colourSweep", param: "hueRange", from: [120,240], to: [60,240], startBar: 18, endBar: 38, easing: "linear" },
      { effect: "colourSweep", param: "hueRange", from: [240,360], to: [180,360], startBar: 28, endBar: 48, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.25, to: 0.6, startBar: 12, endBar: 44, easing: "easeInOut" },
  
      // Scanlines fade in and out in the first half
      { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 0, endBar: 18, easing: "easeInOut" },
      { effect: "scanLines", param: "intensity", from: 0, to: 0.7, startBar: 36, endBar: 48, easing: "linear" },
      { effect: "scanLines", param: "intensity", from: 0.7, to: 0, startBar: 48, endBar: 56, easing: "linear" },
  
      // Film grain pulses at midpoint, then vanishes
      { effect: "filmGrain", param: "intensity", from: 0.6, to: 1.3, startBar: 20, endBar: 36, easing: "easeInOut" },
      { effect: "filmGrain", param: "intensity", from: 1.3, to: 0, startBar: 36, endBar: 48, easing: "linear" },
  
      // Sudden glitch bursts near the end for dramatic accent
      { effect: "glitch", param: "intensity", from: 0, to: 0.8, startBar: 54, endBar: 56, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 0.8, to: 0, startBar: 56, endBar: 58, easing: "linear" },
    ];
  }
  