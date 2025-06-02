export function StrobeFocus_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:6 },
    { effect:"pixelate", param:"pixelSize", from:80, to:40, startBar:0, endBar:16, easing:"easeInOut" },
    { effect:"fade", param:"progress", from:1, to:0.2, startBar:16, endBar:16.5 },
    { effect:"fade", param:"progress", from:0.2, to:1, startBar:16.5, endBar:17 },
    { effect:"glitch", param:"intensity", from:0, to:1, startBar:16, endBar:17 },
    { effect:"glitch", param:"intensity", from:1, to:0, startBar:17, endBar:18 },
    { effect:"pixelate", param:"pixelSize", from:40, to:4, startBar:16, endBar:40, easing:"easeInOut" },
    { effect:"fade", param:"progress", from:1, to:0, startBar:32, endBar:32.4 },
    { effect:"fade", param:"progress", from:0, to:1, startBar:32.4, endBar:32.8 },
    { effect:"pixelate", param:"pixelSize", from:4, to:60, startBar:40, endBar:41 },
    { effect:"pixelate", param:"pixelSize", from:60, to:1, startBar:41, endBar:44 }
  ];
}
