export function LightningStrike_64bars() {
  const events = [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "blur", param: "radius", from: 64, to: 4, startBar: 0, endBar: 15, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 16, endBar: 16.4, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 16.4, endBar: 16.6, easing: "linear" },
      { effect: "blur", param: "radius", from: 4, to: 0, startBar: 15, endBar: 16, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 32, endBar: 32.4, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 32.4, endBar: 32.6, easing: "linear" },
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.6, startBar: 32, endBar: 40, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 40, endBar: 40.4, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 40.4, endBar: 44.6, easing: "linear" },
      { effect: "chromaShift", param: "intensity", from: 0.6, to: 0, startBar: 40, endBar: 44, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 0.4, to: 0.1, startBar: 48, endBar: 64, easing: "linear" },

      // === Chroma Bursts (custom as requested) ===

      // Burst 1: Vertical out and back (π/2 out, then π/2 back)
      { effect: "chromaShift", param: "angle", from: Math.PI/2, to: Math.PI/2 + Math.PI/2, startBar: 18, endBar: 18.5, easing: "linear" },
      { effect: "chromaShift", param: "angle", from: Math.PI, to: Math.PI/2, startBar: 18.5, endBar: 19, easing: "linear" },
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.22, startBar: 18, endBar: 18.5, easing: "linear" },
      { effect: "chromaShift", param: "intensity", from: 0.22, to: 0, startBar: 18.5, endBar: 19, easing: "linear" },
      { effect: "chromaShift", param: "speed", from: 1, to: 1, startBar: 18, endBar: 19, easing: "step" },

      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 20, endBar: 20.4, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 20.4, endBar: 20.6, easing: "linear" },

      // Burst 3: Horizontal out and back (0 out, 0 back)
      { effect: "chromaShift", param: "angle", from: 0, to: Math.PI/2, startBar: 22, endBar: 22.5, easing: "linear" },
      { effect: "chromaShift", param: "angle", from: Math.PI/2, to: 0, startBar: 22.5, endBar: 23, easing: "linear" },
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.22, startBar: 22, endBar: 22.5, easing: "linear" },
      { effect: "chromaShift", param: "intensity", from: 0.22, to: 0, startBar: 22.5, endBar: 23, easing: "linear" },
      { effect: "chromaShift", param: "speed", from: 1, to: 1, startBar: 22, endBar: 23, easing: "step" },

      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 24, endBar: 24.4, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 24.4, endBar: 24.6, easing: "linear" },

      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 32, endBar: 32.4, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 32.4, endBar: 32.6, easing: "linear" },

      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 47, endBar: 47.4, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 47.4, endBar: 47.6, easing: "linear" },

    ];

  return events;
}
