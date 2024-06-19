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

    // Function to fetch color from palette by index
    function getColorByIndex(index) {
        const color = window.colorPalette.primary.find(c => c.index === index);
        return color ? `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})` : "black";
    }

    // Main function to get colors
    // Main function to get colors
function getColors4(o, a, l) {
    // Pre-generate random values and colors
    const randomValues = Array.from({ length: 24 }, () => Math.random());

    const now = Date.now();
    const sinNow = Math.sin(now);
    const sinNowDiv1000 = Math.sin(now / 1000);
    const sinNowDiv2000 = Math.sin(now / 2000);
    const sinNowDiv10 = Math.sin(now / 10);
    const sinNowDiv5000 = Math.sin(now / 5000);
    const sinNowDiv100 = Math.sin(now / 100);
    const sinNowDivMinus17 = Math.sin(now / -17);

    const primaryColors = [...colorPalette.primary];
    const randomColor1 = getRandomColor(primaryColors).hex;
    const randomColor2 = getRandomColor(primaryColors).hex;
    const randomColor3 = getRandomColor(primaryColors).hex;
    const randomColor4 = getRandomColor(primaryColors).hex;
    const randomColor5 = getRandomColor(primaryColors).hex;
    const randomColor6 = getRandomColor(primaryColors).hex;

    const sinValue = Math.abs(Math.sin(a / 3000));

    // Cache values of x, y, z for reuse
    const { x: x0, y: y0, z: z0 } = l[0];
    const { x: x1, y: y1 } = l[1];
    const { x: x2, y: y2 } = l[2];

    const l0zR = z0 + R;
    const l2zR = l[2].z + R;
    const l1zR = l[1].z + R;

    // Precompute sine values to use in variations
    const sinValues = [
        Math.sin(now / 1200),
        Math.sin(now / 1400),
        Math.sin(now / 1600),
        Math.sin(now / 1000),
        Math.sin(now / 1300),
        Math.sin(now / 1700),
        Math.sin(now / 1100),
        Math.sin(now / 1900),
        Math.sin(now / 2100),
        Math.sin(now / 1800),
        Math.sin(now / 1500),
        Math.sin(now / 1900),
    ];

    // Cache values for color computation
    const colorFactors = [
        255 / (5 * R), // Factor for the first set of colors
        255 / (111 * R), // Factor for the second set of colors
        75 / (3 * R), // Factor for the third set of colors
    ];

    // Generate IGUANA EYES colors using colorPalette indices
    const iguanaEyesIndices = [11, 9, 10, 19, 16, 3, 13, 12, 9, 19, 19, 16, 2, 15, 4, 10];
    const iguanaEyesColors = iguanaEyesIndices.map(index =>
        getDynamicRgb(x2, y2, x2, y0, ...Object.values(window.colorPalette.primary.find(c => c.index === index).rgb))
    );

    // RAINBOW Cycle Scatters
    const multipliers = [0.1, 0.2, 0.3, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    const baseIndices = [randomColor1, randomColor2, randomColor3, randomColor4, randomColor5, randomColor6];
    const rainbowCycleScatters = [];

    for (let i = 0; i < 5; i++) {
        rainbowCycleScatters.push(getConditionalColor(l[0].x, l[0].y, multipliers[i], baseIndices[i], "black"));
    }

    for (let i = 0; i < 5; i++) {
        rainbowCycleScatters.push(getConditionalColor(l[0].x, l[1].y, multipliers[i] * 0.5, baseIndices[i], "black"));
    }

    for (let i = 0; i < multipliers.length; i++) {
        rainbowCycleScatters.push(getConditionalColor(l[1].x, l[1].y, multipliers[i], randomColor6, "black"));
    }

    // STARING EYES
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
        // Introduce more variability based on sin and cos functions to spread effect across sphere
        const variation = Math.abs(Math.sin(now / (1000 + i * 200)) + Math.cos(now / (500 + i * 100)));
        const computedColor = randomValues[i] * variation * (l0zR / entry.factor);
    
        return computedColor > 0.1
            ? `rgb(${Math.floor(computedColor)}, ${Math.floor(computedColor)}, ${Math.floor(computedColor)})`
            : entry.default;
    });
    

    // Trippy Eyes color settings
    const trippyEyesColors = [
        [127 * sinNow + 4, 127 * sinNowDiv10 + 128, 127 * sinNowDiv5000 + 32],
        [111 * sinNow + 200000, 127 * sinNow + 12, 127 * sinNowDiv100 + 4],
        [127 * sinNow + 128, 127 * sinNowDiv1000 + 128, 127 * sinNowDiv2000 + 128]
    ].map(([r, g, b]) => `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`);
    
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