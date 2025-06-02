// nice glitch but needs to reveal over longer perios
export function CircuitBreaker_64bars() {
  return [
    { effect:"scanLines", param:"intensity", from:0, to:0.8, startBar:0, endBar:8, easing:"linear" },
    { effect:"scanLines", param:"lineWidth", from:8, to:2, startBar:0, endBar:32, easing:"easeInOut" },
    { effect:"fade", param:"progress", from:0,to:1,startBar:0,endBar:16 },
    { effect:"glitch", param:"intensity", from:0,to:1,startBar:16,endBar:17,easing:"linear" },
    { effect:"glitch", param:"intensity", from:1,to:0,startBar:17,endBar:18,easing:"linear" },
    { effect:"scanLines", param:"direction", from:1,to:-1,startBar:32,endBar:32 },
    { effect:"glitch", param:"intensity", from:0,to:0.8,startBar:32,endBar:32.5 },
    { effect:"glitch", param:"intensity", from:0.8,to:0,startBar:32.5,endBar:33 },
    { effect:"glitch", param:"intensity", from:0,to:1,startBar:40,endBar:40.5 },
    { effect:"glitch", param:"intensity", from:1,to:0,startBar:40.5,endBar:41 },
    { effect:"scanLines", param:"intensity", from:0.8,to:0,startBar:48,endBar:64,easing:"linear" }
  ];
}
