// needs to be more varied in the first 32 bars

export function EclipseReveal_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:8 },
    { effect:"vignette", param:"size", from:0.1, to:0.1, startBar:0, endBar:0 },
    { effect:"vignette", param:"size", from:0.1, to:1, startBar:0, endBar:32, easing:"easeInOut" },
    { effect:"filmGrain", param:"intensity", from:0.3, to:1, startBar:16, endBar:18 },
    { effect:"filmGrain", param:"intensity", from:1, to:0.3, startBar:18, endBar:20 },
    { effect:"colourSweep", param:"mode", from:"hide", to:"hide", startBar:32, endBar:32 },
    { effect:"colourSweep", param:"direction", from:-1, to:-1, startBar:32, endBar:32 },
    { effect:"colourSweep", param:"edgeSoftness", from:0.9, to:0.9, startBar:32, endBar:32 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:32, endBar:48 },
    { effect:"glitch", param:"intensity", from:0, to:0.8, startBar:40, endBar:40.5 },
    { effect:"glitch", param:"intensity", from:0.8, to:0, startBar:40.5, endBar:41 },
    { effect:"vignette", param:"size", from:1, to:0.6, startBar:48, endBar:52 },
    { effect:"vignette", param:"size", from:0.6, to:1, startBar:52, endBar:64 }
  ];
}
