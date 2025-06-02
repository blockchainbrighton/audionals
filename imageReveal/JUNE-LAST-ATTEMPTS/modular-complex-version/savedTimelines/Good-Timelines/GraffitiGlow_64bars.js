// Like this one!
export function GraffitiGlow_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:0.1, startBar:0, endBar:16 },
    { effect:"fade", param:"progress", from:0.25, to:0.1, startBar:16, endBar:24 },
    { effect:"fade", param:"progress", from:0.1, to:0.5, startBar:24, endBar:48 },
    { effect:"fade", param:"progress", from:0.5, to:1, startBar:48, endBar:64 },


    { effect:"colourSweep", param:"edgeSoftness", from:0.2, to:0.2, startBar:0, endBar:0 },
    { effect:"colourSweep", param:"hueRange", from:[300,340], to:[300,340], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:16 },
    { effect:"colourSweep", param:"hueRange", from:[200,260], to:[200,260], startBar:16, endBar:16 },
    { effect:"colourSweep", param:"direction", from:-1, to:-1, startBar:16, endBar:16 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:16, endBar:32 },
    { effect:"glitch", param:"intensity", from:0, to:0.9, startBar:32, endBar:33 },
    { effect:"glitch", param:"intensity", from:0.9, to:0, startBar:33, endBar:34 },
    { effect:"colourSweep", param:"hueRange", from:[60,120], to:[60,120], startBar:32, endBar:32 },
    { effect:"colourSweep", param:"direction", from:1, to:1, startBar:32, endBar:32 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:32, endBar:48 },
    { effect:"chromaShift", param:"intensity", from:0, to:0.6, startBar:40, endBar:41 },
    { effect:"chromaShift", param:"intensity", from:0.6, to:0, startBar:41, endBar:42 },
    { effect:"colourSweep", param:"hueRange", from:[0,360], to:[0,360], startBar:48, endBar:48 },
    { effect:"colourSweep", param:"randomize", from:1, to:1, startBar:48, endBar:48 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:48, endBar:64 }
  ];
}
