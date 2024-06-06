// colourSettings4.js

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
    const colors = Array.isArray(palette) ? palette : [...palette.primary, ...palette.secondary];
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
}

// Function to get HSL color
function getHslColor(a, factor) {
    return `hsl(${(a % factor) * 360}, 100%, 50%)`;
}

// Function to get conditional color
function getConditionalColor(x, y, divisor, trueColor, falseColor) {
    return (Math.floor(x / divisor) + Math.floor(y / divisor)) % 111 === 0 ? trueColor : falseColor;
}

// Function to get dynamic RGB color
function getDynamicRgb(x1, y1, x2, y2, r, g, b) {
    const distance = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) / 50;
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
function getColors(o, a, l, R) {
    const colors = [];
   

    // Add remaining settings that use colors.push method
    const now = Date.now();

    colors.push(getConditionalColor(l[0].x, l[0].y, 0.05, "red", "black")); // Cycle Scatter


    // colors.push(`rgb(${Math.floor(127 * Math.sin(now) + 128)}, ${Math.floor(127 * Math.sin(now / 1000) + 128)}, ${Math.floor(127 * Math.sin(now / 2000) + 128)})`); // Trippy Eyes
    // colors.push(`rgb(${Math.floor(127 * Math.sin(now) + 4)}, ${Math.floor(127 * Math.sin(now / 10) + 128)}, ${Math.floor(127 * Math.sin(now / 5000) + 32)})`); // Trippy Eyes
    // colors.push(`rgb(${Math.floor(127 * Math.sin(now) + 512)}, ${Math.floor(127 * Math.sin(now / 1) + 128)}, ${Math.floor(127 * Math.sin(now / 1000) + 8)})`); // Red/Yellow trippy eyes
    colors.push(`rgb(${Math.floor(111 * Math.sin(now) + 200000)}, ${Math.floor(127 * Math.sin(now / 1) + 12)}, ${Math.floor(127 * Math.sin(now / 100) + 4)})`); // Trippy Eyes Red/orange
    // colors.push(`rgb(${Math.floor(127 * Math.sin(now) + 128)}, ${Math.floor(127 * Math.sin(now / 1000) + 128)}, ${Math.floor(127 * Math.sin(now / 2000) + 128)})`); // Trippy Eyes full spectrum
    // colors.push(`rgb(${255 * Math.random() > 128 ? Math.floor((l[0].z + R) / (2 * R) * 255) : 100}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)})`); // Spinning Red Disco Eyes
    // colors.push(`rgb(${Math.floor(506 * Math.sin(now) + 750)}, ${Math.floor(Math.sin(now / -17) / -750 * 127)}, ${Math.floor(2000 * Math.sin(now / 2000) + 10002)})`); // PINK
    // colors.push(`rgb(${Math.floor(127 * Math.sin(now) + 128)}, ${Math.floor(127 * Math.sin(now / 1000) + 128)}, ${Math.floor(127 * Math.sin(now / 2000) + 128)})`); // Trippy Eyes

    colors.push(getRandomColor(colorPalette));

    colors.push(getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor(colorPalette), "black")); // Rainbow scatter
    colors.push(getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor(colorPalette), "black")); // Rainbow scatter
    colors.push(getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor(colorPalette), "black")); // Rainbow scatter
    colors.push(getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor(colorPalette), "black")); // Rainbow scatter
    colors.push(getConditionalColor(l[0].x, l[0].y, 0.05, getRandomColor(colorPalette), "black"));
    colors.push(getConditionalColor(l[0].x, l[0].y, 0.1, "orange", "black")); // Cycle Scatter
    colors.push(getConditionalColor(l[0].x, l[0].y, 0.05, "red", "black")); // Cycle Scatter
    colors.push(getConditionalColor(l[0].x, l[0].y, 0.0111, "#444444", "black")); // Cycle scatter

    colors.push(getConditionalColor(l[0].x, l[0].y, 3, "red", "black")); // Top Left Edge Crawler
    colors.push(getConditionalColor(l[0].x, l[0].y, 3, "white", "black")); // Top Left Edge Crawler
    colors.push(getConditionalColor(l[0].x, l[0].y, 3, "blue", "black")); // Top Left Edge Crawler
    colors.push(getConditionalColor(l[0].x, l[0].y, 3, "orange", "black")); // Top Left Edge Crawler
    colors.push(getConditionalColor(l[0].x, l[0].y, 3, "green", "black")); // Top Left Edge Crawler

    colors.push(getConditionalColor(l[1].x, l[1].y, 3, "red", "black")); // Wide 4 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 3, "white", "black")); // Wide 4 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 3, "blue", "black")); // Wide 4 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 3, "orange", "black")); // Wide 4 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 3, "green", "black")); // Wide 4 Row Scatter

    colors.push(getConditionalColor(l[1].x, l[1].y, 5, "red", "black")); // Wide 3 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 5, "white", "black")); // Wide 3 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 5, "blue", "black")); // Wide 3 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 5, "orange", "black")); // Wide 3 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 5, "green", "black")); // Wide 3 Row Scatter

    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "red", "black")); // Wide 1 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "white", "black")); // Wide 1 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "blue", "black")); // Wide 1 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "orange", "black")); // Wide 1 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "green", "black")); // Wide 1 Row Scatter

    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "red", "#160000")); // Wide 1 Row Scatter on dark red BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "white", "#160000")); // Wide 1 Row Scatter on dark red BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "blue", "#160000")); // Wide 1 Row Scatter on dark red BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "orange", "#160000")); // Wide 1 Row Scatter on dark red BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "green", "#160000")); // Wide 1 Row Scatter on dark red BG

    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "red", "#000016")); // Wide 1 Row Scatter on dark blue BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "white", "#000016")); // Wide 1 Row Scatter on dark blue BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "blue", "#000016")); // Wide 1 Row Scatter on dark blue BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "orange", "#000016")); // Wide 1 Row Scatter on dark blue BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "green", "#000016")); // Wide 1 Row Scatter on dark blue BG

    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "red", "#221300")); // Wide 1 Row Scatter on dark orange BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "white", "#221300")); // Wide 1 Row Scatter on dark orange BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "blue", "#221300")); // Wide 1 Row Scatter on dark orange BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "orange", "#221300")); // Wide 1 Row Scatter on dark orange BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "green", "#221300")); // Wide 1 Row Scatter on dark orange BG

    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "red", "#001400")); // Wide 1 Row Scatter on dark green BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "white", "#001400")); // Wide 1 Row Scatter on dark green BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "blue", "#001400")); // Wide 1 Row Scatter on dark green BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "orange", "#001400")); // Wide 1 Row Scatter on dark green BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "green", "#001400")); // Wide 1 Row Scatter on dark green BG

    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "red", "#0b0b0b")); // Wide 1 Row Scatter on dark grey BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "white", "#0b0b0b")); // Wide 1 Row Scatter on dark grey BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "blue", "#0b0b0b")); // Wide 1 Row Scatter on dark grey BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "orange", "#0b0b0b")); // Wide 1 Row Scatter on dark grey BG
    colors.push(getConditionalColor(l[1].x, l[1].y, 10, "green", "#0b0b0b")); // Wide 1 Row Scatter on dark grey BG

    colors.push(getConditionalColor(l[1].x, l[1].y, 3, "grey", "red")); // Wide 4 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 3, "grey", "white")); // Wide 4 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 3, "grey", "blue")); // Wide 4 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 3, "grey", "orange")); // Wide 4 Row Scatter
    colors.push(getConditionalColor(l[1].x, l[1].y, 3, "grey", "green")); // Wide 4 Row Scatter


    // DISCO BALL
    colors.push(getRandomColor(colorPalette.hslColors)); // DISCO
    colors.push(Math.random() > 0.5 ? `hsl(${Math.floor(60 * Math.random()) + 180}, 70%, 50%)` : `hsl(${Math.floor(40 * Math.random()) + 10}, 90%, 60%)`); // Disco Ball
    colors.push(Math.random() > 0.5 ? `hsl(${Math.floor(50 * Math.random()) + 70}, 100%, 50%)` : `hsl(${Math.floor(50 * Math.random()) + 20}, 100%, 50%)`); // Disco Ball
    colors.push(Math.random() > 0.5 ? `hsl(${Math.floor(60 * Math.random())}, 100%, 50%)` : `hsl(${Math.floor(60 * Math.random()) + 180}, 100%, 50%)`); // Vivid Disco Ball

    colors.push(Math.abs(Math.sin(a / 3000)) < 0.5 ? "red" : "blue"); // Full Shape Colour
    colors.push(getConditionalColor(l[0].x, l[0].y, 280, "green", "darkorange")); // Single Colour
    colors.push(getConditionalColor(l[0].x, l[0].y, 111, "white", "red")); // Single Colour
    colors.push(getConditionalColor(l[0].x, l[0].y, 120, "blue", "blue")); // Single Colour
    colors.push(getConditionalColor(l[0].x, l[0].y, 111, "red", "darkorange")); // Single Colour
    colors.push(getConditionalColor(l[0].x, l[0].y, 95, "blue", "blue")); // Single Colour
    colors.push(getConditionalColor(l[0].x, l[0].y, 111, "green", "white")); // Single Colour
    colors.push(getConditionalColor(l[0].x, l[0].y, 111, "darkgreen", "grey")); // Single Colour
    colors.push(getConditionalColor(l[0].x, l[0].y, 111, "lightorange", "darkgrey")); // Single Colour

    colors.push(Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? `rgb(${Math.floor((l[0].z + R) / (2 * R) * 255) % 255}, ${(Math.floor((l[0].z + R) / (2 * R) * 255) + 85) % 255}, ${(Math.floor((l[0].z + R) / (2 * R) * 255) + 170) % 255})` : "alternative-color"); // Green
    colors.push(Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? `rgb(${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255) + 50})` : "alternative-color"); // Grey
    colors.push(Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? (Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? "blue" : "red") : "alternative-color"); // Blue

    // IGUANA EYES
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 165, 0));   // Orange
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 87, 51));   // Coral
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 215, 0));   // Gold
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 127, 80));  // Coral2
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 255, 0));     // Lime
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 255, 255));   // Cyan
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 132, 80, 17));   // Very dark orange
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 25, 0));      // Very dark green
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 0, 255));     // Blue
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 32, 178, 170));  // Lightseagreen
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 140, 0));   // Darkorange
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 0, 30));      // Very dark blue
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 77, 0, 0));      // Dark red
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 0, 0));     // Red
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 128, 0));     // Green
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 128, 0, 128));   // Purple
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 0, 255));   // Magenta
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 255, 0));     // Lime (repeated)
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 128, 128));   // Teal
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 128, 0, 0));     // Maroon
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 0, 128));     // Navy
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 128, 128, 0));   // Olive
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 192, 192, 192)); // Silver
    colors.push(getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 75, 0, 130));    // Indigo


     // LIQUID GRAVITY
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "red", "blue")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "red", "green")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "red", "orange")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "red", "white")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "red", "black")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "blue", "red")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "blue", "green")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "blue", "orange")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "blue", "white")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "blue", "black")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "green", "blue")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "green", "red")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "green", "orange")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "green", "white")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "green", "black")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "orange", "red")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "orange", "green")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "orange", "blue")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "orange", "white")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 1000, "orange", "black")); // Liquid Colour Gravity
 
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "red", "blue")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "red", "green")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "red", "orange")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "red", "white")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "red", "black")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "blue", "red")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "blue", "green")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "blue", "orange")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "blue", "white")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "blue", "black")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "green", "blue")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "green", "red")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "green", "orange")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "green", "white")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "green", "black")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "orange", "red")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "orange", "green")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "orange", "blue")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "orange", "white")); // Liquid Colour Gravity
     colors.push(getConditionalColor(l[0].x, l[0].y, 444, "orange", "black")); // Liquid Colour Gravity
 

     colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "red", "blue")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "red", "green")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "red", "orange")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "red", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "red", "black")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "blue", "red")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "blue", "green")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "blue", "orange")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "blue", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "blue", "black")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "green", "blue")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "green", "red")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "green", "orange")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "green", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "green", "black")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "orange", "red")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "orange", "green")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "orange", "blue")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "orange", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, 600, "orange", "black")); // Liquid Colour Gravity

    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "red", "blue")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "red", "green")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "red", "orange")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "red", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "red", "black")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "blue", "red")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "blue", "green")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "blue", "orange")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "blue", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "blue", "black")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "green", "blue")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "green", "red")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "green", "orange")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "green", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "green", "black")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "orange", "red")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "orange", "green")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "orange", "blue")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "orange", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[2].x-1500, l[0].y, -300, "orange", "black")); // Liquid Colour Gravity

    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "red", "blue")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "red", "green")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "red", "orange")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "red", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "red", "black")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "blue", "red")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "blue", "green")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "blue", "orange")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "blue", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "blue", "black")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "green", "blue")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "green", "red")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "green", "orange")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "green", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "green", "black")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "orange", "red")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "orange", "green")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "orange", "blue")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "orange", "white")); // Liquid Colour Gravity
    colors.push(getConditionalColor(l[1].x-1500, l[0].y, -100, "orange", "black")); // Liquid Colour Gravity



    return colors;
}

// Preset random settings
const presetSettings = Array.from({ length: 100 }, () => ({
    o: Math.random(),
    a: Math.random() * 360,
    l: [
        { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 },
        { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 }
    ],
    R: Math.random() * 1000
}));

let currentSettingIndex = 0;

// Function to apply the current color setting
function applyCurrentSetting() {
    const setting = presetSettings[currentSettingIndex];
    const colors = getColors(setting.o, setting.a, setting.l, setting.R);
    // console.log(`Current Setting Index: ${currentSettingIndex}`, colors);
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
