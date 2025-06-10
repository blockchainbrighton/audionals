// chroma360.js
// Exports a 360° chroma shift sweep timeline for use in your FX engine.

export function chroma360Timeline() {
    return [
        // Full 360° chroma sweep from bar 18 to 22
        { effect: "chromaShift", param: "angle", from: 0, to: 2 * Math.PI, startBar: 18, endBar: 22, easing: "linear" },
        // Intensity ramps up and down over two bars each (bars 18–20)
        { effect: "chromaShift", param: "intensity", from: 0, to: 0.2, startBar: 18, endBar: 19, easing: "linear" },
        { effect: "chromaShift", param: "intensity", from: 0.2, to: 0, startBar: 19, endBar: 20, easing: "linear" }
    ];
}
