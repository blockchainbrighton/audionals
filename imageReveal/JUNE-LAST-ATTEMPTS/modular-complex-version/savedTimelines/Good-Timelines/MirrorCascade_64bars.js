// nice
export function MirrorCascade_64bars() {
  return [
    { effect:"fade", param:"progress", from:0,to:1,startBar:0,endBar:12 },
    { effect:"colourSweep", param:"direction", from:1,to:1,startBar:0,endBar:0 },
    { effect:"colourSweep", param:"mode", from:"reveal",to:"reveal",startBar:0,endBar:0 },
    { effect:"colourSweep", param:"progress", from:0,to:1,startBar:0,endBar:20 },
    { effect:"colourSweep", param:"direction", from:-1,to:-1,startBar:16,endBar:16 },
    { effect:"colourSweep", param:"mode", from:"hide",to:"hide",startBar:16,endBar:16 },
    { effect:"colourSweep", param:"progress", from:0,to:1,startBar:16,endBar:36 },
    { effect:"glitch", param:"intensity", from:0,to:0.7,startBar:32,endBar:32.3 },
    { effect:"glitch", param:"intensity", from:0.7,to:0,startBar:32.3,endBar:32.6 },
    { effect:"colourSweep", param:"direction", from:1,to:1,startBar:36,endBar:36 },
    { effect:"colourSweep", param:"mode", from:"reveal",to:"reveal",startBar:36,endBar:36 },
    { effect:"colourSweep", param:"progress", from:0,to:1,startBar:36,endBar:56 },
    { effect:"chromaShift", param:"intensity", from:0,to:0.5,startBar:40,endBar:41 },
    { effect:"chromaShift", param:"intensity", from:0.5,to:0,startBar:41,endBar:42 },
    { effect:"filmGrain", param:"intensity", from:0.3,to:0.1,startBar:48,endBar:64 }
  ];
}
