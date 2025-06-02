// nice - just needs pixel effect timing to be linked to bars

export function timeline_NoirWindow_64bars() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "vignette", param: "size", from: 0.1, to: 0.3, startBar: 0, endBar: 24, easing: "easeInOut" },
      { effect: "vignette", param: "intensity", from: 2, to: 1, startBar: 0, endBar: 32, easing: "linear" },
      { effect: "vignette", param: "size", from: 0.3, to: 1, startBar: 24, endBar: 48, easing: "easeInOut" },
      { effect: "vignette", param: "intensity", from: 1, to: 0, startBar: 48, endBar: 64, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 1.5, to: 0.5, startBar: 0, endBar: 56, easing: "linear" },
      { effect: "blur", param: "radius", from: 20, to: 0, startBar: 0, endBar: 56, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 128, to: 1, startBar: 0, endBar: 40, easing: "easeInOut" }
    ];
  }
  