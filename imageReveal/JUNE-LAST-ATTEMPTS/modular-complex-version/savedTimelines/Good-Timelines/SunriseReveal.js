// Great timeline nice use of grain
export function timelineSunriseReveal_2025_06_02() {
    return [
      // Darkness → light
      { effect: "fade",       param: "progress",   from: 0,   to: 1,    startBar: 0,  endBar: 8,   easing: "linear" },
  
      // Out-of-focus + pixel blocks resolve over time
      { effect: "blur",       param: "radius",     from: 32,  to: 0,    startBar: 0,  endBar: 32,  easing: "easeInOut" },
      { effect: "pixelate",   param: "pixelSize",  from: 240, to: 1,    startBar: 0,  endBar: 48,  easing: "easeInOut" },
  
      // Warm sweep that finishes the reveal
      { effect: "colourSweep",param: "edgeSoftness",from: 0.6,to: 0.8,  startBar: 0,  endBar: 0,   easing: "linear" },
      { effect: "colourSweep",param: "progress",   from: 0,   to: 1,    startBar: 16, endBar: 64,  easing: "linear" },
      { effect: "colourSweep",param: "edgeSoftness",from: 0.8,to: 0,  startBar: 56,  endBar: 60,   easing: "linear" },

  
      // Vignette opens gradually to full frame
      { effect: "vignette",   param: "size",       from: 0.2, to: 1,    startBar: 24, endBar: 64,  easing: "easeInOut" },
      { effect: "vignette",   param: "intensity",  from: 1,   to: 0,    startBar: 24, endBar: 64,  easing: "easeInOut" },
  
      // Gentle grain fades but never disappears entirely
      { effect: "filmGrain",  param: "intensity",  from: 1,   to: 0.3,  startBar: 8,  endBar: 64,  easing: "linear" }
    ];
  }
  