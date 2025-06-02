export function SpectrumSpin_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:4 },
    { effect:"colourSweep", param:"hueRange", from:[0,60], to:[0,60], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:12 },
    { effect:"glitch", param:"intensity", from:0, to:0.8, startBar:16, endBar:16.3 },
    { effect:"glitch", param:"intensity", from:0.8, to:0, startBar:16.3, endBar:16.6 },
    { effect:"colourSweep", param:"hueRange", from:[60,120], to:[60,120], startBar:12, endBar:12 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:12, endBar:24 },
    { effect:"colourSweep", param:"hueRange", from:[120,180], to:[120,180], startBar:24, endBar:24 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:24, endBar:36 },
    { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:32, endBar:33 },
    { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:33, endBar:34 },
    { effect:"colourSweep", param:"hueRange", from:[180,240], to:[180,240], startBar:36, endBar:36 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:36, endBar:48 },
    { effect:"pixelate", param:"pixelSize", from:1, to:40, startBar:40, endBar:41 },
    { effect:"pixelate", param:"pixelSize", from:40, to:1, startBar:41, endBar:42 },
    { effect:"colourSweep", param:"hueRange", from:[240,360], to:[240,360], startBar:48, endBar:48 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:48, endBar:64 }
  ];
}
