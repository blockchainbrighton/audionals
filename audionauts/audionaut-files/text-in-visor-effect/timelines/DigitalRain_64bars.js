// DigitalRain_64bars.js
// Slower reveal with added fade, pixelation, and blur, making scanlines more impactful.
export function DigitalRain_64bars() {
  return [
    // Gradual reveal elements
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 128, to: 1, startBar: 0, endBar: 40, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 16, to: 0, startBar: 0, endBar: 36, easing: "linear" },

    // Scanlines build up more gradually and cover most of the timeline
    { effect:"scanLines", param:"direction", from:1, to:1, startBar:0, endBar:0 }, // Set initial direction
    { effect:"scanLines", param:"intensity", from:0, to:1, startBar:0, endBar:40, easing:"linear" }, // Slower build up to full intensity

    // Chroma shifts as accents
    { effect:"chromaShift", param:"intensity", from:0, to:0.4, startBar:16, endBar:18 },
    { effect:"chromaShift", param:"intensity", from:0.4, to:0, startBar:18, endBar:20 },

    { effect:"scanLines", param:"direction", from:-1, to:-1, startBar:32, endBar:32 }, // Change direction mid-way

    // Glitch accent
    { effect:"glitch", param:"intensity", from:0, to:0.9, startBar:32, endBar:32.7 },
    { effect:"glitch", param:"intensity", from:0.9, to:0, startBar:32.7, endBar:33.4 },

    // Another chroma shift accent
    { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:40, endBar:42 },
    { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:42, endBar:44 },

    // Scanlines fade out
    { effect:"scanLines", param:"intensity", from:1, to:0, startBar:48, endBar:64, easing:"linear" } // Gradual fade out
  ];
}