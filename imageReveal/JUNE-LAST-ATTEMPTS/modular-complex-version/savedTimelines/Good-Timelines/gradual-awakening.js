// Fairly slow

export function reveal_GradualAwakening_64bars() {
    return [
      // Ensure image starts fully black and fades in over the full duration
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "linear" },
  
      // Start heavily blurred, gradually sharpening over most of the duration
      { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 56, easing: "easeInOut" },
  
      // Start with a tight, dark vignette that slowly opens up and fades
      { effect: "vignette", param: "intensity", from: 1.5, to: 0, startBar: 0, endBar: 48, easing: "linear" },
      { effect: "vignette", param: "size", from: 0.2, to: 1, startBar: 0, endBar: 48, easing: "linear" },
  
      // Introduce subtle film grain that builds slightly then fades
      { effect: "filmGrain", param: "intensity", from: 0, to: 0.4, startBar: 8, endBar: 32, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 0.4, to: 0, startBar: 32, endBar: 64, easing: "linear" },
      { effect: "filmGrain", param: "size", from: 1, to: 1.5, startBar: 8, endBar: 64, easing: "linear" }
    ];
  }