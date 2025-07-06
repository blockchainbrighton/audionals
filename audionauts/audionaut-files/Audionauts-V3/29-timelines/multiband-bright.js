// lovely timeline, revised for clean end by bar 64

export function reveal_MultiBandBrightness_64bars() {
  let timeline = [];

  // Base fade for visibility
  timeline.push({ effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "linear" });

  // --- Sweep 1: Revealing Shadows ---
  timeline.push({ effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 0, endBar: 0 });
  timeline.push({ effect: "colourSweep", param: "brightnessRange", from: [0, 70], to: [0, 70], startBar: 0, endBar: 0 });
  timeline.push({ effect: "colourSweep", param: "edgeSoftness", from: 0.7, to: 0.7, startBar: 0, endBar: 0 });
  timeline.push({ effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 40, easing: "linear" });
  timeline.push({ effect: "colourSweep", param: "color", from: [0,0,50,0.2], to: [0,0,50,0.2], startBar: 0, endBar: 0 });

  // --- Sweep 2: Revealing Midtones ---
  timeline.push({ effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 16, endBar: 0 });
  timeline.push({ effect: "colourSweep", param: "brightnessRange", from: [60, 190], to: [60, 190], startBar: 16, endBar: 0 });
  timeline.push({ effect: "colourSweep", param: "edgeSoftness", from: 0.5, to: 0.5, startBar: 16, endBar: 0 });
  timeline.push({ effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 16, endBar: 56, easing: "linear" });
  timeline.push({ effect: "colourSweep", param: "color", from: [0,0,0,0], to: [0,0,0,0], startBar: 16, endBar: 0 });

  // --- Sweep 3: Revealing Highlights ---
  timeline.push({ effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 32, endBar: 0 });
  timeline.push({ effect: "colourSweep", param: "brightnessRange", from: [180, 255], to: [180, 255], startBar: 32, endBar: 0 });
  timeline.push({ effect: "colourSweep", param: "edgeSoftness", from: 0.9, to: 0.9, startBar: 32, endBar: 0 });
  timeline.push({ effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 32, endBar: 60, easing: "linear" }); // Changed from 64 to 60
  timeline.push({ effect: "colourSweep", param: "color", from: [50,25,0,0.1], to: [50,25,0,0.1], startBar: 32, endBar: 0 });

  // Subtle film grain developing, then neutralized for final bars
  timeline.push({ effect: "filmGrain", param: "intensity", from: 0, to: 0.3, startBar: 16, endBar: 60, easing: "linear" }); // Changed to endBar: 60
  timeline.push({ effect: "filmGrain", param: "intensity", from: 0.3, to: 0, startBar: 60, endBar: 64, easing: "linear" });

  // --- Clear-out: Explicitly deactivate all colour sweeps in final 4 bars
  timeline.push({ effect: "colourSweep", param: "progress", from: 1, to: 0, startBar: 60, endBar: 64, easing: "linear" });
  timeline.push({ effect: "colourSweep", param: "active", from: true, to: false, startBar: 60, endBar: 64 });

  return timeline;
}
