// colourPaletteINDEX.js

console.log("Color palette script loaded");

window.colorPalette = {
    // Define colors with their index
    // Index 1 should always be black
    primary: [
        { hex: "#000000", index: 1, rgb: { r: 0, g: 0, b: 0 } },          // color-black
        { hex: "#8000FF", index: 2, rgb: { r: 128, g: 0, b: 255 } },       // color-purple
        { hex: "#00BFFF", index: 3, rgb: { r: 0, g: 191, b: 255 } },      // color-deepskyblue
        { hex: "#00FF00", index: 4, rgb: { r: 0, g: 255, b: 0 } },         // color-green
        { hex: "#FF0000", index: 5, rgb: { r: 255, g: 0, b: 0 } },        // color-red
        { hex: "#FFD700", index: 6, rgb: { r: 255, g: 215, b: 0 } },       // color-gold
        { hex: "#00FFFF", index: 7, rgb: { r: 0, g: 255, b: 255 } },       // color-cyan
        { hex: "#FF5500", index: 8, rgb: { r: 255, g: 85, b: 0 } },        // color-verydarkorange
        { hex: "#004D00", index: 9, rgb: { r: 0, g: 77, b: 0 } },          // color-verydarkgreen
        { hex: "#0000FF", index: 10, rgb: { r: 0, g: 0, b: 255 } },        // color-verydarkblue
        { hex: "#540000", index: 11, rgb: { r: 178, g: 0, b: 0 } },        // color-darkred
        { hex: "#800000", index: 12, rgb: { r: 128, g: 0, b: 0 } },        // color-maroon
        { hex: "#696969", index: 13, rgb: { r: 105, g: 105, b: 105 } },    // color-dimgray
        { hex: "#FF8C00", index: 14, rgb: { r: 255, g: 140, b: 0 } },      // color-darkorange
        { hex: "#2e004f", index: 15, rgb: { r: 46, g: 0, b: 79 } },        // very dark purple
        { hex: "#00CED1", index: 16, rgb: { r: 0, g: 206, b: 209 } },      // color-teal
        { hex: "#000080", index: 17, rgb: { r: 0, g: 0, b: 128 } },        // color-navy
        { hex: "#FF00FF", index: 18, rgb: { r: 255, g: 0, b: 255 } },      // color-magenta
        { hex: "#4B0082", index: 19, rgb: { r: 75, g: 0, b: 130 } },       // color-indigo
        { hex: "#FF1493", index: 20, rgb: { r: 255, g: 20, b: 147 } },     // color-deeppink
        { hex: "#FFFFFF", index: 21, rgb: { r: 255, g: 255, b: 255 } },    // color-white
        { hex: "#C0C0C0", index: 22, rgb: { r: 192, g: 192, b: 192 } },    // color-silver
        { hex: "#FFD700", index: 23, rgb: { r: 255, g: 215, b: 0 } },      // color-gold (duplicate for coverage)
        // New very dark colors (slightly visible above black)
        { hex: "#111111", index: 24, rgb: { r: 17, g: 17, b: 17 } },       // very dark gray
        { hex: "#0A0A14", index: 25, rgb: { r: 10, g: 10, b: 20 } },       // very dark blue
        { hex: "#140A0A", index: 26, rgb: { r: 20, g: 10, b: 10 } },       // very dark red
        { hex: "#0A140A", index: 27, rgb: { r: 10, g: 20, b: 10 } },       // very dark green
        { hex: "#140A14", index: 28, rgb: { r: 20, g: 10, b: 20 } },       // very dark purple
        { hex: "#1A1A1A", index: 29, rgb: { r: 26, g: 26, b: 26 } },       // very dark neutral
        { hex: "#0D0D0D", index: 30, rgb: { r: 13, g: 13, b: 13 } },       // very very dark almost black
    ],

    hslColors: Array.from({ length: 360 }, (_, i) => `hsl(${i}, 100%, 50%)`)
};
