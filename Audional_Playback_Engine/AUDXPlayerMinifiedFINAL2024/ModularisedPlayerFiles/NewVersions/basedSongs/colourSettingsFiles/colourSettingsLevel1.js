// colourSettings5.js

// Define the color palette
const colorPalette = {
    primary: [
        { hex: "#FFA500", class: "color-orange" }, // orange
        { hex: "#FF5733", class: "color-coral" }, // coral
        { hex: "#FFD700", class: "color-gold" }, // gold
        { hex: "#FF7F50", class: "color-coral2" }, // coral
        { hex: "#00FF00", class: "color-lime" }, // lime
        { hex: "#00FFFF", class: "color-cyan" },  // cyan
        { hex: "#845011", class: "color-verydarkorange" }, // very dark orange
        { hex: "#001900", class: "color-verydarkgreen" }, // very dark green
    ],
    secondary: [
        { hex: "#FFA500", class: "color-orange" }, 
        { hex: "#0000FF", class: "color-blue" }, 
        { hex: "#20B2AA", class: "color-lightseagreen" }, 
        { hex: "#FF8C00", class: "color-darkorange" }, 
        { hex: "#00001E", class: "color-verydarkblue" }, // very dark blue
        { hex: "#4d0000", class: "color-darkred" }, // dark red
        { hex: "#FF0000", class: "color-red" }, 
        { hex: "#008000", class: "color-green" }, 
        { hex: "#800080", class: "color-purple" }, 
        { hex: "#FF00FF", class: "color-magenta" }, 
        { hex: "#00FF00", class: "color-lime" }, 
        { hex: "#008080", class: "color-teal" }, 
        { hex: "#800000", class: "color-maroon" }, 
        { hex: "#000080", class: "color-navy" }, 
        { hex: "#808000", class: "color-olive" }, 
        { hex: "#C0C0C0", class: "color-silver" }, 
        { hex: "#4B0082", class: "color-indigo" }
    ],
    hslColors: Array.from({ length: 360 }, (_, i) => `hsl(${i}, 100%, 50%)`)
};

// Function to get a random color from a palette
function getRandomColor(palette) {
    const colors = palette.flat();
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
}

// Function to get conditional color
function getConditionalColor(x, y, divisor, trueColor, falseColor) {
    return (Math.floor(x / divisor) + Math.floor(y / divisor)) % 111 === 0 ? trueColor : falseColor;
}

// Function to get HSL color
function getHslColor(a, factor) {
    return `hsl(${a % factor * 360}, 100%, 50%)`;
}

// Function to get dynamic RGB color
function getDynamicRgb(x1, y1, x2, y2, r, g, b) {
    const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 50;
    return `rgba(${r}, ${g}, ${b}, ${distance})`;
}


