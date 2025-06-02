// Still nothing visible

export function timelineSpotlightFocus_2025_06_02() {
    return [
      // Quicker fade, faster focus and pixelate reduction for early reveal
      { effect: "fade",        param: "progress",   from: 0,  to: 1,   startBar: 0, endBar: 4,  easing: "linear" },
      { effect: "vignette",    param: "size",       from: 0.25, to: 0.6, startBar: 0, endBar: 8, easing: "easeInOut" },
      { effect: "vignette",    param: "size",       from: 0.6,  to: 1,   startBar: 8, endBar: 64, easing: "easeInOut" },
      { effect: "vignette",    param: "intensity",  from: 1,    to: 0.4, startBar: 0, endBar: 8,  easing: "easeInOut" },
      { effect: "vignette",    param: "intensity",  from: 0.4,  to: 0,   startBar: 8, endBar: 64, easing: "easeInOut" },
      { effect: "blur",        param: "radius",     from: 24,   to: 3,   startBar: 0, endBar: 8,  easing: "easeInOut" },
      { effect: "blur",        param: "radius",     from: 3,    to: 0,   startBar: 8, endBar: 16, easing: "easeInOut" },
      { effect: "pixelate",    param: "pixelSize",  from: 60,   to: 10,  startBar: 0, endBar: 8,  easing: "easeInOut" },
      { effect: "pixelate",    param: "pixelSize",  from: 10,   to: 1,   startBar: 8, endBar: 32, easing: "easeInOut" },
  
      // Warm centre sweep (tint optional)
      { effect: "colourSweep", param: "edgeSoftness",from:0.8, to: 0.8, startBar: 0,  endBar: 0,   easing: "linear" },
      { effect: "colourSweep", param: "progress",    from: 0,  to: 1,   startBar: 16, endBar: 64,  easing: "linear" }
    ];
  }
  