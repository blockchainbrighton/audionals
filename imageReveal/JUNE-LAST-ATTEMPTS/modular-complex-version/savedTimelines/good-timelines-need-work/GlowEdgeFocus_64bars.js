// nice but could be more interesting like chroma shift moving in multiple directions.

export function GlowEdgeFocus_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:12, easing:"easeInOut" },
    { effect:"blur", param:"radius", from:24, to:2, startBar:0, endBar:32, easing:"easeInOut" },
    { effect:"chromaShift", param:"intensity", from:0, to:0.4, startBar:16, endBar:18, easing:"easeInOut" },
    { effect:"chromaShift", param:"intensity", from:0.4, to:0, startBar:18, endBar:20, easing:"easeInOut" },
    { effect:"blur", param:"radius", from:2, to:0, startBar:32, endBar:40, easing:"easeInOut" },
    { effect:"chromaShift", param:"direction", from:1, to:-1, startBar:32, endBar:32 },
    { effect:"chromaShift", param:"intensity", from:0, to:0.6, startBar:40, endBar:41, easing:"easeInOut" },
    { effect:"chromaShift", param:"intensity", from:0.6, to:0, startBar:41, endBar:42, easing:"easeInOut" },
    { effect:"filmGrain", param:"intensity", from:0.5, to:0.1, startBar:0, endBar:64, easing:"linear" }
  ];
}
