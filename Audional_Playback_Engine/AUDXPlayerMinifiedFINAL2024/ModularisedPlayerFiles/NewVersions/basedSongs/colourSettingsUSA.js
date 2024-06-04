// colourSettings.js

// Define the color palette
const colorPalette = {
    primary: ["#ee0000", "white", "#3c37ff", "#ffa501", "#3bcd26", "#8d0000", "#03007a", "#b46500", "#18530f"],
    secondary: ["#ffa501", "#ee0000", "#3c37ff", "#18530f", "#b46500", "#ffcf78", "#3c37ff", "#fe7d7d", "#71e260", "#8d0000", "#18530f", "#03007a"],
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
function getDynamicRgb(x1, y1, x2, y2) {
    const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 50;
    return `rgba(0, 0, 255, ${distance})`;
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
function getColors(o, a, l, R) {

        const crazyEyes = [
            (() => {
                const z = l[2]?.z ?? 0;
                const o = Math.floor(Math.random() * ((z + R + 255) / (11 * R) * 255)); // Orange Dark Spinning Eyes
                return o > 0.01 ? `rgb(${o}, ${o}, ${o})` : "#422000";
            })(),
            (() => {
                const z = l[0].z;
                const o = Math.floor(Math.random() * ((z + R) / (3 * R) * 75)); // Grey Spinning Eyes
                return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#390000";
            })(),
            (() => {
                const z = l[0].z;
                const o = Math.floor(Math.random() * ((z + R) / (3 * R) * 75)); // Grey Spinning Eyes
                return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#00390e";
            })(),
        ];

    //     // CRAZY EYES

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[2].z + R + 255) / (11 * R) * 255)); // Orange Dark Spinning Eyes
    //         return o > 0.01 ? `rgb(${o}, ${o}, ${o})` : "#422000";
    //     })(),

        

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (3 * R) * 75)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#000a39";
    //     })(),


    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[1].z + R + 1111) / (111 * R) * 299999)); // dark grey Spinning Eyes
    //         return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
    //     })(),


    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (0.01 * R) * 0.17)); // dark grey Spinning Eyes
    //         return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
    //     })(),


    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (0.1 * R) * 255)); // White Robotic Spinning Eyes
    //         return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
    //     })(),


    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (4 * R) * 255)); // Grey Spinning Eyes
    //         return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (0.01 * R) * 255)); // White Robotic Spinning Eyes
    //         return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
    //     })(),



    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (2.5 * R) * 55)); // dark Grey Spinning Eyes
    //         return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
    //     })(),


    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (2 * R) * 255)); // Grey Spinning Eyes
    //         return o > 32 ? `rgb(${o}, ${o}, ${o})` : "alternative-color";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (5 * R) * 255)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "red";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (5 * R) * 255)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "blue";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (5 * R) * 255)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "orange";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (5 * R) * 255)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "green";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (5 * R) * 255)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "grey";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (111 * R) * 255)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#5a0000";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (111 * R) * 255)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "blue";
    //     })(),

 

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (111 * R) * 255)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "green";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (111 * R) * 255)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "grey";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (111 * R) * 255)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#1f1f1f";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (3 * R) * 75)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#390000";
    //     })(),

    //     (() => {
    //         const o = Math.floor(Math.random() * ((l[0].z + R) / (3 * R) * 75)); // Grey Spinning Eyes
    //         return o > 0.1 ? `rgb(${o}, ${o}, ${o})` : "#00390e";
    //     })(),

    // ];


    const iguanaEyes = [
        // IGUANA EYES
        
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y), // iguana eyes ** Need to update RBB colour function **


    ];

    const discoEyes = [

        `rgb(${Array.from({ length: 3 }, () => Math.random() * ((l[0].z + R) / (2 * R) * 255)).join(",")})`, // Disco Eyes
        getRandomColor([colorPalette.primary, colorPalette.secondary]),
        getRandomColor([colorPalette.primary, colorPalette.secondary]),

    ];

    const cycleScatters = [

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

    ];

    const discoBall = [

        // DISCO BALL
        getRandomColor([colorPalette.hslColors]), // DISCO
        Math.random() > 0.5 ? `hsl(${Math.floor(60 * Math.random()) + 180}, 70%, 50%)` : `hsl(${Math.floor(40 * Math.random()) + 10}, 90%, 60%)`, // Disco Ball
        Math.random() > 0.5 ? `hsl(${Math.floor(50 * Math.random()) + 70}, 100%, 50%)` : `hsl(${Math.floor(50 * Math.random()) + 20}, 100%, 50%)`, // Disco Ball
        Math.random() > 0.5 ? `hsl(${Math.floor(60 * Math.random())}, 100%, 50%)` : `hsl(${Math.floor(60 * Math.random()) + 180}, 100%, 50%)`, // Vivid Disco Ball

    ];

    const fullShape = [

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

    ];

    const liquidGravity = [

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


    ];

    const crawlers= [

        // CRAWLERS
        getConditionalColor(l[0].x, l[0].y, 345, "red", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 345, "white", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 345, "blue", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 345, "orange", "black"), // Top Left Edge Crawler
        getConditionalColor(l[0].x, l[0].y, 345, "green", "black"), // Top Left Edge Crawler

    ];

    const flagStyles = [

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


    ];




