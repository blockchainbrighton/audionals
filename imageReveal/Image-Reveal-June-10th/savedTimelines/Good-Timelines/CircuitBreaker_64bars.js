// CircuitBreaker_64bars.js
// Extended reveal period with sustained glitch and scanline effects.
export function CircuitBreaker_64bars() {
  return [
    // Slower initial fade-in for a longer reveal
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:32, easing:"linear" }, // Extended to 32 bars

    // Scanlines build up and then fade, spread out
    { effect:"scanLines", param:"intensity", from:0, to:0.8, startBar:0, endBar:16, easing:"linear" }, // Gradual build
    { effect:"scanLines", param:"lineWidth", from:8, to:2, startBar:0, endBar:48, easing:"easeInOut" }, // Linewidth changes over a longer period
    { effect:"scanLines", param:"intensity", from:0.8, to:0, startBar:40, endBar:64, easing:"linear" }, // Slower fade out of scanlines

    // Subtle blur that clears slowly
    { effect: "blur", param: "radius", from: 16, to: 0, startBar: 0, endBar:40, easing: "linear" },

    // Glitch bursts remain at their original timings for impact
    { effect:"glitch", param:"intensity", from:0, to:1, startBar:16, endBar:17, easing:"linear" },
    { effect:"glitch", param:"intensity", from:1, to:0, startBar:17, endBar:18, easing:"linear" },

    { effect:"scanLines", param:"direction", from:1, to:-1, startBar:32, endBar:32 }, // Keep direction change

    { effect:"glitch", param:"intensity", from:0, to:0.8, startBar:32, endBar:32.5 },
    { effect:"glitch", param:"intensity", from:0.8, to:0, startBar:32.5, endBar:33 },

    { effect:"glitch", param:"intensity", from:0, to:1, startBar:40, endBar:40.5 },
    { effect:"glitch", param:"intensity", from:1, to:0, startBar:40.5, endBar:41 },
  ];
}