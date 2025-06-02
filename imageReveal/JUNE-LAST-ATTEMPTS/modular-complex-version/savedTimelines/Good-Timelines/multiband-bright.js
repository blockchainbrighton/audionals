export function reveal_MultiBandBrightness_64bars() {
    let timeline = [];
  
    // Base fade to ensure image becomes visible underneath the sweeps
    timeline.push({ effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "linear" });
  
    // --- Sweep 1: Revealing Shadows (Darkest parts) ---
    timeline.push({ effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 0, endBar: 0 });
    timeline.push({ effect: "colourSweep", param: "brightnessRange", from: [0, 70], to: [0, 70], startBar: 0, endBar: 0 });
    timeline.push({ effect: "colourSweep", param: "edgeSoftness", from: 0.7, to: 0.7, startBar: 0, endBar: 0 });
    timeline.push({ effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 40, easing: "linear" });
    // Make this sweep use a cool tint (actual array for color)
    timeline.push({ effect: "colourSweep", param: "color", from: [0,0,50,0.2], to: [0,0,50,0.2], startBar: 0, endBar: 0 });
  
  
    // --- Sweep 2: Revealing Midtones ---
    // Starts later, targets mid-brightness pixels
    timeline.push({ effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 16, endBar: 0 }); // Re-assert if necessary
    timeline.push({ effect: "colourSweep", param: "brightnessRange", from: [60, 190], to: [60, 190], startBar: 16, endBar: 0 });
    timeline.push({ effect: "colourSweep", param: "edgeSoftness", from: 0.5, to: 0.5, startBar: 16, endBar: 0 });
    timeline.push({ effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 16, endBar: 56, easing: "linear" });
    // Neutral tint for midtones (actual array for color, or could be omitted if default is transparent)
    timeline.push({ effect: "colourSweep", param: "color", from: [0,0,0,0], to: [0,0,0,0], startBar: 16, endBar: 0 });
  
  
    // --- Sweep 3: Revealing Highlights ---
    // Starts latest, targets brightest pixels
    timeline.push({ effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 32, endBar: 0 });
    timeline.push({ effect: "colourSweep", param: "brightnessRange", from: [180, 255], to: [180, 255], startBar: 32, endBar: 0 });
    timeline.push({ effect: "colourSweep", param: "edgeSoftness", from: 0.9, to: 0.9, startBar: 32, endBar: 0 }); // very soft edge for highlights
    timeline.push({ effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 32, endBar: 64, easing: "linear" });
    // Warm tint for highlights (actual array for color)
    timeline.push({ effect: "colourSweep", param: "color", from: [50,25,0,0.1], to: [50,25,0,0.1], startBar: 32, endBar: 0 });
  
  
    // Subtle film grain developing over time
    timeline.push({ effect: "filmGrain", param: "intensity", from: 0, to: 0.3, startBar: 16, endBar: 64, easing: "linear" });
  
    return timeline;
  }