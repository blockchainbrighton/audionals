// colourPaletteINDEX.js

console.log("Color palette script loaded");

window.colorPalette = {
    // Define colors with their index
    // Index 1 should always be black
    primary: [
        { hex: "#000000", index: 1 },  // color-black
        { hex: "#8000FF", index: 2 },  // color-purple
        { hex: "#FF00FF", index: 3 },  // color-magenta
        { hex: "#00FF00", index: 4 },  // color-green
        { hex: "#FF8800", index: 5 },  // color-orange
        { hex: "#FFD700", index: 6 },  // color-gold
        { hex: "#00FFFF", index: 7 },  // color-cyan
        { hex: "#FF5500", index: 8 },  // color-verydarkorange
        { hex: "#004D00", index: 9 },  // color-verydarkgreen
        { hex: "#0000FF", index: 10 }, // color-verydarkblue
        { hex: "#B20000", index: 11 }, // color-darkred
        { hex: "#800000", index: 12 }  // color-maroon
    ],
    secondary: [
        { hex: "#FFD700", index: 6 },  // color-gold
        { hex: "#FF5500", index: 8 },  // color-verydarkorange
        { hex: "#0000FF", index: 10 }, // color-verydarkblue
        { hex: "#696969", index: 13 }, // color-dimgray
        { hex: "#FF8C00", index: 14 }, // color-darkorange
        { hex: "#4D0000", index: 11 }, // color-darkred
        { hex: "#FF0000", index: 15 }, // color-red
        { hex: "#00FF00", index: 4 },  // color-green
        { hex: "#8000FF", index: 2 },  // color-purple
        { hex: "#FF00FF", index: 3 },  // color-magenta
        { hex: "#00CED1", index: 16 }, // color-teal
        { hex: "#800000", index: 12 }, // color-maroon
        { hex: "#000080", index: 17 }, // color-navy
        { hex: "#C0C0C0", index: 18 }, // color-silver
        { hex: "#4B0082", index: 19 }, // color-indigo
        { hex: "#FFFFFF", index: 21 }, // color-white
        { hex: "#FFD700", index: 20 }   // color-gold (to ensure it covers vibrant orange too)
    ],
    // HSL colors remain unchanged
    hslColors: Array.from({ length: 360 }, (_, i) => `hsl(${i}, 100%, 50%)`)
};


