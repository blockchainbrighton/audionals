export function ShadowLift_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:0.8, startBar:0, endBar:12 },
    { effect:"colourSweep", param:"brightnessRange", from:[0,60], to:[0,60], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:24, edgeSoftness:0.6 },
    { effect:"chromaShift", param:"intensity", from:0, to:0.3, startBar:16, endBar:17 },
    { effect:"chromaShift", param:"intensity", from:0.3, to:0, startBar:17, endBar:18 },
    { effect:"colourSweep", param:"brightnessRange", from:[60,140], to:[60,140], startBar:24, endBar:24 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:24, endBar:48 },
    { effect:"filmGrain", param:"intensity", from:0.6, to:1.1, startBar:32, endBar:36, easing:"easeInOut" },
    { effect:"filmGrain", param:"intensity", from:1.1, to:0.2, startBar:36, endBar:48, easing:"easeInOut" },
    { effect:"colourSweep", param:"brightnessRange", from:[140,255], to:[140,255], startBar:40, endBar:40 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:40, endBar:64 },
    { effect:"vignette", param:"intensity", from:0.8, to:0.2, startBar:40, endBar:44 }
  ];
}
