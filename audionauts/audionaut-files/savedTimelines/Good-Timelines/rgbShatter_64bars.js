// not progressing

export function rgbShatter_64bars() {
  return [
    // Hard conceal: chroma shift, pixelation, blur
    { effect: "chromaShift", param: "intensity", from: 0.3, to: 0.3, startBar: 0, endBar: 12 },
    { effect: "pixelate", param: "pixelSize", from: 32, to: 32, startBar: 0, endBar: 8 },
    { effect: "blur", param: "radius", from: 20, to: 8, startBar: 0, endBar: 12 },

    // Animate parameters off at special moments
    { effect: "pixelate", param: "pixelSize", from: 32, to: 4, startBar: 8, endBar: 16 },
    { effect: "chromaShift", param: "angle", from: 0, to: Math.PI, startBar: 8, endBar: 24 },
    { effect: "chromaShift", param: "intensity", from: 0.3, to: 0, startBar: 16, endBar: 24 },

    // Gradually reveal focus, fade up
    { effect: "blur", param: "radius", from: 8, to: 0, startBar: 16, endBar: 32 },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 16, endBar: 32 },

    // Quick rainbow glitch burst at 32
    { effect: "glitch", param: "intensity", from: 0, to: 0.5, startBar: 32, endBar: 34, easing: "easeInOut" },
    { effect: "glitch", param: "rainbow", from: 0, to: 8, startBar: 32, endBar: 36, easing: "easeInOut" },
    { effect: "glitch", param: "rainbow", from: 8, to: 0, startBar: 36, endBar: 40, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0.5, to: 0, startBar: 34, endBar: 40, easing: "easeInOut" },

    // Soft grain, vignette, clarity
    { effect: "filmGrain", param: "intensity", from: 0, to: 0.5, startBar: 40, endBar: 56 },
    { effect: "vignette", param: "intensity", from: 0, to: 0.3, startBar: 48, endBar: 56 },
    { effect: "filmGrain", param: "intensity", from: 0.5, to: 0, startBar: 56, endBar: 64 },
    { effect: "vignette", param: "intensity", from: 0.3, to: 0, startBar: 56, endBar: 64 },
  ];
}
