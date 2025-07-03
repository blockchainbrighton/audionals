export function timeline_StarlitReveal_64bars() {
  const forwards = [
    { effect: "filmGrain", param: "intensity", from: 1, to: 0.6, startBar: 0, endBar: 8,  easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.6, to: 0.1, startBar: 8, endBar: 56, easing: "linear" },
    { effect: "vignette",  param: "intensity", from: 2, to: 1,   startBar: 0, endBar: 8,  easing: "linear" },
    { effect: "vignette",  param: "intensity", from: 1, to: 0,   startBar: 8, endBar: 56, easing: "linear" },
    { effect: "vignette",  param: "size",      from: 0.1, to: 0.4, startBar: 0, endBar: 8,  easing: "linear" },
    { effect: "vignette",  param: "size",      from: 0.4, to: 1,   startBar: 8, endBar: 56, easing: "linear" },
    { effect: "colourSweep", param: "randomize", from: 1, to: 1, startBar: 8, endBar: 8 },
    { effect: "colourSweep", param: "edgeSoftness", from: 0.7, to: 0.9, startBar: 8, endBar: 8 },
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 56, easing: "easeInOut" },
    { effect: "blur",      param: "radius", from: 24, to: 4,   startBar: 8, endBar: 16, easing: "linear" },
    { effect: "blur",      param: "radius", from: 4,  to: 0,   startBar: 16, endBar: 56, easing: "linear" },
    { effect: "pixelate",  param: "pixelSize", from: 180, to: 32, startBar: 8, endBar: 16, easing: "linear" },
    { effect: "pixelate",  param: "pixelSize", from: 32,  to: 1,  startBar: 16, endBar: 56, easing: "linear" }
  ];
  const reverse = [
    // Pixelate does "starburst" pulse: grows big and rapidly resolves
    // { effect: "pixelate", param: "pixelSize", from: 1, to: 64, startBar: 56, endBar: 60, easing: "easeIn" },
    // { effect: "pixelate", param: "pixelSize", from: 64, to: 1, startBar: 60, endBar: 64, easing: "easeOut" },

    // Vignette does a flash-in, then fades out
    { effect: "vignette", param: "intensity", from: 0, to: 2.5, startBar: 56, endBar: 59, easing: "easeIn" },
    { effect: "vignette", param: "intensity", from: 2.5, to: 0, startBar: 59, endBar: 64, easing: "easeOut" },
    { effect: "vignette", param: "size", from: 1, to: 0.2, startBar: 56, endBar: 64, easing: "linear" },

    // FilmGrain surges and fades
    { effect: "filmGrain", param: "intensity", from: 0.1, to: 1.2, startBar: 56, endBar: 60, easing: "easeIn" },
    { effect: "filmGrain", param: "intensity", from: 1.2, to: 0, startBar: 60, endBar: 64, easing: "easeOut" },

    // Blur does a soft glow
    { effect: "blur", param: "radius", from: 0, to: 18, startBar: 56, endBar: 62, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 18, to: 0, startBar: 62, endBar: 64, easing: "linear" },

    // // ColourSweep retracts with more edge softness
    // { effect: "colourSweep", param: "progress", from: 1, to: 0, startBar: 56, endBar: 64, easing: "linear" },
    // { effect: "colourSweep", param: "edgeSoftness", from: 0.9, to: 0.5, startBar: 56, endBar: 64, easing: "linear" },

    // // Deactivate all at the very end
    // { effect: "colourSweep", param: "active", from: true, to: false, startBar: 63, endBar: 64 }
  ];

  return [...forwards, ...reverse];
}