const strobes = [
       
        getHslColor(a, 1), // STROBE
        getHslColor(a + 1, 1), // STROBE
        getHslColor(a, 72 * 5), // STROBE
        getHslColor(a + 18, 18 * 20), //Strobe  
        getHslColor(a + 18, 72 * 5), // Yellow Strobe
        getHslColor(7 * a % 360, 360), // colour changing strobe
        getHslColor(a - 1, 0.0005 * 180), // red/orange flicker
        getHslColor(a % 0.09 * 0.88, 0.76), // red/orange flicker

];


const spinningEyes = [
        // Spinning Eyes
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 2000) + 128)})`, // Trippy Eyes
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 4)}, ${Math.floor(127 * Math.sin(Date.now() / 10) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 5000) + 32)})`, // Trippy Eyes
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 512)}, ${Math.floor(127 * Math.sin(Date.now() / 1) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 8)})`, // Red/Yellow trippy eyes
        `rgb(${Math.floor(111 * Math.sin(Date.now()) + 200000)}, ${Math.floor(127 * Math.sin(Date.now() / 1) + 12)}, ${Math.floor(127 * Math.sin(Date.now() / 100) + 4)})`, // Trippy Eyes Red/orange
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 2000) + 128)})`, // Trippy Eyes full spectrum
        `rgb(${255 * Math.random() > 128 ? Math.floor((l[0].z + R) / (2 * R) * 255) : 100}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)})`, // Spinning Red Disco Eyes

        `rgb(${Math.floor(506 * Math.sin(Date.now()) + 750)}, ${Math.floor(Math.sin(Date.now() / -17) / -750 * 127)}, ${Math.floor(2000 * Math.sin(Date.now() / 2000) + 10002)})`, // PINK

    ];
    
    const allEffects = [crazyEyes, iguanaEyes, discoEyes, cycleScatters, liquidGravity];
    const weights = [0.4, 0.1, 0.2, 0.2, 0.1]; // Adjust weights as needed

    const selectedGroup = getWeightedRandomEffect(allEffects, weights);
    const selectedEffect = getWeightedRandomEffect(selectedGroup, Array(selectedGroup.length).fill(1));

    return selectedEffect;
}

// Preset random settings
const presetSettings = Array.from({ length: 100 }, (_, i) => ({
    o: Math.random(),
    a: Math.random() * 360,
    l: [
        { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 },
        { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 },
        { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 } // Ensure l[2] exists
    ],
    R: Math.random() * 1000
}));

let currentSettingIndex = 0;

// Function to apply the current color setting
function applyCurrentSetting() {
    const setting = presetSettings[currentSettingIndex];
    const colors = getColors(setting.o, setting.a, setting.l, setting.R);
    console.log(`Current Setting Index: ${currentSettingIndex}`, colors);
    // Apply colors to your application as needed
}

// Event listeners for arrow keys
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            currentSettingIndex = (currentSettingIndex + 1) % presetSettings.length;
            applyCurrentSetting();
            break;
        case 'ArrowDown':
            currentSettingIndex = (currentSettingIndex - 1 + presetSettings.length) % presetSettings.length;
            applyCurrentSetting();
            break;
    }
});

// Initial application of the first setting
applyCurrentSetting();
