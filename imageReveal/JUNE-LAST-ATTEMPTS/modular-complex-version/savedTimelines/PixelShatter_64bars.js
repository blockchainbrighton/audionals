export function PixelShatter_64bars() {
  return [
    { effect:"pixelate", param:"pixelSize", from:140, to:140, startBar:0, endBar:8 },
    { effect:"scanLines", param:"intensity", from:1, to:0.6, startBar:0, endBar:16 },
    { effect:"colourSweep", param:"progress", from:0, to:0.5, startBar:0, endBar:16, edgeSoftness:0.2 },
    { effect:"glitch", param:"intensity", from:0, to:1, startBar:16, endBar:17, easing:"easeInOut" },
    { effect:"glitch", param:"intensity", from:1, to:0, startBar:17, endBar:18, easing:"easeInOut" },
    { effect:"pixelate", param:"pixelSize", from:140, to:10, startBar:16, endBar:40, easing:"easeInOut" },
    { effect:"scanLines", param:"direction", from:1, to:-1, startBar:32, endBar:32 },
    { effect:"chromaShift", param:"intensity", from:0, to:0.6, startBar:40, endBar:42, easing:"easeInOut" },
    { effect:"chromaShift", param:"intensity", from:0.6, to:0, startBar:42, endBar:44, easing:"easeInOut" },
    { effect:"pixelate", param:"pixelSize", from:10, to:1, startBar:40, endBar:64, easing:"easeInOut" },
    { effect:"fade", param:"progress", from:0.9, to:1, startBar:56, endBar:64 }
  ];
}
