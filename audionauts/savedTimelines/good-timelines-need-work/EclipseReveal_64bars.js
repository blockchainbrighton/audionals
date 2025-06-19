// EclipseReveal_64bars.js
// More varied first 32 bars with pulsing vignette, pixelation, blur, and early chroma shift.
export function EclipseReveal_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:8, easing: "linear" }, // Make fade linear for predictability

    // --- More variation in first 32 bars ---
    // Vignette pulses slightly then grows
    { effect:"vignette", param:"size", from:0.1, to:0.05, startBar:0, endBar:4, easing:"easeInOut" },
    { effect:"vignette", param:"size", from:0.05, to:0.2, startBar:4, endBar:8, easing:"easeInOut" },
    { effect:"vignette", param:"size", from:0.2, to:1, startBar:8, endBar:32, easing:"easeInOut" }, // Main expansion

    // Pixelation starts high, reduces with a pulse
    { effect: "pixelate", param: "pixelSize", from: 200, to: 100, startBar: 0, endBar: 12, easing: "easeInOut"},
    { effect: "pixelate", param: "pixelSize", from: 100, to: 150, startBar: 12, endBar: 16, easing: "easeInOut"}, // Pulse up
    { effect: "pixelate", param: "pixelSize", from: 150, to: 40, startBar: 16, endBar: 32, easing: "easeInOut"},

    // Subtle blur clears
    { effect: "blur", param: "radius", from: 10, to: 0, startBar: 0, endBar: 24, easing: "linear"},

    // Early chroma shift pulse
    { effect: "chromaShift", param: "intensity", from: 0, to: 0.2, startBar: 12, endBar: 15, easing:"easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.2, to: 0, startBar: 15, endBar: 18, easing:"easeInOut" },
    // --- End of first 32 bars variation ---

    { effect:"filmGrain", param:"intensity", from:0.3, to:1, startBar:16, endBar:18 }, // Kept as is for accent
    { effect:"filmGrain", param:"intensity", from:1, to:0.3, startBar:18, endBar:20 },

    // Remainder of the effects
    { effect:"colourSweep", param:"mode", from:"hide", to:"hide", startBar:32, endBar:32 },
    { effect:"colourSweep", param:"direction", from:-1, to:-1, startBar:32, endBar:32 },
    { effect:"colourSweep", param:"edgeSoftness", from:0.9, to:0.9, startBar:32, endBar:32 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:32, endBar:48 }, // Pixelation should be low/gone by here

    // Final pixelate clear (if needed, after other effects)
    { effect: "pixelate", param: "pixelSize", from: 40, to: 1, startBar: 32, endBar: 40, easing: "easeInOut"},


    { effect:"glitch", param:"intensity", from:0, to:0.8, startBar:40, endBar:40.5 },
    { effect:"glitch", param:"intensity", from:0.8, to:0, startBar:40.5, endBar:41 },

    { effect:"vignette", param:"size", from:1, to:0.6, startBar:48, endBar:52 },
    { effect:"vignette", param:"size", from:0.6, to:1, startBar:52, endBar:64 }
  ];
}