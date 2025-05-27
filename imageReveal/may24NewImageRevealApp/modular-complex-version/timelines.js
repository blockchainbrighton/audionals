// timelines.js

// -- Embedded Timeline Modules (examples) --
export function dramaticRevealTimeline() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 4, easing: "easeInOut" },
      { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 8, easing: "easeInOut" }
    ];
  }
  
  export function glitchyPulseTimeline() {
    return [
      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 0, endBar: 2, easing: "easeInOut" },
      { effect: "fade", param: "progress", from: 1, to: 0, startBar: 2, endBar: 4, easing: "linear" }
    ];
  }
  