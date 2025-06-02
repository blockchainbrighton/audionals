// needs to time pixel stages better
export function reveal_PixelDustToClarity_64bars() {
    return [
      // Image is revealed by de-pixelating
      { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 64, easing: "easeInOut" },
  
      // Initial subtle blur that also clears, slightly lagging pixelation
      { effect: "blur", param: "radius", from: 8, to: 0, startBar: 0, endBar: 48, easing: "linear" },
  
      // Faint scanlines at the beginning that fade out
      { effect: "scanLines", param: "intensity", from: 0.3, to: 0, startBar: 0, endBar: 24, easing: "linear" },
      { effect: "scanLines", param: "lineWidth", from: 2, to: 1, startBar: 0, endBar: 24, easing: "linear" },
  
      // A short burst of chroma shift as it comes into focus
      { effect: "chromaShift", param: "intensity", from: 0, to: 0.05, startBar: 28, endBar: 36, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0.05, to: 0, startBar: 36, endBar: 44, easing: "easeInOut" },
  
      // Ensure full visibility if pixelation alone doesn't make it 100% clear (e.g. if source image was dark)
      // This fade is very slow, letting pixelate do most of the work.
      { effect: "fade", param: "progress", from: 0.5, to: 1, startBar: 0, endBar: 64, easing: "linear" }
    ];
  }