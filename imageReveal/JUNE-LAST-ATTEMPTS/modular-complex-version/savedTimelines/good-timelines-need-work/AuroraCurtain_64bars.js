// nice but needs to reveal the full image more slowly 

export function AuroraCurtain_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:8, easing:"easeInOut" },
    { effect:"colourSweep", param:"hueRange", from:[180,260], to:[180,260], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:24, easing:"linear" },
    { effect:"glitch", param:"intensity", from:0, to:1, startBar:16, endBar:16.5, easing:"easeInOut" },
    { effect:"glitch", param:"intensity", from:1, to:0, startBar:16.5, endBar:17, easing:"easeInOut" },
    { effect:"colourSweep", param:"hueRange", from:[0,60], to:[0,60], startBar:24, endBar:24 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:24, endBar:48, easing:"linear" },
    { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:32, endBar:34, easing:"easeInOut" },
    { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:34, endBar:36, easing:"easeInOut" },
    { effect:"blur", param:"radius", from:0, to:20, startBar:40, endBar:41, easing:"linear" },
    { effect:"blur", param:"radius", from:20, to:0, startBar:41, endBar:44, easing:"easeInOut" },
    { effect:"colourSweep", param:"hueRange", from:[300,360], to:[300,360], startBar:48, endBar:48 },
    { effect:"colourSweep", param:"progress", from:0,to:1, startBar:48, endBar:64, easing:"linear" },
    { effect:"filmGrain", param:"intensity", from:1, to:0.2, startBar:0, endBar:64, easing:"linear" }
  ];
}
