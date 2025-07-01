// lovely effect timeline lovely combo of scan lines and chroma 

export function revealPixelGlitchChroma_64bars() {
  return [
    // Pixelated start with scanlines
    { effect: "pixelate", param: "pixelSize", from: 120, to: 120, startBar: 0, endBar: 8 },
    { effect: "scanLines", param: "intensity", from: 0.9, to: 0.9, startBar: 0, endBar: 16 },

    // Progressive reveals with glitch disruptions
    { effect: "colourSweep", param: "progress", from: 0, to: 0.5, startBar: 0, endBar: 16, randomize: 1, edgeSoftness: 0.2 },
    { effect: "glitch", param: "intensity", from: 0, to: 0.9, startBar: 16, endBar: 16.5 },
    { effect: "glitch", param: "intensity", from: 0.9, to: 0, startBar: 16.5, endBar: 17 },

    // Chromatic shifts and focus
    { effect: "colourSweep", param: "progress", from: 0.5, to: 0.8, startBar: 20, endBar: 36 },
    { effect: "chromaShift", param: "intensity", from: 0.3, to: 0, startBar: 24, endBar: 40 },
    { effect: "pixelate", param: "pixelSize", from: 120, to: 1, startBar: 16, endBar: 40 },

    // Final reveal with soft vignette
    { effect: "colourSweep", param: "progress", from: 0.8, to: 1, startBar: 40, endBar: 56, mode: "reveal", edgeSoftness: 0.5 },
    { effect: "vignette", param: "intensity", from: 0.8, to: 0.2, startBar: 48, endBar: 64 }
  ];
}
