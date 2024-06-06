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
function getColors(o, a, l) {
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

            // 4 stripe close scatters
            getConditionalColor(l[0].x, l[0].y, 3, "red", "black"), // 
            getConditionalColor(l[0].x, l[0].y, 3, "white", "black"), //      
            getConditionalColor(l[0].x, l[0].y, 3, "blue", "black"), // 
            getConditionalColor(l[0].x, l[0].y, 3, "orange", "black"), //
            getConditionalColor(l[0].x, l[0].y, 3, "green", "black"), //

            // 4 stripe Wide Scatters 
            getConditionalColor(l[1].x, l[1].y, 3, "red", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "white", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "blue", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "orange", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "green", "black"), // Wide 4 Row Scatter

            // 3 stripe wide scatters
            getConditionalColor(l[1].x, l[1].y, 5, "red", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "white", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "blue", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "orange", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "green", "black"), // Wide 3 Row Scatter


            // 1 stripe wide scatters NO BACKGROUND
            getConditionalColor(l[1].x, l[1].y, 10, "red", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "black"), // Wide 3 Row Scatter

            // 1 stripe scatter on DARK RED BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#160000"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#160000"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#160000"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#160000"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#160000"), // Wide 3 Row Scatter

            // 1 stripe scatter on DARK BLUE BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#000016"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#000016"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#000016"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#000016"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#000016"), // Wide 3 Row Scatter

            // 1 stripe scatter on DARK ORANGE BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#221300"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#221300"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#221300"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#221300"), // Wide 3 Row Scatter             
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#221300"), // Wide 3 Row Scatter


            // 1 stripe scatter on DARK GREEN BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#001400"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#001400"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#001400"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#001400"), // Wide 3 Row Scatter             
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#001400"), // Wide 3 Row Scatter


            // 1 stripe scatter on DARK GREY BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#0b0b0b"), // Wide 3 Row Scatter

            // Scatter with SOLID BG  // TICKER TAPE PARADE

            getConditionalColor(l[1].x, l[1].y, 3, "grey", "red"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "white"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "blue"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "orange"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "grey", "green"), // Wide 4 Row Scatter
            getConditionalColor(l[0].x, l[0].y, 0.0111, "#444444", "black"), // cycle scatter



            // DISCO BALL
            getRandomColor([colorPalette.hslColors]), // DISCO
            randomValues[22] > 0.5 ? `hsl(${Math.floor(60 * randomValues[23]) + 180}, 70%, 50%)` : `hsl(${Math.floor(40 * randomValues[24]) + 10}, 90%, 60%)`, // Disco Ball

         

            // STARING EYES
            `rgb(${randomValues[31] > 0.5 ? Math.floor((l[0].z + R) / (2 * R) * 255) : 100}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)})`, // Spinning Red Disco Eyes


            // FULL SHAPE COLOUR (50/50)
            sinValue < 0.5 ? "red" : "blue", // Full Shape Colour
            // Math.abs(Math.sin(a / 3000)) < 0.5 ? "red" : "blue", // Full Shape Colour

            getConditionalColor(x, y, 280, "green", "darkorange"), 
            getConditionalColor(x, y, 111, "white", "red"), 
            getConditionalColor(x, y, 120, "blue", "blue"), 
            getConditionalColor(x, y, 111, "red", "darkorange"), 
            getConditionalColor(x, y, 95, "blue", "blue"),
            getConditionalColor(x, y, 111, "green", "white"),
            getConditionalColor(x, y, 111, "darkgreen", "grey"),
            getConditionalColor(x, y, 111, "lightorange", "darkgrey"),



            // NOT SURE WHAT THESE ARE SUPPOSED TO DO BUT THEY SEEM PLAIN
            // (zR255 > 128 ? `rgb(${zR255 % 255}, ${(zR255 + 85) % 255}, ${(zR255 + 170) % 255})` : "alternative-color"), // green
            // (zR255 > 128 ? `rgb(${zR255}, ${zR255}, ${zR255 + 50})` : "alternative-color"), // grey
            // (zR255 > 128 ? (zR255 > 128 ? "blue" : "red") : "alternative-color"), // blue


            // IGUANA EYES
            getDynamicRgb(x2, y2, x2, y0, 255, 165, 0),    // IGUANA EYES // Orange
            getDynamicRgb(x2, y2, x2, y0, 255, 87, 51),   // Coral
            getDynamicRgb(x2, y2, x2, y0, 255, 215, 0),   // Gold
            getDynamicRgb(x2, y2, x2, y0, 255, 127, 80),  // Coral2
            getDynamicRgb(x2, y2, x2, y0, 0, 255, 0),     // Lime
            getDynamicRgb(x2, y2, x2, y0, 0, 255, 255),   // Cyan
            getDynamicRgb(x2, y2, x2, y0, 132, 80, 17),   // Very dark orange
            getDynamicRgb(x2, y2, x2, y0, 0, 25, 0),      // Very dark green
            getDynamicRgb(x2, y2, x2, y0, 0, 0, 255),     // Blue
            getDynamicRgb(x2, y2, x2, y0, 32, 178, 170),  // Lightseagreen
            getDynamicRgb(x2, y2, x2, y0, 255, 140, 0),   // Darkorange
            getDynamicRgb(x2, y2, x2, y0, 0, 0, 30),      // Very dark blue
            getDynamicRgb(x2, y2, x2, y0, 77, 0, 0),      // Dark red
            getDynamicRgb(x2, y2, x2, y0, 255, 0, 0),     // Red
            getDynamicRgb(x2, y2, x2, y0, 0, 128, 0),     // Green
            getDynamicRgb(x2, y2, x2, y0, 128, 0, 128),   // Purple
            getDynamicRgb(x2, y2, x2, y0, 255, 0, 255),   // Magenta
            getDynamicRgb(x2, y2, x2, y0, 0, 255, 0),     // Lime (repeated)
            getDynamicRgb(x2, y2, x2, y0, 0, 128, 128),   // Teal
            getDynamicRgb(x2, y2, x2, y0, 128, 0, 0),     // Maroon
            getDynamicRgb(x2, y2, x2, y0, 0, 0, 128),     // Navy
            getDynamicRgb(x2, y2, x2, y0, 128, 128, 0),   // Olive
            getDynamicRgb(x2, y2, x2, y0, 192, 192, 192), // Silver
            getDynamicRgb(x2, y2, x2, y0, 75, 0, 130),    // Indigo

            // LIQUID GRAVITY 
            // TOP LEFT CORNER
            getConditionalColor(x0, y0, 444, "red", "blue"),
            getConditionalColor(x0, y0, 444, "red", "green"),
            getConditionalColor(x0, y0, 444, "red", "orange"),
            getConditionalColor(x0, y0, 444, "red", "white"),
            getConditionalColor(x0, y0, 444, "red", "black"),
            getConditionalColor(x0, y0, 444, "blue", "red"),
            getConditionalColor(x0, y0, 444, "blue", "green"),
            getConditionalColor(x0, y0, 444, "blue", "orange"),
            getConditionalColor(x0, y0, 444, "blue", "white"),
            getConditionalColor(x0, y0, 444, "blue", "black"),
            getConditionalColor(x0, y0, 444, "green", "blue"),
            getConditionalColor(x0, y0, 444, "green", "red"),
            getConditionalColor(x0, y0, 444, "green", "orange"),
            getConditionalColor(x0, y0, 444, "green", "white"),
            getConditionalColor(x0, y0, 444, "green", "black"),
            getConditionalColor(x0, y0, 444, "orange", "red"),
            getConditionalColor(x0, y0, 444, "orange", "green"),
            getConditionalColor(x0, y0, 444, "orange", "blue"),
            getConditionalColor(x0, y0, 444, "orange", "white"),
            getConditionalColor(x0, y0, 444, "orange", "black"),

            // BOTTOM RIGHT CORNER 
            getConditionalColor(x2, y0, 600, "red", "blue"),
            getConditionalColor(x2, y0, 600, "red", "green"),
            getConditionalColor(x2, y0, 600, "red", "orange"),
            getConditionalColor(x2, y0, 600, "red", "white"),
            getConditionalColor(x2, y0, 600, "red", "black"),
            getConditionalColor(x2, y0, 600, "blue", "red"),
            getConditionalColor(x2, y0, 600, "blue", "green"),
            getConditionalColor(x2, y0, 600, "blue", "orange"),
            getConditionalColor(x2, y0, 600, "blue", "white"),
            getConditionalColor(x2, y0, 600, "blue", "black"),
            getConditionalColor(x2, y0, 600, "green", "blue"),
            getConditionalColor(x2, y0, 600, "green", "red"),
            getConditionalColor(x2, y0, 600, "green", "orange"),
            getConditionalColor(x2, y0, 600, "green", "white"),
            getConditionalColor(x2, y0, 600, "green", "black"),
            getConditionalColor(x2, y0, 600, "orange", "red"),
            getConditionalColor(x2, y0, 600, "orange", "green"),
            getConditionalColor(x2, y0, 600, "orange", "blue"),
            getConditionalColor(x2, y0, 600, "orange", "white"),
            getConditionalColor(x2, y0, 600, "orange", "black"),

            // 3 SQUARE MIDDLE CRAWLER
            getConditionalColor(x2, y0, -300, "red", "blue"),
            getConditionalColor(x2, y0, -300, "red", "green"),
            getConditionalColor(x2, y0, -300, "red", "orange"),
            getConditionalColor(x2, y0, -300, "red", "white"),
            getConditionalColor(x2, y0, -300, "red", "black"),
            getConditionalColor(x2, y0, -300, "blue", "red"),
            getConditionalColor(x2, y0, -300, "blue", "green"),
            getConditionalColor(x2, y0, -300, "blue", "orange"),
            getConditionalColor(x2, y0, -300, "blue", "white"),
            getConditionalColor(x2, y0, -300, "blue", "black"),
            getConditionalColor(x2, y0, -300, "green", "blue"),
            getConditionalColor(x2, y0, -300, "green", "red"),
            getConditionalColor(x2, y0, -300, "green", "orange"),
            getConditionalColor(x2, y0, -300, "green", "white"),
            getConditionalColor(x2, y0, -300, "green", "black"),
            getConditionalColor(x2, y0, -300, "orange", "red"),
            getConditionalColor(x2, y0, -300, "orange", "green"),
            getConditionalColor(x2, y0, -300, "orange", "blue"),
            getConditionalColor(x2, y0, -300, "orange", "white"),
            getConditionalColor(x2, y0, -300, "orange", "black"),


            // MIDDLE LINE CRAWLER BOTTOM RIGHT
            getConditionalColor(x1, y0, -100, "red", "blue"),
            getConditionalColor(x1, y0, -100, "red", "green"),
            getConditionalColor(x1, y0, -100, "red", "orange"),
            getConditionalColor(x1, y0, -100, "red", "white"),
            getConditionalColor(x1, y0, -100, "red", "black"),
            getConditionalColor(x1, y0, -100, "blue", "red"),
            getConditionalColor(x1, y0, -100, "blue", "green"),
            getConditionalColor(x1, y0, -100, "blue", "orange"),
            getConditionalColor(x1, y0, -100, "blue", "white"),
            getConditionalColor(x1, y0, -100, "blue", "black"),
            getConditionalColor(x1, y0, -100, "green", "blue"),
            getConditionalColor(x1, y0, -100, "green", "red"),
            getConditionalColor(x1, y0, -100, "green", "orange"),
            getConditionalColor(x1, y0, -100, "green", "white"),
            getConditionalColor(x1, y0, -100, "green", "black"),
            getConditionalColor(x1, y0, -100, "orange", "red"),
            getConditionalColor(x1, y0, -100, "orange", "green"),
            getConditionalColor(x1, y0, -100, "orange", "blue"),
            getConditionalColor(x1, y0, -100, "orange", "white"),
            getConditionalColor(x1, y0, -100, "orange", "black"),

            // MIDDLE LINE CRAWLER TOP LEFT
            getConditionalColor(x3, y0, 100, "red", "blue"),
            getConditionalColor(x3, y0, 100, "red", "green"),
            getConditionalColor(x3, y0, 100, "red", "orange"),
            getConditionalColor(x3, y0, 100, "red", "white"),
            getConditionalColor(x3, y0, 100, "red", "black"),
            getConditionalColor(x3, y0, 100, "blue", "red"),
            getConditionalColor(x3, y0, 100, "blue", "green"),
            getConditionalColor(x3, y0, 100, "blue", "orange"),
            getConditionalColor(x3, y0, 100, "blue", "white"),
            getConditionalColor(x3, y0, 100, "blue", "black"),
            getConditionalColor(x3, y0, 100, "green", "blue"),
            getConditionalColor(x3, y0, 100, "green", "red"),
            getConditionalColor(x3, y0, 100, "green", "orange"),
            getConditionalColor(x3, y0, 100, "green", "white"),
            getConditionalColor(x3, y0, 100, "green", "black"),
            getConditionalColor(x3, y0, 100, "orange", "red"),
            getConditionalColor(x3, y0, 100, "orange", "green"),
            getConditionalColor(x3, y0, 100, "orange", "blue"),
            getConditionalColor(x3, y0, 100, "orange", "white"),
            getConditionalColor(x3, y0, 100, "orange", "black"),

            // CRAWLERS ON BLACK BACKGROUND
            getConditionalColor(x0, y0, 345, "red", "black"), // Top Left Edge Crawler
            getConditionalColor(x0, y0, 345, "white", "black"), // Top Left Edge Crawler
            getConditionalColor(x0, y0, 345, "blue", "black"), // Top Left Edge Crawler
            getConditionalColor(x0, y0, 345, "orange", "black"), // Top Left Edge Crawler
            getConditionalColor(x0, y0, 345, "green", "black"), // Top Left Edge Crawler

            // EU Flag Styles
            getConditionalColor(x0, y0, 15, "orange", "blue"),
            getConditionalColor(x0, y0, 15, "red", "blue"), 
            getConditionalColor(x0, y0, 15, "red", "white"), 
            getConditionalColor(x0, y0, 15, "white", "blue"), 
            getConditionalColor(x0, y0, 15, "blue", "white"), 
            getConditionalColor(x0, y0, 15, "white", "red"), 
            getConditionalColor(x0, y0, 15, "orange", "blue"), 
            getConditionalColor(x0, y0, 15, "red", "orange"),
            getConditionalColor(x0, y0, 15, "orange", "white"), 
            getConditionalColor(x0, y0, 15, "white", "orange"),
            getConditionalColor(x0, y0, 15, "grey", "red"),
            getConditionalColor(x0, y0, 15, "grey", "blue"),
            getConditionalColor(x0, y0, 15, "grey", "green"),
            getConditionalColor(x0, y0, 15, "grey", "orange"),
            getConditionalColor(x0, y0, 15, "red", "grey"),
            getConditionalColor(x0, y0, 15, "blue", "grey"),
            getConditionalColor(x0, y0, 15, "green", "grey"),
            getConditionalColor(x0, y0, 15, "orange", "grey"),

            getConditionalColor(x1, y0, 8, "orange", "black"),
            getConditionalColor(x2, y0, 9, "red", "black"), 
            getConditionalColor(x3, y0, 10, "white", "black"), 
            getConditionalColor(x1, y0, 11, "purple", "black"), 
            getConditionalColor(x2, y0, 12, "blue", "black"), 
            getConditionalColor(x3, y0, 13, "white", "black"), 
            getConditionalColor(x1, y0, 14, "orange", "black"), 
            getConditionalColor(x2, y0, 15, "red", "black"),
            getConditionalColor(x3, y0, 16, "orange", "black"), 
            getConditionalColor(x1, y0, 17, "white", "black"),
            getConditionalColor(x2, y0, 16, "grey", "black"),
            getConditionalColor(x3, y0, 15, "grey", "black"),
            getConditionalColor(x1, y0, 14, "grey", "black"),
            getConditionalColor(x2, y0, 13, "grey", "black"),
            getConditionalColor(x3, y0, 12, "red", "black"),
            getConditionalColor(x1, y0, 11, "blue", "black"),
            getConditionalColor(x2, y0, 10, "green", "black"),
            getConditionalColor(x3, y0, 9, "orange", "black"),

            // STROBES
            getHslColor(a, hslFactor1), // STROBE
            getHslColor(a + 1, hslFactor1), // STROBE
            getHslColor(a, hslFactor2), // STROBE
            getHslColor(a + 18, hslFactor3), // Strobe  
            getHslColor(a + 18, hslFactor2), // Yellow Strobe
            getHslColor(7 * a % hslFactor4, hslFactor4), // colour changing strobe
            getHslColor(a - 1, hslFactor5), // red/orange flicker
            getHslColor(a % hslFactor6, 0.76), // red/orange flicker

            // SLIGHT RIPPLES IN SOLID COLOURS
            `rgb(${Math.floor(506 * sinNow + 750)}, ${Math.floor(sinNowDivMinus17 / -750 * 127)}, ${Math.floor(2000 * sinNowDiv2000 + 10002)})`, // PINK 
            // SLOWLY ROTATING AND FADING COLOURS
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 1200) + 128)}, ${Math.floor(200 * Math.sin(Date.now() / 1400) + 55)}, ${Math.floor(150 * Math.sin(Date.now() / 1600) + 105)})`,
            `rgb(${Math.floor(200 * Math.sin(Date.now() / 1000) + 55)}, ${Math.floor(200 * Math.sin(Date.now() / 1300) + 55)}, ${Math.floor(200 * Math.sin(Date.now() / 1700) + 55)})`,
            `rgb(${Math.floor(100 * Math.sin(Date.now() / 1100) + 155)}, ${Math.floor(150 * Math.sin(Date.now() / 1900) + 105)}, ${Math.floor(255 * Math.sin(Date.now() / 2100) + 128)})`,
            `rgb(${Math.floor(150 * Math.sin(Date.now() / 1800) + 105)}, ${Math.floor(255 * Math.sin(Date.now() / 1500) + 128)}, ${Math.floor(100 * Math.sin(Date.now() / 1900) + 155)})`,
            `rgb(${Math.floor(100 * Math.sin(Date.now() / 1300) + 155)}, ${Math.floor(200 * Math.sin(Date.now() / 1500) + 55)}, ${Math.floor(255 * Math.sin(Date.now() / 1700) + 128)})`,
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 1100) + 128)}, ${Math.floor(255 * Math.sin(Date.now() / 1300) + 128)}, ${Math.floor(255 * Math.sin(Date.now() / 1500) + 128)})`,
            `rgb(${Math.floor(150 * Math.sin(Date.now() / 2000) + 105)}, ${Math.floor(100 * Math.sin(Date.now() / 2200) + 155)}, ${Math.floor(255 * Math.sin(Date.now() / 2500) + 128)})`,
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 1500) + 128)}, ${Math.floor(200 * Math.sin(Date.now() / 1700) + 55)}, ${Math.floor(150 * Math.sin(Date.now() / 1900) + 105)})`,
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 2100) + 128)}, ${Math.floor(100 * Math.sin(Date.now() / 2300) + 155)}, ${Math.floor(255 * Math.sin(Date.now() / 2500) + 128)})`,
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 1800) + 128)}, ${Math.floor(255 * Math.sin(Date.now() / 2000) + 128)}, ${Math.floor(255 * Math.sin(Date.now() / 2200) + 128)})`,
            `rgb(${Math.floor(255 * Math.sin(Date.now() / 1600) + 128)}, ${Math.floor(255 * Math.sin(Date.now() / 1800) + 128)}, ${Math.floor(200 * Math.sin(Date.now() / 2000) + 55)})`,




            // Spinning Eyes
            `rgb(${Math.floor(127 * sinNow + 128)}, ${Math.floor(127 * sinNowDiv1000 + 128)}, ${Math.floor(127 * sinNowDiv2000 + 128)})`, // Trippy Eyes
            `rgb(${Math.floor(127 * sinNow + 4)}, ${Math.floor(127 * sinNowDiv10 + 128)}, ${Math.floor(127 * sinNowDiv5000 + 32)})`, // Trippy Eyes
            redYellowTrippyEyes, // Red/Yellow trippy eyes
            `rgb(${Math.floor(111 * sinNow + 200000)}, ${Math.floor(127 * sinNow + 12)}, ${Math.floor(127 * sinNowDiv100 + 4)})`, // Trippy Eyes Red/orange
            `rgb(${Math.floor(127 * sinNow + 128)}, ${Math.floor(127 * sinNowDiv1000 + 128)}, ${Math.floor(127 * sinNowDiv2000 + 128)})`, // Trippy Eyes full spectrum
            `rgb(${Math.floor(127 * sinNow + 128)}, ${Math.floor(127 * sinNowDiv1000 + 128)}, ${Math.floor(127 * sinNowDiv2000 + 128)})`, // Trippy Eyes
        ];

    }
