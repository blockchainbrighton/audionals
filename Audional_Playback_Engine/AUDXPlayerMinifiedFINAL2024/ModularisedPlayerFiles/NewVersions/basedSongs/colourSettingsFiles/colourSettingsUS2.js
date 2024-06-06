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

// Function to get dynamic RGB color with a specified color
const getDynamicRgb = (x1, y1, x2, y2, r, g, b) => {
    const distance = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) / 50;
    return `rgba(${r}, ${g}, ${b}, ${distance})`;
};

// Main function to get colors
function getColors(o, a, l, R) {
    const computeColor = (factor, divisor, offset, threshold, fallback) => {
        const value = Math.floor(Math.random() * ((l[0].z + R + offset) / (divisor * R) * factor));
        return value > threshold ? `rgb(${value}, ${value}, ${value})` : fallback;
    };

    return [
      

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
        (() => computeColor(255, 11, 255, 0.01, "#4d0000"))(), // CRAZY EYES
        (() => computeColor(255, 11, 255, 0.01, "#422000"))(),
        (() => computeColor(75, 3, 0, 0.1, "#000a39"))(),
        (() => computeColor(299999, 111, 1111, 32, "alternative-color"))(),
        (() => computeColor(0.17, 0.01, 0, 32, "alternative-color"))(),
        (() => computeColor(255, 0.1, 0, 32, "alternative-color"))(),
        (() => computeColor(255, 4, 0, 32, "alternative-color"))(),
        (() => computeColor(255, 0.01, 0, 32, "alternative-color"))(),
        (() => computeColor(55, 2.5, 0, 32, "alternative-color"))(),
        (() => computeColor(255, 2, 0, 32, "alternative-color"))(),
        (() => computeColor(255, 5, 0, 0.1, "red"))(),
        (() => computeColor(255, 5, 0, 0.1, "blue"))(),
        (() => computeColor(255, 5, 0, 0.1, "orange"))(),
        (() => computeColor(255, 5, 0, 0.1, "green"))(),
        (() => computeColor(255, 5, 0, 0.1, "grey"))(),
        (() => computeColor(255, 111, 0, 0.1, "#5a0000"))(),
        (() => computeColor(255, 111, 0, 0.1, "blue"))(),
        (() => computeColor(255, 111, 0, 0.1, "green"))(),
        (() => computeColor(255, 111, 0, 0.1, "grey"))(),
        (() => computeColor(255, 111, 0, 0.1, "#1f1f1f"))(),
        (() => computeColor(75, 3, 0, 0.1, "#390000"))(),
        (() => computeColor(75, 3, 0, 0.1, "#00390e"))(),
        `rgb(${Array.from({ length: 3 }, () => Math.random() * ((l[0].z + R) / (2 * R) * 255)).join(",")})`, // Disco Eyes
        getRandomColor([colorPalette.primary, colorPalette.secondary]),
        getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor([colorPalette.secondary]), "black"),  // Cycle Scatters
        getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor([colorPalette.secondary]), "black"),
        getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor([colorPalette.secondary]), "black"),
        getConditionalColor(l[0].x, l[0].y, 0.1, getRandomColor([colorPalette.secondary]), "black"),
        getConditionalColor(l[0].x, l[0].y, 0.05, getRandomColor([colorPalette.secondary]), "black"),
        getConditionalColor(l[0].x, l[0].y, 0.1, "orange", "black"),
        getConditionalColor(l[0].x, l[0].y, 0.05, "red", "black"),
        getConditionalColor(l[0].x, l[0].y, 0.0111, "#444444", "black"),
        getConditionalColor(l[0].x, l[0].y, 3, "red", "black"),
        getConditionalColor(l[0].x, l[0].y, 3, "white", "black"),
        getConditionalColor(l[0].x, l[0].y, 3, "blue", "black"),
        getConditionalColor(l[0].x, l[0].y, 3, "orange", "black"),
        getConditionalColor(l[0].x, l[0].y, 3, "green", "black"),
        getConditionalColor(l[1].x, l[1].y, 3, "red", "black"),
        getConditionalColor(l[1].x, l[1].y, 3, "white", "black"),
        getConditionalColor(l[1].x, l[1].y, 3, "blue", "black"),
        getConditionalColor(l[1].x, l[1].y, 3, "orange", "black"),
        getConditionalColor(l[1].x, l[1].y, 3, "green", "black"),
        getConditionalColor(l[1].x, l[1].y, 5, "red", "black"),
        getConditionalColor(l[1].x, l[1].y, 5, "white", "black"),
        getConditionalColor(l[1].x, l[1].y, 5, "blue", "black"),
        getConditionalColor(l[1].x, l[1].y, 5, "orange", "black"),
        getConditionalColor(l[1].x, l[1].y, 5, "green", "black"),
        getConditionalColor(l[1].x, l[1].y, 10, "red", "black"),
        getConditionalColor(l[1].x, l[1].y, 10, "white", "black"),
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "black"),
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "black"),
        getConditionalColor(l[1].x, l[1].y, 10, "green", "black"),
        getConditionalColor(l[1].x, l[1].y, 10, "red", "#160000"),
        getConditionalColor(l[1].x, l[1].y, 10, "white", "#160000"),
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "#160000"),
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "#160000"),
        getConditionalColor(l[1].x, l[1].y, 10, "green", "#160000"),
        getConditionalColor(l[1].x, l[1].y, 10, "red", "#000016"),
        getConditionalColor(l[1].x, l[1].y, 10, "white", "#000016"),
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "#000016"),
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "#000016"),
        getConditionalColor(l[1].x, l[1].y, 10, "green", "#000016"),
        getConditionalColor(l[1].x, l[1].y, 10, "red", "#221300"),
        getConditionalColor(l[1].x, l[1].y, 10, "white", "#221300"),
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "#221300"),
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "#221300"),
        getConditionalColor(l[1].x, l[1].y, 10, "green", "#221300"),
        getConditionalColor(l[1].x, l[1].y, 10, "red", "#001400"),
        getConditionalColor(l[1].x, l[1].y, 10, "white", "#001400"),
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "#001400"),
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "#001400"),
        getConditionalColor(l[1].x, l[1].y, 10, "green", "#001400"),
        getConditionalColor(l[1].x, l[1].y, 10, "red", "#0b0b0b"),
        getConditionalColor(l[1].x, l[1].y, 10, "white", "#0b0b0b"),
        getConditionalColor(l[1].x, l[1].y, 10, "blue", "#0b0b0b"),
        getConditionalColor(l[1].x, l[1].y, 10, "orange", "#0b0b0b"),
        getConditionalColor(l[1].x, l[1].y, 10, "green", "#0b0b0b"),
        getConditionalColor(l[1].x, l[1].y, 3, "grey", "red"),
        getConditionalColor(l[1].x, l[1].y, 3, "grey", "white"),
        getConditionalColor(l[1].x, l[1].y, 3, "grey", "blue"),
        getConditionalColor(l[1].x, l[1].y, 3, "grey", "orange"),
        getConditionalColor(l[1].x, l[1].y, 3, "grey", "green"),
        getRandomColor([colorPalette.hslColors]),
        Math.random() > 0.5 ? `hsl(${Math.floor(60 * Math.random()) + 180}, 70%, 50%)` : `hsl(${Math.floor(40 * Math.random()) + 10}, 90%, 60%)`,
        Math.random() > 0.5 ? `hsl(${Math.floor(50 * Math.random()) + 70}, 100%, 50%)` : `hsl(${Math.floor(50 * Math.random()) + 20}, 100%, 50%)`,
        Math.random() > 0.5 ? `hsl(${Math.floor(60 * Math.random())}, 100%, 50%)` : `hsl(${Math.floor(60 * Math.random()) + 180}, 100%, 50%)`,
        Math.abs(Math.sin(a / 3000)) < 0.5 ? "red" : "blue",
        getConditionalColor(l[0].x, l[0].y, 280, "green", "darkorange"),
        getConditionalColor(l[0].x, l[0].y, 111, "white", "red"),
        getConditionalColor(l[0].x, l[0].y, 120, "blue", "blue"),
        getConditionalColor(l[0].x, l[0].y, 111, "red", "darkorange"),
        getConditionalColor(l[0].x, l[0].y, 95, "blue", "blue"),
        getConditionalColor(l[0].x, l[0].y, 111, "green", "white"),
        getConditionalColor(l[0].x, l[0].y, 111, "darkgreen", "grey"),
        getConditionalColor(l[0].x, l[0].y, 111, "lightorange", "darkgrey"),
        Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? `rgb(${Math.floor((l[0].z + R) / (2 * R) * 255) % 255}, ${(Math.floor((l[0].z + R) / (2 * R) * 255) + 85) % 255}, ${(Math.floor((l[0].z + R) / (2 * R) * 255) + 170) % 255})` : "alternative-color",
        Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? `rgb(${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255) + 50})` : "alternative-color",
        Math.floor((l[0].z + R) / (2 * R) * 255) > 128 ? "blue" : "red",
        getConditionalColor(l[0].x, l[0].y, 1000, "red", "blue"),
        getConditionalColor(l[0].x, l[0].y, 1000, "red", "green"),
        getConditionalColor(l[0].x, l[0].y, 1000, "red", "orange"),
        getConditionalColor(l[0].x, l[0].y, 1000, "red", "white"),
        getConditionalColor(l[0].x, l[0].y, 1000, "red", "black"),
        getConditionalColor(l[0].x, l[0].y, 1000, "blue", "red"),
        getConditionalColor(l[0].x, l[0].y, 1000, "blue", "green"),
        getConditionalColor(l[0].x, l[0].y, 1000, "blue", "orange"),
        getConditionalColor(l[0].x, l[0].y, 1000, "blue", "white"),
        getConditionalColor(l[0].x, l[0].y, 1000, "blue", "black"),
        getConditionalColor(l[0].x, l[0].y, 1000, "green", "blue"),
        getConditionalColor(l[0].x, l[0].y, 1000, "green", "red"),
        getConditionalColor(l[0].x, l[0].y, 1000, "green", "orange"),
        getConditionalColor(l[0].x, l[0].y, 1000, "green", "white"),
        getConditionalColor(l[0].x, l[0].y, 1000, "green", "black"),
        getConditionalColor(l[0].x, l[0].y, 1000, "orange", "red"),
        getConditionalColor(l[0].x, l[0].y, 1000, "orange", "green"),
        getConditionalColor(l[0].x, l[0].y, 1000, "orange", "blue"),
        getConditionalColor(l[0].x, l[0].y, 1000, "orange", "white"),
        getConditionalColor(l[0].x, l[0].y, 1000, "orange", "black"),
        getConditionalColor(l[0].x, l[0].y, 444, "red", "blue"),
        getConditionalColor(l[0].x, l[0].y, 444, "red", "green"),
        getConditionalColor(l[0].x, l[0].y, 444, "red", "orange"),
        getConditionalColor(l[0].x, l[0].y, 444, "red", "white"),
        getConditionalColor(l[0].x, l[0].y, 444, "red", "black"),
        getConditionalColor(l[0].x, l[0].y, 444, "blue", "red"),
        getConditionalColor(l[0].x, l[0].y, 444, "blue", "green"),
        getConditionalColor(l[0].x, l[0].y, 444, "blue", "orange"),
        getConditionalColor(l[0].x, l[0].y, 444, "blue", "white"),
        getConditionalColor(l[0].x, l[0].y, 444, "blue", "black"),
        getConditionalColor(l[0].x, l[0].y, 444, "green", "blue"),
        getConditionalColor(l[0].x, l[0].y, 444, "green", "red"),
        getConditionalColor(l[0].x, l[0].y, 444, "green", "orange"),
        getConditionalColor(l[0].x, l[0].y, 444, "green", "white"),
        getConditionalColor(l[0].x, l[0].y, 444, "green", "black"),
        getConditionalColor(l[0].x, l[0].y, 444, "orange", "red"),
        getConditionalColor(l[0].x, l[0].y, 444, "orange", "green"),
        getConditionalColor(l[0].x, l[0].y, 444, "orange", "blue"),
        getConditionalColor(l[0].x, l[0].y, 444, "orange", "white"),
        getConditionalColor(l[0].x, l[0].y, 444, "orange", "black"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "red", "blue"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "red", "green"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "red", "orange"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "red", "white"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "red", "black"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "blue", "red"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "blue", "green"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "blue", "orange"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "blue", "white"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "blue", "black"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "green", "blue"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "green", "red"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "green", "orange"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "green", "white"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "green", "black"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "orange", "red"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "orange", "green"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "orange", "blue"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "orange", "white"),
        getConditionalColor(l[2].x - 1500, l[0].y, 600, "orange", "black"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "red", "blue"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "red", "green"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "red", "orange"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "red", "white"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "red", "black"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "blue", "red"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "blue", "green"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "blue", "orange"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "blue", "white"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "blue", "black"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "green", "blue"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "green", "red"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "green", "orange"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "green", "white"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "green", "black"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "orange", "red"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "orange", "green"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "orange", "blue"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "orange", "white"),
        getConditionalColor(l[2].x - 1500, l[0].y, -300, "orange", "black"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "red", "blue"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "red", "green"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "red", "orange"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "red", "white"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "red", "black"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "blue", "red"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "blue", "green"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "blue", "orange"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "blue", "white"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "blue", "black"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "green", "blue"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "green", "red"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "green", "orange"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "green", "white"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "green", "black"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "orange", "red"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "orange", "green"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "orange", "blue"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "orange", "white"),
        getConditionalColor(l[1].x - 1500, l[0].y, -100, "orange", "black"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "red", "blue"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "red", "green"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "red", "orange"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "red", "white"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "red", "black"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "blue", "red"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "blue", "green"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "blue", "orange"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "blue", "white"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "blue", "black"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "green", "blue"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "green", "red"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "green", "orange"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "green", "white"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "green", "black"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "orange", "red"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "orange", "green"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "orange", "blue"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "orange", "white"),
        getConditionalColor(l[1].x - 555, l[0].y, 100, "orange", "black"),
        getConditionalColor(l[0].x, l[0].y, 345, "red", "black"),
        getConditionalColor(l[0].x, l[0].y, 345, "white", "black"),
        getConditionalColor(l[0].x, l[0].y, 345, "blue", "black"),
        getConditionalColor(l[0].x, l[0].y, 345, "orange", "black"),
        getConditionalColor(l[0].x, l[0].y, 345, "green", "black"),
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
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 165, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 87, 51),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 215, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 127, 80),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 255, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 255, 255),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 132, 80, 17),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 25, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 0, 255),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 32, 178, 170),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 140, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 0, 30),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 77, 0, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 0, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 128, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 128, 0, 128),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 255, 0, 255),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 255, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 128, 128),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 128, 0, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 0, 0, 128),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 128, 128, 0),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 192, 192, 192),
        getDynamicRgb(l[2].x, l[2].y, l[2].x, l[0].y, 75, 0, 130),
        getHslColor(a, 1),
        getHslColor(a + 1, 1),
        getHslColor(a, 72 * 5),
        getHslColor(a + 18, 18 * 20),
        getHslColor(a + 18, 72 * 5),
        getHslColor(7 * a % 360, 360),
        getHslColor(a - 1, 0.0005 * 180),
        getHslColor(a % 0.09 * 0.88, 0.76),
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 2000) + 128)})`,
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 4)}, ${Math.floor(127 * Math.sin(Date.now() / 10) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 5000) + 32)})`,
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 512)}, ${Math.floor(127 * Math.sin(Date.now() / 1) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 8)})`,
        `rgb(${Math.floor(111 * Math.sin(Date.now()) + 200000)}, ${Math.floor(127 * Math.sin(Date.now() / 1) + 12)}, ${Math.floor(127 * Math.sin(Date.now() / 100) + 4)})`,
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 2000) + 128)})`,
        `rgb(${255 * Math.random() > 128 ? Math.floor((l[0].z + R) / (2 * R) * 255) : 100}, ${Math.floor((l[0].z + R) / (2 * R) * 255)}, ${Math.floor((l[0].z + R) / (2 * R) * 255)})`,
        `rgb(${Math.floor(506 * Math.sin(Date.now()) + 750)}, ${Math.floor(Math.sin(Date.now() / -17) / -750 * 127)}, ${Math.floor(2000 * Math.sin(Date.now() / 2000) + 10002)})`,
        `rgb(${Math.floor(127 * Math.sin(Date.now()) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 1000) + 128)}, ${Math.floor(127 * Math.sin(Date.now() / 2000) + 128)})`
    ];
}

// Preset random settings
const presetSettings = Array.from({ length: 100 }, (_, i) => ({
    o: Math.random(),
    a: Math.random() * 360,
    l: [
        { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 },
        { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 },
        // { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 }
    ],
    R: Math.random() * 1000
}));

let currentSettingIndex = 0;

// Function to apply the current color setting
function applyCurrentSetting() {
    currentSettingIndex = cci2 % presetSettings.length;
    const setting = presetSettings[currentSettingIndex];
    const colors = getColors(setting.o, setting.a, setting.l, setting.R);
    console.log(`Current Setting Index: ${currentSettingIndex}`, colors);
    // Apply colors to your application as needed
}

// Event listeners for navigation
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            cci2 = (cci2 + 1) % presetSettings.length;
            applyCurrentSetting();
            break;
        case 'ArrowDown':
            cci2 = (cci2 - 1 + presetSettings.length) % presetSettings.length;
            applyCurrentSetting();
            break;
    }
});

// Example usage
applyCurrentSetting();
