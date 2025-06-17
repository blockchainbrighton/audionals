// nice
export function MirrorCascade_64bars() {

    const timeline = [];
    const PI = Math.PI;
    const add = (events) => timeline.push(...events);
  
    // --- INITIAL EFFECT STATES (Bar 0) ---
    // Set initial 'active' state for all effects.
    add([
      // Effects starting visually (even if from zero impact) at bar 0
      { effect: "fade", param: "active", from: true, to: true, startBar: 0, endBar: 0, unit: "bar" },
      { effect: "pixelate", param: "active", from: true, to: true, startBar: 0, endBar: 0, unit: "bar" },
      { effect: "scanLines", param: "active", from: true, to: true, startBar: 0, endBar: 0, unit: "bar" },
      { effect: "filmGrain", param: "active", from: true, to: true, startBar: 0, endBar: 0, unit: "bar" },
  
      // Effects starting later - ensure they are inactive initially.
      { effect: "colourSweep", param: "active", from: false, to: false, startBar: 0, endBar: 0, unit: "bar" },
      { effect: "blur", param: "active", from: false, to: false, startBar: 0, endBar: 0, unit: "bar" },
      { effect: "glitch", param: "active", from: false, to: false, startBar: 0, endBar: 0, unit: "bar" }, // Hides default intensity:0.01
      { effect: "chromaShift", param: "active", from: false, to: false, startBar: 0, endBar: 0, unit: "bar" },
      { effect: "vignette", param: "active", from: false, to: false, startBar: 0, endBar: 0, unit: "bar" },
    ]);
  
  
    // --- PHASE 1: Abstract Genesis (Bars 0-16) ---
  
    // Fade (active from bar 0)
    add([
      { effect: "fade", param: "progress", from: 0, to: 0.6, startBar: 0, endBar: 24, unit: "bar", easing: "easeInOut" },
    ]);
  
    // Pixelate (active from bar 0)
    add([
      { effect: "pixelate", param: "syncMode", from: "bar", to: "bar", startBar: 0, endBar: 0, unit: "bar" },
      { effect: "pixelate", param: "behavior", from: "sequence", to: "sequence", startBar: 0, endBar: 0, unit: "bar" },
      { effect: "pixelate", param: "pixelStages", from: [64,48,64,32], to: [64,48,64,32], startBar: 0, endBar:0, unit:"bar"},
      { effect: "pixelate", param: "pixelStages", from: [32,24,32,16], to: [32,24,32,16], startBar: 4, endBar:4, unit:"bar"},
      { effect: "pixelate", param: "pixelStages", from: [16,12,16,8], to: [16,12,16,8], startBar: 8, endBar:8, unit:"bar"},
      { effect: "pixelate", param: "pixelSize", from: 8, to: 4, startBar: 12, endBar: 16, unit: "bar", easing: "linear" },
    ]);
  
    // ScanLines (active from bar 0)
    add([
      { effect: "scanLines", param: "intensity", from: 0.1, to: 0.4, startBar: 0, endBar: 8, unit: "bar", easing: "easeInOut" }, // Override default 0.4
      { effect: "scanLines", param: "intensity", from: 0.4, to: 0.2, startBar: 8, endBar: 16, unit: "bar", easing: "easeInOut" },
      { effect: "scanLines", param: "progress", from: 0, to: 1, startBar: 0, endBar: 16, unit: "bar", easing: "linear" },
      { effect: "scanLines", param: "lineWidth", from: 2, to: 2, startBar: 0, endBar: 0, unit: "bar" },
      { effect: "scanLines", param: "spacing", from: 4, to: 4, startBar: 0, endBar: 0, unit: "bar" },
    ]);
  
    // ColourSweep: Starts visually at Bar 2
    add([
      { effect: "colourSweep", param: "active", from: true, to: true, startBar: 2, endBar: 2, unit: "bar" }, // Activate
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 2, endBar: 2, unit: "bar" },
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 2, endBar: 2, unit: "bar" },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 2, endBar: 12, unit: "bar", easing: "easeInOut" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.8, to: 0.8, startBar: 2, endBar: 2, unit: "bar" },
      { effect: "colourSweep", param: "brightnessOffset", from: 100, to: -50, startBar: 2, endBar: 12, unit: "bar", easing: "linear" },
    ]);
  
    // Film Grain (active from bar 0)
    add([
      { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.2, startBar: 0, endBar: 64, unit: "bar", easing: "linear" }, // Override default 0.7
      { effect: "filmGrain", param: "speed", from: 0.5, to: 0.5, startBar: 0, endBar: 0, unit: "bar" },
      { effect: "filmGrain", param: "size", from: 1.5, to: 1.5, startBar: 0, endBar: 0, unit: "bar" },
    ]);
  
  
    // --- PHASE 2: Distorted Emergence (Bars 16-32) ---
  
    // Fade continues (already active)
    add([
       { effect: "fade", param: "progress", from: 0.6, to: 0.85, startBar: 24, endBar: 36, unit: "bar", easing: "easeInOut" },
    ]);
  
    // Pixelate: Fades out (was active)
    add([
      { effect: "pixelate", param: "pixelSize", from: 4, to: 1, startBar: 16, endBar: 24, unit: "bar", easing: "easeInOut" },
      { effect: "pixelate", param: "active", from: true, to: false, startBar: 24, endBar: 24.1, unit: "bar" }, // Deactivate
    ]);
  
    // Blur: Starts visually at Bar 18
    add([
      { effect: "blur", param: "active", from: true, to: true, startBar: 18, endBar: 18, unit: "bar" }, // Activate
      { effect: "blur", param: "radius", from: 0, to: 8, startBar: 18, endBar: 20, unit: "bar", easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 8, to: 0, startBar: 20, endBar: 22, unit: "bar", easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 0, to: 5, startBar: 28, endBar: 29, unit: "bar", easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 5, to: 0, startBar: 29, endBar: 30, unit: "bar", easing: "easeInOut" },
    ]);
  
    // Glitch: Starts visually at Bar 20
    add([
      { effect: "glitch", param: "active", from: true, to: true, startBar: 20, endBar: 20, unit: "bar" }, // Activate
      { effect: "glitch", param: "intensity", from: 0, to: 0.4, startBar: 20, endBar: 20.2, unit: "bar", easing: "linear" }, // Start intensity from 0
      { effect: "glitch", param: "intensity", from: 0.4, to: 0, startBar: 20.2, endBar: 20.5, unit: "bar", easing: "linear" },
      { effect: "glitch", param: "angle", from: 0, to: 0, startBar: 20, endBar: 20, unit: "bar" },
      // Burst 2
      { effect: "glitch", param: "intensity", from: 0, to: 0.3, startBar: 26, endBar: 26.1, unit: "bar", easing: "linear" },
      { effect: "glitch", param: "intensity", from: 0.3, to: 0, startBar: 26.1, endBar: 26.3, unit: "bar", easing: "linear" },
      { effect: "glitch", param: "angle", from: 1, to: 1, startBar: 26, endBar: 26, unit: "bar" },
    ]);
  
    // ColourSweep: Hide and reveal interplay (was activated at bar 2)
    add([
      { effect: "colourSweep", param: "mode", from: "hide", to: "hide", startBar: 16, endBar: 16, unit: "bar" },
      { effect: "colourSweep", param: "direction", from: -1, to: -1, startBar: 16, endBar: 16, unit: "bar" },
      { effect: "colourSweep", param: "progress", from: 0, to: 0.8, startBar: 16, endBar: 25, unit: "bar", easing: "easeInOut" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.5, to: 0.5, startBar: 16, endBar: 16, unit: "bar" },
      // Reveal again
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 26, endBar: 26, unit: "bar" },
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 26, endBar: 26, unit: "bar" },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 26, endBar: 32, unit: "bar", easing: "linear" },
      { effect: "colourSweep", param: "hueRange", from: [0,60], to: [0,60], startBar:26, endBar:26, unit: "bar"},
      { effect: "colourSweep", param: "edgeSoftness", from: 0.2, to: 0.2, startBar: 26, endBar: 26, unit: "bar" },
    ]);
  
    // ChromaShift: Starts visually at Bar 22
    add([
      { effect: "chromaShift", param: "active", from: true, to: true, startBar: 22, endBar: 22, unit: "bar" }, // Activate
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.1, startBar: 22, endBar: 23, unit: "bar", easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0.1, to: 0, startBar: 23, endBar: 24, unit: "bar", easing: "easeInOut" },
      { effect: "chromaShift", param: "angle", from: PI / 4, to: PI / 4, startBar: 22, endBar: 22, unit: "bar" },
    ]);
  
  
    // --- PHASE 3: Dynamic Interplay & Partial Clarity (Bars 32-48) ---
    // Fade continues (already active)
    add([
       { effect: "fade", param: "progress", from: 0.85, to: 0.98, startBar: 36, endBar: 48, unit: "bar", easing: "easeInOut" },
    ]);
  
    // Blur: More focus pulls (already active)
    add([
      { effect: "blur", param: "radius", from: 0, to: 12, startBar: 32, endBar: 34, unit: "bar", easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 12, to: 2, startBar: 34, endBar: 37, unit: "bar", easing: "easeInOut" },
    ]);
  
    // Glitch: More intense (already active)
    add([
      { effect: "glitch", param: "intensity", from: 0, to: 0.6, startBar: 38, endBar: 38.5, unit: "bar", easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 0.6, to: 0, startBar: 38.5, endBar: 39.5, unit: "bar", easing: "linear" },
      { effect: "glitch", param: "rainbow", from: 0, to: 5, startBar: 38, endBar: 38.5, unit: "bar", easing: "linear" },
      { effect: "glitch", param: "rainbow", from: 5, to: 0, startBar: 38.5, endBar: 39, unit: "bar", easing: "linear" },
      { effect: "glitch", param: "angle", from: 0, to: 0, startBar: 38, endBar: 38, unit: "bar" },
    ]);
  
    // ChromaShift: Sweeping movements (already active)
    add([
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.3, startBar: 40, endBar: 41, unit: "bar", easing: "easeInOut" },
      { effect: "chromaShift", param: "angle", from: 0, to: PI * 2, startBar: 40, endBar: 42, unit: "bar", easing: "linear" },
      { effect: "chromaShift", param: "intensity", from: 0.3, to: 0, startBar: 42, endBar: 43, unit: "bar", easing: "easeInOut" },
    ]);
  
    // Vignette: Starts visually at Bar 34
    add([
      { effect: "vignette", param: "active", from: true, to: true, startBar: 34, endBar: 34, unit: "bar" }, // Activate
      { effect: "vignette", param: "intensity", from: 0, to: 0.6, startBar: 34, endBar: 36, unit: "bar", easing: "easeInOut" }, // Default intensity is 0
      { effect: "vignette", param: "size", from: 0.7, to: 0.4, startBar: 34, endBar: 36, unit: "bar", easing: "easeInOut" },
      { effect: "vignette", param: "intensity", from: 0.6, to: 0, startBar: 36, endBar: 38, unit: "bar", easing: "easeInOut" },
      { effect: "vignette", param: "size", from: 0.4, to: 0.7, startBar: 36, endBar: 38, unit: "bar", easing: "easeInOut" },
    ]);
  
    // ColourSweep: Final large reveal (already active)
    add([
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 33, endBar: 33, unit: "bar" },
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 33, endBar: 33, unit: "bar" },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 33, endBar: 46, unit: "bar", easing: "easeInOut" }, // Previous sweep ended at 32
      { effect: "colourSweep", param: "edgeSoftness", from: 0.6, to: 0.6, startBar: 33, endBar: 33, unit: "bar" },
      { effect: "colourSweep", param: "hueRange", from: [0,360], to: [0,360], startBar:33, endBar:33, unit:"bar"},
      { effect: "colourSweep", param: "brightnessOffset", from: 0, to: 0, startBar:33, endBar:33, unit: "bar"},
    ]);
  
  
    // --- PHASE 4: The Gradual Reveal & Afterglow (Bars 48-64) ---
  
    // Fade: Completes (already active)
    add([
      { effect: "fade", param: "progress", from: 0.98, to: 1, startBar: 48, endBar: 52, unit: "bar", easing: "easeInOut" },
    ]);
  
    // Reduce/Remove major distortions & Deactivate
    add([
      { effect: "blur", param: "radius", from: 2, to: 0, startBar: 48, endBar: 50, unit: "bar", easing: "linear" },
      { effect: "blur", param: "active", from: true, to: false, startBar: 50, endBar: 50.1, unit: "bar"}, // Deactivate
  
      { effect: "glitch", param: "intensity", from: 0, to: 0, startBar: 48, endBar: 48, unit: "bar"}, // Ensure intensity is 0
      { effect: "glitch", param: "rainbow", from: 0, to: 0, startBar: 48, endBar: 48, unit: "bar"},   // Ensure rainbow is 0
      { effect: "glitch", param: "active", from: true, to: false, startBar: 48, endBar: 48.1, unit: "bar"}, // Deactivate
  
      { effect: "chromaShift", param: "intensity", from: 0, to: 0, startBar: 48, endBar: 48, unit: "bar"}, // Ensure intensity is 0
      { effect: "chromaShift", param: "active", from: true, to: false, startBar: 48, endBar: 48.1, unit: "bar"}, // Deactivate
  
      { effect: "vignette", param: "intensity", from: 0, to: 0, startBar: 48, endBar: 48, unit: "bar"}, // Ensure intensity is 0
      { effect: "vignette", param: "active", from: true, to: false, startBar: 48, endBar: 48.1, unit: "bar"}, // Deactivate
    ]);
  
    // Film Grain: Final texture (already active)
    add([
      { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.35, startBar: 48, endBar: 56, unit: "bar", easing: "easeInOut" },
      { effect: "filmGrain", param: "intensity", from: 0.35, to: 0.15, startBar: 56, endBar: 64, unit: "bar", easing: "easeInOut" },
      // Optionally deactivate filmGrain at the very end if desired:
      // { effect: "filmGrain", param: "active", from: true, to: false, startBar: 64, endBar: 64, unit: "bar"},
    ]);
  
    // Scanlines: Fade out completely (already active)
    add([
        { effect: "scanLines", param: "intensity", from: 0.2, to: 0, startBar: 48, endBar: 54, unit: "bar", easing: "linear" },
        { effect: "scanLines", param: "active", from: true, to: false, startBar: 54, endBar: 54.1, unit: "bar"}, // Deactivate
    ]);
  
    // ColourSweep: Deactivate (final sweep ended at bar 46)
     add([
      { effect: "colourSweep", param: "active", from: true, to: false, startBar: 46, endBar: 46.1, unit: "bar"}, // Deactivate right after its last animation ends
    ]);
  
    return timeline;
  }