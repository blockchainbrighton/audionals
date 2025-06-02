export function LumenPulse_64bars() {
  return [
    { effect:"fade", param:"progress", from:0, to:1, startBar:0, endBar:8 },
    { effect:"fade", param:"progress", from:1, to:0.4, startBar:16, endBar:17, easing:"easeInOut" },
    { effect:"fade", param:"progress", from:0.4, to:1, startBar:17, endBar:18, easing:"easeInOut" },
    { effect:"fade", param:"progress", from:1, to:0.2, startBar:32, endBar:33, easing:"easeInOut" },
    { effect:"fade", param:"progress", from:0.2, to:1, startBar:33, endBar:34, easing:"easeInOut" },
    { effect:"fade", param:"progress", from:1, to:0, startBar:40, endBar:41, easing:"easeInOut" },
    { effect:"fade", param:"progress", from:0, to:1, startBar:41, endBar:42, easing:"easeInOut" },
    { effect:"chromaShift", param:"intensity", from:0, to:0.3, startBar:8, endBar:56, easing:"easeInOut" }
  ];
}
