
export function reveal_GlitchStormToSerenity_64bars() {
    return [
      // Base fade-in, slower at first due to glitch, then speeds up
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "easeInOut" },
  
      // Heavy glitch at the start, slowly fading out
      { effect: "glitch", param: "intensity", from: 0.9, to: 0, startBar: 0, endBar: 40, easing: "linear" },
  
      // Prominent scanlines that also diminish
      { effect: "scanLines", param: "intensity", from: 0.8, to: 0, startBar: 0, endBar: 48, easing: "linear" },
      { effect: "scanLines", param: "lineWidth", from: 8, to: 1, startBar: 0, endBar: 48, easing: "linear" },
      { effect: "scanLines", param: "spacing", from: 8, to: 2, startBar: 0, endBar: 48, easing: "linear" },
      // Make scanlines scroll upwards and out of view
      { effect: "scanLines", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "linear" }, // Assumes progress scrolls them
      { effect: "scanLines", param: "direction", from: -1, to: -1, startBar: 0, endBar: 0}, // Upwards
  
      // Initial pixelation that clears relatively early
      { effect: "pixelate", param: "pixelSize", from: 60, to: 1, startBar: 0, endBar: 32, easing: "linear" },
  
      // A final touch of blur reduction in the latter half
      { effect: "blur", param: "radius", from: 5, to: 0, startBar: 24, endBar: 56, easing: "easeInOut" }
    ];
  }