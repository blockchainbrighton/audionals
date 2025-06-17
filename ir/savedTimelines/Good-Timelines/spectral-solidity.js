// lovely takes a little while to gte there doesn;t quite complete by 64 bars 

export function reveal_SpectralSweepSolidify_64bars() {
    return [
      // Base fade-in for overall visibility
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "linear" },
  
      // --- First Phase: Sweeping in Reds/Warm Tones (0-32 bars) ---
      // Note: These colourSweep lanes will sequentially reconfigure a SINGLE instance of the colourSweep effect.
      // For parallel, independent sweeps, your engine would need to support multiple distinct colourSweep instances.
  
      { effect: "colourSweep", param: "active", from: true, to: true, startBar: 0, endBar: 0 }, // Use boolean for 'active'
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 0, endBar: 0 }, // Corrected string value
      { effect: "colourSweep", param: "hueRange", from: [0, 60], to: [0, 60], startBar: 0, endBar: 0 }, // Reds/Oranges (JS Array is correct here)
      { effect: "colourSweep", param: "edgeSoftness", from: 0.8, to: 0.8, startBar: 0, endBar: 0 },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "linear" },
      { effect: "colourSweep", param: "brightnessOffset", from: -50, to: 0, startBar: 0, endBar: 32, easing: "linear" },
  
      // Transition: Broaden hue range and continue sweep (32-64 bars)
      // This reconfigures the SAME colourSweep instance.
      { effect: "colourSweep", param: "hueRange", from: [0, 60], to: [0, 360], startBar: 32, endBar: 33, easing: "linear" }, // Quickly broaden to all hues (JS Array is correct)
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 32, endBar: 64, easing: "linear" }, // Sweep again, now affecting all hues
      { effect: "colourSweep", param: "edgeSoftness", from: 0.8, to: 0.2, startBar: 32, endBar: 64, easing: "linear" }, // Edge gets a bit harder
  
      // Add a touch of film grain throughout for texture
      { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.2, startBar: 0, endBar: 64, easing: "linear" },
      { effect: "filmGrain", param: "speed", from: 1, to: 1, startBar: 0, endBar: 64, easing: "linear" }, // Assuming speed 1 is a sensible value
  
      // Gentle blur reduction over the entire period
      { effect: "blur", param: "radius", from: 10, to: 0, startBar: 0, endBar: 60, easing: "linear" }
    ];
  }