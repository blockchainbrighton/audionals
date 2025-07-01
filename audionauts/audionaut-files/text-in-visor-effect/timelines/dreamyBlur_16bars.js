// Filename: dreamyBlur_16bars.js

export function dreamyBlur_16bars() {
    return [
      // Immediate soft blur
      { effect: "blur", param: "radius", from: 20, to: 10, startBar: 0, endBar: 4, easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 10, to: 0, startBar: 4, endBar: 8, easing: "easeInOut" },
  
      // Gentle vignette pull-back
      { effect: "vignette", param: "intensity", from: 1.2, to: 0.6, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "vignette", param: "intensity", from: 0.6, to: 0, startBar: 8, endBar: 12, easing: "easeInOut" },
  
      // Subtle chroma shift overshoot
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.3, startBar: 2, endBar: 6, easing: "easeInOut" },
      { effect: "chromaShift", param: "angle", from: 0, to: 3.142, startBar: 2, endBar: 6, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0.3, to: 0, startBar: 6, endBar: 8, easing: "easeInOut" },
  
      // Light fade-in
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 12, easing: "easeInOut" },
  
      // End with a quick glitch whisper
      { effect: "glitch", param: "intensity", from: 0, to: 0.2, startBar: 12, endBar: 12.25, easing: "linear", rainbow: 3, spacing: 0.6 },
      { effect: "glitch", param: "intensity", from: 0.2, to: 0, startBar: 12.25, endBar: 12.5, easing: "easeInOut" }
    ];
  }
  