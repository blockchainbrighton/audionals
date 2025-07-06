// nice - different - nice effect - loops

export function IridescentWave_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:8 },
    { effect:"colourSweep", param:"edgeSoftness", from:0.8, to:0.8, startBar:0, endBar:0 },
    { effect:"colourSweep", param:"hueRange", from:[180,240], to:[180,240], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:20 },
    { effect:"blur", param:"radius", from:0, to:12, startBar:16, endBar:17 },
    { effect:"blur", param:"radius", from:12, to:0, startBar:17, endBar:18 },
    { effect:"colourSweep", param:"hueRange", from:[300,360], to:[300,360], startBar:20, endBar:20 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:20, endBar:40 },
    { effect:"chromaShift", param:"direction", from:1, to:-1, startBar:32, endBar:32 },
    { effect:"chromaShift", param:"intensity", from:0, to:0.4, startBar:32, endBar:34 },
    { effect:"chromaShift", param:"intensity", from:0.4, to:0, startBar:34, endBar:36 },
    { effect:"colourSweep", param:"hueRange", from:[60,120], to:[60,120], startBar:40, endBar:40 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:40, endBar:60 },
    { effect:"filmGrain", param:"intensity", from:0.5, to:0.1, startBar:40, endBar:48 },
    { effect:"colourSweep", param:"hueRange", from:[0,360], to:[0,360], startBar:60, endBar:60 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:60, endBar:64 }
  ];
}
