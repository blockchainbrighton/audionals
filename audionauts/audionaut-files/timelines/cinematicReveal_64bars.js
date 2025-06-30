// Filename: cinematicReveal_64bars.js

export function cinematicReveal_64bars() {
    return [
      // Initial grainy darkness
      { effect: "filmGrain", param: "intensity", from: 1.5, to: 1.5, startBar: 0, endBar: 8 },
      { effect: "vignette", param: "intensity", from: 2.0, to: 2.0, startBar: 0, endBar: 8 },
  
      // Fade in the image
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 16 },
  
      // Blur pulls focus
      { effect: "blur", param: "radius", from: 32, to: 5, startBar: 0, endBar: 24, easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 5, to: 0, startBar: 24, endBar: 32, easing: "easeInOut" },
  
      // Subtle scanlines reveal texture
      { effect: "scanLines", param: "intensity", from: 0.8, to: 0.2, startBar: 8, endBar: 32, easing: "linear" },
  
      // Colour sweep wash
      { effect: "colourSweep", param: "progress", from: 0, to: 0.4, startBar: 16, endBar: 32, direction: 1, edgeSoftness: 0.5, color: "#ff4444" },
      { effect: "colourSweep", param: "progress", from: 0.4, to: 0.8, startBar: 32, endBar: 48, direction: -1, hueRange: [0, 60], brightnessOffset: 50 },
      { effect: "colourSweep", param: "progress", from: 0.8, to: 1, startBar: 48, endBar: 56, direction: 1, hueRange: [180, 240], edgeSoftness: 0.2 },
  
      // Grain reduction as clarity rises
      { effect: "filmGrain", param: "intensity", from: 1.5, to: 0.3, startBar: 8, endBar: 40, easing: "easeInOut" },
  
      // Vignette softens
      { effect: "vignette", param: "intensity", from: 2.0, to: 0.5, startBar: 8, endBar: 48, easing: "easeInOut" },
  
      // Final glitch tease before full clarity
      { effect: "glitch", param: "intensity", from: 0, to: 0, startBar: 0, endBar: 32 },
      { effect: "glitch", param: "intensity", from: 0.3, to: 0, startBar: 32, endBar: 32.5, easing: "easeInOut", rainbow: 5, spacing: 0.8 },
      { effect: "glitch", param: "intensity", from: 0.05, to: 0.001, startBar: 56, endBar: 64, easing: "easeInOut", rainbow: 2, spacing: 0.4 }
    ];
  }
  