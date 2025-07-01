// nice - needs some earlier visuals as startes too late

export function windowCascade_64bars() {
    return [
      // Window reveal via vignette and color sweep
      { effect: "vignette", param: "size", from: 0.12, to: 0.45, startBar: 0, endBar: 16 },
      { effect: "vignette", param: "intensity", from: 2, to: 0.8, startBar: 0, endBar: 16 },
      { effect: "colourSweep", param: "progress", from: 0, to: 0.6, startBar: 0, endBar: 24, color: "#ff6f00", mode: "hide", edgeSoftness: 0.8 },
      { effect: "fade", param: "progress", from: 0, to: 0.8, startBar: 8, endBar: 24 },
  
      // Central clarity: sharp focus, subtle grain
      { effect: "blur", param: "radius", from: 18, to: 0, startBar: 16, endBar: 32 },
      { effect: "filmGrain", param: "intensity", from: 0.8, to: 0.3, startBar: 24, endBar: 40 },
  
      // Pixelate + glitch sweep at the mid-point
      { effect: "pixelate", param: "pixelSize", from: 8, to: 1, startBar: 32, endBar: 40 },
      { effect: "glitch", param: "intensity", from: 0, to: 0.08, startBar: 40, endBar: 44, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 0.08, to: 0, startBar: 44, endBar: 48, easing: "easeInOut" },
  
      // End: reveal window grows, fade to clarity, remove grain
      { effect: "vignette", param: "size", from: 0.45, to: 1, startBar: 48, endBar: 64 },
      { effect: "vignette", param: "intensity", from: 0.8, to: 0, startBar: 56, endBar: 64 },
      { effect: "fade", param: "progress", from: 0.8, to: 1, startBar: 56, endBar: 64 },
      { effect: "filmGrain", param: "intensity", from: 0.3, to: 0, startBar: 56, endBar: 64 },
    ];
  }
  