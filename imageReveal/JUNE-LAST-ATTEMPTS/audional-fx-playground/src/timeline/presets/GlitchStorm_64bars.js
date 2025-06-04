// GlitchStorm_64bars.js

export function GlitchStorm_64bars() {
    return [
      // Fast fade-in, bars 0–4
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 4 },
  
      // Chroma shift swirl ramping up, bars 0–16
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.25, startBar: 0, endBar: 16 },
      { effect: "chromaShift", param: "angle", from: 0, to: Math.PI * 2, startBar: 0, endBar: 32 },
  
      // Main glitch burst, bars 8–24, then fades
      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 8, endBar: 16, slices: 0.8, rainbow: 7, angle: 0 },
      { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 16, endBar: 24, slices: 0.8, rainbow: 7, angle: 1 }, // vertical mode
  
      // Pixelation flicker (classic “decode” glitch), bars 16–32
      { effect: "pixelate", param: "pixelSize", from: 64, to: 1, startBar: 16, endBar: 32 },
  
      // Quick scanline burst synced to glitch, bars 8–28
      { effect: "scanLines", param: "intensity", from: 0, to: 0.5, startBar: 8, endBar: 28, spacing: 3, lineWidth: 1, direction: 1, progress: 1 },
  
      // Film grain ramps up at climax, bars 24–32
      { effect: "filmGrain", param: "intensity", from: 0.5, to: 1.2, startBar: 24, endBar: 32 }
    ];
  }
  
  export default GlitchStorm_64bars;
  