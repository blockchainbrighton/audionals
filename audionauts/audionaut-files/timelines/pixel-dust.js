// reveal_PixelDustToClarity_64bars
// Features a controlled pixelation reveal that pulses between larger pixel sizes
// before a final smooth transition to full clarity.
export function reveal_PixelDustToClarity_64bars() {
  

  

  
  return [

    // Initial subtle blur that also clears
    { effect: "blur", param: "radius", from: 8, to: 0, startBar: 0, endBar: 48, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 240, to: 240, startBar: 0, endBar: 4, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 200, to: 200, startBar: 4, endBar: 8, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 140, to: 140, startBar: 8, endBar: 12, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 120, to: 120, startBar: 12, endBar: 16, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 32, to: 32, startBar: 16, endBar: 18, easing: "easeInOut" },

    { effect: "pixelate", param: "pixelSize", from: 64, to: 64, startBar: 18, endBar: 20, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 16, to: 1, startBar: 20, endBar: 24, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 140, to: 140, startBar: 24, endBar: 28, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 240, to: 240, startBar: 28, endBar: 32, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 32, endBar: 36, easing: "easeInOut" },



// Stage 1: Bold, wide, slowly moving scanlines fade in and space out
{ effect: "scanLines", param: "intensity", from: 0, to: 0.8, startBar: 0, endBar: 6, easing: "linear" },
{ effect: "scanLines", param: "lineWidth", from: 8, to: 3, startBar: 0, endBar: 8, easing: "easeInOut" },
{ effect: "scanLines", param: "spacing", from: 4, to: 14, startBar: 0, endBar: 8, easing: "easeInOut" },
{ effect: "scanLines", param: "speed", from: 0.3, to: 1.2, startBar: 0, endBar: 8, easing: "easeInOut" },

// Stage 2: Scanlines flip direction and become thinner, then slowly fade
{ effect: "scanLines", param: "direction", from: 1, to: -1, startBar: 8, endBar: 10, easing: "step" },
{ effect: "scanLines", param: "lineWidth", from: 3, to: 1, startBar: 8, endBar: 16, easing: "linear" },
{ effect: "scanLines", param: "spacing", from: 14, to: 8, startBar: 8, endBar: 16, easing: "linear" },
{ effect: "scanLines", param: "intensity", from: 0.8, to: 0.5, startBar: 8, endBar: 16, easing: "linear" },

// Stage 3: Scanlines pulse with a glitchy effect and fade out completely
{ effect: "scanLines", param: "intensity", from: 0.5, to: 1, startBar: 16, endBar: 18, easing: "easeInOut" },
{ effect: "scanLines", param: "intensity", from: 1, to: 2, startBar: 18, endBar: 48, easing: "easeInOut" },
{ effect: "scanLines", param: "lineWidth", from: 1, to: 6, startBar: 16, endBar: 18, easing: "easeInOut" },
{ effect: "scanLines", param: "lineWidth", from: 6, to: 1, startBar: 18, endBar: 48, easing: "easeInOut" },
{ effect: "scanLines", param: "spacing", from: 8, to: 16, startBar: 16, endBar: 60, easing: "linear" },
{ effect: "scanLines", param: "speed", from: 1.2, to: 2.2, startBar: 16, endBar: 48, easing: "linear" },

    // Chroma shift as it comes into focus
    { effect: "chromaShift", param: "intensity", from: 0, to: 0.05, startBar: 28, endBar: 36, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.05, to: 0, startBar: 36, endBar: 44, easing: "easeInOut" },

    // Fade to full visibility if pixelation isn't 100% clear
    { effect: "fade", param: "progress", from: 0.5, to: 1, startBar: 0, endBar: 64, easing: "linear" }
  ];
}
