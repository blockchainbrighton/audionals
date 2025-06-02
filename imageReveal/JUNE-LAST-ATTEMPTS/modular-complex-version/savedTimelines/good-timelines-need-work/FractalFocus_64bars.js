// needs pixellate timing control so single pixel images are shown and updated in time with the beats

export function FractalFocus_64bars() {
  return [
    { effect:"pixelate", param:"pixelSize", from:200, to:200, startBar:0, endBar:8 },
    { effect:"blur", param:"radius", from:20, to:20, startBar:0, endBar:8 },
    { effect:"pixelate", param:"pixelSize", from:200, to:20, startBar:0, endBar:32, easing:"easeInOut" },
    { effect:"blur", param:"radius", from:20, to:4, startBar:0, endBar:32, easing:"easeInOut" },
    { effect:"glitch", param:"intensity", from:0, to:1, startBar:16, endBar:17 },
    { effect:"glitch", param:"intensity", from:1, to:0, startBar:17, endBar:18 },
    { effect:"pixelate", param:"pixelSize", from:20, to:1, startBar:32, endBar:64, easing:"easeInOut" },
    { effect:"blur", param:"radius", from:4, to:0, startBar:32, endBar:64, easing:"easeInOut" },
    { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:32, endBar:34 },
    { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:34, endBar:36 },
    { effect:"glitch", param:"intensity", from:0, to:1, startBar:40, endBar:41 },
    { effect:"glitch", param:"intensity", from:1, to:0, startBar:41, endBar:42 }
  ];
}
