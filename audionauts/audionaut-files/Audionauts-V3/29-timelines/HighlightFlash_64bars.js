// quite nice 

export function HighlightFlash_64bars() {
  return [
    { effect:"colourSweep", param:"brightnessRange", from:[200,255], to:[200,255], startBar:0, endBar:0 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:24 },
    { effect:"glitch", param:"intensity", from:0, to:1, startBar:16, endBar:17 },
    { effect:"glitch", param:"intensity", from:1, to:0, startBar:17, endBar:18 },
    { effect:"colourSweep", param:"brightnessRange", from:[70,200], to:[70,200], startBar:24, endBar:24 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:24, endBar:48 },
    { effect:"chromaShift", param:"intensity", from:0, to:0.4, startBar:32, endBar:33 },
    { effect:"chromaShift", param:"intensity", from:0.4, to:0, startBar:33, endBar:34 },
    { effect:"colourSweep", param:"brightnessRange", from:[0,70], to:[0,70], startBar:40, endBar:40 },
    { effect:"colourSweep", param:"progress", from:0, to:1, startBar:40, endBar:64 },
    { effect:"scanLines", param:"intensity", from:0, to:0.3, startBar:40, endBar:48 },
    { effect:"filmGrain", param:"intensity", from:0.5, to:0.1, startBar:0, endBar:64 }
  ];
}
