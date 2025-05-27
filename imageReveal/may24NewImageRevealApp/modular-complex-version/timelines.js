// timelines.js
// In the Current Song - There are 64 Bars - this needs to be another setting updated in the mainhtml file but for now 
// I am hardcoding the 64 bar count into these effects - Must change to be user driven and set in html ***BEFORE INSCRIPTION*** of module
// -- Embedded Timeline Modules (examples) --
export function dramaticRevealTimeline() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 16, easing: "easeInOut" },
      { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 64, easing: "linear" },
      { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 8, easing: "easeInOut" }
    ];
  }
  
  export function glitchyPulseTimeline() {
    return [
      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 2, endBar: 64, easing: "linear" }
    ];
  }
  