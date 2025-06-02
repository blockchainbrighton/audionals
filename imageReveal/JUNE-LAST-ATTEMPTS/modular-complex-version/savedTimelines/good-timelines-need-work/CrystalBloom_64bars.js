// needs to reveal more slowly

export function CrystalBloom_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:8 },
    { effect:"colourSweep", param:"hueRange", from:[200,260], to:[200,260], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"edgeSoftness", from:0.1, to:0.1, startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:20 },
    { effect:"glitch", param:"intensity", from:0, to:0.7, startBar:16, endBar:16.6 },
    { effect:"glitch", param:"intensity", from:0.7, to:0, startBar:16.6, endBar:17.2 },
    { effect:"colourSweep", param:"hueRange", from:[320,20], to:[320,20], startBar:20, endBar:20 },
    { effect:"colourSweep", param:"direction", from:-1, to:-1, startBar:20, endBar:20 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:20, endBar:40 },
    { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:32, endBar:33 },
    { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:33, endBar:34 },
    { effect:"colourSweep", param:"hueRange", from:[60,120], to:[60,120], startBar:40, endBar:40 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:40, endBar:60 },
    { effect:"blur", param:"radius", from:0, to:14, startBar:40, endBar:41 },
    { effect:"blur", param:"radius", from:14, to:0, startBar:41, endBar:44 },
    { effect:"filmGrain", param:"intensity", from:0.2, to:0.05, startBar:48, endBar:64 }
  ];
}
