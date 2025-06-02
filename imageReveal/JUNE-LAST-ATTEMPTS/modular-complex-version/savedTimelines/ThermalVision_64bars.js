export function ThermalVision_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:8 },
    { effect:"colourSweep", param:"hueRange", from:[0,60], to:[0,60], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:24 },
    { effect:"colourSweep", param:"brightnessOffset", from:50, to:50, startBar:0, endBar:0 },
    { effect:"vignette", param:"size", from:1, to:0.2, startBar:16, endBar:18 },
    { effect:"vignette", param:"size", from:0.2, to:1, startBar:18, endBar:20 },
    { effect:"colourSweep", param:"hueRange", from:[180,240], to:[180,240], startBar:24, endBar:24 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:24, endBar:48 },
    { effect:"glitch", param:"intensity", from:0, to:0.8, startBar:32, endBar:33 },
    { effect:"glitch", param:"intensity", from:0.8, to:0, startBar:33, endBar:34 },
    { effect:"colourSweep", param:"brightnessOffset", from:-50, to:-50, startBar:40, endBar:40 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:40, endBar:64 }
  ];
}
