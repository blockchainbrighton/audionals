// colourSettings5.js
console.log("Colour settings level 1 loaded");

// Define the color palette
const colorPalette = {
    primary: [
        { hex: "#00387a", class: "color-blue" }, 
        { hex: "#800080", class: "color-purple" }, 
        { hex: "#FF00FF", class: "color-magenta" }, 
        { hex: "#008000", class: "color-green" }, 
        { hex: "#cd8400", class: "color-orange" }, // orange
        { hex: "#FFD700", class: "color-gold" }, // gold
        { hex: "#00FFFF", class: "color-cyan" },  // cyan
        { hex: "#845011", class: "color-verydarkorange" }, // very dark orange
        { hex: "#001900", class: "color-verydarkgreen" }, // very dark green
        { hex: "#00001E", class: "color-verydarkblue" }, // very dark blue
        { hex: "#4d0000", class: "color-darkred" }, // dark red
        { hex: "#800000", class: "color-maroon" }, 

    ],
    secondary: [
        { hex: "#FFD700", class: "color-gold" }, // gold
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
        { hex: "#008080", class: "color-teal" }, 
        { hex: "#800000", class: "color-maroon" }, 
        { hex: "#000080", class: "color-navy" }, 
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

// Function to retrieve color hex from the palette
function getColorFromPalette(colorName, palette) {
    for (const category in palette) {
        for (const color of palette[category]) {
            if (color.class.includes(`color-${colorName}`)) {
                return color.hex;
            }
        }
    }
    throw new Error(`Color ${colorName} not found in palette.`);
}

// Function to get conditional color using the palette
function getConditionalColor2(x, y, divisor, trueColor, falseColor, palette) {
    const trueColorHex = getColorFromPalette(trueColor, palette);
    const falseColorHex = getColorFromPalette(falseColor, palette);
    return (Math.floor(x / divisor) + Math.floor(y / divisor)) % 111 === 0 ? trueColorHex : falseColorHex;
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
    const v = l; // Alias for clarity, where l represents vertices

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
            "#FF0000",
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

            // Dramatic Colors
            getConditionalColor(l[1].x, l[1].y, 3, "magenta", "black"),   // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "cyan", "black"),      // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "yellow", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "purple", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "lime", "black"),      // Wide 4 Row Scatter

            // Dark Dramatic Colors
            getConditionalColor(l[1].x, l[1].y, 3, "darkmagenta", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "darkcyan", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "goldenrod", "black"),   // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "indigo", "black"),      // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 3, "darkolivegreen", "black"), // Wide 4 Row Scatter

            // 3 stripe wide scatters
            getConditionalColor(l[1].x, l[1].y, 5, "red", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "white", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "blue", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "orange", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "green", "black"), // Wide 3 Row Scatter

            getConditionalColor(l[1].x, l[1].y, 5, "magenta", "black"),   // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "cyan", "black"),      // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "yellow", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "purple", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "lime", "black"),      // Wide 4 Row Scatter

            // Dark Dramatic Colors
            getConditionalColor(l[1].x, l[1].y, 5, "darkmagenta", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "darkcyan", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "goldenrod", "black"),   // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "indigo", "black"),      // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 5, "darkolivegreen", "black"), // Wide 4 Row Scatter


            // 1 stripe wide scatters NO BACKGROUND
            getConditionalColor(l[1].x, l[1].y, 10, "red", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "blue", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "orange", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "green", "black"), // Wide 3 Row Scatter

            getConditionalColor(l[1].x, l[1].y, 10, "magenta", "black"),   // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "cyan", "black"),      // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "grey", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "purple", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "white", "black"),      // Wide 4 Row Scatter

            // Dark Dramatic Colors
            getConditionalColor(l[1].x, l[1].y, 10, "darkmagenta", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "darkcyan", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "goldenrod", "black"),   // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "indigo", "black"),      // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 10, "darkolivegreen", "black"), // Wide 4 Row Scatter


            // 3 stripe wide scatters
            getConditionalColor(l[1].x, l[1].y, 0.1, "red", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "white", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "blue", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "orange", "black"), // Wide 3 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "green", "black"), // Wide 3 Row Scatter

            getConditionalColor(l[1].x, l[1].y, 0.1, "magenta", "black"),   // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "cyan", "black"),      // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "yellow", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "purple", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "lime", "black"),      // Wide 4 Row Scatter

            // Dark Dramatic Colors
            getConditionalColor(l[1].x, l[1].y, 0.1, "darkmagenta", "black"), // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "darkcyan", "black"),    // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "goldenrod", "black"),   // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "indigo", "black"),      // Wide 4 Row Scatter
            getConditionalColor(l[1].x, l[1].y, 0.1, "darkolivegreen", "black"), // Wide 4 Row Scatter
        
    
            getConditionalColor(l[0].x, l[0].y, 0.1, "orange", "black"), // Cycle Scatter
            getConditionalColor(l[0].x, l[0].y, 0.05, "red", "black"), // Cycle Scatter
            getConditionalColor(l[0].x, l[0].y, 0.0111, "#444444", "black"), // Cycle scatter


  // 1 stripe scatter on DARK RED BG
  getConditionalColor(l[1].x, l[1].y, 3, "red", "#160000"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 3, "white", "#160000"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 3, "0b0b0b", "#160000"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 3, "orange", "#160000"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 3, "indigo", "#160000"), // Wide 3 Row Scatter

  // 1 stripe scatter on DARK BLUE BG
  getConditionalColor(l[1].x, l[1].y, 3, "red", "#000016"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 3, "white", "#000016"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 3, "0b0b0b", "#000016"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 3, "orange", "#000016"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 3, "indigo", "#000016"), // Wide 3 Row Scatte5

  // 1 stripe scatter on DARK PURPLE BG
  getConditionalColor(l[1].x, l[1].y, 5, "red", "#0D0016"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 5, "white", "#0D0016"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 5, "0b0b0b", "#0D0016"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 5, "orange", "#0D0016"), // Wide 3 Row Scatter             
  getConditionalColor(l[1].x, l[1].y, 5, "indigo", "#0D0016"), // Wide 3 Row Scatter


  // 1 stripe scatter on DARK GREEN BG
  getConditionalColor(l[1].x, l[1].y, 5, "red", "#001400"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 5, "white", "#001400"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 5, "0b0b0b", "#001400"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 5, "orange", "#001400"), // Wide 3 Row Scatter             
  getConditionalColor(l[1].x, l[1].y, 5, "indigo", "#001400"), // Wide 3 Row Scatter


  // 1 stripe scatter on DARK GREY BG
  getConditionalColor(l[1].x, l[1].y, 8, "red", "#0b0b0b"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 8, "white", "#0b0b0b"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 8, "0b0b0b", "#0b0b0b"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 8, "orange", "#0b0b0b"), // Wide 3 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 8, "indigo", "#0b0b0b"), // Wide 3 Row Scatter



  getConditionalColor(l[1].x, l[1].y, 10, "magenta", "black"),   // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 10, "cyan", "black"),      // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 10, "yellow", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 10, "purple", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 10, "lime", "black"),      // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 10, "red", "black"),   // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 10, "grey", "black"),      // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 10, "white", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 10, "orange", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[1].y, 10, "blue", "black"),      // Wide 4 Row Scatter

  getConditionalColor(l[0].x, l[1].y, 10, "magenta", "black"),   // Wide 4 Row Scatter
  getConditionalColor(l[0].x, l[1].y, 10, "cyan", "black"),      // Wide 4 Row Scatter
  getConditionalColor(l[0].x, l[1].y, 10, "yellow", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[0].x, l[1].y, 10, "purple", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[0].x, l[1].y, 10, "lime", "black"),      // Wide 4 Row Scatter
  getConditionalColor(l[0].x, l[1].y, 10, "red", "black"),   // Wide 4 Row Scatter
  getConditionalColor(l[0].x, l[1].y, 10, "grey", "black"),      // Wide 4 Row Scatter
  getConditionalColor(l[0].x, l[1].y, 10, "white", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[0].x, l[1].y, 10, "orange", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[0].x, l[1].y, 10, "blue", "black"),      // Wide 4 Row Scatter

  getConditionalColor(l[1].x, l[0].y, 10, "magenta", "black"),   // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[0].y, 10, "cyan", "black"),      // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[0].y, 10, "yellow", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[0].y, 10, "purple", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[0].y, 10, "lime", "black"),      // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[0].y, 10, "red", "black"),   // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[0].y, 10, "grey", "black"),      // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[0].y, 10, "white", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[0].y, 10, "orange", "black"),    // Wide 4 Row Scatter
  getConditionalColor(l[1].x, l[0].y, 10, "blue", "black"),      // Wide 4 Row Scatter





  
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