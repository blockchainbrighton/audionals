// nice slow reveal
export function DeepDream_64bars() {
  return [
    { effect:"blur", param:"radius", from:30, to:4, startBar:0, endBar:32, easing:"easeInOut" },
    { effect:"colourSweep", param:"hueRange", from:[280,320], to:[280,320], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:24 },
    { effect:"glitch", param:"intensity", from:0, to:0.6, startBar:16, endBar:16.6 },
    { effect:"glitch", param:"intensity", from:0.6, to:0, startBar:16.6, endBar:17.2 },
    { effect:"colourSweep", param:"hueRange", from:[160,200], to:[160,200], startBar:24, endBar:24 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:24, endBar:48 },
    { effect:"blur", param:"radius", from:4, to:12, startBar:32, endBar:33 },
    { effect:"blur", param:"radius", from:12, to:2, startBar:33, endBar:34 },
    { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:40, endBar:41 },
    { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:41, endBar:42 },
    { effect:"blur", param:"radius", from:2, to:0, startBar:48, endBar:64, easing:"easeInOut" }
  ];
}
