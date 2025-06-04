// RetroVHS_64bars.js

export function RetroVHS_64bars() {
    return [
      // VHS tape fade-in, bars 0–6
      { effect: "fade", param: "progress", from: 0, to: 0.9, startBar: 0, endBar: 6 },
  
      // Scanlines always present, slightly modulating, bars 0–64
      { effect: "scanLines", param: "intensity", from: 0.35, to: 0.5, startBar: 0, endBar: 64, spacing: 3, lineWidth: 1, direction: 1, progress: 1 },
  
      // Chroma shift for tape misalignment, bars 4–44
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.08, startBar: 4, endBar: 44 },
      { effect: "chromaShift", param: "intensity", from: 0.08, to: 0, startBar: 44, endBar: 56 },
  
      // Pixelation softens (as if tape “locks in”), bars 0–16
      { effect: "pixelate", param: "pixelSize", from: 20, to: 2, startBar: 0, endBar: 16 },
  
      // Subtle vignette, steady, bars 0–64
      { effect: "vignette", param: "intensity", from: 0.6, to: 0.6, startBar: 0, endBar: 64 },
      { effect: "vignette", param: "size", from: 0.25, to: 0.25, startBar: 0, endBar: 64 }
    ];
  }
  
  export default RetroVHS_64bars;
  