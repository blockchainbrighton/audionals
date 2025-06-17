// slow and steady  - gets there in the end

export function revealByBrightnessBands_64bars() {
    return [
      // Initial blurred state with heavy grain
      { effect: "blur", param: "radius", from: 32, to: 32, startBar: 0, endBar: 4 },
      { effect: "filmGrain", param: "intensity", from: 0.8, to: 0.8, startBar: 0, endBar: 8 },
  
      // Gradual focus and fade-in
      { effect: "fade", param: "progress", from: 0.2, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 32, to: 0, startBar: 4, endBar: 16, easing: "easeInOut" },
  
      // Targeted reveals by brightness
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 24, brightnessRange: [0, 85] },        // Shadows first
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 16, endBar: 32, brightnessRange: [85, 170] },     // Midtones
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 24, endBar: 40, brightnessRange: [170, 255] },    // Highlights
  
      // Final touches
      { effect: "vignette", param: "intensity", from: 1.5, to: 0.3, startBar: 40, endBar: 56 },
      { effect: "filmGrain", param: "intensity", from: 0.8, to: 0.1, startBar: 32, endBar: 48 }
    ];
  }
  