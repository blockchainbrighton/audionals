export function RadiantRipple_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:8 },
    { effect:"colourSweep", param:"mode", from:"reveal", to:"reveal", startBar:0, endBar:0 },
    { effect:"colourSweep", param:"brightnessRange", from:[0,70], to:[0,70], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:24 },
    { effect:"vignette", param:"intensity", from:1.2, to:0.4, startBar:16, endBar:20, easing:"easeInOut" },
    { effect:"colourSweep", param:"brightnessRange", from:[60,190], to:[60,190], startBar:24, endBar:24 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:24, endBar:48 },
    { effect:"filmGrain", param:"intensity", from:0.3, to:0.9, startBar:32, endBar:34, easing:"easeInOut" },
    { effect:"filmGrain", param:"intensity", from:0.9, to:0.2, startBar:34, endBar:40, easing:"easeInOut" },
    { effect:"colourSweep", param:"brightnessRange", from:[180,255], to:[180,255], startBar:40, endBar:40 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:40, endBar:64 },
    { effect:"vignette", param:"intensity", from:0.4, to:1, startBar:40, endBar:41, easing:"linear" },
    { effect:"vignette", param:"intensity", from:1, to:0.2, startBar:41, endBar:44, easing:"easeInOut" }
  ];
}
