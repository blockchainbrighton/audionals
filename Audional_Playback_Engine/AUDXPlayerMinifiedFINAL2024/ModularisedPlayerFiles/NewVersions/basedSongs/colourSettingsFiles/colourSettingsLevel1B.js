// colourSettings5.js
console.log("Colour settings level 1 loaded");

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

{
const R = 100; // Set a default or required value for R in this context

// Function to get colors
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

    // Variables using the input `a` and `l`
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

    // Date-based variables
    const now = Date.now();
    const sinNow = Math.sin(now);
    const sinNowDiv1000 = Math.sin(now / 1000);
    const sinNowDiv2000 = Math.sin(now / 2000);
    const sinNowDiv10 = Math.sin(now / 10);
    const sinNowDiv5000 = Math.sin(now / 5000);
    const sinNowDiv100 = Math.sin(now / 100);
    const sinNowDivMinus17 = Math.sin(now / -17);

    const redYellowTrippyEyes = `rgb(${Math.floor(127 * sinNow + 512)}, ${Math.floor(127 * sinNow + 128)}, ${Math.floor(127 * sinNowDiv1000 + 8)})`;

    // Return dynamic color settings
    return [
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // THE FIRST COLOUR SETTING LINE IN THE ARRAY IS THE ONE THAT IS USED WHEN THE PAGE LOADS

            (randomValues[0] * ((l2zR + 255) / (11 * R) * 255)) > 0.01 ? 
            `rgb(${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))}, ${Math.floor(randomValues[0] * ((l2zR + 255) / (11 * R) * 255))})` : 
            "#422000",
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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

            // // 3 stripe wide scatters
            // getConditionalColor(l[1].x, l[1].y, 5, "red", "black"), // Wide 3 Row Scatter
            // getConditionalColor(l[1].x, l[1].y, 5, "white", "black"), // Wide 3 Row Scatter
            // getConditionalColor(l[1].x, l[1].y, 5, "blue", "black"), // Wide 3 Row Scatter
            // getConditionalColor(l[1].x, l[1].y, 5, "orange", "black"), // Wide 3 Row Scatter
            // getConditionalColor(l[1].x, l[1].y, 5, "green", "black"), // Wide 3 Row Scatter
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
  

            // 1 stripe scatter on DARK GREY BG
            getConditionalColor(l[1].x, l[1].y, 10, "red", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "#0b0b0b"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "#0b0b0b"), // Wide 3 Row Scatter
            // 1 stripe wide scatters NO BACKGROUND
            getConditionalColor(l[1].x, l[1].y, 10, "red", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "black"), // Wide 3 Row Scatter


            
    
            // getConditionalColor(l[0].x, l[0].y, 0.1, "orange", "black"), // Cycle Scatter
            // getConditionalColor(l[0].x, l[0].y, 0.05, "red", "black"), // Cycle Scatter
            // getConditionalColor(l[0].x, l[0].y, 0.0111, "#444444", "black"), // Cycle scatter


            // getConditionalColor(x2, y0, 600, "green", "black"),
            // getConditionalColor(x2, y0, 600, "blue", "black"),
            // getConditionalColor(x2, y0, 600, "red", "black"),

            // getConditionalColor(x2, y0, -300, "orange", "black"),
            // getConditionalColor(x2, y0, -300, "green", "black"),
            // getConditionalColor(x2, y0, -300, "blue", "black"),
            // getConditionalColor(x2, y0, -300, "red", "black"),





            // getConditionalColor(x1, y0, -100, "orange", "black"),
            // getConditionalColor(x1, y0, -100, "green", "black"),
            // getConditionalColor(x1, y0, -100, "blue", "black"),
            // getConditionalColor(x1, y0, -100, "red", "black"),

       
            // getConditionalColor(x3, y0, 100, "orange", "black"),
            // getConditionalColor(x3, y0, 100, "green", "black"),
            // getConditionalColor(x3, y0, 100, "blue", "black"),
            // getConditionalColor(x3, y0, 100, "red", "black"),




            // // CRAWLERS ON BLACK BACKGROUND
            // getConditionalColor(x0, y0, 345, "red", "black"), // Top Left Edge Crawler
            // getConditionalColor(x0, y0, 345, "white", "black"), // Top Left Edge Crawler
            // getConditionalColor(x0, y0, 345, "blue", "black"), // Top Left Edge Crawler
            // getConditionalColor(x0, y0, 345, "orange", "black"), // Top Left Edge Crawler
            // getConditionalColor(x0, y0, 345, "green", "black"), // Top Left Edge Crawler
                  
        
            // IGUANA EYES
            getDynamicRgb(x2, y2, x2, y0, 255, 165, 0),    // IGUANA EYES // Orange
            getDynamicRgb(x2, y2, x2, y0, 255, 215, 0),   // Gold
            getDynamicRgb(x2, y2, x2, y0, 0, 255, 255),   // Cyan
            getDynamicRgb(x2, y2, x2, y0, 132, 80, 17),   // Very dark orange
            getDynamicRgb(x2, y2, x2, y0, 0, 25, 0),      // Very dark green
            getDynamicRgb(x2, y2, x2, y0, 0, 0, 255),     // Blue
            getDynamicRgb(x2, y2, x2, y0, 255, 140, 0),   // Darkorange
            getDynamicRgb(x2, y2, x2, y0, 0, 0, 30),      // Very dark blue
            getDynamicRgb(x2, y2, x2, y0, 77, 0, 0),      // Dark red
            getDynamicRgb(x2, y2, x2, y0, 255, 0, 0),     // Red
            getDynamicRgb(x2, y2, x2, y0, 0, 128, 0),     // Green
            getDynamicRgb(x2, y2, x2, y0, 128, 0, 128),   // Purple
            getDynamicRgb(x2, y2, x2, y0, 255, 0, 255),   // Magenta
            getDynamicRgb(x2, y2, x2, y0, 128, 0, 0),     // Maroon
            getDynamicRgb(x2, y2, x2, y0, 192, 192, 192), // Silver
            getDynamicRgb(x2, y2, x2, y0, 75, 0, 130),    // Indigo

        
        ];

    }

// Function to return the length of the array generated by getColors1
function getColors1Length() {
    // Safely generate a default color array for length calculation
    const defaultL = [{ z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }, { z: 0, x: 0, y: 0 }];
    const length = getColors1(null, null, defaultL).length;
    console.log(`getColors1 length: ${length}`);
    return length;
}

// Log the length of the colors array when the file is loaded
getColors1Length();

}