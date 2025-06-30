// CrystalBloom_Timed.js
// Gradual reveal with extended colour sweep durations and explicitly timed pixel stages.
// Pixelation changes at 4-bar intervals for a controlled, blooming clarity.
export function CrystalBloom_64bars() {
    return [
      // Slower initial fade-in
      { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:24, easing: "linear" },
  
      // --- Explicitly Defined Pixelation Stages at 4-bar Intervals ---
      // Replacing: { effect: "pixelate", param: "pixelSize", from: 128, to: 1, startBar: 0, endBar: 56, easing: "easeInOut" }
      // 64 bars / 4 bars per stage = 16 stages
      { effect: "pixelate", param: "pixelSize", from: 200, to: 200, startBar: 0,  endBar: 4,  easing: "linear" }, // Start very blocky
      { effect: "pixelate", param: "pixelSize", from: 160, to: 160, startBar: 4,  endBar: 8,  easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 120, to: 120, startBar: 8,  endBar: 12, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 90,  to: 90,  startBar: 12, endBar: 16, easing: "linear" }, // Coincides with glitch start
  
      { effect: "pixelate", param: "pixelSize", from: 70,  to: 70,  startBar: 16, endBar: 20, easing: "linear" }, // During glitch
      { effect: "pixelate", param: "pixelSize", from: 60,  to: 60,  startBar: 20, endBar: 24, easing: "linear" }, // Coincides with second colour sweep start
      { effect: "pixelate", param: "pixelSize", from: 50,  to: 50,  startBar: 24, endBar: 28, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 40,  to: 40,  startBar: 28, endBar: 32, easing: "linear" }, // Coincides with chromaShift start
  
      { effect: "pixelate", param: "pixelSize", from: 30,  to: 30,  startBar: 32, endBar: 36, easing: "linear" }, // During chromaShift
      { effect: "pixelate", param: "pixelSize", from: 20,  to: 20,  startBar: 36, endBar: 40, easing: "linear" }, // Coincides with third colour sweep & blur pulse start
      { effect: "pixelate", param: "pixelSize", from: 16,  to: 16,  startBar: 40, endBar: 44, easing: "linear" }, // During blur pulse
      { effect: "pixelate", param: "pixelSize", from: 12,  to: 12,  startBar: 44, endBar: 48, easing: "linear" }, // Coincides with filmGrain intensity change
  
      { effect: "pixelate", param: "pixelSize", from: 8,   to: 8,   startBar: 48, endBar: 52, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 4,   to: 4,   startBar: 52, endBar: 56, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 2,   to: 2,   startBar: 56, endBar: 60, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 1,   to: 1,   startBar: 60, endBar: 64, easing: "linear" }, // Fully clear for last 4 bars
  
      // First colour sweep extended
      { effect:"colourSweep", param:"hueRange", from:[200,260], to:[200,260], startBar:0, endBar:0 },
      { effect:"colourSweep", param:"edgeSoftness", from:0.1, to:0.1, startBar:0, endBar:0 },
      { effect:"colourSweep", param:"progress", from:0, to:1, startBar:0, endBar:32, easing: "linear" },
  
      { effect:"glitch", param:"intensity", from:0, to:0.7, startBar:16, endBar:16.6 },
      { effect:"glitch", param:"intensity", from:0.7, to:0, startBar:16.6, endBar:17.2 },
  
      // Second colour sweep extended
      { effect:"colourSweep", param:"hueRange", from:[320,20], to:[320,20], startBar:20, endBar:20 },
      { effect:"colourSweep", param:"direction", from:-1, to:-1, startBar:20, endBar:20 },
      { effect:"colourSweep", param:"progress", from:0, to:1, startBar:20, endBar:48, easing: "linear" },
  
      { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:32, endBar:33 },
      { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:33, endBar:34 },
  
      // Third colour sweep extended
      { effect:"colourSweep", param:"hueRange", from:[60,120], to:[60,120], startBar:40, endBar:40 },
      { effect:"colourSweep", param:"progress", from:0, to:1, startBar:40, endBar:64, easing: "linear" },
  
      // Blur pulse - original timing is fine
      { effect:"blur", param:"radius", from:0, to:14, startBar:40, endBar:41 },
      { effect:"blur", param:"radius", from:14, to:0, startBar:41, endBar:44 },
  
      { effect:"filmGrain", param:"intensity", from:0.2, to:0.05, startBar:48, endBar:64, easing: "linear" } // Easing added for consistency
    ];
  }