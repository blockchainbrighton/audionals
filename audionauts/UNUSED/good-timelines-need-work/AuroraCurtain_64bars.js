// AuroraCurtain_64bars.js
// Slower, more majestic reveal with extended colour sweeps and gentle pixel/blur dissolve.
export function AuroraCurtain_64bars() {
  return [
    // Slower initial fade-in
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:16, easing:"easeInOut" }, // Extended to 16 bars

    // Slow, overarching pixelate and blur dissolve
    { effect: "pixelate", param: "pixelSize", from: 64, to: 1, startBar: 0, endBar: 48, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 12, to: 0, startBar: 0, endBar: 40, easing: "linear" },


    // First colour sweep extended
    { effect:"colourSweep", param:"hueRange", from:[180,260], to:[180,260], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:32, easing:"linear" }, // Extended to 32 bars

    { effect:"glitch", param:"intensity", from:0, to:1, startBar:16, endBar:16.5, easing:"easeInOut" },
    { effect:"glitch", param:"intensity", from:1, to:0, startBar:16.5, endBar:17, easing:"easeInOut" },

    // Second colour sweep extended
    { effect:"colourSweep", param:"hueRange", from:[0,60], to:[0,60], startBar:24, endBar:24 }, // Starts during the first sweep's latter half
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:24, endBar:56, easing:"linear" }, // Extended to bar 56

    { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:32, endBar:34, easing:"easeInOut" },
    { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:34, endBar:36, easing:"easeInOut" },

    // Blur pulse - original timing is fine for an accent
    { effect:"blur", param:"radius", from:0, to:20, startBar:40, endBar:41, easing:"linear" }, // This is a quick pulse, not the main blur
    { effect:"blur", param:"radius", from:20, to:0, startBar:41, endBar:44, easing:"easeInOut" },

    // Third colour sweep extended
    { effect:"colourSweep", param:"hueRange", from:[300,360], to:[300,360], startBar:48, endBar:48 }, // Starts during second sweep's latter half
    { effect:"colourSweep", param:"progress", from:0,to:1, startBar:48, endBar:64, easing:"linear" }, // Ends at 64

    { effect:"filmGrain", param:"intensity", from:1, to:0.2, startBar:0, endBar:64, easing:"linear" }
  ];
}