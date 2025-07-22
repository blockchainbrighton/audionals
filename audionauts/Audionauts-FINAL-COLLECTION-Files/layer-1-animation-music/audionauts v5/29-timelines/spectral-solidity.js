export function reveal_SpectralSweepSolidify_64bars() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "linear" },
    { effect: "colourSweep", param: "active", from: true, to: true, startBar: 0, endBar: 0 },
    { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 0, endBar: 0 },
    { effect: "colourSweep", param: "hueRange", from: [0, 60], to: [0, 60], startBar: 0, endBar: 0 },
    { effect: "colourSweep", param: "edgeSoftness", from: 0.8, to: 0.8, startBar: 0, endBar: 0 },
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "colourSweep", param: "brightnessOffset", from: -50, to: 0, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "colourSweep", param: "hueRange", from: [0, 60], to: [0, 360], startBar: 32, endBar: 33, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 32, endBar: 56, easing: "linear" }, // ends at 56
    { effect: "colourSweep", param: "edgeSoftness", from: 0.8, to: 0.2, startBar: 32, endBar: 56, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 0, startBar: 0, endBar: 56, easing: "linear" },
    { effect: "filmGrain", param: "speed", from: 1, to: 0, startBar: 0, endBar: 56, easing: "linear" },
    { effect: "blur", param: "radius", from: 10, to: 0, startBar: 0, endBar: 56, easing: "linear" },

    // Explicit clear for last 8 bars
    { effect: "colourSweep", param: "active", from: true, to: false, startBar: 56, endBar: 64 },
    { effect: "colourSweep", param: "progress", from: 1, to: 0, startBar: 56, endBar: 64 }
  ];
}
