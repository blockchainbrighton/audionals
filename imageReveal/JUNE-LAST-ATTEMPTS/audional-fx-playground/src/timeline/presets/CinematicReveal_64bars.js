// CinematicReveal_64bars.js

export function CinematicReveal_64bars() {
    return [
      // Initial full fade-in, bars 0–8
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "easeOut" },
  
      // Film grain fades from heavy to subtle, bars 0–32
      { effect: "filmGrain", param: "intensity", from: 1.5, to: 0.5, startBar: 0, endBar: 32 },
  
      // Subtle vignette opens up, bars 0–16
      { effect: "vignette", param: "intensity", from: 2, to: 0.7, startBar: 0, endBar: 16 },
      { effect: "vignette", param: "size", from: 0.1, to: 0.35, startBar: 0, endBar: 16 },
  
      // Colour sweep reveals image left-to-right, bars 8–32
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 32, direction: 1, color: "#FDCB6E", edgeSoftness: 0.2 },
  
      // Scanlines fade in as a final touch, bars 24–40
      { effect: "scanLines", param: "intensity", from: 0, to: 0.35, startBar: 24, endBar: 40, spacing: 4, lineWidth: 1, direction: 1, progress: 1, verticalShift: 0 }
    ];
  }
  
  export default CinematicReveal_64bars;
  