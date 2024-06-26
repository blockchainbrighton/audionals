console.log("Colour settings level 4 loaded");

{
    const R = 100; // Set a default or required value for R in this context

    // Helper function to compute RGB color
    function computeColor(value, factor, defaultColor) {
        const colorComponent = Math.floor(value * factor);
        return colorComponent > 0.1
            ? `rgb(${colorComponent}, ${colorComponent}, ${colorComponent})`
            : defaultColor;
    }

     // Function to fetch hex color from palette by index
     function getHexFromIndex(index) {
        const color = window.colorPalette.primary.find(c => c.index === index);
        return color ? color.hex : "#000000"; // Default to black if index not found
    }

    // Function to convert hex to RGB color
    function hexToRgb(hex) {
        hex = hex.replace("#", "");
        if (hex.length === 3) {
            hex = hex.split("").map(c => c + c).join("");
        }
        const bigint = parseInt(hex, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    // Function to fetch color from palette by index
    function getColorByIndex(index) {
        const color = window.colorPalette.primary.find(c => c.index === index);
        return color ? `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})` : "black";
    }

    // Helper function to get random color from the palette
    function getRandomColor() {
        const palette = window.colorPalette.primary;
        const randomIndex = Math.floor(Math.random() * palette.length);
        return palette[randomIndex].hex;
    }

      // Function to get dynamic RGB color using sine and random values
      function getDynamicRgbColor(computedColor, hex) {
        const { r, g, b } = hexToRgb(hex);
        return `rgb(${Math.floor(computedColor * r)}, ${Math.floor(computedColor * g)}, ${Math.floor(computedColor * b)})`;
    }

    // Main function to get colors
    function getColors4(o, a, l) {
        const now = Date.now();

        // Pre-generate random values
        const randomValues = Array.from({ length: 6 }, () => Math.random());

        // Cache sine values
        const sinNow = Math.sin(now);
        const sinValues = [
            sinNow,
            Math.sin(now / 10),
            Math.sin(now / 100),
            Math.sin(now / 1000),
            Math.sin(now / 2000),
            Math.sin(now / 5000),
            sinNowDiv10 = Math.sin(now / 10),
            sinNowDiv100 = Math.sin(now / 100),
            sinNowDiv5000 = Math.sin(now / 5000),
        ];

        // Cache vertex and l values
        const { x: x0, y: y0, z: z0 } = l[0];
        const { x: x1, y: y1 } = l[1];
        const { x: x2, y: y2 } = l[2];

        const l0zR = z0 + R;
        const l1zR = l[1].z + R;
        const l2zR = l[2].z + R;

        // Generate IGUANA EYES colors using colorPalette indices
        const iguanaEyesIndices = [11, 9, 10, 19, 16, 3, 13, 12, 9, 19, 19, 16, 2, 15, 4, 10, 24, 25, 26, 27, 28, 29, 30];
        const iguanaEyesColors = iguanaEyesIndices.map(index => {
            const color = window.colorPalette.primary.find(c => c.index === index);
            return color ? `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})` : "black";
        });

        // Generate Rainbow Cycle Scatters
        const multipliers = [0.1, 0.2, 0.3, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
        const rainbowCycleScatters = multipliers.flatMap(multiplier => [
            getConditionalColor(l[0].x, l[0].y, multiplier, getRandomColor(), "black"),
            getConditionalColor(l[0].x, l[1].y, multiplier * 0.5, getRandomColor(), "black"),
            getConditionalColor(l[1].x, l[1].y, multiplier, getRandomColor(), "black")
        ]);

        // Generate Staring Eyes Colors
        const staringEyesFactors = [
            { factor: 255 / (75 * R), default: "#FF0000" },   // color-red
            { factor: 255 / (75 * R), default: "#0000FF" },   // color-verydarkblue
            { factor: 255 / (75 * R), default: "#FF8800" },   // color-orange
            { factor: 255 / (75 * R), default: "#00FF00" },   // color-green
            { factor: 255 / (75 * R), default: "#696969" },   // color-dimgray
            { factor: 255 / (111 * R), default: "#B20000" },  // color-darkred
            { factor: 255 / (111 * R), default: "#0000FF" },  // color-verydarkblue
            { factor: 255 / (111 * R), default: "#00FF00" },  // color-green
            { factor: 255 / (111 * R), default: "#696969" },  // color-dimgray
            { factor: 255 / (111 * R), default: "#8000FF" },  // color-purple
            { factor: 75 / (3 * R), default: "#004D00" },     // color-verydarkgreen
            { factor: 75 / (3 * R), default: "#800000" },     // color-maroon
            { factor: 75 / (3 * R), default: "#00CED1" },     // color-teal
            { factor: 75 / (3 * R), default: "#00BFFF" },     // color-deepskyblue
            { factor: 75 / (3 * R), default: "#FF1493" },     // color-deeppink
            { factor: 255 / (9 * R), default: "#FFFFFF" },    // color-white
            { factor: 255 / (9 * R), default: "#C0C0C0" },    // color-silver
            { factor: 255 / (9 * R), default: "#FFD700" },    // color-gold
            { factor: 255 / (9 * R), default: "#FF5500" },    // color-verydarkorange
            { factor: 255 / (9 * R), default: "#FF00FF" },    // color-magenta
            { factor: 255 / (15 * R), default: "#000000" },   // color-black
            { factor: 255 / (15 * R), default: "#4B0082" },   // color-indigo
            { factor: 255 / (15 * R), default: "#FF8C00" },   // color-darkorange
        ];
        const staringEyesColors = staringEyesFactors.map((entry, i) => {
            const variation = Math.abs(Math.sin(now / (1000 + i * 200)) + Math.cos(now / (500 + i * 100)));
            const computedColor = randomValues[i % randomValues.length] * variation * (l0zR / entry.factor);
            return computedColor > 0.1
                ? `rgb(${Math.floor(computedColor)}, ${Math.floor(computedColor)}, ${Math.floor(computedColor)})`
                : entry.default;
        });

        // Generate Trippy Eyes Colors
        const trippyEyesColors = [
            `rgb(${Math.floor(127 * sinNow + 4)}, ${Math.floor(127 * sinNowDiv10 + 128)}, ${Math.floor(127 * sinNowDiv5000 + 32)})`,
            `rgb(${Math.floor(111 * sinNow + 200000)}, ${Math.floor(127 * sinNow + 12)}, ${Math.floor(127 * sinNowDiv100 + 4)})`
        ];

        return [
            ...iguanaEyesColors,
            ...rainbowCycleScatters,
            ...staringEyesColors,
            ...trippyEyesColors,
        ];
    }

    // Function to return the length of the array generated by getColors4
    function getColors4Length() {
        const defaultL = [{ z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }];
        const length = getColors4(null, null, defaultL).length;
        console.log(`getColors4 length: ${length}`);
        return length;
    }

    // Log the length of the colors array when the file is loaded
    getColors4Length();
}
