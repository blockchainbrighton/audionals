// colourSettings.js

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


function getWeightedRandomEffect(effects, weights) {
    let totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
    let randomValue = Math.random() * totalWeight;

    for (let i = 0; i < effects.length; i++) {
        if (randomValue < weights[i]) {
            return effects[i];
        }
        randomValue -= weights[i];
    }
}

// Main function to get colors
function getColors(o, a, l) {



    return [
        // CRAZY EYES

        (() => {
            const o = Math.floor(Math.random() * ((l[2].z + R + 255) / (11 * R) * 255)); // Orange Dark Spinning Eyes
            return o > 0.01 ? `rgb(${o}, ${o}, ${o})` : "#422000";
        })(),

        

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (3 * R) * 75)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#000a39";
        })(),


        (() => {
            const o = Math.floor(Math.random() * ((l[1].z + R + 1111) / (111 * R) * 299999)); // dark grey Spinning Eyes
            return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
        })(),


        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (0.01 * R) * 0.17)); // dark grey Spinning Eyes
            return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
        })(),


        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (0.1 * R) * 255)); // White Robotic Spinning Eyes
            return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
        })(),


        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (4 * R) * 255)); // Grey Spinning Eyes
            return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (0.01 * R) * 255)); // White Robotic Spinning Eyes
            return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
        })(),



        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (2.5 * R) * 55)); // dark Grey Spinning Eyes
            return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
        })(),


        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (2 * R) * 255)); // Grey Spinning Eyes
            return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (5 * R) * 255)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "red";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (5 * R) * 255)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "blue";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (5 * R) * 255)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "orange";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (5 * R) * 255)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "green";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (5 * R) * 255)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "grey";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (111 * R) * 255)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#5a0000";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (111 * R) * 255)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "blue";
        })(),

 

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (111 * R) * 255)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "green";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (111 * R) * 255)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "grey";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (111 * R) * 255)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#1f1f1f";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (3 * R) * 75)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#390000";
        })(),

        (() => {
            const o = Math.floor(Math.random() * ((l[0].z + R) / (3 * R) * 75)); // Grey Spinning Eyes
            return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#00390e";
        })(),





        

        `rgb(${Array.from({ length: 3 }, () => Math.random() * ((l[0].z + R) / (2 * R) * 255)).join(",")})`, // Disco Eyes
        getRandomColor([colorPalette.primary, colorPalette.secondary]),




        // Cycle Scatters
        getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor([colorPalette.secondary]), "black"), // Rainbow scatter
        getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor([colorPalette.secondary]), "black"), // Rainbow scatter
        getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor([colorPalette.secondary]), "black"), // Rainbow scatter
        getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor([colorPalette.secondary]), "black"), // Rainbow scatter
        getConditionalColor(l[0].x, l[0].y, 0.05, getRandomColor([colorPalette.secondary]), "black"),
        getConditionalColor(l[0].x, l[0].y, 0.1, "orange", "black"), // Cycle Scatter
        getConditionalColor(l[0].x, l[0].y, 0.05, "red", "black"), // Cycle Scatter
        getConditionalColor(l[0].x, l[0].y, 0.0111, "#444444", "black"), // cycle scatter


        getConditionalColor(l[0].x, l[0].y, 3, "red", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 3, "white", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 3, "blue", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 3, "orange", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 3, "green", "black"), // Top Left Edge Crawler

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


        // 1 stripe wide scatters
        getConditionalColor(l[1].x, l[1].y, 10, "red", "black"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "white", "black"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "black"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "black"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "green", "black"), // Wide 3 Row Scatter

        // 1 stripe scatter on dark red BG
        getConditionalColor(l[1].x, l[1].y, 10, "red", "#160000"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "white", "#160000"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "#160000"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "#160000"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "green", "#160000"), // Wide 3 Row Scatter

        // 1 stripe scatter on dark blue BG
        getConditionalColor(l[1].x, l[1].y, 10, "red", "#000016"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "white", "#000016"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "#000016"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "#000016"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "green", "#000016"), // Wide 3 Row Scatter

        // 1 stripe scatter on dark orange BG
        getConditionalColor(l[1].x, l[1].y, 10, "red", "#221300"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "white", "#221300"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "#221300"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "#221300"), // Wide 3 Row Scatter             
        getConditionalColor(l[1].x, l[1].y, 10, "green", "#221300"), // Wide 3 Row Scatter


        // 1 stripe scatter on dark green BG
        getConditionalColor(l[1].x, l[1].y, 10, "red", "#001400"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "white", "#001400"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "#001400"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "#001400"), // Wide 3 Row Scatter             
        getConditionalColor(l[1].x, l[1].y, 10, "green", "#001400"), // Wide 3 Row Scatter


        // 1 stripe scatter on dark grey BG
        getConditionalColor(l[1].x, l[1].y, 10, "red", "#0b0b0b"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "white", "#0b0b0b"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "#0b0b0b"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "#0b0b0b"), // Wide 3 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 10, "green", "#0b0b0b"), // Wide 3 Row Scatter

        // Scatter with solid bg

        getConditionalColor(l[1].x, l[1].y, 3, "grey", "red"), // Wide 4 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 3, "grey", "white"), // Wide 4 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 3, "grey", "blue"), // Wide 4 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 3, "grey", "orange"), // Wide 4 Row Scatter
        getConditionalColor(l[1].x, l[1].y, 3, "grey", "green"), // Wide 4 Row Scatter


        // DISCO BALL
        getRandomColor([colorPalette.hslColors]), // DISCO
        Math.random() > 0.5 ? `hsl(${Math.floor(60 * Math.random()) + 180}, 70%, 50%)` : `hsl(${Math.floor(40 * Math.random()) + 10}, 90%, 60%)`, // Disco Ball
        Math.random() > 0.5 ? `hsl(${Math.floor(50 * Math.random()) + 70}, 100%, 50%)` : `hsl(${Math.floor(50 * Math.random()) + 20}, 100%, 50%)`, // Disco Ball
        Math.random() > 0.5 ? `hsl(${Math.floor(60 * Math.random())}, 100%, 50%)` : `hsl(${Math.floor(60 * Math.random()) + 180}, 100%, 50%)`, // Vivid Disco Ball



        Math.abs(Math.sin(a / 3000)) < 0.5 ? "red" : "blue", // Full Shape Colour
        getConditionalColor(l[0].x, l[0].y, 280, "green", "darkorange"), // Single Colour
        getConditionalColor(l[0].x, l[0].y, 111, "white", "red"), // single colour
        getConditionalColor(l[0].x, l[0].y, 120, "blue", "blue"), // single colour
        getConditionalColor(l[0].x, l[0].y, 111, "red", "darkorange"), // single colour
        getConditionalColor(l[0].x, l[0].y, 95, "blue", "blue"),
        getConditionalColor(l[0].x, l[0].y, 111, "green", "white"),
        getConditionalColor(l[0].x, l[0].y, 111, "darkgreen", "grey"),
        getConditionalColor(l[0].x, l[0].y, 111, "lightorange", "darkgrey"),

        (Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? `rgb(${Math.floor((l[0].z + R) / (2 * R) * 255) % 255}, ${(Math.floor((l[0].z + R) / (2 * R) * 255) + 85) % 255}, ${(Math.floor((l[0].z + R) / (2 * R) * 255) + 170) % 255})` : "alternative-color"), // green
        (Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? `rgb(${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255) + 50})` : "alternative-color"), // grey
        (Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? "blue" : "red" : "alternative-color"), // blue


        // IGUANA EYES
        
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 165, 0),    // IGUANA EYES // Orange
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 87, 51),   // Coral
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 215, 0),   // Gold
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 127, 80),  // Coral2
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 255, 0),     // Lime
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 255, 255),   // Cyan
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 132, 80, 17),   // Very dark orange
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 25, 0),      // Very dark green
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 0, 255),     // Blue
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 32, 178, 170),  // Lightseagreen
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 140, 0),   // Darkorange
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 0, 30),      // Very dark blue
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 77, 0, 0),      // Dark red
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 0, 0),     // Red
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 128, 0),     // Green
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 128, 0, 128),   // Purple
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 0, 255),   // Magenta
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 255, 0),     // Lime (repeated)
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 128, 128),   // Teal
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 128, 0, 0),     // Maroon
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 0, 128),     // Navy
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 128, 128, 0),   // Olive
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 192, 192, 192), // Silver
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 75, 0, 130),    // Indigo





        // LIQUID GRAVITY

        getConditionalColor(l[0].x, l[0].y, 1000, "red", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "red", "green"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "red", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "red", "white"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "red", "black"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "blue", "red"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "blue", "green"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "blue", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "blue", "white"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "blue", "black"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "green", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "green", "red"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "green", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "green", "white"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "green", "black"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "orange", "red"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "orange", "green"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "orange", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "orange", "white"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 1000, "orange", "black"), // Liquid Colour Gravity


        getConditionalColor(l[0].x, l[0].y, 444, "red", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "red", "green"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "red", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "red", "white"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "red", "black"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "blue", "red"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "blue", "green"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "blue", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "blue", "white"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "blue", "black"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "green", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "green", "red"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "green", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "green", "white"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "green", "black"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "orange", "red"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "orange", "green"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "orange", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "orange", "white"), // Liquid Colour Gravity
        getConditionalColor(l[0].x, l[0].y, 444, "orange", "black"), // Liquid Colour Gravity


        getConditionalColor(l[2].x-1500, l[0].y, 600, "red", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "red", "green"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "red", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "red", "white"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "red", "black"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "blue", "red"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "blue", "green"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "blue", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "blue", "white"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "blue", "black"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "green", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "green", "red"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "green", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "green", "white"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "green", "black"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "orange", "red"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "orange", "green"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "orange", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "orange", "white"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, 600, "orange", "black"), // Liquid Colour Gravity

        getConditionalColor(l[2].x-1500, l[0].y, -300, "red", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "red", "green"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "red", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "red", "white"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "red", "black"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "blue", "red"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "blue", "green"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "blue", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "blue", "white"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "blue", "black"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "green", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "green", "red"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "green", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "green", "white"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "green", "black"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "orange", "red"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "orange", "green"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "orange", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "orange", "white"), // Liquid Colour Gravity
        getConditionalColor(l[2].x-1500, l[0].y, -300, "orange", "black"), // Liquid Colour Gravity

        getConditionalColor(l[1].x-1500, l[0].y, -100, "red", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "red", "green"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "red", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "red", "white"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "red", "black"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "blue", "red"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "blue", "green"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "blue", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "blue", "white"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "blue", "black"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "green", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "green", "red"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "green", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "green", "white"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "green", "black"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "orange", "red"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "orange", "green"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "orange", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "orange", "white"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-1500, l[0].y, -100, "orange", "black"), // Liquid Colour Gravity

        getConditionalColor(l[1].x-555, l[0].y, 100, "red", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "red", "green"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "red", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "red", "white"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "red", "black"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "blue", "red"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "blue", "green"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "blue", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "blue", "white"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "blue", "black"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "green", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "green", "red"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "green", "orange"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "green", "white"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "green", "black"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "orange", "red"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "orange", "green"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "orange", "blue"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "orange", "white"), // Liquid Colour Gravity
        getConditionalColor(l[1].x-555, l[0].y, 100, "orange", "black"), // Liquid o55ur Gravity



        // CRAWLERS
        getConditionalColor(l[0].x, l[0].y, 345, "red", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 345, "white", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 345, "blue", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 345, "orange", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 345, "green", "black"), // Top Left Edge Crawler



        //EU Flag Styles

        getConditionalColor(l[0].x, l[0].y, 15, "orange", "blue"),
        getConditionalColor(l[0].x, l[0].y, 15, "red", "blue"), 
        getConditionalColor(l[0].x, l[0].y, 15, "red", "white"), 
        getConditionalColor(l[0].x, l[0].y, 15, "white", "blue"), 
        getConditionalColor(l[0].x, l[0].y, 15, "blue", "white"), 
        getConditionalColor(l[0].x, l[0].y, 15, "white", "red"), 
        getConditionalColor(l[0].x, l[0].y, 15, "orange", "blue"), 
        getConditionalColor(l[0].x, l[0].y, 15, "red", "orange"),
        getConditionalColor(l[0].x, l[0].y, 15, "orange", "white"), 
        getConditionalColor(l[0].x, l[0].y, 15, "white", "orange"),
        getConditionalColor(l[0].x, l[0].y, 15, "grey", "red"),
        getConditionalColor(l[0].x, l[0].y, 15, "grey", "blue"),
        getConditionalColor(l[0].x, l[0].y, 15, "grey", "green"),
        getConditionalColor(l[0].x, l[0].y, 15, "grey", "orange"),
        getConditionalColor(l[0].x, l[0].y, 15, "red", "grey"),
        getConditionalColor(l[0].x, l[0].y, 15, "blue", "grey"),
        getConditionalColor(l[0].x, l[0].y, 15, "green", "grey"),
        getConditionalColor(l[0].x, l[0].y, 15, "orange", "grey"),



       
        getHslColor(a, 1), // STROBE
        getHslColor(a + 1, 1), // STROBE
        getHslColor(a, 72 * 5), // STROBE
        getHslColor(a + 18, 18 * 20), //Strobe  
        getHslColor(a + 18, 72 * 5), // Yellow Strobe
        getHslColor(7 * a % 360, 360), // colour changing strobe
        getHslColor(a - 1, 0.0005 * 180), // red/orange flicker
        getHslColor(a % 0.09 * 0.88, 0.76), // red/orange flicker


        // Spinning Eyes
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 2000) + 128)})`, // Trippy Eyes
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 4)}, ${Math.floor(127 * Math.sin(Date.now() / 10) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 5000) + 32)})`, // Trippy Eyes
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 512)}, ${Math.floor(127 * Math.sin(Date.now() / 1) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 8)})`, // Red/Yellow trippy eyes
        `rgb(${Math.floor(111 * Math.sin(Date.now()) + 200000)}, ${Math.floor(127 * Math.sin(Date.now() / 1) + 12)}, ${Math.floor(127 * Math.sin(Date.now() / 100) + 4)})`, // Trippy Eyes Red/orange
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 2000) + 128)})`, // Trippy Eyes full spectrum
        `rgb(${255 * Math.random() > 128 ? Math.floor((l[0].z + R) / (2 * R) * 255) : 100}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)})`, // Spinning Red Disco Eyes

        `rgb(${Math.floor(506 * Math.sin(Date.now()) + 750)}, ${Math.floor(Math.sin(Date.now() / -17) / -750 * 127)}, ${Math.floor(2000 * Math.sin(Date.now() / 2000) + 10002)})`, // PINK

        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 2000) + 128)})`, // Trippy Eyes
    ];
}


    


// // Preset random settings
// const presetSettings = Array.from({ length: 100 }, (_, i) => ({
//     o: Math.random(),
//     a: Math.random() * 360,
//     l: [
//         { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 },
//         { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 }
//     ],
//     R: Math.random() * 1000
// }));

// let currentSettingIndex = 0;

// // Function to display the current setting index
// function displayCurrentSettingIndex() {
//     console.log(`Current Setting Index: ${currentSettingIndex}`);
// }

// // Function to apply the current color setting
// function applyCurrentSetting() {
//     console.log(`Current Setting Index: ${currentSettingIndex}`);
//     const setting = presetSettings[currentSettingIndex];
//     const colors = getColors(setting.o, setting.a, setting.l, setting.R);
//     displayCurrentSettingIndex(); // Display the current setting index
//     // Apply colors to your application as needed
// }

// // Event listeners for arrow keys
// document.addEventListener('keydown', (event) => {
//     switch (event.key) {
//         case 'ArrowUp':
//             currentSettingIndex = (currentSettingIndex + 1) % presetSettings.length;
//             applyCurrentSetting();
//             break;
//         case 'ArrowDown':
//             currentSettingIndex = (currentSettingIndex - 1 + presetSettings.length) % presetSettings.length;
//             applyCurrentSetting();
//             break;
//     }
// });

// // Initial application of the first setting
// applyCurrentSetting();