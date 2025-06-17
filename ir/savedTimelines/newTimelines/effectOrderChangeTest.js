export function effectOrderChangeTest() {
    return [
      { effect: "fade",      param: "progress", from: 0,   to: 1,  startBar: 0, endBar: 1 },
      { effect: "filmGrain", param: "intensity",from: 1.5, to: 1.5,startBar: 0, endBar: 16 },
      { effect: "blur",      param: "radius",   from: 0,   to: 18, startBar: 4, endBar: 6 },
      { effect: "blur",      param: "radius",   from: 18,  to: 0,  startBar: 6, endBar: 8 },
      { effect: "filmGrain", param: "moveToTop",from: 0,   to: 1,  startBar: 8, endBar: 8.01 },
      { effect: "blur",      param: "radius",   from: 0,   to: 18, startBar: 12, endBar: 14 },
      { effect: "blur",      param: "radius",   from: 18,  to: 0,  startBar: 14, endBar: 16 }
    ];
  }
  