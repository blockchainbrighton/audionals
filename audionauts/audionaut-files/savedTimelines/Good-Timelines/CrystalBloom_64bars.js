// CrystalBloom_64bars.js
// Gradual reveal with extended colour sweep durations and a slow pixelation dissolve.
export function CrystalBloom_64bars() {
  return [
    // Slower initial fade-in
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:24, easing: "linear" }, // Extended to 24 bars

    // Slow pixelation dissolve throughout
    { effect: "pixelate", param: "pixelSize", from: 128, to: 1, startBar: 0, endBar: 56, easing: "easeInOut" },

    // First colour sweep extended
    { effect:"colourSweep", param:"hueRange", from:[200,260], to:[200,260], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"edgeSoftness", from:0.1, to:0.1, startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:32, easing: "linear" }, // Extended to 32 bars

    { effect:"glitch", param:"intensity", from:0, to:0.7, startBar:16, endBar:16.6 },
    { effect:"glitch", param:"intensity", from:0.7, to:0, startBar:16.6, endBar:17.2 },

    // Second colour sweep extended
    { effect:"colourSweep", param:"hueRange", from:[320,20], to:[320,20], startBar:20, endBar:20 }, // Overlaps
    { effect:"colourSweep", param:"direction", from:-1, to:-1, startBar:20, endBar:20 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:20, endBar:48, easing: "linear" }, // Extended to bar 48

    { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:32, endBar:33 },
    { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:33, endBar:34 },

    // Third colour sweep extended
    { effect:"colourSweep", param:"hueRange", from:[60,120], to:[60,120], startBar:40, endBar:40 }, // Overlaps
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:40, endBar:64, easing: "linear" }, // Extended to bar 64

    // Blur pulse - original timing is fine
    { effect:"blur", param:"radius", from:0, to:14, startBar:40, endBar:41 },
    { effect:"blur", param:"radius", from:14, to:0, startBar:41, endBar:44 },

    { effect:"filmGrain", param:"intensity", from:0.2, to:0.05, startBar:48, endBar:64 }
  ];
}