export function timeline_NoirWindow_64bars() {
  // Choose your pixel sizes for each 4-bar segment (adjust as desired)
  const pixelChangeBars = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40];
  const pixelSizes = [
    128, // 0
     96, // 4
     80, // 8
     64, // 12
     48, // 16
     40, // 20
     32, // 24
     24, // 28
     16, // 32
      8, // 36
      4  // 40
  ];
  const pixelateEntries = pixelChangeBars.map((bar, i) => ({
    effect: "pixelate",
    param: "pixelSize",
    from: pixelSizes[i],
    to: pixelSizes[i],
    startBar: bar,
    endBar: bar,
    easing: "step"
  }));

  // Smoothly reveal to 1px from bar 40 to 56
  pixelateEntries.push({
    effect: "pixelate",
    param: "pixelSize",
    from: 4,
    to: 1,
    startBar: 40,
    endBar: 56,
    easing: "easeInOut"
  });

  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "vignette", param: "size", from: 0.1, to: 0.3, startBar: 0, endBar: 24, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 2, to: 1, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "vignette", param: "size", from: 0.3, to: 1, startBar: 24, endBar: 48, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 1, to: 0, startBar: 48, endBar: 64, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1.5, to: 0.5, startBar: 0, endBar: 56, easing: "linear" },
    { effect: "blur", param: "radius", from: 20, to: 0, startBar: 0, endBar: 56, easing: "linear" },
    ...pixelateEntries
  ];
}
