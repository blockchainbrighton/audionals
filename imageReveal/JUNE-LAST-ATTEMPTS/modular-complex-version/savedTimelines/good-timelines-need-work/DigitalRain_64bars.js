// bit boring. needs slower reveal
export function DigitalRain_64bars() {
  return [
    { effect:"scanLines", param:"direction", from:1, to:1, startBar:0, endBar:0 },
    { effect:"scanLines", param:"intensity", from:0, to:1, startBar:0, endBar:32, easing:"linear" },
    { effect:"chromaShift", param:"intensity", from:0, to:0.4, startBar:16, endBar:18 },
    { effect:"chromaShift", param:"intensity", from:0.4, to:0, startBar:18, endBar:20 },
    { effect:"scanLines", param:"direction", from:-1, to:-1, startBar:32, endBar:32 },
    { effect:"glitch", param:"intensity", from:0, to:0.9, startBar:32, endBar:32.7 },
    { effect:"glitch", param:"intensity", from:0.9, to:0, startBar:32.7, endBar:33.4 },
    { effect:"chromaShift", param:"intensity", from:0, to:0.5, startBar:40, endBar:42 },
    { effect:"chromaShift", param:"intensity", from:0.5, to:0, startBar:42, endBar:44 },
    { effect:"scanLines", param:"intensity", from:1, to:0, startBar:48, endBar:64 }
  ];
}
