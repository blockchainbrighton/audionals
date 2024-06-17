console.log("Color palette script loaded");

window.colorPalette = {
    // Define colors with their index
    // Index 1 should always be black
    primary: [
        { hex: "#000000", index: 1 },  // color-black
        { hex: "#AD6A6C", index: 2 },  // color-rosewood
        { hex: "#7B9EA8", index: 3 },  // color-bluefog
        { hex: "#A0A083", index: 4 },  // color-sage
        { hex: "#D1A054", index: 5 },  // color-mustard
        { hex: "#947F5B", index: 6 },  // color-caramel
        { hex: "#B4B8C5", index: 7 },  // color-lavendergray
        { hex: "#73615E", index: 8 },  // color-umber
        { hex: "#6A6C5E", index: 9 },  // color-olive
        { hex: "#5D646D", index: 10 }, // color-slate
        { hex: "#956C52", index: 11 }, // color-taupe
        { hex: "#A57F60", index: 12 }, // color-fawn
        { hex: "#B59267", index: 13 }, // color-sandstone
        { hex: "#A8A9AD", index: 14 }, // color-steelgray
        { hex: "#8B6A5A", index: 15 }, // color-sienna
        { hex: "#C2B9A5", index: 16 }, // color-bisque
        { hex: "#806D5A", index: 17 }, // color-ochre
        { hex: "#C1A07E", index: 18 }, // color-peach
        { hex: "#84828A", index: 19 }, // color-charcoal
        { hex: "#756C5B", index: 20 }, // color-drab
        { hex: "#B7A196", index: 21 }  // color-cream
    ],
    secondary: [
        { hex: "#D2C9BA", index: 6 },  // color-tan
        { hex: "#B39477", index: 5 },  // color-hazelnut
        { hex: "#6D7D8D", index: 13 }, // color-stormcloud
        { hex: "#7A9D96", index: 14 }, // color-seagreen
        { hex: "#AB8567", index: 15 }, // color-clay
        { hex: "#665D4D", index: 10 }, // color-mink
        { hex: "#544A3E", index: 11 }, // color-chocolate
        { hex: "#855C56", index: 16 }, // color-cinnamon
        { hex: "#767D6B", index: 4 },  // color-moss
        { hex: "#826C61", index: 2 },  // color-mahogany
        { hex: "#B39F95", index: 3 },  // color-beige
        { hex: "#BFC5B2", index: 17 }, // color-almond
        { hex: "#CABBB2", index: 12 }, // color-palepeach
        { hex: "#8C8377", index: 18 }, // color-taupegray
        { hex: "#E3D3C5", index: 19 }, // color-ivory
        { hex: "#D8C8BC", index: 20 }, // color-cobblestone
        { hex: "#9C8C7A", index: 21 }, // color-mocha
        { hex: "#8A7A6A", index: 22 }, // color-cork
        { hex: "#D7C2AF", index: 23 }, // color-wheat
        { hex: "#72645C", index: 24 }, // color-coffee
        { hex: "#4E443B", index: 25 }, // color-sepia
        { hex: "#A59D8C", index: 26 }, // color-grayolive
        { hex: "#C5B1A1", index: 27 }  // color-burlywood
    ],
    // HSL colors remain unchanged
    hslColors: Array.from({ length: 360 }, (_, i) => `hsl(${i}, 100%, 50%)`)
};