// Main function to get colors
function getColors1(o, a, l) {
    const randomValues = Array.from({ length: 24 }, () => Math.random());
    const l0zR = l[0].z + R;
    const l2zR = l[2].z + R;
    const l1zR = l[1].z + R;

    const primaryAndSecondaryColors = [...colorPalette.primary, ...colorPalette.secondary];
    const randomColor1 = getRandomColor(primaryAndSecondaryColors).hex;
    const randomColor2 = getRandomColor(primaryAndSecondaryColors).hex;
    const randomColor3 = getRandomColor(primaryAndSecondaryColors).hex;
    const randomColor4 = getRandomColor(primaryAndSecondaryColors).hex;
    const randomColor5 = getRandomColor(primaryAndSecondaryColors).hex;
    const randomColor6 = getRandomColor(primaryAndSecondaryColors).hex;

    const sinValue = Math.abs(Math.sin(a / 3000));

    const x = l[0].x;
    const y = l[0].y;
    const divisor = 1000;


    const zR255 = Math.floor((l[0].z + R) / (2 * R) * 255);

    const y2 = l[2].y;
    const x0 = l[0].x;
    const y0 = l[0].y;
    const x1 = l[1].x - 1500;
    const x2 = l[2].x - 1500;
    const x3 = l[1].x - 555;

    const hslFactor1 = 1;
    const hslFactor2 = 72 * 5;
    const hslFactor3 = 18 * 20;
    const hslFactor4 = 360;
    const hslFactor5 = 0.0005 * 180;
    const hslFactor6 = 0.09 * 0.88;

    // Store Date.now() in a variable to avoid multiple calls
    const now = Date.now();
    const sinNow = Math.sin(now);
    const sinNowDiv1000 = Math.sin(now / 1000);
    const sinNowDiv2000 = Math.sin(now / 2000);
    const sinNowDiv10 = Math.sin(now / 10);
    const sinNowDiv5000 = Math.sin(now / 5000);
    const sinNowDiv100 = Math.sin(now / 100);
    const sinNowDivMinus17 = Math.sin(now / -17);

    const redYellowTrippyEyes = `rgb(${Math.floor(127 * sinNow + 512)}, ${Math.floor(127 * sinNow + 128)}, ${Math.floor(127 * sinNowDiv1000 + 8)})`;


    return [


            // THE FIRST COLOUR SETTING LINE IN THE ARRAY IS THE ONE THAT IS USED WHEN THE PAGE LOADS
            getConditionalColor(x2, y0, -300, "red", "blue"),

            (randomValues[0] * ((l2zR + 255) / (11 * R) * 255)) > 0.01 ? 
            `rgb(${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))})` : 
            "#422000",



            // CRAZY EYES
        
            (randomValues[1] * (l0zR / (3 * R) * 75)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[1] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[1] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[1] * (l0zR / (3 * R) * 75))})` : 
                "#000a39",

            (randomValues[2] * (l1zR / (111 * R) * 299999)) > 32 ? 
                `rgb(${Math.floor(randomValues[2] * (l1zR / (111 * R) * 299999))}, ${Math.floor(randomValues[2] * (l1zR / (111 * R) * 299999))}, ${Math.floor(randomValues[2] * (l1zR / (111 * R) * 299999))})` : 
                "alternative-color",

            (randomValues[3] * (l0zR / (0.01 * R) * 0.17)) > 32 ? 
                `rgb(${Math.floor(randomValues[3] * (l0zR / (0.01 * R) * 0.17))}, ${Math.floor(randomValues[3] * (l0zR / (0.01 * R) * 0.17))}, ${Math.floor(randomValues[3] * (l0zR / (0.01 * R) * 0.17))})` : 
                "alternative-color",

            (randomValues[4] * (l0zR / (0.1 * R) * 255)) > 32 ? 
                `rgb(${Math.floor(randomValues[4] * (l0zR / (0.1 * R) * 255))}, ${Math.floor(randomValues[4] * (l0zR / (0.1 * R) * 255))}, ${Math.floor(randomValues[4] * (l0zR / (0.1 * R) * 255))})` : 
                "alternative-color",

            (randomValues[5] * (l0zR / (4 * R) * 255)) > 32 ? 
                `rgb(${Math.floor(randomValues[5] * (l0zR / (4 * R) * 255))}, ${Math.floor(randomValues[5] * (l0zR / (4 * R) * 255))}, ${Math.floor(randomValues[5] * (l0zR / (4 * R) * 255))})` : 
                "alternative-color",

            (randomValues[6] * (l0zR / (0.01 * R) * 255)) > 32 ? 
                `rgb(${Math.floor(randomValues[6] * (l0zR / (0.01 * R) * 255))}, ${Math.floor(randomValues[6] * (l0zR / (0.01 * R) * 255))}, ${Math.floor(randomValues[6] * (l0zR / (0.01 * R) * 255))})` : 
                "alternative-color",

            (randomValues[7] * (l0zR / (2.5 * R) * 55)) > 32 ? 
                `rgb(${Math.floor(randomValues[7] * (l0zR / (2.5 * R) * 55))}, ${Math.floor(randomValues[7] * (l0zR / (2.5 * R) * 55))}, ${Math.floor(randomValues[7] * (l0zR / (2.5 * R) * 55))})` : 
                "alternative-color",

            (randomValues[8] * (l0zR / (2 * R) * 255)) > 32 ? 
                `rgb(${Math.floor(randomValues[8] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[8] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[8] * (l0zR / (2 * R) * 255))})` : 
                "alternative-color",

            (randomValues[9] * (l0zR / (5 * R) * 255)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[9] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[9] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[9] * (l0zR / (5 * R) * 255))})` : 
                "red",

            (randomValues[10] * (l0zR / (5 * R) * 255)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[10] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[10] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[10] * (l0zR / (5 * R) * 255))})` : 
                "blue",

            (randomValues[11] * (l0zR / (5 * R) * 255)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[11] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[11] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[11] * (l0zR / (5 * R) * 255))})` : 
                "orange",

            (randomValues[12] * (l0zR / (5 * R) * 255)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[12] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[12] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[12] * (l0zR / (5 * R) * 255))})` : 
                "green",

            (randomValues[13] * (l0zR / (5 * R) * 255)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[13] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[13] * (l0zR / (5 * R) * 255))}, ${Math.floor(randomValues[13] * (l0zR / (5 * R) * 255))})` : 
                "grey",

            (randomValues[14] * (l0zR / (111 * R) * 255)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[14] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[14] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[14] * (l0zR / (111 * R) * 255))})` : 
                "#5a0000",

            (randomValues[15] * (l0zR / (111 * R) * 255)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[15] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[15] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[15] * (l0zR / (111 * R) * 255))})` : 
                "blue",

            (randomValues[16] * (l0zR / (111 * R) * 255)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[16] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[16] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[16] * (l0zR / (111 * R) * 255))})` : 
                "green",

            (randomValues[17] * (l0zR / (111 * R) * 255)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[17] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[17] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[17] * (l0zR / (111 * R) * 255))})` : 
                "grey",

            (randomValues[18] * (l0zR / (111 * R) * 255)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[18] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[18] * (l0zR / (111 * R) * 255))}, ${Math.floor(randomValues[18] * (l0zR / (111 * R) * 255))})` : 
                "#1f1f1f",

            (randomValues[19] * (l0zR / (3 * R) * 75)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[19] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[19] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[19] * (l0zR / (3 * R) * 75))})` : 
                "#390000",

            (randomValues[20] * (l0zR / (3 * R) * 75)) > 0.1 ? 
                `rgb(${Math.floor(randomValues[20] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[20] * (l0zR / (3 * R) * 75))}, ${Math.floor(randomValues[20] * (l0zR / (3 * R) * 75))})` : 
                "#00390e",

            `rgb(${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))}, ${Math.floor(randomValues[21] * (l0zR / (2 * R) * 255))})`, // Disco Eyes

            randomColor1, // Using precomputed random color

            // RAINBOW Cycle Scatters
            getConditionalColor(l[0].x, l[0].y, 0.1, randomColor1, "black"), // Cycle Scatter
            getConditionalColor(l[1].x, l[0].y, 0.1, randomColor2, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[0].y, 0.2, randomColor3, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[0].y, 0.3, randomColor4, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[0].y, 0.5, randomColor5, "black"), // Rainbow scatter

            getConditionalColor(l[0].x, l[1].y, 0.05, randomColor1, "black"), // Cycle Scatter
            getConditionalColor(l[1].x, l[1].y, 0.05, randomColor2, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 0.01, randomColor3, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 0.001, randomColor4, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 0.0001, randomColor5, "black"), // Rainbow scatter

            getConditionalColor(l[1].x, l[1].y, 1, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 2, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 3, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 4, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 5, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 6, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 7, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 8, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 9, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 10, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 11, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 12, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 13, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 14, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 15, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 16, randomColor6, "black"), // Rainbow scatter
            getConditionalColor(l[1].x, l[1].y, 17, randomColor6, "black"), // Rainbow scatter


            getConditionalColor(l[0].x, l[0].y, 0.1, "orange", "black"), // Cycle Scatter
            getConditionalColor(l[0].x, l[0].y, 0.05, "red", "black"), // Cycle Scatter
            getConditionalColor(l[0].x, l[0].y, 0.0111, "#444444", "black"), // Cycle scatter

                   ];

    }
