// needs a big change at bar 16 and bar 40 

export function midnightReveal_64bars() {
    return [
      // Fade-in from pure black with vignette and heavy blur
      { effect: "fade", param: "progress", from: 0, to: 0.25, startBar: 0, endBar: 8 },
      { effect: "vignette", param: "intensity", from: 2, to: 1.4, startBar: 0, endBar: 16 },
      { effect: "blur", param: "radius", from: 32, to: 6, startBar: 0, endBar: 12 },
  
      // Subtle color sweep with shadow bias
      { effect: "colourSweep", param: "progress", from: 0, to: 0.8, startBar: 8, endBar: 24, color: "#0030ff", brightnessOffset: -80, edgeSoftness: 0.4 },
  
      // Grain slowly fades in as image comes into focus
      { effect: "filmGrain", param: "intensity", from: 0, to: 0.7, startBar: 12, endBar: 24 },
  
      // Dramatic unblur for 'midnight moment'
      { effect: "blur", param: "radius", from: 6, to: 0, startBar: 24, endBar: 32 },
      { effect: "fade", param: "progress", from: 0.25, to: 1, startBar: 16, endBar: 32 },
  
      // Glitch strobe and scanline finale
      { effect: "glitch", param: "intensity", from: 0, to: 0.1, startBar: 32, endBar: 36, easing: "easeInOut" },
      { effect: "scanLines", param: "intensity", from: 0, to: 0.6, startBar: 36, endBar: 40 },
      { effect: "glitch", param: "intensity", from: 0.1, to: 0, startBar: 40, endBar: 44, easing: "easeInOut" },
      { effect: "scanLines", param: "intensity", from: 0.6, to: 0, startBar: 44, endBar: 48 },
  
      // Final full reveal, soft vignette, grain out
      { effect: "filmGrain", param: "intensity", from: 0.7, to: 0, startBar: 56, endBar: 64 },
      { effect: "vignette", param: "intensity", from: 1.4, to: 0.1, startBar: 56, endBar: 64 },
    ];
  }
  